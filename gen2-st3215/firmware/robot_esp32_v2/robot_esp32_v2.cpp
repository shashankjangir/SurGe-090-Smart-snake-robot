/*
 * SURGE-090 robot firmware — gait + ST3215 bus + MPU6050 + ESP-NOW.
 *
 * Board : Waveshare Servo Driver with ESP32 (servo UART GPIO 18 RX / 19 TX, 1 Mbps)
 * Power : split bus v3 — 3S LiPo -> 15 A fuse -> loop key -> main line, tapped into
 *         5 groups of 2 servos (ID1-2, 3-4, 5-6, 7-8, 9-10), 3 A PTC per tap.
 *         Driver board fed from the main line through a 1N4007 or a buck (<= 12 V).
 *         Driver servo-port +V is cut: the board sends DATA + GND only.
 * IMU   : MPU6050 on SDA 21 / SCL 22 (optional — gait runs without it).
 *
 * What this version adds over the first robot_esp32:
 *   - Boots with torque OFF. Nothing moves until RUN (Serial or base station).
 *   - Soft start: torque is enabled one power group at a time at low speed,
 *     then the wave amplitude ramps in — so the 3 A PTCs do not trip.
 *   - Joint angles clamped to ±70° (mechanical limit of the v6 segment is ±80°).
 *   - Per-joint trim so a straight body really is straight.
 *   - One 15-byte read per servo per cycle (position, voltage, temp, current).
 *   - Stall detection needs several consecutive over-current samples.
 *   - Low-battery (10.2 V) and over-temperature (70 °C) automatic stop.
 *   - ESP-NOW commands are queued and applied in loop() (never on the radio
 *     task), so the servo bus is only ever touched from one place.
 *   - Status parser skips the echo of our own packet if the adapter echoes TX.
 *
 * Serial Monitor 115200, commands (end with Enter):
 *   RUN     start slithering (soft start)
 *   STOP    torque off, horns go limp
 *   CENTER  torque on, hold every joint straight (use while assembling horns)
 *   PING    list which servo IDs answer and their voltage/temperature
 *
 * Telemetry struct and command struct are unchanged — base_esp32 works as is.
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <math.h>
#include "surge_protocol.h"

// ---------------------------------------------------------------- pins / bus
static const int S_RXD = 18;
static const int S_TXD = 19;
static const uint32_t SERVO_BAUD = 1000000;
static const int IMU_SDA = 21;
static const int IMU_SCL = 22;
static const uint8_t IMU_ADDR = 0x68;

// ---------------------------------------------------------------- geometry
static const int NUM_JOINTS = SURGE_NUM_JOINTS;  // 10
static const int ENC_CENTER = 2048;              // 4096 counts = 360°
static const float COUNTS_PER_DEG = 4096.0f / 360.0f;
static const int JOINT_LIMIT = (int)(70.0f * COUNTS_PER_DEG);  // ±70° = ±796

// Straight-body trim per joint (counts). If a joint is not straight at CENTER,
// put the correction here (+ = one way, - = the other). 11 counts ≈ 1°.
static const int16_t TRIM[NUM_JOINTS] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

// ---------------------------------------------------------------- gait
static const float AMPLITUDE_DEG = 30.0f;   // wave amplitude per joint
static const float WAVE_HZ = 0.5f;          // one full wave every 2 s
static const float PHASE_SHIFT = 1.2f;      // rad between neighbouring joints
static const float TURN_DEG = 25.0f;        // extra bend while turning away
static const uint16_t GAIT_SPEED = 2400;    // steps/s cap while slithering
static const uint16_t SOFT_SPEED = 300;     // steps/s while moving to start pose
static const uint8_t GAIT_ACC = 50;
static const uint8_t SOFT_ACC = 20;
static const uint32_t AMP_RAMP_MS = 3000;   // amplitude eases in over 3 s
static const uint32_t GROUP_DELAY_MS = 400; // gap between power groups at start
static const uint16_t TORQUE_LIMIT = 700;   // 0-1000 (x0.1 %) -> 70 % max torque

// ---------------------------------------------------------------- protection
static const int CURRENT_TRIP_MA = 1200;    // stall threshold (calibrate)
static const int STALL_SAMPLES = 4;         // consecutive samples above trip
static const float CURRENT_LSB_MA = 6.5f;
static const uint8_t LOW_BATT_DECIV = 102;  // 10.2 V = 3.4 V/cell
static const uint32_t LOW_BATT_MS = 3000;
static const uint8_t MAX_TEMP_C = 70;
static const float REV_S = 2.5f;
static const float TURN_S = 4.0f;

// ---------------------------------------------------------------- timing
static const uint32_t LOOP_DT_MS = 20;       // 50 Hz control
static const uint32_t TELEMETRY_DT_MS = 100; // 10 Hz radio + serial
static const uint32_t READ_TIMEOUT_MS = 3;

// ---------------------------------------------------------------- ST3215 map
static const uint8_t REG_TORQUE = 40;
static const uint8_t REG_ACC = 41;
static const uint8_t REG_GOAL_POS = 42;      // pos(2) time(2) speed(2)
static const uint8_t REG_TORQUE_LIMIT = 48;  // 2 bytes, RAM
static const uint8_t REG_PRESENT_POS = 56;   // block read 56..70
static const uint8_t BLOCK_LEN = 15;         // 56..70 inclusive
// offsets inside the block
static const int OFF_POS = 0;    // 56-57
static const int OFF_VOLT = 6;   // 62
static const int OFF_TEMP = 7;   // 63
static const int OFF_CUR = 13;   // 69-70
static const uint8_t INST_PING = 0x01;
static const uint8_t INST_READ = 0x02;
static const uint8_t INST_WRITE = 0x03;
static const uint8_t INST_SYNC_WRITE = 0x83;
static const uint8_t BROADCAST_ID = 0xFE;

static uint8_t kBroadcastMac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

// ---------------------------------------------------------------- state
enum Mode : uint8_t { MODE_IDLE, MODE_CENTER, MODE_GAIT };
static Mode g_mode = MODE_IDLE;
static uint8_t g_state = STATE_STOP;   // telemetry state (SurgeState)
static int8_t g_turn = 1;
static uint32_t g_state_end_ms = 0;
static uint32_t g_gait_t0 = 0;
static bool g_imu_ok = false;
static int g_stall_count[NUM_JOINTS] = {0};
static uint32_t g_low_batt_since = 0;

// command handed over from the ESP-NOW callback (radio task) to loop()
static volatile int8_t g_pending_run = -1;   // -1 none, 0 stop, 1 run

// ================================================================ bus layer
static uint8_t scsChecksum(const uint8_t *body, int n) {
  uint16_t s = 0;
  for (int i = 0; i < n; i++) s += body[i];
  return (uint8_t)(~s);
}

static uint8_t g_last_tx[160];
static int g_last_tx_len = 0;

static void busSend(const uint8_t *pkt, int n) {
  while (Serial1.available()) Serial1.read();  // drop stale bytes
  Serial1.write(pkt, n);
  Serial1.flush();
  if (n <= (int)sizeof(g_last_tx)) {
    memcpy(g_last_tx, pkt, n);
    g_last_tx_len = n;
  } else {
    g_last_tx_len = 0;
  }
}

// Build and send one instruction packet: FF FF id len inst params... cs
static void busInstruction(uint8_t id, uint8_t inst, const uint8_t *params, int np) {
  uint8_t pkt[160];
  pkt[0] = 0xFF;
  pkt[1] = 0xFF;
  pkt[2] = id;
  pkt[3] = (uint8_t)(np + 2);
  pkt[4] = inst;
  if (np > 0) memcpy(&pkt[5], params, np);
  pkt[5 + np] = scsChecksum(&pkt[2], np + 3);
  busSend(pkt, np + 6);
}

// Wait for a status packet from `id`. Skips an echo of our own packet.
static bool busReadStatus(uint8_t id, uint8_t *params, int want, uint32_t timeout_ms) {
  uint8_t buf[80];
  int n = 0;
  uint32_t start = millis();
  bool echo_checked = false;
  while (millis() - start < timeout_ms) {
    while (Serial1.available() && n < (int)sizeof(buf)) buf[n++] = (uint8_t)Serial1.read();

    int from = 0;
    if (!echo_checked && g_last_tx_len > 0 && n >= g_last_tx_len) {
      echo_checked = true;
      if (memcmp(buf, g_last_tx, g_last_tx_len) == 0) from = g_last_tx_len;
    }
    for (int i = from; i + 5 < n; i++) {
      if (buf[i] != 0xFF || buf[i + 1] != 0xFF || buf[i + 2] == 0xFF) continue;
      uint8_t sid = buf[i + 2];
      uint8_t len = buf[i + 3];
      int end = i + 3 + len;  // index of checksum
      if (end >= n) break;    // not complete yet
      if (sid != id) continue;
      if (scsChecksum(&buf[i + 2], len + 1) != buf[end]) continue;
      int plen = len - 2;     // minus error byte and checksum
      if (plen < want) continue;
      if (params && want > 0) memcpy(params, &buf[i + 5], want);
      return true;
    }
    delayMicroseconds(50);
  }
  return false;
}

static void writeBytes(uint8_t id, uint8_t addr, const uint8_t *data, int n) {
  uint8_t p[16];
  p[0] = addr;
  memcpy(&p[1], data, n);
  busInstruction(id, INST_WRITE, p, n + 1);
  if (id != BROADCAST_ID) busReadStatus(id, nullptr, 0, READ_TIMEOUT_MS);
}

static void writeByte(uint8_t id, uint8_t addr, uint8_t v) { writeBytes(id, addr, &v, 1); }

static void writeWord(uint8_t id, uint8_t addr, uint16_t v) {
  uint8_t d[2] = {(uint8_t)(v & 0xFF), (uint8_t)(v >> 8)};
  writeBytes(id, addr, d, 2);
}

static bool readBlock(uint8_t id, uint8_t addr, uint8_t len, uint8_t *out) {
  uint8_t p[2] = {addr, len};
  busInstruction(id, INST_READ, p, 2);
  return busReadStatus(id, out, len, READ_TIMEOUT_MS);
}

static bool ping(uint8_t id) {
  busInstruction(id, INST_PING, nullptr, 0);
  return busReadStatus(id, nullptr, 0, READ_TIMEOUT_MS);
}

// One SYNC WRITE sets goal position + speed on all joints at once.
static void syncWriteGoals(const uint16_t *pos, uint16_t speed) {
  uint8_t p[2 + NUM_JOINTS * 7];
  p[0] = REG_GOAL_POS;
  p[1] = 6;
  int o = 2;
  for (int i = 0; i < NUM_JOINTS; i++) {
    p[o++] = (uint8_t)(i + 1);
    p[o++] = (uint8_t)(pos[i] & 0xFF);
    p[o++] = (uint8_t)(pos[i] >> 8);
    p[o++] = 0;
    p[o++] = 0;
    p[o++] = (uint8_t)(speed & 0xFF);
    p[o++] = (uint8_t)(speed >> 8);
  }
  busInstruction(BROADCAST_ID, INST_SYNC_WRITE, p, o);
}

static int16_t signMag(uint16_t raw) {
  int mag = raw & 0x7FFF;
  return (raw & 0x8000) ? (int16_t)(-mag) : (int16_t)mag;
}

// ================================================================ gait
static uint16_t jointTarget(int i, float offset_counts) {
  int off = (int)lroundf(offset_counts);
  if (off > JOINT_LIMIT) off = JOINT_LIMIT;
  if (off < -JOINT_LIMIT) off = -JOINT_LIMIT;
  return (uint16_t)(ENC_CENTER + TRIM[i] + off);
}

static void straightPose(uint16_t *out) {
  for (int i = 0; i < NUM_JOINTS; i++) out[i] = jointTarget(i, 0);
}

// Travelling wave. t in seconds since gait start; ramp 0..1 scales amplitude.
static void gaitPose(float t, float ramp, uint8_t state, int8_t turn, uint16_t *out) {
  const float amp = AMPLITUDE_DEG * COUNTS_PER_DEG * ramp;
  const float dir = (state == STATE_REV) ? -1.0f : 1.0f;
  const float bend = (state == STATE_TURN) ? turn * TURN_DEG * COUNTS_PER_DEG : 0.0f;
  const float w = 2.0f * PI * WAVE_HZ;
  for (int i = 0; i < NUM_JOINTS; i++) {
    float phase = dir * w * t - (i + 1) * PHASE_SHIFT;
    out[i] = jointTarget(i, amp * sinf(phase) + bend);
  }
}

// ================================================================ modes
static void torqueAll(bool on) {
  if (!on) {
    writeByte(BROADCAST_ID, REG_TORQUE, 0);
    return;
  }
  writeByte(BROADCAST_ID, REG_TORQUE, 1);
}

static void enterIdle(const char *why) {
  torqueAll(false);
  g_mode = MODE_IDLE;
  g_state = STATE_STOP;
  Serial.printf("[STOP] %s — torque off\n", why);
}

// Load safe settings, then switch torque on one power group (2 servos) at a
// time while they walk slowly to `pose`. Keeps inrush per 3 A PTC low.
static void softTorqueOn(const uint16_t *pose) {
  writeByte(BROADCAST_ID, REG_ACC, SOFT_ACC);
  writeWord(BROADCAST_ID, REG_TORQUE_LIMIT, TORQUE_LIMIT);
  syncWriteGoals(pose, SOFT_SPEED);
  for (int g = 0; g < NUM_JOINTS / 2; g++) {
    writeByte((uint8_t)(2 * g + 1), REG_TORQUE, 1);
    writeByte((uint8_t)(2 * g + 2), REG_TORQUE, 1);
    delay(GROUP_DELAY_MS);
  }
  delay(1500);  // let every joint arrive at the pose
}

static void enterCenter() {
  uint16_t pose[NUM_JOINTS];
  straightPose(pose);
  Serial.println("[CENTER] holding straight — soft start");
  softTorqueOn(pose);
  g_mode = MODE_CENTER;
  g_state = STATE_STOP;
}

static void enterGait() {
  uint16_t pose[NUM_JOINTS];
  gaitPose(0.0f, 0.0f, STATE_SLITHER, 1, pose);  // amplitude 0 = straight
  Serial.println("[RUN] soft start — keep clear");
  softTorqueOn(pose);
  writeByte(BROADCAST_ID, REG_ACC, GAIT_ACC);
  memset(g_stall_count, 0, sizeof(g_stall_count));
  g_gait_t0 = millis();
  g_state = STATE_SLITHER;
  g_mode = MODE_GAIT;
  Serial.println("[RUN] slithering");
}

static void pingAll() {
  Serial.println("ID  answer  volt  temp");
  int found = 0;
  for (uint8_t id = 1; id <= NUM_JOINTS; id++) {
    uint8_t b[BLOCK_LEN];
    bool ok = ping(id) && readBlock(id, REG_PRESENT_POS, BLOCK_LEN, b);
    if (ok) {
      found++;
      Serial.printf("%2u  yes     %4.1f  %3u C\n", id, b[OFF_VOLT] / 10.0f, b[OFF_TEMP]);
    } else {
      Serial.printf("%2u  NO      ----  ---\n", id);
    }
  }
  Serial.printf("%d/%d servos answered\n", found, NUM_JOINTS);
  if (found == 0) Serial.println("None answered: check GND link, 18/19 pins, and servo power.");
}

// ================================================================ IMU
static bool imuBegin() {
  Wire.begin(IMU_SDA, IMU_SCL);
  Wire.setClock(400000);
  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  return Wire.endTransmission() == 0;
}

static void imuRead(int16_t acc_mg[3], int16_t gyro_dps_x10[3]) {
  for (int k = 0; k < 3; k++) acc_mg[k] = gyro_dps_x10[k] = 0;
  if (!g_imu_ok) return;
  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return;
  if (Wire.requestFrom((int)IMU_ADDR, 14) < 14) return;
  int16_t r[7];
  for (int k = 0; k < 7; k++) {
    uint8_t hi = (uint8_t)Wire.read();  // two statements: C++ does not fix
    uint8_t lo = (uint8_t)Wire.read();  // the order of reads in one expression
    r[k] = (int16_t)((hi << 8) | lo);
  }
  for (int k = 0; k < 3; k++) {
    acc_mg[k] = (int16_t)((int32_t)r[k] * 1000 / 16384);          // ±2 g
    gyro_dps_x10[k] = (int16_t)((int32_t)r[k + 4] * 10 / 131);    // ±250 dps
  }
}

// ================================================================ radio
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
void onRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  (void)info;
#else
void onRecv(const uint8_t *mac, const uint8_t *data, int len) {
  (void)mac;
#endif
  if (len == (int)sizeof(RobotCommand)) {
    RobotCommand cmd;
    memcpy(&cmd, data, sizeof(cmd));
    g_pending_run = cmd.run ? 1 : 0;  // applied in loop(), never here
  }
}

static void setupEspNow() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed — Serial control only");
    return;
  }
  esp_now_register_recv_cb(onRecv);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, kBroadcastMac, 6);
  peer.channel = 0;
  peer.encrypt = false;
  if (esp_now_add_peer(&peer) != ESP_OK) Serial.println("ESP-NOW add peer failed");
}

// ================================================================ commands
static void handleSerial() {
  if (!Serial.available()) return;
  String s = Serial.readStringUntil('\n');
  s.trim();
  s.toUpperCase();
  if (s == "RUN") g_pending_run = 1;
  else if (s == "STOP") g_pending_run = 0;
  else if (s == "CENTER") { if (g_mode == MODE_IDLE) enterCenter(); else Serial.println("STOP first"); }
  else if (s == "PING") { if (g_mode == MODE_IDLE) pingAll(); else Serial.println("STOP first"); }
  else if (s.length()) Serial.println("Commands: RUN  STOP  CENTER  PING");
}

static void applyPending() {
  int8_t p = g_pending_run;
  if (p < 0) return;
  g_pending_run = -1;
  if (p == 0) {
    if (g_mode != MODE_IDLE) enterIdle("command");
  } else if (g_mode != MODE_GAIT) {
    enterGait();
  }
}

// ================================================================ setup / loop
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  Serial1.begin(SERVO_BAUD, SERIAL_8N1, S_RXD, S_TXD);
  delay(500);

  Serial.println("\nSURGE-090 robot ESP32 — ST3215 x10, split power bus v3");
  torqueAll(false);  // whatever state the servos were left in: go limp
  g_imu_ok = imuBegin();
  Serial.println(g_imu_ok ? "MPU6050 ok" : "MPU6050 missing — gait still works");
  setupEspNow();
  Serial.printf("STA MAC %s\n", WiFi.macAddress().c_str());
  pingAll();
  Serial.println("Idle, torque OFF. Type RUN, STOP, CENTER or PING.");
}

void loop() {
  const uint32_t now = millis();
  static uint32_t last_tel = 0;

  handleSerial();
  applyPending();

  // ---- read every servo once (position, voltage, temperature, current)
  int16_t cur[NUM_JOINTS] = {0};
  uint16_t pos[NUM_JOINTS] = {0};
  uint8_t vmin = 0, tmax = 0;
  int answered = 0;
  for (uint8_t id = 1; id <= NUM_JOINTS; id++) {
    uint8_t b[BLOCK_LEN];
    if (!readBlock(id, REG_PRESENT_POS, BLOCK_LEN, b)) continue;
    answered++;
    pos[id - 1] = (uint16_t)(b[OFF_POS] | (b[OFF_POS + 1] << 8));
    cur[id - 1] = (int16_t)(signMag((uint16_t)(b[OFF_CUR] | (b[OFF_CUR + 1] << 8))) * CURRENT_LSB_MA);
    uint8_t v = b[OFF_VOLT];
    if (vmin == 0 || v < vmin) vmin = v;
    if (b[OFF_TEMP] > tmax) tmax = b[OFF_TEMP];
  }

  // ---- protection (active whenever torque is on)
  if (g_mode != MODE_IDLE) {
    if (answered > 0 && vmin < LOW_BATT_DECIV) {
      if (g_low_batt_since == 0) g_low_batt_since = now;
      if (now - g_low_batt_since > LOW_BATT_MS) enterIdle("low battery (<10.2 V) — charge the pack");
    } else {
      g_low_batt_since = 0;
    }
    if (g_mode != MODE_IDLE && tmax >= MAX_TEMP_C) enterIdle("servo over 70 C — let it cool");
  }

  // ---- gait
  if (g_mode == MODE_GAIT) {
    if (g_state == STATE_REV || g_state == STATE_TURN) {
      if ((int32_t)(now - g_state_end_ms) >= 0) {
        if (g_state == STATE_REV) {
          g_state = STATE_TURN;
          g_state_end_ms = now + (uint32_t)(TURN_S * 1000);
          Serial.println("[EVADE] reverse -> turn");
        } else {
          g_state = STATE_SLITHER;
          memset(g_stall_count, 0, sizeof(g_stall_count));
          Serial.println("[EVADE] resume slither");
        }
      }
    } else {
      for (int i = 0; i < NUM_JOINTS; i++) {
        g_stall_count[i] = (abs(cur[i]) > CURRENT_TRIP_MA) ? g_stall_count[i] + 1 : 0;
        if (g_stall_count[i] >= STALL_SAMPLES) {
          g_turn = cur[i] > 0 ? -1 : 1;
          g_state = STATE_REV;
          g_state_end_ms = now + (uint32_t)(REV_S * 1000);
          Serial.printf("[ALERT] servo %d stalled at %d mA -> reverse\n", i + 1, cur[i]);
          break;
        }
      }
    }
    const uint32_t dt = now - g_gait_t0;
    const float ramp = dt < AMP_RAMP_MS ? (float)dt / AMP_RAMP_MS : 1.0f;
    uint16_t goals[NUM_JOINTS];
    gaitPose(dt / 1000.0f, ramp, g_state, g_turn, goals);
    syncWriteGoals(goals, GAIT_SPEED);
  }

  // ---- telemetry at 10 Hz
  if (now - last_tel >= TELEMETRY_DT_MS) {
    last_tel = now;
    int16_t acc[3], gyro[3];
    imuRead(acc, gyro);
    RobotTelemetry tel = {};
    tel.t_ms = now;
    tel.state = g_state;
    tel.turn_dir = g_turn;
    memcpy(tel.current_ma, cur, sizeof(cur));
    memcpy(tel.position, pos, sizeof(pos));
    memcpy(tel.acc_mg, acc, sizeof(acc));
    memcpy(tel.gyro_dps_x10, gyro, sizeof(gyro));
    tel.vin_deciV = vmin;
    esp_now_send(kBroadcastMac, (uint8_t *)&tel, sizeof(tel));

    int total = 0;
    for (int i = 0; i < NUM_JOINTS; i++) total += abs(cur[i]);
    Serial.printf("T,%lu,state=%u,servos=%d/%d,V=%.1f,Tmax=%u,Itot=%dmA\n",
                  (unsigned long)now, (unsigned)g_state, answered, NUM_JOINTS,
                  vmin / 10.0f, (unsigned)tmax, total);
  }

  const uint32_t elapsed = millis() - now;
  if (elapsed < LOOP_DT_MS) delay(LOOP_DT_MS - elapsed);
}

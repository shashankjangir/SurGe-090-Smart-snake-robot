/*
 * Onboard gait + ST3215 bus + MPU6050 + ESP-NOW.
 * Board: Waveshare Servo Driver with ESP32
 * Power: 3S LiPo -> driver VIN (6.0–12.6 V). Mean Well 5 V is for the Pi only.
 * IMU: SDA GPIO21, SCL GPIO22, 3.3 V.
 * Serial Monitor 115200 prints this board's MAC and telemetry CSV.
 *
 * Pairing: telemetry is sent to the broadcast address so the base ESP32
 * does not need a hardcoded robot MAC. Type RUN or STOP here, or from the base.
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <math.h>
#include "surge_protocol.h"

static const int S_RXD = 18;
static const int S_TXD = 19;
static const int IMU_SDA = 21;
static const int IMU_SCL = 22;
static const uint8_t IMU_ADDR = 0x68;

static const int NUM_JOINTS = SURGE_NUM_JOINTS;
static const int ENC_CENTER = 2048;
static const int ENC_MIN = 0;
static const int ENC_MAX = 4095;
static const int AMPLITUDE = 400;
static const float FREQUENCY = 3.0f;
static const float PHASE_SHIFT = 1.2f;
static const int TURN_OFFSET = 300;
static const int GOAL_SPEED = 2400;
static const int CURRENT_TRIP_MA = 1200;
static const float CURRENT_LSB_MA = 6.5f;
static const float REV_S = 2.5f;
static const float TURN_S = 4.0f;
static const uint32_t LOOP_DT_MS = 20;

static const uint8_t REG_TORQUE = 40;
static const uint8_t REG_ACC = 41;
static const uint8_t REG_GOAL_POS = 42;
static const uint8_t REG_PRESENT_POS = 56;
static const uint8_t REG_PRESENT_VOLT = 62;
static const uint8_t REG_PRESENT_CUR = 69;
static const uint8_t INST_WRITE = 0x03;
static const uint8_t INST_READ = 0x02;
static const uint8_t INST_SYNC_WRITE = 0x83;
static const uint8_t BROADCAST_ID = 0xFE;

static uint8_t kBroadcastMac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

static volatile bool g_run = true;
static uint8_t g_state = STATE_SLITHER;
static int8_t g_turn = 1;
static uint32_t g_state_end_ms = 0;
static bool g_imu_ok = false;

static uint8_t scsChecksum(const uint8_t *body, int n) {
  uint16_t s = 0;
  for (int i = 0; i < n; i++) s += body[i];
  return (uint8_t)(~s);
}

static void scsWriteRaw(const uint8_t *pkt, int n) {
  Serial1.write(pkt, n);
  Serial1.flush();
}

static bool scsReadStatus(uint8_t id, uint8_t *params, int maxParams, int *outLen, uint32_t timeout_ms) {
  uint32_t start = millis();
  uint8_t buf[64];
  int n = 0;
  while (millis() - start < timeout_ms) {
    while (Serial1.available() && n < (int)sizeof(buf)) {
      buf[n++] = (uint8_t)Serial1.read();
    }
    for (int i = 0; i + 5 < n; i++) {
      if (buf[i] != 0xFF || buf[i + 1] != 0xFF) continue;
      uint8_t sid = buf[i + 2];
      uint8_t len = buf[i + 3];
      int end = i + 4 + len - 1;
      if (end >= n) break;
      if (sid != id) continue;
      uint8_t cs = buf[end];
      if (scsChecksum(&buf[i + 2], len + 1) != cs) continue;
      int plen = len - 2;
      if (plen < 0) plen = 0;
      if (plen > maxParams) plen = maxParams;
      if (params && plen > 0) memcpy(params, &buf[i + 5], plen);
      if (outLen) *outLen = plen;
      return true;
    }
    delay(0);
  }
  return false;
}

static void scsWriteByte(uint8_t id, uint8_t addr, uint8_t value) {
  uint8_t body[] = {id, 0x04, INST_WRITE, addr, value};
  uint8_t pkt[] = {0xFF, 0xFF, body[0], body[1], body[2], body[3], body[4], scsChecksum(body, 5)};
  while (Serial1.available()) Serial1.read();
  scsWriteRaw(pkt, sizeof(pkt));
  uint8_t dummy[4];
  int dummyLen = 0;
  scsReadStatus(id, dummy, 4, &dummyLen, 8);
}

static bool scsRead(uint8_t id, uint8_t addr, uint8_t length, uint8_t *out) {
  uint8_t body[] = {id, 0x04, INST_READ, addr, length};
  uint8_t pkt[] = {0xFF, 0xFF, body[0], body[1], body[2], body[3], body[4], scsChecksum(body, 5)};
  while (Serial1.available()) Serial1.read();
  scsWriteRaw(pkt, sizeof(pkt));
  int got = 0;
  return scsReadStatus(id, out, length, &got, 8) && got >= length;
}

static int16_t feetechSignedMag(uint16_t raw) {
  int mag = raw & 0x7FFF;
  return (raw & 0x8000) ? (int16_t)(-mag) : (int16_t)mag;
}

static void syncWritePositions(const uint16_t *pos) {
  // addr, data_len=6, then (id, posL posH timeL timeH spdL spdH) * N
  const uint8_t dataLen = 6;
  const int n = NUM_JOINTS;
  uint8_t payload[2 + n * 7];
  payload[0] = REG_GOAL_POS;
  payload[1] = dataLen;
  int o = 2;
  for (int i = 0; i < n; i++) {
    uint16_t p = pos[i];
    payload[o++] = (uint8_t)(i + 1);
    payload[o++] = (uint8_t)(p & 0xFF);
    payload[o++] = (uint8_t)((p >> 8) & 0xFF);
    payload[o++] = 0;
    payload[o++] = 0;
    payload[o++] = (uint8_t)(GOAL_SPEED & 0xFF);
    payload[o++] = (uint8_t)((GOAL_SPEED >> 8) & 0xFF);
  }
  uint8_t lenField = (uint8_t)(o + 2);
  uint8_t body[1 + 1 + 1 + sizeof(payload)];
  body[0] = BROADCAST_ID;
  body[1] = lenField;
  body[2] = INST_SYNC_WRITE;
  memcpy(&body[3], payload, o);
  int bodyN = 3 + o;
  uint8_t pkt[128];
  pkt[0] = 0xFF;
  pkt[1] = 0xFF;
  memcpy(&pkt[2], body, bodyN);
  pkt[2 + bodyN] = scsChecksum(body, bodyN);
  scsWriteRaw(pkt, bodyN + 3);
}

static void enableTorque(bool on) {
  for (uint8_t id = 1; id <= NUM_JOINTS; id++) {
    scsWriteByte(id, REG_ACC, 50);
    scsWriteByte(id, REG_TORQUE, on ? 1 : 0);
  }
}

static void gaitPositions(float t, uint8_t mode, int8_t turn, uint16_t *out) {
  float waveDir = (mode == STATE_REV) ? -1.0f : 1.0f;
  int bend = (mode == STATE_TURN) ? (turn * TURN_OFFSET) : 0;
  for (int i = 1; i <= NUM_JOINTS; i++) {
    float phase = waveDir * FREQUENCY * t - i * PHASE_SHIFT;
    int pos = ENC_CENTER + (int)(AMPLITUDE * sinf(phase)) + bend;
    if (pos < ENC_MIN) pos = ENC_MIN;
    if (pos > ENC_MAX) pos = ENC_MAX;
    out[i - 1] = (uint16_t)pos;
  }
}

static bool imuBegin() {
  Wire.begin(IMU_SDA, IMU_SCL);
  Wire.setClock(400000);
  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  return Wire.endTransmission() == 0;
}

static void imuRead(int16_t acc_mg[3], int16_t gyro_dps_x10[3]) {
  acc_mg[0] = acc_mg[1] = acc_mg[2] = 0;
  gyro_dps_x10[0] = gyro_dps_x10[1] = gyro_dps_x10[2] = 0;
  if (!g_imu_ok) return;
  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return;
  if (Wire.requestFrom((int)IMU_ADDR, 14) < 14) return;
  int16_t ax = (Wire.read() << 8) | Wire.read();
  int16_t ay = (Wire.read() << 8) | Wire.read();
  int16_t az = (Wire.read() << 8) | Wire.read();
  Wire.read();
  Wire.read();  // temp
  int16_t gx = (Wire.read() << 8) | Wire.read();
  int16_t gy = (Wire.read() << 8) | Wire.read();
  int16_t gz = (Wire.read() << 8) | Wire.read();
  // MPU6050 default ±2 g, 16384 LSB/g; gyro ±250 dps, 131 LSB/dps
  acc_mg[0] = (int16_t)((int32_t)ax * 1000 / 16384);
  acc_mg[1] = (int16_t)((int32_t)ay * 1000 / 16384);
  acc_mg[2] = (int16_t)((int32_t)az * 1000 / 16384);
  gyro_dps_x10[0] = (int16_t)((int32_t)gx * 10 / 131);
  gyro_dps_x10[1] = (int16_t)((int32_t)gy * 10 / 131);
  gyro_dps_x10[2] = (int16_t)((int32_t)gz * 10 / 131);
}

static void applyCommand(const RobotCommand *cmd) {
  g_run = cmd->run != 0;
  if (!g_run) {
    g_state = STATE_STOP;
    enableTorque(false);
  } else if (g_state == STATE_STOP) {
    g_state = STATE_SLITHER;
    enableTorque(true);
  }
}

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
    applyCommand(&cmd);
  }
}

static void setupEspNow() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }
  esp_now_register_recv_cb(onRecv);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, kBroadcastMac, 6);
  peer.channel = 0;
  peer.encrypt = false;
  if (esp_now_add_peer(&peer) != ESP_OK) {
    Serial.println("ESP-NOW add broadcast peer failed");
  }
}

void setup() {
  Serial.begin(115200);
  Serial1.begin(1000000, SERIAL_8N1, S_RXD, S_TXD);
  delay(400);

  Serial.println("SURGE-090 robot ESP32 (ST3215)");

  g_imu_ok = imuBegin();
  Serial.println(g_imu_ok ? "MPU6050 ok" : "MPU6050 missing — gait continues");

  setupEspNow();
  Serial.printf("STA MAC %s\n", WiFi.macAddress().c_str());
  enableTorque(true);
  Serial.println("Type RUN or STOP. Gait started.");
}

void loop() {
  static uint32_t t0 = millis();
  uint32_t now = millis();
  float t = (now - t0) / 1000.0f;

  if (Serial.available()) {
    String s = Serial.readStringUntil('\n');
    s.trim();
    s.toUpperCase();
    RobotCommand cmd;
    if (s == "STOP") {
      cmd.run = 0;
      applyCommand(&cmd);
    } else if (s == "RUN") {
      cmd.run = 1;
      applyCommand(&cmd);
    }
  }

  int16_t currents[NUM_JOINTS];
  uint16_t positions[NUM_JOINTS];
  uint8_t vinDeci = 0;
  memset(currents, 0, sizeof(currents));
  memset(positions, 0, sizeof(positions));

  if (g_run && g_state != STATE_STOP) {
    for (uint8_t id = 1; id <= NUM_JOINTS; id++) {
      uint8_t cbuf[2] = {0, 0};
      uint8_t pbuf[2] = {0, 0};
      uint8_t vbuf[1] = {0};
      if (scsRead(id, REG_PRESENT_CUR, 2, cbuf)) {
        uint16_t raw = (uint16_t)cbuf[0] | ((uint16_t)cbuf[1] << 8);
        currents[id - 1] = (int16_t)(feetechSignedMag(raw) * CURRENT_LSB_MA);
      }
      if (scsRead(id, REG_PRESENT_POS, 2, pbuf)) {
        positions[id - 1] = (uint16_t)pbuf[0] | ((uint16_t)pbuf[1] << 8);
      }
      if (id == 1 && scsRead(id, REG_PRESENT_VOLT, 1, vbuf)) {
        vinDeci = vbuf[0];
      }
    }

    if (g_state == STATE_REV || g_state == STATE_TURN) {
      if ((int32_t)now >= (int32_t)g_state_end_ms) {
        if (g_state == STATE_REV) {
          g_state = STATE_TURN;
          g_state_end_ms = now + (uint32_t)(TURN_S * 1000);
          Serial.println("[EVASION] reverse -> turn");
        } else {
          g_state = STATE_SLITHER;
          Serial.println("[EVASION] resume slither");
        }
      }
    } else {
      for (int i = 0; i < NUM_JOINTS; i++) {
        if (abs(currents[i]) > CURRENT_TRIP_MA) {
          g_turn = currents[i] > 0 ? -1 : 1;
          g_state = STATE_REV;
          g_state_end_ms = now + (uint32_t)(REV_S * 1000);
          Serial.printf("[ALERT] stall servo %d  %d mA\n", i + 1, currents[i]);
          break;
        }
      }
    }

    uint16_t goals[NUM_JOINTS];
    gaitPositions(t, g_state, g_turn, goals);
    syncWritePositions(goals);
  }

  int16_t acc[3], gyro[3];
  imuRead(acc, gyro);

  RobotTelemetry tel = {};
  tel.t_ms = now;
  tel.state = g_state;
  tel.turn_dir = g_turn;
  memcpy(tel.current_ma, currents, sizeof(currents));
  memcpy(tel.position, positions, sizeof(positions));
  memcpy(tel.acc_mg, acc, sizeof(acc));
  memcpy(tel.gyro_dps_x10, gyro, sizeof(gyro));
  tel.vin_deciV = vinDeci;
  esp_now_send(kBroadcastMac, (uint8_t *)&tel, sizeof(tel));

  Serial.printf(
      "T,%lu,%u,%d,%d,%d,%d,%d,%u\n",
      (unsigned long)now,
      (unsigned)g_state,
      (int)g_turn,
      (int)currents[0],
      (int)acc[0],
      (int)acc[1],
      (int)acc[2],
      (unsigned)vinDeci);

  uint32_t elapsed = millis() - now;
  if (elapsed < LOOP_DT_MS) delay(LOOP_DT_MS - elapsed);
}

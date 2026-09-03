/*
 * spin_all — bench smoke test. Broadcasts one gentle sine sweep to EVERY
 * servo on the bus at once, so it runs before IDs are assigned (all ST3215
 * ship as ID 1) as well as after.
 *
 * Waveshare Servo Driver with ESP32: servo UART GPIO 18 RX / 19 TX, 1 Mbps.
 * Broadcast ID 0xFE — servos act, none reply, so ten units still sharing
 * ID 1 cannot collide on the response.
 *
 * Tuned for a 12 V 2 A bench supply: small amplitude, low acceleration,
 * slow goal speed, amplitude ramped in over the first few seconds. If the
 * supply still trips, drop AMPLITUDE and GOAL_SPEED before anything else.
 *
 * Serial Monitor 115200:   s = torque off (stop)    g = start again
 *
 * Register map mirrors St3215Addr in src/robot_config.py.
 */

#include <Arduino.h>

static const int S_RXD = 18;
static const int S_TXD = 19;

static const uint8_t BROADCAST_ID = 0xFE;
static const uint8_t INST_WRITE   = 0x03;

static const uint8_t REG_TORQUE_ENABLE = 40;
static const uint8_t REG_ACC           = 41;
static const uint8_t REG_GOAL_POSITION = 42;  // pos(2) + time(2) + speed(2)

static const uint16_t ENCODER_CENTER = 2048;
static const uint16_t AMPLITUDE      = 150;   // ticks, ~13 deg. Start small.
static const uint16_t GOAL_SPEED     = 300;   // steps/s, ~26 deg/s
static const uint8_t  GOAL_ACC       = 20;    // low accel = low current spike
static const uint32_t PERIOD_MS      = 6000;  // one full sweep cycle
static const uint32_t RAMP_MS        = 3000;  // ease amplitude in from zero
static const uint16_t UPDATE_HZ      = 20;

static bool     running = false;
static uint32_t t0      = 0;

static uint8_t checksum(const uint8_t *body, int n) {
  uint16_t s = 0;
  for (int i = 0; i < n; i++) s += body[i];
  return (uint8_t)(~s);
}

static void writeBytes(uint8_t id, uint8_t addr, const uint8_t *data, uint8_t n) {
  uint8_t body[16];
  body[0] = id;
  body[1] = (uint8_t)(n + 3);
  body[2] = INST_WRITE;
  body[3] = addr;
  for (uint8_t i = 0; i < n; i++) body[4 + i] = data[i];
  const uint8_t len = (uint8_t)(4 + n);

  uint8_t pkt[20];
  pkt[0] = 0xFF;
  pkt[1] = 0xFF;
  memcpy(pkt + 2, body, len);
  pkt[2 + len] = checksum(body, len);

  Serial1.write(pkt, len + 3);
  Serial1.flush();
}

static void writeByte(uint8_t id, uint8_t addr, uint8_t value) {
  writeBytes(id, addr, &value, 1);
}

/* Position is little-endian. Goal time 0 means "use goal speed". */
static void setGoal(uint16_t ticks, uint16_t speed) {
  uint8_t d[6] = {
    (uint8_t)(ticks & 0xFF), (uint8_t)(ticks >> 8),
    0, 0,
    (uint8_t)(speed & 0xFF), (uint8_t)(speed >> 8),
  };
  writeBytes(BROADCAST_ID, REG_GOAL_POSITION, d, 6);
}

static void startSweep() {
  /* Order matters: gentle accel and a centre target are loaded BEFORE
     torque goes on, so the move to centre is a slow walk, not a snap. */
  writeByte(BROADCAST_ID, REG_ACC, GOAL_ACC);
  delay(10);
  setGoal(ENCODER_CENTER, GOAL_SPEED);
  delay(10);
  writeByte(BROADCAST_ID, REG_TORQUE_ENABLE, 1);

  Serial.println("Torque ON — every horn is rotating to centre. Keep clear.");
  delay(2000);

  t0 = millis();
  running = true;
  Serial.println("Sweeping. 's' to stop.");
}

static void stopSweep() {
  writeByte(BROADCAST_ID, REG_TORQUE_ENABLE, 0);
  running = false;
  Serial.println("Torque OFF — horns are free.");
}

void setup() {
  Serial.begin(115200);
  Serial1.begin(1000000, SERIAL_8N1, S_RXD, S_TXD);
  delay(500);

  Serial.println();
  Serial.println("spin_all — broadcast sweep, no servo IDs required");
  Serial.println("s = stop, g = go");
  startSweep();
}

void loop() {
  if (Serial.available()) {
    const int c = Serial.read();
    if (c == 's') stopSweep();
    else if (c == 'g' && !running) startSweep();
  }
  if (!running) return;

  const uint32_t dt    = millis() - t0;
  const float    ramp  = dt < RAMP_MS ? (float)dt / (float)RAMP_MS : 1.0f;
  const float    phase = 2.0f * PI * (float)(dt % PERIOD_MS) / (float)PERIOD_MS;
  const int16_t  off   = (int16_t)(AMPLITUDE * ramp * sinf(phase));

  setGoal((uint16_t)(ENCODER_CENTER + off), GOAL_SPEED);
  delay(1000 / UPDATE_HZ);
}

/*
 * Assign ST3215 IDs. Plug in ONE servo (factory ID = 1).
 * Waveshare Servo Driver with ESP32: VIN 6–12.6 V, UART1 GPIO 18/19.
 *
 * Serial Monitor 115200. Type the new ID (1–10) and press Enter.
 * Unplug, label, repeat.
 */

#include <Arduino.h>

static const int S_RXD = 18;
static const int S_TXD = 19;

static const uint8_t REG_ID = 5;
static const uint8_t REG_LOCK = 55;
static const uint8_t INST_WRITE = 0x03;

static uint8_t checksum(const uint8_t *body, int n) {
  uint16_t s = 0;
  for (int i = 0; i < n; i++) s += body[i];
  return (uint8_t)(~s);
}

static void writeByte(uint8_t id, uint8_t addr, uint8_t value) {
  uint8_t body[] = {id, 0x04, INST_WRITE, addr, value};
  uint8_t pkt[8] = {0xFF, 0xFF, body[0], body[1], body[2], body[3], body[4], checksum(body, 5)};
  Serial1.write(pkt, sizeof(pkt));
  Serial1.flush();
  delay(20);
  while (Serial1.available()) Serial1.read();
}

void setup() {
  Serial.begin(115200);
  Serial1.begin(1000000, SERIAL_8N1, S_RXD, S_TXD);
  delay(500);
  Serial.println("ST3215 ID tool — one servo on the bus, VIN 6-12.6 V");
  Serial.println("Enter new ID 1-10:");
}

void loop() {
  if (Serial.available() <= 0) return;
  int neu = Serial.parseInt();
  if (neu < 1 || neu > 10) {
    if (neu != 0) Serial.println("ID must be 1-10");
    return;
  }
  writeByte(1, REG_LOCK, 0);
  writeByte(1, REG_ID, (uint8_t)neu);
  writeByte((uint8_t)neu, REG_LOCK, 1);
  Serial.printf("Assigned ID %d. Unplug this servo before the next one.\n", neu);
}

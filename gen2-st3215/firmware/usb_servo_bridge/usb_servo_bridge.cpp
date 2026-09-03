/*
 * USB CDC <-> ST3215 bus bridge for the Waveshare Servo Driver with ESP32.
 *
 * Flash this to use Python (main.py, tests, tools/assign_id.py) from a PC.
 * VIN: 3S LiPo 6.0–12.6 V on the driver DC jack. Not 5 V.
 *
 * Servo UART default: GPIO 18 RX, GPIO 19 TX, 1 Mbps.
 * If pings fail, swap RX/TX in begin() or check silkscreen for your board revision.
 */

#include <Arduino.h>

static const int S_RXD = 18;
static const int S_TXD = 19;

void setup() {
  Serial.begin(1000000);
  Serial1.begin(1000000, SERIAL_8N1, S_RXD, S_TXD);
}

void loop() {
  while (Serial.available()) {
    Serial1.write(Serial.read());
  }
  while (Serial1.available()) {
    Serial.write(Serial1.read());
  }
}

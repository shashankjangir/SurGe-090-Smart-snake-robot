/*
 * Base-station ESP32: ESP-NOW RX -> USB serial for Raspberry Pi 5.
 * Mean Well 5 V powers the Pi, not this radio (USB 5 V from the Pi is enough).
 *
 * Serial 115200. Prints TELEMETRY CSV. Send RUN or STOP to the robot.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include "surge_protocol.h"

static uint8_t kBroadcastMac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

static void printTelemetry(const RobotTelemetry &t) {
  Serial.printf("TELEMETRY,%lu,%u,%d", (unsigned long)t.t_ms, (unsigned)t.state, (int)t.turn_dir);
  for (int i = 0; i < SURGE_NUM_JOINTS; i++) Serial.printf(",%d", (int)t.current_ma[i]);
  for (int i = 0; i < SURGE_NUM_JOINTS; i++) Serial.printf(",%u", (unsigned)t.position[i]);
  Serial.printf(",%d,%d,%d,%d,%d,%d,%u\n",
                (int)t.acc_mg[0], (int)t.acc_mg[1], (int)t.acc_mg[2],
                (int)t.gyro_dps_x10[0], (int)t.gyro_dps_x10[1], (int)t.gyro_dps_x10[2],
                (unsigned)t.vin_deciV);
}

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
void onRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  (void)info;
#else
void onRecv(const uint8_t *mac, const uint8_t *data, int len) {
  (void)mac;
#endif
  if (len == (int)sizeof(RobotTelemetry)) {
    RobotTelemetry t;
    memcpy(&t, data, sizeof(t));
    printTelemetry(t);
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  Serial.printf("SURGE-090 base ESP32  MAC %s\n", WiFi.macAddress().c_str());
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }
  esp_now_register_recv_cb(onRecv);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, kBroadcastMac, 6);
  peer.channel = 0;
  peer.encrypt = false;
  esp_now_add_peer(&peer);
  Serial.println("Awaiting robot telemetry. Type RUN or STOP.");
}

void loop() {
  if (Serial.available()) {
    String s = Serial.readStringUntil('\n');
    s.trim();
    s.toUpperCase();
    RobotCommand cmd;
    if (s == "STOP") cmd.run = 0;
    else if (s == "RUN") cmd.run = 1;
    else return;
    esp_now_send(kBroadcastMac, (uint8_t *)&cmd, sizeof(cmd));
    Serial.printf("Sent %s\n", s.c_str());
  }
}

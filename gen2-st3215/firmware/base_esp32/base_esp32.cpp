#include "../common/serial_line.h"
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

static QueueHandle_t telemetryQueue;

static uint8_t kBroadcastMac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
static uint8_t kAuthorizedRobotMac[6] = SURGE_AUTHORIZED_ROBOT_MAC;
static const uint8_t kAuthKey[] = SURGE_PROVISIONED_AUTH_KEY;
static uint32_t g_last_telem_seq = 0;
static uint32_t g_cmd_seq = 0;
static uint32_t g_cmd_epoch = 1;

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
  const uint8_t *src_mac = info ? info->src_addr : nullptr;
#else
void onRecv(const uint8_t *mac, const uint8_t *data, int len) {
  const uint8_t *src_mac = mac;
#endif
  if (!data || len <= 0) return;

  // CR-05: Authenticated telemetry packet with HMAC-SHA256
  if (len == (int)sizeof(AuthRobotTelemetry)) {
    if (src_mac && memcmp(src_mac, kAuthorizedRobotMac, 6) != 0) {
      return;
    }
    AuthRobotTelemetry auth_tel;
    memcpy(&auth_tel, data, sizeof(auth_tel));
    if (!surge_verify_auth_telemetry(auth_tel, kAuthKey, sizeof(kAuthKey), g_last_telem_seq)) {
      return; // Cryptographic verification failed or replay detected
    }
    if (telemetryQueue) xQueueSend(telemetryQueue, &auth_tel.data, 0);
    return;
  }
}

void setup() {
  Serial.begin(115200);
  telemetryQueue = xQueueCreate(8, sizeof(RobotTelemetry));
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
  RobotTelemetry tel;
  if (telemetryQueue && xQueueReceive(telemetryQueue, &tel, 0) == pdTRUE) printTelemetry(tel);
  String s;
  if (readCommand(Serial, s)) {
    s.trim();
    s.toUpperCase();
    if (s == "RUN") {
      AuthRobotCommand auth_cmd = {};
      auth_cmd.magic = SURGE_CMD_MAGIC;
      auth_cmd.version = SURGE_CRYPTO_VERSION;
      auth_cmd.opcode = SURGE_OP_RUN;
      auth_cmd.seq = ++g_cmd_seq;
      auth_cmd.epoch = g_cmd_epoch;
      surge_sign_auth_command(auth_cmd, kAuthKey, sizeof(kAuthKey));
      esp_err_t result = esp_now_send(kBroadcastMac, (uint8_t *)&auth_cmd, sizeof(auth_cmd));
      Serial.printf("%s %s\n", result == ESP_OK ? "Queued" : "Failed", s.c_str());
    } else if (s == "STOP") {
      AuthRobotCommand auth_cmd = {};
      auth_cmd.magic = SURGE_CMD_MAGIC;
      auth_cmd.version = SURGE_CRYPTO_VERSION;
      auth_cmd.opcode = SURGE_OP_STOP;
      auth_cmd.seq = ++g_cmd_seq;
      auth_cmd.epoch = g_cmd_epoch;
      surge_sign_auth_command(auth_cmd, kAuthKey, sizeof(kAuthKey));
      esp_now_send(kBroadcastMac, (uint8_t *)&auth_cmd, sizeof(auth_cmd));

      // Also send legacy 1-byte STOP for emergency fallback compatibility
      RobotCommand legacy_cmd = { 0 };
      esp_err_t result = esp_now_send(kBroadcastMac, (uint8_t *)&legacy_cmd, sizeof(legacy_cmd));
      Serial.printf("%s %s\n", result == ESP_OK ? "Queued" : "Failed", s.c_str());
    } else return;
  }
}

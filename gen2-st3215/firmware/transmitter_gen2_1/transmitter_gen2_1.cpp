#include "../common/serial_line.h"
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
uint8_t receiverAddress[] = {0x28, 0x05, 0xA5, 0x4E, 0x01, 0x38};
esp_now_peer_info_t peerInfo;
struct RadioReply { char text[250]; };
QueueHandle_t replies;
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
#else
void OnDataRecv(const uint8_t *mac, const uint8_t *data, int len) {
#endif
  if (len <= 0 || len >= 250 || !replies) return;
  RadioReply reply = {};
  memcpy(reply.text, data, len);
  xQueueSend(replies, &reply, 0);
}
void setup() {
  // Keep brownout protection enabled.
  pinMode(2, OUTPUT);
  Serial.begin(115200);
  Serial.setTimeout(10);
  replies = xQueueCreate(16, sizeof(RadioReply));
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }
  memcpy(peerInfo.peer_addr, receiverAddress, 6);
  peerInfo.channel = 1;
  peerInfo.encrypt = false;
  peerInfo.ifidx = WIFI_IF_STA;
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Failed to add receiver peer");
    return;
  }
  esp_now_register_recv_cb(OnDataRecv);
  while (Serial.available())
    Serial.read();
}
void loop() {
  String req;
  if (readCommand(Serial, req)) {
    req.trim();
    if (req.length() > 0) {
      static bool ledState = false;
      ledState = !ledState;
      digitalWrite(2, ledState ? HIGH : LOW);
      if (esp_now_send(receiverAddress, (uint8_t *)req.c_str(), req.length()) != ESP_OK) Serial.println("ERR,RADIO");
    }
  }
  RadioReply message;
  if (replies && xQueueReceive(replies, &message, 0) == pdTRUE) Serial.println(message.text);
}

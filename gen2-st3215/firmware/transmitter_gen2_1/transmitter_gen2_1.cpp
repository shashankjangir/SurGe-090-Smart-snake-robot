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
bool radioReady = false;
volatile bool sendPending = false, deliveryFailed = false;
portMUX_TYPE sendMux = portMUX_INITIALIZER_UNLOCKED;
void OnDataSent(const uint8_t *, esp_now_send_status_t status) {
  portENTER_CRITICAL(&sendMux);
  sendPending = false;
  if (status != ESP_NOW_SEND_SUCCESS) deliveryFailed = true;
  portEXIT_CRITICAL(&sendMux);
}
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
#else
void OnDataRecv(const uint8_t *mac, const uint8_t *data, int len) {
#endif
  if (len <= 0 || len >= 250 || !replies) return;
  #if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  const uint8_t *mac = info->src_addr;
  #endif
  // Only the receiver may supply control replies; sensor broadcasts remain separate.
  if (memcmp(mac, receiverAddress, 6) != 0 && !(len >= 2 && data[0] == 'T' && data[1] == ':')) return;
  RadioReply reply = {};
  memcpy(reply.text, data, len);
  if (xQueueSend(replies, &reply, 0) != pdTRUE) {
    portENTER_CRITICAL(&sendMux); deliveryFailed = true; portEXIT_CRITICAL(&sendMux);
  }
}
void setup() {
  // Keep brownout protection enabled.
  pinMode(2, OUTPUT);
  Serial.begin(115200);
  Serial.setTimeout(10);
  replies = xQueueCreate(16, sizeof(RadioReply));
  if (!replies) { Serial.println("ERR,RADIO,QUEUE"); return; }
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.disconnect();
  if (esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE) != ESP_OK) { Serial.println("ERR,RADIO,CHANNEL"); return; }
  if (esp_now_init() != ESP_OK) {
    Serial.println("ERR,RADIO,INIT");
    return;
  }
  memcpy(peerInfo.peer_addr, receiverAddress, 6);
  peerInfo.channel = 1;
  peerInfo.encrypt = false;
  peerInfo.ifidx = WIFI_IF_STA;
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("ERR,RADIO,PEER");
    return;
  }
  esp_now_register_recv_cb(OnDataRecv);
  esp_now_register_send_cb(OnDataSent);
  radioReady = true;
  while (Serial.available())
    Serial.read();
}
void loop() {
  if (!radioReady) return;
  bool pending, failed;
  portENTER_CRITICAL(&sendMux);
  pending = sendPending; failed = deliveryFailed; deliveryFailed = false;
  portEXIT_CRITICAL(&sendMux);
  if (failed) Serial.println("ERR,RADIO,DELIVERY_OR_QUEUE");
  String req;
  if (!pending && readCommand(Serial, req)) {
    req.trim();
    if (req.length() > 0) {
      static bool ledState = false;
      ledState = !ledState;
      digitalWrite(2, ledState ? HIGH : LOW);
      portENTER_CRITICAL(&sendMux); sendPending = true; portEXIT_CRITICAL(&sendMux);
      if (esp_now_send(receiverAddress, (uint8_t *)req.c_str(), req.length()) != ESP_OK) {
        portENTER_CRITICAL(&sendMux); sendPending = false; portEXIT_CRITICAL(&sendMux);
        Serial.println("ERR,RADIO,SEND");
      }
    }
  }
  RadioReply message;
  if (replies && xQueueReceive(replies, &message, 0) == pdTRUE) Serial.println(message.text);
}

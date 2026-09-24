#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
uint8_t receiverAddress[] = {0x28, 0x05, 0xA5, 0x4E, 0x01, 0x38};
esp_now_peer_info_t peerInfo;
volatile char incomingTelemetry[500];
volatile bool hasTelemetry = false;
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {
  if (len < 500) {
    memcpy((void *)incomingTelemetry, incomingData, len);
    incomingTelemetry[len] = '\0';
    hasTelemetry = true;
  }
}
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); 
  pinMode(2, OUTPUT);
  Serial.begin(115200);
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
  if (Serial.available()) {
    String req = Serial.readStringUntil('\n');
    req.trim();
    if (req.length() > 0) {
      static bool ledState = false;
      ledState = !ledState;
      digitalWrite(2, ledState ? HIGH : LOW);
      esp_now_send(receiverAddress, (uint8_t *)req.c_str(), req.length());
    }
  }
  if (hasTelemetry) {
    hasTelemetry = false;
    Serial.println((char *)incomingTelemetry);
  }
}

#pragma once
#include <ArduinoOTA.h>
#include <WiFi.h>

#if !defined(SURGE_OTA_WIFI_PASSWORD) && !defined(SURGE_OTA_PASSWORD) && __has_include("ota_config.h")
#include "ota_config.h"
#endif
#ifndef SURGE_OTA_WIFI_PASSWORD
#define SURGE_OTA_WIFI_PASSWORD ""
#endif
#ifndef SURGE_OTA_PASSWORD
#define SURGE_OTA_PASSWORD ""
#endif

static volatile bool surgeOtaActive = false;

static bool beginSurgeOta(const char *hostname) {
  const size_t wifiLength = strlen(SURGE_OTA_WIFI_PASSWORD);
  if (wifiLength < 8 || wifiLength > 63 || strlen(SURGE_OTA_PASSWORD) < 16) {
    Serial.println("ERR,OTA,CREDENTIALS");
    return false;
  }
  if (!WiFi.mode(WIFI_AP_STA) || !WiFi.softAP(hostname, SURGE_OTA_WIFI_PASSWORD, 1)) {
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    Serial.println("ERR,OTA,AP");
    return false;
  }
  // Stay in maintenance mode after failed uploads; only reboot restores control.
  surgeOtaActive = true;
  ArduinoOTA.setHostname(hostname);
  ArduinoOTA.setPassword(SURGE_OTA_PASSWORD);
  ArduinoOTA.onStart([]() { Serial.println("OTA,START"); });
  ArduinoOTA.onEnd([]() { Serial.println("OTA,COMPLETE"); });
  ArduinoOTA.onError([](ota_error_t error) { Serial.printf("ERR,OTA,UPLOAD,%u\n", unsigned(error)); });
  ArduinoOTA.begin();
  Serial.printf("OK,OTA,%s,192.168.4.1\n", hostname);
  return true;
}

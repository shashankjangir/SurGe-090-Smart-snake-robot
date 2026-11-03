#include <cassert>
#define SURGE_OTA_WIFI_PASSWORD ""
#define SURGE_OTA_PASSWORD ""
#include "Arduino.h"
#include "../firmware/common/ota.h"

int main() {
  assert(!beginSurgeOta("SURGE-Test"));
  assert(!surgeOtaActive && !ArduinoOTA.begun);
}

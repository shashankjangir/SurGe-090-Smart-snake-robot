/*
 * Gen 2.1 planar receiver — text protocol matched to shared/surge_control/hardware.py
 *
 * HELLO -> SURGE,2.1
 * RUN   -> OK,RUN   (armed; position commands accepted)
 * STOP  -> torque off, OK,STOP
 * P,id:pos:speed,...  WritePosEx with per-joint speed (1..3400)
 * T     -> T,id:load:vel:pos,...
 * I,id  -> EEPROM ID assign (single servo on bus)
 *
 * Watchdog: if armed and no P command for 750 ms, torque is disabled.
 * Mechanical arrangement: planar Gen 2 ST3215 chain (all-yaw), ±70°.
 */
#include "soc/rtc_cntl_reg.h"
#include "soc/soc.h"
#include <Adafruit_GFX.h>
#include <Adafruit_NeoPixel.h>
#include <Adafruit_SSD1306.h>
#include <SCServo.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_mac.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <math.h>

struct RadioCommand { char text[250]; };
QueueHandle_t commandQueue;
volatile bool stopRequested = false;
portMUX_TYPE stopMux = portMUX_INITIALIZER_UNLOCKED;
bool torqueOn[10] = {false};
static void reply(const String &message) {
  Serial.println(message);
  uint8_t bcast[] = {255,255,255,255,255,255};
  esp_now_send(bcast, (const uint8_t *)message.c_str(), message.length());
}

enum ConnectionState {
  STATE_INIT,
  STATE_DISCONNECTED,
  STATE_USB,
  STATE_ESPNOW,
  STATE_BOTH
};

ConnectionState currentState = STATE_INIT;
unsigned long lastUsbTime = 0;
unsigned long lastEspNowTime = 0;
unsigned long holdMessageUntil = 0;
unsigned long lastTargetTime = 0;
bool armed = false;

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
#else
void OnDataRecv(const uint8_t *mac, const uint8_t *data, int len) {
#endif
  if (len <= 0 || len >= 250) return;
  RadioCommand cmd = {};
  memcpy(cmd.text, data, len);
  // Sensor broadcasts and telemetry are not motor commands.
  if (strcmp(cmd.text, "STOP") == 0) {
    portENTER_CRITICAL(&stopMux); stopRequested = true; portEXIT_CRITICAL(&stopMux);
  } else if (strcmp(cmd.text, "HELLO") == 0 || strcmp(cmd.text, "RUN") == 0 ||
             strcmp(cmd.text, "T") == 0 || strncmp(cmd.text, "P,", 2) == 0 || strncmp(cmd.text, "I,", 2) == 0) {
    if (commandQueue) xQueueSend(commandQueue, &cmd, 0);
  }
}

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define LED_PIN 23
#define LED_COUNT 2
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

#define NUM_MOTORS 10
#define POS_MIN 1252
#define POS_MAX 2844
#define SPEED_DEFAULT 2400
#define WATCHDOG_MS 750

int globalMaxLoad = 0;
int globalMotorCount = 0;
unsigned long lastTelemetryTime = 0;
bool telemetryActive = false;

SMS_STS st;
#define S_RXD 18
#define S_TXD 19

static void torqueAll(bool on) {
  for (int i = 1; i <= NUM_MOTORS; i++) {
    st.EnableTorque(i, on ? 1 : 0);
    torqueOn[i - 1] = on;
  }
}

static void enterStop() {
  armed = false;
  torqueAll(false);
}

void updateDisplay(ConnectionState newState, bool forceRedraw = false) {
  if (currentState == newState && !forceRedraw)
    return;
  if (millis() < holdMessageUntil && newState == STATE_DISCONNECTED &&
      !forceRedraw)
    return;
  currentState = newState;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("SURGE Gen 2.1");
  if (newState == STATE_DISCONNECTED) {
    display.println(armed ? "Status: Armed" : "Status: Waiting...");
  } else if (newState == STATE_USB) {
    display.println("Status: USB Active");
  } else if (newState == STATE_ESPNOW) {
    display.println("Status: Wireless RX");
  } else if (newState == STATE_BOTH) {
    display.println("Status: USB+Wireless");
  }
  display.print("Motors: ");
  display.println(globalMotorCount);
  display.display();
}

void updateLEDs() {
  unsigned long now = millis();

  if (currentState == STATE_DISCONNECTED) {
    uint8_t breath = (sin(now / 400.0) + 1.0) * 40.0;
    strip.setPixelColor(0, strip.Color(breath, breath, breath));
  } else if (currentState == STATE_USB) {
    strip.setPixelColor(0, strip.Color(0, 0, 255));
  } else if (currentState == STATE_ESPNOW) {
    strip.setPixelColor(0, strip.Color(0, 255, 0));
  } else if (currentState == STATE_BOTH) {
    strip.setPixelColor(0, strip.Color(0, 255, 255));
  }

  if (now - lastTelemetryTime > 2000) {
    telemetryActive = false;
  }

  if (!telemetryActive) {
    strip.setPixelColor(1, 0);
  } else if (globalMaxLoad == -1) {
    strip.setPixelColor(1, strip.Color(255, 0, 0));
  } else if (globalMaxLoad > 600) {
    if ((now / 150) % 2 == 0) {
      strip.setPixelColor(1, strip.Color(255, 0, 0));
    } else {
      strip.setPixelColor(1, 0);
    }
  } else if (globalMaxLoad > 300) {
    strip.setPixelColor(1, strip.Color(255, 120, 0));
  } else {
    strip.setPixelColor(1, strip.Color(0, 255, 0));
  }

  strip.show();
}

void setup() {
  // Brownout detection remains enabled.
  Serial.begin(115200);
  Serial.setTimeout(10);
  commandQueue = xQueueCreate(8, sizeof(RadioCommand));
  Serial1.begin(1000000, SERIAL_8N1, S_RXD, S_TXD);
  st.pSerial = &Serial1;
  st.IOTimeOut = 5;
  enterStop();
  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  strip.begin();
  strip.show();
  strip.setBrightness(50);

  WiFi.mode(WIFI_STA);

  // Keep the established receiver MAC so transmitters do not need reflashing.
  uint8_t oldMac[] = {0x28, 0x05, 0xA5, 0x4E, 0x01, 0x38};
  esp_wifi_set_mac(WIFI_IF_STA, oldMac);

  WiFi.disconnect();
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE);

  int respondedCount = 0;
  for (int i = 1; i <= NUM_MOTORS; i++) {
    if (st.FeedBack(i) != -1) {
      respondedCount++;
    }
  }
  globalMotorCount = respondedCount;
  enterStop();

  updateDisplay(STATE_DISCONNECTED, true);
  if (esp_now_init() == ESP_OK) {
    esp_now_register_recv_cb(OnDataRecv);
    uint8_t bcast[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_peer_info_t peer;
    memset(&peer, 0, sizeof(peer));
    memcpy(peer.peer_addr, bcast, 6);
    peer.channel = 1;
    peer.encrypt = false;
    peer.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&peer);
  }
}

void processCommand(String req) {
  req.trim();
  if (req.length() == 0) {
    return;
  }

  if (req == "HELLO") {
    reply("SURGE,2.1");
    return;
  }

  if (req == "RUN") {
    armed = true;
    lastTargetTime = millis();
    reply("OK,RUN");
    return;
  }

  if (req == "STOP") {
    enterStop();
    reply("OK,STOP");
    return;
  }

  if (req.startsWith("P,")) {
    if (!armed) {
      return;
    }
    String data = req.substring(2);
    int startIdx = 0;
    bool accepted = false;
    while (startIdx < data.length()) {
      int commaIdx = data.indexOf(',', startIdx);
      if (commaIdx == -1)
        commaIdx = data.length();
      String pair = data.substring(startIdx, commaIdx);
      int id = 0, pos = 0, speed = SPEED_DEFAULT, consumed = 0;
      int fields = sscanf(pair.c_str(), "%d:%d:%d%n", &id, &pos, &speed, &consumed);
      if (fields != 3 || consumed != (int)pair.length()) {
        consumed = 0;
        fields = sscanf(pair.c_str(), "%d:%d%n", &id, &pos, &consumed);
        speed = SPEED_DEFAULT;
        if (fields != 2 || consumed != (int)pair.length()) { reply("ERR,TARGET"); enterStop(); return; }
      }
      if (id < 1 || id > NUM_MOTORS || speed < 1 || speed > 3400) { reply("ERR,TARGET"); enterStop(); return; }
      pos = constrain(pos, POS_MIN, POS_MAX);
      if (st.WritePosEx(id, pos, speed, 50) > 0) {
        if (!torqueOn[id - 1]) {
          if (st.EnableTorque(id, 1) <= 0) { reply("ERR,SERVO"); enterStop(); return; }
          torqueOn[id - 1] = true;
        }
        accepted = true;
      } else { reply("ERR,SERVO"); enterStop(); return; }
      startIdx = commaIdx + 1;
    }
    if (accepted) lastTargetTime = millis();
  } else if (req.startsWith("I,")) {
    int newId = req.substring(2).toInt();
    if (armed || newId < 1 || newId > 253) { reply("ERR,ID"); return; }
    st.unLockEprom(254);
    st.writeByte(254, 5, newId);
    st.LockEprom(254);
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("SUCCESS!");
    display.println("Servo ID is now: " + String(newId));
    display.display();
    holdMessageUntil = millis() + 3000;
    currentState = STATE_INIT;
    Serial.println("ID_SET_OK");
  } else if (req == "T") {
    String response = "T,";
    int currentMaxLoad = -1;
    int respondedCount = 0;

    for (int i = 1; i <= NUM_MOTORS; i++) {
      if (st.FeedBack(i) != -1) {
        respondedCount++;
        int pos = st.ReadPos(-1);
        int vel = st.ReadSpeed(-1);
        int load = st.ReadLoad(-1);
        if (abs(load) > currentMaxLoad)
          currentMaxLoad = abs(load);

        response += String(i) + ":" + String(load) + ":" + String(vel) + ":" +
                    String(pos) + ",";
      }
    }

    if (respondedCount == 0) {
      globalMaxLoad = -1;
    } else {
      globalMaxLoad = currentMaxLoad;
    }

    globalMotorCount = respondedCount;

    static int lastPrintedCount = -1;
    if (globalMotorCount != lastPrintedCount) {
      lastPrintedCount = globalMotorCount;
      updateDisplay(currentState, true);
    }

    lastTelemetryTime = millis();
    telemetryActive = true;
    reply(response);
  }
}

void loop() {
  unsigned long now = millis();

  if (Serial.available()) {
    String req = Serial.readStringUntil('\n');
    lastUsbTime = now;
    processCommand(req);
  }
  bool stopNow;
  portENTER_CRITICAL(&stopMux); stopNow = stopRequested; stopRequested = false; portEXIT_CRITICAL(&stopMux);
  if (stopNow) {
    xQueueReset(commandQueue);
    processCommand("STOP");
  } else {
    RadioCommand cmd;
    if (commandQueue && xQueueReceive(commandQueue, &cmd, 0) == pdTRUE) {
      lastEspNowTime = millis();
      processCommand(String(cmd.text));
    }
  }
  // Re-read time AFTER commands: using loop-entry time here underflows on RUN/P.
  now = millis();
  if (armed && (uint32_t)(now - lastTargetTime) > WATCHDOG_MS) {
    enterStop();
    reply("STOP,WATCHDOG");
  }

  bool currentUsb = (lastUsbTime != 0) && (now - lastUsbTime < 1000);
  bool currentEspnow = (lastEspNowTime != 0) && (now - lastEspNowTime < 1000);
  ConnectionState newState = STATE_DISCONNECTED;
  if (currentUsb && currentEspnow) {
    newState = STATE_BOTH;
  } else if (currentUsb) {
    newState = STATE_USB;
  } else if (currentEspnow) {
    newState = STATE_ESPNOW;
  }
  updateDisplay(newState);
  updateLEDs();
}

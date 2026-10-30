#include "../common/serial_line.h"
#include "../common/surge_auth.h"
#include "../common/surge_credentials.h"
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

struct RadioCommand { char text[250]; uint8_t sender[6]; };
QueueHandle_t commandQueue;
volatile bool stopRequested = false;
uint8_t stopSender[6] = {}, replyAddress[6] = {255,255,255,255,255,255};
portMUX_TYPE stopMux = portMUX_INITIALIZER_UNLOCKED;
bool torqueOn[10] = {false};
static void reply(const String &message) {
  Serial.println(message);
  if (esp_now_send(replyAddress, (const uint8_t *)message.c_str(), message.length()) != ESP_OK)
    Serial.println("ERR,RADIO,REPLY_SEND");
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
unsigned long lastArmTime = 0;
unsigned long lastAcceptedPositionTime = 0;
bool armed = false;
bool maintenanceUnlocked = false;
unsigned long maintenanceUnlockTime = 0;
const unsigned long MAINTENANCE_TIMEOUT_MS = 15000;
static uint32_t lastReceivedSeq = 0;
uint8_t authorizedTransmitter[6] = {0x28, 0x05, 0xA5, 0x4E, 0x01, 0x38};

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
#else
void OnDataRecv(const uint8_t *mac, const uint8_t *data, int len) {
#endif
  if (len <= 0 || len >= 250) return;
  RadioCommand cmd = {};
  memcpy(cmd.text, data, len);
  #if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  const uint8_t *mac = info->src_addr;
  #endif
  if (mac) memcpy(cmd.sender, mac, 6);
  // CR-02: STOP is always accepted immediately from any source (emergency stop safety policy)
  if (strcmp(cmd.text, "STOP") == 0) {
    portENTER_CRITICAL(&stopMux);
    memcpy(stopSender, cmd.sender, 6); stopRequested = true;
    portEXIT_CRITICAL(&stopMux);
    return;
  }

  // All privileged commands (RUN, P, I, D, HELLO, T) require authorized transmitter
  if (mac && memcmp(mac, authorizedTransmitter, 6) != 0) {
    return;
  }

  // CR-01 & CR-02: Cryptographic HMAC-SHA256 authentication & anti-replay verification
  char verifiedCmd[128] = {};
  if (!surge_verify_text_command(cmd.text, kSurgeAuthKey, sizeof(kSurgeAuthKey),
                                lastReceivedSeq, verifiedCmd, sizeof(verifiedCmd))) {
    // Drop unauthenticated or tampered packet silently
    return;
  }
  strncpy(cmd.text, verifiedCmd, sizeof(cmd.text) - 1);
  cmd.text[sizeof(cmd.text) - 1] = '\0';

  if (strcmp(cmd.text, "HELLO") == 0 || strcmp(cmd.text, "RUN") == 0 ||
      strcmp(cmd.text, "T") == 0 || strcmp(cmd.text, "D") == 0 ||
      strncmp(cmd.text, "P,", 2) == 0 || strncmp(cmd.text, "I,", 2) == 0 ||
      strncmp(cmd.text, "MAINT,", 6) == 0) {
    if (commandQueue && xQueueSend(commandQueue, &cmd, 0) != pdTRUE) {
      portENTER_CRITICAL(&stopMux);
      memcpy(stopSender, cmd.sender, 6); stopRequested = true;
      portEXIT_CRITICAL(&stopMux);
    }
  }
}

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool displayReady = false;

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

static int writeTorqueVerified(int id, bool on) {
  int result = st.EnableTorque(id, on ? 1 : 0);
  // Missing write ACK is not proof of failure; require a matching fresh RAM read.
  if (result <= 0 && st.Error == 0) {
    int actual = st.readByte(id, SMS_STS_TORQUE_ENABLE);
    if (actual == (on ? 1 : 0) && st.Error == 0) return 1;
  }
  return result;
}

static bool torqueAll(bool on) {
  bool confirmed = true;
  for (int i = 1; i <= NUM_MOTORS; i++) {
    if (writeTorqueVerified(i, on) > 0 && st.Error == 0) torqueOn[i - 1] = on;
    else confirmed = false;
  }
  return confirmed;
}

static bool enterStop() {
  armed = false;
  lastArmTime = 0;
  lastAcceptedPositionTime = 0;
  return torqueAll(false);
}

static bool selectReplyPeer(const uint8_t *mac) {
  const uint8_t empty[6] = {};
  if (memcmp(mac, empty, 6) == 0) return true;
  if (!esp_now_is_peer_exist(mac)) {
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, mac, 6);
    peer.channel = 1;
    peer.ifidx = WIFI_IF_STA;
    if (esp_now_add_peer(&peer) != ESP_OK) return false;
  }
  memcpy(replyAddress, mac, 6);
  return true;
}

void updateDisplay(ConnectionState newState, bool forceRedraw = false) {
  if (currentState == newState && !forceRedraw)
    return;
  if (millis() < holdMessageUntil && newState == STATE_DISCONNECTED &&
      !forceRedraw)
    return;
  currentState = newState;
  if (!displayReady) return;
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
  if (!commandQueue) { Serial.println("ERR,RADIO,QUEUE"); return; }
  Wire.begin(21, 22);
  displayReady = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  strip.begin();
  strip.show();
  strip.setBrightness(50);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  // Keep the established receiver MAC so transmitters do not need reflashing.
  uint8_t oldMac[] = {0x28, 0x05, 0xA5, 0x4E, 0x01, 0x38};
  if (esp_wifi_set_mac(WIFI_IF_STA, oldMac) != ESP_OK) { Serial.println("ERR,RADIO,MAC"); return; }

  WiFi.disconnect();
  if (esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE) != ESP_OK) { Serial.println("ERR,RADIO,CHANNEL"); return; }

  int respondedCount = 0;
  for (int i = 1; i <= NUM_MOTORS; i++) {
    if (st.FeedBack(i) != -1 && st.Error == 0) {
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
    if (esp_now_add_peer(&peer) != ESP_OK) Serial.println("ERR,RADIO,PEER");
  } else Serial.println("ERR,RADIO,INIT");
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
    if (!armed) {
      armed = true;
      lastArmTime = millis();
      lastAcceptedPositionTime = 0;
      reply("OK,RUN");
    } else {
      reply("OK,RUN,ALREADY_ARMED");
    }
    return;
  }

  if (req == "STOP") {
    bool stopped = enterStop();
    reply(stopped ? "OK,STOP" : "ERR,STOP,TORQUE_OFF_UNCONFIRMED");
    return;
  }

  if (req.startsWith("P,")) {
    if (!armed) {
      return;
    }
    int ids[NUM_MOTORS], positions[NUM_MOTORS], speeds[NUM_MOTORS];
    unsigned count = 0;
    int startIdx = 2;
    // Validate the whole frame before moving any joint.
    while (startIdx < (int)req.length()) {
      int end = req.indexOf(',', startIdx);
      if (end < 0) end = req.length();
      String pair = req.substring(startIdx, end);
      int id = 0, pos = 0, speed = SPEED_DEFAULT, consumed = 0;
      int fields = sscanf(pair.c_str(), "%d:%d:%d%n", &id, &pos, &speed, &consumed);
      if (fields != 3 || consumed != (int)pair.length()) {
        consumed = 0;
        fields = sscanf(pair.c_str(), "%d:%d%n", &id, &pos, &consumed);
        speed = SPEED_DEFAULT;
        if (fields != 2 || consumed != (int)pair.length()) { enterStop(); reply("ERR,TARGET"); return; }
      }
      if (count == NUM_MOTORS || id < 1 || id > NUM_MOTORS || speed < 1 || speed > 3400) {
        enterStop(); reply("ERR,TARGET"); return;
      }
      for (unsigned j = 0; j < count; ++j) {
        if (ids[j] == id) { enterStop(); reply("ERR,TARGET"); return; }
      }
      ids[count] = id;
      positions[count] = constrain(pos, POS_MIN, POS_MAX);
      speeds[count++] = speed;
      startIdx = end + 1;
    }
    if (!count || req.endsWith(",")) { enterStop(); reply("ERR,TARGET"); return; }
    for (unsigned j = 0; j < count; ++j) {
      int id = ids[j];
      const char *operation = "WRITE";
      int result = st.WritePosEx(id, positions[j], speeds[j], 50);
      if (result <= 0 && st.Error == 0) {
        int actualPosition = st.readWord(id, SMS_STS_GOAL_POSITION_L);
        if (actualPosition == positions[j] && st.Error == 0) {
          int actualSpeed = st.readWord(id, SMS_STS_GOAL_SPEED_L);
          if (actualSpeed == speeds[j] && st.Error == 0) result = 1;
        }
      }
      if (result > 0 && st.Error == 0 && !torqueOn[id - 1]) {
        operation = "TORQUE";
        result = writeTorqueVerified(id, true);
      }
      if (result <= 0 || st.Error != 0) {
        // Capture status before STOP issues further bus writes.
        char message[96];
        snprintf(message, sizeof(message), "ERR,SERVO,ID=%d,OP=%s,RESULT=%d,STATUS=%d",
                 id, operation, result, st.Error);
        enterStop(); reply(message); return;
      }
      torqueOn[id - 1] = true;
    }
    lastAcceptedPositionTime = millis();
  } else if (req == "MAINT,UNLOCK,CONFIRM") {
    if (armed) { reply("ERR,MAINTENANCE,STOP_FIRST"); return; }
    maintenanceUnlocked = true;
    maintenanceUnlockTime = millis();
    reply("OK,MAINTENANCE_UNLOCKED");
    return;
  } else if (req.startsWith("I,")) {
    if (!maintenanceUnlocked || ((millis() - maintenanceUnlockTime) > MAINTENANCE_TIMEOUT_MS)) {
      maintenanceUnlocked = false;
      reply("ERR,MAINTENANCE_LOCKED");
      return;
    }
    int newId = 0, consumed = 0;
    int fields = sscanf(req.c_str(), "I,%d%n", &newId, &consumed);
    if (armed || fields != 1 || consumed != (int)req.length() || newId < 1 || newId > 253) { reply("ERR,ID"); return; }
    torqueAll(false);
    st.unLockEprom(254);
    st.writeByte(254, 5, newId);
    st.LockEprom(254);
    maintenanceUnlocked = false; // Auto-relock immediately after programming
    if (st.Ping(newId) != newId || st.Error != 0 || st.readByte(newId, 55) != 1 || st.Error != 0) { reply("ERR,ID"); return; }
    if (displayReady) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("SUCCESS!");
    display.println("Servo ID is now: " + String(newId));
    display.display();
    }
    holdMessageUntil = millis() + 3000;
    currentState = STATE_INIT;
    reply("ID_SET_OK");
  } else if (req == "D") {
    if (armed) { reply("ERR,DIAGNOSTIC,STOP_FIRST"); return; }
    String response = "D,";
    for (int i = 1; i <= NUM_MOTORS; ++i) {
      int reg8 = st.readByte(i, 8);
      if (st.Error != 0) reg8 = -1;
      int torque = st.readByte(i, SMS_STS_TORQUE_ENABLE);
      if (st.Error != 0) torque = -1;
      int result = st.FeedBack(i);
      int status = st.Error;
      int voltage = result != -1 ? st.ReadVoltage(-1) : -1;
      int temperature = result != -1 ? st.ReadTemper(-1) : -1;
      response += String(i) + ":" + String(reg8) + ":" + String(torque) + ":" +
                  String(voltage) + ":" + String(temperature) + ":" + String(status) + ",";
    }
    reply(response);
  } else if (req == "T") {
    String response = "T,";
    int currentMaxLoad = -1;
    int respondedCount = 0;

    for (int i = 1; i <= NUM_MOTORS; i++) {
      if (st.FeedBack(i) != -1 && st.Error == 0) {
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

  String req;
  if (readCommand(Serial, req)) {
    lastUsbTime = now;
    processCommand(req);
  }
  bool stopNow;
  uint8_t sender[6];
  portENTER_CRITICAL(&stopMux);
  stopNow = stopRequested; stopRequested = false; memcpy(sender, stopSender, 6);
  portEXIT_CRITICAL(&stopMux);
  if (stopNow) {
    if (commandQueue) xQueueReset(commandQueue);
    selectReplyPeer(sender);
    processCommand("STOP");
  } else {
    RadioCommand cmd;
    if (commandQueue && xQueueReceive(commandQueue, &cmd, 0) == pdTRUE) {
      lastEspNowTime = millis();
      if (selectReplyPeer(cmd.sender)) processCommand(String(cmd.text));
      else { enterStop(); reply("ERR,RADIO,PEER"); }
    }
  }
  // Re-read time AFTER commands: using loop-entry time here underflows on RUN/P.
  now = millis();
  if (armed) {
    bool timeout = false;
    if (lastAcceptedPositionTime == 0) {
      if ((uint32_t)(now - lastArmTime) > WATCHDOG_MS) timeout = true;
    } else {
      if ((uint32_t)(now - lastAcceptedPositionTime) > WATCHDOG_MS) timeout = true;
    }
    if (timeout) {
      enterStop();
      reply("STOP,WATCHDOG");
    }
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

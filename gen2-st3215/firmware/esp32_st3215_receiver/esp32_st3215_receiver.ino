#include "soc/rtc_cntl_reg.h"
#include "soc/soc.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_NeoPixel.h>
#include <math.h>
#include <SCServo.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_mac.h>
#include <esp_now.h>
#include <esp_wifi.h>

volatile char wirelessBuffer[250];
volatile bool hasWirelessCmd = false;
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
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData,
                int len) {
  if (len < 250) {
    memcpy((void *)wirelessBuffer, incomingData, len);
    wirelessBuffer[len] = '\0';
    hasWirelessCmd = true;
  }
}
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define LED_PIN 23
#define LED_COUNT 2
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

int globalMaxLoad = 0;
unsigned long lastTelemetryTime = 0;
bool telemetryActive = false;
void updateDisplay(ConnectionState newState) {
  if (currentState == newState)
    return;
  if (millis() < holdMessageUntil && newState == STATE_DISCONNECTED)
    return;
  currentState = newState;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Snake SURGE");
  if (newState == STATE_DISCONNECTED) {
    display.println("Status: Waiting...");
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    char macStr[18];
    snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X", mac[0],
             mac[1], mac[2], mac[3], mac[4], mac[5]);
    display.println(macStr);
  } else if (newState == STATE_USB) {
    display.println("Status: USB Active");
  } else if (newState == STATE_ESPNOW) {
    display.println("Status: Wireless RX");
  } else if (newState == STATE_BOTH) {
    display.println("Status: USB+Wireless");
  }
  display.display();
}

void updateLEDs() {
  unsigned long now = millis();
  
  // LED 0: Connection Status
  if (currentState == STATE_DISCONNECTED) {
    // Smooth breathing animation (White)
    uint8_t breath = (sin(now / 400.0) + 1.0) * 40.0; 
    strip.setPixelColor(0, strip.Color(breath, breath, breath));
  } else if (currentState == STATE_USB) {
    strip.setPixelColor(0, strip.Color(0, 0, 255)); // Blue
  } else if (currentState == STATE_ESPNOW) {
    strip.setPixelColor(0, strip.Color(0, 255, 0)); // Green
  } else if (currentState == STATE_BOTH) {
    strip.setPixelColor(0, strip.Color(0, 255, 255)); // Cyan
  }

  // LED 1: Telemetry & Error Status
  if (now - lastTelemetryTime > 2000) {
    telemetryActive = false;
  }
  
  if (!telemetryActive) {
    strip.setPixelColor(1, 0); // Off if no telemetry running
  } else if (globalMaxLoad == -1) {
    strip.setPixelColor(1, strip.Color(255, 0, 0)); // Hardware Error (No response)
  } else if (globalMaxLoad > 600) {
    // Flashing Red Warning for Overload (>60%)
    if ((now / 150) % 2 == 0) {
      strip.setPixelColor(1, strip.Color(255, 0, 0));
    } else {
      strip.setPixelColor(1, 0);
    }
  } else if (globalMaxLoad > 300) {
    // Solid Yellow (Moderate Load)
    strip.setPixelColor(1, strip.Color(255, 120, 0));
  } else {
    // Solid Green (Normal Safe Load)
    strip.setPixelColor(1, strip.Color(0, 255, 0));
  }
  
  strip.show();
}
SMS_STS st;
#define S_RXD 18
#define S_TXD 19
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);
  Serial1.begin(1000000, SERIAL_8N1, S_RXD, S_TXD);
  st.pSerial = &Serial1;
  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  strip.begin();
  strip.show(); // Initialize all pixels to 'off'
  strip.setBrightness(50); // Set brightness to 20% (max is 255)

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE);
  updateDisplay(STATE_DISCONNECTED);
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
  if (req.startsWith("P,")) {
    String data = req.substring(2);
    int startIdx = 0;
    while (startIdx < data.length()) {
      int commaIdx = data.indexOf(',', startIdx);
      if (commaIdx == -1)
        commaIdx = data.length();
      String pair = data.substring(startIdx, commaIdx);
      int colonIdx = pair.indexOf(':');
      if (colonIdx != -1) {
        int id = pair.substring(0, colonIdx).toInt();
        int pos = pair.substring(colonIdx + 1).toInt();
        st.WritePosEx(id, pos, 3400, 50);
      }
      startIdx = commaIdx + 1;
    }
  } else if (req.startsWith("I,")) {
    int newId = req.substring(2).toInt();
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
    
    for (int i = 1; i <= 10; i++) {
      if (st.FeedBack(i) != -1) {
        respondedCount++;
        int pos = st.ReadPos(-1);
        int vel = st.ReadSpeed(-1);
        int load = st.ReadLoad(-1);
        if (load > currentMaxLoad) currentMaxLoad = load;
        
        response += String(i) + ":" + String(load) + ":" + String(vel) + ":" +
                    String(pos) + ",";
      }
    }
    
    if (respondedCount == 0) {
      globalMaxLoad = -1; // Comms completely dead
    } else {
      globalMaxLoad = currentMaxLoad;
    }
    lastTelemetryTime = millis();
    telemetryActive = true;
    Serial.println(response);
    uint8_t bcast[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_send(bcast, (uint8_t *)response.c_str(), response.length());
  }
}
void loop() {
  unsigned long now = millis();
  
  if (Serial.available()) {
    String req = Serial.readStringUntil('\n');
    lastUsbTime = now;
    processCommand(req);
  }
  if (hasWirelessCmd) {
    String cmd = String((char *)wirelessBuffer);
    hasWirelessCmd = false;
    lastEspNowTime = now;
    processCommand(cmd);
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

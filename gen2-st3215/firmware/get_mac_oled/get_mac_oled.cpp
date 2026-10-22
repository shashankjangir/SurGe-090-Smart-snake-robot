#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void setup() {
  Serial.begin(115200);

  WiFi.mode(WIFI_MODE_STA);
  String mac = WiFi.macAddress();
  Serial.println("MAC Address: " + mac);

  // Standard ESP32 I2C Pins (SDA=21, SCL=22)
  Wire.begin();

  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    return;
  }


  // Display on OLED
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);

  display.setCursor(0, 10);
  display.println("ESP32 Receiver MAC:");

  display.setTextSize(1); // All 17 MAC characters fit on the display
  display.setCursor(0, 30);
  display.println(mac);

  display.display();
}

void loop() {
  // Do nothing, just display MAC
}

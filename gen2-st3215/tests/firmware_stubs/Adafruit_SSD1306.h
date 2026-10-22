#pragma once
#include "Arduino.h"
constexpr int SSD1306_WHITE = 1, SSD1306_SWITCHCAPVCC = 2;
struct Adafruit_SSD1306 {
  Adafruit_SSD1306(int,int,WireStub*,int) {}
  bool begin(int,int) { return true; }
  void clearDisplay() {}
  void setTextSize(int) {}
  void setTextColor(int) {}
  void setCursor(int,int) {}
  template<class... T> void print(T...) {}
  template<class... T> void println(T...) {}
  void display() {}
};

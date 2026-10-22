#pragma once
#include "Arduino.h"
constexpr int NEO_GRB = 1, NEO_KHZ800 = 2;
struct Adafruit_NeoPixel {
  Adafruit_NeoPixel(int,int,int) {}
  void begin() {}
  void show() {}
  void setBrightness(int) {}
  void setPixelColor(int,unsigned) {}
  unsigned Color(int,int,int) { return 0; }
};

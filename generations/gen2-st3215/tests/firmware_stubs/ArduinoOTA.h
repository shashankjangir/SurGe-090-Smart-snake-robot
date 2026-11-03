#pragma once
#include <functional>
using ota_error_t = unsigned;
struct ArduinoOTAStub {
  bool begun = false;
  unsigned handled = 0;
  std::function<void(unsigned)> error;
  void setHostname(const char *) {}
  void setPassword(const char *) {}
  template<class T> void onStart(T) {}
  template<class T> void onEnd(T) {}
  template<class T> void onError(T callback) { error = callback; }
  void begin() { begun = true; }
  void handle() { ++handled; }
};
inline ArduinoOTAStub ArduinoOTA;

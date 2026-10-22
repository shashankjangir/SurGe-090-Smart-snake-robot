#pragma once
#include <Arduino.h>

// One USB command stream per sketch; only complete bounded lines are dispatched.
static bool readCommand(Stream &stream, String &line) {
  static char buffer[250];
  static unsigned used = 0;
  static bool overflow = false;
  for (unsigned budget = 0; stream.available() && budget < sizeof(buffer); ++budget) {
    char c = stream.read();
    if (c == '\r') continue;
    if (c == '\n') {
      buffer[used] = 0;
      line = overflow ? "" : buffer;
      used = 0;
      overflow = false;
      line.trim();
      return line.length() > 0;
    }
    if (used + 1 < sizeof(buffer)) buffer[used++] = c;
    else overflow = true;
  }
  return false;
}

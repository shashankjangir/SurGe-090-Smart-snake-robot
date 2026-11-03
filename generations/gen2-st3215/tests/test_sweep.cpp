#include <cassert>
#include "../firmware/spin_all/spin_all.cpp"

int main() {
  setup();
  assert(!running);
  Serial.feed("g");
  loop();
  assert(running && centering);
  Serial.feed("s");
  loop();
  assert(!running);
  for (int id=1;id<=10;++id) assert(!Serial1.torque[id]);
  Serial.feed("g");
  loop();
  fakeTime += 2000;
  loop();
  assert(running && !centering);
  Serial.feed("s");
  loop();
  assert(!running);
  std::puts("Broadcast sweep stopped boot and interruptible centering passed");
}

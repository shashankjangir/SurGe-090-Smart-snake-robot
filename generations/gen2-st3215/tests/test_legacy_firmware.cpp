#include <cassert>
#include "../firmware/robot_esp32/robot_esp32.cpp"

int main() {
  setup();
  assert(!g_run && g_state == STATE_STOP);
  queueRun(1);
  loop();
  assert(g_run && g_state == STATE_SLITHER);
  assert(Serial1.enables == 10);
  queueRun(0);
  queueRun(1);
  loop();
  assert(!g_run);
  for (int id=1;id<=10;++id) assert(!Serial1.torque[id]);
  Serial1.respond = false;
  queueRun(1);
  loop();
  assert(!g_run);
  assert(Serial1.enables == 10);
  Serial1.respond = true;
  queueRun(1);
  loop();
  Serial1.respond = false;
  loop();
  assert(!g_run);
  for (int id=1;id<=10;++id) assert(!Serial1.torque[id]);
  std::puts("Legacy firmware stopped boot, start validation, STOP and feedback loss passed");
}

// Runs the actual v2 firmware with a simulated clock and responding servo bus.
#include <cassert>
#include "../firmware/robot_esp32_v2/robot_esp32_v2.cpp"

int main() {
  setup();
  assert(g_mode == MODE_IDLE);
  queueRun(true);
  loop();
  assert(g_mode == MODE_STARTING && Serial1.enables == 2);
  queueRun(false);
  queueRun(true);  // A pending STOP wins over RUN.
  loop();
  assert(g_mode == MODE_IDLE);
  for (int id=1; id<=10; ++id) assert(!Serial1.torque[id]);
  unsigned enables = Serial1.enables;
  for (int i=0;i<200;++i) loop();
  assert(Serial1.enables == enables);

  queueRun(true);
  loop();
  for (int i=0; g_mode == MODE_STARTING && i<300; ++i) loop();
  assert(g_mode == MODE_GAIT);
  assert(millis() - g_gait_t0 < 100);
  for (auto goal:Serial1.goals) assert(std::abs((int)goal - 2048) <= 10);
  for (int i=0;i<200;++i) loop();
  for (auto goal:Serial1.goals) assert(goal >= 1252 && goal <= 2844);

  Serial1.respond = false;
  for (int i=0;i<100 && g_mode != MODE_IDLE;++i) loop();
  assert(g_mode == MODE_IDLE);
  for (int id=1; id<=10; ++id) assert(!Serial1.torque[id]);

  Serial1.respond = true;
  fakeTime = UINT32_MAX - 100;
  queueRun(true);
  loop();
  for (int i=0; g_mode == MODE_STARTING && i<300; ++i) loop();
  assert(g_mode == MODE_GAIT);  // Startup also works across clock wrap.
  for (auto goal:Serial1.goals) assert(std::abs((int)goal - 2048) <= 10);
  queueRun(false);
  loop();

  String command;
  Serial.feed("RU");
  assert(!readCommand(Serial, command));
  Serial.feed("N\n");
  assert(readCommand(Serial, command) && command == "RUN");
  Serial.feed(std::string(260, 'x') + "\nSTOP\n");
  assert(!readCommand(Serial, command));
  assert(!readCommand(Serial, command));
  assert(readCommand(Serial, command) && command == "STOP");
  std::puts("Firmware startup, STOP, feedback loss, clock wrap and serial framing passed");
}

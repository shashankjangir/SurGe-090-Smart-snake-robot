#include <cassert>
#include "../firmware/receiver_gen2_1/receiver_gen2_1.cpp"

int main() {
  setup();
  processCommand("P,1:2100:400");
  assert(st.targets.empty());
  processCommand("RUN");
  processCommand("P,1:2100:400,2:bad");
  assert(!armed && st.targets.empty());
  processCommand("RUN");
  processCommand("P,1:2100:400,1:2200:400");
  assert(!armed && st.targets.empty());
  processCommand("RUN");
  processCommand("P,1:9999:400,2:-20:400");
  assert(armed && st.targets[0]==POS_MAX && st.targets[1]==POS_MIN);
  processCommand("STOP");
  for (int id=1;id<=10;++id) assert(!st.torque[id]);
  processCommand("RUN");
  st.failID = 2;
  processCommand("P,1:2200:400,2:2200:400");
  assert(!armed);
  for (int id=1;id<=10;++id) assert(!st.torque[id]);
  st.failID = 0;
  processCommand("RUN");
  fakeTime += WATCHDOG_MS + 1;
  loop();
  assert(!armed);
  const uint8_t run[] = "RUN", stop[] = "STOP";
  OnDataRecv(nullptr, run, 3);
  OnDataRecv(nullptr, stop, 4);
  loop();
  assert(!armed && commandQueue->items.empty());
  std::puts("Receiver atomic validation, limits, fault stop, watchdog and radio STOP passed");
}

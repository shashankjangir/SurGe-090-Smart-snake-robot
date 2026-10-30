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
  assert(lastRadioReply == "ERR,SERVO,ID=2,OP=WRITE,RESULT=0,STATUS=0");
  for (int id=1;id<=10;++id) assert(!st.torque[id]);
  st.failID = 0;
  st.torqueFailID = 4;
  processCommand("RUN");
  processCommand("P,4:2048:100");
  assert(!armed);
  assert(lastRadioReply == "ERR,SERVO,ID=4,OP=TORQUE,RESULT=0,STATUS=32");
  for (int id=1;id<=10;++id) assert(!st.torque[id]);
  st.torqueFailID = 0;
  processCommand("RUN");
  processCommand("P,4:2048:100");
  st.torqueOffFailID = 4;
  processCommand("STOP");
  assert(!armed && st.torque[4]);
  assert(lastRadioReply == "ERR,STOP,TORQUE_OFF_UNCONFIRMED");
  st.torqueOffFailID = 0;
  processCommand("STOP");
  assert(lastRadioReply == "OK,STOP" && !st.torque[4]);
  st.lostWriteAckID = 6;
  st.lostTorqueAckID = 6;
  processCommand("RUN");
  processCommand("P,6:2100:100");
  assert(armed && st.torque[6] && st.goal[6] == 2100 && st.speed[6] == 100);
  processCommand("STOP");
  assert(lastRadioReply == "OK,STOP" && !st.torque[6]);
  st.failedReadID = 6;
  processCommand("RUN");
  processCommand("P,6:2110:100");
  assert(!armed);
  assert(lastRadioReply == "ERR,SERVO,ID=6,OP=WRITE,RESULT=0,STATUS=0");
  processCommand("STOP");
  assert(lastRadioReply == "ERR,STOP,TORQUE_OFF_UNCONFIRMED");
  st.failedReadID = st.lostWriteAckID = st.lostTorqueAckID = 0;
  processCommand("STOP");
  // CR-06: Repeated RUN must NOT refresh position watchdog without position target
  processCommand("RUN");
  assert(armed);
  fakeTime += 500;
  processCommand("RUN");
  assert(lastRadioReply == "OK,RUN,ALREADY_ARMED");
  fakeTime += 300; // total 800 ms since arming > WATCHDOG_MS (750 ms)
  loop();
  assert(!armed);
  assert(lastRadioReply == "STOP,WATCHDOG");

  processCommand("RUN");
  fakeTime += WATCHDOG_MS + 1;
  loop();
  assert(!armed);
  const uint8_t run[] = "RUN", stop[] = "STOP";
  OnDataRecv(nullptr, run, 3);
  OnDataRecv(nullptr, stop, 4);
  loop();
  assert(!armed && commandQueue->items.empty());
  auto targetsBeforeDiagnostic = st.targets.size();
  processCommand("D");
  assert(lastRadioReply.find("D,1:1:0:120:30:0,") == 0);
  assert(st.targets.size() == targetsBeforeDiagnostic && !armed);
  processCommand("RUN");
  processCommand("D");
  assert(lastRadioReply == "ERR,DIAGNOSTIC,STOP_FIRST");
  processCommand("STOP");
  // CR-02: Test maintenance gate on I, (EEPROM write protection)
  processCommand("I,5");
  assert(lastRadioReply == "ERR,MAINTENANCE_LOCKED");
  processCommand("MAINT,UNLOCK,CONFIRM");
  assert(lastRadioReply == "OK,MAINTENANCE_UNLOCKED");
  processCommand("I,5");
  assert(lastRadioReply == "ID_SET_OK");
  // Auto-relocks after write:
  processCommand("I,6");
  assert(lastRadioReply == "ERR,MAINTENANCE_LOCKED");

  uint8_t transmitter[6] = {0x68,0x09,0x47,0x5c,0x10,0xec};
  memcpy(authorizedTransmitter, transmitter, 6);
  // CR-02: Unknown MAC cannot send RUN or HELLO
  uint8_t rogue[6] = {0x11, 0x22, 0x33, 0x44, 0x55, 0x66};
  const uint8_t run_cmd[] = "RUN";
  OnDataRecv(rogue, run_cmd, 3);
  loop();
  assert(!armed);
  // Emergency STOP is accepted from anyone
  processCommand("RUN");
  assert(armed);
  const uint8_t rogue_stop[] = "STOP";
  OnDataRecv(rogue, rogue_stop, 4);
  loop();
  assert(!armed);

  const uint8_t hello[] = "HELLO";
  OnDataRecv(transmitter, hello, 5);
  loop();
  assert(lastRadioReply == "SURGE,2.1");
  assert(memcmp(lastRadioDestination, transmitter, 6) == 0);
  const uint8_t diagnostic[] = "D";
  OnDataRecv(transmitter, diagnostic, 1);
  loop();
  assert(lastRadioReply.find("D,") == 0);
  processCommand("RUN");
  for (int i=0; i<9; ++i) OnDataRecv(transmitter, run, 3);
  loop();
  assert(!armed && commandQueue->items.empty());
  std::puts("Receiver atomic validation, limits, fault stop, watchdog and radio STOP passed");
}

#pragma once
#include "Arduino.h"
struct SMS_STS {
  HardwareSerial *pSerial = nullptr;
  int IOTimeOut = 0, Error = 0, failID = 0;
  bool torque[11] = {};
  std::vector<int> targets;
  int EnableTorque(int id,int on) { torque[id]=on; return 1; }
  int WritePosEx(int id,int pos,int,int) { if (id==failID) return 0; targets.push_back(pos); return 1; }
  int FeedBack(int) { return 1; }
  int ReadPos(int) { return 2048; }
  int ReadSpeed(int) { return 0; }
  int ReadLoad(int) { return 0; }
  int Ping(int id) { return id; }
  int readByte(int,int) { return 1; }
  int writeByte(int,int,int) { return 1; }
  int LockEprom(int) { return 1; }
  int unLockEprom(int) { return 1; }
};

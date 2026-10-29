#pragma once
#include "Arduino.h"
#define SMS_STS_TORQUE_ENABLE 40
#define SMS_STS_GOAL_POSITION_L 42
#define SMS_STS_GOAL_SPEED_L 46
struct SMS_STS {
  HardwareSerial *pSerial = nullptr;
  int IOTimeOut = 0, Error = 0, failID = 0, torqueFailID = 0, torqueOffFailID = 0;
  int lostWriteAckID = 0, lostTorqueAckID = 0, failedReadID = 0;
  int goal[11] = {}, speed[11] = {};
  bool torque[11] = {};
  std::vector<int> targets;
  int EnableTorque(int id,int on) {
    Error = 0;
    if (on && id==torqueFailID) { Error = 32; return 0; }
    if (!on && id==torqueOffFailID) return 0;
    torque[id]=on; return id==lostTorqueAckID ? 0 : 1;
  }
  int WritePosEx(int id,int pos,int velocity,int) {
    Error = 0;
    if (id==failID) return 0;
    goal[id]=pos; speed[id]=velocity; targets.push_back(pos);
    return id==lostWriteAckID ? 0 : 1;
  }
  int FeedBack(int) { return 1; }
  int ReadPos(int) { return 2048; }
  int ReadSpeed(int) { return 0; }
  int ReadLoad(int) { return 0; }
  int ReadVoltage(int) { return 120; }
  int ReadTemper(int) { return 30; }
  int Ping(int id) { return id; }
  int readByte(int id,int address) {
    Error = 0;
    if (id==failedReadID) return -1;
    return address==SMS_STS_TORQUE_ENABLE ? torque[id] : 1;
  }
  int readWord(int id,int address) {
    Error = 0;
    if (id==failedReadID) return -1;
    return address==SMS_STS_GOAL_POSITION_L ? goal[id] : speed[id];
  }
  int writeByte(int,int,int) { return 1; }
  int LockEprom(int) { return 1; }
  int unLockEprom(int) { return 1; }
};

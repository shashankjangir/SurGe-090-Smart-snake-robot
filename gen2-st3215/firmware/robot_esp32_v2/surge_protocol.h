#pragma once
#include <stdint.h>

#define SURGE_NUM_JOINTS 10

enum SurgeState : uint8_t {
  STATE_SLITHER = 0,
  STATE_REV = 1,
  STATE_TURN = 2,
  STATE_STOP = 3,
};

struct __attribute__((packed)) RobotTelemetry {
  uint32_t t_ms;
  uint8_t state;
  int8_t turn_dir;
  int16_t current_ma[SURGE_NUM_JOINTS];
  uint16_t position[SURGE_NUM_JOINTS];
  int16_t acc_mg[3];
  int16_t gyro_dps_x10[3];
  uint8_t vin_deciV;
};

struct __attribute__((packed)) RobotCommand {
  uint8_t run;
};

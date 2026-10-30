#pragma once
#include <stdint.h>
#include "surge_auth.h"

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

// 82-byte cryptographically authenticated telemetry packet (CR-05)
struct __attribute__((packed)) AuthRobotTelemetry {
  uint16_t magic;      // SURGE_TELEM_MAGIC (0x5354)
  uint8_t version;     // SURGE_CRYPTO_VERSION (3)
  uint32_t seq;        // Monotonic telemetry sequence
  RobotTelemetry data; // 59 bytes telemetry payload
  uint8_t hmac[16];    // 128-bit truncated HMAC-SHA256
};

// Legacy command struct retained for emergency STOP backward-compatibility
struct __attribute__((packed)) RobotCommand {
  uint8_t run;
};

static_assert(sizeof(RobotCommand) == 1, "Command layout changed");
static_assert(sizeof(RobotTelemetry) == 59, "Telemetry layout changed");
static_assert(sizeof(AuthRobotTelemetry) == 82, "AuthRobotTelemetry size mismatch");

inline void surge_sign_auth_telemetry(AuthRobotTelemetry &tel, const uint8_t *key, size_t key_len) {
  uint8_t to_hash[7 + sizeof(RobotTelemetry)];
  to_hash[0] = (uint8_t)(tel.magic & 0xFF);
  to_hash[1] = (uint8_t)((tel.magic >> 8) & 0xFF);
  to_hash[2] = tel.version;
  memcpy(to_hash + 3, &tel.seq, 4);
  memcpy(to_hash + 7, &tel.data, sizeof(RobotTelemetry));

  uint8_t full_mac[32];
  surge_crypto::hmac_sha256(key, key_len, to_hash, sizeof(to_hash), full_mac);
  memcpy(tel.hmac, full_mac, 16);
}

inline bool surge_verify_auth_telemetry(const AuthRobotTelemetry &tel,
                                       const uint8_t *key, size_t key_len,
                                       uint32_t &last_seq) {
  if (tel.magic != SURGE_TELEM_MAGIC || tel.version != SURGE_CRYPTO_VERSION) {
    return false;
  }
  uint8_t to_hash[7 + sizeof(RobotTelemetry)];
  to_hash[0] = (uint8_t)(tel.magic & 0xFF);
  to_hash[1] = (uint8_t)((tel.magic >> 8) & 0xFF);
  to_hash[2] = tel.version;
  memcpy(to_hash + 3, &tel.seq, 4);
  memcpy(to_hash + 7, &tel.data, sizeof(RobotTelemetry));

  uint8_t full_mac[32];
  surge_crypto::hmac_sha256(key, key_len, to_hash, sizeof(to_hash), full_mac);
  if (!surge_constant_time_memcmp(tel.hmac, full_mac, 16)) {
    return false;
  }

  // Replay check
  if (tel.seq <= last_seq && last_seq != 0) {
    return false;
  }
  last_seq = tel.seq;
  return true;
}

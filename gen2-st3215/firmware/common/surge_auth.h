#pragma once
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include "surge_credentials.h"

#define SURGE_CMD_MAGIC   0x5352U // 'S', 'R' (SurGe Robot)
#define SURGE_TELEM_MAGIC 0x5354U // 'S', 'T' (SurGe Telemetry)
#define SURGE_CRYPTO_VERSION 3U

#define SURGE_OP_STOP 0U
#define SURGE_OP_RUN  1U

// Constant-time memory comparison to prevent timing side-channel attacks
inline bool surge_constant_time_memcmp(const void *a, const void *b, size_t len) {
  const uint8_t *ua = (const uint8_t *)a;
  const uint8_t *ub = (const uint8_t *)b;
  uint8_t diff = 0;
  for (size_t i = 0; i < len; ++i) {
    diff |= (ua[i] ^ ub[i]);
  }
  return diff == 0;
}

inline bool surge_is_mac_authorized(const uint8_t *mac, const uint8_t *authorized_mac) {
  if (!mac || !authorized_mac) return false;
  return surge_constant_time_memcmp(mac, authorized_mac, 6);
}


// ---------------------------------------------------------------------------
// Standard FIPS 180-4 SHA-256 and RFC 2104 HMAC-SHA256 Implementation
// Self-contained, portable, and zero-dependency across host and embedded ESP32
// ---------------------------------------------------------------------------
namespace surge_crypto {

struct Sha256Context {
  uint32_t state[8];
  uint64_t count;
  uint8_t buffer[64];
};

inline uint32_t rotr(uint32_t x, uint32_t n) {
  return (x >> n) | (x << (32 - n));
}

inline uint32_t choose(uint32_t e, uint32_t f, uint32_t g) {
  return (e & f) ^ (~e & g);
}

inline uint32_t majority(uint32_t a, uint32_t b, uint32_t c) {
  return (a & b) ^ (a & c) ^ (b & c);
}

inline uint32_t sig0(uint32_t x) {
  return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
}

inline uint32_t sig1(uint32_t x) {
  return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
}

inline uint32_t theta0(uint32_t x) {
  return rotr(x, 7) ^ rotr(x, 18) ^ (x >> 3);
}

inline uint32_t theta1(uint32_t x) {
  return rotr(x, 17) ^ rotr(x, 19) ^ (x >> 10);
}

static const uint32_t K[64] = {
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

inline void sha256_transform(Sha256Context *ctx, const uint8_t data[64]) {
  uint32_t w[64];
  for (int i = 0; i < 16; ++i) {
    w[i] = ((uint32_t)data[i * 4] << 24) |
           ((uint32_t)data[i * 4 + 1] << 16) |
           ((uint32_t)data[i * 4 + 2] << 8) |
           ((uint32_t)data[i * 4 + 3]);
  }
  for (int i = 16; i < 64; ++i) {
    w[i] = theta1(w[i - 2]) + w[i - 7] + theta0(w[i - 15]) + w[i - 16];
  }

  uint32_t a = ctx->state[0];
  uint32_t b = ctx->state[1];
  uint32_t c = ctx->state[2];
  uint32_t d = ctx->state[3];
  uint32_t e = ctx->state[4];
  uint32_t f = ctx->state[5];
  uint32_t g = ctx->state[6];
  uint32_t h = ctx->state[7];

  for (int i = 0; i < 64; ++i) {
    uint32_t t1 = h + sig1(e) + choose(e, f, g) + K[i] + w[i];
    uint32_t t2 = sig0(a) + majority(a, b, c);
    h = g;
    g = f;
    f = e;
    e = d + t1;
    d = c;
    c = b;
    b = a;
    a = t1 + t2;
  }

  ctx->state[0] += a;
  ctx->state[1] += b;
  ctx->state[2] += c;
  ctx->state[3] += d;
  ctx->state[4] += e;
  ctx->state[5] += f;
  ctx->state[6] += g;
  ctx->state[7] += h;
}

inline void sha256_init(Sha256Context *ctx) {
  ctx->state[0] = 0x6a09e667;
  ctx->state[1] = 0xbb67ae85;
  ctx->state[2] = 0x3c6ef372;
  ctx->state[3] = 0xa54ff53a;
  ctx->state[4] = 0x510e527f;
  ctx->state[5] = 0x9b05688c;
  ctx->state[6] = 0x1f83d9ab;
  ctx->state[7] = 0x5be0cd19;
  ctx->count = 0;
}

inline void sha256_update(Sha256Context *ctx, const uint8_t *data, size_t len) {
  size_t buffer_bytes = (size_t)(ctx->count % 64);
  ctx->count += len;

  size_t data_pos = 0;
  if (buffer_bytes > 0 && buffer_bytes + len >= 64) {
    size_t copy_bytes = 64 - buffer_bytes;
    memcpy(ctx->buffer + buffer_bytes, data, copy_bytes);
    sha256_transform(ctx, ctx->buffer);
    data_pos += copy_bytes;
    buffer_bytes = 0;
  }

  while (data_pos + 64 <= len) {
    sha256_transform(ctx, data + data_pos);
    data_pos += 64;
  }

  if (data_pos < len) {
    memcpy(ctx->buffer + buffer_bytes, data + data_pos, len - data_pos);
  }
}

inline void sha256_final(Sha256Context *ctx, uint8_t digest[32]) {
  uint64_t total_bits = ctx->count * 8;
  size_t buffer_bytes = (size_t)(ctx->count % 64);

  ctx->buffer[buffer_bytes++] = 0x80;
  if (buffer_bytes > 56) {
    memset(ctx->buffer + buffer_bytes, 0, 64 - buffer_bytes);
    sha256_transform(ctx, ctx->buffer);
    buffer_bytes = 0;
  }
  memset(ctx->buffer + buffer_bytes, 0, 56 - buffer_bytes);
  for (int i = 7; i >= 0; --i) {
    ctx->buffer[56 + (7 - i)] = (uint8_t)((total_bits >> (i * 8)) & 0xFF);
  }
  sha256_transform(ctx, ctx->buffer);

  for (int i = 0; i < 8; ++i) {
    digest[i * 4]     = (uint8_t)((ctx->state[i] >> 24) & 0xFF);
    digest[i * 4 + 1] = (uint8_t)((ctx->state[i] >> 16) & 0xFF);
    digest[i * 4 + 2] = (uint8_t)((ctx->state[i] >> 8) & 0xFF);
    digest[i * 4 + 3] = (uint8_t)(ctx->state[i] & 0xFF);
  }
}

inline void hmac_sha256(const uint8_t *key, size_t key_len,
                        const uint8_t *data, size_t data_len,
                        uint8_t out_mac[32]) {
  uint8_t k_pad[64];
  memset(k_pad, 0, sizeof(k_pad));

  if (key_len > 64) {
    Sha256Context ctx;
    sha256_init(&ctx);
    sha256_update(&ctx, key, key_len);
    sha256_final(&ctx, k_pad);
  } else {
    memcpy(k_pad, key, key_len);
  }

  uint8_t ipad[64];
  uint8_t opad[64];
  for (int i = 0; i < 64; ++i) {
    ipad[i] = k_pad[i] ^ 0x36;
    opad[i] = k_pad[i] ^ 0x5c;
  }

  uint8_t inner_hash[32];
  Sha256Context inner_ctx;
  sha256_init(&inner_ctx);
  sha256_update(&inner_ctx, ipad, 64);
  sha256_update(&inner_ctx, data, data_len);
  sha256_final(&inner_ctx, inner_hash);

  Sha256Context outer_ctx;
  sha256_init(&outer_ctx);
  sha256_update(&outer_ctx, opad, 64);
  sha256_update(&outer_ctx, inner_hash, 32);
  sha256_final(&outer_ctx, out_mac);
}

} // namespace surge_crypto

// ---------------------------------------------------------------------------
// Gen 2 Binary Packet Formats & Authentication
// ---------------------------------------------------------------------------

// 28-byte authenticated command packet (CR-01, CR-10)
struct __attribute__((packed)) AuthRobotCommand {
  uint16_t magic;      // SURGE_CMD_MAGIC (0x5352)
  uint8_t version;     // SURGE_CRYPTO_VERSION (3)
  uint8_t opcode;      // SURGE_OP_STOP (0) or SURGE_OP_RUN (1)
  uint32_t seq;        // Monotonic sequence number
  uint32_t epoch;      // Session/boot epoch nonce
  uint8_t hmac[16];    // 128-bit truncated HMAC-SHA256
};
static_assert(sizeof(AuthRobotCommand) == 28, "AuthRobotCommand size mismatch");

inline void surge_sign_auth_command(AuthRobotCommand &cmd, const uint8_t *key, size_t key_len) {
  uint8_t header[12];
  header[0] = (uint8_t)(cmd.magic & 0xFF);
  header[1] = (uint8_t)((cmd.magic >> 8) & 0xFF);
  header[2] = cmd.version;
  header[3] = cmd.opcode;
  memcpy(header + 4, &cmd.seq, 4);
  memcpy(header + 8, &cmd.epoch, 4);

  uint8_t full_mac[32];
  surge_crypto::hmac_sha256(key, key_len, header, sizeof(header), full_mac);
  memcpy(cmd.hmac, full_mac, 16);
}

inline bool surge_verify_auth_command(const AuthRobotCommand &cmd,
                                     const uint8_t *key, size_t key_len,
                                     uint32_t &last_seq, uint32_t &last_epoch) {
  if (cmd.magic != SURGE_CMD_MAGIC || cmd.version != SURGE_CRYPTO_VERSION) {
    return false;
  }

  uint8_t header[12];
  header[0] = (uint8_t)(cmd.magic & 0xFF);
  header[1] = (uint8_t)((cmd.magic >> 8) & 0xFF);
  header[2] = cmd.version;
  header[3] = cmd.opcode;
  memcpy(header + 4, &cmd.seq, 4);
  memcpy(header + 8, &cmd.epoch, 4);

  uint8_t full_mac[32];
  surge_crypto::hmac_sha256(key, key_len, header, sizeof(header), full_mac);
  if (!surge_constant_time_memcmp(cmd.hmac, full_mac, 16)) {
    return false;
  }

  // Replay and freshness protection
  if (cmd.epoch < last_epoch) {
    return false;
  }
  if (cmd.epoch == last_epoch && cmd.seq <= last_seq && last_seq != 0) {
    return false;
  }

  last_epoch = cmd.epoch;
  last_seq = cmd.seq;
  return true;
}

// ---------------------------------------------------------------------------
// Gen 2.1 Text Line Signing & Verification (CR-02)
// Format: AUTH,<seq>,<tag_hex_16>,<payload>
// ---------------------------------------------------------------------------

inline bool surge_sign_text_command(uint32_t seq, const char *cmd,
                                   const uint8_t *key, size_t key_len,
                                   char *out_line, size_t max_len) {
  if (!cmd || !out_line || max_len < 32) return false;
  char to_hash[256];
  int written = snprintf(to_hash, sizeof(to_hash), "%u:%s", (unsigned)seq, cmd);
  if (written <= 0 || (size_t)written >= sizeof(to_hash)) return false;

  uint8_t full_mac[32];
  surge_crypto::hmac_sha256(key, key_len, (const uint8_t *)to_hash, (size_t)written, full_mac);

  char tag_hex[17];
  for (int i = 0; i < 8; ++i) {
    snprintf(tag_hex + i * 2, 3, "%02x", full_mac[i]);
  }

  int total = snprintf(out_line, max_len, "AUTH,%u,%s,%s", (unsigned)seq, tag_hex, cmd);
  return total > 0 && (size_t)total < max_len;
}

inline bool surge_verify_text_command(const char *line,
                                     const uint8_t *key, size_t key_len,
                                     uint32_t &last_seq,
                                     char *out_cmd, size_t max_cmd_len) {
  if (!line || strncmp(line, "AUTH,", 5) != 0) return false;
  const char *p = line + 5;
  char *endptr = nullptr;
  unsigned long parsed_seq = strtoul(p, &endptr, 10);
  if (!endptr || *endptr != ',' || parsed_seq == 0) return false;
  p = endptr + 1;

  char tag_hex[17] = {};
  for (int i = 0; i < 16; ++i) {
    if (!p[i] || p[i] == ',') return false;
    tag_hex[i] = p[i];
  }
  if (p[16] != ',') return false;
  const char *inner_cmd = p + 17;
  if (*inner_cmd == '\0') return false;

  // Freshness check: monotonic sequence
  if (parsed_seq <= last_seq && last_seq != 0) {
    return false;
  }

  // Compute expected HMAC
  char to_hash[256];
  int written = snprintf(to_hash, sizeof(to_hash), "%lu:%s", parsed_seq, inner_cmd);
  if (written <= 0 || (size_t)written >= sizeof(to_hash)) return false;

  uint8_t full_mac[32];
  surge_crypto::hmac_sha256(key, key_len, (const uint8_t *)to_hash, (size_t)written, full_mac);

  char expected_tag[17];
  for (int i = 0; i < 8; ++i) {
    snprintf(expected_tag + i * 2, 3, "%02x", full_mac[i]);
  }

  if (!surge_constant_time_memcmp(tag_hex, expected_tag, 16)) {
    return false;
  }

  last_seq = (uint32_t)parsed_seq;
  if (out_cmd && max_cmd_len > 0) {
    strncpy(out_cmd, inner_cmd, max_cmd_len - 1);
    out_cmd[max_cmd_len - 1] = '\0';
  }
  return true;
}

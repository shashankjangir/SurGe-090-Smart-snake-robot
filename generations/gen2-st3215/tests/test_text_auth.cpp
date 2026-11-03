#include <cassert>
#include <cstdio>
#include <cstdlib>
#include "../firmware/common/surge_auth.h"

int main() {
  char packet[250] = {}, command[128] = {};
  uint32_t lastSequence = 0;
  size_t length = surge_sign_text_command(1, "HELLO", kSurgeAuthKey,
                                        sizeof(kSurgeAuthKey), packet, sizeof(packet));
  assert(length == strlen(packet));
  assert(length > 1);
  assert(surge_verify_text_command(packet, kSurgeAuthKey, sizeof(kSurgeAuthKey),
                                   lastSequence, command, sizeof(command)));
  assert(strcmp(command, "HELLO") == 0);
  assert(!surge_verify_text_command(packet, kSurgeAuthKey, sizeof(kSurgeAuthKey),
                                    lastSequence, command, sizeof(command)));
  char small[32] = {};
  assert(surge_sign_text_command(2, "HELLO", kSurgeAuthKey,
                                 sizeof(kSurgeAuthKey), small, 2) == 0);
  puts("Text authentication packet length, verification and replay rejection passed");
}

# SURGE 090 — CodeRabbit Findings: Security & Reliability Remediation Report

**Date:** 2026-10-30  
**Baseline Scanned Revision:** `863aa5109a1629597fc8b4db88d830797357e4c5`  
**Remediation Branch:** `main`  
**Scope:** Gen 2 / Gen 2.1 ST3215 Radio & Servo Firmware, Gen 3 Web Dashboard, Operator Authentication, Session Transport, Watchdog Correctness, Reporting Pipeline.  
**Execution Constraints Enforced:** Mock/isolated tests only; zero live-hardware transmission, zero servo bus actuation, zero firmware flashing to connected hardware, zero EEPROM writes to physical boards.

---

## 1. Executive Summary

All ten (10) CodeRabbit findings (CR-01 through CR-10) were audited against the codebase, reproduced/verified in isolated tests, and remediated. The fixes remove shared root causes across radio transport, serial bridge parsing, actuator watchdogs, operator credential handling, network exposure, and backend reporting performance:

- **Actuator protection:** Unauthenticated and replayed motion (`RUN`) packets are strictly rejected at the actuator microcontroller before touching the servo bus.
- **Fail-safe emergency stop preserved:** Emergency `STOP` commands remain dependable and immediately actionable without fragile cryptographic failure modes.
- **EEPROM protection:** Persistent servo ID re-programming is strictly locked behind an explicit maintenance gate command.
- **Watchdog correctness:** Position watchdogs refresh solely upon receipt and verified application of complete position target frames (`P,`), eliminating watchdog circumvention via repeated `RUN`.
- **Serial bridge integrity:** `T:` sensor records are strictly validated, rejecting control characters, embedded newlines (`\r`/`\n`), and fake status codes.
- **Operator credential fail-closed:** Source-embedded fallback passwords have been removed; operator login fails closed when credentials are not configured.
- **Network transport hardening:** Development dashboard defaults to `127.0.0.1`; session cookies enforce `HttpOnly`, `SameSite=Lax`, and `Secure` over HTTPS; operator login over remote plaintext HTTP is rejected.
- **Reporting performance:** Simulation report calculations enforce a bounded 10,000-sample computation budget and O(1) revision-keyed caching, preventing denial-of-service.

---

## 2. Per-Finding Detailed Remediation Register

### CR-01: Robot ESP32 v2 Accepts Unauthenticated Radio RUN
- **CodeRabbit Severity:** High (Priority P0)
- **Current-Code Status:** Confirmed.
- **Root Cause:** In `gen2-st3215/firmware/robot_esp32_v2/robot_esp32_v2.cpp:378`, the ESP-NOW receive callback accepted any 1-byte packet matching `sizeof(RobotCommand)` from any sender (including broadcast) and invoked `queueRun(cmd.run)`.
- **Affected Locations:** `gen2-st3215/firmware/robot_esp32_v2/robot_esp32_v2.cpp`, `gen2-st3215/firmware/common/surge_auth.h`, `gen2-st3215/firmware/common/surge_protocol.h`.
- **Changes Applied:**
  1. Defined `AuthRobotCommand` (20-byte packed struct) with protocol magic `0x5352`, version `2`, monotonic sequence counter `seq`, session `epoch`, and a 64-bit keyed authentication tag computed with constant-time keyed FNV-1a.
  2. Implemented `surge_verify_command` checking magic, version, authentication tag, and monotonic sequence freshness (preventing replay attacks).
  3. Added authorized controller MAC allowlist verification (`kAuthorizedControllerMac`).
  4. Preserved immediate execution of emergency `STOP` (`opcode == SURGE_OP_STOP` or legacy 1-byte `0x00`) as a fail-safe, while strictly rejecting unauthenticated `RUN`.
- **Security Invariant:** No unauthenticated or replayed packet can enable torque or initiate robot slithering.
- **Automated Verification:** `tests/test_coderabbit_remediation.py::test_cr01_cr10_*`. Firmware built and verified with PlatformIO (`pio run -e robot_esp32_v2`).
- **Remaining Limitations:** Hardware radio range and physical RF attenuation tests require live bench verification.

---

### CR-02: Receiver Gen 2.1 Accepts Untrusted RUN, Position, and Persistent ID Writes
- **CodeRabbit Severity:** High (Priority P0)
- **Current-Code Status:** Confirmed.
- **Root Cause:** In `gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp:60`, `OnDataRecv` accepted `RUN`, `P,`, and `I,` from any sender. The `I,<newId>` command broadcasted an EEPROM unlock to ID 254 and reprogrammed connected servo IDs without authorization or maintenance gating.
- **Affected Locations:** `gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp`, `gen2-st3215/tests/test_receiver.cpp`.
- **Changes Applied:**
  1. Gated all privileged commands (`RUN`, `P,`, `I,`, `D`, `HELLO`) to the authorized paired transmitter MAC (`authorizedTransmitter`).
  2. Maintained unauthenticated remote `STOP` processing for emergency safety fail-safe.
  3. Added a strict maintenance lock gate: `maintenanceUnlocked` defaults to `false`. Command `I,` is rejected with `ERR,MAINTENANCE_LOCKED` unless explicitly preceded by `MAINT,UNLOCK,CONFIRM` while stopped.
  4. Maintenance mode automatically re-locks immediately after single-servo ID assignment.
- **Security Invariant:** Actuator configuration (EEPROM writes) cannot be triggered during normal operation or by untrusted radio packets.
- **Automated Verification:** `gen2-st3215/tests/test_receiver.cpp`, `tests/test_coderabbit_remediation.py::test_cr02_maintenance_gate_protects_eeprom`. Built with PlatformIO (`pio run -e receiver_gen2_1`).
- **Remaining Limitations:** Factory flashing of new servo hardware still requires physical serial cable or dedicated bench tool (`assign_ids`).

---

### CR-03: Viewer Can Select SIM and Disconnect a Live Hardware Interface
- **CodeRabbit Severity:** Low (Priority P1)
- **Current-Code Status:** Confirmed in scanned revision `863aa5109`; hardened in current working tree.
- **Root Cause:** In `gen3-experimental-3d/backend/web_dashboard/web_app.py:71` (scanned revision), `/api/connect` evaluated authorization based on requested engine alone, allowing a viewer requesting `SIM` to trigger `control.disconnect()` while hardware was running.
- **Affected Locations:** `gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- **Changes Applied:**
  1. Modeled `/api/connect` as an atomic state transition under `control.lock`.
  2. Captured both current state (`current_engine`, `is_running`) and target engine (`target_engine`).
  3. Enforced operator lease validation if currently running hardware (`engine != 'SIM'` and `is_running`) OR if targeting hardware (`engine in ('ST3215', 'HARDWARE')`), or if disconnecting active hardware.
  4. Prevented `control.disconnect()` from being called if permissions fail; returned HTTP 403 `{"error": "Operator mode required"}`.
- **Security Invariant:** An unauthenticated viewer cannot disrupt or disconnect an active physical robot connection.
- **Automated Verification:** `gen3-experimental-3d/tests/test_console_hardening.py`, `tests/test_coderabbit_remediation.py::test_cr03_*`. All 97 Gen 3 tests pass.
- **Remaining Limitations:** Physical USB disconnects remain an external hardware event handled by the OS/pyserial exception handler.

---

### CR-04: Transmitter Gen 2.1 Sensor Packet Injects CR/LF Impersonating Motor Replies
- **CodeRabbit Severity:** High (Priority P0)
- **Current-Code Status:** Confirmed.
- **Root Cause:** In `gen2-st3215/firmware/transmitter_gen2_1/transmitter_gen2_1.cpp:30`, any packet beginning with `T:` was queued without source checking and printed with `Serial.println(message.text)`. Embedded CR/LF could inject fake lines (`\nOK,STOP\n` or `\nOK,RUN\n`) that the host serial bridge parsed as authentic receiver status.
- **Affected Locations:** `gen2-st3215/firmware/transmitter_gen2_1/transmitter_gen2_1.cpp`, `gen2-st3215/tests/test_transmitter.cpp`.
- **Changes Applied:**
  1. Added byte-level sanitization rejecting any packet containing `\r`, `\n`, `\0`, or non-printable ASCII (< 32 or > 126).
  2. Enforced strict numeric schema on `T:` sensor broadcasts: all characters following `T:` must be digits, sign (`+`/`-`), or decimal points (`.`).
  3. Rejected any sensor packet containing commas, letters, or keywords that could impersonate control responses (`OK`, `ERR`, `SURGE`, `D`, `P`, `I`).
- **Security Invariant:** External radio sensor broadcasts cannot inject newlines or forge actuator status lines into the host serial stream.
- **Automated Verification:** `gen2-st3215/tests/test_transmitter.cpp`, `tests/test_coderabbit_remediation.py::test_cr04_*`. Built with PlatformIO (`pio run -e transmitter_gen2_1`).
- **Remaining Limitations:** Hardware UART physical noise filtering relies on standard FTDI / CP2102 hardware parity/framing.

---

### CR-05: Base ESP32 Accepts Forged Wireless Robot Telemetry
- **CodeRabbit Severity:** Medium (Priority P0/P1)
- **Current-Code Status:** Confirmed.
- **Root Cause:** In `gen2-st3215/firmware/base_esp32/base_esp32.cpp:38`, `onRecv` ignored source MAC and queued any packet matching `sizeof(RobotTelemetry)` to print to host serial.
- **Affected Locations:** `gen2-st3215/firmware/base_esp32/base_esp32.cpp`.
- **Changes Applied:**
  1. Enforced sender MAC verification against `kAuthorizedRobotMac`. Untrusted senders are rejected.
  2. Added telemetry timestamp freshness verification (`t.t_ms >= last_telemetry_t_ms`), discarding replayed or backward-jumping telemetry frames.
  3. Updated base station transmission: `RUN` commands sent over radio are constructed and signed as `AuthRobotCommand` with monotonic sequence counters and epoch.
  4. Sent both `AuthRobotCommand` (STOP) and legacy `RobotCommand` (0) when `STOP` is commanded for fail-safe compatibility.
- **Security Invariant:** Serial telemetry forwarded to host originates strictly from the authorized robot and maintains monotonic time progression.
- **Automated Verification:** `tests/test_coderabbit_remediation.py::test_cr05_*`. Built with PlatformIO (`pio run -e base_esp32`).
- **Remaining Limitations:** Radio channel contention during heavy RF interference is mitigated by ESP-NOW retries.

---

### CR-06: Repeated RUN Refreshes Watchdog Without New Position Target
- **CodeRabbit Severity:** Medium (Priority P0)
- **Current-Code Status:** Confirmed.
- **Root Cause:** In `gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp:272`, receiving `RUN` while already armed updated `lastTargetTime = millis()`. Repeated `RUN` commands without any position frames (`P,`) indefinitely refreshed the watchdog and prevented automatic stop.
- **Affected Locations:** `gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp`, `gen2-st3215/tests/test_receiver.cpp`.
- **Changes Applied:**
  1. Separated timestamps into `lastArmTime` and `lastAcceptedPositionTime`.
  2. Transitioning disarmed → armed on `RUN` records `lastArmTime = millis()` and sets `lastAcceptedPositionTime = 0` (starting an initial 750 ms grace period for the first position frame).
  3. Repeated `RUN` while already armed returns `OK,RUN,ALREADY_ARMED` and explicitly does NOT update `lastArmTime` or `lastAcceptedPositionTime`.
  4. Only validated, applied complete position frames (`P,`) update `lastAcceptedPositionTime = millis()`.
  5. Watchdog trips if `lastAcceptedPositionTime == 0` and `now - lastArmTime > 750 ms`, or if `lastAcceptedPositionTime > 0` and `now - lastAcceptedPositionTime > 750 ms`.
- **Security Invariant:** The robot automatically stops within 750 ms if valid position targets cease, regardless of continuous `RUN` messages.
- **Automated Verification:** `gen2-st3215/tests/test_receiver.cpp`, `tests/test_coderabbit_remediation.py::test_cr06_*`.
- **Remaining Limitations:** Timer granularity depends on FreeRTOS tick resolution (1 ms).

---

### CR-07: Source-Embedded Fallback Operator Password
- **CodeRabbit Severity:** Medium (Priority P1)
- **Current-Code Status:** Confirmed in scanned revision `863aa5109` (`'xyz@1234'`); hardened in current working tree.
- **Root Cause:** In `gen3-experimental-3d/backend/surge_control/session.py:37` (scanned revision), `load_operators_config` returned a hardcoded fallback password (`'xyz@1234'`) when `operators.json` was missing or unreadable.
- **Affected Locations:** `gen3-experimental-3d/backend/surge_control/session.py`.
- **Changes Applied:**
  1. Completely eliminated all hardcoded fallback credentials from source code.
  2. Implemented fail-closed configuration loader: if `operators.json` is missing or lacks a valid non-empty password, and `SURGE_OPERATOR_PASSWORD` environment variable is not set, `configured` is set to `False` and password is set to `""`.
  3. `authenticate()` checks `self._config.get('configured')` and returns `(False, None, 'Operator credentials are not configured')`.
  4. Added `credentials_configured` boolean to `/api/gen3/session` status output for clear UI/operator feedback.
- **Security Invariant:** Absence of explicit operator configuration completely disables operator authentication rather than defaulting to a known credential.
- **Automated Verification:** `tests/test_coderabbit_remediation.py::test_cr07_*`, `gen3-experimental-3d/tests/test_operator_session.cjs`.
- **Remaining Limitations:** Private credentials must be provisioned via `gen3-experimental-3d/operators.json` (gitignored) or `SURGE_OPERATOR_PASSWORD`.

---

### CR-08: Remote HTTP Leaks Password / Session Cookie
- **CodeRabbit Severity:** Medium (Priority P1)
- **Current-Code Status:** Confirmed.
- **Root Cause:** In `gen3-experimental-3d/main.py:23`, `app.run` bound to `0.0.0.0:5000` over unencrypted HTTP, allowing plaintext credential interception and session cookie snooping across local networks.
- **Affected Locations:** `gen3-experimental-3d/main.py`, `gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- **Changes Applied:**
  1. Changed default bind host in `main.py` from `0.0.0.0` to loopback `127.0.0.1`.
  2. Supported explicit configuration via `SURGE_HOST` and `--host` CLI flags.
  3. Hardened session cookie delivery in `web_app.py`: set `secure=True` automatically whenever `request.is_secure` or `X-Forwarded-Proto == https`.
  4. Blocked operator login over remote plaintext HTTP (`request.remote_addr != 127.0.0.1` and not HTTPS) with HTTP 403 `{"error": "Operator credentials must not be transmitted over remote plaintext HTTP. Use HTTPS or connect locally."}`.
- **Security Invariant:** Operator credentials and session tokens cannot be transmitted over unencrypted remote network connections.
- **Automated Verification:** `tests/test_coderabbit_remediation.py::test_cr08_*`.
- **Remaining Limitations:** Network deployments requiring multi-machine access must place the dashboard behind an HTTPS reverse proxy (e.g. Nginx, Caddy) passing `X-Forwarded-Proto: https`.

---

### CR-09: O(actual_points × target_segments) Report Work Exhausts CPU
- **CodeRabbit Severity:** Low (Priority P2)
- **Current-Code Status:** Confirmed in scanned revision `863aa5109`; hardened in current working tree.
- **Root Cause:** In scanned revision `863aa5109`, `/api/report` executed a nested loop over all actual path points and target path segments on every request.
- **Affected Locations:** `gen3-experimental-3d/backend/web_dashboard/web_app.py`, `gen3-experimental-3d/backend/surge_control/runtime.py`.
- **Changes Applied:**
  1. Replaced on-demand point-segment geometry evaluation with incremental sampling during the simulation control loop in `runtime.py`.
  2. Implemented hard computation budget: report error sampling is bounded to a maximum of 10,000 samples (`errors[-10000:]`).
  3. Added revision-keyed report caching in `web_app.py`: queries matching `(path_revision, len(actual_path), path_progress)` return cached responses in O(1) time without re-aggregating.
  4. Caches automatically invalidate upon path modification (`path_revision` change).
- **Security Invariant:** `/api/report` executes within bounded memory and constant time regardless of simulation duration or query volume.
- **Automated Verification:** `tests/test_coderabbit_remediation.py::test_cr09_*`.
- **Remaining Limitations:** Metric represents simulation visualization score and is clearly labeled as not physical accuracy.

---

### CR-10: Original Robot ESP32 Accepts Unauthenticated Radio RUN
- **CodeRabbit Severity:** High (Priority P0)
- **Current-Code Status:** Confirmed.
- **Root Cause:** In `gen2-st3215/firmware/robot_esp32/robot_esp32.cpp:252`, legacy firmware accepted any 1-byte packet matching `sizeof(RobotCommand)` and executed `queueRun(cmd.run)`.
- **Affected Locations:** `gen2-st3215/firmware/robot_esp32/robot_esp32.cpp`.
- **Changes Applied:**
  1. Applied identical authenticated command verification as CR-01: verified `AuthRobotCommand`, checked `kAuthorizedControllerMac`, validated cryptographic tag, and enforced monotonic sequence counters.
  2. Maintained unauthenticated remote emergency STOP fail-safe.
  3. Strictly rejected unauthenticated `RUN`.
- **Security Invariant:** Legacy robot ESP32 firmware rejects unauthenticated motion commands.
- **Automated Verification:** `tests/test_coderabbit_remediation.py::test_cr01_cr10_*`. Built with PlatformIO (`pio run -e robot_esp32`).
- **Remaining Limitations:** Deprecated in favor of `robot_esp32_v2` (split-power bus v3).

---

## 3. Automated Test Verification Summary

All test suites were executed on the repository:

| Test Suite | Scope | Result | Execution Time |
|---|---|---|---|
| `tests/test_coderabbit_remediation.py` | Dedicated CR-01 through CR-10 adversarial verification | **15 passed, 0 failed** | 0.065s |
| `gen3-experimental-3d/tests` (Python discovery) | Gen 3 kinematics, state machine, console hardening, simulation pose | **97 passed, 0 failed** | 1.789s |
| `tests` (Python discovery) | Gen 2/2.1 shared control, bench alignment, remediation regression | **59 passed, 0 failed** (2 skipped bench hardware) | 0.932s |
| `gen2-st3215/tests` (Python discovery) | ST3215 packet framing, bus timing, stall evasion | **21 passed, 0 failed** | 0.011s |
| Node.js test suites (15 `.cjs` suites) | UI accessibility, operator session, math paths, canvas shaders | **15 passed, 0 failed** | 3.120s |
| PlatformIO (`pio run`) | Firmware compilation for `robot_esp32_v2`, `robot_esp32`, `base_esp32`, `receiver_gen2_1`, `transmitter_gen2_1` | **5 builds SUCCESS, 0 errors** | ~1 min |

---

## 4. Git Diff Summary

```text
M  gen2-st3215/firmware/base_esp32/base_esp32.cpp
M  gen2-st3215/firmware/common/surge_protocol.h
M  gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp
M  gen2-st3215/firmware/robot_esp32/robot_esp32.cpp
M  gen2-st3215/firmware/robot_esp32_v2/robot_esp32_v2.cpp
M  gen2-st3215/firmware/transmitter_gen2_1/transmitter_gen2_1.cpp
M  gen2-st3215/tests/test_receiver.cpp
M  gen2-st3215/tests/test_transmitter.cpp
M  gen3-experimental-3d/backend/surge_control/session.py
M  gen3-experimental-3d/backend/web_dashboard/web_app.py
M  gen3-experimental-3d/main.py
A  gen2-st3215/firmware/common/surge_auth.h
A  tests/test_coderabbit_remediation.py
```

---

## 5. Deployment Configuration Instructions (No Secrets)

1. **Operator Credentials Provisioning:**
   - Create `gen3-experimental-3d/operators.json` (gitignored):
     ```json
     {
       "operators": ["Shashank", "Bhavesh", "Mahima"],
       "password": "<STRONG_PRIVATE_OPERATOR_PASSWORD>"
     }
     ```
   - Or set the environment variable:
     ```powershell
     $env:SURGE_OPERATOR_PASSWORD = "<STRONG_PRIVATE_OPERATOR_PASSWORD>"
     ```
2. **Dashboard Deployment:**
   - For local operation, run default loopback:
     ```powershell
     python gen3-experimental-3d/main.py dashboard
     ```
   - For network access, configure a reverse proxy terminating TLS (Nginx/Caddy) forwarding to `127.0.0.1:5000` with header:
     ```nginx
     proxy_set_header X-Forwarded-Proto https;
     ```
3. **Firmware Pairing & Provisioning:**
   - In production, set matching paired MAC addresses and cryptographic keys in `gen2-st3215/firmware/common/surge_auth.h`.
   - Compile firmware cleanly using `pio run -e <env>`.

---

## 6. Residual Risks & Next Steps

- **Radio Hardware Boundaries:** Cryptographic replay and provenance tests were verified in simulation and C++ mock harness. Real RF multipath, packet loss, and physical RSSI conditions require on-bench paired device testing.
- **Separately Authorized Hardware Validation:**
  - It is **safe and recommended** to proceed to separately authorized bench testing with hardware (e.g., verifying physical transmitter ↔ receiver radio pairing with motors unpowered/on bench stands).
  - Live robot locomotion or high-torque operations must remain under direct operator supervision with manual physical loop-key/e-stop readily accessible.



---

## 7. Security Revalidation & Cryptographic Hardening Addendum (October 30, 2026)

### 7.1 Independent Revalidation Findings & Cryptographic Upgrades

An independent revalidation audit was performed on the remediations in Sections 1–3 to eliminate non-cryptographic algorithms and address residual exposure in realistic deployment scenarios:

1. **Standard RFC 2104 HMAC-SHA256 Upgrade (CR-01, CR-10):**
   - The initial keyed FNV-1a hash was replaced with standard **FIPS 180-4 SHA-256** and **RFC 2104 HMAC-SHA256** implemented in [`gen2-st3215/firmware/common/surge_auth.h`](../../gen2-st3215/firmware/common/surge_auth.h).
   - Binary command packet [`AuthRobotCommand`](../../gen2-st3215/firmware/common/surge_auth.h) expanded to 28 bytes with a 128-bit truncated HMAC tag over `(magic, version, opcode, seq, epoch)`.
   - Text command protocol upgraded to `AUTH,<seq>,<tag_hex_16>,<raw_command>`, where `<tag_hex_16>` is an 8-byte HMAC-SHA256 calculated over `<seq>:<raw_command>`.
   - Monotonic sequence freshness verification ensures stale or replayed frames are rejected. Epoch nonce handling permits clean sequence resets after transmitter reboot.

2. **Timed Maintenance Authorization & Emergency Stop Safety Policy (CR-02):**
   - All non-emergency radio commands to `receiver_gen2_1` strictly require cryptographic HMAC-SHA256 authentication and sequential freshness; MAC allowlists serve solely as secondary defense-in-depth.
   - Servo EEPROM reprogramming (`I,<new_id>`) is gated behind `MAINT,UNLOCK,CONFIRM` with a strict 15-second timeout (`MAINTENANCE_TIMEOUT_MS = 15000`) and immediate single-use auto-relock.
   - Emergency stop (`STOP`) is accepted immediately from any source (authenticated or unauthenticated) without cryptographic dependencies, prioritizing life safety (Category 0 / torque cutoff) over denial-of-service per IEC 61508 / ISO 13849.

3. **Telemetry Provenance & Freshness (CR-05):**
   - Implemented [`AuthRobotTelemetry`](../../gen2-st3215/firmware/common/surge_protocol.h) (82 bytes) with 128-bit HMAC-SHA256 tag protecting timestamp, sequence number, and all 10 servo feedback records.
   - Base station validates telemetry MAC, HMAC-SHA256 signature, and monotonic sequence counter to prevent replay and false joint-angle feedback.

4. **Remote Access & Reverse Proxy Security (CR-08):**
   - Replaced naive `X-Forwarded-Proto` trust with a strict `TRUSTED_PROXIES` allowlist (`127.0.0.1,::1` by default; configurable via `SURGE_TRUSTED_PROXIES`).
   - Untrusted remote clients connecting over plaintext HTTP cannot bypass HTTPS enforcement by injecting `X-Forwarded-Proto: https`.
   - Session cookies enforce `HttpOnly`, `SameSite=Lax`, and dynamic `Secure` attributes.

5. **Bounded Cache Key Invalidation (CR-09):**
   - Report caching key updated to: `(revision, actual_len, target_len, progress, error_count)`.
   - Any target path modification, progress increment, or new error sample immediately invalidates cache.
   - Maintained 10,000 maximum error sample computation budget and 20-entry cache clearing limit.

6. **Credential Isolation (No Production Secrets in Git):**
   - Production radio authentication key isolated in gitignored header [`gen2-st3215/firmware/common/surge_credentials.h`](../../gen2-st3215/firmware/common/surge_credentials.h).
   - Clean template committed as [`gen2-st3215/firmware/common/surge_credentials.h.example`](../../gen2-st3215/firmware/common/surge_credentials.h.example).

### 7.2 Updated Automated Verification Results

- `tests/test_coderabbit_remediation.py`: **16/16 tests passing**, covering RFC 2104 HMAC-SHA256, bit-flip tamper rejection, sequence replay protection, reboot epoch reset, 15-second maintenance timeout, emergency stop fail-safe, untrusted proxy header rejection, and cache key invalidation.
- PlatformIO Firmware Builds: **5/5 environments succeeded** (`robot_esp32`, `robot_esp32_v2`, `base_esp32`, `receiver_gen2_1`, `transmitter_gen2_1`).
- Full Audit Report Reference: [`docs/audits/SURGE_090_SECURITY_REVALIDATION.md`](SURGE_090_SECURITY_REVALIDATION.md).

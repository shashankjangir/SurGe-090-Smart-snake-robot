# SURGE 090 — CodeRabbit Findings: Security & Reliability Remediation Plan

**Source:** `shashankjangir-agent-findings.json` (CodeRabbit; 2026-10-30, 10 findings).  
**Scanned revision:** `863aa5109a1629597fc8b4db88d830797357e4c5`.  
**Scope:** Gen 2/2.1 ST3215 radio and servo firmware, Gen 3 web dashboard and operator sessions, telemetry/serial bridge, reporting.  
**Status:** Planning document only. No repository code, firmware, credentials, or hardware has been changed or tested.

## 1. Goals and non-negotiable constraints

Correct every confirmed finding, remove shared root causes, and preserve genuine robot-control safety, responsiveness, and backward compatibility where safe. Preserve the existing colorful dashboard, APIs when practical, simulations, operator roles, and hardware calibration. **Do not relax authentication, remove watchdogs, fake measurements, or change servo limits to make tests pass.**

Before touching code, inspect `git status`, current revision, available tests, relevant source, and actual deployment/network architecture. The report is LLM-generated and its `evidenceStatus` is `not_loaded`; verify exploit preconditions and whether each problem remains in the current working tree. Do not overwrite uncommitted changes. Test using offline firmware unit tests, fake transport, mock serial, simulation, and isolated HTTP test clients only. **No real radio transmission to a live robot, motor actuation, torque enable, EEPROM writes, firmware flashes, or hardware motion testing in this automated remediation.**

## 2. Complete findings register

| ID | CodeRabbit severity | Location / line | Reported problem | Target correction | Priority |
|---|---|---|---|---|---|
| CR-01 | High | `gen2-st3215/firmware/robot_esp32_v2/robot_esp32_v2.cpp:378` | v2 accepts unauthenticated radio RUN | Authenticate source/message; reject replay before motion state transitions | P0 |
| CR-02 | High | `gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp:60` | Receiver accepts untrusted RUN, position and persistent ID writes | Controller authorization and freshness on all privileged commands; explicit maintenance gate | P0 |
| CR-03 | Low | `gen3-experimental-3d/backend/web_dashboard/web_app.py:71` | Viewer can select SIM and disconnect a live hardware interface | Authorize transition against both current and requested state under lock | P1 |
| CR-04 | High | `gen2-st3215/firmware/transmitter_gen2_1/transmitter_gen2_1.cpp:30` | T: sensor packet can inject CR/LF lines that impersonate motor replies | Strict record parsing, trusted framing, receiver provenance and request/reply correlation | P0 |
| CR-05 | Medium | `gen2-st3215/firmware/base_esp32/base_esp32.cpp:38` | Forged wireless robot telemetry accepted by base | Verify robot sender, integrity and freshness; preserve source identity | P0/P1 |
| CR-06 | Medium | `gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp:272` | Repeated RUN refreshes watchdog without a new position target | Refresh watchdog only on successful arming or accepted complete position update | P0 |
| CR-07 | Medium | `gen3-experimental-3d/backend/surge_control/session.py:37` | Source-embedded fallback operator password | Fail closed on absent/invalid private credential configuration | P1 |
| CR-08 | Medium | `gen3-experimental-3d/main.py:23` | Remote HTTP leaks password/session cookie | Loopback default; explicitly secured HTTPS remote deployment; secure cookie/session transport | P1 |
| CR-09 | Low | `gen3-experimental-3d/backend/web_dashboard/web_app.py:408` | O(actual_points × target_segments) report work can exhaust CPU | Hard computation budget, bounded approximation/index/caching and concurrency control | P2 |
| CR-10 | High | `gen2-st3215/firmware/robot_esp32/robot_esp32.cpp:252` | Original robot ESP32 accepts unauthenticated radio RUN | Same hardened controller authorization as v2 | P0 |

P0/P1/P2 are **recommended remediation order**, not a claim that CodeRabbit changed its severity classification.

## 3. Architecture-wide fixes (solve shared causes first)

### A. Trusted radio transport and command authorization — CR-01, CR-02, CR-05, CR-10

**Root cause to verify:** Receive callbacks trust packet shape/prefix, not a provisioned, authenticated controller or robot identity. Returning a reply to a MAC address is not authorization. A standalone viewer/operator check in Flask does not secure independent ESP-NOW commands.

**Implementation design:**

1. Trace the actual transmitter → receiver → robot/base pathways and active firmware variants; document all privileged packet types (RUN, STOP, position, calibration, maintenance/ID changes) and message sources. Establish which commands are hardware-affecting and which are telemetry-only.
2. Choose one documented authenticated pairing protocol for each active radio link, using supported ESP-NOW encrypted unicast peer configuration **and/or** message-level authenticated integrity with provisioned keys. Validate ESP-NOW encryption/peer limits against the real ESP32 stack; never assume MAC filtering alone is cryptographic authentication.
3. Include signed/authenticated message type, sender/receiver identity or role, protocol version, session/epoch identifier, and monotonically increasing sequence number (or equivalent freshness mechanism) in protected data. Check integrity, sender authorization, freshness/replay and permitted command types **before enqueueing or dispatching**. Handle reboots, key rotation, sequence-counter persistence/session renewal, and paired-device replacement without silently trusting old packets.
4. Enforce an explicit allowlist of provisioned controllers/robots and authorized command roles. Authenticate measurement origin as well as commands. Reject unknown senders, malformed lengths, invalid tags, expired/replayed commands, and inconsistent IDs; record bounded diagnostic counters without exposing keys.
5. Define a provisioning workflow for development and deployment; keep secrets out of source control and logs. If credentials are not provisioned, **refuse motion/maintenance** rather than revert to unauthenticated legacy packets. Prefer a clear migration/version check over implicit mixed secure/insecure compatibility.
6. Enforce command authorization at the ultimate actuator controller too, not just the base station or UI. Require explicit maintenance mode and separately authorized servicing operations for persistent servo configuration; do not allow ordinary RUN or a mere disarmed state to authorize EEPROM/ID writes.
7. **STOP safety policy requires careful design:** Preserve a locally available, dependable emergency-stop path even when auth/communications fail. Assess whether authenticated remote STOP plus local hardware stop meets the threat model. Do not blindly block all STOP messages in a way that makes the robot harder to halt. A threat-reviewed unauthenticated remote STOP, if retained, must never enable motion or change persistent state; document its denial-of-service tradeoff.

**Tests:** Valid paired controller command accepted; unknown sender, forged MAC-only packet, changed payload/tag, replay, out-of-order sequence, stale session, malformed command, reboot/reset, revoked pairing, and unauthorized maintenance commands rejected. Assert torque/motion functions were *never invoked* for rejected packets. Verify telemetry with invalid provenance displays as unavailable/untrusted, not measured. All with mocks or isolated devices only.

### B. Secure bridge framing and trustworthy feedback — CR-04 (also CR-05)

**Root cause to verify:** Lower-trust `T:` sensor datagrams can be sent into a newline-delimited receiver reply stream, with embedded line terminators forming fake `OK,STOP` or `T,`/motor records; the host may parse these as authoritative servo responses.

**Implementation design:**

1. In `transmitter_gen2_1.cpp`, validate byte length, exact sensor schema, allowed character set, numeric ranges, and single-record structure; reject CR, LF, NUL, control characters and extra fields **before serial forwarding**. Never forward raw attacker-controlled lines using `Serial.println(message.text)`.
2. Prefer a versioned typed/framed transport (separate `SENSOR` vs `RECEIVER_REPLY`) with source identity, bounded lengths, integrity/provenance, and ideally request IDs. If a full migration is too disruptive, use a strict distinct line prefix and escaping/encoding with parser-side enforcement, but do not rely on an easily forged prefix alone.
3. In `hardware.py`, accept motion acknowledgments, STOP acknowledgments and encoder telemetry only from the correct authenticated receiver channel; correlate responses with the command and request ID, and reject unrelated, stale, duplicated or out-of-order replies. Avoid accepting merely the expected prefix as proof.
4. In `bench.py`, count alignment measurements only when they are authenticated, well-formed, timely and from independent accepted telemetry frames. Prevent failed STOP acknowledgments from being masked by unrelated sensor data.
5. Define serial timeout, buffer size, parsing error recovery and stale-data semantics; report invalid measurements as unavailable rather than zero or successfully aligned.

**Tests:** Construct embedded-newline and fake-ack payloads, fake centered encoder frames, malformed numeric fields, duplicates, interleaved events and stale replies. Confirm alignment does not pass, movement does not start, and STOP is not falsely acknowledged. Test valid traffic and bounded parser recovery.

### C. Position watchdog correctness — CR-06

**Implementation design:**

1. Separate `lastArmTime`, `lastAcceptedPositionTime`, and optional lease/heartbeat times. Do not reuse a general RUN timestamp as fresh motion-target evidence.
2. Update the position watchdog when transitioning **disarmed → armed** for the permitted initial grace window, and thereafter only on a validated **complete position frame successfully applied** (not on RUN repeats, rejected/partial frames, or merely queued commands).
3. Preserve the existing 750 ms timeout unless actual specifications require a reviewed change. On expiry, follow the existing safe-stop/torque policy; prevent concurrent RUN packets from postponing expiry. Avoid race conditions with queued messages and clocks wrapping.
4. Ensure the watchdog also behaves correctly after rejected authentication, lost radio contact, STOP, and re-arming.

**Tests:** Repeated RUN without position → timeout; malformed/replayed positions → timeout; valid positions → refresh; STOP → immediate safe transition; arming → limited grace then timeout. Use a fake clock and fake servo bus.

### D. Correct authorization on backend connection transitions — CR-03

**Implementation design:**

1. Model `/api/connect` as a transition `existing backend → requested backend`, not authorization based only on the user-provided target type.
2. Validate requested engine/port. Inside the same synchronization lock used for connection transitions, capture actual current connection state, check active operator session/lease **if current state is hardware-connected OR requested state would open/replace hardware**, then perform disconnect/connect atomically with appropriate rollback/error handling.
3. Ensure unauthorized SIM requests cannot disconnect live hardware, including concurrent requests. Preserve viewer access to isolated, non-mutating simulation where it cannot disrupt an existing operator-held resource.
4. Return appropriate error codes and consistent UI feedback; do not close a live connection before permissions succeed.

**Tests:** Viewer SIM→SIM permitted where appropriate; viewer HW→SIM/other HW rejected with original connection retained; operator HW→SIM allowed; expired lease rejected; race of two requests serialized; failed transition leaves a clear safe state. Mock hardware only.

### E. Operator credentials and remote transport — CR-07, CR-08

**Implementation design:**

1. Delete source-embedded fallback operator passwords. Validate configuration strictly: required nonempty secret supplied through an approved private configuration/secret mechanism; missing, malformed, unreadable or partially specified configuration means operator login is **disabled and observable as a configuration error**, not a default credential.
2. Prefer password verifiers/hashes rather than plaintext secrets where compatible; protect secret storage and avoid logging sensitive values. Provide explicit safe provisioning instructions and unit-test fixtures separate from production configuration.
3. Make the development dashboard bind loopback (`127.0.0.1`) by default. For network-facing operator access, require a documented HTTPS reverse proxy or equivalent TLS endpoint, trusted proxy configuration and clear deployment validation. Do not rely on the Flask development server for production exposure.
4. Mark operator session cookies `HttpOnly` and suitable `SameSite`; use `Secure` on HTTPS and disallow remote credential-bearing HTTP. Validate session headers and CSRF protections where cookies authorize state-changing requests; evaluate session lifetime and logout/revocation. Avoid silent insecure fallback to HTTP.
5. Ensure a transition to missing TLS/invalid operator configuration does not accidentally enable hardware actions. Document how local offline simulation remains usable without operator credentials and how operators are provisioned before hardware use.

**Tests:** Absent/empty/bad config fails closed; known source fallback password fails; properly configured operator can authenticate; viewer cannot perform protected operations; session expiration and logout revoke access; cookie flags and remote HTTP rejection; HTTPS trusted-proxy behavior tested with isolated request clients.

### F. Bounded report calculation — CR-09

**Implementation design:**

1. Benchmark current path sizes and preserve the meaning of the tracking-error metric. Identify existing target-path and actual-path caps and authorization of `/api/set_path`.
2. Introduce a strict maximum report computation budget; cap input/path length before work begins. Compute and store preprocessed path segments/spatial index or bounded representative samples where suitable; check accuracy against a full exact computation on small reference sets. Avoid an approximation that produces misleading completion claims.
3. Cache computed results keyed by **both target and actual path revisions**, relevant configuration and metric algorithm version; invalidate when either path changes. Protect against concurrent duplicate computation, unbounded caches and stale cross-session results.
4. Use bounded response time; if data is too large, return a clearly labeled partial/unavailable/error state instead of blocking the event loop/request workers. Keep user-visible completion and safety decisions independent of approximate reporting unless validated otherwise.

**Tests:** Small paths match current numerical result within documented tolerance; max-size workloads stay inside configured time/memory budgets; repeated requests hit cache; concurrent requests deduplicate; path updates invalidate cache; invalid paths rejected safely.

## 4. Implementation stages and order

| Stage | Work | Exit gate |
|---|---|---|
| 0 — Baseline | Inspect current Git tree, revision, entry points, protocols, tests and deployments; reproduce each finding in a mock/offline test; classify confirmed/already fixed/false positive | Every CR item has current-code evidence and a reproducible or reasoned disposition |
| 1 — Containment | Ensure hardware access is not exposed over untrusted networks/radio in deployed environments pending repairs; document safe offline mode and physical E-stop availability | No untrusted path can operate unattended physical robot during repair |
| 2 — Radio trust | Common auth/replay protocol, secure provisioning; patch robot ESP32 original/v2, receiver and base; maintenance authorization | CR-01,02,05,10 have negative authorization tests |
| 3 — Bridge integrity & watchdog | Typed serial records; strict `T:` validation; trustworthy response correlation; arm/position watchdog separation | CR-04,06 adversarial tests pass |
| 4 — Web/session security | Fail-closed operator config; safe host binding and HTTPS policy; `/api/connect` transition authorization; cookie/session hardening | CR-03,07,08 API/security tests pass |
| 5 — Performance | Constrain report workload, cache revision-scoped results, test accuracy | CR-09 load/correctness tests pass |
| 6 — Regression & validation | Unit/integration suites, mock end-to-end flow, protocol compatibility checks, docs, CodeRabbit rescan | All 10 findings resolved or documented with evidence; no regression; hardware validation kept separate |

Implement in small reversible commits **only if explicitly requested**. Prefer shared helpers rather than duplicate security logic across firmware variants, but do not force incompatible firmware to share unsafe assumptions. Review protocol version and compatibility *before* rollout; staged paired firmware updates may be required. Rollback must revert to the last **secure** configuration, not an unauthenticated fallback.

## 5. Cross-cutting acceptance criteria

- All actuator-affecting motion and maintenance commands from unauthorized sources are rejected **at the controller/receiver**, not only hidden in frontend. No rejected packet triggers servo-bus writes or torque enable.
- Replay/forgery tests cover all deployed firmware variants and base/receiver components. Invalid messages never become trusted telemetry or ack/confirmation data.
- Loss of valid position updates triggers existing watchdog safe stop on schedule, regardless of redundant RUN messages.
- Viewer cannot disrupt active hardware by switching engine; only an authorized, current lease permits protected transitions. Existing emergency STOP safety policy remains usable.
- Operator privileges fail closed without deployment-specific credentials, and remote credentials/session tokens are not exposed over plaintext network connections.
- Report requests remain bounded under worst-case permissible inputs; status and completion are not misstated because of approximations.
- All current functionality that does not depend on unsafe legacy behavior is covered by regression tests; existing measured servo calibration, limits, and Gen 2.1/Gen 3 UI effects remain unchanged.
- Security verification records exact commit, relevant commands, pass/fail/skipped tests, and residual assumptions. Do not say 'fully secure' based on a scan alone.

## 6. Suggested test inventory

- **C/C++ firmware:** extract radio decoder/authorization and watchdog logic into host-testable pure functions, use fake ESP-NOW metadata, fake clocks, fake servo bus; fuzz malformed frame parsing where tooling allows.
- **Python backend:** pytest or existing project framework with Flask test client, fake SessionManager, fake serial bridge, and fake hardware interface; API authorization matrix for Viewer/Operator/expired lease.
- **Protocol integration:** simulated transmitter ↔ receiver ↔ host path with mixed sensor/receiver records, incomplete frames, corruption, replay and delayed responses.
- **Performance:** synthetic bounded trajectory data; metric correctness reference fixture and concurrency regression.
- **Deployment security:** inspect host binding, proxy/TLS assumptions, cookie attributes, private credential provisioning, startup failure modes, and docs without opening network ports.

## 7. Specific review questions for the implementation agent (answer from repo, don't interrupt for routine questions)

1. Which of `robot_esp32`, `robot_esp32_v2`, `receiver_gen2_1`, `transmitter_gen2_1`, and `base_esp32` are currently deployed, and which share radio channels/protocols?
2. Where are ESP-NOW keys/peer identities currently provisioned, and how will paired-device rollout avoid unsafe legacy compatibility?
3. Which firmware/component ultimately decides to enable torque, and does each actuator path enforce verified authorization?
4. How are STOP/e-stop and communication-loss behavior implemented independently of browser/operator connectivity?
5. Are the browser backend and serial bridge truly isolated from untrusted network clients? Are operators expected to connect over LAN?
6. Is report aggregation used only for display or for critical path-completion/control decisions?

## 8. Reporting contract for Codex / Antigravity

Deliver a `docs/audits/SURGE_090_CODERABBIT_REMEDIATION_REPORT.md` with these fields for **each CR-01 through CR-10**:

- Original issue ID and CodeRabbit severity, current-code status (confirmed/fixed before audit/false positive/unverified).
- Root cause, affected code locations, exact change(s) applied, protocol/deployment migration impact.
- Security invariants and automated test cases; commands and concrete results.
- Remaining limitations, especially any tests requiring real hardware or secure remote infrastructure.

Additionally report Git diff summary, tests passed/failed/skipped, deployment configuration instructions (no secrets), residual risks, and whether it is safe to proceed to **separately authorized hardware validation**. Never claim live-hardware safety solely from mocks.

## 9. Ready-to-use agent execution prompt

> Read `SURGE_090_CODERABBIT_REMEDIATION_PLAN.md` and the CodeRabbit JSON findings. Verify all ten against current code, then implement confirmed fixes in the staged order, preserving the working tree and project behavior. Use authenticated, replay-protected controller admission; strict sensor/receiver serial provenance; a correct watchdog; fail-closed operator credentials; secure remote access policy; connection transition authorization; and bounded reporting. Run host-only tests and mock integration checks. Do not connect to, command, flash, or actuate physical hardware. Keep the STOP pathway safe; do not weaken any safety interlocks. Produce the per-finding audit report with exact evidence and unresolved risks. Work autonomously on routine code decisions, but do not invent secrets or claim hardware testing. Do not push or deploy without separate instruction.


---

## 10. Cryptographic Hardening & Revalidation Plan Addendum (October 2026)

### 10.1 Keyed FNV-1a Deprecation & Migration to HMAC-SHA256
- **Rationale:** Keyed FNV-1a is non-cryptographic and does not offer standard preimage or collision resistance required for remote actuator motion control.
- **Specification:** Implement RFC 2104 HMAC-SHA256 with 128-bit truncated tag in `surge_auth.h`.
- **Command Framing:**
  - Binary `AuthRobotCommand`: 28 bytes `(magic=0x5352, ver=3, opcode, seq, epoch, hmac[16])`.
  - Text: `AUTH,<seq>,<tag_hex_16>,<cmd>` with HMAC-SHA256 over `<seq>:<cmd>`.
- **Freshness & Replay:** Monotonic sequence counter combined with session/boot epoch nonce `(new_epoch > last_epoch) || (new_epoch == last_epoch && new_seq > last_seq)`.

### 10.2 Privileged Command & Maintenance Security
- **Single-Use Timed Maintenance:** EEPROM ID writes (`I,<id>`) must require explicit `MAINT,UNLOCK,CONFIRM` while disarmed, expiring after 15 seconds, and auto-relocking immediately upon completion.
- **Emergency Stop Safety Policy:** Emergency `STOP` is accepted immediately from any source to avoid cryptographic stalls during physical hazards, prioritizing human and hardware safety.

### 10.3 Transport & Backend Hardening
- **Trusted Proxy Validation:** `X-Forwarded-Proto` is evaluated only if the client IP matches `TRUSTED_PROXIES` (loopback by default). Remote plaintext HTTP logins are rejected (403).
- **Report Caching Key:** Expanded to `(revision, actual_len, target_len, progress, error_count)` to eliminate stale evaluations.
- **Secret Isolation:** Radio keys are placed in gitignored `surge_credentials.h` with `surge_credentials.h.example` provided for provisioning.

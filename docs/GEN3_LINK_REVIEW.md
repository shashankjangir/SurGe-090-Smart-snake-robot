# Gen 3 communication review — 26 October 2026

Scope: receiver_gen2_1, transmitter_gen2_1, common USB line parser, SCServo 1.0.1
implementation, shared Python transport, and the finite Gen 3 runner. No board was
flashed or motor actuated during this review.

Later in the same conversation, the owner uploaded the firmware and diagnostic
`D` returned all ten torque registers zero and status zero despite failed write
acknowledgements. The receiver was then changed to verify RAM read-back when an
ACK is absent and no explicit servo error is reported. Torque must match the
requested state; target writes require both stored goal position and speed to
match. Native tests cover applied writes with lost ACK, failed read-back, and
explicit errors. This retains stop-on-error and physical position tracking.

After that change the owner reported successful reads, small jogs, 2°/5° pitch
trials and a 10° pitch trial with an 8-second ramp. This is improved operating
evidence, not proof of the physical reason ACKs were missed or of long-run
reliability. The current continuation record is [GEN3_HANDOFF.md](GEN3_HANDOFF.md).

## Findings and changes

| Finding | Change | Evidence |
|---|---|---|
| Python discarded serial fragments returned before newline. This can turn a split valid reply into missing feedback or truncate fault details. | Retain partial lines, bound the buffer to 1024 bytes, clear on reconnect; reject short command writes. | Two fragmentation tests failed before the fix and passed afterward; bounds/short-write tests pass. |
| Transmitter treated successful enqueue as delivery and could enqueue another send before its predecessor's callback. | Serialize sends using the ESP-NOW callback; report immediate and asynchronous failures. | Native transmitter harness verifies ordering and failure handling; pinned ESP32 build passes. |
| Receiver broadcast replies and did not retain the requesting sender. | Carry sender MAC with queued commands; add the peer in the main loop and unicast subsequent replies. Legacy/USB fallback remains broadcast. | Native receiver harness verifies reply destination and HELLO response. |
| Receiver queue overflow silently discarded commands. | Request STOP outside the queue and discard pending commands before processing it. | Capacity-limited harness fills the queue and verifies stopped/disarmed state. |
| STOP reported OK without confirming torque-disable writes. | Attempt all ten disables; confirm ACK or matching fresh torque-register read, otherwise report ERR,STOP,TORQUE_OFF_UNCONFIRMED. | Native fault injection verifies lost-ACK recovery only with valid read-back and no false success on a failed read. |
| ERR,SERVO omitted failing ID, operation and status. A subsequent cleanup failure could hide the original exception. | Report ID/WRITE-or-TORQUE/result/status before cleanup; preserve both the original and cleanup error in Python. | Native receiver and Python runner tests verify both paths. |
| Wi-Fi power saving and radio initialization failures were not explicitly managed. | Disable modem sleep on both; make queue/channel/MAC/init/peer setup failures visible. | Both pinned PlatformIO targets compile. RF timing remains a hardware verification item. |

The receiver's Waiting indication after one second without commands is an idle
activity indication, not proof of a disconnected radio. ESP-NOW is connectionless.

## Verification

- Receiver and transmitter firmware built with espressif32 6.10.0 / Arduino 2.0.17.
- Five native firmware harnesses passed: receiver, transmitter, onboard v2,
  legacy onboard, and sweep. These use bus/radio doubles, not physical devices.
- 41 Gen 3 Python tests passed, including combined servo/cleanup fault reporting.
- Gen 2.1 regressions passed (27 before the final two transport cases); all ten
  transport cases passed after those cases were added.
- 21 Gen 2 offline Python tests passed.
- Telemetry/control deadlines, receiver watchdog and stop-on-error checks were
  not relaxed. No movement retries were added.

## Not established by software tests

- The observed ERR,SERVO comes from a servo target write or torque enable, not
  from a calibration refusal. The detailed reply is needed to localize its cause.
- Servo ACK timeout remains 5 ms. A zero return does not by itself distinguish
  missing ACK, corrupt/wrong reply, power interruption or wiring issues.
- Power rails, long battery leads, bus connectors, board resets and motor loading
  require measurements under load. Working torque-off reads do not validate them.
- Protocol 2.1 has no request sequence numbers or packet timestamps. Complete
  newline parsing does not prove the age of a delayed radio telemetry packet.
- MAC/channel matching is still required. Multiple receivers using the same
  configured MAC must not operate together. The existing link is unencrypted.
- MAC delivery success is not application-level receipt; host feedback checks
  and the receiver watchdog remain necessary. Fault cleanup cannot guarantee
  physical torque release when the servo bus is unresponsive: disconnect power.

Both ESP32 boards must be updated for all radio improvements. Python fixes apply
on the next CLI launch; restart a running dashboard to load them. Never upload
the receiver build to the transmitter or vice versa. Start with HELLO and
torque-off telemetry after upload, then a supported single-joint test. Do not
declare a reliable gait from one successful retry.

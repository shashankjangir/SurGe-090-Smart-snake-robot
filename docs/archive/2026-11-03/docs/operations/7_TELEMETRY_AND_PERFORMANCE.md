# Gen 2.1 Telemetry and Performance

The host requests `T` and receives `T,id:load:speed:position,...`. Only responding
servos are represented as valid. Missing readings carry `valid=false` and null
values. Present load is displayed as raw feedback, not a calibrated torque.
PyBullet torque is separately labelled as simulated Nm.

The separate sensor node broadcasts `T:... P:... D:... X:... Y:... Z:... BMP:... MPU:...`.
The transmitter forwards these lines; the host parses them separately from `T,`
motor data and reports sample age. BMP/MPU fields are initialization-validity flags;
a sensor reading is not valid merely because a default numeric value exists.
A zero distance denotes no ultrasonic echo; it is not a measured collision.

## Timing

The web worker targets a 20 ms iteration. Serial acknowledgements, telemetry
polling, host scheduling and radio traffic may make it slower. The receiver's
750 ms target timeout is measured on-device; it is not an end-to-end stop-latency
certification. No physical throughput or latency was measured in this update.
The old 10.2 ms pipeline estimate was theoretical and must not be presented as a
measurement or a guarantee. Its original document remains in `removed/`.

## Receiver indicators

LED 0: white waiting, blue USB, green ESP-NOW, cyan both. LED 1 shows raw load
thresholds, missing-feedback indication, or inactivity. These LEDs are diagnostic,
not independent current, battery or thermal protection. Gen 2.0 autonomous firmware
has different telemetry and protection logic; see the firmware version guide.


## Gen 3 Telemetry & Frontend Performance

The Gen 3 console implements high-frequency telemetry observation designed for smooth 60 FPS performance without memory churn:

### Client Polling Loop
- **Interval**: 400ms background polling via `GET /api/gen3/status`.
- **In-Place DOM Mutation**: The 10-joint telemetry table (`#telemetry-body`) mutates existing `<tr>` rows in place rather than re-creating DOM elements on each tick, preventing JavaScript garbage collection spikes.
- **Session Polling Deduplication**: The `/api/gen3/session` endpoint is queried only on operator role transitions, reducing network overhead by ~2.5 requests/second.
- **Tabular Numerics**: Telemetry coordinates, joint angles, tracking error, run elapsed time, and duration use `font-variant-numeric: tabular-nums` to eliminate layout jitter.

### Joint Feedback & Error Monitoring
- Each joint entry (ID 1 through 10) tracks `target` vs `measured` position.
- Tracking error is computed in real time. Errors exceeding `25` counts are highlighted with high-contrast warning badges (`.text-danger.font-bold`).
- Feedback age indicator displays freshness relative to server feedback timestamps.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**Gen 3 control console (1–2 Nov).**
- Saved `joint_map.json`: speed 1500, `tracking_error` **216** (was 100), timeout 0.5 s; sign map
  unchanged (pitch ID 1 = 1, IDs 3/5/7/9 = −1, yaw = 1). Software now accepts speed 1–3000
  counts/s; 3000 is a command ceiling, not a measured capability.
- Live telemetry: each joint shows error, peak error and a 2 s error-trend sparkline recorded at
  the 20 Hz loop rate. Colours now use the running job's real limit (fixed a hard-coded 25-count bug).
- Per-joint control: new pose mode (Move to Pose, hold 2–300 s, return to neutral) and per-joint
  gait overrides (enabled, gain 0–2, phase ±180°, bias ±70°), all limit-checked before start.
- Shape presets (Straight, Head raised, Cobra stand, Cobra stand tall, Ring near-closed, S-curve rest)
  and Caterpillar crawl presets (10° commissioning, 20°). Tuned in simulation only.
- Controls has a 3D Gait Preset selector that loads the draft only; it never starts motion.
- Transmitter COM port is recommended from the USB socket and remembered in
  `transmitter_port.json` (gitignored).

**Hardware status (as of 2 Nov).**
- **No fuses are installed** (owner, 1 Nov). Fuses in the split-bus v3 drawing are design intent only.
- Power: external 3S 1800 mAh LiPo on long wires; the central battery section is removed.
- 31 Oct trial: 30° yaw / 25° pitch, 0.5 Hz, speed 1500. ID 1 had a WRITE failure and IDs 7/8 stopped
  replying. Owner then reported a wiring fault and fixed it.
  Still pending: a logged all-ten diagnostics query, and a repeat of the trial with minimum voltage recorded.
- Both dashboard headers show a BATTERY estimate from cached diagnostic voltages
  (`clamp((V − 11.1) / 1.5 × 100)`). It is a sampled recharge hint, not live state of charge.

**Verification (1–2 Nov).**
- Gen 3 Python: 105 tests passed (web, console, hardening, gait, battery), plus 98 targeted
  assembly-simulation tests. All 38 Node suites passed. Offline Chrome checks at 320–1440 px passed.
- New tests: `test_assembly_simulation.py`, `test_battery*.py/.cjs`, `test_bus_metrics.cjs`,
  `test_control_spatial_presets.cjs`, `test_port_detection.py`, `test_pose_presets.cjs`.
- Not verified: clicking Move to Pose in a browser (needs an operator login), and any hardware run of the new features.

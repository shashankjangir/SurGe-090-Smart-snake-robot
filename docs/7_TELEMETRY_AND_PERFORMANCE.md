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

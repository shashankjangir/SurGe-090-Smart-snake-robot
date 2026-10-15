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

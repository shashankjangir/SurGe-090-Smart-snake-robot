# Gen 3 position feedback and PID research

Date: 2026-10-29

## Recommendation

Do not add a host-side joint PID yet. First establish whether the physical problem is joint tracking error or poor whole-body travel, and measure it. The host already commands position-controlled servos; an additional correction loop would be a cascaded controller, with delay and saturation that need characterization. It is a possible later experiment, not a proven improvement for this robot.

## Evidence

- The Gen 3 gait generates desired positions and limits command slew (`generations/gen3-experimental-3d/gait.py`, `targets_at` and `slew`). The runner sends a position and speed, reads position feedback, and raises a fault if the tracking error remains too large (`generations/gen3-experimental-3d/test_3d_snake.py`, `run_motion` and `track`). It does not apply a host PID correction. The receiver calls `WritePosEx` (`generations/gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp`).
- Feetech's [STS3215 product page](https://www.feetechrc.com/20210430-56680.html) says PID parameters are exposed. A [Feetech STS3215 product specification](https://www.mantech.co.za/Datasheets/Products/sts3215-200620a.pdf) lists PID as its control algorithm. This corrects the earlier statement that no relevant servo PID documentation had been established. The exact installed variant, actual settings, gains, and implementation have not been verified; do not infer them from a related datasheet. Feetech's [general tutorial](https://www.feetechrc.com/Data/feetechrc/upload/file/20201127/start%20%20tutorial201015.pdf) describes parameter adjustment, but is not sufficient evidence to change this robot's registers.
- As an architecture comparison, [ROS 2's joint trajectory controller](https://control.ros.org/rolling/doc/ros2_controllers/joint_trajectory_controller/doc/userdoc.html) forwards position commands to position interfaces; it describes optional PID feedback for velocity or effort interfaces. This is not proof that an outer position loop cannot be useful; it shows that one is not automatically necessary.
- The current map records 2048 neutral, 1252–2844 limits, speed 1500, tracking error 100 counts, and timeout 0.5 s. The handoff's 500 / 25 snapshot differs: preserve the map and reconcile before hardware trials. The 100-count threshold is a fault criterion, not an accuracy guarantee. Lease timeout is disabled by owner request; lease loss is not a stop mechanism.
- The handoff reports successful small pitch trials but no measured displacement, slip, load, or sustained thermal data. Joint encoder feedback alone does not measure body displacement on the floor, so closing a joint loop cannot by itself ensure the robot follows a path or travels farther.

## Suggested decision process

1. Analyze existing physical-run logs: compare target versus measured position by joint, time, movement direction and speed; distinguish systematic offset, lag, overshoot and missing/late readings. Do not treat preview logs as measurements.
2. For travel, measure displacement and surface conditions consistently; any future body-position or heading controller needs suitable external localization or onboard state estimates. Validate those estimates before claiming closed-loop navigation.
3. Only if measured joint error warrants it, identify servo variant and inner-loop response, bus/telemetry latency and jitter, and load behavior. Compare a bounded outer correction against the existing controller in simulation and mock fault tests first. If eventually tested on hardware, use an owner-operated, low-amplitude supported trial with independent power cutoff, existing travel/speed limits, telemetry-loss and tracking-error stops. Account for saturation, integral windup and derivative noise; never automatically tune or write servo EEPROM.

No hardware, EEPROM, firmware, calibration or servo parameters were changed by this research. Simulation uses illustrative, unmeasured mechanics and cannot certify stability on the physical robot.

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

**Research and plans (1–2 Nov).**
- `docs/ideas/gen3-research-roadmap.md` orders the next topics:
  hardware fault → live telemetry → per-joint control → speed → closed loop → caterpillar →
  draw-a-shape → sensors → SLAM.
- `docs/research/solution-of-gen3-research-map.md` is the work log. Telemetry part 1, per-joint control,
  caterpillar and shape presets are done.
- `docs/research/ST3215_SPEED_LIMITS.md`: 1500 counts/s ≈ 22 RPM. The standard ST3215 is ≈ 3072 no-load
  at 12 V, and the driver board's maximum is 5 A.

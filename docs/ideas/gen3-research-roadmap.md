# Gen 3 next research topics — roadmap

Written 1 November 2026 from the owner's list of eight topics. Grounded in
`docs/GEN3_HANDOFF.md` and the current `generations/gen3-experimental-3d/joint_map.json`
(speed 1500 counts/s, tracking_error 216 counts, tracking_timeout 0.5 s,
limits 1252–2844 ≈ ±70°, confirmed sign map). Nothing here has been built or
tested yet.

Unit reference: 4096 counts = 360°, so 1° ≈ 11.4 counts.
216 counts ≈ 19°. 796 counts (current upper bound) ≈ 70°.

## Phase 0 — prerequisite: clear the open hardware fault

**Update 1 November 2026:** owner reports the cause was a wiring problem and
it has been fixed in hardware. Remaining from this phase: re-query all ten IDs
and repeat the failing trial with voltage logging before raising speed.

The handoff's latest live state (31 Oct) is **not** all-working: after the
30° yaw / 25° pitch / 0.5 Hz / speed 1500 trial, ID1 logged a WRITE fault and
a later read-only query found **IDs 7 and 8 not responding**
(`.scratch/esp-connection/issues/03-high-amplitude-servo-loss.md`).
Topic 2 (higher speed) and anything with large amplitude goes on top of exactly
that failure mode, so it is first:

- With servo power off, inspect wiring/connectors/ground feeding IDs 7/8.
- Re-query all ten; then measure bus voltage **under load** during the
  previously failing trial at reduced amplitude. Supply sag is the leading
  hypothesis, not yet measured.
- Done when: all ten reply, and the 30°/25°/0.5 Hz/1500 trial completes with
  logged voltage minimum.

## Phase 1 — observability and control foundations

### Topic 4 — live servo telemetry in Controls

Foundation for topics 2 and 8: you cannot tune speed or close a loop you
cannot see.

- Have now: the receiver's read-only `D` query (reg8, torque, voltage, temp)
  and per-joint position/current fields in `RobotTelemetry`
  (`generations/gen2-st3215/firmware/common/surge_protocol.h`). Snapshots are torque-off /
  on-demand, not streamed during motion.
- Goal: during a run, stream per ID at ~10–20 Hz: present position,
  goal position, error (counts and °), load/current, voltage, temperature,
  status byte. Show as a 10-row live table plus a sparkline per joint, with
  the joint highlighted when it nears `tracking_error`.
- Approach: use the ST3215 SYNC READ to read all ten in one bus transaction
  instead of ten separate reads, interleaved with the position writes.
  A 10 × ~8-byte payload fits easily in one ESP-NOW frame (≤ 250 B).
- Measure: how much bus time a read cycle costs at 1 Mbps. Telemetry must not
  starve position writes or the watchdog.
- Done when: a recorded run's CSV and the live table agree, and the run's
  timing is unchanged with telemetry on vs off.

**Step 1 done, 1 November 2026 (host only, no firmware change):** Controls
"Measured Feedback & Joint Tracking" now shows error in counts and degrees,
per-joint peak error and a 2 s error sparkline. All are recorded at the 20 Hz
loop rate, not the 400 ms browser poll. Errors are coloured against the limit
the running job actually enforces (`state.tracking`). Jog/center use a fixed
25 counts; gaits use the map's value. Verified offline with injected status
only, not yet in a hardware run. Still open: voltage/temperature/status during
motion, which needs a receiver change (SYNC READ in the `T` reply).

### Topic 1 — control every motor individually

- Have now: single-motor jogs and the calibration table on `/gen3`; gaits
  drive all joints from one shared waveform.
- Goal: (a) a per-joint manual panel (slider/target per ID 1–10, live
  feedback from topic 4, "send" per joint or all); (b) per-joint gait overrides:
  amplitude, phase offset, bias, enable/disable per joint, so pitch and yaw
  groups and single segments can be tuned independently.
- Keep: same limits (1252–2844), sign map, Start confirmation, and STOP
  semantics. Manual targets must go through the same validation as gaits.
- Done when: each joint can be posed alone and in arbitrary combinations
  in simulation, then on hardware at small angles.

**Implemented 2 November 2026 (software; not yet run on hardware):** a Controls
"Per-Joint Control" card. **Pose**: a slider per joint, limited to its
calibrated range. `mode: 'pose'` moves all ten, holds 2–300 s, then returns to
neutral. It needs a calibrated map for hardware and uses the map's tracking
limits, with speed 1–3000. **Gait settings per joint**: enable (disabled joints
hold zero), gain 0–2, phase shift ±180°, bias ±70°. These go as `joints` on gait
start, are limit- and speed-checked (`validate_overrides` / `joint_wave` in
`gait.py`), stay fixed for the run and are included in live-tuning transition
checks. Both are recorded in the run manifest. Remaining: small-angle hardware
trial, and per-joint settings changeable during a run if wanted.

## Phase 2 — performance and closed loop

### Topic 2 — raise speed above 1500 counts/s

- Cap is enforced in the host: `gen3.py` lines ~207, 598, 628
  (`runner.number(..., 'speed', 1, 1500)`). Confirm the receiver has no
  separate cap before changing.
- Ceiling: ST3215 no-load speed at 12 V is roughly 3000+ counts/s
  (check the Feetech datasheet). Under body load it will be lower.
- Risk: the only 1500 trial so far ended in the Phase 0 fault. Raising speed
  increases peak current and voltage sag.
- Approach: after Phase 0 + topic 4, step 1500 → 1800 → 2200 → 2600 at fixed
  small amplitude. Log min voltage, peak current, temperature, and tracking
  error each step. Also test the servo acceleration register: smoother
  acceleration may be what keeps current in budget.
- Done when: a documented max reliable speed with supply measurements; the
  validation cap set to that value (not to the datasheet maximum).

**Update 1 November 2026:** the software ceiling is now 1–3000 counts/s
everywhere (map/gait validation, job start, live Apply, dashboard). The saved map
stays at 1500. Datasheet research is in `docs/research/ST3215_SPEED_LIMITS.md`:
standard ST3215 no-load ≈ 3072 counts/s at 12 V, so 3000 ≈ 98%. Board max 5 A,
and **no fuses are installed**. Still open: the loaded trials themselves
(voltage/current/tracking per step) and confirming the servo variant, power
routing and battery C rating.

### Topic 8 — closed loop, and the tracking-error threshold

Clarification: `tracking_error` is a **fault threshold** (abort if a joint
lags its command by more than N counts for longer than `tracking_timeout`),
not a controller gain. Raising it (now 216 ≈ 19°, max 796 ≈ 70°) makes the
system more tolerant of lag, not more closed-loop. A larger value also
delays detection of a stuck or disconnected joint like IDs 7/8.

The servos already close the joint-position loop internally. Real gains
come from two outer loops:

1. **Joint level:** measure the actual lag vs commanded speed/frequency from
   topic 4 data, then (a) set `tracking_error` from the measured lag plus
   margin per speed, and (b) add feed-forward phase advance so the achieved
   waveform matches the intended one.
2. **Body level:** use IMU heading (topic 5) or external camera pose (topic 7)
   to correct the gait: steering bias for heading hold, amplitude/frequency for
   speed. This is the actual "closed-loop robot".

Done when: the commanded vs achieved waveform error is reported per run, and a
heading-hold test drives straight within a stated drift over a fixed distance.

## Phase 3 — new behaviours

### Topic 3 — caterpillar (vertical travelling wave) motion

- Uses pitch joints only (IDs 1, 3, 5, 7, 9; signs +1, −1, −1, −1, −1 —
  the gait must apply the map, not assume all +1). Yaw held at zero.
- Model: a travelling wave in the vertical plane,
  `θ_i(t) = A · sin(ωt − i·φ)`, with phase lag φ so that roughly one
  wavelength spans the body; lift-and-anchor contact pattern produces
  forward travel. Compare to the existing pitch gait (`run_pitch_gait.py`) —
  this may be a reparameterisation plus a new preset.
- Add as a 3D Gait Preset in both the simulator and Controls.
- Measure: displacement per cycle on one surface (follows the existing
  TRAVEL_TRIALS method), vs A, φ, frequency.
- Done when: repeatable forward displacement on hardware, with logged trials.

**Implemented 2 November 2026 (simulation only):** presets "Caterpillar crawl 10°
(commissioning)" (speed 100, 8 s ramp) and "Caterpillar crawl 20°" (0.25 Hz,
speed 500), plus the simulator's "Caterpillar Crawl (Vertical Wave)". Lag
**−72°** sends the wave head-to-tail and crawled forward 0.21 m in 24 s in
PyBullet; +72° went backward 0.13 m. The simulation lag slider now spans
−180…180°.

**Shape presets (Per-Joint Control → Shape preset):** straight, head raised,
cobra stand, tall cobra stand, near-closed ring and S-curve rest. Tuned in
PyBullet with placeholder 0.1 m / 0.25 kg links. Findings that will hold once
CAD arrives:
- In the bench frame, +pitch at IDs 3/5 raises the head end (the long rear acts
  as base) and −pitch at ID 1 levels the head.
- Tail coiling must start at ID 8. ID 6 sits behind raised pitch joint ID 5, so
  its yaw axis tilts and lifts the rear instead of making a flat support.
- A closed ring needs 72° at each of the 5 yaw joints, which is beyond the ±69°
  limit. 69° leaves a head–tail gap of about one link.

**Needs CAD assembly (owner preparing):** real link lengths, masses and joint
offsets to re-tune lift heights, the cobra's stability margin, ring closure and
crawl distance. The hardware pitch "up" direction must be checked against the
bench at ≤10° before running any stand pose.

### Topic 6 — draw a line, the snake takes that shape

Two distinct problems; start with (a):

- (a) **Shape fitting (static pose):** user draws a curve on a canvas →
  resample it into 10 links of the measured link length → compute the
  relative angle at each joint (yaw for a planar drawing; yaw + pitch for 3D)
  → clamp to ±70° and flag segments that are unreachable → preview in the
  sim → move with ramped speed. Literature: backbone-curve fitting for
  hyper-redundant robots (Chirikjian & Burdick).
- (b) **Follow the line (locomotion):** the robot travels along the drawn
  path. Gen 2.1 `path_engine.py` does this planarly in simulation; on
  hardware it needs position feedback (topic 7) to be real.
- Needs: measured Gen 3 link lengths (handoff still uses placeholder 0.1 m).
- Done when: (a) the photographed pose overlays the drawn curve within a
  stated error.

## Phase 4 — sensing and mapping

### Topic 5 — sensor integration and robot control

- Have now: `sensor_gen2_1` node with MPU6050 (accel/gyro), BMP280, a
  distance sensor and OLED; the transmitter already relays sensor broadcasts;
  `RobotTelemetry` already has `acc_mg` and `gyro_dps_x10` fields.
- Goal: mount an IMU on the Gen 3 head (ID 1 frame) and use it for:
  heading hold (topic 8), tip/roll-over detection → automatic STOP,
  obstacle distance → stop or steer.
- Done when: sensor values appear in the topic 4 telemetry view and one
  sensor-triggered safety action (e.g. roll-over STOP) works in a supported
  hardware trial.

### Topic 7 — SLAM

The robot currently has no camera or lidar, and the MPU6050 alone drifts
too fast for mapping. Recommended staged route:

1. **External localization first:** overhead camera + ArUco/AprilTag marker
   on the head (and tail). Gives ground-truth pose for topics 3, 6(b) and 8
   cheaply, and is required anyway to evaluate any SLAM result.
2. **Onboard sensing:** add a small 2D lidar or ToF array + IMU; head motion
   during undulation must be compensated (sensor sweeps with the head).
3. **SLAM:** 2D SLAM (e.g. ROS 2 slam_toolbox / Cartographer) off-board on the
   laptop, streaming scans over the radio link. Check bandwidth vs ESP-NOW.

Done when (stage 1): live pose of the snake shown on the dashboard map.

## Suggested order

0 fault fix → 4 telemetry → 1 per-motor → 2 speed → 8 closed loop →
3 caterpillar → 6 draw-a-shape → 5 sensors → 7 SLAM.

Topics 3 and 6(a) are mostly simulation/software and can start in parallel
with Phase 1 because they do not depend on higher speed.

## Inconsistency to resolve

`docs/GEN3_HANDOFF.md` "Other saved settings" still says speed 500 and
tracking_error 25; elsewhere it says tracking_error 100. The current
`joint_map.json` has speed 1500 and tracking_error 216. The map is
authoritative; update the handoff text when those values are next confirmed.

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

**Simulation now uses the owner's CAD assembly (2 Nov).**
- Browser viewer and default PyBullet model load the V2 prototype
  `cad/3D_motion_parts/V2/assembly_neutral_2048_PROTOTYPE_fit_and_load_validation_required_v2.SLDASM`
  (round Ø57 mm bodies, covered tail, head sensor bay), exported read-only from SolidWorks.
- Joint pivots: 20.61 mm head to ID 1, then 58.37 mm; bounds ≈ 679 × 57 × 57 mm.
  Contact boxes follow the CAD section (0.057 m).
- Mass (0.25 kg/body), box inertia and friction (0.8, anisotropy `[0.1, 1, 1]`) are still illustrative.
- New tools `tools/export_native_assembly.ps1` and `tools/export_assembly_simulation.py`
  produce `static/models/gen3-cad.json` and `gen3-body-0..10.obj`. The older KiCad exporter is superseded.
- `--link-length` still selects the older uniform-box bench.
- PyBullet caterpillar result: lag −72° moved +0.21 m in 24 s; +72° moved −0.13 m.
  Shape presets were tuned with the old 0.1 m links and need re-tuning on the CAD spacing.
- Details: `docs/gen3/GEN3_SIMULATION.md`.

**Hardware status (as of 2 Nov).**
- **No fuses are installed** (owner, 1 Nov). Fuses in the split-bus v3 drawing are design intent only.
- Power: external 3S 1800 mAh LiPo on long wires; the central battery section is removed.
- 31 Oct trial: 30° yaw / 25° pitch, 0.5 Hz, speed 1500. ID 1 had a WRITE failure and IDs 7/8 stopped
  replying. Owner then reported a wiring fault and fixed it.
  Still pending: a logged all-ten diagnostics query, and a repeat of the trial with minimum voltage recorded.
- Both dashboard headers show a BATTERY estimate from cached diagnostic voltages
  (`clamp((V − 11.1) / 1.5 × 100)`). It is a sampled recharge hint, not live state of charge.

**Open items.**
1. Logged all-ten diagnostics query, then repeat the speed-1500 trial with minimum voltage logged.
2. Small pose (≈10°) in simulation, then on the robot. Confirm pitch "up" matches, then run the 10° caterpillar.
3. Measure real masses, friction and fit; re-tune shape presets on the CAD spacing.
4. Telemetry part 2: voltage/temperature/status during motion (needs a receiver firmware change).
5. Install fuses before speed trials 1500 → 1800 → 2200 → 2600.
6. Closed loop, sensors, SLAM. Commit the working tree.

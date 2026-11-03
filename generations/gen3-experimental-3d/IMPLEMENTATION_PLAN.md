# Gen 3: alternating-axis implementation plan

Research date: 22 October 2026. Status: proposed implementation, not a hardware validation.

Implementation update (22 October 2026): calibrated gait generation, finite runner,
single-joint commissioning, fault checks, logs, and a simple alternating-axis
simulation are implemented. See README.md for commands. Hardware-dependent gates
remain pending; the findings below describe the original script assessed during research.

The owner confirms that CAD is ready and the motors and electrical connections remain the same as Gen 2. This plan treats the mechanical design as supplied. It assumes the existing ten ST3215 servos, now arranged as five yaw and five pitch joints; the actual ID-to-axis order must be measured during commissioning.

**First milestone:** repeatable movement on one flat test surface, followed by controlled left/right turning and reliable stopping. Climbing comes after this milestone.

## What the research changes

Alternating axes are an established snake-robot arrangement. A useful starting controller combines horizontal and vertical traveling waves. Pitch is not just an extra motion effect: it changes which parts of the robot support its weight. Gong et al. describe separate horizontal/vertical waves and demonstrate turning through changes to their shapes. Their parameters are evidence for the approach, not ready-made settings for this shorter robot. [Kinematic gait synthesis for snake robots, 2015](https://crablab.gatech.edu/pages/publications/pdf/kinematicgaitsynth.pdf).

Marvi et al. show that controlling body contact length helps sidewinding robots avoid slip and pitching on sandy slopes. Our practical inference is to tune lift and contact on flat ground before attempting slopes; more pitch amplitude is not automatically better. Their sand experiments do not establish traction on our floor or with our body shape. [Sidewinding with minimal slip, 2014](https://arxiv.org/abs/1410.2945).

CMU distinguishes cyclic gaits from task-specific sequences for stairs and gaps. We should establish one reliable cyclic gait before implementing obstacle maneuvers. [CMU gait research](https://biorobotics.ri.cmu.edu/projects/modsnake/gaits.html).

Waveshare specifies 4096 encoder counts/revolution and speed commands in counts/second. Its standard 12 V ST3215 has a quoted 30 kg·cm locked-rotor torque (approximately 2.94 N·m), not a continuous lifting rating. The vendor also sells a different 7.4 V variant. Keep the actual Gen 2 hardware and its applicable ratings; do not infer a new supply from the family name. [Servo documentation](https://www.waveshare.com/wiki/ST3215_Servo), [variant specifications](https://www.waveshare.com/product/modules/st3215-servo.htm).

## What already exists, and what needs correction

| Existing component | Decision |
|---|---|
| `test_3d_snake.py` | Replace its fixed experiment with a calibrated, finite-duration gait runner. Preserve dry-run default. |
| `shared/surge_control/hardware.py` | Reuse the Gen 2.1 serial transport, acknowledgements, explicit arming and stop behavior. |
| Gen 2.1 receiver/transmitter | Reuse target transport, not the separate firmware variants that generate planar gaits internally. Confirm what is flashed before testing. |
| `shared/surge_control/bench.py:align` | Gen 3 uses its mapped zeros and tracking checks. The current assembly is straight at 2048 for all ten motors after individual centering; older offsets have been replaced. Keep Gen 2 defaults separate. |
| Shared planar gait/path controller | Do not feed its ten-yaw-joint output directly into alternating joints. |
| Shared PyBullet model | Reuse tooling later, but supply a separate alternating-axis model. Current planar simulation cannot validate Gen 3. |

Specific findings from the current source:

- Yaw amplitude is 900 counts (79.1 degrees), but targets clamp to 2048 ±796 counts (approximately 70 degrees). The resulting waveform has flattened peaks.
- Pitch amplitude is 700 counts (61.5 degrees). Neither this nor the yaw limit is a measured Gen 3 operating envelope.
- For a sinusoid, peak target speed is `2*pi*f*A`. At 0.6 Hz, the requested yaw/pitch waves need approximately 3393/2639 counts per second, while the script commands 1500. Even ideal unloaded tracking is therefore speed-limited. These calculations use the vendor's count-based speed units.
- The script assumes odd IDs are yaw, even IDs are pitch, and reverses mounting signs every pair. These are assembly facts to measure, not gait mathematics.
- It checks feedback during initial alignment but does not monitor tracking during motion. A transport watchdog cannot detect every jam while valid targets continue arriving.
- The receiver's existing telemetry returns position, velocity and load. Load must not be labeled calibrated torque or motor current. Temperature/voltage/current are not exposed by this host telemetry path.

## Minimal control design

Keep one Python gait generator and the existing ESP32 target receiver. Start through the existing wired receiver connection; qualify wireless after the same motion passes locally.

Use one joint table with ID, axis, direction sign, neutral encoder count and measured minimum/maximum. Require ten unique expected IDs and reject incomplete calibration. The physical axis names refer to the straight robot's body frame; downstream axes rotate as the chain bends.

For each axis group, let `k` be its index along the body:

```text
yaw[k]   = yaw_bias + yaw_amplitude * sin(phase - k*spatial_lag)
pitch[k] = pitch_bias + pitch_amplitude * sin(phase - k*spatial_lag + phase_offset)
encoder[i] = zero[i] + sign[i] * angle[i] * 4096/(2*pi)
```

Angles are radians internally. Use a single monotonic phase clock, smooth amplitude/bias changes, and a slew limit on final targets, including startup transitions. A quarter-cycle yaw/pitch offset is an initial sidewinding candidate, with its sign and useful value established experimentally. Pair indexing is a first approximation; measured joint spacing can replace it if tuning exposes an issue.

Reject settings whose amplitude plus bias exceeds calibrated limits or whose required speed exceeds the measured tracking envelope. Keep final clamping as fault containment, not normal waveform shaping. Existing receiver bounds still apply: usable targets are the intersection of calibration limits and 1252–2844. If neutral falls outside that range, resolve calibration/receiver compatibility before enabling motion.

Distinguish normal stopping from faults: normal stop smoothly reduces motion into a tested supported pose; a fault requests STOP immediately. Existing STOP disables torque and can let a raised section fall. Keep pitch experiments close to a support surface and retain an accessible power cutoff.

## Implementation sequence and acceptance gates

| Stage | Work | Evidence required to advance |
|---|---|---|
| 1. Joint mapping | Read IDs with torque off. In a cradle, jog one joint at a time, beginning around ±5 degrees where clearance permits. Record axis, sign, physical straight zero and conservative range. | Every ID moves the intended joint in the documented direction; measured return to neutral; no cable tension or interference within the tested range. |
| 2. Calibrated runner | Add joint-table validation, calibrated alignment, smooth start/stop, finite duration, monotonic scheduling, telemetry freshness/tracking checks and CSV logs. Start with a 20 Hz target schedule and measure actual deadlines. | Offline tests cover invalid calibration, mapping, bounds, rate limits, stale/missing feedback and cleanup. Supported hardware verifies explicit STOP and receiver watchdog shutdown after host target loss. |
| 3. Slow axis tests | Test yaw with pitch neutral; then small pitch motion with the rest supported. Begin around 5–10 degrees and 0.1 Hz only where stage 1 permits. Measure tracking, loaded supply voltage, current and heating. | Repeated cycles track without sustained lag, faults or unacceptable heating. Record the accepted thresholds and support conditions. These are test starting values, not certified safe limits. |
| 4. Flat-ground gait | First record a yaw-only baseline; then add a low-amplitude pitch wave. Adjust lift, spatial lag and relative phase before increasing frequency. Use overhead video and floor marks. | Proposed milestone: three runs each moving at least one body length, with repeatable direction, reliable stops and no sustained tracking faults. Log time, displacement, heading drift and electrical observations. |
| 5. Turning and wireless | Try a small smooth yaw bias; if this fails to steer consistently, tune a yaw-amplitude gradient along the body. Preserve phase continuity. Then repeat with the existing radio link. | Repeatable left/right turns, controlled transitions, and stop tests for radio loss and stale operator input, including when the stick was neutral. |
| 6. Uneven ground | Use a separate simple alternating-axis simulation and measured mass/spacing to check poses, then test one low obstacle and one incline at a time. | Logged support/contact behavior and load envelope justify each increase. No staircase or suspended-gap claims based only on simulation. |

During stage 3, estimate pitch-joint gravity demand as `sum(mass * g * horizontal lever arm)` for the actual unsupported links. Then measure the loaded behavior. The same motor can be adequate in a supported yaw chain and inadequate when asked to lift several links. Derive operating limits from those tests, not the stall specification.

For floor tuning, change one parameter at a time and repeat each candidate three times. Low net displacement can mean poor friction/contact rather than insufficient motor speed. Keep the floor, battery condition and starting pose recorded. Use external current/temperature measurements initially if firmware telemetry does not provide them; add a small versioned telemetry extension only when needed for unattended protection or tuning.

## First implementation batch

The first batch should complete stages 1–2, with only these Gen 3 additions/edits:

- `joint_map.json`: a calibration template explicitly marked incomplete until measured.
- `gait.py`: pure angle generation and calibrated conversion, with no serial side effects.
- `test_3d_snake.py`: retain the entry point; add the finite calibration/gait workflow, ramping, fault checks and logging.
- `tests/test_gait.py`: small meaningful tests for geometry mapping, parameter rejection, speed/bounds and fault paths using a fake transport.
- `README.md`: document the confirmed redesign, commissioning commands and measured limits as they become available.

Reuse shared transport rather than copying it. If a shared transport change becomes necessary, update its callers and regression tests while preserving Gen 2 behavior. Receiver-side per-joint protection or telemetry additions must include firmware parsing tests and an actual ESP32 build before flashing. The previous ESP32 cross-build was blocked by toolchain downloads; that remains an outstanding deployment check.

Do not begin with a new dashboard, ROS migration, reinforcement learning, a CPG framework or autonomous path planning. Manual parameter tuning and a short CSV log are sufficient to establish the first useful gait. Add simulation fidelity and autonomy only when measured failures identify the need.

CAD was neither inspected nor modified for this plan. No firmware was flashed and no hardware motion was performed. Mechanical limits, sustainable pitch load and real floor traction remain unverified.

## October 2026 Implementation & Verification Addendum

The web controller implementation has been completed and verified under `generations/gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- **Launch Command**: `conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001`
- **Commissioning Route**: `http://127.0.0.1:5001/gen3`
- **Status**: 10-joint spatial commissioning, physical-order calibration map, finite pitch/yaw trials, operator auth leases, and disarmed bus diagnostics verified. Test suite passes (30 Node suites, 39 Python unit tests).


### Progress Update — 31 October 2026

- **Completed**: Continuous whole-path traversal in `path_engine.py` using segment projection ($t \ge 0.85$, cross-track error $\le 0.25$ m).
- **Completed**: Conditional manual stop report logic in `web_app.py` and `script.js` (>20% threshold).
- **Completed**: Gen 2.1 dashboard 5-box restructuring matching operator schematic.
- **Completed**: Header refinements (195px compact serial port dropdown, hidden motion dock).
- **Completed**: Gen 3 operator select and morphing password styling unification with Gen 2.1 paper aesthetic.
- **Verification**: 33 Node test suites, 44 Gen 2.1 Python unit tests, and 103 Gen 3 Python unit tests passing cleanly.

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

**Research and plans (1–2 Nov).**
- `docs/ideas/gen3-research-roadmap.md` orders the next topics:
  hardware fault → live telemetry → per-joint control → speed → closed loop → caterpillar →
  draw-a-shape → sensors → SLAM.
- `docs/research/solution-of-gen3-research-map.md` is the work log. Telemetry part 1, per-joint control,
  caterpillar and shape presets are done.
- `docs/research/ST3215_SPEED_LIMITS.md`: 1500 counts/s ≈ 22 RPM. The standard ST3215 is ≈ 3072 no-load
  at 12 V, and the driver board's maximum is 5 A.

**Open items.**
1. Logged all-ten diagnostics query, then repeat the speed-1500 trial with minimum voltage logged.
2. Small pose (≈10°) in simulation, then on the robot. Confirm pitch "up" matches, then run the 10° caterpillar.
3. Measure real masses, friction and fit; re-tune shape presets on the CAD spacing.
4. Telemetry part 2: voltage/temperature/status during motion (needs a receiver firmware change).
5. Install fuses before speed trials 1500 → 1800 → 2200 → 2600.
6. Closed loop, sensors, SLAM. Commit the working tree.

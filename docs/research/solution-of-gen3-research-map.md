# Solution of Gen 3 research map

Work log for the Gen 3 research roadmap session, 1–2 November 2026.
The roadmap itself is `docs/ideas/gen3-research-roadmap.md`. Nothing here was
committed. Nothing was run on the physical robot; all motion checks used the
offline tests, preview jobs or the PyBullet bench.

## 1. Research roadmap written

`docs/ideas/gen3-research-roadmap.md` turns the owner's eight topics into an
ordered plan. For each topic it records what exists, the goal, the approach and
when it counts as done:

0 hardware fault → 4 live telemetry → 1 per-motor control → 2 speed →
8 closed loop → 3 caterpillar → 6 draw-a-shape → 5 sensors → 7 SLAM.

Points made in the roadmap:
- `tracking_error` is a fault threshold that stops a run, not a controller gain.
  Raising it makes the system more tolerant of lag, not closed-loop. Real closed
  loop means setting the threshold from measured lag, adding feed-forward lead,
  and correcting heading with the IMU or a camera.
- SLAM needs sensors the robot does not have yet. Start with an overhead camera
  and markers, which also gives ground truth for the other topics.
- The handoff's "Other saved settings" still lists speed 500 and tracking
  error 25 (and 100 elsewhere). `joint_map.json` (speed 1500, tracking error 216)
  is authoritative.

## 2. IDs 7/8 servo fault closed (owner-reported)

The owner reported a wiring fault, now fixed. Recorded in
`.scratch/esp-connection/issues/03-high-amplitude-servo-loss.md` (status
resolved, pending re-query) and in roadmap phase 0. Still to do: a logged
all-ten diagnostics query and a repeat of the 30°/25°/0.5 Hz/speed 1500 trial
with minimum voltage logged.

## 3. Live servo telemetry in Controls (topic 4, part 1)

The runner already reads every servo at 20 Hz during a run, so no firmware change
was needed.

- `backend/surge_control/gen3.py` (`LiveWriter`): each joint's telemetry now
  carries `error`, `peak_error` and `error_history` (last 40 samples = 2 s), all
  recorded at the loop rate. Previously the 400 ms browser poll missed short
  spikes. `state.tracking` publishes the limit the running job actually
  enforces. It is reset at each job start.
- `gen3.js` / `gen3.html` / `gen3.css`, Measured Feedback & Joint Tracking
  table:
  - error in counts and degrees, plus Peak Error and Error Trend (2 s) sparkline
    columns with a dashed limit line;
  - a limit summary line showing the worst joint as a percentage of the limit;
  - amber at ≥50% of the limit, red above it.
- **Bug fixed:** the table always turned red at a hard-coded 25 counts. It now
  uses the job's real limit. Jog and center enforce a fixed 25 counts; gaits use
  the map's 216.
- Tests: new `test_live_telemetry_keeps_peak_and_recent_tracking_error` in
  `test_web.py`; `test_dashboard_offline.cjs` now loads the new helpers.
- Still open: voltage, temperature and status during motion. These need a
  receiver change (SYNC READ in the `T` reply) and a re-flash.

## 4. Hero snake trail 50% stronger

`static/hero-fluid-trail.js`: dye intensity per splat raised from 0.45 to
0.675, named `TRAIL_STRENGTH`. The display shader maps intensity to opacity, so
the trail is 1.5× more opaque with unchanged colours, fade and swirl. Applies to
both `/` and `/gen3`.

## 5. Roadmap status re-check

Changes made outside this chat, folded into the roadmap:
- the speed ceiling is now 1–3000 counts/s in software (saved map still 1500);
- new research note `docs/research/ST3215_SPEED_LIMITS.md`: standard ST3215
  ≈3072 counts/s with no load at 12 V; board max 5 A; **no fuses installed**;
- a battery indicator from cached diagnostics voltages.

## 6. Per-joint control (topic 1)

**Pose mode.** Every joint gets its own angle, holds, then returns to neutral.
- `gait.py` `validate_pose()`: converts degrees to counts per joint, applying
  the sign map. It rejects angles outside the calibrated limits, unknown IDs and
  non-numbers; missing joints stay at zero.
- `gen3.py`: new `mode: 'pose'`.
  - Hardware needs a calibrated map and an operator lease.
  - It uses the map's tracking limits (or verified simulation limits), a hold
    time of 2–300 s and a speed of 1–3000.
  - It runs through the existing `run_motion`: align to neutral, slew to the
    pose, hold, settle back to neutral.

**Per-joint gait settings.**
- `gait.py` `validate_overrides()` / `joint_wave()`: per joint `enabled`
  (disabled joints hold zero), `gain` 0–2, `phase` ±180° and `bias` ±70°.
- `validate_gait`, `calc_peak_speed` and `targets_at` take an `overrides`
  argument, so limit and speed-envelope checks include the overrides.
- `GaitMotionGenerator` applies them on every tick and includes them in
  live-tuning validation and in the transition speed-demand bound. They are
  fixed for the run.
- Gait start accepts `joints`. Both `joint_overrides` and `pose_targets` are
  saved in the run manifest.

**UI.** Controls has a "Per-Joint Control" card:
- a table with a slider per joint, limited to the calibrated range (±69° now);
- In gait / Gain / Phase shift / Bias inputs per joint;
- Hold and Speed fields, and Move to Pose / Zero Pose / Reset Gait Settings
  buttons;
- a summary line naming the joints with custom settings.

Hardware pose and gait starts list the moved joints, or the custom joints, in
the existing confirmation dialog. The sliders reuse the simulation slider style.

**Tests:** `test_joint_overrides_disable_scale_and_are_limit_checked` and
`test_pose_applies_sign_and_rejects_out_of_limit_angles` (`test_gait.py`), and
`test_pose_job_reaches_pose_then_returns_to_neutral` and
`test_pose_and_overrides_are_validated_before_start` (`test_web.py`).

Not tested: Move to Pose clicked in the browser. It needs an operator login,
which was not available in this session. The same request path is covered by
the Python tests.

## 7. Battery-change test repaired

`tests/test_truthful_telemetry.cjs` was failing after the battery-indicator
change. `pollSystemStats` now uses `AbortSignal.timeout` and
`window.SurgeBattery`, and the test sandbox had neither. The thrown error was
swallowed, so the stats stayed blank. The fix gives the sandbox both globals.
Dashboard code was correct and unchanged.

## 8. Caterpillar gait and shape presets (topic 3, start of topic 6)

**Caterpillar crawl.** A pitch-only travelling wave.
- `gen3.py` `DEFAULT_PRESETS` adds:
  - "Caterpillar crawl 10° (commissioning)": 0.1 Hz, lag −72°, speed 100,
    8 s ramp, 30 s;
  - "Caterpillar crawl 20°": 0.25 Hz, lag −72°, speed 500, 3 s ramp, 24 s;
    peak demand ≈477 counts/s.
- `gen3-sim.js` adds the "Caterpillar Crawl (Vertical Wave)" spatial preset.
- PyBullet results:
  - lag −72° crawled forward **+0.21 m in 24 s**; +72° went backward −0.13 m;
  - the 10° commissioning version moved +2.4 cm.
- The simulation lag slider and the runs lag input now span −180…180° (was
  10…180), so a reversed wave can be selected.

**Shape presets.** Per-Joint Control → Shape preset loads the sliders only
(`POSE_PRESETS` in `gen3.js`). All were tuned in PyBullet with placeholder
0.1 m / 0.25 kg links and torque 2.

| Preset | Angles (ID: degrees) | Simulator result |
|---|---|---|
| Straight | all 0 | — |
| Head raised | 3: 30, 1: −30 | head ≈12 cm up |
| Cobra stand | 5: 30, 3: 30, 1: −30, 8: 65, 10: 65 | front up and level, tail hooked as base, stable 8 s |
| Cobra stand (tall) | 5: 40, 3: 35, 1: −40, 8: 65, 10: 65 | head ≈13 cm up |
| Ring (near-closed) | 2, 4, 6, 8, 10: 69 | head–tail gap ≈9 cm |
| S-curve rest | 2: 40, 4: −40, 6: 40, 8: −40, 10: 40 | flat |

What the simulator showed:
- In the bench frame, +pitch at IDs 3/5 raises the head end (the long rear acts
  as the base). −pitch makes a Λ at the joint, and which end lifts depends on
  weight. −pitch at ID 1 levels the head.
- Tail coiling must start at ID 8. With ID 5 raised, ID 6's yaw axis tilts, so
  coiling there lifts the rear off the floor instead of making a flat support.
- A closed ring needs 72° at each of the five yaw joints, beyond the ±69° limit.

**Tests:** new `tests/test_pose_presets.cjs` (every shape stays within the
calibrated limits); `test_default_presets_fit_the_current_map` in
`test_web.py`. `test_control_spatial_presets.cjs` now counts the presets
instead of expecting exactly five.

## Verification summary

- Python (conda `surge`): 105 tests pass (`test_web`, `test_console`,
  `test_console_hardening`, `test_gait`, `test_battery`).
- Node: all 38 `generations/gen3-experimental-3d/tests/*.cjs` pass.
- Browser (local dashboard):
  - telemetry table rendered with injected data;
  - per-joint card, slider styling and shape presets checked;
  - caterpillar listed in both preset lists; lag slider −180…180;
  - no page overflow at 375 px.

## Remaining work

1. Hardware: an all-ten diagnostics query, then repeat the 1500 trial while
   logging minimum voltage.
2. Hardware: a small pose (≈10° on one or two joints) in Simulation, then on the
   robot. Confirm the robot's pitch "up" matches the simulator before any stand
   pose. Then run the 10° caterpillar commissioning preset.
3. CAD assembly (owner preparing): real link lengths, masses and joint offsets.
   Put them into `simulation.py`, then re-tune the stand heights, cobra
   stability, ring closure and crawl distance. Needed for topic 6 (draw a line,
   the snake takes that shape).
4. Telemetry part 2: voltage, temperature and status during motion (receiver
   firmware).
5. Speed trials 1500 → 1800 → 2200 → 2600 with voltage and current logged;
   fusing first, since no fuses are installed.
6. Closed loop (topic 8), sensors (topic 5) and SLAM (topic 7), as in the
   roadmap.
7. Update the stale speed and tracking values in `docs/GEN3_HANDOFF.md`.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**Later on 2 Nov.** Remaining item 3 is partly done: the simulation now uses the owner's V2 CAD assembly
(20.61 mm / 58.37 mm pivots). Masses and friction are still placeholders. Shape presets and the caterpillar
distance were tuned on 0.1 m links and must be re-tuned.

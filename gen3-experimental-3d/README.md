# Gen 3 — alternating yaw/pitch control

Gen 3 keeps the Gen 2 motors and connections and changes the joint arrangement.
CAD is supplied by the owner and is not modified by these tools.

## Current Status & Console Continuation (31 October 2026)

- **Gen 2.1 Dashboard Restructuring**: Layout updated to 5-box architecture strictly matching operator schematic (Mathematical Path, Gamepad State/Node, Live Trajectory Tracking, Simulation Physics, and 2x5 Telemetry grid).
- **Continuous Simulation Pathing**: `path_engine.py` supports whole-path traversal using segment projection, preventing undulation stalls at 20% progress. Manual stop triggers accuracy report conditionally when progress >20%.
- **Gen 3 Console Alignment**: Operator select dropdown and morphing password button unified with Gen 2.1 paper styling; `Connect simulation engine` relocated to the right of `Serial port`.
- **Route Simulation & CAD Models**: Web console route navigation, Three.js 3D model with 11 links and 10 joints, and local CAD asset loaders verified in `docs/GEN3_SIMULATION.md`.

## Current hardware result — 26 October 2026

The owner has completed single-motor centering and reported successful pitch-only
trials at 2°, 5° (including 30 seconds), and 10° with an 8-second ramp. Forward
travel remains small and unmeasured. The battery is external on long wires; the
central battery section has been removed. All ten motors, including previously
disconnected IDs 7 and 8, are now responding.

**New chats: read [the working handoff](../docs/GEN3_HANDOFF.md) and current
`joint_map.json` before changing calibration.** It records the confirmed
sign table, firmware repairs, successful commands, environment setup, remaining
risks and requested simulation work.

Known working 10° pitch trial, from the repository root:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --yaw 0 --pitch 10 --frequency 0.1 --ramp 8 --duration 30
```

Keep clearance and slack wires; Ctrl+C requests STOP. The shorter default ramp
was rejected by the 100 counts/s speed envelope. Do not raise the speed limit to
bypass that check. Successful bending does not establish efficient locomotion.

Next: use the [measured travel trial sheet](TRAVEL_TRIALS.md) to record three
repeats of this baseline before choosing a gait parameter to change.

The controller supports single-joint commissioning, calibrated yaw/pitch waves,
yaw bias for turning trials, reversed waves, CSV logging, and an optional simple
PyBullet simulation. It reuses the Gen 2.1 receiver/transmitter target protocol.
It does not use the planar dashboard/path controller or onboard planar gait firmware.

## Setup

Run commands from the repository root with a working Python 3.11+ interpreter:

```powershell
python -m pip install -r gen3-experimental-3d/requirements.txt
python -B -m unittest discover -s gen3-experimental-3d/tests -v
python gen3-experimental-3d/main.py
python gen3-experimental-3d/controller_node.py --gen 3
```

The first command installs the existing serial dependency. Offline tests and
preview need only the standard library. If the old repository `.venv` reports a
missing interpreter, use a working Python installation rather than that launcher.

The default command generates the complete target sequence without opening a port.
Logs go to `gen3-experimental-3d/runs/` as a CSV plus a JSON snapshot of parameters
and calibration. `--log PATH.csv` selects a new output file; existing files are
never overwritten. Preview rows intentionally have no measured feedback.

## Receiver requirement

Use `receiver_gen2_1` on the robot. For wireless, use `transmitter_gen2_1` on the
computer side and retain the existing matching radio setup. The controller requires
`SURGE,2.1` in response to `HELLO`. `robot_esp32` / `robot_esp32_v2` generate planar
gaits and are not the receiver for this application.

If firmware installation is needed, the existing build targets are:

```powershell
pio run -e receiver_gen2_1
pio run -e transmitter_gen2_1
```

These commands build, not upload. The earlier toolchain-download blocker was
resolved during this chat: receiver and transmitter builds passed, and the owner
uploaded the matching firmware. See the handoff for subsequent read-back fixes
and the latest hardware trials; do not treat the earlier blocker as current.
The receiver accepts IDs 1–10 and encoder positions 1252–2844. Its 750 ms target-loss
watchdog releases torque. Confirm those behaviors on the supported robot before
floor trials. Keep other controller applications closed during a run.

## Commissioning: do this before a full-chain run

1. Support the robot near a surface. Torque release can let pitch links fall.
2. Read all ten servo positions with torque off. Replace `COM5` with the real port:

   ```powershell
   python gen3-experimental-3d/test_3d_snake.py --hardware --port COM5 --mode read
   ```

3. Jog one joint a few encoder counts. Only that ID is enabled; it makes one smooth
   excursion and returns to its measured starting position before torque release:

   ```powershell
   python gen3-experimental-3d/test_3d_snake.py --hardware --port COM5 --mode jog --id 1 --ticks 20 --duration 4
   ```

   Repeat with negative ticks and each ID. The jog deliberately works without a
   calibrated map because it is how mounting directions are established. It is
   capped at ±57 counts (about 5 degrees), speed 100 counts/s, and the receiver
   bounds. It cannot know mechanical clearance: select a smaller jog where needed.
   Other joints remain torque-off and need physical support.

4. Edit `joint_map.json`. For the current remounted robot, all ten straight-pose
   targets are **2048** following individual motor centering. Refit the linkages
   straight at that shaft position. This replaces the earlier individual zero
   offsets. On 26 October the owner supplied the positive-jog direction table
   for all ten motors: pitch ID 1 up, pitch IDs 3/5/7/9 down, yaw IDs 2/4/6/8/10
   left. The confirmed JSON uses pitch ID 1 sign +1, pitch IDs 3/5/7/9 sign
   -1, and all yaw signs +1. This is the confirmed sign mapping across the project.
   The map is marked calibrated for small commissioning
   trials at the jog-tested speed of 100 counts/s. This flag does not certify
   communication reliability or sustained load capacity. Feedback/servo faults
   were investigated and subsequent pitch trials succeeded; the stop checks remain.

   Current operating orientation (owner photo, 26 October 2026): ID 1 is at the
   bottom end and ID 10 at the top Waveshare-driver end. The map assumes IDs
   increase consecutively along the body and uses odd IDs as pitch, even IDs as
   yaw, based on the owner's alternating arrangement and ID 1/2 observations.
   Use the ID 1 end as the head for this mapping. Intermediate order is based on
   the owner's sequential ID description; encoder signs use the subsequent
   positive-jog observations, not the still photograph.

   The owner reports mechanical clearance of ±90° for every shaft. Around 2048,
   that corresponds to encoder targets 1024–3072. The installed receiver and Gen 3
   validation permit only 1252–2844 (about ±70°), so the current map uses that
   intersection as its command limits. These replace the old ±10° example limits.
   Recheck assembled clearance, including cables, after refitting linkages.
   Reaching ±90° in software would also require a coordinated receiver/host change
   and new hardware verification; changing JSON alone cannot enable it.

   | Field | What to record |
   |---|---|
   | `joints` order | Physical head-to-tail order, independently of servo ID |
   | `id` | Actual servo ID, each of 1–10 exactly once |
   | `axis` | `yaw` or `pitch` in the straight robot frame; must alternate |
   | `sign` | `1` or `-1` mapping the defined positive physical angle to encoder increase |
   | `zero` | 2048 for every joint in the current straight-mounted assembly |
   | `min`, `max` | Conservative measured encoder limits, inside 1252–2844 |
   | `speed` | Measured usable tracking speed in counts/s; software accepts 1–1500 |
   | `tracking_error` | Allowed encoder error before the sustained-error timer starts |
   | `tracking_timeout` | Allowed continuous error duration in seconds |
   | `calibrated` | Set to `true` only after all entries are measured and checked |

   Use one consistent body frame: x toward the head, z up, y to the robot's left;
   positive rotations follow the right-hand rule. Do not copy the old alternating
   sign pattern unless it matches the assembled joints. A coordinate reversal can
   reverse apparent turn direction; verify it on the floor.

   With torque off, physically support the straight pose and use read mode to
   collect zeros. No EEPROM zero changes or automatic limit-search motions are
   performed. If a neutral lies outside the receiver range, resolve assembly/servo
   centering compatibility first. Do not bypass the range check.

5. Preview with the completed map, then perform supported small-amplitude tests.
   The supplied tracking threshold (25 counts, about 2.2 degrees for 0.5 s) and
   speed 200 are commissioning candidates, not validated hardware settings.

## Mechanical centering with detached linkages

Only when the selected output can rotate freely, use `center` to move one motor
slowly to encoder 2048. Power off before detaching or refitting a horn/linkage;
never open the servo case. Label IDs and physical locations before disassembly.

From the repository root:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode center --id 1 --free-shaft --duration 2
```

Run one ID at a time and inspect the result before repeating for the next ID.
The command enables only that ID, starts from measured position, slews at
100 counts/s, checks tracking and receiver bounds, verifies 2048 within 3 counts,
then releases torque. It stays at the center target rather than returning to the
initial position like a jog. Torque release can allow the free output to shift.
Ctrl+C and faults use the existing STOP/disconnect cleanup. Other joints must
remain supported. Omit `--hardware` for a no-connection argument preview.

This does not write EEPROM offsets or change `joint_map.json`. Refit the linkage
straight with power disconnected, avoid turning the output while fitting, then
verify the straight-pose readings again. The current map uses 2048 for all ten
joints; earlier individual offsets have been retired. Small unpowered drift does
not change that commanded neutral. A different horn mounting requires measuring
and updating the map again. Axes, signs, physical order and limits still require
calibration.

## Motion trials

`run_pitch_gait.py` is a dedicated finite pitch-wave launcher. It fixes yaw
amplitude and yaw bias to zero; yaw motors still receive their mapped neutral
targets. Pitch joints follow the saved map (currently odd IDs). From this folder:

```powershell
python run_pitch_gait.py
python run_pitch_gait.py --simulate
python run_pitch_gait.py --hardware --port COM6 --pitch 5 --frequency 0.1 --duration 10
```

The first command only writes preview logs. Simulation uses the existing
illustrative headless model at 2 Nm assumed torque. Hardware retains the full
calibration gate, feedback/deadline checks and torque-off cleanup; it does not
solve intermittent telemetry faults or declare the map calibrated. Support pitch
links and keep power disconnection accessible. The wave is a motion experiment,
not a guarantee of forward locomotion.

To command all ten motors to 2048 without a gait or a calibrated map:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode align --duration 2
```

Support the body and provide joint/cable clearance first. This enables all ten
motors, slews from measured positions at 100 counts/s, holds the 2048 targets for
the specified duration, confirms feedback within the runner's 15-count neutral
tolerance, and releases torque. Feedback, tracking, deadline and STOP checks
remain active. It does not infer physical straightness or mark the gait map
calibrated. Omit `--hardware` for a no-connection argument preview.

All values below are test examples, subject to measured limits. Start with yaw only:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM5 --yaw 5 --pitch 0 --frequency 0.1 --duration 10
```

Then pitch only in a supported setup:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM5 --yaw 0 --pitch 5 --frequency 0.1 --duration 10
```

Then a coordinated sidewinding candidate:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM5 --yaw 5 --pitch 5 --offset 90 --duration 10
```

Use `--bias 2` and `--bias -2` for turning trials; these do not guarantee left/right
on every mounting arrangement. `--frequency -0.1` reverses wave travel, whose
locomotion direction must also be measured. `--lag` controls phase separation
between successive joints of the same axis. CLI angles are degrees; internal
angles are radians. Adjust one parameter at a time and repeat each test.

The run first aligns slowly to measured zeros, then executes a finite gait with
cosine startup/shutdown ramps, verifies return to neutral and releases torque.
`--duration` is the gait time, including both ramps; alignment/settling add time.
Amplitude, bias and ramp speed are checked against calibration before connecting.
No clipping is used to make an invalid gait fit. A final slew limit also prevents
large target jumps. Slow serial cycles can reduce effective motion speed; inspect
`interval_s` in the CSV rather than assuming an exact 20 Hz rate.

Ctrl+C requests immediate STOP through cleanup. Missing/out-of-range feedback,
sustained tracking error, a control/telemetry deadline over 300 ms, or failed
alignment also stop the run. Normal completion returns to neutral; a fault does
not attempt a recovery motion. STOP disables torque, including on pitch joints.
A jam with less than the configured position error may not be detected. Position
tracking is not thermal/current protection: monitor those separately during trials.

`load_raw` is the existing servo load register, not calibrated torque or amperes.
The protocol has no response sequence/timestamps: the host checks read latency and
missing responses but cannot prove the age of a delayed radio packet. Qualify
wireless only after wired tests. No gamepad or autonomous input is accepted by
this finite runner, so an idle operator cannot leave an indefinite run active.

## Optional simulation

Install the already-used simulation dependency in the interpreter you will run:

```powershell
python -m pip install "pybullet>=3.2"
python gen3-experimental-3d/test_3d_snake.py --simulate --sim-torque 2 --duration 4
```

Add `--headless` for a windowless run. `--hardware` and `--simulate` cannot be
combined. Simulation never opens serial and permits the example calibration.
It uses eleven simple box links, ten alternating joints, gravity and ground
contact, with the same gait and tracking checks. `--link-length` (metres),
`--link-mass` (kg), and `--sim-torque` (Nm) specify model assumptions. Defaults
are 0.1 m, 0.25 kg and 0.3 Nm; the low default torque can trigger tracking faults.
The demonstrated 2 Nm example is a simulation setting, NOT a continuous ST3215
rating. Servo load is unavailable in this model and remains blank in its logs.

The geometry/inertia/friction are simplified and the model advances 50 ms of
physics per telemetry sample. It checks controller integration and joint axes;
it does not predict real speed, climbing ability, temperature or safe lifting load.

## Verification and remaining physical work

Offline tests cover calibration rejection, physical ID ordering, axis signs,
wave bounds and reversal, startup/shutdown, slew limiting, missing/stale feedback,
jams, single-joint jog isolation, deadline faults, dry-run isolation and cleanup.
The repository's existing Gen 2.1 regression tests also cover the retained preview
entry point. No new firmware, dependency framework, dashboard or CAD edits are
needed for these workflows.

Verified on 28 October 2026: 77 Gen 3 offline tests, 29 Gen 2.1 regressions,
and 11 Node dashboard component test suites passed cleanly. Headless PyBullet
runs completed alignment, motion and settling. No physical robot was commanded.

The implementation provides the software for commissioning and flat-floor gait
experiments. Actual calibration, contact tuning, turning performance, sustained
pitch loads, wireless loss behavior and obstacle maneuvers require hardware data.
See `IMPLEMENTATION_PLAN.md` for the acceptance gates. Do not claim climbing or
reliable sidewinding from a successful waveform preview alone.

## October 2026 Web Dashboard Consolidation Addendum

The web dashboard backend has been consolidated directly into `gen3-experimental-3d/backend/web_dashboard/web_app.py`, uniting Gen 2.1 planar control and Gen 3 3D spatial commissioning under a single server.

### Launch Command

```powershell
conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```

- **Routes**: `/` (Planar Gen 2.1 Cockpit), `/gen3` (Spatial Gen 3 Console), `/3d` (Spatial Visualizer).
- **Features**: Symmetrical Slush UI header, generation switcher with informative hover cards, task tabs, operator session authentication with lease management, disarmed bus diagnostics, and persistent floating emergency Stop dock.


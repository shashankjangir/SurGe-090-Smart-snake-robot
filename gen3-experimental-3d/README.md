# Gen 3 — alternating yaw/pitch control

Gen 3 keeps the Gen 2 motors and connections and changes the joint arrangement.
CAD is supplied by the owner and is not modified by these tools.

The controller supports single-joint commissioning, calibrated yaw/pitch waves,
yaw bias for turning trials, reversed waves, CSV logging, and an optional simple
PyBullet simulation. It reuses the Gen 2.1 receiver/transmitter target protocol.
It does not use the planar dashboard/path controller or onboard planar gait firmware.

## Setup

Run commands from the repository root with a working Python 3.11+ interpreter:

```powershell
python -m pip install -r gen2-st3215/requirements.txt
python -B -m unittest discover -s gen3-experimental-3d/tests -v
python gen3-experimental-3d/test_3d_snake.py
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

These commands build, not upload. The previous ESP32 cross-build was blocked by
toolchain downloads; this Gen 3 change does not claim a new firmware build or flash.
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

4. Edit `joint_map.json`. Its example values are NOT measurements:

   | Field | What to record |
   |---|---|
   | `joints` order | Physical head-to-tail order, independently of servo ID |
   | `id` | Actual servo ID, each of 1–10 exactly once |
   | `axis` | `yaw` or `pitch` in the straight robot frame; must alternate |
   | `sign` | `1` or `-1` mapping the defined positive physical angle to encoder increase |
   | `zero` | Encoder reading at the physically straight joint |
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

## Motion trials

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

Verified on 22 October 2026: 23 Gen 3 offline tests and 25 existing Gen 2.1
regressions passed. A four-second headless PyBullet run with `--sim-torque 2`
completed alignment, motion and settling. Lower simulated torque exercised the
tracking-fault stop. No physical robot was connected or commanded.

The implementation provides the software for commissioning and flat-floor gait
experiments. Actual calibration, contact tuning, turning performance, sustained
pitch loads, wireless loss behavior and obstacle maneuvers require hardware data.
See `IMPLEMENTATION_PLAN.md` for the acceptance gates. Do not claim climbing or
reliable sidewinding from a successful waveform preview alone.

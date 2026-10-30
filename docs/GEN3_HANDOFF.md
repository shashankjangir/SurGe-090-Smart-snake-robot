# Gen 3 working handoff

Last updated: 28 October 2026, Asia/Calcutta. This is the continuation record for
the owner/assistant commissioning conversation, not a claim of autonomous locomotion.

Console follow-up, 28 October 2026: read `GEN3_SYSTEM_REVIEW.md`, `GEN3_PROGRESS.md`, and
`docs/GEN2_1_WEBSITE_PROMPT_REFINED.md` for the completed local-only operator controls, independent
lease-loss Stop, bounded live Apply, Slush design system unification, Gen 2.1 central trajectory
dashboard restoration with math presets and simulation physics commit, interactive visual components
(`PixelSnakeHeading`, `CanvasFractalGrid`, `GridBeam`, `ShaderLensBlur`, `MorphingButton`, `DistortedGlass`),
and full test verification (79 Gen 3 tests, 31 Gen 2 tests, 12 Node test suites). Hardware calibration
and owner observations remain unchanged.

## Start here in a new chat

1. Read this file, `gen3-experimental-3d/joint_map.json`, and the working tree status.
2. Preserve the owner's current mounting and saved settings. Do not revert to the
   initial yaw-first example map or the earlier individual neutral offsets.
3. The owner has already flashed the matching protocol firmware, centered motors,
   supplied axis/direction observations and run successful pitch trials. Resume
   from locomotion/contact tuning, unless a new fault actually requires diagnosis.
4. Do not actuate the robot, flash a connected board, or start a web hardware job
   merely to inspect the repository. The owner normally executes hardware commands.
5. Distinguish owner-reported hardware results from offline tests and simulation.
   A new chat cannot recover this conversation automatically; this file is its record.

## Hardware and reference frame

- Ten Waveshare/Feetech ST3215 bus servos, with alternating joint planes.
- Physical order used by the map: ID 1 → 2 → … → 10. ID 1 is designated head;
  ID 10 is the Waveshare bus-servo-driver-with-ESP32 end. In the latest photo,
  driver/ID 10 is at the top and ID 1 at the bottom.
- Current resting orientation: odd IDs are pitch (toward/away from the tabletop),
  even IDs yaw (left/right across the tabletop). Rolling the whole body 90° swaps
  these world-relative labels. Keep the operating orientation consistent.
- Central battery compartment/section removed. External 3S 1800 mAh LiPo on long
  wires is temporary. Do not include the removed battery section/mass in a future
  assembly model. Verify actual geometry connecting the halves from new CAD.
- Previously unpowered motors 7 and 8 were repaired/reconnected; all ten now reply.
  Do not keep describing 7/8 as currently disconnected.
- Exact motor variant, assembly dimensions/masses/friction, present power-branch
  wiring/fusing and continuous torque capability are not independently measured.
  Gen 2 power-design documents are references, not proof of the current wiring.

The model convention is x toward the head, z up, y to the robot's left, with
right-hand rotations. The owner was asked to describe yaw while looking from
ID 10 toward ID 1. Screen-relative wording and frame conventions were a source
of confusion; distinguish observed direction from numerical map sign.

## Current calibration: read the JSON first

The owner individually centered the free outputs to encoder 2048, then refitted
the robot. Thus **2048 is the commanded straight target for all ten motors**.
Small unpowered drift is expected; it does not change that target automatically.
Earlier measured offsets (2008, 2137, etc.) are obsolete for this mounting.

Snapshot of the actual file at this handoff:

| ID | Axis | Positive encoder jog, owner observation | Saved sign |
|---|---|---|---:|
| 1 | pitch | Up first, then return down | 1 |
| 2 | yaw | Left first, then return right | 1 |
| 3 | pitch | Down first, then return up | -1 |
| 4 | yaw | Left first, then return right | 1 |
| 5 | pitch | Down first, then return up | -1 |
| 6 | yaw | Left first, then return right | 1 |
| 7 | pitch | Down first, then return up | -1 |
| 8 | yaw | Left first, then return right | 1 |
| 9 | pitch | Down first, then return up | -1 |
| 10 | yaw | Left first, then return right | 1 |

**Sign convention confirmed:** The sign numbering above is the confirmed physical
table: pitch ID 1 is +1, pitch IDs 3, 5, 7, 9 are -1, and all yaw IDs (2, 4, 6, 8, 10) are +1.
`joint_map.json` has been updated and aligned to this exact table everywhere across the
codebase, resolving the earlier sign discrepancy. Frame consistency is maintained across
simulation, finite test runners, and the web console.

Other saved settings:

- `calibrated: true` for small commissioning trials; not a certificate of field safety.
- `speed: 500` encoder counts/s (current saved setting).
- `tracking_error: 25` counts; `tracking_timeout: 0.5` seconds.
- Each `zero: 2048`, `min: 1252`, `max: 2844` (receiver-supported approximately ±70°).
- Owner reports ±90° mechanical shaft clearance. Targets 1024–3072 would represent
  ±90°, but the host and receiver do not permit that range. Check assembled
  cable/linkage clearance; free-shaft travel alone is insufficient.

The CLI, finite web jobs and Gen 3 simulation load this map. The web editor loads
it on page load; refresh after external changes so an old editor does not resave
stale values. Never reset the calibrated flag or mark it true automatically just
to dismiss an error; preserve measurements and validate the intended change.

## Laptop, directories and dependencies

Repository: `C:\1. SurGe 090 Smart snake robot`.

```powershell
Set-Location 'C:\1. SurGe 090 Smart snake robot'
```

Commands below assume this root directory. If already inside
`gen3-experimental-3d`, omit that path prefix: `python test_3d_snake.py ...`.
Several early errors came from the wrong cwd or pasting two commands together.

- Windows PowerShell; base Python is Miniconda Python 3.14.8. CLI serial control
  works there after `python -m pip install -r gen2-st3215/requirements.txt`.
- PlatformIO Core 6.2.0 is installed via base Python. Use `python -m platformio`;
  bare `pio` was not on PATH.
- Dashboard/simulation environment: conda `surge`, Python 3.11.17. PyBullet wheel
  installation failed through pip on this machine, including with Python 3.11.
  Conda-forge installation succeeded; do not repeat the failed pip build loop.

For a fresh environment only:

```powershell
conda create -n surge python=3.11 pip -y
conda install -n surge -c conda-forge pybullet flask pyserial psutil -y
```

Run commands individually, waiting for the prompt. Do not recreate an existing
environment. The conda PyBullet package installed as version 3.25.

## Connection and firmware

Normal path: PC USB → transmitter ESP32 → ESP-NOW channel 1 → robot Waveshare
ESP32 bus driver → single servo data bus. Robot USB is accessible temporarily
for flashing or direct diagnostic control, although normal tests are wireless.

- PC transmitter normally enumerates COM6: Silicon Labs CP210x, VID:PID 10C4:EA60.
- COM4 and COM5 are Bluetooth ports; they caused write/semaphore timeouts.
- Both boards can enumerate as COM6 when connected individually. Port descriptor
  alone cannot identify which board is plugged in: physically distinguish them.
- Transmitter hardware MAC from upload: `68:09:47:5c:10:ec`.
- Robot hardware MAC from upload: `28:05:a5:4f:e5:ac`.
- Robot firmware overrides its station MAC to `28:05:a5:4e:01:38`, matching the
  transmitter's destination. The different upload MAC is not itself a pairing bug.
- USB host baud 115200; servo UART 1 Mbps, receiver RX18/TX19.
- Protocol handshake is `HELLO` → `SURGE,2.1`.
- Robot firmware: `receiver_gen2_1`. PC-side firmware: `transmitter_gen2_1`.
  The planar onboard `robot_esp32[_v2]` and raw USB bridge are different paths.

Upload only after identifying the attached board; disconnect LiPo and support the
robot. These examples assume the matching board, and only that board, is on COM6:

```powershell
python -m platformio run -e receiver_gen2_1 -t upload --upload-port COM6
```

Unplug the robot USB, plug the transmitter, reconfirm port, then:

```powershell
python -m platformio run -e transmitter_gen2_1 -t upload --upload-port COM6
```

Do not run both upload commands on one attached board. Sources are pinned to
espressif32 6.10.0 / Arduino 2.0.17, SCServo 1.0.1.

## What was fixed during this chat

1. Initial partner firmware only understood `P,...`, `T` and `I,...`; it had no
   HELLO/RUN/STOP contract. This explained the initial handshake failure. The
   partner repo is https://github.com/bhaveshbanshiwal/Snake_SURGE (reviewed at
   `b15efefde1e805c9fbdd0cde501bb0acec8fd0eb`). Its similarly named 3D test is
   an immediate, large-amplitude hardware script, not the current safe preview.
2. Python serial reads could split a reply at the 30 ms serial timeout and discard
   the pieces. Added newline buffering, a length bound, reconnect reset and
   short-write detection. Fragmentation tests reproduced the old failure.
3. Radio transmitter now serializes sends via delivery callbacks, reports send/
   delivery/queue errors, and filters control replies by receiver MAC while still
   relaying separate sensor broadcasts. Wi-Fi modem sleep is disabled on both.
4. Receiver queues sender MAC with commands, learns the peer in its main loop,
   and unicasts replies to the transmitter. Queue overflow requests a prioritized
   STOP; existing watchdog/feedback/deadline checks remain.
5. `ERR,SERVO` now reports ID, WRITE/TORQUE operation, return result and status.
   The Python runner preserves that fault if STOP cleanup also fails.
6. STOP initially reported success without checking torque-disable writes. A
   stricter ACK check exposed `ERR,STOP,TORQUE_OFF_UNCONFIRMED` on hardware.
   The read-only D query then showed all ten torque registers already zero and
   zero status, despite the unconfirmed acknowledgements.
7. Receiver now accepts a missing write ACK **only after fresh RAM read-back**:
   torque must match requested on/off, or goal position and goal speed must both
   match. Nonzero servo errors, failed reads and mismatches still fault. No EEPROM
   changes, blind movement retries or enlarged telemetry deadlines were used.
   Successful hardware reads and pitch trials followed this change.

The OLED returns to Waiting after one second without commands. It represents
recent activity, not a persistent ESP-NOW connection state. The transmitter's
boot core-dump message appeared even during successful exchanges; it has not
been repaired and is not established as the cause of servo faults.

### Read-only diagnostics

Close other serial applications first:

```powershell
python -m serial.tools.miniterm COM6 115200 --eol LF
```

Wait roughly three seconds, type a command then Enter; local echo may be off.
Exit with Ctrl+]. `HELLO` checks the protocol, `T` requests position/load/speed,
and `D` requests diagnostics while disarmed. The latter returns:

`D,id:reg8:torque:voltage_raw:temperature_raw:status,...`

Owner's diagnostic returned all ten `reg8=1`, torque=0, voltage_raw=113–114,
temperature_raw=29–31, status=0. These were snapshots, not a sustained-load test.
Do not infer write success merely from T working. Do not change EEPROM register
settings without establishing their meaning for the exact servo variant.

## Operating commands and reported results

All commands in this section assume the repository root and transmitter COM6.
Read does not arm torque. Motion commands require supported links, clearance,
slack external power wires and access to physical power disconnection.

Read all motors:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode read
```

Small single-joint jog, returns to its measured starting position:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode jog --id 1 --ticks 20 --duration 4
```

Command every motor to 2048, with slow alignment and torque release:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode align --duration 2
```

Single free-shaft centering (power off to detach/refit; never claim an attached
joint is free). Only needed after mechanical remounting, not before every run:

```powershell
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode center --id 1 --free-shaft --duration 2
```

The owner reports these pitch-only trials worked:

```powershell
python gen3-experimental-3d/run_pitch_gait.py --hardware --port COM6 --pitch 2 --frequency 0.1 --duration 10
python gen3-experimental-3d/run_pitch_gait.py --hardware --port COM6 --pitch 5 --frequency 0.1 --duration 10
python gen3-experimental-3d/run_pitch_gait.py --hardware --port COM6 --pitch 5 --frequency 0.1 --duration 30
python gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --yaw 0 --pitch 10 --frequency 0.1 --ramp 8 --duration 30
```

The 10° trial with the default 2-second ramp was correctly rejected:
`Gait exceeds speed envelope for joint 1: 160.8 > 100`. The 8-second ramp permits
the larger motion without raising speed. `run_pitch_gait.py` does not expose
`--ramp`; use `test_3d_snake.py` for that parameter. At 0.1 Hz, a cycle takes 10 s.

The owner says motion is good but travel is small. No displacement, efficiency,
speed, slip or thermal measurements were supplied. Pitch-only bending does not
establish forward locomotion. Normal finite runs align, ramp, return to neutral
and release torque. Ctrl+C requests STOP; faults do not command recovery motion.

Omitting `--hardware` generates preview CSV/JSON without opening serial:

```powershell
python gen3-experimental-3d/run_pitch_gait.py
```

Logs and parameter snapshots are under `gen3-experimental-3d/runs/`; preview rows
contain no measured positions. Earlier logs documenting faults remain historical
evidence, not an indication that every latest trial failed.

## Website and simulation: implemented versus requested

Launch the shared Flask server:

```powershell
conda run --no-capture-output -n surge python shared/web-dashboard/web_app.py --port 5001
```

Keep that terminal open. Open http://127.0.0.1:5001/gen3 for the Gen 3 commissioning
page. Default port is 5000 when `--port` is omitted. Do not assume a previous
server process survived across days; restart it after backend changes.

Implemented during the chat:

- Gen 3 page, serial-port selection, torque-off snapshots showing partial/missing
  feedback, single-motor jogs, physical-order calibration table with atomic save
  and backups, finite pitch/yaw trial parameters, CSV downloads and Stop.
- Preview and simple headless alternating-axis PyBullet jobs, via the existing
  runner. A four-second web simulation and browser preview were verified offline.
- Separate ownership of the serial connection between planar and Gen 3 web jobs.
  External CLI/miniterm processes must still be closed manually.
- Cooperative cancellation followed by STOP/disconnect. Closing a browser tab
  does not stop the finite job; Stop is not a physical emergency-stop circuit.

Not implemented:

- Live Gen 3 browser 3D viewer or accurate CAD-based, battery-free assembly model.
- Realistic measured mass/inertia/contact/motor-load model or external cable drag.
- Reinforcement learning, saved learned policies, or a training backend.

The `/` dashboard, `/3d` viewer, path following and gamepad runtime remain planar
Gen 2.1 tools. Do not send their planar gait to this Gen 3 robot. The current Gen 3
box-link simulator uses placeholder length 0.1 m, mass 0.25 kg per link and an
illustrative 2 Nm torque setting in the pitch launcher/web job; none is a measured
continuous motor rating. A GUI/3D movement rendering is not proof of realistic
locomotion. The owner intends to supply assembly CAD, exact parts, wiring and
measurements for the laptop-based simulator and its controls. Automatic learning
versus manual gait tuning was not finally selected.

## Verification and repository state

- Gen 3 suite last reported 41 passing tests, covering centering/alignment,
  pitch-only preview, calibration rejection, cancellation and combined faults.
- Five native firmware harnesses passed; receiver/transmitter builds succeeded.
  These are doubles/builds, not proof of RF/electrical behaviour on the robot.
- Gen 2.1 regressions passed, including new fragmented-line and short-write cases;
  21 Gen 2 offline tests passed. Details: `docs/GEN3_LINK_REVIEW.md`.
- Owner executed uploads and physical trials. The assistant's own tests did not
  open hardware or move motors.
- At handoff the branch is `codex/gen3-dashboard`; last committed HEAD was
  `077dedb` (already on origin earlier). Subsequent centering, mapping, pitch
  launcher and communication changes are still in the working tree. Check git
  status before commit/push; this note does not claim they are already on GitHub.
- Generated graphify files also have local changes. Do not mix them into a code
  commit by default or delete another session's outputs. Historical snapshots and
  logs are not active control code and should not be rewritten to match new zeros.

## Next work

1. Continue from successful 10° pitch motion, rather than repeating all centering.
   Establish measured body travel over fixed-duration trials on one surface, with
   the external wire kept equally slack. Log displacement separately from bending.
2. Tune one parameter at a time within the existing speed/position checks. Add yaw
   coordination only in a small supported trial; do not promise that pitch alone,
   arbitrary larger angles or faster waves will propel the body.
3. Obtain current assembly geometry and masses before claiming realistic simulation.
   Build the Gen 3 browser viewer from Gen 3 states, not the planar viewer output.
4. If faults recur, preserve the exact new ID/operation/result/status and CSV. Distinguish
   radio loss from servo write/read-back failure; measure supply voltage under load.
   Do not hide faults with blind retries or arbitrary longer deadlines.
5. Remaining limits: protocol has no request sequence IDs/timestamps, receiver lacks
   battery/thermal cutoffs, cable drag and load are unmeasured, and long-run thermal/
   locomotion reliability is not established. Confirm physical power off when the
   servo bus cannot verify torque release.

## October 2026 Unified Dashboard & Consolidated Architecture Addendum

### Consolidated Architecture
The web dashboard previously referenced at `shared/web-dashboard/web_app.py` has been consolidated to:
`gen3-experimental-3d/backend/web_dashboard/web_app.py`

### Operating Command
From the repository root (`C:\1. SurGe 090 Smart snake robot`):

```powershell
conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```

- Accessible routes: `/` (Gen 2.1 Planar Cockpit), `/gen3` (Gen 3 3D Spatial Commissioning), `/3d` (3D Visualizer).
- Unified Slush/Playdate visual language is established across both `/` and `/gen3`, featuring shared distorted-glass header, interactive generation switcher with hover cards, task tabs, and persistent floating emergency Stop dock.
- Verified test suite: 30/30 Node component suites (`node --test gen3-experimental-3d/tests/*.cjs`) and 39 Python unit tests (`python -m unittest gen3-experimental-3d/tests/test_console.py gen3-experimental-3d/tests/test_console_hardening.py`) pass. Headless Chrome viewport audits verify 0 console errors and 0px horizontal overflow from 320px mobile to 1440px desktop.


## Gen 2.1 ordered-path report limitations (29 October 2026)

Progress counts the cumulative distance between verified ordered checkpoints; checkpoints
are placed every 0.2 m of path arc length and require a sample within 0.1 m.
Accepted checkpoints require 0.05 m movement, or half the interval for a shorter final segment. Pose jumps above 0.25 m per observation are rejected.
A path pauses as stalled after 30 seconds of active simulation without advancing a
checkpoint. This is a conservative timeout, not proof the path is unreachable; slow
gaits or paths the controller cannot track can stall. Resuming restarts the timer.

The interim simulation report requires 20% verified arc length and at least two
accepted trace samples. Each sampled pose is compared with its current ordered
checkpoint interval of the original polyline, not the nearest segment anywhere on a crossing path. It reports
the retained sample count and verified progress. The visualization score is
max(0, 100 × (1 − average deviation / 0.5 m)); it is not physical accuracy.
Trace samples and deviation samples are each capped at 10,000; rejected jumps and
manual-control samples are omitted from the metric. Path replacement clears the report.
A 1 m headless line reproduced endpoint circling with only 20% verified progress;
it now stalls rather than claiming completion. A 0.5 m line completed in the same
headless setup. Neither trial validates physical behavior or every curve.

Follow-up headless trials: a 1 m sine-shaped curve completed in 9.68 simulated
seconds after spacing checkpoints by arc length instead of input waypoint density.
A closed circle stalled at approximately 8% and a figure-eight crossing at 16%;
the controller did not establish ordered completion for either. These outcomes
do not validate the controller on those shapes. The report and persistent Stop were
checked with mocked simulation data at 320, 768, 1024 and 1440 px; moving Close
to the top of the report resolved an overlap with Stop at 320 px.

## Gen 3 simulation connection and tracking settings (29 October 2026)

The web console has a separate operator-controlled headless simulation connection.
It reports connecting, connected, running, disconnecting, disconnected and error
states; it never opens a physical interface. Stop remains public. Disconnect during
a simulation run requests cancellation and releases the simulation after cleanup.
A map revision change requires disconnecting and reconnecting the simulation.

Simulation tracking error (1–796 counts) and timeout (0.1–2 seconds) initially
come from the current map but must be explicitly verified for each edited set of
values. They are passed only with simulation jobs, validated on the server, and
recorded in the run manifest as effective simulation tracking settings. They do not
write the physical map. Physical calibration verification, limits and map revision
checks remain in place. The simulator remains illustrative, not a calibrated twin.

# Gen 3 working handoff

3 November 2026 bench launcher consolidation: Gen 2.1 tools now use
`generations/gen2-st3215/tools/bench_gen2_1.py {align,sine,spiral}` with the
existing --port/--duration options. The three older launcher files were removed;
operating commands and Gen 2 README were updated. Shared bench waveforms,
measured alignment and disconnect cleanup are preserved. Gen 2.1 offline suite:
47 tests, four skipped; CLI help verified without connecting hardware. Calibration
and firmware unchanged by this consolidation.

3 November 2026 firmware OTA: maintained receiver/transmitter and their sketch
aliases now support password-protected ArduinoOTA via a USB-only `OTA` command.
The receiver requires disarmed state and confirmed torque-off; OTA blocks control
and clears queued commands until reboot, including after an upload error. Normal
operation has no OTA access point. Private generated passwords are in gitignored
`generations/gen2-st3215/firmware/common/ota_config.h`; no credentials printed.
First installation requires USB. See `docs/operations/FIRMWARE_OTA.md` for setup,
wireless application uploads and limitations. No flashing, serial connection or
motion performed. Saved calibration/settings remain unchanged. Build/test
verification is recorded under `.scratch/firmware-ota/`.
All four maintained/alias firmware builds passed, along with four native C++
harnesses and 56 Python checks (four additional checks skipped). Physical OTA
transfer/reboot remains unverified. Alias PlatformIO source filters now select
the maintained CPP implementations because the nested INO wrappers were not built.

3 November 2026 simulation/hardware separation: both maintained dashboards now
have independent Simulation and Hardware workspaces and scoped controller panels
with one enabled controller per page. Gen 3 Simulation owns its finite PyBullet
start payload, sliders, tracking copy, route and 3D view. Controller route mode
uses its explicit route or the workspace route, without a second route follower.
Hardware uses hardware or an initially checked Dry run (preview) toggle; no
Execution Mode dropdown remains. Both retain stop-on-blur and all existing
hold-to-run/session protections. Copy waveform values explicitly; speed, ramp
and duration stay in Hardware. Presets/run gait drafts have two destination
buttons; run history has an execution filter. Calibration, firmware and per-joint
tools stay hardware-only. Gen 2.1 connects SIM or ST3215 explicitly and refuses
mismatched engine starts; stop/disconnect before switching workspaces. Disconnected
or other-workspace feedback is not shown as current hardware measurements.

Measured map unchanged (speed 1500, tracking error 216, timeout 0.5, saved signs).
No physical connection, motion or upload. Verification includes actual PyBullet
motion from the browser gamepad shim, Hardware preview and intercepted Gen 2.1
ST3215 connection; evidence in docs/gen3/workspace-separation/. See
[operation guide](operations/CONTROLLER_UPGRADES.md) and
[ADR](adr/0002-simulation-hardware-workspaces.md). Work remains uncommitted.

3 November 2026 controller upgrades: the maintained Gen 2.1 and Gen 3 dashboards
now share browser mapping/centring/dead-zone controls and a backend hold-to-run
controller. LB + A starts; RT scales gait rate, stick steers, X reverses through
zero, Y smoothly blends shape/lag, D-pad adjusts bounded amplitude. Gen 3 head
inspection is separate, with IDs 1/2 bounded to 10 degrees and other joints neutral.
Controller input expires after 0.5s independently of status polling; focus/tab/
disconnect/lease loss, disabling or changing setup stops the owned job. Gen 3 uses
the selected execution mode and finite runner, retains hardware confirmation,
validation, speed limiting and torque-off cleanup; its mathematical controller
preview now runs in real time. Live Apply and joint overrides are excluded while
controller mode owns the job. Python helper uses the same input contract.

Position tracking feedback reduces gait rate, with slow recovery; existing Gen 3
hard tracking faults remain. Gen 2.1 manual operation now checks all ten measured
positions before RUN and stops on missing or sustained tracking feedback faults.
Heading/ordered-route assistance uses simulator pose or explicitly verified fresh
external head localization through authenticated `/api/localization`; no sensor
position is fabricated. The external feed and steering/frame calibration still
need physical installation and verification. See `docs/operations/CONTROLLER_UPGRADES.md`.
Saved map/signs remain speed 1500, tracking error 216, timeout 0.5; no firmware,
credentials, existing logs or calibration were changed. No hardware connection,
motion or upload was performed. Work is uncommitted on `codex/controller-upgrades`.
Verification and known test-environment limits: `.scratch/controller-upgrades/`.
This entry supersedes the earlier preview-only browser mapping below.

3 November 2026 browser controller: Gen 3 Controls now has an explicit Enable
Controller button using the existing operator session. A starts a finite
mathematical preview, B stops the current job, Y cycles three presets and left
stick bias is sampled at Start. Starts always use preview, never hardware or
PyBullet. Standard mappings only; focus loss, tab change, disconnection and lease
loss disable input. Disabling input leaves a finite preview running; page Stop
remains available. Ramps 4/8/4 seconds keep the presets within 100 counts/s,
including ±5° bias. The Python helper remains optional. Calibration is unchanged.

2 November 2026 repository reorganization: all three robot directories now live
under `generations/`; the measured map is
`generations/gen3-experimental-3d/joint_map.json`. Start the dashboard from the
repository root with
`conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py`.
See `docs/REPOSITORY_LAYOUT.md` and `docs/reorganization/moves.csv` for review.
Documentation is grouped by purpose; generated graph output is preserved under
`artifacts/graphify-out/` as a historical snapshot. Calibration, credentials,
firmware sources, CAD and run records were preserved. Shared tests, Gen 2 offline
tests, all 38 current Node suites and both maintained firmware builds passed.
The Gen 3 Python run passed 127 tests with the existing missing-Playwright browser
module import error. Browser checks confirmed both dashboards, generation
navigation, mathematical preview, search and viewer restrictions. No hardware
motion or upload was performed; no commit was made. Existing external launch
commands and running servers need their new paths.

2 November 2026 frontend asset consolidation: dashboard static files now contain
7 JavaScript files and 5 stylesheets (30 fewer than the pre-merge working tree).
Shared components live in `common.js` / `components.css`; planar math and control
live in `gen21.js`; console search is included in `gen3.js`. Navigation bootstrap,
Gen 3 simulation, vendor libraries, font CSS and the optional fractal theme retain
their separate loading requirements. See `backend/web_dashboard/static/README.md`
under `generations/gen3-experimental-3d`. Templates and component tests use the merged layout;
39 Node suites passed, 127 Python tests passed with one pre-existing Playwright
module import error in the surge environment. Browser checks covered both pages,
generation navigation, path preview and Gen 3 tabs at desktop/phone sizes. No
hardware action, firmware change or calibration edit was performed.

2 November 2026 CAD simulation: the supplied prototype SLDASM was opened read-only
and successfully exported with SolidWorks 2026. Browser and default PyBullet
visuals now use its head/9 mid/tail, motors and nominal board, with CAD pivots
20.61 mm then 58.37 mm apart. See `docs/gen3/GEN3_SIMULATION.md` for regeneration,
verification and limits. Mass, inertia, compact box contact and friction remain
illustrative; fit and load validation are required. Joint map was preserved
(speed 1500, tracking error 216, timeout 0.5); no hardware used.

Battery indicator, 1 November 2026: both website headers now show BATTERY after
TEMP. `/api/system_stats` computes a reserve estimate from the average of valid
cached D-diagnostic servo voltages: clamp((V - 11.1) / 1.5 * 100, 0, 100).
Green >50%, yellow 21–50%, red <=20%; missing data is N/A, readings older than
30 seconds show Stale. Query Disarmed D Diagnostics refreshes it. No automatic
serial queries, battery trend, firmware changes or calibration edits were added.
Normal T feedback still has no voltage; this is a sampled recharge indicator,
not live state of charge. Existing stats polling is reused, with a 3-second
request timeout and no overlapping Gen 2.1 stats requests.
Verification: 48 Python tests passed, one PyBullet-dependent check skipped;
five Node suites and read-only Chrome checks passed. Both headers checked at
320–1440 px, including fresh colors, stale and offline states. No hardware used.

Owner update, 1 November 2026: **no fuses are installed**. The fuses in
`docs/hardware/wiring_split_bus_v3.svg` describe the design, not the current
hardware. Gen 3 software now accepts speed limits of 1–3000 counts/s across
map/gait validation, job start, live Apply and dashboard inputs. The saved
joint map speed remains 1500; calibration and tracking settings are unchanged.
3000 is an allowed command ceiling, not a measured loaded capability.

Later live fault diagnosis, 31 October 2026: larger 30-degree yaw / 25-degree
pitch, 0.5Hz, speed 1500 trial logged an ID1 WRITE failure at ~0.7s; next
attempt failed STOP verification. A fresh disarmed D query through COM7 found
IDs 7/8 not responding (reg8/torque/voltage/temp=-1), with other eight torque=0,
status=0, 11.6–11.7V and 31–32C. This supersedes the earlier all-ten-reply
observation for the current fault only. No cause established: inspect wiring
and power serving 7/8 with power disconnected; re-query all ten before motion.
No motion commanded, firmware changed or calibration altered in this diagnosis.
Details: `.scratch/esp-connection/issues/03-high-amplitude-servo-loss.md`.

Controls preset follow-up, 31 October 2026: Controls now has a separate
3D Gait Preset selector reusing all five simulation waveform definitions.
Selection loads yaw/pitch/frequency/bias/lag/offset into the existing draft;
speed, ramp, duration, execution mode and simulation physics remain unchanged.
Selection sends no motion request. Existing speed validation and Start
confirmation remain. Two targeted Node suites and syntax checks passed;
read-only Chrome checks confirmed draft loading, preserved speed, no writes or
uncaught errors, and no horizontal overflow at 1440/390 px. Screenshots under
`.scratch/control-spatial-presets/`. No hardware used.

## Plain-text radio protocol — 31 October 2026, later update

Upload follow-up: owner confirmed servo power disconnected, robot supported,
both USB cables connected. Hardware MACs reconfirmed COM6 receiver
`28:05:a5:4f:e5:ac`, COM7 transmitter `68:09:47:5c:10:ec`. Uploaded both
plain-text environments successfully with flash hashes verified. Ten HELLO
exchanges sent only to COM7 appeared on both USB ports, then another ten passed
after resetting only the transmitter via RTS. This verifies discovery across
a transmitter restart without authentication counters. No RUN or position
commands sent, no servo operation verified with power disconnected. Serial
handles closed after the test; dashboard should use COM7.

Owner explicitly requested plain-text protocol for all wireless commands after
repeated handshake failures. Compared partner `Snake_SURGE` main commit
`7d80490344b03c3298418b8cce878349a96ad4d6`, specifically
`src/esp_now_transmitter/esp_now_transmitter.ino` and
`src/esp32_st3215/esp32_st3215.ino`. Adapted its plain-text transport into our
maintained Gen 2.1 pair; did not replace the dashboard command handlers with
the partner's older handlers.

`transmitter_gen2_1` now forwards bounded plain-text commands unchanged.
`receiver_gen2_1` accepts its known commands without HMAC, sequence checks or a
sender MAC allowlist. The volatile counter reconnect limitation described below
does not apply once BOTH boards have this new pair. HELLO still responds
`SURGE,2.1`; watchdog Stop, torque-off read-back, joint limits, queue overflow
Stop, packet bounds/printable validation and EEPROM maintenance lock remain.
This intentionally permits commands from any nearby ESP-NOW sender; use only
in the owner's controlled environment. Transmitter reply filtering still uses
the configured receiver destination MAC.

Both PlatformIO builds passed; receiver and transmitter C++ test harnesses
compiled with the ESP32 compiler, but were not executed (no host compiler).
No upload or hardware motion was performed in this update. Only COM7 was
enumerated; reconnect and identify the receiver USB, disconnect servo power and
support the robot before uploading BOTH firmware environments. A mixed old/new
pair will not work for all commands. Torque-off-unconfirmed remains a separate
servo power/bus verification fault and is deliberately not bypassed. Calibration
map unchanged.

## Live ESP connection repair — 31 October 2026

With both boards attached, hardware MAC reads identified **COM6 as the robot
receiver** (`28:05:a5:4f:e5:ac`) and **COM7 as the PC transmitter**
(`68:09:47:5c:10:ec`). Use COM7 for the wireless host connection in this setup;
the older single-board COM6 examples below do not identify today's transmitter.

The owner confirmed servo power disconnected and the robot supported before
uploads. Uploaded the existing receiver MAC allowlist correction to COM6 and
the matching transmitter to COM7. Authentication still failed because
`surge_sign_text_command` returned bool while its caller used the result as the
radio packet length: only one byte was sent. Changed it to return the complete
packet length (zero on failure), then rebuilt/uploaded the transmitter.
Twenty consecutive HELLO commands sent only to COM7 produced `SURGE,2.1` on both
receiver USB and transmitter USB, confirming bidirectional ESP-NOW exchanges.
Both firmware builds and upload hashes passed. The new `test_text_auth.cpp`
regression check compiles for ESP32; native execution was unavailable because
no host C++ compiler was installed. No RUN/position commands were sent and the
joint map was unchanged. Servo diagnostics before power disconnection showed
no responding servos; this connection repair does not certify servo operation.

The existing volatile monotonic text authentication counter has no reboot/session
negotiation. Resetting only the transmitter may leave its counter behind the
receiver; restart both boards together if reconnect handshakes fail after a reset.
This limitation was not changed or endurance-tested during the connection repair.

31 October 2026 simulation continuation: see `docs/gen3/GEN3_SIMULATION.md` for the implemented
ID 1 head frame, simulation-only ordered route steering, target/trail overlays, camera modes,
fullscreen Stop and locally derived CAD appearance. This supersedes the older absence-of-viewer
notes below. The current joint map remains unchanged (speed 1500, tracking error 100, timeout 0.5).
Box physics, assembly spacing and contact remain illustrative. Companion connector STEP revision
is unverified against the supplied SLDPRT. Straight/gentle-S headless trials passed; tighter curves
and other gaits can stall. No hardware was opened or actuated during this work.

Last updated: 28 October 2026, Asia/Calcutta. This is the continuation record for
the owner/assistant commissioning conversation, not a claim of autonomous locomotion.

Console follow-up, 28 October 2026: read `archive/GEN3_SYSTEM_REVIEW.md`, `GEN3_PROGRESS.md`, and
`docs/archive/GEN2_1_WEBSITE_PROMPT_REFINED.md` for the completed local-only operator controls, independent
lease-loss Stop, bounded live Apply, Slush design system unification, Gen 2.1 central trajectory
dashboard restoration with math presets and simulation physics commit, interactive visual components
(`PixelSnakeHeading`, `CanvasFractalGrid`, `GridBeam`, `ShaderLensBlur`, `MorphingButton`, `DistortedGlass`),
and full test verification (79 Gen 3 tests, 31 Gen 2 tests, 12 Node test suites). Hardware calibration
and owner observations remain unchanged.

Simulation UX & Controls Update, 30 October 2026: read `archive/SURGE_090_SIMULATION_UX_FIX_PLAN.md` and
`GEN3_PROGRESS.md` (Section 8) for the completed simulation improvements: full path traversal without
premature stopping, nearest-point acquisition and cross-track PID steering, physics parameter descriptions
and compact Gen 3 grouped accordion, Clear Canvas result snapshot with 60s history, compact Runs gait
cards with live sim sync, separated Joint Map Calibration and Safety Limits cards, and zero numeric
telemetry overflow on all viewports. Hardware remained completely untouched.

Dashboard Layout, Path Continuity & Console Alignment, 31 October 2026: see Section below for the completed Gen 2.1 5-box layout restructuring strictly matching operator schematic (Math Path, Gamepad State/Node, center 520px Live Trajectory, full-height Simulation Physics, 2x5 Telemetry grid), continuous whole-path traversal in `path_engine.py` using segment projection (preventing undulation stalls at 20%), conditional manual stop accuracy report (>20% coverage threshold), compact serial port dropdown width (195px), and Gen 3 operator login styling alignment with Gen 2.1 paper aesthetic.

## Start here in a new chat

1. Read this file, `generations/gen3-experimental-3d/joint_map.json`, and the working tree status.
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
- Owner clarified on 31 October 2026: **eleven connectors**. The ID 10 end carries
  the Waveshare bus servo driver with ESP32. Keep that count distinct from ten motors.
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
`generations/gen3-experimental-3d`, omit that path prefix: `python test_3d_snake.py ...`.
Several early errors came from the wrong cwd or pasting two commands together.

- Windows PowerShell; base Python is Miniconda Python 3.14.8. CLI serial control
  works there after `python -m pip install -r generations/gen2-st3215/requirements.txt`.
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
python generations/gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode read
```

Small single-joint jog, returns to its measured starting position:

```powershell
python generations/gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode jog --id 1 --ticks 20 --duration 4
```

Command every motor to 2048, with slow alignment and torque release:

```powershell
python generations/gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode align --duration 2
```

Single free-shaft centering (power off to detach/refit; never claim an attached
joint is free). Only needed after mechanical remounting, not before every run:

```powershell
python generations/gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --mode center --id 1 --free-shaft --duration 2
```

The owner reports these pitch-only trials worked:

```powershell
python generations/gen3-experimental-3d/run_pitch_gait.py --hardware --port COM6 --pitch 2 --frequency 0.1 --duration 10
python generations/gen3-experimental-3d/run_pitch_gait.py --hardware --port COM6 --pitch 5 --frequency 0.1 --duration 10
python generations/gen3-experimental-3d/run_pitch_gait.py --hardware --port COM6 --pitch 5 --frequency 0.1 --duration 30
python generations/gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --yaw 0 --pitch 10 --frequency 0.1 --ramp 8 --duration 30
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
python generations/gen3-experimental-3d/run_pitch_gait.py
```

Logs and parameter snapshots are under `generations/gen3-experimental-3d/runs/`; preview rows
contain no measured positions. Earlier logs documenting faults remain historical
evidence, not an indication that every latest trial failed.

## Website and simulation: implemented versus requested

Launch the shared Flask server:

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
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
  21 Gen 2 offline tests passed. Details: `docs/archive/GEN3_LINK_REVIEW.md`.
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
The web dashboard previously referenced at `generations/gen3-experimental-3d/backend/web_dashboard/web_app.py` has been consolidated to:
`generations/gen3-experimental-3d/backend/web_dashboard/web_app.py`

### Operating Command
From the repository root (`C:\1. SurGe 090 Smart snake robot`):

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```

- Accessible routes: `/` (Gen 2.1 Planar Cockpit), `/gen3` (Gen 3 3D Spatial Commissioning), `/3d` (3D Visualizer).
- Unified Slush/Playdate visual language is established across both `/` and `/gen3`, featuring shared distorted-glass header, interactive generation switcher with hover cards, task tabs, and persistent floating emergency Stop dock.
- Verified test suite: 30/30 Node component suites (`node --test generations/gen3-experimental-3d/tests/*.cjs`) and 39 Python unit tests (`python -m unittest generations/gen3-experimental-3d/tests/test_console.py generations/gen3-experimental-3d/tests/test_console_hardening.py`) pass. Headless Chrome viewport audits verify 0 console errors and 0px horizontal overflow from 320px mobile to 1440px desktop.


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


## Security Architecture & Protocol V3 Update (30 October 2026)

Following an independent revalidation audit of CodeRabbit findings CR-01 through CR-10:
1. **Radio Cryptographic MAC:** Replaced keyed FNV-1a with RFC 2104 HMAC-SHA256 across all ESP-NOW control and telemetry channels (`surge_auth.h` and `surge_protocol.h`).
2. **Key Provisioning:** Private credentials are excluded from version control via `.gitignore` and provisioned locally in `generations/gen2-st3215/firmware/common/surge_credentials.h` (template in `surge_credentials.h.example`).
3. **Privileged Command Gate:** Radio commands to `receiver_gen2_1` require signed text format `AUTH,<seq>,<tag_hex_16>,<cmd>` and advancing sequence numbers. EEPROM servo ID writes (`I,<id>`) are gated behind `MAINT,UNLOCK,CONFIRM` with a 15-second expiration and single-use auto-relock.
4. **Emergency Stop:** Immediate unauthenticated `STOP` execution is preserved fail-safe without cryptographic prerequisites.
5. **Backend Proxy Hardening:** `web_app.py` enforces a `TRUSTED_PROXIES` allowlist (default `127.0.0.1,::1`), preventing remote clients on plaintext HTTP from spoofing HTTPS via `X-Forwarded-Proto`.
6. **Report Caching:** Dynamic cache key `(revision, actual_len, target_len, progress, error_count)` eliminates stale simulation report anomalies.
7. **Audit Record:** Full details, tests, and hardware validation checklist are documented in `docs/archive/audits/SURGE_090_SECURITY_REVALIDATION.md` and `docs/archive/audits/SURGE_090_CODERABBIT_REMEDIATION_REPORT.md`.

## 3D Robotic-Snake Generation Transition Update (30 October 2026)

The cross-dashboard navigation between Gen 2.1 (`/`) and Gen 3 (`/gen3`) features a bespoke 3D robotic-snake loading transition:
1. **Design & Behavior:**
   - 3.0s paced sequence: outgoing dashboard fade (0–0.4s), distant snake emergence (0.4–1.1s), camera approach with natural serpentine wave (1.1–2.4s), UI readiness gate hold at 2.4s, and destination reveal wipe (2.4–3.0s).
   - Three.js 3D model with 11 links and 10 joints: Gen 3 transitions use spatial alternating pitch/yaw articulation (mint/blue links); Gen 2.1 transitions use planar yaw articulation.
   - Ground shadow grid, soft lighting, and Playdate/Slush palette matching the rest of the interface.
2. **Readiness Gate & Error Fallback:**
   - The transition holds at 2.4s until the incoming dashboard signals `window.SurgeGenerationTransition.ready()`, avoiding white flashes or partially mounted controls.
   - Automatically degrades to a static SVG serpentine track if WebGL is unavailable or when `prefers-reduced-motion` is active.
   - 10-second timeout on stalled initialization presents a recovery overlay with Retry / Go Back options and releases GPU memory.
   - Embedded 3D viewer (`3d_viewer.html`) hardened with `try...catch` against WebGL absence, ensuring zero uncaught page errors.
3. **Verification:**
   - Verified across desktop (1440px), mobile (390px), keyboard tab/enter activation, history back/forward traversal, and rapid-click debouncing via `generations/gen3-experimental-3d/tests/test_generation_transition_browser.py` (16/16 checks passing). Recorded in `.scratch/generation-switch/verification.md`.


## Gen 2.1 Dashboard Restructuring, Continuous Simulation & Console Alignment (31 October 2026)

This update records the visual and algorithmic improvements completed on 31 October 2026:

1. **Continuous Whole-Path Simulation Traversal (`path_engine.py`)**:
   - Resolved the issue where the planar snake simulation ceased progress after approximately 20% of the trajectory.
   - Enhanced waypoint advancement criteria: in addition to strict 0.10 m point proximity, the engine evaluates segment projection progress (t >= 0.85 with cross-track error <= 0.25 m). This allows continuous serpentine undulation along the path axis without getting trapped when the snake's head oscillates around a checkpoint.
   - Preserves ordered checkpoint visitation and endpoint arrival detection.

2. **Conditional Manual Stop Accuracy Report**:
   - Updated `/api/stop` in `web_app.py` and `script.js` to inspect cumulative path progress upon operator stop.
   - If manual stop occurs after >20% path coverage, the simulation accuracy run report modal is presented with metrics and deviation visualization.
   - If manual stop occurs before 20% coverage, the simulation stops cleanly and silently without popping the report modal.
   - If the robot completes the full path, the accuracy report is presented automatically upon arrival.

3. **Gen 2.1 Layout Restructuring Matching Operator Schematic**:
   - Restructured the dashboard into a strict 5-box grid:
     - **Top-Left**: Mathematical Path Card (`#math-path-card`) with formula presets and generators.
     - **Bottom-Left**: Gamepad State Card (`#gamepad-card`) with live stick/trigger/button feeds and `controller_node.py --gen 2.1` launch instructions.
     - **Center**: Live Trajectory Tracking (`#canvas-hub`) kept at unscaled native 520px height.
     - **Right**: Full-height Simulation Physics Card (`#sim-controls-card`) with 6 sliders, low-power mode, Apply and Set-to-Default buttons.
     - **Bottom**: 10-Joint Actuator Telemetry (`#telemetry-hub`) with a 2x5 grid spanning columns 1 & 2 directly underneath the left and center columns.
   - Removed intermediate visual boxes ("Connection Engine" and "Sensor Node") between the hero section and team footer, while preserving hidden inputs and telemetry elements.

4. **Header and Console UI Refinements**:
   - Shortened `#serial-port` selection dropdown to a snug 195px width so it cleanly fits "Select serial port" without horizontal stretching.
   - Hidden redundant bottom floating motion dock bar (`OPERATOR COMMAND: START MOTION IDLE`) via `.motion-dock { display: none !important; }`, preserving primary controls on the tracking toolbar and gamepad controller.
   - In Gen 3 (`/gen3`), resolved CSS inheritance conflicts where global `.gen3 select` and `.gen3 button` bloated the operator dropdown and morphing password button. Realigned `.operator-select` to 32px pill height, restored `#18181b` text contrast, scoped dark theme media queries to explicit theme activation, and positioned `Connect simulation engine` to the right of `Serial port`.

5. **Verification**:
   - 33/33 Node tests passing (`generations/gen3-experimental-3d/tests/*.cjs`).
   - 44/44 Python Gen 2.1 unit tests passing (`tests/test_gen2_1.py`).
   - 103/103 Python Gen 3 unit tests passing (`generations/gen3-experimental-3d/tests`).

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

**Verification (1–2 Nov).**
- Gen 3 Python: 105 tests passed (web, console, hardening, gait, battery), plus 98 targeted
  assembly-simulation tests. All 38 Node suites passed. Offline Chrome checks at 320–1440 px passed.
- New tests: `test_assembly_simulation.py`, `test_battery*.py/.cjs`, `test_bus_metrics.cjs`,
  `test_control_spatial_presets.cjs`, `test_port_detection.py`, `test_pose_presets.cjs`.
- Not verified: clicking Move to Pose in a browser (needs an operator login), and any hardware run of the new features.

**Open items.**
1. Logged all-ten diagnostics query, then repeat the speed-1500 trial with minimum voltage logged.
2. Small pose (≈10°) in simulation, then on the robot. Confirm pitch "up" matches, then run the 10° caterpillar.
3. Measure real masses, friction and fit; re-tune shape presets on the CAD spacing.
4. Telemetry part 2: voltage/temperature/status during motion (needs a receiver firmware change).
5. Install fuses before speed trials 1500 → 1800 → 2200 → 2600.
6. Closed loop, sensors, SLAM. Commit the working tree.

**Correction.** Older sections in this file mention speed 500 and tracking error 25 or 100.
The authoritative values are in `joint_map.json`: speed 1500, tracking error 216, timeout 0.5.

## Operator console design-review fixes (2 November 2026)

- Simulation: the dashboard must run on the conda `surge` interpreter (PyBullet). `.claude/launch.json`
  now points `dashboard` at it; `/api/gen3/status` exposes `simulation_available`, and a missing
  PyBullet shows a restart instruction instead of `No module named 'pybullet'`.
- Generation links: native `@view-transition` removed (it aborted against the snake overlay); a stale
  overlay no longer swallows clicks, and the source page never calls `window.stop()`.
- Both pages use a compact hero (`hero-compact`, `static/operator-console.css`): live status, mode
  and feedback age first; Gen 3 adds the start path Sign in → Mode → Engine → Limits → Start, with
  only the chosen mode's engine shown. Mobile tabs scroll horizontally; host stats are muted, an
  unsampled temperature is hidden, the ticker starts paused, and UI text is at least 12 px.
- Not reproduced: `MutationObserver.observe: parameter 1 is not of type Node` (the only observer in
  the dashboard is already null-guarded).

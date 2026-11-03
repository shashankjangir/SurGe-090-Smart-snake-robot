# Gen 2 — ST3215 snake robot

Gen 2 is our working planar robot: eleven body segments, ten yaw joints and
ST3215 serial bus servos. We moved to this platform after the Dynamixel motors
for the first prototype became difficult to source.

**Gen 2.0** covers the mechanics, power system, bench controller and onboard
ESP32 gait. **Gen 2.1** adds the shared host software and its receiver/transmitter
firmware. Both are working; the next mechanical experiments are in
[Gen 3.0](../gen3-experimental-3d/README.md).

![Gen 2 prototype](media/20260925_164442.jpg)

[Prototype gallery](media/README.md) · [Project history](../../README.md) ·
[Operating guide](../../docs/operations/1_APP_USAGE_MANUAL.md)

## Mechanics and power

The chain generates a travelling wave through ten yaw joints. Body contact is
part of the mechanism: the belly geometry is intended to resist lateral slip
while allowing motion along the body. The [v6 segment notes](cad/segments/v6/README.md)
describe the yokes, motor mounting, ground-contact features and remaining fit checks.

The servos share a 1 Mbps TTL data bus. The electrical design uses a 3S LiPo and
[split power bus v3](../../docs/hardware/power_split_bus_v3.md), with five fused pairs
of servos and a separate buck supply to the driver. The driver connects DATA and
GND to the servo bus; its servo-port positive supply is isolated. See the
[wiring guide](../../docs/hardware/4_WIRING_DIAGRAM.md) before assembling the power path.

## Choosing a control setup

| Setup | Host / firmware | Use |
|---|---|---|
| Gen 2.0 bench | `main.py` + `usb_servo_bridge` | Direct bus control from a PC or Pi |
| Gen 2.0 onboard | `robot_esp32_v2` + `base_esp32` | Gait on the robot; telemetry at the base station |
| Gen 2.1 host | Shared apps + `receiver_gen2_1` | Dashboard, desktop or gamepad control |
| Gen 2.1 wireless | Add `transmitter_gen2_1` | Relay the host connection over ESP-NOW |

These setups use different protocols. The transparent bridge for `main.py` is
not the text-command receiver used by the Gen 2.1 apps. The
[firmware guide](firmware/README.md) lists the build targets and their roles.

### Gen 2.1 apps

Install the shared requirements using Python 3.11, then launch from the repository root:

```powershell
.venv/Scripts/python.exe -m pip install -r generations/gen3-experimental-3d/backend/web_dashboard/requirements.txt
.venv/Scripts/python.exe generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

At `http://127.0.0.1:5000`, choose Simulation or Hardware. Hardware needs an explicit
serial port. Connect first, then start motion; STOP requests torque-off.
The desktop and gamepad workflows are in the [operating guide](../../docs/operations/1_APP_USAGE_MANUAL.md).

The receiver starts with torque off, accepts a version handshake and `RUN`, then
applies joint targets with their requested speeds. A 750 ms target timeout stops
motion. It does not include the onboard Gen 2.0 battery/temperature cutoffs or
current-based evasion sequence.

The bench launcher is `tools/bench_gen2_1.py`, with a required `align`, `sine` or
`spiral` mode (for example, `python tools/bench_gen2_1.py align --port COM7`).
The terminal tester now uses the Gen 2.1 handshake,
arms each requested move for two seconds, then releases torque:
`python tools/test_st3215_terminal.py --port COM3`.

### Gen 2.0 bench and onboard control

For the raw-bus bench setup, work from this folder:

```powershell
python -m pip install -r requirements.txt
$env:SURGE_PORT = "COM3"
python main.py
```

This requires `usb_servo_bridge` firmware. For a run without hardware, set
`SURGE_MOCK=1`. IDs must be unique before the servos are connected as a chain;
`tools/assign_id.py` operates with one servo connected at a time.

The bench loop also accepts `--port`, `--mock`, and `--duration` (seconds;
zero means until Ctrl+C). For an offline smoke test, run
`python main.py --mock --duration 1`. Missing current feedback stops the loop.
Targets are limited to 1252..2844 ticks (approximately ±70°), and startup
requires measured joint positions inside those limits. Cleanup attempts
torque-off on every joint even if another joint fails to acknowledge.

The `set_torque_mode()` and `write_target_torques()` experiment APIs remain
available in mock mode. Real ST3215 hardware rejects them explicitly because
this controller implements position control, not torque control.

For onboard control, use `robot_esp32_v2` on the robot and `base_esp32` on the
base station. `base_station.py` reads the base station's serial telemetry.
The onboard controller includes a stall-current response: reverse, turn, then
resume undulation. Its current threshold needs calibration, and current sign
alone does not identify which side of the body met an obstacle.

## Software and design files

| Location | Purpose |
|---|---|
| `src/servo_driver.py`, `src/feetech_protocol.py` | Gen 2.0 raw servo-bus driver |
| `src/snake_locomotion.py`, `src/robot_config.py` | Bench gait and settings |
| `src/st3215_interface.py` | Compatibility import for the shared Gen 2.1 transport |
| [Shared controller](../gen3-experimental-3d/backend/surge_control) | Gen 2.1 gait, runtime, serial and simulation interfaces |
| [Firmware](firmware/README.md) | ESP32 programs for each control arrangement |
| [CAD](cad) | Assembly, motor references and segment revisions |
| [Media](media/README.md) | Physical prototype photos |

Waypoint tracking and trajectory reports currently run in simulation. The
physical robot has no integrated localization for those features. The separate
sensor node supplies readings, but does not by itself close that control loop.

Earlier porting notes remain in [PORTING_STATUS.md](PORTING_STATUS.md); current
entry points are listed in the [version map](../../docs/versions/VERSIONS.md).

## Checking changes

Run `python -m unittest discover -s generations/gen2-st3215/tests -v` from the repository
root. [Test instructions](tests/README.md) also cover the native firmware
checks and the ESP32 builds. CAD is outside this software cleanup.

## October 2026 Unified Cockpit & Consolidated Architecture Addendum

The web dashboard serving Gen 2.1 planar control has been consolidated under `generations/gen3-experimental-3d/backend/web_dashboard/web_app.py`.

### How to Run

From the repository root:

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```

Open `http://127.0.0.1:5001/` for the Gen 2.1 Planar Cockpit, featuring centralized trajectory canvas tracking, 8 mathematical waveform presets, simulation physics configuration, and serial port scanning.


---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**Gen 2.1 radio firmware (31 Oct).**
- Fixed `surge_sign_text_command`: it returned `bool` but its caller used the value as the packet
  length, so only one byte was sent. It now returns the full length.
- At the owner's request, all wireless commands now use **plain text**. Transport was adapted from partner
  repo `Snake_SURGE` commit `7d80490`. The receiver accepts known commands without HMAC, sequence or MAC
  allowlist; use only in a controlled environment.
- Kept: watchdog Stop, torque-off read-back, joint limits, queue-overflow Stop, packet bounds/printable
  checks and EEPROM maintenance lock.
- Both boards were uploaded with servo power disconnected. **COM6 = receiver** (`28:05:a5:4f:e5:ac`),
  **COM7 = PC transmitter** (`68:09:47:5c:10:ec`). HELLO → `SURGE,2.1` exchanges passed, including after
  a transmitter-only reset. Use COM7 for the dashboard.
- `platformio.ini` transmitter monitor: `send_on_enter`, LF line endings.
- New `tests/test_text_auth.cpp` compiles for ESP32. It was not run on the host because no host compiler is installed.

**Gen 2.1 dashboard (to 31 Oct).** Five-box layout (Math Path, Gamepad State/Node, Live Trajectory,
Simulation Physics, 2×5 Telemetry). `path_engine.py` traverses the whole path by segment projection
(no stall at 20%). Manual Stop accuracy report appears only above 20% coverage. All in commit `fc24e4e`.

**Hardware status (as of 2 Nov).**
- **No fuses are installed** (owner, 1 Nov). Fuses in the split-bus v3 drawing are design intent only.
- Power: external 3S 1800 mAh LiPo on long wires; the central battery section is removed.
- 31 Oct trial: 30° yaw / 25° pitch, 0.5 Hz, speed 1500. ID 1 had a WRITE failure and IDs 7/8 stopped
  replying. Owner then reported a wiring fault and fixed it.
  Still pending: a logged all-ten diagnostics query, and a repeat of the trial with minimum voltage recorded.
- Both dashboard headers show a BATTERY estimate from cached diagnostic voltages
  (`clamp((V − 11.1) / 1.5 × 100)`). It is a sampled recharge hint, not live state of charge.

# Gen 2 — ST3215 snake robot

Gen 2 is our working planar robot: eleven body segments, ten yaw joints and
ST3215 serial bus servos. We moved to this platform after the Dynamixel motors
for the first prototype became difficult to source.

**Gen 2.0** covers the mechanics, power system, bench controller and onboard
ESP32 gait. **Gen 2.1** adds the shared host software and its receiver/transmitter
firmware. Both are working; the next mechanical experiments are in
[Gen 3.0](../gen3-experimental-3d/README.md).

![Gen 2 prototype](media/20260925_164442.jpg)

[Prototype gallery](media/README.md) · [Project history](../README.md) ·
[Operating guide](../docs/1_APP_USAGE_MANUAL.md)

## Mechanics and power

The chain generates a travelling wave through ten yaw joints. Body contact is
part of the mechanism: the belly geometry is intended to resist lateral slip
while allowing motion along the body. The [v6 segment notes](cad/segments/v6/README.md)
describe the yokes, motor mounting, ground-contact features and remaining fit checks.

The servos share a 1 Mbps TTL data bus. The electrical design uses a 3S LiPo and
[split power bus v3](../docs/hardware/power_split_bus_v3.md), with five fused pairs
of servos and a separate buck supply to the driver. The driver connects DATA and
GND to the servo bus; its servo-port positive supply is isolated. See the
[wiring guide](../docs/4_WIRING_DIAGRAM.md) before assembling the power path.

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
.venv/Scripts/python.exe -m pip install -r shared/requirements.txt
.venv/Scripts/python.exe shared/web-dashboard/web_app.py
```

At `http://127.0.0.1:5000`, choose Simulation or Hardware. Hardware needs an explicit
serial port. Connect first, then start motion; STOP requests torque-off.
The desktop and gamepad workflows are in the [operating guide](../docs/1_APP_USAGE_MANUAL.md).

The receiver starts with torque off, accepts a version handshake and `RUN`, then
applies joint targets with their requested speeds. A 750 ms target timeout stops
motion. It does not include the onboard Gen 2.0 battery/temperature cutoffs or
current-based evasion sequence.

The versioned bench tools are `tools/align_gen2_1.py`, `tools/sine_gen2_1.py` and
`tools/spiral_gen2_1.py`. The older terminal tester is retained for reference but
has not been updated for the Gen 2.1 start handshake.

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
| [Shared controller](../shared/surge_control/) | Gen 2.1 gait, runtime, serial and simulation interfaces |
| [Firmware](firmware/README.md) | ESP32 programs for each control arrangement |
| [CAD](cad/) | Assembly, motor references and segment revisions |
| [Media](media/README.md) | Physical prototype photos |

Waypoint tracking and trajectory reports currently run in simulation. The
physical robot has no integrated localization for those features. The separate
sensor node supplies readings, but does not by itself close that control loop.

Earlier porting notes remain in [PORTING_STATUS.md](PORTING_STATUS.md); current
entry points are listed in the [version map](../docs/versions/VERSIONS.md).

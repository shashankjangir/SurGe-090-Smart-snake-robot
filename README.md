# SURGE-090 · Smart Snake Robot

SURGE 2026, IIT Delhi · Supervisor: Prof. Amartansh Dubey
Repository integration revision: **Gen 2.1.0 — updated 16 October 2026**

This repository holds the robot's design history, firmware, control software,
CAD, simulations, and experimental motion work. Version labels describe project
stages. As of 16 October 2026, Gen 2.0 and Gen 2.1 are working in
project trials, as confirmed by the project maintainer. Gen 3.0 is in active
development. This status does not imply that every protection or performance
parameter has been measured.

![Gen 2 physical prototype](gen2-st3215/media/20260925_164442.jpg)

See the [Gen 2 photo gallery](gen2-st3215/media/README.md).

| Version | Name | Scope and location |
|---|---|---|
| **Gen 1** | **Dynamixel prototype** | Original XL330 work in [gen1-dynamixel](gen1-dynamixel/README.md). Preserved unchanged. |
| **Gen 2.0** | **Planar ST3215 design** | [gen2-st3215](gen2-st3215/README.md): Python bench control, autonomous ESP32 firmware, v6 CAD and split power bus v3. |
| **Gen 2.1** | **Integrated control software** | [Shared apps](docs/1_APP_USAGE_MANUAL.md): dashboard, desktop/headless CLI, gamepad, serial receiver/transmitter and separate sensor node. |
| **Gen 3.0** | **Experimental 3D motion** | [gen3-experimental-3d](gen3-experimental-3d/README.md): alternating yaw/pitch experiments and mechanical candidates. |

## What to run

Use **Python 3.11** for the integrated environment. From the repository root:

```sh
python -m venv .venv
# Windows PowerShell
.venv/Scripts/python.exe -m pip install -r shared/requirements.txt
.venv/Scripts/python.exe shared/web-dashboard/web_app.py
```

Open http://127.0.0.1:5000. Simulation is selected initially. **Connect**, then
**Start motion**; **STOP** pauses simulation or requests hardware torque-off.
Hardware requires an explicit serial port and `receiver_gen2_1` firmware.
For LAN access, launch with `--host 0.0.0.0`; this local research app has no login.

```sh
# Finite headless simulation; no serial port opened
python shared/desktop-app/app.py --sim --duration 3
# Desktop GUI
python shared/desktop-app/app.py --gui
# Gamepad, while the web dashboard runs
python shared/gamepad/controller_node.py
# Offline tests; no physical motors
python -B -m unittest discover -s tests -v
```

See the [operating guide](docs/1_APP_USAGE_MANUAL.md),
[serial API](docs/API_DOCUMENTATION.md), and [firmware guide](gen2-st3215/firmware/README.md).

## Control architectures

- **Gen 2.0 bench:** Python `gen2-st3215/main.py` → USB transparent bridge at 1 Mbps → servo bus.
- **Gen 2.0 autonomous:** `robot_esp32_v2` computes the gait onboard; `base_esp32` forwards binary ESP-NOW telemetry to the Pi logger. It uses its own current-threshold evasion state machine.
- **Gen 2.1 host control:** shared Python gait → USB at 115200 → receiver, directly or through the ESP-NOW transmitter → 1 Mbps servo bus. Uses the versioned text handshake and explicit RUN/STOP.
- **Sensor node:** separate ESP32 with MPU6050/BMP280/distance sensing, local OLED/web display and ESP-NOW sensor broadcasts. It does not yet provide robot localization or autonomous obstacle avoidance.

These firmware roles are alternatives, not interchangeable protocols. The
Gen 2.1 receiver does **not** inherit Gen 2.0's battery/temperature cutoff,
per-group soft-start or automatic collision-evasion behavior.

## Mechanical and electrical baseline

Planar Gen 2 uses ten yaw joints and eleven segments. The design-of-record CAD
is [segment v6](gen2-st3215/cad/segments/v6/README.md); its physical fit and friction
assumptions still require the checks recorded there. The software limit is ±70°.
The PyBullet model is a simplified 11-link / 10-joint planar model, not a
validated geometric or dynamic reproduction of the CAD.

The electrical design remains [split power bus v3](docs/hardware/power_split_bus_v3.md):
3S LiPo → main fuse/loop key → five separately fused pairs of servos, with a
separate buck supply to the controller and DATA/GND connectivity to the servo bus.
See [wiring](docs/4_WIRING_DIAGRAM.md) and the dated
[inventory](docs/hardware/Updated_Hardware_Inventory.md). Inventory and assembly
status require physical confirmation; this integration did not inspect hardware.

## Repository map

- `gen1-dynamixel/` — unchanged original generation.
- `gen2-st3215/` — planar mechanics, bench control, and separately named firmware roles.
- `shared/surge_control/` — reusable Gen 2.1 gait, hardware, simulation and control loop.
- `shared/web-dashboard/`, `shared/desktop-app/`, `shared/gamepad/` — user interfaces.
- `shared/simulation/` — PyBullet model and existing Wokwi demonstrator.
- `gen3-experimental-3d/` — experimental 3D work, with dry-run default.
- `docs/versions/` — [version map](docs/versions/VERSIONS.md), integration record and verification report.
- `removed/` — [labelled preserved originals](removed/INDEX.md); recovered Git originals and archive availability notes.

## Verification and remaining limits

See [verification](docs/versions/VERIFICATION.md) for the commands and results.
Hardware movement, radio delivery, stop latency, current thresholds, power wiring,
and CAD tolerances were not physically tested. Hardware path following is disabled
until localization exists. Sensor failures/missing servo feedback are shown as
missing, rather than invented normal readings. The LLM guide is a proposal, not
an implemented controller.

The earlier [research log](removed/pre-gen2.1/README.md), reports, images and design
history remain available in Git. The earlier full local archive was missing at
this sync; recovered originals and the available baseline are indexed under
[removed](removed/INDEX.md). Gen 1 has not been rewritten.

## Team and license

Shashank Jangir, Bhavesh Bansiwal, Mahima Chotiya · IIT Delhi SURGE-090.
© 2026 SURGE-090 Team. All rights reserved; shared for academic and research purposes.

# SURGE-090 · Smart Snake Robot

SURGE 2026 · Indian Institute of Technology Delhi · supervised by Prof. Amartansh Dubey.

This repository contains three robot generations, their control software,
simulation, firmware, CAD and experiment records. Current development is Gen 3;
the shared dashboard also provides the Gen 2.1 planar workspace.

## Start here

Read [the Gen 3 handoff](docs/GEN3_HANDOFF.md) and the current
[joint map](generations/gen3-experimental-3d/joint_map.json) before hardware work.
They are the source of truth for measured settings and commissioning status.
Older reports describe earlier hardware and must not replace the current map.

| Folder | Contents |
| --- | --- |
| [generations/gen1-dynamixel](generations/gen1-dynamixel/README.md) | Original Dynamixel prototype, code, CAD and reports |
| [generations/gen2-st3215](generations/gen2-st3215/README.md) | ST3215 planar robot, maintained ESP32 firmware and bench tools |
| [generations/gen3-experimental-3d](generations/gen3-experimental-3d/README.md) | Current robot, shared backend, dashboard, simulation and runs |
| [docs](docs/README.md) | Operations, hardware, architecture, research, development and history |
| [tests](tests/README.md) | Cross-generation checks; generation-specific tests stay with their generation |
| [tools](tools/README.md) | Repository verification utilities |
| [artifacts](artifacts/README.md) | Preserved generated output; not runtime source |

The [folder guide and move map](docs/REPOSITORY_LAYOUT.md) explain the
2 November 2026 reorganization. The [previous overview](docs/archive/README-before-reorganization-2026-11-02.md)
is retained as historical context.

## Run the dashboard

From the repository root, use the existing Python 3.11 `surge` environment:

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

Open [Gen 2.1](http://127.0.0.1:5000/) or [Gen 3](http://127.0.0.1:5000/gen3).
Starting the server does not connect an engine or command motion. The runtime
needs Flask, PySerial, psutil and PyBullet; see the
[dashboard requirements](generations/gen3-experimental-3d/backend/web_dashboard/requirements.txt).
Operator credentials remain local and ignored by Git.

For a gamepad, log in using the page header, then select **Enable Controller**
(in Controls for Gen 3). Hold LB and press A; releasing LB stops motion.
Gen 3 uses the reviewed execution mode and limits, including hardware confirmation.
See [controller setup and mapping](docs/operations/CONTROLLER_UPGRADES.md).

## Verify changes

```powershell
python tools/verify_layout.py
conda run --no-capture-output -n surge python -B -m unittest discover -s tests
conda run --no-capture-output -n surge python -B -m unittest discover -s generations/gen3-experimental-3d/tests
conda run --no-capture-output -n surge python -B -m unittest discover -s generations/gen2-st3215/tests -p test_offline.py
Get-ChildItem generations/gen3-experimental-3d/tests/test_*.cjs | ForEach-Object { node $_.FullName }
python -m platformio run -e receiver_gen2_1 -e transmitter_gen2_1
```

These are offline checks and firmware builds, not uploads. Browser-specific
Python checks require Playwright. Physical serial/motor tests must be run
deliberately with the supported robot; they are not part of the commands above.

The root `platformio.ini` selects firmware under
`generations/gen2-st3215/firmware/`. The [firmware guide](generations/gen2-st3215/firmware/README.md)
describes which target belongs to each control arrangement.

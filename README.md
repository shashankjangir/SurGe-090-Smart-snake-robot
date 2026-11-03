# SURGE-090: my smart snake robot

I am Shashank Jangir. This repository contains our snake robot's CAD, firmware, control software and experiment records. The project is part of SURGE 2026 at IIT Delhi, supervised by Prof. Amartansh Dubey.

We started with a Dynamixel prototype, moved to a planar ST3215 chain, and are now working on an alternating pitch/yaw robot. I use simulation to develop the controls and small physical trials to check the real mechanism. Reliable forward travel and physical autonomous navigation are still work in progress.

This guide describes the checkout on **3 November 2026**.

| What you want to understand | Read |
| --- | --- |
| The idea, design and development | [My project story](docs/PROJECT.md) |
| Installation and first run | [Start here](docs/START_HERE.md) |
| Parts, assembly, wiring and calibration | [Hardware](docs/hardware/README.md) |
| How the software works | [Software](docs/SOFTWARE.md) |
| Connecting and operating the robot | [Operating guide](docs/operations/1_APP_USAGE_MANUAL.md) |
| What we changed and what remains open | [Current status](docs/CURRENT_STATUS.md) |
| Source locations and verification | [Folder guide](docs/REPOSITORY_LAYOUT.md) |
| Earlier versions of these guides | [Dated archive](docs/archive/2026-11-03/README.md) |

From the repository root on our development PC:

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

Open [Gen 2.1](http://127.0.0.1:5000/) or [Gen 3](http://127.0.0.1:5000/gen3). Start in Simulation. The setup guide covers a fresh environment and operator login.

Before physical work, read the [handoff](docs/GEN3_HANDOFF.md) and current [joint map](generations/gen3-experimental-3d/joint_map.json). The last confirmed ports were COM6 for the receiver and COM7 for the PC transmitter. Identify the boards again if the USB setup changes.

The OTA implementation has passed software checks but has not been physically installed or verified in this work. Releasing motor torque can let the pitch links fall, so the real robot needs support.

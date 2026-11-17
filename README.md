# SURGE-090 smart snake robot

SURGE-090 contains the CAD, ESP32 firmware, browser dashboard, Python controls and experiment records for a snake robot developed during SURGE 2026 at IIT Delhi under Prof. Amartansh Dubey. Shashank Jangir, Bhavesh Bansiwal and Mahima Chotiya are the named dashboard operators.

The maintained Gen 3 robot has 12 ST3215 joints that alternate pitch and yaw. This checkout includes a planar Gen 2.1 simulator, a Gen 3 PyBullet simulator and hardware commissioning tools. Repeatable physical travel and autonomous navigation remain experimental.

Documentation reviewed on **17 November 2026**.

| Start with… | Guide |
| --- | --- |
| Installation and first simulation | [Start here](docs/START_HERE.md) |
| The robot's development | [Project story](docs/PROJECT.md) |
| Parts, wiring and calibration | [Hardware](docs/hardware/README.md) |
| Frontend and backend structure | [Software](docs/SOFTWARE.md) |
| Physical operation | [Operating guide](docs/operations/1_APP_USAGE_MANUAL.md) |
| Verification and remaining work | [Current status](docs/CURRENT_STATUS.md) |
| Source folders and checks | [Repository layout](docs/REPOSITORY_LAYOUT.md) |

After installing the dependencies, run this command from the repository root.

~~~powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
~~~

Open [Gen 2.1](http://127.0.0.1:5000/) or [Gen 3](http://127.0.0.1:5000/gen3). The setup guide explains operator access and the first simulation.

The [refined dashboard](generations/gen3-dashboard-refined/README.md) is an independent copy on port 5001. The [Raspberry Pi package](generations/rasp_pi/README.md) contains the older 10-joint code and map. Use the maintained Gen 3 code and matching map for the current robot.

Read the [handoff](docs/GEN3_HANDOFF.md) and [joint map](generations/gen3-experimental-3d/joint_map.json) before physical work. The last confirmed USB setup, recorded on 3 November, used COM6 for the receiver and COM8 for the transmitter. The OTA-capable pair was installed that day. The later 12-motor, wider-limit and Stop fixes still need a firmware installation and physical check. Support the pitch links when releasing torque.

The 17 November checks passed in a publication-only export using the existing Windows development environment. [Current status](docs/CURRENT_STATUS.md) records the Python, Node, layout and documentation results. The [offline CI workflow](.github/workflows/python-package.yml) repeats these checks on GitHub with Python 3.11 and Node 22. Its GitHub run remains pending.

Earlier guides remain in the [dated archive](docs/archive/2026-11-03/README.md).

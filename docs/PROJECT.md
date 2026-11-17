# How SURGE-090 developed

SURGE-090 explores how a chain of servo joints can move as one body. The project developed during SURGE 2026 at IIT Delhi under Prof. Amartansh Dubey. Shashank Jangir, Bhavesh Bansiwal and Mahima Chotiya are the named operators in the control software.

| Generation | Main work |
| --- | --- |
| Gen 1 | Dynamixel XL330 prototype with the earlier Pi/U2D2 setup |
| Gen 2 and 2.1 | Ten-joint planar ST3215 chain, segment design, servo-bus tools and host control |
| Gen 3 | Twelve alternating pitch/yaw joints, calibration map and 3D simulation |

Gen 2.0 calculates its gait onboard. Gen 2.1 and Gen 3 calculate targets on the host and send them through a PC transmitter ESP32 to the robot receiver. The receiver checks commands and operates the ST3215 bus. Feedback shows joint tracking, while ground travel needs a separate measurement.

The CAD folders record motor holders, plates and alternating-axis connectors. Browser meshes and PyBullet bodies derive from the assembly. The 12-joint simulation has 13 links. Its added tail modules use cloned mesh sections pending a full SolidWorks re-export. Printed fit, load capacity and cable clearance still require physical checks.

The recorded robot uses an external battery on long leads. Ground contact, battery drag, wiring and the travelling wave all affect movement. Simulation helps compare controls, but its contact and mass assumptions remain illustrative.

The maintained dashboard serves separate Simulation and Hardware workspaces. Hardware starts in Dry run. Finite trials, per-joint settings, taught poses, feedback logging and hold-to-run gamepad control support small repeatable experiments. See [the software guide](SOFTWARE.md).

The physical record includes pitch-only trials at 2, 5 and 10 degrees. A later trial at yaw 30 degrees, pitch 25 degrees, 0.5 Hz and speed 1500 produced a write fault and missing IDs 7/8. Wiring was reported repaired afterward. Those are historical trial settings. The [current map](../generations/gen3-experimental-3d/joint_map.json) now saves speed 2144 and tracking error 492.

IDs 11 and 12 were added to the maintained code on 7 November and marked calibrated by the owner on 10 November. The last recorded firmware installation is 3 November. Later receiver changes still need installation and physical verification.

The next physical milestone is a trial record with the assembly, map, waveform, supply voltage, surface, feedback and measured travel. The [current status](CURRENT_STATUS.md) lists the remaining checks, and the [handoff](GEN3_HANDOFF.md) records the hardware setup and dated work.

# Gen 1 — 10-motor Dynamixel design

Gen 1 is the original ten-joint snake robot design, built around a Raspberry Pi,
ten Dynamixel XL330-M288-T actuators and a modular printed body. The software
covers gait generation, motor feedback and current-based obstacle response.

The architecture covers the full ten-motor chain: joint mapping, travelling-wave
gait, current feedback and an obstacle-response state machine. Actuator supply
constraints later led to the ST3215 redesign in [Gen 2](../gen2-st3215/README.md).

This folder keeps the original software, mechanical designs, reports and bench
media. Gen 2.0 and Gen 2.1 are now working, and [Gen 3.0](../gen3-experimental-3d/README.md)
is in development. The [main project page](../README.md) follows that progression.

## Mechanical and control design

The intended mechanism alternated yaw and pitch joints. In the gait code, odd
motor IDs receive the travelling sine wave, while even IDs hold the centre
position. This is different from the all-yaw planar chain used in Gen 2.

The main program uses the Dynamixel SDK directly to read current and send goal
positions. A current threshold triggers a timed response: reverse for 2.5 seconds,
turn for 4 seconds, then resume forward undulation. The configured threshold is
350 mA. This was an experimental control strategy; it does not establish reliable
obstacle detection or which side of the body made contact.

The mechanical work includes segment parts, an assembly, motor reference models
and exported print files. Early segment printing and bench work informed the
later redesign.

## System architecture

The original connection was:

```text
PC / Raspberry Pi → USB → U2D2 + power hub → XL330 IDs 1–10
```

The design connects ten XL330 actuators through a U2D2 and power hub, with the
Raspberry Pi running the controller. The [historical bill of materials](docs/reports/hardware_bom.md)
records procurement and equipment history; the
[current hardware inventory](../docs/hardware/Updated_Hardware_Inventory.md)
covers the later project.

| Setting in the original software | Value |
|---|---|
| Protocol | Dynamixel Protocol 2.0 |
| Serial baud | 57,600 |
| Motor count | 10, IDs 1–10 |
| Default serial port | `COM3` on Windows, `/dev/ttyUSB0` on Linux |
| Encoder centre | 2048 |
| Gait | Odd IDs yaw; even IDs held at centre |
| Loop delay | 20 ms after bus operations |

The 20 ms delay is not a measured 50 Hz control rate: sequential reads and writes
add their own time to each cycle.

## Reading and running the software

Use a separate Python environment for the original stack. Python 3.11 is a
suitable choice for the source syntax. From this folder:

```powershell
python -m pip install -r requirements.txt
```

The requirements are `dynamixel-sdk` and `pyserial`. Before connecting hardware,
set `DEVICENAME` in the script being used and set `Config.NUM_JOINTS` to the
actual chain. The scripts have fixed port defaults; they do not discover the
port automatically or use the Gen 2 `SURGE_PORT` setting.

The files under `tests/` are live hardware tools:

```powershell
python tests/test_dynamixel_ping.py
python tests/test_motor_feedback.py
```

The first checks IDs on the bus. The second reads one selected motor's feedback.
Run them from this folder so their `src` imports resolve correctly.

`python main.py` enables torque and starts the gait immediately. It has no
separate RUN command or mock-mode switch. Ctrl+C reaches the loop's cleanup,
which requests torque-off and closes the port. Configure the actual hardware
and confirm clearance before using this historical program.

## Code map

| File | Role |
|---|---|
| [main.py](main.py) | SDK communication and the position-control loop |
| [robot_config.py](src/robot_config.py) | Motor count, protocol, addresses and tuning values |
| [snake_locomotion.py](src/snake_locomotion.py) | Yaw travelling wave and pitch hold |
| [obstacle_avoidance.py](src/obstacle_avoidance.py) | Timed reverse/turn state machine |
| [utils.py](src/utils.py) | Signed current conversion |
| [servo_driver.py](src/servo_driver.py) | Mock driver for separate controller experiments |
| [kinematics.py](src/kinematics.py), [torque_controller.py](src/torque_controller.py) | Bellows-model and torque-control experiments, not the `main.py` run path |

## Limits of the original controller

A failed current read is replaced with zero in `main.py`, so missing feedback
can mask a stall. Initialization reports motor errors but does not require every
motor to respond before entering the gait loop. Torque enabling also happens
before the loop's cleanup block.

The turning rule uses current sign, which indicates torque direction rather
than obstacle location. The avoidance state machine does not continuously
re-evaluate collisions during its timed manoeuvre. These limitations matter if
the old setup is restored; the code is kept as the original implementation.

## Design records and media

- [Body segments](cad/segments/) and [assembly](cad/assembly/)
- [Motor selection](hardware/Dynamixel_Selection.md) and [starter-kit notes](docs/reports/starter_kit_manual.md)
- [Wiring](docs/wiring_diagram.md) and [Raspberry Pi setup](docs/raspberry_pi_setup_guide.md)
- [Bench photos and video](media/testing/)
- [Progress review v2](docs/presentations/Smart_Snake_Robot_SURGE090_Progress_Review_v2.pptx)
- [Original project write-up](docs/reports/README_v1.md)

The original write-up and reports retain the plans and wording from that stage.
This overview describes the full ten-joint architecture; the original records
retain the details of procurement and testing.

Shashank Jangir · Bhavesh Bansiwal · Mahima Chotiya
SURGE-090, IIT Delhi · Supervisor: Prof. Amartansh Dubey

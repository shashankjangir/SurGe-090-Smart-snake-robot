# SURGE-090 · Generation 2 (Waveshare ST3215)

Python bench stack and ESP32 firmware for the **ST3215** snake. This is **not** a Dynamixel / XL330 tree. Generation 1 lives in [`../gen1-dynamixel/`](../gen1-dynamixel/). Project-wide context: [`../README.md`](../README.md). Porting notes: [`PORTING_STATUS.md`](PORTING_STATUS.md).

**Motors:** Waveshare / Feetech ST3215 (SMS/STS, 12-bit encoder, ~2.94 N·m @ 12 V).  
**Bus:** Feetech Protocol 1-style, **1 Mbps**, daisy-chained 3-pin TTL.  
**Power:** 3S LiPo into driver **VIN (6.0–12.6 V)**. Never 5 V Mean Well on the servo rail.

---

## Two ways to run

| Mode | Master | When |
|---|---|---|
| **Bench** | PC / Pi Python (`main.py`) | USB CDC through the Waveshare ESP32 flashed as a **transparent 1 Mbps bridge** |
| **Field** | Robot ESP32 (`firmware/robot_esp32`) | Onboard gait, current stall FSM, MPU6050, ESP-NOW telemetry |

The two modes are mutually exclusive on the same board: flash **either** `usb_servo_bridge` **or** `robot_esp32`.

```
Bench
  PC (main.py @ 50 Hz)  --USB CDC 1 Mbps-->  ESP32 bridge  --UART GPIO18/19-->  ST3215 #1…#10

Field
  Pi 5 (base_station.py)  --USB 115200-->  ESP32 #2 (base_esp32)
        ^ ESP-NOW telemetry (broadcast)
  Robot ESP32 (gait + IMU)  --UART GPIO18/19 1 Mbps-->  ST3215 #1…#10
        VIN: 3S LiPo 6.0–12.6 V
```

Servo UART on the Waveshare Servo Driver with ESP32 defaults to **GPIO 18 RX / 19 TX**. If ping is silent, swap those pins.

---

## Features

| Feature | Detail |
|---|---|
| **10-DOF planar gait** | All joints yaw (shaft along Z). Travelling sine wave; parameters in `src/robot_config.py` |
| **Current stall detection** | `PRESENT_CURRENT` (addr 69), sign-magnitude, 6.5 mA/count. Trip starts at **1200 mA** — calibrate on hardware |
| **Evasion FSM** | SLITHER → reverse 2.5 s → turn 4.0 s → resume. Detection is off during the 6.5 s manoeuvre |
| **Mock bus** | `SURGE_MOCK=1 python main.py` runs the loop with no serial |
| **ID programming** | One servo at a time: Arduino `firmware/assign_ids` or `python tools/assign_id.py` |

---

## Repository layout

```
gen2-st3215/
├── main.py                      # Bench gait loop (needs usb_servo_bridge)
├── base_station.py              # Pi: print ESP-NOW telemetry from base_esp32
├── servo_test.py                # Single-ID position sweep
├── requirements.txt             # pyserial only (no dynamixel-sdk)
├── PORTING_STATUS.md
├── src/
│   ├── robot_config.py          # Config + St3215Addr control table
│   ├── feetech_protocol.py      # Packet layer (FF FF … checksum)
│   ├── servo_driver.py          # HAL: ping, torque, sync goal, current
│   ├── snake_locomotion.py      # Active gait (all-yaw when PLANAR_ALL_YAW)
│   ├── obstacle_avoidance.py    # Current FSM
│   ├── utils.py                 # Sign-magnitude current, encoder ↔ rad
│   ├── kinematics.py            # Bellows model — not used by main.py
│   └── torque_controller.py     # PD torque — unused; bus is position mode
├── tests/
│   ├── test_st3215_ping.py
│   └── test_motor_feedback.py
├── tools/
│   └── assign_id.py             # EEPROM unlock + ID write
├── firmware/                    # Arduino: ESP32 Dev Module
│   ├── assign_ids/
│   ├── usb_servo_bridge/
│   ├── robot_esp32/
│   └── base_esp32/
└── cad/
    └── segments/v6/             # Design of record (CadQuery)
```

---

## Hardware assumptions

| Item | Value |
|---|---|
| Joints | 10, IDs 1–10 |
| Encoder | 0–4095, centre **2048** |
| Baud | **1 000 000** |
| Stall / free-run (datasheet) | ~2700 mA / ~200 mA |
| Obstacle trip (code default) | **1200 mA** — starting guess, not a bench measurement |
| IMU (field only) | MPU6050, I²C 0x68, SDA **21** / SCL **22**; gait continues if IMU is missing |
| Camera | Raspberry Pi Camera Module 3 on Pi CSI — not on the ESP32 |

XL6009 boost is **not** in the servo path (it would over-voltage a 3S pack).

---

## Software setup (bench)

Python 3.8+, Waveshare driver with **`firmware/usb_servo_bridge`** flashed.

```cmd
install_requirements.cmd
```

```bash
pip install -r requirements.txt
```

Serial port: set `SURGE_PORT` or edit the default in `default_serial_port()` (`COM3` on Windows, `/dev/ttyUSB0` or `/dev/ttyACM0` on Linux).

### Assign IDs (one servo on the bus)

Factory ID is usually `1`. EEPROM must be unlocked (register 55) before the ID write — `tools/assign_id.py` does that.

```bash
python tools/assign_id.py --new 3
python tools/assign_id.py --old 1 --new 7
```

Alternatively flash `firmware/assign_ids`. Daisy-chain only after IDs 1–10 are unique.

### Verify and run

```bash
python tests/test_st3215_ping.py
python tests/test_motor_feedback.py
python servo_test.py
python main.py
```

Mock (no hardware):

```bash
set SURGE_MOCK=1
python main.py
```

Ctrl+C disables torque in the `finally` block.

### Field

1. Flash `firmware/robot_esp32` on the Waveshare driver (gait master).
2. Flash `firmware/base_esp32` on a second ESP32 plugged into the Pi.
3. On the Pi: `python base_station.py --port /dev/ttyUSB0`

Serial monitor on the robot board (115200) prints MAC and telemetry. Type `RUN` / `STOP` on robot or base. Telemetry is ESP-NOW **broadcast** so the base does not need a hardcoded robot MAC.

Details: [`firmware/README.md`](firmware/README.md).

---

## Control table (implemented)

| Item | Address | Size | Notes |
|---|---|---|---|
| ID | 5 | 1 | EEPROM |
| TORQUE_ENABLE | 40 | 1 | 0 off, 1 on |
| ACC | 41 | 1 | `Config.GOAL_ACC` |
| GOAL_POSITION | 42 | 2 | Little-endian ticks; sync-write also packs time + speed |
| PRESENT_POSITION | 56 | 2 | |
| PRESENT_CURRENT | 69 | 2 | Bit 15 = sign, LSB = 6.5 mA |

Packet: `FF FF | ID | LEN | INST | PARAMS | CHECKSUM` with `checksum = ~(ID+LEN+INST+PARAMS) & 0xFF`.

---

## Gait (`Config`)

| Parameter | Value | Meaning |
|---|---|---|
| `GAIT_AMPLITUDE` | 400 ticks | ~35° peak |
| `GAIT_FREQUENCY` | 3.0 rad/s | ~0.48 Hz cycle |
| `GAIT_PHASE_SHIFT` | 1.2 rad | per joint index |
| `GAIT_TURN_OFFSET` | 300 ticks | uniform yaw bias while turning |
| `GOAL_SPEED` / `GOAL_ACC` | 2400 / 50 | limits first-move slam |
| `PLANAR_ALL_YAW` | `True` | every joint is driven (no gen1 pitch-hold) |

Evasion:

```
SLITHER ──(|I| > 1200 mA)──► SLITHER_REV (2.5 s) ──► SLITHER_TURN (4.0 s) ──► SLITHER
```

Turn direction still uses the **sign of present current**, which is torque direction, not obstacle side. Treat side-awareness as a known limitation until joint-index / phase comparison is added.

`kinematics.py` and `torque_controller.py` are present for experiments; **live control is position-mode `SnakeKinematics`**.

---

## CAD

Print from **`cad/segments/v6/`** (CadQuery). v5 had a dimensional error; v4/v5 also had ground-contact and scale-orientation issues that v6 addresses. Motor STEP: `cad/motor-ref/ST3215.step`. Probe before print: `cad/segments/v6/probe_st3215.py`.

---

## Safety

- Servo VIN: **6.0–12.6 V only**. 5 V will brown out or fail to run ST3215s; >12.6 V risks the bus.
- Program IDs with **one** servo connected.
- Keep horns clear during `servo_test.py` and first `main.py` runs.
- Calibrate `OBSTACLE_CURRENT_THRESHOLD_MA` against measured free-run vs stall before relying on evasion.

---

## Team

**SURGE-090 — Smart Snake Robot** · IIT Delhi · SURGE 2026

| Member | Role |
|---|---|
| Shashank Jangir | Project Lead / Software / Electronics & Wiring |
| Bhavesh | Hardware & Mechanical/ Software |
| Mahima | Mechanical / Mathematics |

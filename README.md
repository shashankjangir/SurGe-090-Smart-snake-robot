<p align="center">
  <img src="gen2-st3215/media/assembly%20prototype.png" alt="SURGE-090 gen2 assembly prototype" width="48%"/>
  <img src="gen2-st3215/media/assembly%20prototype%202.0.png" alt="SURGE-090 gen2 assembly prototype 2.0" width="48%"/>
</p>

<h1 align="center">SURGE-090 · Smart Snake Robot 🐍</h1>

<p align="center">
  <b>SURGE Summer Research Programme · Indian Institute of Technology Delhi · 2026</b>
</p>

<p align="center">
  <a href="#abstract">Abstract</a> •
  <a href="#project-status">Status</a> •
  <a href="#the-two-generations">Generations</a> •
  <a href="#system-architecture">Architecture</a> •
  <a href="#repository-structure">Structure</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#team">Team</a>
</p>

---

## Abstract

**SURGE-090** is a ten-degree-of-freedom, bio-inspired snake robot intended for locomotion in unstructured and confined environments. It propels itself by **sinusoidal lateral undulation**, and its central research contribution is **sensorless collision detection**: motor current is monitored continuously, and a stall-current spike is used as a tactile obstacle signal, removing the need for any external proximity or force sensor.

The project was carried out under the **SURGE (Summer Undergraduate Research Grant for Excellence)** programme at **IIT Delhi** in summer 2026, on a ₹1,00,000 grant. It passed through two hardware generations, and the transition between them is the central event in the project's history — see [Why there are two generations](#why-there-are-two-generations).

> **This README is a research log, not a product page.** Every subsystem below is tagged with its real state. Where something is designed but not built, it says so.

---

## Project Status

**Overall: design, simulation, Python bench stack, and ESP32 firmware complete; integrated hardware build pending.**

| Subsystem | State | Notes |
|---|---|---|
| Serpenoid gait generator (Python) | 🟢 **Implemented** | Sound math; verified on bench & simulation |
| Current-threshold collision detection | 🟢 **Implemented** | 350 mA (Gen 1) / 1200 mA default (Gen 2); requires bench calibration |
| Evasion state machine | 🟢 **Implemented** | SLITHER → REV (2.5 s) → TURN (4.0 s) → SLITHER |
| Side-aware turn direction | 🟡 **Implemented** | Uses current sign (torque direction); phase-correlation recommended |
| Dynamixel XL330 bus driver (Gen 1) | 🟡 **Written, bench tested** | Verified against **2** motors; 10-motor path written |
| ST3215 servo driver & protocol (Gen 2) | 🟢 **Implemented** | Feetech SCS half-duplex bus @ 1 Mbps with mock support (`gen2-st3215/src/`) |
| ESP32 robot firmware (Gen 2) | 🟢 **Implemented** | Field firmware (`robot_esp32.ino`) with CPG gait, MPU6050 IMU, ESP-NOW |
| ESP-NOW telemetry link (Gen 2) | 🟢 **Implemented** | Broadcast link from robot to base station (`base_esp32.ino` + `base_station.py`) |
| ESP32 gait simulation (Wokwi) | 🟢 **Working** | 5 PWM servos, HC-SR04, MPU6050, OLED, interactive serial console |
| Body segment CAD — v1/v2 (SolidWorks) | 🟢 **Printed** | 2 segments printed and measured (Gen 1 Dynamixel) |
| Body segment CAD — v4 (CadQuery) | 🟢 **Complete** | Gen 2 baseline design |
| Body segment CAD — v5 (CadQuery) | 🟡 **Superseded** | Addressed sidewalls; superseded by v6 |
| Body segment CAD — v6 (CadQuery) | 🟢 **Complete (Design of record)** | Fixes ground clearance, scale orientation & retention (`gen2-st3215/cad/segments/v6/`) |
| v2.0 electrical architecture | 🟢 **Specified** | Safety architecture, wiring, fused 3S LiPo rail, logic buck regulation |
| Assembled 10-DOF physical robot | 🔴 **Pending** | Full 10-motor physical chain assembly pending actuator procurement |

### The hardware blocker

**Only 2 of the 10 planned Dynamixel XL330-M288-T motors were obtained for Gen 1**, after which the part became unavailable in the Indian market. The project was subsequently transitioned to **Waveshare ST3215** serial bus servos, which are readily sourced in India and deliver 2.94 N·m torque (~5.7× the XL330).

### Anisotropic friction requirement

`snake_locomotion.py` generates a planar undulation that produces forward thrust **only if the belly has anisotropic friction** — low resistance sliding forward, high resistance sliding sideways/backward.

The **v6 CAD** addresses this with longitudinal keel features and directional ground contact geometry. Printing and evaluating a single v6 test segment on the target surface is recommended to measure forward/backward traction before full assembly.

---

## Why there are two generations

The redesign was **forced by component supply, not chosen on engineering grounds.** The commit that opens generation 2 records it plainly:

```
a32b675  2026-08-20  "No dynamixel in the market. So switched to Servos"
```

After a six-week stall waiting on motors that were not going to arrive, the architecture was rebuilt around **Waveshare ST3215** serial bus servos, which are readily sourced in India and carry substantially more torque. The move brought genuine secondary benefits — roughly 5.7× the joint torque, and a 12 V rail that supports a larger robot — but those are consequences of the switch, not the reason for it.

---

## The Two Generations

### `gen1-dynamixel/` — original design

| Aspect | Detail |
|---|---|
| **Motors** | 10× ROBOTIS Dynamixel XL330-M288-T (0.52 N·m, 1.5 A stall @ 5 V) — **2 obtained** |
| **Interface** | ROBOTIS U2D2 + Power Hub Board, TTL daisy chain, Protocol 2.0 |
| **Compute** | Raspberry Pi (4 in BOM, 5 used in lab), Python + `dynamixel-sdk` |
| **Power** | 5 V / 10 A SMPS, tethered |
| **Encoder** | 12-bit magnetic absolute, 0.088°/step |
| **Status** | Control stack written; verified on 2-motor bench |
| **Documentation** | [`gen1-dynamixel/README.md`](gen1-dynamixel/README.md) |

### `gen2-st3215/` — ST3215 + ESP32 redesign

| Aspect | Detail |
|---|---|
| **Motors** | 10× Waveshare ST3215 (2.94 N·m / 30 kg·cm, 2.7 A stall @ 12 V) |
| **Interface** | Waveshare Bus Servo Driver (integrated ESP32), Feetech SCS half-duplex TTL @ 1 Mbps |
| **Onboard compute** | ESP32 dev board — **firmware implemented** (`firmware/robot_esp32/`) |
| **Base station** | Raspberry Pi 5 + second ESP32 radio bridge — **implemented** (`base_station.py` + `firmware/base_esp32/`) |
| **Wireless** | ESP-NOW 2.4 GHz peer-to-peer broadcast telemetry |
| **Sensors** | MPU6050 IMU (I²C 0x68), HC-SR04**P** ultrasonic (3.3 V-safe) |
| **Power** | 1× 3S LiPo 1800 mAh → 12 V direct to driver VIN; Mean Well LRS-100-5 for base station 5 V |
| **CAD** | `cad/segments/v6/` parametric CadQuery design of record |
| **Status** | Control stack, mock mode, firmware, and CAD complete |
| **Documentation** | [`gen2-st3215/README.md`](gen2-st3215/README.md) |

> ⚠️ **HC-SR04P only.** A standard HC-SR04 drives its ECHO pin at 5 V and will permanently damage the ESP32 input stage.

### v2.0 power figures (updated)

The original LaTeX report specified 2× 3S 1500 mAh 30C packs in parallel (33.3 Wh total). The actual hardware uses a **single 3S 1800 mAh** pack (20.0 Wh), fed directly to the driver VIN (no conversion needed).

| Quantity | Value |
|---|---|
| Pack | 1× 3S LiPo 1800 mAh |
| Voltage | 11.1 V nom / 12.6 V charged / 9.0 V floor |
| Energy | **20.0 Wh** |
| Worst-case load (10 servos stalled) | 27 A — verify C-rating can supply this |
| Estimated runtime @ 2 A | **~43 min** (80% DoD) |
| Estimated runtime @ 4 A | **~22 min** |
| Estimated runtime @ 6 A | **~14 min** |

> ⚠️ C-rating and connector type (XT60/XT30/Deans) need to be verified from the pack label. A BMS or LiPo alarm is **not yet acquired** — this is a critical safety gap.

---

## System Architecture

### v1.0 — Dynamixel (Gen 1)

```
┌────────────────────────────────────────────┐
│              Raspberry Pi                  │
│  main.py ──── control loop @ 50 Hz         │
│     ├──► src/obstacle_avoidance.py         │
│     │        current threshold + FSM       │
│     ├──► src/snake_locomotion.py           │
│     │        travelling sine wave          │
│     └──► dynamixel-sdk                     │
│            write4ByteTxRx  (goal position) │
│            read2ByteTxRx   (present current)│
└──────────────┬─────────────────────────────┘
        │ USB
   ┌────┴─────┐
   │ U2D2+PHB │  5 V power injection
   └────┬─────┘
        │ X3P TTL daisy chain
┌───────▼────────────────────────────────────┐
│  Motor 1 → 2 → … → 10                      │
└────────────────────────────────────────────┘
```

### v2.0 — ST3215 + ESP-NOW (Gen 2)

```
  ┌─── BASE STATION ────────────────────────────┐
  │  Raspberry Pi 5 (base_station.py)           │
  │       ↕ USB Serial @ 115200                 │
  │  ESP32 #2 (firmware/base_esp32)             │
  └──────────────┬──────────────────────────────┘
                 │  ESP-NOW 2.4 GHz Broadcast
  ┌──────────────▼──────────────────────────────┐
  │  ESP32 #1 (firmware/robot_esp32)            │
  │    Onboard: Gait CPG · MPU6050 · Stall FSM  │
  │       ↕ UART (GPIO 18 RX / 19 TX) @ 1 Mbps  │
  │  Waveshare Bus Servo Driver (integrated)    │
  └──────────────┬──────────────────────────────┘
                 │  3-pin half-duplex TTL bus
  ┌──────────────▼──────────────────────────────┐
  │  ST3215 #1 → #2 → … → #10                   │
  └─────────────────────────────────────────────┘
      ⏚ 1× 3S LiPo 1800 mAh → [fuse TBD] →
        [loop key TBD] → 12 V direct to VIN
```

---

## Gait Parameters

```python
wave_phase = (wave_dir * self.frequency * current_time) - (i * self.phase_shift)
pos = int(self.center_pos + self.amplitude * math.sin(wave_phase) + bend)
```

| Parameter | Gen 1 (XL330) | Gen 2 (ST3215) | Physical Meaning |
|---|---|---|---|
| `amplitude` | 400 ticks | 400 ticks | **35.2°** peak joint deflection |
| `frequency` | 3.0 rad/s | 3.0 rad/s | **0.477 Hz** gait cycle (period 2.09 s) |
| `phase_shift` | 1.2 rad | 1.2 rad | per joint index |
| `turn_offset` | 300 ticks | 300 ticks | **26.4°** spine bias when turning |
| `center_pos` | 2048 | 2048 | 12-bit encoder neutral |
| `baudrate` | 57600 | 1000000 | Serial communication baud rate |
| `stall_threshold` | 350 mA | 1200 mA | Obstacle trip threshold |

---

## Known Issues & Implementation Notes

1. **Plaintext SSH credentials:** Purged from tracked documentation; ensure any hardware device credentials are rotated.
2. **CAD Evolution:**
   - `segment_v5.py` had a sidewall thickness bug.
   - **`segment_v6.py`** is the **design of record**, fixing ground contact plane, orienting keel scales longitudinally, and providing positive motor retention screws.
3. **ST3215 Control Stack:** Fully ported in `gen2-st3215/src/` with `feetech_protocol.py` (checksum, sync-write, sign-magnitude current decoding) and `servo_driver.py`.
4. **Mock Simulation Mode:** `SURGE_MOCK=1 python main.py` allows full gait and state machine simulation on PC without attached serial hardware.
5. **EEPROM ID Programming:** ST3215 EEPROM unlock (register `55` / `0x37`) is handled in both `gen2-st3215/tools/assign_id.py` and `gen2-st3215/firmware/assign_ids/`.

---

## Repository Structure

```
surge090/
├── README.md                          ← Project overview & research log
├── Updated_Hardware_Inventory.md      # Comprehensive BOM, specs & cost analysis
├── .gitignore                         # Git exclusion rules
├── .gitattributes                     # Git LFS attributes
│
├── gen1-dynamixel/                    ══ GENERATION 1 (Dynamixel XL330) ══════
│   ├── README.md                      # Gen 1 documentation & user guide
│   ├── main.py                        # Python 50 Hz control loop
│   ├── requirements.txt               # Dependencies (dynamixel-sdk, pyserial)
│   ├── install_requirements.cmd       # Windows dependency installer
│   ├── src/                           # Control modules (Dynamixel SDK)
│   ├── tests/                         # Ping & live feedback test scripts
│   ├── cad/                           # SolidWorks CAD models & assemblies
│   │   ├── segments/                  # Segment 1 & 2 parts/STLs
│   │   ├── assembly/                  # 10-joint assembly
│   │   └── motor-ref/                 # XL330 CAD reference models
│   ├── hardware/                      # BOM.xlsx, Dynamixel_Selection.md
│   ├── docs/                          # Guides, safety, wiring & presentations
│   └── media/                         # Hardware photos, renders & test footage
│
├── gen2-st3215/                       ══ GENERATION 2 (Waveshare ST3215) ═════
│   ├── README.md                      # Gen 2 documentation & quick start
│   ├── PORTING_STATUS.md              # Porting matrix & register map
│   ├── main.py                        # Bench gait loop (supports SURGE_MOCK=1)
│   ├── base_station.py                # Pi 5 ESP-NOW telemetry logger
│   ├── servo_test.py                  # Single-motor position sweep
│   ├── requirements.txt               # Dependencies (pyserial)
│   ├── src/                           # ST3215 control stack
│   │   ├── feetech_protocol.py        # Feetech SCS packet layer & checksums
│   │   ├── servo_driver.py            # ST3215 HAL with Mock & SyncWrite
│   │   ├── robot_config.py            # Hardware config & St3215Addr
│   │   ├── snake_locomotion.py        # Serpenoid gait engine (all-yaw)
│   │   ├── obstacle_avoidance.py      # Current-threshold FSM
│   │   ├── utils.py                   # Current conversion & angle math
│   │   ├── kinematics.py              # Curvature wave model
│   │   └── torque_controller.py       # PD compliance model
│   ├── tests/                         # ST3215 ping & telemetry tests
│   ├── tools/                         # EEPROM unlock & ID programming
│   ├── firmware/                      # Arduino / ESP32 firmware
│   │   ├── README.md                  # Firmware guide & flash instructions
│   │   ├── robot_esp32/               # Field master (Gait CPG, MPU6050, ESP-NOW)
│   │   ├── base_esp32/                # ESP-NOW to USB serial receiver
│   │   ├── usb_servo_bridge/          # 1 Mbps transparent USB-UART bridge
│   │   └── assign_ids/                # Interactive ID assignment sketch
│   ├── cad/                           # Parametric CadQuery segment models
│   │   ├── motor-ref/                 # ST3215 STEP, DXF & drawing
│   │   └── segments/
│   │       ├── v4/                    # Baseline CadQuery segment
│   │       ├── v5/                    # Intermediate iteration
│   │       └── v6/                    # Design of record (segment_v6.py)
│   ├── docs/                          # Wiring diagrams, SVG & parts lists
│   └── progress/                      # Electrical system LaTeX reports
│
└── simulation/wokwi/                  ══ WOKWI ESP32 SIMULATION ══════════════
    ├── README.md                      # Wokwi simulation guide & console commands
    ├── sketch.ino                     # 5-servo snake robot simulation firmware
    ├── diagram.json                   # Wokwi circuit schematic
    ├── libraries.txt                  # Required Arduino libraries
    └── Link to simulation             # Direct URL to active browser sim
```

---

## Quick Start

### 1. Wokwi Simulation (No hardware required)

Run the 5-servo snake robot in your browser:  
🔗 **[wokwi.com/projects/467623718124707841](https://wokwi.com/projects/467623718124707841)**

Includes real-time serpenoid gait generation, HC-SR04 obstacle detection with hysteresis, MPU6050 orientation tracking, SSD1306 OLED display, and a live serial tuning console at 115200 baud (`f`, `b`, `l`, `r`, `s`, `a`, `A<deg>`, `S<speed>`, `?`).

### 2. Gen 2 — ST3215 (Python Bench & Mock)

```bash
cd "gen2-st3215"
pip install -r requirements.txt
```

**Run in Mock mode (no hardware connected):**
```bash
# Windows
set SURGE_MOCK=1
python main.py

# Linux / macOS
SURGE_MOCK=1 python main.py
```

**Run with Hardware Bench:**
1. Flash `firmware/usb_servo_bridge` onto the ESP32 Servo Driver.
2. Connect ST3215 servos with IDs 1–10.
3. Run verification and control loop:
```bash
python tests/test_st3215_ping.py
python tests/test_motor_feedback.py
python main.py
```

### 3. Gen 2 — ST3215 (Field Mode / Untethered)

1. Flash `firmware/robot_esp32` onto the robot's onboard ESP32.
2. Flash `firmware/base_esp32` onto the base station ESP32 connected to Raspberry Pi 5.
3. On the Raspberry Pi:
```bash
python base_station.py --port /dev/ttyUSB0
```

### 4. Gen 1 — Dynamixel XL330

```bash
cd "gen1-dynamixel"
pip install -r requirements.txt
python tests/test_dynamixel_ping.py
python main.py
```

---

## Documentation

| Document | Path | Description |
|---|---|---|
| **Gen 2 ST3215 Overview** | [`gen2-st3215/README.md`](gen2-st3215/README.md) | Generation 2 system guide |
| **Gen 2 Porting Status** | [`gen2-st3215/PORTING_STATUS.md`](gen2-st3215/PORTING_STATUS.md) | ST3215 porting details & register map |
| **Gen 2 Firmware Guide** | [`gen2-st3215/firmware/README.md`](gen2-st3215/firmware/README.md) | ESP32 flashing instructions |
| **CAD Segment v6 Guide** | [`gen2-st3215/cad/segments/v6/README.md`](gen2-st3215/cad/segments/v6/README.md) | v6 design of record documentation |
| **Hardware Inventory & BOM** | [`Updated_Hardware_Inventory.md`](Updated_Hardware_Inventory.md) | Parts, specifications & budget analysis |
| **Gen 1 Dynamixel Overview** | [`gen1-dynamixel/README.md`](gen1-dynamixel/README.md) | Generation 1 system guide |
| **Motor Trade Study** | [`gen1-dynamixel/hardware/Dynamixel_Selection.md`](gen1-dynamixel/hardware/Dynamixel_Selection.md) | XL330 vs AX-12A vs SG90 comparison |
| **v2.0 Wiring Diagram (SVG)** | [`gen2-st3215/docs/snake_robot_wiring_diagram.svg`](gen2-st3215/docs/snake_robot_wiring_diagram.svg) | Electrical schematic & pinouts |
| **v2.0 Electrical Report** | [`gen2-st3215/progress/electrical_system_report.pdf`](gen2-st3215/progress/electrical_system_report.pdf) | Safety architecture & power analysis |
| **Wokwi Simulation Guide** | [`simulation/wokwi/README.md`](simulation/wokwi/README.md) | ESP32 browser simulation notes |

---

## Team

**SURGE-090 — Smart Snake Robot** · IIT Delhi · Summer 2026  
Supervisor: **Prof. Amartansh Dubey**

| Member | Entry No. | Role |
|---|---|---|
| Shashank Jangir | 2024EE11048 | Project lead · hardware · CAD · Electronics |
| Bhavesh Bansiwal | 2024ME10487 | Software · mechanical · CAD |
| Mahima Chotiya | 2024ME11187 | Mathematics · physics |

---

## Acknowledgements

Carried out under the **SURGE (Summer Undergraduate Research Grant for Excellence)** programme at **IIT Delhi**. We thank our supervisor and the Department of Mechanical Engineering for their guidance and laboratory resources.

---

## License

© 2026 SURGE-090 Team, IIT Delhi. All rights reserved.  
Shared for academic and research purposes only.

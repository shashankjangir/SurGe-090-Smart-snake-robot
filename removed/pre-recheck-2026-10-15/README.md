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
  <a href="#project-versions">Generations</a> •
  <a href="#system-architecture">Architecture</a> •
  <a href="#repository-structure">Structure</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#team">Team</a>
</p>

---

> **Updated 24 Sep 2026.** What we did before and what we do now is recorded in [What changed](#what-changed) at the end of this file.

## Abstract

**SURGE-090** is a ten-degree-of-freedom, bio-inspired snake robot intended for locomotion in unstructured and confined environments. It propels itself by **sinusoidal lateral undulation**, and its central research contribution is **sensorless collision detection**: motor current is monitored continuously, and a stall-current spike is used as a tactile obstacle signal, removing the need for any external proximity or force sensor.

The project was carried out under the **SURGE (Summer Undergraduate Research Grant for Excellence)** programme at **IIT Delhi** in summer 2026, on a ₹1,00,000 grant. It spans Gen 1 (Dynamixel), Gen 2.0 (planar ST3215), Gen 2.1 (integrated host control), and Gen 3.0 (experimental 3D motion). The Dynamixel→ST3215 transition is the central hardware event — see [Why Gen 2 exists](#why-gen-2-exists). Version roles are listed in [`docs/versions/VERSIONS.md`](docs/versions/VERSIONS.md).

> **This README is a research log, not a product page.** Every subsystem below is tagged with its real state. Where something is designed but not built, it says so.

---

## Project Status

**Overall: design, simulation, Python bench stack, ESP32 firmware, web dashboard, and desktop app complete; integrated hardware build pending.**

| Subsystem | State | Notes |
|---|---|---|
| Serpenoid gait generator (Python) | 🟢 **Implemented** | Sound math; verified on bench & simulation |
| Current-threshold collision detection | 🟢 **Implemented** | 350 mA (Gen 1) / 1200 mA default (Gen 2); requires bench calibration |
| Evasion state machine | 🟢 **Implemented** | SLITHER → REV (2.5 s) → TURN (4.0 s) → SLITHER |
| Side-aware turn direction | 🟡 **Implemented** | Uses current sign (torque direction); phase-correlation recommended |
| Dynamixel XL330 bus driver (Gen 1) | 🟡 **Written, bench tested** | Verified against **2** motors; 10-motor path written |
| ST3215 servo driver & protocol (Gen 2) | 🟢 **Implemented** | Feetech SCS half-duplex bus @ 1 Mbps with mock support (`gen2-st3215/src/`) |
| ESP32 robot firmware (Gen 2) | 🟢 **Implemented** | Field firmware of record `robot_esp32_v2.cpp`: CPG gait, MPU6050, ESP-NOW, limp boot, per-group soft start, ±70° limits, low-battery/over-temp stop (`robot_esp32` superseded) |
| ESP32 receiver + transmitter | 🟢 **Implemented** | OLED + NeoPixel receiver, ESP-NOW transmitter (`gen2-st3215/firmware/`) |
| ESP-NOW telemetry link (Gen 2) | 🟢 **Implemented** | Broadcast link from robot to base station (`base_esp32.ino` + `base_station.py`) |
| PyBullet physics simulation | 🟢 **Implemented** | 10-segment URDF digital twin with GUI + headless modes (`shared/simulation/pybullet/`) |
| Pure pursuit path following | 🟢 **Implemented** | Kinematic prediction + pure pursuit steering (`gen2-st3215/src/path_engine.py`) |
| Web dashboard (Flask) | 🟢 **Implemented** | REST API, 2D canvas, 3D Three.js viewer, telemetry (`shared/web-dashboard/`) |
| Desktop control app (Tkinter) | 🟢 **Implemented** | GUI + headless mode, path drawing, accuracy reports (`shared/desktop-app/`) |
| ESP32 gait simulation (Wokwi) | 🟢 **Working** | 5 PWM servos, HC-SR04, MPU6050, OLED, interactive serial console |
| Body segment CAD — v1/v2 (SolidWorks) | 🟢 **Printed** | 2 segments printed and measured (Gen 1 Dynamixel) |
| Body segment CAD — v4 (CadQuery) | 🟢 **Complete** | Gen 2 baseline design |
| Body segment CAD — v5 (CadQuery) | 🟡 **Superseded** | Addressed sidewalls; superseded by v6 |
| Body segment CAD — v6 (CadQuery) | 🟢 **Complete (Design of record)** | Fixes ground clearance, scale orientation & retention (`gen2-st3215/cad/segments/v6/`) |
| v2.0 electrical architecture | 🟢 **Specified** | Split power bus v3: 15 A main fuse → loop key → 5 groups of 2 servos, 3 A fuse per group ([`docs/hardware/power_split_bus_v3.md`](docs/hardware/power_split_bus_v3.md)) |
| Assembled 10-DOF physical robot | 🔴 **Pending** | Full 10-motor physical chain assembly pending actuator procurement |

### The hardware blocker

**Only 2 of the 10 planned Dynamixel XL330-M288-T motors were obtained for Gen 1**, after which the part became unavailable in the Indian market. The project was subsequently transitioned to **Waveshare ST3215** serial bus servos, which are readily sourced in India and deliver 2.94 N·m torque (~5.7× the XL330).

### Anisotropic friction requirement

`snake_locomotion.py` generates a planar undulation that produces forward thrust **only if the belly has anisotropic friction** — low resistance sliding forward, high resistance sliding sideways/backward.

The **v6 CAD** addresses this with longitudinal keel features and directional ground contact geometry. Printing and evaluating a single v6 test segment on the target surface is recommended to measure forward/backward traction before full assembly.

---

## Why Gen 2 exists

The redesign was **forced by component supply, not chosen on engineering grounds.** The commit that opens generation 2 records it plainly:

```
a32b675  2026-08-20  "No dynamixel in the market. So switched to Servos"
```

After a six-week stall waiting on motors that were not going to arrive, the architecture was rebuilt around **Waveshare ST3215** serial bus servos, which are readily sourced in India and carry substantially more torque. The move brought genuine secondary benefits — roughly 5.7× the joint torque, and a 12 V rail that supports a larger robot — but those are consequences of the switch, not the reason for it.

---

## Project versions

Canonical map: [`docs/versions/VERSIONS.md`](docs/versions/VERSIONS.md).

| Version | Folder | Role |
|---|---|---|
| **Gen 1** | `gen1-dynamixel/` | Dynamixel prototype — **unchanged** |
| **Gen 2.0** | `gen2-st3215/` | Planar ST3215 design (segment v6, power bus v3, `robot_esp32_v2`) |
| **Gen 2.1** | `shared/surge_control/`, dashboard, gamepad, `*_gen2_1` firmware | Integrated host control for the **same planar** mechanics |
| **Gen 3.0** | `gen3-experimental-3d/` | Experimental 3D motion CAD/scripts — kept separate |

### `gen1-dynamixel/` — Gen 1 Dynamixel prototype

| Aspect | Detail |
|---|---|
| **Motors** | 10× ROBOTIS Dynamixel XL330-M288-T (0.52 N·m, 1.5 A stall @ 5 V) — **2 obtained** |
| **Interface** | ROBOTIS U2D2 + Power Hub Board, TTL daisy chain, Protocol 2.0 |
| **Compute** | Raspberry Pi (4 in BOM, 5 used in lab), Python + `dynamixel-sdk` |
| **Power** | 5 V / 10 A SMPS, tethered |
| **Encoder** | 12-bit magnetic absolute, 0.088°/step |
| **Status** | Control stack written; verified on 2-motor bench |
| **Documentation** | [`gen1-dynamixel/README.md`](gen1-dynamixel/README.md) |

### `gen2-st3215/` — Gen 2.0 planar ST3215 + ESP32

| Aspect | Detail |
|---|---|
| **Motors** | 10× Waveshare ST3215 (2.94 N·m / 30 kg·cm, 2.7 A stall @ 12 V) |
| **Interface** | Waveshare Bus Servo Driver (integrated ESP32), Feetech SCS half-duplex TTL @ 1 Mbps |
| **Onboard compute** | ESP32 dev board — **firmware implemented** (`firmware/robot_esp32_v2/`) |
| **Base station** | Raspberry Pi 5 + second ESP32 radio bridge — **implemented** (`base_station.py` + `firmware/base_esp32/`) |
| **Wireless** | ESP-NOW 2.4 GHz peer-to-peer broadcast telemetry |
| **Sensors** | MPU6050 IMU (I²C 0x68), HC-SR04**P** ultrasonic (3.3 V-safe) |
| **Power** | 1× 3S LiPo 1800 mAh → 15 A fuse → XT60 loop key → main line; split bus v3 injects 12 V into 5 groups of 2 servos (3 A fuse each); driver board fed via 7.5 V buck, servo-port +V cut. Mean Well LRS-100-5 for base station 5 V |
| **CAD** | `cad/segments/v6/` parametric CadQuery design of record |
| **Status** | Control stack, mock mode, firmware, and CAD complete |
| **Documentation** | [`gen2-st3215/README.md`](gen2-st3215/README.md) |

> ⚠️ **HC-SR04P only.** A standard HC-SR04 drives its ECHO pin at 5 V and will permanently damage the ESP32 input stage.

### v2.0 power figures (updated)

The original LaTeX report specified 2× 3S 1500 mAh 30C packs in parallel (33.3 Wh total). The actual hardware uses a **single 3S 1800 mAh** pack (20.0 Wh). Since split bus v3 the servos are powered straight from the main line in 5 fused groups, not through the driver board.

| Quantity | Value |
|---|---|
| Pack | 1× 3S LiPo 1800 mAh |
| Voltage | 11.1 V nom / 12.6 V charged / 9.0 V floor |
| Energy | **20.0 Wh** |
| Typical walking load | ~3–5 A total (~0.6–1.0 A per group of 2) |
| Worst-case load (10 servos stalled) | 27 A — per-group 3 A fuses / 15 A main fuse trip first |
| Estimated runtime @ 2 A | **~43 min** (80% DoD) |
| Estimated runtime @ 4 A | **~22 min** |
| Estimated runtime @ 6 A | **~14 min** |

> ⚠️ C-rating and connector type (XT60/XT30/Deans) need to be verified from the pack label. A BMS or LiPo alarm is **not yet acquired** — `robot_esp32_v2` stops at 10.2 V, but a hardware alarm is still recommended.

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
  │  ESP32 #1 (firmware/robot_esp32_v2)         │
  │    Onboard: Gait CPG · MPU6050 · Stall FSM  │
  │       ↕ UART (GPIO 18 RX / 19 TX) @ 1 Mbps  │
  │  Waveshare Bus Servo Driver (integrated)    │
  └──────────────┬──────────────────────────────┘
                 │  3-pin half-duplex TTL bus
  ┌──────────────▼──────────────────────────────┐
  │  ST3215 #1 → #2 → … → #10                   │
  └─────────────────────────────────────────────┘
      ⏚ 1× 3S LiPo 1800 mAh → 15 A fuse → XT60 loop key → 12 V main line
        → 5 inject boards (3 A fuse each) → servo groups 1-2 · 3-4 · 5-6 · 7-8 · 9-10
        → 7.5 V buck → driver board (servo-port +V cut: DATA + GND only)
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
├── README.md
├── platformio.ini
├── gen1-dynamixel/                 # Gen 1 Dynamixel (frozen)
├── gen2-st3215/                    # Gen 2.0 planar ST3215 + Gen 2.1 firmware/tools
│   ├── firmware/
│   │   ├── robot_esp32_v2/         # Gen 2.0 onboard CPG (field)
│   │   ├── receiver_gen2_1/        # Gen 2.1 host-driven planar receiver
│   │   ├── transmitter_gen2_1/
│   │   └── sensor_gen2_1/
│   ├── tools/                      # align/sine/spiral_gen2_1.py (planar)
│   └── cad/segments/v6/            # Segment design of record
├── gen3-experimental-3d/           # Gen 3.0 experimental 3D CAD + scripts
├── shared/
│   ├── surge_control/              # Gen 2.1 gait, hardware, sim, runtime
│   ├── web-dashboard/              # Gen 2.1 Flask dashboard
│   ├── gamepad/                    # controller_node.py → /api/controller
│   ├── desktop-app/                # Legacy Tkinter UI
│   └── simulation/pybullet/        # 11-link / 10-joint planar URDF
├── docs/
│   ├── versions/VERSIONS.md        # Version + component revision map
│   ├── API_DOCUMENTATION.md        # Gen 2.1 serial protocol
│   └── hardware/power_split_bus_v3.md
└── removed/                        # Preserved material (INDEX.md) — nothing deleted
```

---

## Quick Start

### 1. Gen 2.1 web dashboard (default — no hardware required)

Headless PyBullet is the safe default. Importing `web_app` does not open serial ports or start the control thread; that happens only when you run the module.
```bash
cd shared/web-dashboard
pip install -r requirements.txt
python web_app.py
```
Open **http://localhost:5000**. Simulation is pre-selected with **Run Headless** checked. For hardware, flash `receiver_gen2_1` (and optionally `transmitter_gen2_1`), then select the ST3215 engine.

Gamepad (optional): `python shared/gamepad/controller_node.py` while the dashboard is running.

### 2. Desktop app (legacy Tkinter path)

```bash
cd shared/desktop-app
python app.py --gui
```
Gen 2.1 control of record is the web dashboard + `shared/surge_control`. The desktop app remains available; see its README for path notes.

### 3. Wokwi Simulation (Browser-only, no install)

Run the 5-servo snake robot in your browser:  
🔗 **[wokwi.com/projects/467623718124707841](https://wokwi.com/projects/467623718124707841)**

Includes real-time serpenoid gait generation, HC-SR04 obstacle detection with hysteresis, MPU6050 orientation tracking, SSD1306 OLED display, and a live serial tuning console at 115200 baud (`f`, `b`, `l`, `r`, `s`, `a`, `A<deg>`, `S<speed>`, `?`).

### 4. Gen 2 — ST3215 (Python Bench & Mock)

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

### 5. Gen 2 — ST3215 (Field Mode / Untethered)

1. Flash `robot_esp32_v2` onto the robot's onboard ESP32 (`pio run -e robot_esp32_v2 -t upload` from the repo root). It boots limp — type `RUN` in the serial monitor or send it from the base station.
2. Flash `firmware/base_esp32` onto the base station ESP32 connected to Raspberry Pi 5.
3. On the Raspberry Pi:
```bash
python base_station.py --port /dev/ttyUSB0
```

### 6. Gen 1 — Dynamixel XL330

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
| **Web Dashboard Guide** | [`shared/web-dashboard/README.md`](shared/web-dashboard/README.md) | Flask web dashboard & REST API reference |
| **Desktop App Guide** | [`shared/desktop-app/README.md`](shared/desktop-app/README.md) | Tkinter desktop control suite |
| **PyBullet Simulation Guide** | [`shared/simulation/pybullet/README.md`](shared/simulation/pybullet/README.md) | Physics digital twin documentation |
| **App Usage Manual** | [`docs/1_APP_USAGE_MANUAL.md`](docs/1_APP_USAGE_MANUAL.md) | Headless, GUI, and remote access modes |
| **Raspberry Pi Setup** | [`docs/3_RASPBERRY_PI_SETUP.md`](docs/3_RASPBERRY_PI_SETUP.md) | 8-phase Pi setup (OS → SSH → X11 → Ollama) |
| **LLM Autonomy Setup** | [`docs/4_LLM_AUTONOMY_SETUP.md`](docs/4_LLM_AUTONOMY_SETUP.md) | Local LLM brain architecture for Pi 5 |
| **Version map** | [`docs/versions/VERSIONS.md`](docs/versions/VERSIONS.md) | Gen 1 / 2.0 / 2.1 / 3.0 + component revisions |
| **Removed index** | [`removed/INDEX.md`](removed/INDEX.md) | Preserved material moved out of the active tree |
| **Serial API Documentation** | [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Gen 2.1 HELLO/RUN/STOP/P/T protocol |
| **Gen 3 experimental 3D** | [`gen3-experimental-3d/README.md`](gen3-experimental-3d/README.md) | 3D motion CAD/scripts (separate from planar Gen 2) |
| **Gen 2 ST3215 Overview** | [`gen2-st3215/README.md`](gen2-st3215/README.md) | Generation 2 system guide |
| **Gen 2 Porting Status** | [`gen2-st3215/PORTING_STATUS.md`](gen2-st3215/PORTING_STATUS.md) | ST3215 porting details & register map |
| **Gen 2 Firmware Guide** | [`gen2-st3215/firmware/README.md`](gen2-st3215/firmware/README.md) | ESP32 flashing instructions |
| **CAD Segment v6 Guide** | [`gen2-st3215/cad/segments/v6/README.md`](gen2-st3215/cad/segments/v6/README.md) | v6 design of record documentation |
| **Hardware Inventory & BOM** | [`docs/hardware/Updated_Hardware_Inventory.md`](docs/hardware/Updated_Hardware_Inventory.md) | Parts, specifications & budget analysis |
| **Gen 1 Dynamixel Overview** | [`gen1-dynamixel/README.md`](gen1-dynamixel/README.md) | Generation 1 system guide |
| **Motor Trade Study** | [`gen1-dynamixel/hardware/Dynamixel_Selection.md`](gen1-dynamixel/hardware/Dynamixel_Selection.md) | XL330 vs AX-12A vs SG90 comparison |
| **Hardware design index & history** | [`docs/hardware/README.md`](docs/hardware/README.md) | Current vs superseded power designs, and why each changed |
| **Power design — split bus v3** | [`docs/hardware/power_split_bus_v3.md`](docs/hardware/power_split_bus_v3.md) | Current power architecture, parts & build order |
| **Wiring diagram — split bus v3 (SVG)** | [`docs/hardware/wiring_split_bus_v3.svg`](docs/hardware/wiring_split_bus_v3.svg) | Current wiring diagram |
| **v2.0 Wiring Diagram (SVG, older)** | [`gen2-st3215/docs/snake_robot_wiring_diagram.svg`](gen2-st3215/docs/snake_robot_wiring_diagram.svg) | Electrical schematic & pinouts |
| **v2.0 Electrical Report** | [`gen2-st3215/progress/electrical_system_report.pdf`](gen2-st3215/progress/electrical_system_report.pdf) | Safety architecture & power analysis |
| **Wokwi Simulation Guide** | [`shared/simulation/wokwi/README.md`](shared/simulation/wokwi/README.md) | ESP32 browser simulation notes |
| **Wiring Diagram (Gen 2)** | [`docs/4_WIRING_DIAGRAM.md`](docs/4_WIRING_DIAGRAM.md) | Split bus v3 connection tables, pinout & build order |
| **Parts & Safety** | [`docs/5_PARTS_AND_SAFETY.md`](docs/5_PARTS_AND_SAFETY.md) | Parts and safety guidelines |
| **Telemetry & Performance** | [`docs/7_TELEMETRY_AND_PERFORMANCE.md`](docs/7_TELEMETRY_AND_PERFORMANCE.md) | Telemetry and performance documentation |

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

---

## What changed

### 15 Oct 2026

| Topic | Before | Now | Why |
|---|---|---|---|
| Project versions | Gen 1 + Gen 2 narrative | Gen 1, 2.0, 2.1, 3.0 documented | Separate integrated host control and experimental 3D from planar Gen 2 hardware |
| Control software | Standalone tree + older dashboard | `shared/surge_control` + Gen 2.1 dashboard/gamepad/firmware | One continuous project layout by function and version |
| Receiver protocol | `P,id:pos` at fixed speed 3400; no handshake | `HELLO`/`RUN`/`STOP`, per-joint speed, torque watchdog | Motor-speed handling and safe stop |
| Simulation URDF | 10 links / 9 joints | 11 links / 10 joints | Match 10-DOF controller |
| Preservation | — | Git tag + bundles + `removed/` with index | Keep both starting points; delete nothing |

### 24 Sep 2026

| Topic | Before | Now | Why |
|---|---|---|---|
| Power design | 3S LiPo → fuse (size TBD) → loop key (TBD) → 12 V direct to driver VIN → servos | Split bus v3: 15 A fuse → XT60 loop key → main line → 5 groups of 2 servos, 3 A fuse each; 7.5 V buck powers the driver | Each plug carries only 2 servos' current, a jam takes out only 2 joints, and the voltage drop is almost zero (see `power_split_bus_v3.md`) |
| Power design history | — | Centre-fed v1 → split bus v2 (4+3+3) → split bus v3 (2+2+2+2+2) | Each step put fewer servos on one plug and fuse |
| Field firmware | `robot_esp32.ino` | `robot_esp32_v2.cpp` (old one superseded) | With 3 A fuses per pair of servos, starting all 10 servos at once could blow fuses; v2 also adds battery/temperature protection; sketches are `.cpp` so PlatformIO builds them |
| Hardware inventory | `Updated_Hardware_Inventory.md` at repo root | `docs/hardware/Updated_Hardware_Inventory.md` | File was moved; old link was broken |
| Wiring doc | `docs/4_WIRING_DIAGRAM.md` held the Gen 1 wiring | It holds the Gen 2 split bus v3 wiring; Gen 1 copy stays in `gen1-dynamixel/docs/` | Doc matches the robot being built |
| Superseded designs | Only in the claude.ai project | Copied into `docs/hardware/` with an index showing the history | Keep the reasons for each change with the repo |

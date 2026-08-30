# 🐍 SURGE-090: Self-Adaptive Smart Snake Robot

A bio-inspired, autonomous snake robot built on **Raspberry Pi** and **ROBOTIS Dynamixel XL330** servo motors. SURGE-090 uses a sinusoidal lateral undulation gait to slither forward and detects obstacles using only motor current feedback — no external sensors required.

---

## 📽️ Demo

> Hardware test footage is available in the project working folder.

---

## ✨ Key Features

- **10-DOF Serpentine Locomotion** — Sinusoidal lateral undulation gait implemented in pure Python
- **Sensorless Obstacle Detection** — Monitors motor current draw; a current spike (> 350 mA) signals a collision
- **Autonomous Evasion State Machine** — Automatically reverses for 2.5 s → turns for 4 s → resumes forward slither
- **Dual Operation Modes** — Tethered (via laptop USB) or fully untethered (on-board Raspberry Pi)
- **3D-Printed Body Segments** — SolidWorks + STEP + STL files included for all structural parts

---

## 🏗️ System Architecture

```
┌───────────────────────────────────────┐
│           Raspberry Pi 5              │
│                                       │
│  main.py  (Control Loop @ 50 Hz)      │
│    │                                  │
│    ├─► obstacle_avoidance.py          │
│    │     State Machine:               │
│    │     SLITHER → SLITHER_REV        │
│    │              → SLITHER_TURN      │
│    │              → SLITHER           │
│    │                                  │
│    ├─► snake_locomotion.py            │
│    │     Sinusoidal gait generation   │
│    │                                  │
│    └─► servo_driver.py               │
│          Dynamixel SDK calls          │
└──────────────┬────────────────────────┘
               │ USB (Micro-USB)
        ┌──────▼──────┐
        │  ROBOTIS U2D2│ ← USB-to-TTL adapter
        │  + PHB Board │ ← 5V power injection
        └──────┬───────┘
               │ X3P TTL cables (daisy chain)
    ┌──────────▼──────────────────────────┐
    │  Motor 1 ─── Motor 2 ─── ... ─── Motor 10  │
    │     Dynamixel XL330-M288-T          │
    └─────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
git/
├── main.py                     # Entry point: control loop
├── servo_test.py               # Standalone servo testing script
├── requirements.txt            # Python dependencies
├── install_requirements.cmd    # Windows one-click dependency installer
├── hardware_bom.md             # Bill of Materials with costs (budget: ₹1,00,000)
├── starter_kit_manual.md       # Getting started with a single motor
├── SSH_LOGIN_INSTRUCTIONS.md   # How to SSH into the Raspberry Pi
├── Component_flow.png          # System architecture diagram
│
├── src/                        # Core robot logic (Python modules)
│   ├── snake_locomotion.py     # Sinusoidal gait & position calculator
│   ├── kinematics.py           # Joint angle kinematics
│   ├── servo_driver.py         # Low-level Dynamixel SDK wrapper
│   ├── obstacle_avoidance.py   # Current-based collision state machine
│   ├── torque_controller.py    # Torque limits & safety management
│   └── robot_config.py         # Centralized hardware constants
│
├── tests/                      # Hardware validation scripts
│   ├── test_dynamixel_ping.py  # Ping all motors to verify connectivity
│   └── test_motor_feedback.py  # Live motor position, velocity & current readout
│
├── 3d_parts/                   # CAD files for 3D-printed body
│   ├── segment1.SLDPRT / .STEP / .STL
│   ├── segement2.SLDPRT / .STEP / .STL
│   ├── XL,XC-330.stp           # Dynamixel motor reference model
│   └── assembly.SLDASM         # Full robot assembly
│
└── instruction/                # Setup & reference documentation
    ├── raspberry_pi_setup_guide.md
    ├── wiring_diagram.md
    ├── parts_and_safety.md
    └── additional_parts_spreadsheet.md
```

---

## 🛒 Hardware Requirements

| Component | Qty | Approx. Cost |
|---|:---:|---|
| Dynamixel XL330-M288-T (+ 2 spares) | 12 | ₹36,000 |
| ROBOTIS U2D2 (USB-to-TTL adapter) | 1 | ₹4,500 |
| U2D2 Power Hub Board (PHB) | 1 | ₹1,500 |
| Raspberry Pi 4/5 (4 GB) | 1 | ₹5,500 |
| 5V / 10–20A Power Supply *(tethered)* | 1 | ₹2,000 |
| *or* 2S LiPo + 5V UBEC *(untethered)* | 1 | ₹3,500 |
| Dynamixel X3P Cables (pack of 10) | 1 | ₹1,500 |
| F623ZZ Flange Bearings | 10 | ₹1,000 |
| Braided Expandable Sleeving ("skin") | 1 m | ₹2,000 |
| M2 / M2.5 Machine Screw Assortment | 1 | ₹500 |
| **Total** | | **~₹52,500 / ₹1,00,000** |

> See [`hardware_bom.md`](hardware_bom.md) for full specifications and sourcing notes.

---

## ⚙️ Software Setup

### Prerequisites

- Python 3.8+
- A Dynamixel-compatible serial port (USB via U2D2)

### 1. Clone the Repository

```bash
git clone <repo-url>
cd surge090
```

### 2. Install Dependencies

**Windows (one-click):**
```cmd
install_requirements.cmd
```

**Any platform:**
```bash
pip install -r requirements.txt
```

Dependencies: `dynamixel-sdk >= 4.0.5`, `pyserial >= 3.5`

### 3. Set Your COM Port

Open [`main.py`](../../main.py) and verify the serial port matches your system:

```python
# Windows
DEVICENAME = 'COM3'

# Linux / Raspberry Pi
DEVICENAME = '/dev/ttyUSB0'
```

Check the correct port in **Device Manager** (Windows) or with `ls /dev/ttyUSB*` (Linux).

### 4. Assign Motor IDs

All factory Dynamixel motors ship with ID `1`. You must assign unique IDs 1–10 **one at a time** before daisy-chaining:

1. Plug in **one motor** at a time to the U2D2 PHB.
2. Open **Dynamixel Wizard 2.0** on your PC.
3. Scan and change the motor's ID (1 through 10).
4. Unplug, plug in the next motor, repeat.

---

## 🚀 Running the Robot

### Quick Hardware Test (single motor)

```bash
python tests/test_motor_feedback.py
```

This enables torque, holds center position, and streams live **Position / Velocity / Current (mA)** to the terminal. Try forcing the horn with your fingers to see the current spike that drives obstacle detection.

### Ping All Motors

```bash
python tests/test_dynamixel_ping.py
```

Verifies that all 10 motors respond on the TTL bus.

### Single Servo Test

```bash
python servo_test.py
```

### Full Robot — Main Control Loop

```bash
python main.py
```

The snake will initialize all motors, then begin the sinusoidal slither gait. Press **Ctrl + C** to halt and safely disable all motor torques.

---

## 🧠 How It Works

### Locomotion — Lateral Undulation

Each odd-numbered motor is a **yaw** joint (lateral bending); each even-numbered motor is a **pitch** joint (held flat). The gait is produced by a travelling sine wave propagated along the motor chain:

```
position[i] = center + A · sin(ω·t − i·φ)
```

| Parameter | Value | Description |
|---|---|---|
| `amplitude` | 400 ticks | Peak deflection from centre |
| `frequency` | 3.0 | Wave propagation speed |
| `phase_shift` | 1.2 rad | Phase offset between adjacent segments |
| `center_pos` | 2048 | Neutral encoder count (0° for XL330) |

### Obstacle Avoidance — State Machine

The robot uses **motor current as a tactile sensor**. No external hardware is needed.

```
SLITHER ──(current > 350 mA)──► SLITHER_REV (2.5 s)
                                      │
                              (timer expires)
                                      ▼
                              SLITHER_TURN (4.0 s)
                                      │
                              (timer expires)
                                      ▼
                                  SLITHER
```

---

## 🖥️ Connecting to the Raspberry Pi (SSH)

```powershell
ssh smartsnake@snakerobo.local
```

Password: `<REDACTED — set your own; never commit>`

> Ensure the Pi and your PC are on the same network (Wi-Fi or Ethernet). See [`SSH_LOGIN_INSTRUCTIONS.md`](../SSH_LOGIN_INSTRUCTIONS.md) for full details.

---

## 🔌 Wiring Overview

```
Wall Outlet
  └─► 5V/10A Power Supply
        └─► U2D2 PHB (+ and - terminals)
              │
              ├─► U2D2 USB Interface ◄─► Raspberry Pi (USB-A)
              │
              └─► Motor 1 ◄─X3P─► Motor 2 ◄─X3P─► ... ◄─X3P─► Motor 10
```

For the full Mermaid flowchart and step-by-step wiring instructions, see [`wiring_diagram.md`](../wiring_diagram.md).

---

## 📚 Documentation Index

| Document | Description |
|---|---|
| [`hardware_bom.md`](hardware_bom.md) | Full Bill of Materials with pricing |
| [`starter_kit_manual.md`](starter_kit_manual.md) | First-time setup guide (single motor) |
| [`SSH_LOGIN_INSTRUCTIONS.md`](../SSH_LOGIN_INSTRUCTIONS.md) | SSH into the Raspberry Pi |
| [`raspberry_pi_setup_guide.md`](../raspberry_pi_setup_guide.md) | Configure the Raspberry Pi OS |
| [`wiring_diagram.md`](../wiring_diagram.md) | Full wiring flowchart & instructions |
| [`parts_and_safety.md`](../parts_and_safety.md) | Safety guidelines |
| [`additional_parts_spreadsheet.md`](../../../gen2-st3215/docs/additional_parts_spreadsheet.md) | Supplementary parts list |

---

## 🔮 Future Roadmap

- [ ] Head-mounted distance sensor (HC-SR04 / VL53L0X) via ESP32 over Bluetooth
- [ ] 3D terrain navigation (pitch joint activation for vertical obstacles)
- [ ] ROS 2 integration for telemetry and remote control
- [ ] Wireless live dashboard (motor states, current draw, gait mode)

---

## 📄 License

This project is developed as part of the **SURGE-090** research initiative. All rights reserved by the project team.

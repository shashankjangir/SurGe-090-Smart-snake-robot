# SURGE-090 Parts and Safety — Gen 2 (ST3215, split power bus v3)

> **Updated 24 Sep 2026.** What we did before and what we do now is recorded in [What changed](#what-changed) at the end of this file.

Current hardware for the Gen 2 robot. Source of truth for the full BOM and budget:
[`hardware/Updated_Hardware_Inventory.md`](hardware/Updated_Hardware_Inventory.md).
Wiring: [`4_WIRING_DIAGRAM.md`](4_WIRING_DIAGRAM.md). Gen 1 (Dynamixel XL330) parts and safety notes are kept in
[`../gen1-dynamixel/docs/parts_and_safety.md`](../gen1-dynamixel/docs/parts_and_safety.md) — that hardware is no longer in use.

## Parts on hand

| # | Part | Qty | Role |
|:---:|---|:---:|---|
| 1 | Waveshare ST3215 serial bus servo (6–12.6 V, 2.94 N·m, 2.7 A stall @ 12 V) | 10 | Joints ID 1–10 |
| 2 | Waveshare Servo Driver with ESP32 | 1 | Servo bus master + robot MCU (`robot_esp32_v2`) |
| 3 | ESP32 dev board #2 | 1 | Base station ESP-NOW receiver (`base_esp32`) |
| 4 | 3S LiPo 1800 mAh (11.1 V nom, 12.6 V full) | 1 | Robot power |
| 5 | Mean Well LRS-100-5 (5 V 20 A) | 1 | Base station / bench 5 V only |
| 6 | XL6009 boost converter | 1 | 5 V → 12 V bench rail for **one** servo (ID setting) |
| 7 | Raspberry Pi 5, 8 GB | 1 | Base station compute |
| 8 | Raspberry Pi Camera Module 3 (CSI-2) | 1 | Vision on the Pi 5 |
| 9 | MPU6050 IMU | 1 | Orientation, I²C on GPIO 21/22 |

Still to buy (fuses, loop key, inject-board parts, charger, cables, printing, friction pads):
see [`6_ADDITIONAL_PARTS.md`](6_ADDITIONAL_PARTS.md).

---

## ⚡ Safety protocols and voltage limits ⚡

> [!CAUTION]
> **ST3215 servos need 6.0–12.6 V.** Never feed the servo line from the Mean Well 5 V supply or any 5 V rail,
> and never exceed a fully charged 3S pack (12.6 V).

### 1. Servo power (12 V main line)
- Power comes from the 3S LiPo through a **15 A main fuse** and an **XT60 loop key**, then along the main line
  to **5 inject boards**, each with its own **3 A fuse** feeding 2 servos (split bus v3).
- The driver board's servo-port +V wire is **cut**: the board sends only DATA + GND to the servos.
- Walking draw is ~3–5 A total. All 10 servos stalled is ~27 A — the per-group 3 A fuses open first.
- Check polarity at every inject board with a meter before plugging in a servo.

### 2. Controller and logic power
- The Servo Driver is powered from a **buck set to 7.5 V** off the main line. Set and measure the buck **before** connecting the board.
- ESP32 GPIOs are **3.3 V only**. Any head distance sensor must be 3.3 V-safe: use **HC-SR04P** (not HC-SR04) or a VL53L0X.
- Raspberry Pi 5 needs its own **5 V 5 A USB-C** supply. Do not power it from the robot.

### 3. LiPo handling
- Keep the loop key **out** while wiring or working on the robot.
- Charge only with a balance charger (e.g. iMAX B6) in a LiPo-safe bag, never unattended.
- Minimum 3.0 V/cell (9.0 V). Stop using the pack at 3.4 V/cell under load.
- Verify the pack's **connector type and C-rating** from its label (≥ 15C needed for the worst-case load).
- A hardware LiPo alarm or BMS is **still recommended** in addition to the firmware cutoff below.

### 4. Firmware safety (`robot_esp32_v2`)
| Protection | Setting |
|---|---|
| Power-up state | Torque **off** — nothing moves until `RUN` |
| Soft start | One power group at a time, 400 ms apart, then amplitude ramps in over 3 s |
| Joint limit | ±70° (v6 segment mechanical limit is ±80°) |
| Torque limit | 70 % |
| Stall / collision | 1200 mA for 4 consecutive samples → reverse and turn away (calibrate on hardware) |
| Low battery | Stops at 10.2 V (3.4 V/cell) held for 3 s |
| Over-temperature | Stops at 70 °C |
| Emergency | `STOP` → torque off immediately, horns go limp |

### 5. Bring-up rules
- All ST3215s ship as **ID 1**. Set IDs 1–10 **one servo at a time** (`assign_ids` firmware or `tools/assign_id.py`)
  before connecting them in a chain.
- Connect and test one power group at a time (`PING` after each).
- Use `CENTER` when fitting servo horns so every joint is straight.

---

## What changed

### 24 Sep 2026

| Topic | Before | Now | Why |
|---|---|---|---|
| Parts on hand | Pi 4, U2D2 + PHB, 2× XL330, 5 V 10 A supply, ESP32 | 10× ST3215, Servo Driver with ESP32, 2nd ESP32, 3S LiPo, Pi 5, Camera 3, MPU6050 | Moved to Gen 2 hardware |
| Voltage limit | Never exceed 6.0 V (XL330) | Keep servos within 6.0–12.6 V; never feed 5 V | ST3215 range |
| Protection | Software current threshold only | 15 A + 5 × 3 A fuses, loop key, firmware limp boot / soft start / ±70° / 10.2 V / 70 °C stops | LiPo on the robot needs hardware protection |

<details>
<summary>Previous version of this document (before 24 Sep 2026) — Gen 1 Dynamixel</summary>

# SURGE-SNAKE Parts and Safety Protocol

## Parts Ordered (Existing Inventory)
1. **SD card (32GB A1 class 10)** - For Raspberry Pi OS.
2. **Raspberry Pi 4 Model B (4GB RAM)** - Main compute brain.
3. **Power Adapter (USB-C 5V 3A)** - Dedicated power for the Raspberry Pi.
4. **Raspberry Pi Heat Sink (Double Fans)** - Cooling for Pi.
5. **Dynamixel XL330-M288-T (x2)** - Smart servos for the joints (currently 2 for testing).
6. **U2D2 USB Interface** - Translates USB to TTL half-duplex for the Dynamixels.
7. **U2D2 PHB Power Hub Board** - Distributes power and signals to the daisy-chained Dynamixels.
8. **Robot Cable X3P 180mm** - TTL cables to connect motors.
9. **Power Supply (5V 10A - 50W)** - Power source for the Dynamixel network.
10. **ESP32 (38 pin WiFi + Bluetooth)** - Sensor node/secondary controller.

## Missing Parts (To Be Ordered)
Based on the plan for a 10-motor serpentine robot:

1. **Additional Dynamixel XL330-M288-T (x8):** To complete the 10-motor setup (5 pitch, 5 yaw).
2. **Dynamixel X3P Cables (x8):** Need more cables to daisy-chain the new motors.
3. **Mechanical Brackets / Frame:**
   - 3D Printed custom links OR BIOLOID frame components to mechanically connect the motors in alternating Pitch/Yaw configurations.
4. **Friction Pads (CRITICAL):**
   - TPU feet, rubber pads, or passive wheels (that only roll forward/back) attached to the underside of the snake. *Required for Friction Anisotropy so the snake pushes forward instead of wriggling in place.*
5. **Front Obstacle Sensor:** 
   - 1x **HC-SR04** (Ultrasonic) or **VL53L0X** (Time-of-Flight) module to attach to the ESP32 for head-on obstacle detection.
5. **Miscellaneous Wiring:** 
   - Jumper wires to connect ESP32 and sensors.
   - 18 AWG wires to connect the 5V 10A Power Supply to the U2D2 PHB Terminal block.

---

## ⚡ Safety Protocols & Voltage Limits ⚡

> [!CAUTION]
> **CRITICAL: NEVER exceed 6.0V on the Dynamixel XL330 network!**

### 1. Motor Power Line (5V System)
- **Component Limit:** Dynamixel XL330-M288-T operates safely between **3.7V and 6.0V**.
- **Current Setup:** You are using a 5V 10A power supply. This is **PERFECT** and very safe. The U2D2 PHB simply passes the input voltage directly to the motors.
- **Safety Rule:** Ensure the polarity (+ and -) from the 5V power supply to the U2D2 PHB terminal block is correct. Reversing the polarity will permanently damage the U2D2 PHB and the motors.

### 2. Microcontroller Power Limits
- **Raspberry Pi 4:** Must be powered via its official 5V 3A USB-C adapter. Do not back-power it from the U2D2 PHB. Keep the logic connections (USB from Pi to U2D2) isolated from the motor power supply.
- **ESP32:** Can be powered via USB (5V) or via its VIN/VCC pin (5V). Its GPIO pins are **3.3V logic ONLY**. Do not connect a 5V sensor output directly to an ESP32 GPIO pin without a logic level shifter or a voltage divider.

### 3. Untethered / Battery Operation (Future Upgrade)
If you decide to make the snake wireless, you cannot plug a 2S LiPo battery (7.4V - 8.4V) directly into the U2D2 PHB, as it will fry the 6.0V limit XL330 motors.
- **Required Safety Barrier:** You will need a **5V Buck Converter (Step-Down Module)** rated for at least 10 Amps to sit between the LiPo battery and the U2D2 PHB.

### 4. Overcurrent & Stall Safety
The Python code includes software safety limits to prevent motors from burning out if the snake gets stuck on an obstacle:
- We read the `Present_Current` of each Dynamixel. 
- If the current exceeds a set threshold (e.g., indicating a stall or collision), the robot will automatically halt and execute an avoidance maneuver.

</details>

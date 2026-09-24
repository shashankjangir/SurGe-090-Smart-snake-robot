# SURGE-090 Additional Parts — Gen 2 (ST3215, split power bus v3)

> **Updated 24 Sep 2026.** What we did before and what we do now is recorded in [What changed](#what-changed) at the end of this file.

Everything still needed to finish the Gen 2 robot, **excluding the servos, driver, LiPo, Pi 5, camera and IMU**
(already on hand — see [`5_PARTS_AND_SAFETY.md`](5_PARTS_AND_SAFETY.md)).
Prices are the estimates from [`hardware/Updated_Hardware_Inventory.md`](hardware/Updated_Hardware_Inventory.md);
"—" means not yet priced. The Gen 1 (Dynamixel) list is in `gen1-dynamixel/docs/reports/hardware_bom.md`.

## 🔴 Critical — power protection (buy before first power-up)

| Part | Spec | Qty | Est. ₹ |
|---|---|:---:|:---:|
| Main inline fuse + holder | 15 A (mini blade) | 1 | 200 |
| XT60 loop key | Master ON/OFF in the main line | 1 | 200 |
| LiPo alarm or BMS | 3S, low-voltage buzzer | 1 | 300 |

## 🟠 Split bus v3 — inject boards and wiring

| Part | Spec | Qty | Est. ₹ |
|---|---|:---:|:---:|
| Perfboard (small) | One inject board per power group | 5 | — |
| Group fuses | 3 A mini blade + inline holder, **or** 3 A PTC resettable | 5 | — |
| Capacitors | 470 µF 25 V electrolytic, one per inject board | 5 | — |
| 3-pin plug pairs | 5264-style, matching the ST3215 lead | 5 | — |
| Buck converter | Adjustable, set to 7.5 V, feeds the Servo Driver DC jack | 1 | — |
| Main-line wire | 16–18 AWG silicone, red + black, + heat-shrink | 2 m | 500 |
| Tap wire | 20–22 AWG silicone | ~1 m | — |
| XT60/XT30 connectors + pigtails | Match the LiPo connector (verify from label) | 2 | 200 |
| Servo daisy-chain cables | 3-pin TTL, ST3215 compatible | 12 | 500 |
| 1000 µF 25 V low-ESR capacitor | Inrush suppression near the battery (from the original plan) | 1 | 100 |

## 🟡 Charging and storage

| Part | Spec | Qty | Est. ₹ |
|---|---|:---:|:---:|
| Balance charger | iMAX B6 or equivalent, 3S | 1 | 2,500 |
| LiPo-safe bag | Fire-resistant charging/storage bag | 1 | 400 |

## 🟢 Mechanical

| Part | Spec | Qty | Est. ₹ |
|---|---|:---:|:---:|
| PLA+ filament | 1.75 mm, for 10 × v6 segments | 1 kg | 1,500 |
| F623ZZ flange bearings | Horn-opposite side of each joint | 10 | 1,000 |
| M2 / M2.5 machine screws | Assorted kit | 1 | 500 |
| Friction pads or TPU belly feet | **Critical for locomotion** — anisotropic belly friction | 10 | 500 |

## 🔵 Sensors and base station

| Part | Spec | Qty | Est. ₹ |
|---|---|:---:|:---:|
| Head distance sensor | **HC-SR04P** (3.3 V-safe) or VL53L0X — not the 5 V HC-SR04 | 1 | 300 |
| Pi 5 power supply | 5 V 5 A USB-C | 1 | 1,000 |
| CSI camera extension cable | Only if the camera goes on the robot body | 1 | — |

---

### Notes
1. **Fuses vs PTCs:** PTCs are smaller and reset themselves; blade fuses are cheaper and easier to see when blown.
   If fuses trip at power-up, the v2 firmware already soft-starts one group at a time — use 4 A only if it still trips.
2. **Cable tunnel:** check that the Ø8 mm tunnel in each v6 segment fits 2 main-line wires plus the servo lead before buying wire.
3. **Friction pads:** strips of adhesive anti-slip rubber on the belly work; TPU printing is optional.
4. **No logic level shifter needed** if you use the HC-SR04P or VL53L0X.

---

## What changed

### 24 Sep 2026

| Topic | Before | Now | Why |
|---|---|---|---|
| Cables | Dynamixel X3P packs | 3-pin ST3215 cables + split bus v3 inject-board parts | Different servo and power design |
| Battery | Optional 2S LiPo + 5 V 10 A buck | 3S LiPo already on hand; need fuses, loop key, alarm, charger | ST3215 runs on 12 V directly |
| Head sensor | HC-SR04 + logic level shifter | HC-SR04P (3.3 V-safe) or VL53L0X, no shifter | ESP32 pins are 3.3 V only |
| Prices | Retail links | Estimates from the hardware inventory; new v3 parts not yet priced | Keep one source for costs |

<details>
<summary>Previous version of this document (before 24 Sep 2026) — Gen 1 Dynamixel</summary>

# SURGE-SNAKE Additional Parts Spreadsheet

This document outlines everything else you need to complete the SURGE-SNAKE robot, explicitly **excluding the motors**. The items are separated into expensive structural/power upgrades and standard electronic components.

## 🔴 Expensive / Major Components
*These components represent the bulk of the remaining non-motor budget, primarily focusing on the mechanical structure and untethering the robot from the wall.*

| Component Name | Detailed Specifications | QTY | Est. Price (₹) | Trusted Product Link |
| :--- | :--- | :---: | :---: | :--- |
| **Robot Cable-X3P 180mm** | 3-pin JST TTL cables for Dynamixel X-Series. (Usually sold in packs of 10). You need these to daisy chain the remaining 8 joints. | 1 Pack | 2,659 | [MG Super Labs](https://www.mgsuperlabs.co.in/estore/Robot-Cable-X3P-180mm-10pcs) |
| **3D Printer Filament (PLA+)** | 1kg Spool, 1.75mm. Required to 3D print the custom U-brackets that connect the motors in the alternating pitch/yaw format. | 1 | 1,400 | [Robocraze (eSUN PLA+)](https://robocraze.com/products/esun-pla-pro-filament) |

---

## 🟢 Standard Components & Sensors
*These are the cheaper, everyday electronic components required for sensing, wiring, and friction.*

| Component Name | Detailed Specifications | QTY | Est. Price (₹) | Trusted Product Link |
| :--- | :--- | :---: | :---: | :--- |
| **High-Discharge 2S LiPo Battery** | 7.4V, ~2200mAh, 30C+ discharge rate. (Only needed if you want the snake to be completely wireless). | 1 | 1,200 | [Robocraze (Orange LiPo)](https://robocraze.com/collections/lipo-battery) |
| **VL53L0X Laser ToF Sensor** | High-precision Time-of-Flight laser ranging sensor for the head of the snake. Better accuracy than Ultrasonic. | 1 | 450 | [Robocraze (VL53L0X)](https://robocraze.com/products/gy-53-vl53l0x-laser-tof-flight-time-range-sensor-module) |
| **HC-SR04 Ultrasonic Sensor** | *Alternative to VL53L0X.* Cheaper, bulkier acoustic distance sensor. | 1 | 85 | [Robocraze (HC-SR04)](https://robocraze.com/products/ultrasonic-sensor-hc-sr04) |
| **5V 10A DC-DC Buck Converter** | Step-down module. **CRITICAL** if you buy the 7.4V LiPo battery. It drops the 7.4V down to the safe 5.0V needed for the XL330 motors. | 1 | 600 | [ElectronicsComp / Robocraze](https://robocraze.com/collections/step-down-buck-converter) |
| **Logic Level Shifter** | 4-channel bi-directional (3.3V to 5V). Protects the ESP32's 3.3V pins if you use a 5V sensor. | 1 | 60 | [Robocraze (Level Shifter)](https://robocraze.com/products/4-channel-iic-i2c-logic-level-converter) |
| **Jumper Wires (M-F & F-F)** | 40-pin ribbon cables (Dupont). Needed to wire the front sensor to the ESP32. | 1 Set | 120 | [Robocraze (Jumper Wires)](https://robocraze.com/products/jumper-wires-male-to-female-40-pcs) |
| **18 AWG Silicone Wire** | 1 Meter Red, 1 Meter Black. Thick wire to connect the 5V 10A Power Supply to the U2D2 PHB Terminal Block safely. | 1 | 150 | [Robocraze (Silicone Wire)](https://robocraze.com) |
| **TPU Filament OR Rubber Pads** | **CRITICAL for Locomotion.** Anti-slip rubber adhesive pads (or 3D printed TPU feet) for the underside of the brackets to provide Friction Anisotropy. | 1 Pack | 200 | [Amazon India (Rubber Pads)](https://www.amazon.in) |

---

### Usage Notes:
1. **Friction Pads:** You can simply buy a sheet of adhesive 3M rubber anti-slip pads from Amazon or a local hardware store and cut them into strips for the belly of the snake. You do not need to 3D print these if you don't have TPU filament.
2. **LiPo Battery:** If you stick to using the tethered 5V 10A power supply you already ordered, you can completely ignore the LiPo Battery and the 5V Buck Converter.
3. **Cables:** Ensure the Dynamixel cables you buy are exactly **X3P** (JST connectors), as older Bioloid AX-12 cables will not fit the XL330.

</details>

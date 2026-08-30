# Hardware Bill of Materials — Gen 1 / Dynamixel XL330 (HISTORICAL)

> [!CAUTION]
> **This BOM is a historical record of the Gen 1 design.** None of this hardware is still held.
> The Dynamixel XL330 motors were unobtainable in India at the required quantity (10 units),
> which ended the Gen 1 approach and forced the redesign around Waveshare ST3215 servos (Gen 2).
>
> **Current hardware inventory:** [`Updated_Hardware_Inventory.md`](../../../Updated_Hardware_Inventory.md)
> and [`gen2-st3215/docs/additional_parts_spreadsheet.md`](../../../gen2-st3215/docs/additional_parts_spreadsheet.md)

**Original Budget:** ₹1,00,000 (SURGE Grant, IIT Delhi, Summer 2026)

---

## 1. Core Actuators (Servos) — *Planned: 10 Units, Obtained: 2*

| Component | Specs & Torque | Qty Planned | Qty Obtained | Approx. Cost (per unit) | Role in Robot |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Dynamixel XL330-M288-T** | 0.52 Nm @ 5V, 12-bit abs encoder, 18g, Protocol 2.0 | 10 | **2** | ~₹3,000 | Core joints — position, velocity, and current feedback at 50 Hz. |
| **Spare Motors** | Same as above | 2 | **0** | ~₹3,000 | Recommended spares — never purchased. |

> **Why only 2?** The XL330-M288-T was out of stock at all Indian distributors throughout summer
> 2026. International shipping lead times exceeded the SURGE programme timeline. This shortage
> is what triggered the pivot to **Waveshare ST3215** servos (Gen 2), which are **5.6× stronger**
> (2.94 N·m vs 0.52 N·m) and readily available in India.

---

## 2. Computing Brain & Interface

| Component | Specs | Qty | Status | Approx. Cost | Role in Robot |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Robotis U2D2** | USB to TTL Converter, Protocol 2.0 | 1 | ~~Obtained~~ → **Returned/gone** | ~₹4,500 | USB-to-TTL bridge for Dynamixel bus. |
| **Robotis U2D2 Power Hub Board (PHB)** | Power Injector for 5V rail | 1 | ~~Obtained~~ → **Returned/gone** | ~₹1,500 | Combined power + data for daisy-chained motors. |
| **Raspberry Pi 4 (4GB RAM)** | Linux OS, USB-C Power | 1 | ~~Obtained~~ → **Returned/gone** | ~₹5,500 | On-board compute brain running `main.py`. |
| **32GB SD Card (A1 Class 10)** | For Pi OS | 1 | ~~Obtained~~ → **Returned/gone** | ~₹500 | Raspberry Pi OS storage. |
| **Pi Heat Sink (Double Fans)** | Active cooling | 1 | ~~Obtained~~ → **Returned/gone** | ~₹400 | Thermal management during continuous control loop. |
| **5V 3A USB-C Power Adapter** | Dedicated Pi power | 1 | ~~Obtained~~ → **Returned/gone** | ~₹500 | Isolated power for Pi (never back-power from motor rail). |

---

## 3. Power Supply

The XL330 requires **5 Volts** (max 6.0V). This is **fundamentally different** from the Gen 2 ST3215 which requires **6.0–12.6V** (a 12V rail). Applying 12V to XL330 hardware would destroy it.

| Component Option | Specs | Approx. Cost | Status |
| :--- | :--- | :--- | :--- |
| **Mean Well LRS-100-5 (Tethered)** | 5V, 20A, 100W Industrial SMPS | ~₹2,000 | **Carried forward to Gen 2** — now serves as base station / bench supply. Cannot power ST3215 servos directly (below 6.0V min). Used with XL6009 boost converter for single-servo bench tests. |
| **2S LiPo Battery + 5V UBEC (Untethered)** | 7.4V LiPo + 10A 5V Step-Down | ~₹3,500 | **Never purchased** — superseded by 3S LiPo 1800mAh in Gen 2 (direct 12V to servo bus, no conversion needed). |

---

## 4. Wiring & Mechanical Setup

| Component | Specs | Approx. Cost | Status |
| :--- | :--- | :--- | :--- |
| **Dynamixel X3P Cables** | 100–150 mm lengths (Pack of 10) | ~₹1,500 | **Gone** with Dynamixel hardware |
| **Robot Cable X3P 180mm** | TTL cables for motor connections | ~₹500 | **Gone** with Dynamixel hardware |
| **F623ZZ Flange Bearings** | Load relief bearings (×10) | ~₹1,000 | **Not purchased** — still needed for Gen 2 build |
| **Braided Expandable Sleeving** | Rubberized mesh tube ("skin"), 1m | ~₹2,000 | **Not purchased** — still needed for Gen 2 |
| **M2 & M2.5 Machine Screws** | Assorted Kit | ~₹500 | **Not purchased** — still needed for Gen 2 |

---

## 5. Sensors (Gen 1 Plan)

| Component | Specs | Status |
| :--- | :--- | :--- |
| **ESP32 (38-pin, WiFi + Bluetooth)** | Sensor node / secondary controller | **Carried forward** — ESP32 dev boards now used for Gen 2 (robot + base station) |
| **HC-SR04 / VL53L0X** | Head-mounted distance sensor | **Never purchased** — replaced by Camera Module 3 in Gen 2, but HC-SR04P still recommended for real-time obstacle distance |

---

## Summary

| Metric | Value |
| :--- | :--- |
| **Estimated cost of Gen 1 plan (if fully built)** | ~₹52,500 / ₹1,00,000 budget |
| **Actual spend before pivot** | ~₹22,400 |
| **Budget remaining after Gen 1** | ~₹77,600 (applied to Gen 2 procurement) |

### What carried forward to Gen 2:
| Item | Gen 1 Role | Gen 2 Role |
| :--- | :--- | :--- |
| Mean Well LRS-100-5 | Servo power (5V direct) | Base station / bench supply (5V → XL6009 boost for 1-servo tests) |
| ESP32 dev boards | Sensor node (secondary) | Robot master MCU + base station ESP-NOW receiver |
| Budget allocation | ~₹77,600 remaining | Applied to ST3215 servos, LiPo, Pi 5, camera, IMU |
| Software architecture | Gait engine, stall FSM, evasion SM | Ported to Feetech protocol with updated thresholds (1200 mA vs 350 mA) |

### What was lost:
- Dynamixel XL330 ×2, U2D2, PHB, X3P cables, Raspberry Pi 4, SD card, heatsink, power adapter
- The Gen 1 Python stack (`dynamixel-sdk`, `DynamixelAddr` control table) has **no hardware it can run on**

---

> **See also:**
> - [`Updated_Hardware_Inventory.md`](../../../Updated_Hardware_Inventory.md) — Full current inventory with power architecture
> - [`gen2-st3215/docs/additional_parts_spreadsheet.md`](../../../gen2-st3215/docs/additional_parts_spreadsheet.md) — Detailed Gen 2 parts audit
> - [`gen2-st3215/PORTING_STATUS.md`](../../../gen2-st3215/PORTING_STATUS.md) — Gen 1 → Gen 2 porting notes

# SURGE-090 — Hardware Inventory (Gen 2 / ST3215)

> **Status:** Physical inventory as of **2026-08-24**. This document replaces the earlier
> XL330-era parts list that previously occupied this file. Everything in §1 is **in hand**.
> None of the Gen 1 Dynamixel hardware remains — see §2.
>
> Where this document and `progress/electrical_system_report.tex` disagree, **this document is
> current**; the report describes a power architecture (2× LiPo, Bus Servo Adapter (A), Mini560)
> that no longer matches the parts on the bench.

---

## 1. In Hand

8 line items, 17 physical units.

| # | Component | Qty | Key Specs | Source of Spec | Cost (₹) |
| :-: | :--- | :-: | :--- | :--- | :--- |
| 1 | **Waveshare Servo Driver with ESP32** | 1 | Bus servo driver board with an **ESP32 module onboard**; drives ST3215 serial bus servos over half-duplex TTL. | ⚠ input voltage range, onboard 5 V logic regulation, and current-monitor availability **not yet verified against the Waveshare wiki** | — |
| 2 | **Waveshare ST3215 serial bus servo** | 10 | 6.0–12.6 V (nominal 11.1–12.0 V); 30 kg·cm ≈ **2.94 N·m @ 12 V**; **2.7 A stall @ 12 V**; 1 Mbps half-duplex TTL; magnetic encoder. Factory default ID = 1 on every unit. | `electrical_system_report.tex` §Servo | — |
| 3 | **ESP32 dev board** (second unit) | 1 | Separate from the ESP32 on the driver board. Available as the ESP-NOW peer, sensor node, or spare. 3.3 V GPIO logic. | — | — |
| 4 | **Mean Well LRS-100-5 SMPS** | 1 | **5 V, 20 A, 100 W** tethered supply. Carried over from the Gen 1 5 V design. **Below the ST3215 6.0 V minimum — cannot feed the servo bus directly.** | Mean Well part number | — |
| 5 | **XL6009 boost converter module** | 1 | Step-**up** DC-DC. Intended role: **5 V LRS-100-5 → 12 V bench rail**. See §3 for the current budget — this path does not scale to 10 servos. | ⚠ continuous output rating **unverified**; the widely-quoted "4 A" is a switch/input limit, not 4 A at the output | — |
| 6 | **LiPo 3S 1800 mAh** | 1 | 11.1 V nominal / 12.6 V charged / 9.0 V floor at 3.0 V per cell. **20.0 Wh**. Directly in the ST3215 range — no conversion needed for the servo rail. | ⚠ C-rating not recorded — confirm from the pack label | — |
| 7 | **Raspberry Pi Camera Module 3** | 1 | 12 MP IMX708, autofocus, **CSI-2 ribbon interface**. | Raspberry Pi product line | — |
| 8 | **MPU6050 IMU** | 1 | 6-axis accel + gyro, I²C, default address **0x68**, 3.3 V-safe. Matches the address the root README already assumes. | Confirmed by you, 2026-08-24 | — |

Cost column left blank deliberately — fill it from actual receipts rather than the estimates
that were in the old version of this file. The ₹1,00,000 SURGE grant reconciliation needs real
numbers, and the previous estimates were never reconciled against spend.

---

## 2. No Longer Held

The Gen 1 Dynamixel hardware is **gone** — treat `gen1-dynamixel/` as a historical record, not
an equipment list. Specifically retired: 2× Dynamixel XL330-M288-T, U2D2 USB interface, U2D2
Power Hub Board, Robot Cable X3P, Raspberry Pi 4 + SD card + heatsink.

Consequence: the Gen 1 Python stack (`dynamixel-sdk`, `DynamixelAddr` control-table addresses in
`src/robot_config.py`) now has **no hardware it can run on**. `robot_config.py` still declares
`MAX_TORQUE_NM = 0.52` and a 350 mA stall threshold — both XL330 figures. On ST3215 the
equivalents are 2.94 N·m and a stall current near 2.7 A, roughly **8× the current threshold**.
Until that file is ported, the obstacle-detection logic will not trip.

Also specified in `electrical_system_report.tex` but **not owned**: Bus Servo Adapter (A)
(superseded by item 1), Mini560-5V buck, a second 3S pack, 2× 15 A blade fuses and holders,
1000 µF 25 V low-ESR capacitor, XT60 loop key and Y-harness.

---

## 3. Power Rails — Arithmetic

**Requirement.** 10 × 2.7 A stall = **27 A at 12 V = 324 W** worst case (all joints stalled
simultaneously). Real undulation draw is far lower, but the peak sets the fuse and wire sizing.

**Tethered path (LRS-100-5 → XL6009 → 12 V).** The supply itself is the first hard ceiling:
100 W total, so **8.3 A at 12 V at 100% efficiency, ~7.5 A at 90%** — about **3.2× short** of
worst-case stall before the converter is even considered.

The boost ratio then makes it worse. For a 5 V → 12 V conversion, input current is
`(12/5) / η × I_out ≈ 2.7 × I_out`:

| Output at 12 V | Power out | Input current at 5 V |
| :-: | :-: | :-: |
| 0.5 A | 6 W | 1.3 A |
| 1.0 A | 12 W | 2.7 A |
| 1.5 A | 18 W | 4.0 A |
| 2.0 A | 24 W | 5.3 A |
| 3.0 A | 36 W | 8.0 A |

A single XL6009 module reaches its commonly-quoted 4 A limit at roughly **1.5 A of 12 V output**
— on the order of **one or two servos under light load**. Treat this path as a *single-joint
bench rail for ID programming and one-servo tests*, not as a robot supply. Verify the module's
actual rating before trusting even that, and expect it to need heatsinking.

**Untethered path (3S LiPo → 12 V direct).** The pack sits inside the ST3215 6.0–12.6 V window,
so it needs **no conversion at all** for the servo rail — this is the correct way to power the
robot, and the XL6009 is not in this path. Runtime from 20.0 Wh, at 80% depth of discharge:

| Average draw | Runtime (80% DoD) |
| :-: | :-: |
| 2 A | ≈ 43 min |
| 4 A | ≈ 22 min |
| 6 A | ≈ 14 min |

Down from the report's assumed 33.3 Wh (2× 1500 mAh) to 20.0 Wh — roughly **40% less energy**,
and a single pack cannot supply 27 A unless its C-rating is 15C or better.

**Safety architecture changes with one pack.** The report's five-layer scheme is built around
*two* packs: per-pack 15 A fuses placed upstream of a Y-junction specifically so a shorted cell
in one pack cannot reverse-charge the other. With a single pack that reverse-charge failure mode
disappears, but you still need **one inline fuse, the loop-key disconnect, and the bulk
capacitor** — and none of those three are currently in inventory.

---

## 4. Open Gaps

**The camera has no host.** Camera Module 3 is a **CSI-2 ribbon** device. It cannot connect to an
ESP32 by any adapter — no SPI/I²C path exists for it. With the Gen 1 Pi 4 gone, this part is
unusable until a Raspberry Pi is available. The Gen 2 architecture assumes a Pi 5 base station
for ESP-NOW telemetry anyway, so confirm whether the lab Pi 5 is yours to use; if it is, add it
to §1, because two separate parts of the design depend on it.

**5 V logic rail unconfirmed.** The Mini560 is gone. If the Waveshare driver board regulates 5 V
for its onboard ESP32 from the 12 V input, nothing more is needed — that is the likely case, but
it is item 1's unverified spec and worth a multimeter check before the second ESP32 or the MPU6050
is wired in.

**Not yet acquired, needed for a physical build:** PLA+ filament (or printed `cad/segments/v4`
parts — note v4, **not** v5; see the CAD regression), M2/M2.5 fasteners, F623ZZ flange bearings
for the horn-opposite side, friction pads or TPU feet for the belly, XT60 connectors and loop
key, inline fuse and holder, 1000 µF 25 V low-ESR capacitor, low-voltage cell buzzer,
LiPo-safe balance charger and storage bag, 18 AWG silicone wire, and a front distance sensor
(HC-SR04**P** — the 3.3 V-safe variant — or VL53L0X).

**Servo IDs.** All ten ST3215 units ship as ID 1. They must be programmed to unique IDs 1–10
*individually*, before assembly, or the bus will collide. The programming sketch is in
`electrical_system_report.tex`. This is the one task the XL6009 bench rail is actually sized for.

---

## 5. Specs To Verify

Four things in this document are marked ⚠ because they came from memory or convention rather than
a datasheet, and this project has a history of unsourced hardware claims:

1. Waveshare Servo Driver with ESP32 — input voltage range, onboard 5 V regulation, current sensing.
2. XL6009 — actual continuous output current at 12 V from a 5 V input.
3. LiPo 3S 1800 mAh — C-rating, hence maximum discharge current.
4. Whether a Raspberry Pi 5 is available to you for the camera and base station.

Resolve 1 and 2 from vendor documentation, 3 from the pack label, and 4 with your supervisor.

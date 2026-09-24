# Smart Snake Robot — Updated Hardware Inventory

> **Updated 24 Sep 2026.** What we did before and what we do now is recorded in [What changed](#what-changed) at the end of this file.

**Date Updated:** 24 September 2026 (power design → split bus v3, firmware → `robot_esp32_v2`)  
**Status:** Phase 3 (Fabrication & Assembly)  
**Generation:** Gen 2 — Waveshare ST3215 (Gen 1 Dynamixel XL330 hardware is gone — see [`gen1-dynamixel/`](../../gen1-dynamixel/) for historical record)

---

## Current Equipment On Hand

### Motors & Driver
- [x] **10× Waveshare ST3215 servos** (6–12.6V, 1 Mbps half-duplex TTL, 2.7A stall, 30 kg·cm ≈ 2.94 N·m @ 12V)
  - 12-bit magnetic absolute encoder (0–4095, center 2048)
  - Feetech SMS/STS protocol 1, half-duplex
  - **All ship as ID 1** — must assign IDs 1–10 individually before daisy-chaining
  - ID assignment: use `firmware/assign_ids/` (Arduino) or `tools/assign_id.py` (Python via bridge)
- [x] **Waveshare Bus Servo Driver with integrated ESP32**
  - Built-in ESP32 on the driver board
  - Servo UART: **GPIO 18 RX / GPIO 19 TX**, 1 Mbps (if ping is silent, swap pins)
  - UART interface to servo bus
  - Simplifies wiring compared to external adapter + separate MCU
  - ⚠ Input voltage range, onboard 5V logic regulation, and current-monitor availability **not yet verified against Waveshare wiki**

### Microcontrollers
- [x] **ESP32 dev board #1** (on Waveshare servo driver) — runs either `usb_servo_bridge` (bench) or `robot_esp32_v2` (field), mutually exclusive
- [x] **ESP32 dev board #2** (for base station) — runs `base_esp32` firmware, receives ESP-NOW telemetry, forwards to Pi 5 via USB serial @ 115200 baud

### Power Supply
- [x] **Mean Well LRS-100-5** (industrial 5V power supply, 100W, regulated)
  - Output: 5V @ 20A continuous
  - Input: 90–264V AC universal
  - **⚠ Below the ST3215 minimum of 6.0V — CANNOT feed the servo bus directly**
  - Role: Base station / Pi 5 / ESP32 power, or input to XL6009 boost for single-servo bench tests
  
- [x] **1× 3S LiPo 1800mAh battery**
  - Nominal voltage: 11.1V (3.7V × 3 cells)
  - Charged voltage: 12.6V, floor: 9.0V (3.0V per cell)
  - Energy: 20.0 Wh (down from originally planned 33.3 Wh with 2× 1500mAh)
  - Connector type: ⚠ **TBD — verify from pack label (XT60 / XT30 / Deans)**
  - Discharge rating: ⚠ **TBD — verify C rating from pack label** (need ≥15C for 27A worst-case stall)
  - **This is the correct robot power source** — sits directly in the ST3215 6.0–12.6V range; distributed by **split power bus v3** (see [`power_split_bus_v3.md`](power_split_bus_v3.md))
  - Estimated runtime: ~14 min @ 6A avg, ~22 min @ 4A avg, ~43 min @ 2A avg (80% DoD)

- [x] **XL6009 Boost Converter**
  - Input: 5–32V → Output: adjustable step-up
  - Intended role: **5V Mean Well → 12V bench rail for single-servo ID programming and one-servo tests**
  - ⚠ Commonly quoted "4A" is a switch/input limit — actual output at 12V from 5V input is **~1.5A max** (≈1–2 servos under light load)
  - **Not in the robot power path** — the 3S LiPo feeds the servos through the split bus v3 main line
  - **Not suitable for 10-servo operation** — the Mean Well + XL6009 path peaks at ~18W, 10-servo stall is 324W

### Sensors
- [x] **Raspberry Pi Camera Module 3**
  - 12 MP IMX708, autofocus, **CSI-2 ribbon interface**
  - Wide-angle lens (~160° FOV)
  - **⚠ Requires a Raspberry Pi host** — cannot connect to ESP32 (no SPI/I²C camera path exists)
  - CSI ribbon is short (~30 cm max without extension)
  - Role: base station vision (mounted on Pi 5), or robot-mounted with CSI extension cable (~1m)
  
- [x] **MPU6050 IMU** (orientation & acceleration feedback)
  - I²C interface, default address **0x68**
  - GPIO 21 SDA, GPIO 22 SCL on robot ESP32
  - 6-axis: 3-axis accelerometer + 3-axis gyroscope
  - Code reference: `Config.IMU_I2C_ADDR`, `Config.IMU_SDA_GPIO`, `Config.IMU_SCL_GPIO` in [`gen2-st3215/src/robot_config.py`](../../gen2-st3215/src/robot_config.py)

### Compute
- [x] **Raspberry Pi 5, 8GB RAM** (base station, not onboard robot)
  - Runs `base_station.py` for ESP-NOW telemetry reception
  - Camera Module 3 host (CSI-2)
  - Telemetry dashboard & control UI
  - ⚠ Needs a dedicated 5V 5A USB-C power supply (not yet acquired)

---

## Firmware Status

All firmware exists in [`gen2-st3215/firmware/`](../../gen2-st3215/firmware/). Built with **PlatformIO** from the repo root (`platformio.ini`, board `esp32dev`).

| Sketch | Target | Function | Status |
|---|---|---|---|
| `assign_ids/` | Waveshare driver ESP32 | One-at-a-time servo ID assignment (1–10) | ✅ Written |
| `usb_servo_bridge/` | Waveshare driver ESP32 | USB CDC @ 1 Mbps ↔ servo UART (bench mode for Python) | ✅ Written |
| `robot_esp32_v2/` | Waveshare driver ESP32 | **Field firmware of record:** gait CPG + MPU6050 + stall FSM + ESP-NOW, limp boot, per-group soft start, ±70° limits, 10.2 V / 70 °C stop | ✅ Written |
| `robot_esp32/` | Waveshare driver ESP32 | Superseded by `robot_esp32_v2` | ⚪ Reference only |
| `spin_all/` | Waveshare driver ESP32 | Broadcast sweep smoke test (all servos on factory ID 1) | ✅ Written |
| `base_esp32/` | ESP32 #2 | ESP-NOW receiver → USB serial @ 115200 to Pi 5 | ✅ Written |

Python bench stack (`main.py`, `src/`) is also complete — Feetech protocol driver, 10-DOF gait, current-stall obstacle detection, mock mode (`SURGE_MOCK=1`).

---

## Items REMOVED from Original Plan

### Power Supply Changes
- ~~2× 3S LiPo 1500mAh 30C packs (parallel configuration)~~ → Replaced with single 3S 1800mAh (direct to servo bus)
- ~~Mini560-5V buck converter (3A)~~ → Mean Well LRS-100-5 serves 5V needs at base station
- ~~2× 15A mini blade fuses~~ → Single pack removes reverse-charge failure mode; still need **1 inline fuse**
- ~~XT60 Y-harness~~ → Not needed with single LiPo
- ~~XT60 loop key (master switch)~~ → **Still needed** — recommend adding for safe disconnect
- ~~2× LiPo low-voltage alarms~~ → **Still needed** — recommend single alarm or BMS module
- ~~iMAX B6 balance charger~~ → **Still needed** for LiPo charging and storage

### Sensors Removed
- ~~HC-SR04P ultrasonic sensor~~ → Replaced with Raspberry Pi Camera Module 3. However, a head-mounted HC-SR04**P** (3.3V-safe) or VL53L0X is still recommended for simple real-time obstacle distance on the ESP32.

### Wiring Components Removed
- ~~1000µF capacitor (transient suppression)~~ → **Still needed** — protects against servo inrush current spikes
- ~~XT60 connectors & pigtails~~ → Connector type TBD pending LiPo verification
- ~~16AWG silicone wire~~ → **Still needed** for power wiring from LiPo → fuse → driver

---

## Power Architecture (Resolved)

### Robot Power (Field Operation) — split bus v3
Full design: [`power_split_bus_v3.md`](power_split_bus_v3.md) · wiring: [`../4_WIRING_DIAGRAM.md`](../4_WIRING_DIAGRAM.md)
```
3S LiPo 1800mAh (11.1–12.6V)
    ↓ [XT60/XT30/Deans — verify from pack]
[15 A fuse] → [XT60 loop key]
    ↓
Main line +12 V / GND (16–18 AWG, along the body)
    ├→ 5 inject boards, each: 3 A fuse + 470 µF cap → 2 servos
    │     G1 ID1–2 · G2 ID3–4 · G3 ID5–6 · G4 ID7–8 · G5 ID9–10
    └→ Buck set to 7.5 V → Waveshare Servo Driver DC jack
          ├→ Servo port: DATA + GND only (+V cut) → one UART @ 1 Mbps to ID1…ID10
          ├→ Built-in ESP32 (robot_esp32_v2: gait + IMU + ESP-NOW)
          └→ MPU6050 IMU (I²C GPIO 21/22)
```

### Bench Power (Single-Servo Testing / ID Programming)
```
Mean Well LRS-100-5 (5V 20A)
    ↓
XL6009 boost (5V → 12V, ~1.5A max output)
    ↓
Waveshare Driver VIN → 1× ST3215 (ID assignment only)
```
> ⚠ This path is rated for **1–2 servos max**. Never attempt 10-servo operation through the XL6009.

### Base Station Power
```
Mean Well LRS-100-5 (5V 20A)
    ↓
Raspberry Pi 5 (via USB-C, needs 5V 5A adapter or custom cable)
    ├→ Camera Module 3 (CSI-2)
    ├→ ESP32 #2 (USB serial @ 115200, ESP-NOW receiver)
    └→ Telemetry dashboard / SSH
```

---

## Next Steps

### Phase 3A: Power Architecture Verification
- [x] Power architecture defined — split bus v3 (15 A main fuse, 5 × 3 A group feeds, 7.5 V buck for the driver)
- [x] XL6009 role clarified (bench-only, not in robot power path)
- [ ] Verify LiPo connector type and C rating from pack label
- [ ] Acquire: 15 A fuse, loop key, LiPo alarm/BMS, charger, and the v3 inject-board parts (5 × 3 A fuse, 5 × 470 µF cap, 5 × perfboard, 5 × 3-pin plugs, 7.5 V buck)
- [ ] Test single-servo bench power via XL6009 before attempting field power

### Phase 3B: Servo Bring-Up
- [ ] Flash `assign_ids` to driver ESP32, assign IDs 1–10 (one servo at a time, powered via XL6009 bench rail)
- [ ] Flash `usb_servo_bridge`, run `python servo_test.py` to verify single-servo position control
- [ ] Run `python tests/test_st3215_ping.py` to verify bus connectivity
- [ ] Run `python tests/test_motor_feedback.py` for current monitoring calibration
- [ ] Calibrate `OBSTACLE_CURRENT_THRESHOLD_MA` (currently 1200 mA — measure actual free-run vs stall)

### Phase 3C: Sensor Integration
- [ ] Wire MPU6050 to robot ESP32 (I²C GPIO 21/22)
- [ ] Test IMU readings via firmware
- [ ] Mount Camera Module 3 on Pi 5 (CSI-2), test streaming
- [ ] Decide camera placement: base station fixed vs robot-mounted with extension cable

### Phase 3D: Wireless Communication
- [ ] Flash `robot_esp32_v2` to driver ESP32 (`pio run -e robot_esp32_v2 -t upload`)
- [ ] Flash `base_esp32` to ESP32 #2
- [ ] Test ESP-NOW telemetry link
- [ ] Run `base_station.py` on Pi 5 to verify telemetry reception

### Phase 3E: Mechanical Assembly
- [ ] Print **one v6 test segment** first (v6 is the design of record — see the main README) and check fit + traction; fall back to v4 only if v6 fails. Do NOT use v5 (dimensional errors)
- [ ] Install F623ZZ flange bearings (horn-opposite side)
- [ ] Attach friction pads / TPU feet to belly
- [ ] Assemble full 10-segment chain
- [ ] Route servo daisy-chain cables through body

---

## Risk & Gap Analysis

| Component | Status | Issue | Priority |
|---|---|---|---|
| Protection circuits | ⚠ Missing | No fuse, no BMS, no loop key — LiPo safety critical | **CRITICAL** |
| LiPo specs | ⚠ Unverified | Connector type and C-rating unknown — affects max current | HIGH |
| Waveshare driver specs | ⚠ Unverified | Input voltage range, 5V regulation, current sensing — verify from wiki | HIGH |
| Servo daisy-chain cables | ⚠ Missing | Need 3-pin bus connectors for 10-servo chain | HIGH |
| Body segments | ⚠ Not printed | Need PLA+ prints of v6 design (test one first) + bearings + fasteners | HIGH |
| Friction pads | ⚠ Missing | Snake cannot locomote without anisotropic belly friction | HIGH |
| Pi 5 power supply | ⚠ Missing | Need 5V 5A USB-C adapter for base station | MEDIUM |
| Distance sensor | ⚠ Missing | HC-SR04P or VL53L0X for head-mounted obstacle detection | MEDIUM |
| LiPo charger | ⚠ Missing | Need iMAX B6 or equivalent for safe charging/storage | MEDIUM |
| Camera extension cable | ⚠ TBD | Only needed if camera mounted on robot body | LOW |

---

## Bill of Materials (Current + Gaps)

### ✓ In Inventory (9 items, ~19 physical units)
| # | Component | Qty | Role |
|:---:|---|:---:|---|
| 1 | Waveshare Bus Servo Driver with ESP32 | 1 | Servo bus master + robot MCU |
| 2 | Waveshare ST3215 servos | 10 | 10-DOF snake joints |
| 3 | ESP32 dev board #2 | 1 | Base station ESP-NOW receiver |
| 4 | Mean Well LRS-100-5 | 1 | 5V bench / base station supply |
| 5 | XL6009 boost converter | 1 | 5V→12V bench rail (1-servo only) |
| 6 | 3S LiPo 1800mAh | 1 | Robot field power (via split bus v3) |
| 7 | Raspberry Pi 5 (8GB) | 1 | Base station compute |
| 8 | Raspberry Pi Camera Module 3 | 1 | Vision (CSI-2 on Pi 5) |
| 9 | MPU6050 IMU | 1 | Robot orientation sensing |

### ⚠ Missing / Needs Procurement (~₹10,000 estimated)
| # | Component | Qty | Est. Cost (₹) | Priority |
|:---:|---|:---:|:---:|:---:|
| 10 | Inline fuse + holder (15 A main) | 1 | 200 | CRITICAL |
| 11 | LiPo alarm / BMS module | 1 | 300 | CRITICAL |
| 12 | XT60 loop key (power disconnect) | 1 | 200 | CRITICAL |
| 13 | 3S LiPo balance charger (iMAX B6) | 1 | 2,500 | HIGH |
| 14 | LiPo-safe storage bag | 1 | 400 | HIGH |
| 15 | XT60/XT30 connectors + pigtails | 2 | 200 | HIGH |
| 16 | 16–18 AWG silicone wire + heat-shrink | 2m | 500 | HIGH |
| 17 | Servo daisy-chain cables (3-pin TTL) | 12 | 500 | HIGH |
| 18 | PLA+ filament (or pre-printed v6 segments) | 10 | 1,500 | HIGH |
| 19 | F623ZZ flange bearings | 10 | 1,000 | HIGH |
| 20 | M2 & M2.5 machine screws (assorted) | 1 kit | 500 | HIGH |
| 21 | Friction pads / TPU belly feet | 10 | 500 | HIGH |
| 22 | 1000µF 25V low-ESR capacitor | 1 | 100 | MEDIUM |
| 23 | HC-SR04P or VL53L0X distance sensor | 1 | 300 | MEDIUM |
| 24 | Pi 5 USB-C power supply (5V 5A) | 1 | 1,000 | MEDIUM |
| 25 | CSI ribbon extension cable (~1m) | 1 | 300 | LOW |
| 26 | Heat-shrink tubing assortment | 1 | 200 | LOW |
| 27 | Split bus v3 inject-board parts: 5 × 3 A fuse/PTC, 5 × 470 µF 25 V cap, 5 × perfboard, 5 × 3-pin plug pairs, 20–22 AWG tap wire | 1 set | — (not yet priced) | CRITICAL |
| 28 | Adjustable buck converter set to 7.5 V (driver power) | 1 | — (not yet priced) | HIGH |
| | **Estimated Total** | | **~₹10,200** + items 27–28 | |

---

## Summary of Changes from Original Plan

| Item | Original | Current | Reason |
|---|---|---|---|
| Servos | Dynamixel XL330-M288-T (5V, 0.52 Nm) | Waveshare ST3215 (12V, 2.94 Nm) | XL330 unobtainable in India; ST3215 is 5.6× stronger |
| Servo driver | Robotis U2D2 + PHB + separate ESP32 | Waveshare Bus Servo Driver (integrated ESP32) | Single board, simpler wiring |
| Power source | 2× 3S 1500mAh parallel (33.3 Wh) | 1× 3S 1800mAh (20.0 Wh) | Simpler; 40% less energy but sufficient |
| Voltage rail | 5V (XL330 limit) | 12V from LiPo, split bus v3 (5 fused groups of 2 servos); 7.5 V buck for driver | Per-group fusing; a jam takes out only 2 joints |
| Base station PSU | Mini560-5V buck (3A) | Mean Well LRS-100-5 (5V 20A) | Industrial-grade, overkill but reliable |
| Obstacle sensor | HC-SR04P ultrasonic only | Camera Module 3 + software current stall | Vision-based + proprioceptive stall detection |
| Compute | Raspberry Pi 4 (4GB, onboard robot) | Raspberry Pi 5 (8GB, base station only) | Pi 5 stays off-robot; ESP32 handles onboard control |
| Communication | USB tethered (Pi → U2D2) | ESP-NOW wireless (robot ESP32 ↔ base ESP32 → Pi 5) | Untethered operation |

---

## What changed

### 24 Sep 2026

| Topic | Before | Now | Why |
|---|---|---|---|
| Robot power path | LiPo → inline fuse (size TBD) → loop key → 1000 µF cap → driver VIN → servos | Split bus v3: 15 A fuse → loop key → main line → 5 inject boards (3 A fuse + 470 µF each) → 2 servos per group; 7.5 V buck → driver | Each plug carries only 2 servos' current, a jam takes out only 2 joints, and the voltage drop is almost zero (see `power_split_bus_v3.md`) |
| Field firmware | `robot_esp32` | `robot_esp32_v2` | With 3 A fuses per pair of servos, starting all 10 servos at once could blow fuses; v2 also adds battery/temperature protection |
| Build tool | Arduino IDE (ESP32 Dev Module) | PlatformIO from the repo root (`platformio.ini`) | One environment per sketch |
| Segment to print | v4 (v6 marked unverified) | Print one v6 test segment first; fall back to v4 if it fails | Main README lists v6 as the design of record — **team to confirm** |
| Parts list | No inject-board parts | Items 27–28 added: v3 inject-board parts and 7.5 V buck | Needed for split bus v3 |
| Links | Written relative to repo root (broke after the move) | Fixed to `../../…` | File now lives in `docs/hardware/` |

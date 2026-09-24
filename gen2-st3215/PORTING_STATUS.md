# PORTING STATUS: gen2-st3215

> **Updated 24 Sep 2026.** What we did before and what we do now is recorded in [What changed](#what-changed) at the end of this file.

Control code now targets **Waveshare ST3215 + Feetech STS @ 1 Mbps**, not Dynamixel.

| Path | Role |
|---|---|
| `firmware/robot_esp32_v2` | **Field master (current)**: gait, stall FSM, MPU6050, ESP-NOW, limp boot, per-group soft start, ±70° limits, low-battery/over-temp stop |
| `firmware/robot_esp32` | *Superseded* by `robot_esp32_v2` |
| `firmware/base_esp32` | ESP32 #2: ESP-NOW → USB serial for Pi 5 |
| `firmware/usb_servo_bridge` | USB CDC @ 1 Mbps ↔ servo UART (Python bench) |
| `firmware/assign_ids` | One-servo ID programming |
| `main.py` / `src/` | Feetech Python stack for bench (bridge firmware required) |
| `base_station.py` | Pi 5 telemetry printer |

## Register / config map (implemented)

| Item | Value |
|---|---|
| BAUDRATE | `1000000` |
| TORQUE_ENABLE | addr `40`, 1 byte |
| GOAL_POSITION | addr `42`, 2 bytes |
| PRESENT_POSITION | addr `56`, 2 bytes |
| PRESENT_CURRENT | addr `69`, 2 bytes, bit15 = sign, 6.5 mA/count |
| MAX_TORQUE_NM | `2.94` |
| OBSTACLE_CURRENT_THRESHOLD_MA | `1200` (calibrate on hardware) |
| VIN | 3S LiPo 6.0–12.6 V into driver. **Not** Mean Well 5 V. |
| Power bus | Split bus v3: 15 A main fuse, 5 taps × 3 A PTC (2 servos each); driver servo-port +V cut |
| LOW_BATT stop | 10.2 V for 3 s (v2 firmware) |
| MAX_TEMP stop | 70 °C (v2 firmware) |

## Power / sensors (code assumptions)

- XL6009 is **not** in the servo path (would over-voltage a 3S pack).
- Camera Module 3 is CSI on the Pi 5 only — no ESP32 driver.
- MPU6050 on GPIO 21/22; gait continues if the IMU is absent.

---

## What changed

### 24 Sep 2026

| Topic | Before | Now | Why |
|---|---|---|---|
| Field master firmware | `firmware/robot_esp32` | `firmware/robot_esp32_v2` (`robot_esp32` kept for reference) | With 3 A fuses per pair of servos, starting all 10 servos at once could blow fuses; v2 also adds battery/temperature protection |
| Power | 3S LiPo into driver VIN | Split bus v3: 15 A main fuse, 5 × 3 A group feeds, driver servo-port +V cut | Each plug carries only 2 servos' current, a jam takes out only 2 joints, and the voltage drop is almost zero (see `power_split_bus_v3.md`) |

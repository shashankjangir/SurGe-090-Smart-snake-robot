# PORTING STATUS: gen2-st3215

Control code now targets **Waveshare ST3215 + Feetech STS @ 1 Mbps**, not Dynamixel.

| Path | Role |
|---|---|
| `firmware/robot_esp32` | Field master: gait, current stall FSM, MPU6050, ESP-NOW |
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

## Power / sensors (code assumptions)

- XL6009 is **not** in the servo path (would over-voltage a 3S pack).
- Camera Module 3 is CSI on the Pi 5 only — no ESP32 driver.
- MPU6050 on GPIO 21/22; gait continues if the IMU is absent.

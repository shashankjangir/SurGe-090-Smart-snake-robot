Arduino IDE: open the `.ino` in each subfolder. Board: **ESP32 Dev Module**. Port: Waveshare driver Type-C (robot) or the second ESP32 (base).

| Sketch | When to flash |
|---|---|
| `assign_ids` | First bring-up: **one** ST3215, VIN 6–12.6 V, set IDs 1–10 |
| `usb_servo_bridge` | PC Python (`main.py`, `tests`, `tools/assign_id.py`) |
| `robot_esp32` | Field: gait + MPU6050 + ESP-NOW (replaces the bridge) |
| `base_esp32` | ESP32 #2 on the Pi USB |

Servo UART on the Waveshare driver: GPIO **18 RX / 19 TX**, 1 Mbps. If ping is silent, swap those pins. Never put Mean Well 5 V on driver VIN.

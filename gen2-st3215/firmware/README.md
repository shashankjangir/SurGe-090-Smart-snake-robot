PlatformIO (VS Code). The project root is the **repo root** — `platformio.ini`
lives there, with `src_dir = gen2-st3215/firmware`, so open the repo folder in
VS Code and each sketch appears as its own environment.

```
pio run -e spin_all -t upload      # build + flash
pio device monitor -e spin_all     # serial monitor
```

| Env | When to flash |
|---|---|
| `spin_all` | Smoke test: broadcast sweep, runs with all servos still on factory ID 1 |
| `assign_ids` | First real bring-up: **one** ST3215, VIN 6–12.6 V, set IDs 1–10 |
| `usb_servo_bridge` | PC Python (`main.py`, `tests`, `tools/assign_id.py`) |
| `robot_esp32` | Field: gait + MPU6050 + ESP-NOW (replaces the bridge) |
| `base_esp32` | ESP32 #2 on the Pi USB |

Servo UART on the Waveshare driver: GPIO **18 RX / 19 TX**, 1 Mbps. If ping is
silent, swap those pins. Never put Mean Well 5 V on driver VIN.

**Sources are `.cpp`, not `.ino`.** PlatformIO only runs its Arduino
`.ino`→`.cpp` conversion on sketches at the top level of `src_dir`; with one
folder per sketch the `.ino` files were silently skipped and the link failed
with `undefined reference to setup()`. Every file already includes `<Arduino.h>`
and defines its functions before use, so plain C++ compiles unchanged. Keep new
sketches as `.cpp` and give each one its own `[env:...]` block with
`build_src_filter = -<*> +<folder/*>` — without the leading `-<*>` all folders
compile into one binary and collide on `setup()`/`loop()`.

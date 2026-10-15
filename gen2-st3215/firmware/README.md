# Firmware version guide

Gen 2.0 and Gen 2.1 are working in project trials, confirmed on 16 October 2026.
See the [working prototype photos](../media/README.md). Gen 3.0 remains in development.

## Gen 2.1 integrated targets

Build with `pio run -e receiver_gen2_1 -e transmitter_gen2_1 -e sensor_gen2_1 -e get_mac_oled`.
Dependencies are declared in root `platformio.ini`; these builds do not flash boards.

The receiver boots torque-off. HELLO identifies Gen 2.1; RUN arms it; targets
set per-joint speed and enable torque; STOP disables torque. A 750 ms target
watchdog also disables torque. Wireless acknowledgements return through the relay.
The established receiver MAC/channel-1 pairing is retained. Do not operate two
receivers with that same configured MAC together. Radio is not encrypted.

The separate sensor node uses MPU6050 + BMP280 + distance input (TRIG32/ECHO34)
and OLED on I2C21/22. Its browser dashboard is on its local hotspot. Configure
SURGE_SENSOR_PASSWORD before use. Use the existing project's 3.3 V-safe sensor
wiring; code cannot determine which ultrasonic hardware is attached.

**Gen 2.1 is host-driven.** It has not inherited the Gen 2.0 per-group soft start,
current-evasion FSM, battery cutoff or over-temperature cutoff. Slow commands
and diagnostic LEDs do not replace those protections. The repository build checks do not
independently validate physical protection thresholds or radio timing.

## Gen 2.0 retained firmware

> **Updated 24 Sep 2026.** What we did before and what we do now is recorded in [What changed](#what-changed) at the end of this file.

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
| `robot_esp32_v2` | **Field firmware of record** (split power bus v3): gait + MPU6050 + ESP-NOW, safe start — see below |
| `robot_esp32` | *Superseded* by `robot_esp32_v2`. Kept for reference only; do not flash on the v3 power bus |
| `base_esp32` | ESP32 #2 on the Pi USB |
| `receiver_gen2_1` | **Gen 2.1 planar receiver** — `HELLO`/`RUN`/`STOP`, per-joint speed, torque watchdog (dashboard / gamepad) |
| `transmitter_gen2_1` | Gen 2.1 USB↔ESP-NOW command/telemetry relay |
| `sensor_gen2_1` | Gen 2.1 sensory ESP32 (BMP280 / MPU6050 / ultrasonic / OLED hotspot) |
| `get_mac_oled` | Show STA MAC on OLED (pairing helper) |

Older `esp32_st3215_receiver` / `esp_now_transmitter` sketches remain for Gen 2.0-era bring-up; Gen 2.1 host control should flash the `*_gen2_1` envs.

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

## robot_esp32_v2 — Gen 2.0 autonomous field firmware

Written for **split power bus v3** (`docs/hardware/power_split_bus_v3.md`):
3S LiPo → 15 A fuse → loop key → main line, tapped into 5 groups of 2 servos
(ID 1–2, 3–4, 5–6, 7–8, 9–10), 3 A PTC per tap. The driver board's servo-port
+V is cut, so it sends DATA + GND only.

```
pio run -e robot_esp32_v2 -t upload
pio device monitor -e robot_esp32_v2
```

What it adds over `robot_esp32`:

| Feature | Value |
|---|---|
| Boot state | Torque **OFF** — nothing moves until `RUN` |
| Soft start | Torque on one power group at a time (400 ms apart, slow speed), then amplitude ramps in over 3 s so the PTCs don't trip |
| Joint limit | ±70° (v6 segment mechanical limit ±80°), per-joint `TRIM[]` |
| Torque limit | 70 % |
| Stall detect | 1200 mA for 4 consecutive samples (calibrate on hardware) |
| Low battery stop | 10.2 V (3.4 V/cell) for 3 s |
| Over-temp stop | 70 °C |
| Loop / telemetry | 50 Hz control, 10 Hz telemetry |

Serial commands (115200, end with Enter):

| Command | Action |
|---|---|
| `RUN` | Start slithering (soft start) |
| `STOP` | Torque off, horns go limp |
| `CENTER` | Hold every joint straight — use while fitting horns (only from STOP) |
| `PING` | List servo IDs that answer, with voltage/temperature (only from STOP) |

The telemetry and command structs are unchanged, so `base_esp32` works with
either robot firmware. `robot_esp32_v2/surge_protocol.h` matches
`base_esp32/surge_protocol.h` (and `robot_esp32/surge_protocol.h`). Each sketch keeps
its own copy — if you change the protocol, change all three together.

---

## What changed

### 24 Sep 2026

| Topic | Before | Now | Why |
|---|---|---|---|
| Field firmware | `robot_esp32`: torque on at boot, all servos start together | `robot_esp32_v2`: boots limp, soft start one power group at a time, ±70° joint limits, stop at 10.2 V / 70 °C | With 3 A fuses per pair of servos, starting all 10 servos at once could blow fuses; v2 also adds battery/temperature protection |
| Servo power assumed | 12 V into the driver VIN; the driver board powers the servo bus | Split bus v3: servos fed from the main line in 5 fused groups; driver sends DATA + GND only | Each plug carries only 2 servos' current, a jam takes out only 2 joints, and the voltage drop is almost zero (see `power_split_bus_v3.md`) |
| Shared protocol header | `firmware/include/surge_protocol.h` kept although it had drifted from the sketches' copies | Deleted; each sketch keeps its own matching `surge_protocol.h` | A stale header could cause a silent ESP-NOW struct mismatch between robot and base |

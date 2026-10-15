# ESP32 firmware

The firmware follows the two Gen 2 control arrangements. In Gen 2.0, the robot
can compute its gait onboard and send telemetry to a base station. In Gen 2.1,
the host computes targets and an ESP32 receiver applies them to the servo bus.

## Targets

| Environment | Role |
|---|---|
| `usb_servo_bridge` | Transparent bus bridge for the Gen 2.0 Python bench stack |
| `robot_esp32_v2` | Gen 2.0 onboard gait, current response and power protections |
| `base_esp32` | Gen 2.0 ESP-NOW base station connected to the Pi |
| `receiver_gen2_1` | Gen 2.1 host-command receiver |
| `transmitter_gen2_1` | Gen 2.1 USB-to-ESP-NOW relay |
| `sensor_gen2_1` | Separate IMU, pressure and distance sensor node |
| `get_mac_oled` | MAC-address display for pairing setup |
| `assign_ids` | Servo ID assignment with one motor connected |
| `spin_all` | Broadcast sweep for initial bench work |
| `robot_esp32` | Earlier onboard firmware, retained for reference |

The older receiver/transmitter sketches remain in the folder as earlier work.
The current host apps use the `*_gen2_1` targets.

## Build

Open the repository root in PlatformIO; `platformio.ini` defines one environment
per firmware folder. For example:

```powershell
pio run -e receiver_gen2_1
```

To upload a selected build, add `-t upload`; the connected board and its wiring
must match that target. `pio device monitor -e receiver_gen2_1` opens the monitor.
The common monitor rate is 115200 baud; the servo bus runs at 1 Mbps.

Firmware sources use `.cpp`, with each environment selecting its own source
folder. Keep the `-<*>` exclusion in `build_src_filter` so sketches with separate
`setup()` and `loop()` functions are not compiled into the same program.

## Gen 2.1 host receiver

The receiver boots with torque off. `HELLO` identifies the protocol, `RUN` arms
motion and position commands set targets and speeds. `STOP` disables torque;
a 750 ms target watchdog covers an interrupted command stream. Wireless
acknowledgements return through the transmitter.

The receiver uses a configured MAC on channel 1. Two receivers with the same
MAC must not operate together. The radio link is unencrypted. The complete
message format is in the [protocol reference](../../docs/API_DOCUMENTATION.md).

This receiver does not include the Gen 2.0 onboard battery/temperature cutoffs,
per-group soft start or current-evasion state machine. Those features belong
to a different firmware path.

## Sensor node

`sensor_gen2_1` combines an MPU6050, BMP280, distance input and OLED. I²C uses
SDA 21 / SCL 22; distance input uses TRIG 32 / ECHO 34. The node also provides a
local hotspot dashboard. Set `SURGE_SENSOR_PASSWORD` for the hardware setup.
Use a 3.3 V-safe distance-sensor interface for the ESP32 inputs.

## robot_esp32_v2 — Gen 2.0 autonomous field firmware

Written for **split power bus v3** (`docs/hardware/power_split_bus_v3.md`):
3S LiPo → 15 A fuse → loop key → main line, tapped into 5 groups of 2 servos
(ID 1–2, 3–4, 5–6, 7–8, 9–10), 3 A PTC per tap. The driver board's servo-port
+V is cut, so it sends DATA + GND only.

```
pio run -e robot_esp32_v2 -t upload
pio device monitor -e robot_esp32_v2
```

The configured behavior and thresholds are:

| Feature | Value |
|---|---|
| Boot state | Torque **OFF** — nothing moves until `RUN` |
| Soft start | Torque on one power group at a time (400 ms apart, slow speed), then amplitude ramps in over 3 s to reduce startup current |
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

## Firmware history

`robot_esp32_v2` accompanied the September 2026 split-power-bus revision. It
replaced simultaneous startup with staged servo groups and added joint limits,
battery and temperature stops. The Gen 2.1 receiver was added for host-driven
control, keeping its command protocol separate from the onboard telemetry structs.

See the [power-design history](../../docs/hardware/README.md) and
[Gen 2 overview](../README.md) for the wider hardware context.

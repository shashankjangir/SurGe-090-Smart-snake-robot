# ESP32 gait demonstrator in Wokwi

This early simulation helped us work on travelling-wave control while actuator
availability limited the physical build. It uses five SG90 PWM servos, an ESP32
and simulated sensors. The current robot uses ST3215 bus servos, so this remains
a separate controller experiment.

[Open the Wokwi project](https://wokwi.com/projects/467623718124707841), or copy
`diagram.json`, `sketch.ino` and `libraries.txt` into a Wokwi ESP32 project.

## Circuit

| Component | Connection |
|---|---|
| Five SG90 servos | GPIO 26, 27, 14, 12, 13 |
| Ultrasonic sensor | TRIG 5, ECHO 18 |
| MPU6050 | I²C SDA 21 / SCL 22, address 0x68 |
| SSD1306 OLED | Same I²C bus, address 0x3C |

The sketch generates a phase-shifted sine wave across the servos. It includes
forward/reverse motion, turning, an ultrasonic avoidance mode and IMU-based
flip detection. Distance readings are smoothed, with separate enter/exit
thresholds for avoidance.

## Serial controls

Start the simulation and open the serial monitor at 115200 baud.

| Command | Meaning |
|---|---|
| `f`, `b`, `l`, `r` | Forward, reverse, left, right |
| `s`, `a` | Stop, automatic mode |
| `A40` | Set amplitude to 40 degrees |
| `S1.2` | Set gait speed parameter |
| `W45` | Set joint phase lag |
| `T25` | Set turn bias |
| `C90` | Set centre position |
| `?` | Show settings and help |

Adjust the simulated distance input to explore the avoidance response. For the
current planar physics model and host controller, see
[PyBullet](../pybullet/README.md) and the [dashboard](../../web-dashboard/README.md).

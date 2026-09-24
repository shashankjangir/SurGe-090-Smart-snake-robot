# SURGE-090 · ESP32 Serpentine Robot Wokwi Simulation

Interactive browser simulation of the 5-segment snake robot on **Wokwi**:  
🔗 **[wokwi.com/projects/467623718124707841](https://wokwi.com/projects/467623718124707841)**

---

## Hardware Configuration (`diagram.json`)

The simulation runs on an **ESP32 DevKit v1** connected to:
- **5× SG90 PWM Servos** on GPIOs `26, 27, 14, 12, 13`
- **HC-SR04 Ultrasonic Distance Sensor** on `TRIG = GPIO 5`, `ECHO = GPIO 18`
- **MPU6050 6-DOF IMU** on I²C (`SDA = GPIO 21`, `SCL = GPIO 22`, addr `0x68`)
- **SSD1306 128×64 I²C OLED** on I²C (`SDA = GPIO 21`, `SCL = GPIO 22`, addr `0x3C`)

---

## Key Firmware Features (`sketch.ino`)

1. **Serpenoid Gait Engine:**
   $$\text{angle}_i = \text{center} + \text{trim}_i + \text{bias} + \text{dir}_i \cdot A \cdot \sin(\text{phase} + d \cdot i \cdot \text{lag})$$
   - Real-time travelling wave propagation across all 5 joint servos.
   - Modes: `FWD`, `REV`, `LEFT`, `RIGHT`, `IDLE`, `AUTO` (autonomous collision avoidance).

2. **Sensorless / Ultrasonic Collision & Safety Stack:**
   - **Exponential smoothing** on distance ($\alpha = 0.4$) to filter ultrasonic noise.
   - **Hysteresis switching:** triggers avoidance below $20\text{ cm}$, resumes normal slither above $25\text{ cm}$.
   - **MPU6050 flip detection:** pauses gait motion if pitch/roll indicates the robot tipped over.
   - **Graceful degradation:** missing OLED or IMU will not block startup or gait execution.

3. **Non-blocking Scheduling:**
   - Uses `millis()` timers for servos (50 Hz), sensors (10 Hz), and OLED display (5 Hz) with zero `delay()` stalls.

4. **Live Serial Tuning Console (115200 baud):**
   Type commands into the Serial Monitor to tune gait parameters live:
   - `f` / `b` / `l` / `r` / `s` / `a`: Forward / Reverse / Left / Right / Stop / Auto
   - `A<deg>`: Set wave amplitude (e.g. `A40`)
   - `S<speed>`: Set gait frequency / speed (e.g. `S1.2`)
   - `W<deg>`: Set phase lag between joints (e.g. `W45`)
   - `T<deg>`: Set turn bias offset (e.g. `T25`)
   - `C<deg>`: Set center trim position (e.g. `C90`)
   - `?`: Print current configuration and help menu

---

## How to Run

1. Open **[wokwi.com/projects/467623718124707841](https://wokwi.com/projects/467623718124707841)** directly, or copy `diagram.json`, `sketch.ino`, and `libraries.txt` into a new Wokwi ESP32 project.
2. Click **Start Simulation**.
3. Adjust the HC-SR04 distance slider to test obstacle detection and evasion.
4. Interact via the Serial Monitor at 115200 baud.

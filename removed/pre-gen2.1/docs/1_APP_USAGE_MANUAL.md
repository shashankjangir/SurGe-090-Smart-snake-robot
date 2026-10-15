# SURGE-090: App Operating Instructions (Gen 2 — ST3215)

> **Updated 24 Sep 2026.** What we did before and what we do now is recorded in [What changed](#what-changed) at the end of this file.

`shared/desktop-app/app.py` is the universal entry point for the Gen 2 robot. Depending on the arguments it runs
either as a headless hardware driver (for the Raspberry Pi 5) or as the Tkinter control dashboard with PyBullet simulation.
Feature list and dependencies: [`../shared/desktop-app/README.md`](../shared/desktop-app/README.md).

---

## 0. How the app talks to the robot

```
app.py (PC or Pi 5)  --USB serial 115200-->  Servo Driver with ESP32  --UART 1 Mbps-->  ST3215 ID1…ID10
                                             running esp32_st3215_receiver
```

| Item | Value |
|---|---|
| Python interface | `gen2-st3215/src/st3215_interface.py` (`ST3215Interface`) |
| ESP32 firmware for app control | `gen2-st3215/firmware/esp32_st3215_receiver/` (OLED + NeoPixel status, USB + ESP-NOW input) |
| Serial | 115200 baud. Port is auto-detected; fallback `COM12` (Windows) or `/dev/ttyUSB0` (Linux/Pi) |
| Position command | `P,1:2048,2:2048,…,10:2048` (0–4095, 2048 = straight) |
| Telemetry request | `T` → reply `T,id:load:speed:pos,…` |
| Set servo ID | `I,<new id>` (only one servo connected) |

> [!IMPORTANT]
> App control uses **`esp32_st3215_receiver`**, not the field firmware. `robot_esp32_v2` runs the gait on the ESP32
> itself and takes `RUN` / `STOP` / `CENTER` / `PING` instead — use it for untethered runs with the base station.
> `esp32_st3215_receiver` has **no** soft start, joint limits or low-battery stop, so on split bus v3 start with
> small amplitudes and keep the loop key within reach.

---

## 1. Headless mode (Raspberry Pi 5 default)

Run the robot with no monitor — the snake slithers in a straight line until you stop it.

```bash
python app.py
```

**What this does:**
- Skips all Tkinter GUI libraries (safe on a headless Pi).
- Auto-detects the ESP32 serial port and connects through `ST3215Interface`.
- Sends a straight-line serpenoid gait at 50 Hz until you press `Ctrl+C`, then closes the port.

*Headless simulation (`python app.py --sim`) is meant to run PyBullet instead of hardware — see Known issues below.*

---

## 2. Graphical dashboard mode (master control suite)

Use this on a laptop to test paths, tune physics, or draw custom paths for the hardware.

```bash
python app.py --gui
```

**What this does:**
- Opens the Tkinter **Master Control Dashboard**.
- Choose **Simulation** (PyBullet 3D) or **Hardware (ST3215 via ESP32 auto-detect)**.
- **Draw a path:** click and drag on the 2D canvas, or type a function like `sin(x)` and generate it.
- **Live telemetry:** angle (°), speed and torque for all 10 joints.
- **Live tuning:** in Simulation mode, drag the sliders in the PyBullet window to change the physics.
- **Auto-stop + accuracy report:** when the snake reaches the end of the path it stops and opens a Matplotlib
  window with the **path-tracking accuracy %**.

---

## 3. Remote GUI access (Raspberry Pi 5 → laptop)

If `app.py --gui` runs on the Pi but you want the window on your laptop:

### Option A: VNC (most reliable)
1. On the Pi: `sudo raspi-config` → *Interface Options* → *VNC* → enable.
2. On the laptop, install **RealVNC Viewer** and connect to the Pi's IP address.
3. In a terminal inside the VNC desktop: `python app.py --gui`.

### Option B: X11 forwarding over SSH (faster, no desktop)
1. Install an X server on the laptop (**VcXsrv** on Windows, **XQuartz** on Mac).
2. Connect with X forwarding (use your own username and hostname):
   ```bash
   ssh -X <user>@<pi-hostname>.local
   ```
3. Run `python app.py --gui`; the window appears on your laptop.

> **Note:** PyBullet (Simulation mode) needs OpenGL and usually fails over X11 forwarding. Use **Hardware** mode when working remotely over SSH.

> **Security:** never write the Pi's password into docs or code. If a password was ever committed, change it on the Pi.

---

## 4. Known issues

- **`app.py --sim` headless still opens the hardware port.** In `run_headless()`, the simulation interface is created
  and then immediately replaced by `ST3215Interface`, so `--sim` without `--gui` tries to connect to the ESP32.
  Use `python app.py --gui` → *Simulation* until this is fixed.
- **`esp32_st3215_receiver` is not yet in `platformio.ini`** and is still a `.ino` file, so it cannot be built with
  `pio run -e …` like the other sketches. Build it with the Arduino IDE (needs the SCServo, Adafruit SSD1306 and
  Adafruit NeoPixel libraries) until an environment is added.

---

## What changed

### 24 Sep 2026

| Topic | Before | Now | Why |
|---|---|---|---|
| Hardware target | Dynamixels on `COM3` | ST3215 via ESP32 running `esp32_st3215_receiver`, 115200 baud, port auto-detected (fallback `COM12`) | `app.py` already used ST3215; the manual lagged behind |
| Safety note | — | Warning that the receiver firmware has no soft start or limits | Split bus v3 fuses and joint limits |
| SSH example | Contained the Pi password | Password removed | Credentials must not be in docs |
| Known issues | — | `--sim` headless bug; receiver not in `platformio.ini` | Found while checking the code |

<details>
<summary>Previous version of this document (before 24 Sep 2026) — password removed</summary>

# Snake SURGE: Operating Instructions

The `app.py` script is your **Universal Entry Point**. Depending on the arguments you use, it acts as either a lightweight physical hardware driver for the Raspberry Pi, or a massive Tkinter Control Dashboard with simulation tools.

---

## 1. Headless Mode (Raspberry Pi Default)
When running the robot on a headless Raspberry Pi without a monitor, you just want the snake to turn on and slither physically forward in a straight line.

Run the following command:
```bash
python app.py
```
**What this does:**
- Bypasses all Tkinter GUI libraries entirely (so it won't crash on a headless Pi).
- Automatically targets `COM3` (Windows) or `/dev/ttyUSB0` (Linux/Raspberry Pi) to connect to physical Dynamixels.
- Loads a straight-line Path Engine and slithers infinitely until you press `Ctrl+C`.

*(If you want to test the headless logic using PyBullet instead of physical motors, run: `python app.py --sim`)*

---

## 2. Graphical Dashboard Mode (Master Control Suite)
Use this mode on your laptop to test paths, tune physics, or draw custom paths for the hardware.

Run the following command:
```bash
python app.py --gui
```
**What this does:**
- Opens the Tkinter **Master Control Dashboard**.
- Allows you to choose between **Simulation Mode** (PyBullet 3D Engine) or **Hardware Mode** (Dynamixel COM3).
- **Draw a Path**: Click and drag your mouse on the 2D canvas, or type a mathematical function like `sin(x)`.
- **Live Tuning**: In Simulation mode, you can drag the sliders inside the 3D PyBullet window to actively alter the snake's physics!
- **Auto-Stop & Accuracy Report**: When the snake finishes tracking your path, it auto-stops and pops up a native Matplotlib window detailing its exact **Path Tracking Accuracy %**.

---

## 3. Remote GUI Access (Raspberry Pi to Laptop)
If you are running the `python app.py --gui` command from your laptop but the code is actually executing on the Raspberry Pi across the room:

### Option A: VNC Server (Recommended for visual reliability)
1. On the Pi, enable VNC: `sudo raspi-config` > `Interface Options` > `VNC`.
2. On your laptop, download **RealVNC Viewer** and connect to the Pi's IP address.
3. Open a terminal inside the VNC desktop and run `python app.py --gui`.

### Option B: X11 Forwarding over SSH (Faster, no desktop needed)
1. Install an X-Server on your laptop (e.g., **VcXsrv** for Windows, **XQuartz** for Mac).
2. Open **PowerShell** and connect to your Pi using the `-X` flag:
   ```bash
   ssh -X smartsnake@snakerobo.local
   ```
   *(If it asks for a fingerprint, type `yes`. When prompted for the password, type `[password removed]`)*
3. Run `python app.py --gui`. The Tkinter window will forward over WiFi and appear directly on your laptop screen!
> **Note:** PyBullet's 3D engine (`Simulation Mode`) requires heavy OpenGL and will likely crash over X11 forwarding. It is highly recommended to only use **Hardware Mode** when operating the Pi remotely over SSH!

</details>

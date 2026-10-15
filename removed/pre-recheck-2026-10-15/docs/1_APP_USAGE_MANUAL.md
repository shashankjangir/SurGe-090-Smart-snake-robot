# SURGE-090: App Operating Instructions

> **Current (15 Oct 2026): Gen 2.1** control of record is the web dashboard + `shared/surge_control`, with firmware `receiver_gen2_1` / `transmitter_gen2_1`. See [`versions/VERSIONS.md`](versions/VERSIONS.md) and [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md).
>
> Sections below retain Gen 2.0-era desktop-app guidance for reference. Pre-integration copies also live under `removed/pre-gen2.1/docs/`.

## Current Gen 2.1 quick path

```bash
cd shared/web-dashboard
pip install -r requirements.txt
python web_app.py
```

| Item | Value |
|---|---|
| Python interface | `shared/surge_control/hardware.py` (compat import: `gen2-st3215/src/st3215_interface.py`) |
| ESP32 firmware | `receiver_gen2_1` (+ optional `transmitter_gen2_1`) |
| Handshake | `HELLO` → `SURGE,2.1`; motion requires `RUN`; `STOP` torque-off |
| Position command | `P,1:2048:2400,…` (per-joint speed 1–3400; ±70° clamp) |
| Simulation | PyBullet headless by default; URDF 11 links / 10 joints |
| Mechanics | Planar Gen 2 chain — not Gen 3.0 3D motion |

Gamepad: `python shared/gamepad/controller_node.py` while the dashboard runs.

---

## Gen 2.0 desktop-app notes (historical)

`shared/desktop-app/app.py` remains in-tree. Depending on arguments it can run as a headless driver or Tkinter + PyBullet UI. Prefer Gen 2.1 above for new work.

```
app.py (PC or Pi 5)  --USB serial 115200-->  Servo Driver with ESP32  --UART 1 Mbps-->  ST3215 ID1…ID10
                                             (legacy esp32_st3215_receiver — superseded for Gen 2.1 by receiver_gen2_1)
```

| Item | Value |
|---|---|
| Python interface | `gen2-st3215/src/st3215_interface.py` → Gen 2.1 hardware module |
| Legacy ESP32 sketch | `gen2-st3215/firmware/esp32_st3215_receiver/` |
| Serial | 115200 baud |
| Position command (legacy) | `P,1:2048,2:2048,…` without speed — Gen 2.1 receiver also accepts `id:pos:speed` |

> [!IMPORTANT]
> Gen 2.1 host control flashes **`receiver_gen2_1`**. Gen 2.0 untethered onboard gait still uses **`robot_esp32_v2`** with base-station `RUN`/`STOP`. Do not mix the two control models on one power-up without knowing which firmware is loaded.

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

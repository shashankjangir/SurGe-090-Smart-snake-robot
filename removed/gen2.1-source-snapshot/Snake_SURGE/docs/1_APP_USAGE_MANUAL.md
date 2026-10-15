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
- Automatically targets `COM3` (Windows) or `/dev/ttyUSB0` (Linux/Raspberry Pi) to connect to physical ST3215 servos.
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
- Allows you to choose between **Simulation Mode** (PyBullet 3D Engine) or **Hardware Mode** (ST3215 Waveshare COM3).
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
   *(If it asks for a fingerprint, type `yes`. When prompted for the password, type `xyz@1234`)*
3. Run `python app.py --gui`. The Tkinter window will forward over WiFi and appear directly on your laptop screen!
> **Note:** PyBullet's 3D engine (`Simulation Mode`) requires heavy OpenGL and will likely crash over X11 forwarding. It is highly recommended to only use **Hardware Mode** when operating the Pi remotely over SSH!

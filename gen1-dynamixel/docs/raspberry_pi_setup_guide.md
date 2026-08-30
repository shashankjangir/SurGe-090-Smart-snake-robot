# SURGE-SNAKE: Raspberry Pi Setup & Execution Guide

This guide will walk you through flashing the OS, deploying this code to your Raspberry Pi, and running the physical robot.

## Phase 1: Burning the Raspberry Pi OS
Since the Pi will sit inside the snake, it will run "headless" (without a monitor).

1. **Download Raspberry Pi Imager:** Install it on your Windows PC from the official Raspberry Pi website.
2. **Insert SD Card:** Plug the 32GB SD card into your PC.
3. **Configure Imager:**
   - **Device:** Select `Raspberry Pi 4`.
   - **OS:** Choose `Raspberry Pi OS (64-bit)` (Lite is fine if you don't need a desktop UI, otherwise choose Full).
   - **Storage:** Select your 32GB SD Card.
4. **OS Customization (Crucial for Headless Setup):**
   - Click the gear icon (or "Edit Settings") before writing.
   - Check **Set hostname** (e.g., `surgesnake.local`).
   - Check **Enable SSH** (Use password authentication).
   - Set **Username and Password** (e.g., user: `pi`, pass: `password`).
   - Check **Configure wireless LAN** and enter your home Wi-Fi SSID and Password.
5. **Write:** Click "Write" to burn the OS.

---

## Phase 2: Hardware Wiring & Booting
1. Insert the flashed SD card into the Raspberry Pi.
2. Plug the USB-C 5V 3A adapter into the Pi to boot it up.
3. Plug the **U2D2 Interface** into one of the Pi's USB ports.
4. Connect the **5V 10A Power Supply** to the **U2D2 PHB Power Board** (Double check positive/negative polarity!).
5. Daisy-chain your 2 Dynamixel motors to the U2D2 PHB.

---

## Phase 3: Accessing the Pi and Installing Dependencies
Wait about 2 minutes for the Pi to boot and connect to your Wi-Fi.

1. Open PowerShell on your Windows PC and SSH into the Pi:
   ```bash
   ssh pi@surgesnake.local
   ```
   *(Accept the fingerprint prompt and enter your password).*
2. Once inside the Pi, update the system and install the required Python libraries:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   sudo apt install python3-pip
   pip install dynamixel-sdk pyserial
   ```
3. Add your user to the `dialout` group so Python can access the USB port without root permissions:
   ```bash
   sudo usermod -aG dialout pi
   ```
   *You must log out and log back in (or reboot the Pi) for this to take effect.*

---

## Phase 4: Copying the Code (Windows to Pi)
You have this `SURGE-SNAKE` folder on your Windows Desktop. We need to send it to the Pi.

### Method A: Using SCP (Command Line)
Open a **new** PowerShell window on your Windows PC (not the SSH session) and run:
```bash
scp -r ./surge090 <user>@<host>:~/
```
This will copy the entire folder over the network.

### Method B: Using WinSCP (GUI)
1. Download and install [WinSCP](https://winscp.net/).
2. Connect to `surgesnake.local` using your Pi's username and password.
3. Drag and drop the `SURGE-SNAKE` folder from your desktop into the `/home/pi/` directory.

> **Note on USB Ports:** 
> I have already updated the Python scripts to automatically detect that they are running on a Raspberry Pi (Linux) and they will look for the U2D2 at `/dev/ttyUSB0` instead of `COM3`. You do not need to manually change the code!

---

## Phase 5: Testing & Running
SSH back into your Pi (`ssh pi@surgesnake.local`) and navigate to the folder:
```bash
cd SURGE-SNAKE
```

**1. Ping the Motors:**
```bash
python3 tests/test_dynamixel_ping.py
```
*You should see output confirming communication with Motor 1 and Motor 2.*

**2. Test Obstacle Load Detection:**
```bash
python3 tests/test_motor_feedback.py
```
*Squeeze the motor lightly while it spins; watch the current/mA reading spike.*

**3. Run the Main Snake Loop:**
```bash
python3 main.py
```
*The motors will begin executing the rolling helix wave. If you grab one, it will trigger the reverse-and-turn evasion sequence!*

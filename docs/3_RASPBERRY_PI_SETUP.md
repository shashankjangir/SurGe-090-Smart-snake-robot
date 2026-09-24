# SURGE-SNAKE: Raspberry Pi Setup & Execution Guide

This guide will walk you through flashing the OS, deploying this code to your Raspberry Pi, and running the physical robot.

---

## 🚀 TL;DR: Daily Launch Sequence (Windows cmd.exe)
*Follow these steps **every time** you boot your Pi and want to run your project with a GUI popping up on your Windows PC.*

1. **Power on the Pi:** Wait 1-2 minutes for it to boot and connect to Wi-Fi.
2. **Start the Windows X-Server:** 
   - Open **XLaunch** from your Windows Start menu.
   - Click *Next* until the "Extra settings" screen.
   - **CRITICAL:** Check **"Disable access control"**, then click Finish.
3. **Open Command Prompt (`cmd.exe`):**
   - Press Win+R, type `cmd`, and press Enter.
4. **Connect via SSH with X11 Forwarding:**
   - Run the following two commands exactly as written:
     ```cmd
     set DISPLAY=localhost:0.0
     ssh -Y smartsnake@snakerobo.local
     ```
     *(Change `smartsnake@snakerobo.local` if your username or hostname is different, e.g., `smartsnake@snakerobo.local`).*
5. **Run Your Code:**
   - Navigate to your project folder: `cd SURGE-SNAKE`
   - Run your Python script: `python3 main.py`
   - Your GUI window will now automatically pop up on your Windows PC!

---
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
   - Check **Set hostname** (e.g., `snakerobo.local`).
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
   ssh smartsnake@snakerobo.local
   ```
   *(Accept the fingerprint prompt and enter your password).*
2. Once inside the Pi, update the system:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

3. **Install Python Libraries:**
   On the newest Raspberry Pi OS (Bookworm and later), you cannot use standard `pip install` globally without getting an "externally-managed-environment" error. 

   **Method A: System Packages (Best for large libraries like Matplotlib)**
   ```bash
   sudo apt install python3-flask python3-psutil python3-serial python3-pip
   ```

   **Method B: The Quick Override (If a library isn't in apt)**
   ```bash
   pip install pybullet --break-system-packages
   ```

   **Method C: Python Virtual Environment (Best Practice)**
   ```bash
   python3 -m venv ~/snake_env
   source ~/snake_env/bin/activate
   pip install flask psutil pyserial pybullet
   ```
   *(If you use a venv, remember you must run `source ~/snake_env/bin/activate` before running your code every time).*

4. Add your user to the `dialout` group so Python can access the USB port without root permissions:
   ```bash
   sudo usermod -aG dialout smartsnake
   ```
   *You must log out and log back in (or reboot the Pi) for this to take effect.*

---

## Phase 4: Copying the Code (Windows to Pi)
You have this `SURGE-SNAKE` folder on your Windows Desktop. We need to send it to the Pi.

### Method A: Using SCP (Command Line)
Open a **new** PowerShell window on your Windows PC (not the SSH session) and run:
```bash
scp -r "C:\Users\bansi\OneDrive\Desktop\SURGE-SNAKE" smartsnake@snakerobo.local:/home/smartsnake/
```
This will copy the entire folder over the network.

### Method B: Using WinSCP (GUI)
1. Download and install [WinSCP](https://winscp.net/).
2. Connect to `snakerobo.local` using your Pi's username and password.
3. Drag and drop the `SURGE-SNAKE` folder from your desktop into the `/home/smartsnake/` directory.

> **Note on USB Ports:** 
> I have already updated the Python scripts to automatically detect that they are running on a Raspberry Pi (Linux) and they will look for the U2D2 at `/dev/ttyUSB0` instead of `COM3`. You do not need to manually change the code!

---

## Phase 5: Testing & Running
SSH back into your Pi (`ssh smartsnake@snakerobo.local`) and navigate to the folder:
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

---

## Phase 6: Monitoring Raspberry Pi Health & Hardware

Because the Pi 5 runs hotter and faster, monitoring its performance and temperature is important.

### Checking CPU Temp & Fan Speed
- **CPU Temperature:** `vcgencmd measure_temp` (gives `temp=48.2'C`)
- **Fan RPM:** `cat /sys/devices/platform/cooling_fan/hwmon/*/fan1_input` (returns 0 if fan is off)
- **Live Monitor:** Refresh both every 2 seconds by running:
  ```bash
  watch -n 2 "vcgencmd measure_temp && echo 'Fan RPM:' && cat /sys/devices/platform/cooling_fan/hwmon/*/fan1_input"
  ```

*Note on Fan Orientation: The side with the technical sticker is the side air flows out of. If mounting directly on the Pi 5 CPU/heatsink, the sticker side should face DOWN towards the board.*

### Hardware & Resource Stats
- **All-in-One Visual Dashboard:** Install `btop` (`sudo apt install btop`) and run `btop`.
- **RAM Usage:** `free -h`
- **Storage Space:** `df -h /`
- **CPU Architecture details:** `lscpu`
- **Board Map:** `pinout`

---

## Phase 7: GUI X11 Forwarding on Windows (Using cmd.exe)

If you need to view a GUI application running on the headless Raspberry Pi directly on your Windows PC monitor, follow these steps.

**1. Install VcXsrv (XLaunch) on Windows:**
- Download and install VcXsrv.
- Run XLaunch. On the "Extra settings" screen, you **must** check **"Disable access control"**.

**2. Configure the Raspberry Pi:**
- Ensure X11 authentication is installed: `sudo apt install xauth`
- Edit the SSH config: `sudo nano /etc/ssh/sshd_config`
- Add or modify the following lines (uncomment them if necessary):
  ```plaintext
  X11Forwarding yes
  X11UseLocalhost no
  AddressFamily inet
  ```
- Restart the SSH service: `sudo systemctl restart ssh`
- Type `exit` to disconnect.

**3. Connect from Windows using cmd.exe:**
Open your Windows `cmd.exe` prompt and set the display variable before connecting. The `-Y` flag enables trusted X11 forwarding.
```cmd
set DISPLAY=localhost:0.0
ssh -Y smartsnake@snakerobo.local
```
*(If you were using PowerShell, the command would be `$env:DISPLAY="localhost:0.0"`)*

**4. Test the GUI Connection:**
On the Pi, check that the variable is set:
```bash
echo $DISPLAY
```
*(It should output something like `localhost:10.0`)*. 
To test, install `sudo apt install x11-apps` and run `xeyes`. A window with cartoon eyes should pop up on your Windows desktop!

---

## Phase 8: Running Small LLMs (Ollama)

To run local LLMs (e.g., to control the Snake), stick to smaller, quantized models (1B to 3B parameters) since the Pi 5 runs inference entirely on the CPU.

**Recommended Models:**
- `Gemma 3 (1B)` or `Llama 3.2 (1B)`: ~15-20 tokens/sec. Fast and fluid.
- `Llama 3.2 (3B)` or `Qwen 2.5 Coder (3B)`: ~5-8 tokens/sec. Smarter but slower.

**Implementation Tips for Snake:**
- **Prompting:** Small models struggle with spatial reasoning (2D arrays). Instead of an ASCII grid, provide explicit coordinates (e.g., *Your head is at (5,5), Apple is at (7,5)*).
- **Chain-of-Thought:** Ask the LLM to output its rationale before making a move.
- **Tools:** Use frameworks like `SnakeBench` or custom LangChain setups to connect your Python game loop with the Ollama server.

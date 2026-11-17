# SurGe on Raspberry Pi

This package is the legacy **10-joint** distribution. Its code and calibration map are a matched pair for IDs 1–10. For the current 12-joint robot, export the maintained `generations/gen3-experimental-3d/` dashboard and its matching map together, then follow the same Pi setup steps.

The included map saves speed 2144 counts/s, tracking error 492 counts, tracking timeout 0.5 seconds and `calibrated: true`. Its joint travel is 796–3300 counts (±110°). The shared gait validator caps yaw and pitch amplitudes at 90° and shared bias at ±90°. Match this package to a ten-joint assembly before physical operation.

Copy the whole rasp_pi folder onto the Pi. These steps assume 64-bit Raspberry Pi OS with Python 3 and a laptop that can reach the Pi over the local network.

## On the Pi

Open a terminal in the copied folder and install the dependencies once.

```bash
sudo apt update
sudo apt install -y python3-venv python3-dev build-essential
python3 -m venv .venv
.venv/bin/python -m pip install -r generations/gen3-experimental-3d/backend/web_dashboard/requirements.txt
```

PyBullet may build from source on the Pi, which can take a while.

Start the server from this folder. Enter a private password when prompted. Use the same password for Operator login.

```bash
read -rsp 'SurGe operator password: ' SURGE_OPERATOR_PASSWORD
echo
export SURGE_OPERATOR_PASSWORD
.venv/bin/python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

Leave the server running. For the physical robot, plug the existing ESP32 transmitter into the Pi over USB. Choose its Linux serial port in the dashboard, usually /dev/ttyUSB0 or /dev/ttyACM0. If the Pi reports a permission error, run `sudo usermod -aG dialout "$USER"`, then sign out and back in.

## On the laptop

Enable SSH on the Pi through Raspberry Pi Configuration or raspi-config. Run `hostname -I` on the Pi to find its local IP. In a laptop terminal, replace PI_USER and PI_IP with your Pi username and address.

```bash
ssh -N -L 127.0.0.1:5000:127.0.0.1:5000 PI_USER@PI_IP
```

Leave that terminal open. Browse to [Gen 3 through the tunnel](http://localhost:5000/gen3) and log in as Shashank, Bhavesh, or Mahima. Use the Simulation workspace or start with Hardware in Dry run. Plug or pair a standard browser gamepad with the laptop, or use the dashboard's on-screen controls.

The phone controller is served at /phone. A separate phone needs its own access to the dashboard. The laptop-only tunnel does not expose it to the phone.

## 3D Motions (controller steering)

In the Simulation workspace, choose **3D Motions · controller steered** in the gait preset list and select Load preset. Connect the simulation engine, enable the Simulation controller, hold LB, press A, then hold RT to move. Left stick left/right sets the direction of travel, and the snake turns there from the head back. Up/down raises the head up to 30° or lowers it to the floor. The viewport's 3D STEER line shows the current → desired heading and head pitch. Turns are slower with the head raised. 3D Motions runs in Simulation and Dry run only; Hardware refuses it until it has been trialled on the robot.

The package includes its 10-joint map. It omits the PC's serial-port hint, passwords, run history, and the firmware build/upload toolchain.

The default manual controller has no server input-gap timeout. LB release, B and Stop remain the normal stop controls. Keep the laptop controls available and stop before leaving them.

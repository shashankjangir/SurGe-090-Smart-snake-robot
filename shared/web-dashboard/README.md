# Web dashboard

The dashboard is the browser interface for Gen 2.1. It brings gait settings,
manual control, servo feedback and simulation into one place. It uses the same
controller package as the desktop app and gamepad.

## Run

From the repository root, using the Python 3.11 environment:

```powershell
.venv/Scripts/python.exe -m pip install -r shared/requirements.txt
.venv/Scripts/python.exe shared/web-dashboard/web_app.py
```

Open `http://127.0.0.1:5000`. Simulation is selected initially. Connect to the
chosen engine, then start motion. In hardware mode, select the serial port for
the Gen 2.1 receiver or its wireless transmitter. STOP requests torque-off.

For a dashboard on the local network, launch with `--host 0.0.0.0`. The app has
no authentication, so use it on a trusted network.

## What the views show

The main page combines gait controls, a planar view and feedback. The `/3d`
page displays the simulated segment transforms. Path drawing and accuracy
reports are simulation features; the robot does not yet supply the localization
needed to use them on hardware.

Servo feedback and sensor-node readings are displayed separately, including
missing samples. The 3D model is a visual approximation, and its browser
resources currently depend on external CDNs.

The [operating guide](../../docs/1_APP_USAGE_MANUAL.md) covers the controls.
The [API reference](../../docs/API_DOCUMENTATION.md) documents commands and
feedback. For development, `create_app()` creates the Flask app without starting
hardware or a worker; an embedded caller starts `runtime.start_worker()` and
closes it with `runtime.close()`.

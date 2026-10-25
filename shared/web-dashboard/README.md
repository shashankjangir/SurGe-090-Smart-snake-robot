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

## Gen 3 commissioning

Open `http://127.0.0.1:5000/gen3` for alternating yaw/pitch commissioning.
The link in the planar dashboard's navigation opens the same page. Start the
same server; no firmware changes or new dependencies are needed. With the
Windows conda environment used for this robot:

```powershell
conda run --no-capture-output -n surge python shared/web-dashboard/web_app.py
```

The Gen 3 page uses the existing finite commissioning runner rather than the
planar gait engine. It provides serial-port selection, torque-off reads (including
partial feedback), single-joint jogs, a calibration table in physical head-to-tail
order, CSV downloads, preview, simple headless simulation, and finite hardware
trials. Simulation feedback is labeled as simulation; previews contain no
measured feedback. Speed, positions and phase bounds are checked before motion.

The measured straight-pose zeros remain in `gen3-experimental-3d/joint_map.json`.
Axes, signs, physical ID order, measured clearance limits and tracking settings
must still be established. The map remains uncalibrated, and hardware gait jobs
are rejected until the operator confirms those measurements. Editing a table
field clears the page's calibrated confirmation. Saving validates the whole map,
backs up its previous contents under `gen3-experimental-3d/runs/`, and replaces
the file atomically. Never enable calibrated merely to dismiss a rejection.

Read/jog do not require a calibrated map. Reads display missing/invalid motors
without invented positions; missing motors still block any full-chain hardware
trial. In particular, motors 7 and 8 need their physical power/connectivity fixed.
Jogs enable only one motor and require all other links to be supported.

The backend excludes concurrent planar and Gen 3 connection owners. Close CLI
tools and serial monitors, which are outside that exclusion. Stop cooperatively
cancels the job, then runs transport STOP/disconnect cleanup. It is not a physical
emergency stop. A job stays busy until cleanup finishes; a missing STOP reply is
shown explicitly. A closed browser does not cancel a finite trial. Stop before
leaving, keep power disconnection accessible, and monitor battery/temperature
separately. Job faults are recorded in CSV; JSON snapshots preserve run settings.
The backend never starts a job automatically on page load.

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

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

The current robot has been individually centered and is to be assembled straight
at encoder 2048 on every motor. All ten neutral targets in
`gen3-experimental-3d/joint_map.json` are now 2048, replacing earlier offsets.
The CLI, web trials and simulation all read that same map. Refresh the Gen 3
page after changing it so the editor does not retain an older copy.
The owner reports ±90° mechanical clearance; software limits remain at the
receiver-supported 1252–2844 (about ±70° around 2048). The map now uses that
supported range rather than the earlier example limits. Verify assembled cable
and linkage clearance before trials.
The owner has supplied the axis/direction table for all ten joints. The current
map is marked calibrated for small commissioning trials at 100 counts/s: odd IDs
are pitch, even IDs yaw, ordered 1 through 10. The current saved signs are +1 for
ID 1 and all yaw IDs, -1 for pitch IDs 3/5/7/9. This matches the confirmed owner
observations recorded in `docs/GEN3_HANDOFF.md`. The owner
reported successful pitch trials after the firmware read-back fix. An
uncalibrated map still blocks hardware gait jobs. Editing a table
field clears the page's calibrated confirmation. Saving validates the whole map,
backs up its previous contents under `gen3-experimental-3d/runs/`, and replaces
the file atomically. Never enable calibrated merely to dismiss a rejection.

Read/jog do not require a calibrated map. Reads display missing/invalid motors
without invented positions; missing motors still block any full-chain hardware
trial. Motors 7 and 8 were repaired/reconnected and are now responding.
Jogs enable only one motor and require all other links to be supported.

The backend excludes concurrent planar and Gen 3 connection owners. Close CLI
tools and serial monitors, which are outside that exclusion. Stop cooperatively
cancels the job, then runs transport STOP/disconnect cleanup. It is not a physical
emergency stop. A job stays busy until cleanup finishes; a missing STOP reply is
shown explicitly. Gen 3 hardware motion requests Stop when its operator lease
expires, independently of browser status polling. Stop before
leaving, keep power disconnection accessible, and monitor battery/temperature
separately. Job faults are recorded in CSV; JSON snapshots preserve run settings.
The backend never starts a job automatically on page load.

Control APIs support access across a trusted local network without origin/CSRF gating.
Two roles are enforced: Viewer (default for all browser tabs, read-only observation with
emergency STOP access) and Operator (login via MorphingButton with shared password).
An active operator holds a 3.0s lease renewed via 1.0s heartbeats. Notice: The app has
no transport encryption or network security and must only be operated on a trusted local network.

Gen 3 live Apply requires the current run ID, settings revision and a unique
request ID. Overlapping transitions are rejected. Speed, duration and ramp
changes require a new stopped run. Browser firmware upload is unavailable;
builds are allowlisted and do not flash a board. See
[repair verification](../../docs/GEN3_CODEX_REPAIRS.md) for tested behavior and limits.

## What the views show

The Gen 3 console includes local search above its tabs. Type a control, setting,
preset or phrase from the loaded console content. Enter searches; arrow keys
navigate results; Escape dismisses them. Selecting a result opens its tab and
focuses the destination without activating it. The search does not query the
internet or operate the robot. Frosted fill toggles the field treatment, and
reduced-motion preferences disable the focus animation.

The main page combines gait controls, a planar view and feedback. The `/3d`
page displays the simulated segment transforms. Path drawing and accuracy
reports are simulation features; the robot does not yet supply the localization
needed to use them on hardware.

### Gen 2.1 Dashboard Controls & Layout (Updated 28 October 2026)

- **Central Trajectory Tracking Canvas**: Anchors the 3-column layout. Camera follows the snake head smoothly when running (`panX += (targetPanX - panX) * 0.12`), ensures at least 64 grid blocks remain visible (`Math.sqrt(totalArea / 64.0)`), and prevents accidental scroll interception when the engine is disconnected.
- **Canvas & Dock Controls**: `#btn-canvas-start` and `#btn-canvas-stop` next to `#btn-clear` (which instantly resets pose) and `#btn-tracker-3d`, supplemented by the persistent bottom motion dock (`aria-label="Motion controls"`).
- **Mathematical Path Generation**: Supports 8 presets (Sine wave, Lemniscate $\infty$ parametric figure-8, Archimedean spiral, circular orbit, and damped barrier avoidance) alongside custom formula $y = f(x)$ evaluation.
- **Simulation Physics Tuning**: Includes explicit `#btn-apply-physics` with temporary confirmation pill, `#btn-reset-physics` ("Set to Default"), 2.0 N·m torque baseline, and honest Low Power Mode disclosure (*"Limits simulation gait speed to 10% and torque clamp to ≤1.8 N·m. Note: Does not measure or guarantee motor current on physical hardware."*).
- **Hardware Port Selection**: Dropdown `<select id="serial-port">` with `#refresh-ports` scan button, matching the Gen 3 interface.

Servo feedback and sensor-node readings are displayed separately, including
missing samples. The 3D model is a visual approximation, and its browser
resources currently depend on external CDNs.

The [operating guide](../../docs/1_APP_USAGE_MANUAL.md) covers the controls.
The [API reference](../../docs/API_DOCUMENTATION.md) documents commands and
feedback. For development, `create_app()` creates the Flask app without starting
hardware or a worker; an embedded caller starts `runtime.start_worker()` and
closes it with `runtime.close()`.

## October 2026 Unified Cockpit & Consolidated Architecture Addendum

The web dashboard backend has been consolidated directly inside `gen3-experimental-3d/backend/web_dashboard/web_app.py`, serving both the Gen 2.1 planar cockpit and the Gen 3 spatial commissioning console under a unified Playdate/Slush visual architecture.

### Active Launch Command

Execute from repository root (`C:\1. SurGe 090 Smart snake robot`):

```powershell
conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```

*(Default port is `5000` if `--port` is omitted).*

### Route Summary
- `/` — Gen 2.1 Planar Cockpit with centralized trajectory canvas, math waveforms, physics settings, and shared generation switcher.
- `/gen3` — Gen 3 3D Spatial Commissioning with 10-joint telemetry, calibration table, operator auth, finite trial runner, and firmware management.
- `/3d` — 3D Visualizer for spatial pose rendering.

### Shared UI Components
- **Distorted Glass Header & Generation Switcher**: Shared brand header with interactive hover cards revealing technical specs (10x ST3215, planar vs 3D degrees of freedom).
- **Task Tabs**: Locomotion, Live Canvas, Waveforms, Presets, Telemetry, and Setup.
- **Persistent Floating Emergency Stop Dock**: Always visible across all scroll positions and mobile viewports with zero layout shift.


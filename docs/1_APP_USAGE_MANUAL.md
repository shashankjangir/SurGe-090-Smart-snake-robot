# Gen 2.1 operating guide

Run commands from the repository root with the Python environment containing
`shared/requirements.txt`. Python 3.11 is the integration environment.

## Web dashboard

`python shared/web-dashboard/web_app.py` binds to 127.0.0.1:5000.
For a trusted local network use `--host 0.0.0.0`; authentication is not implemented.

1. Select Simulation or Hardware. Hardware port is chosen via `<select id="serial-port">` with scan button `🔄` (e.g. COM3 or /dev/ttyUSB0).
2. Connect. Connections start stopped; hardware handshake requires `receiver_gen2_1`.
3. Draw custom trajectory or select mathematical preset (Sine, Lemniscate ∞ parametric, Archimedean spiral, Circular orbit, Damped wave, or custom formula y=f(x)).
4. Start motion via canvas footer button (`#btn-canvas-start`) or the bottom motion dock (`#btn-start`).
5. STOP disables hardware torque through the receiver; disconnect also sends STOP. A physical E-stop remains mandatory.
6. Tuning: Adjust simulation physics sliders and commit with "Apply Simulation Physics" (`#btn-apply-physics`) or reset with "Set to Default" (`#btn-reset-physics`).

Hardware uses manual gait steering. Drawn paths and physical accuracy reports
are unavailable because there is no measured world pose. The simulation path
score is a display metric relative to 0.5 m deviation, not a research accuracy claim.
Slow gait / Low Power Mode reduces commanded simulation speed to 10% and torque to ≤1.8 N·m (Updated 28 October 2026); it does not measure or guarantee motor current on physical hardware.

## Desktop and headless

```sh
python shared/desktop-app/app.py --sim --duration 3
python shared/desktop-app/app.py --gui
python shared/desktop-app/app.py --gui --port COM3
python shared/desktop-app/app.py --hardware --port COM3 --duration 10
```

Default is a 10-second headless simulation. `--duration 0` runs until Ctrl+C.
Tkinter and Matplotlib load only for `--gui`. The desktop Connect and Start
button deliberately starts motion; its STOP button disables torque. Reconnect
to restart. Desktop hardware runs the straight planar gait; drawn paths and reports
are simulation-only. Use the web/gamepad controller for manual steering.

## Gamepad

`python shared/gamepad/controller_node.py` sends to the local dashboard.
Use `--url http://<host>:5000` for a different host.
A=start, B=stop, X=reverse, Y=amplitude preset; left stick steers.
Loss of an active controller stream stops the web runtime after 750 ms.
The receiver separately stops when target packets cease for 750 ms.
Radio delivery and actual stop latency still need hardware measurement.

## Bench tools — physical movement

```sh
python gen2-st3215/tools/align_gen2_1.py --port COM3
python gen2-st3215/tools/sine_gen2_1.py --port COM3 --duration 10
python gen2-st3215/tools/spiral_gen2_1.py --port COM3 --duration 10
```

Alignment requires encoder feedback from all ten motors within 30 counts of centre
for two consecutive samples. A timeout does not report success. All tools request
STOP and close the port in cleanup. Port selection may also use `SURGE_PORT`.

## Other versions

Gen 2.0 `main.py` uses the 1 Mbps transparent bridge, not the Gen 2.1 text receiver.
Gen 2.0 `robot_esp32_v2` generates its own onboard gait. Gen 3.0 is a separate
experiment; its script defaults to printing targets without opening hardware.
See [versions](versions/VERSIONS.md) and [firmware](../gen2-st3215/firmware/README.md).


## Gen 3 operating guide

Navigate to `http://127.0.0.1:5001/gen3` (or switch via the header generation switch pill).

### Roles & Access
- **Viewer Mode**: Default for all connections. Viewers see live telemetry, run history, and preset configurations. The emergency **STOP / Torque off** button is always accessible.
- **Operator Mode**: Click the **[ 🔒 Password ]** pill in the top header. Enter an authorized operator name (`Shashank`, `Bhavesh`, `Mahima`) and shared password. The button expands with spring physics and auto-focuses. Upon submission, an active 3.0s lease is granted, renewed automatically every 1.0s.

### Operational Tabs
1. **Controls Tab (`[🎮 Controls]`)**:
   - Form for Waveform Mode (Yaw-only, Pitch-only, Combined 3D).
   - Sliders for Amplitude, Bias, Frequency, Direction, Lag, Offset, and Duration.
   - Speed Demand Gauge (`font-variant-numeric: tabular-nums`) showing instantaneous velocity envelope.
   - Live Tuning: Adjust parameters and click **Apply Live Tuning** to transition smoothly via monotonic phase integration.
2. **Runs & Presets (`[📍 Runs & Presets]`)**:\
   - Select from built-in presets (e.g. `Pitch wave 5°`, `Pitch wave 10°`) or save custom presets.
   - Runs journal displays past runs with CSV/JSON log download links and manual annotation inputs (measured displacement in cm, surface type, qualitative notes).
3. **Calibration & Diagnostics (`[⚡ Calibration & Diag]`)**:
   - Query Disarmed `D` Diagnostics: reads model, raw voltage, and temperature without arming.
   - Physical-order calibration map (ID 1 to ID 10) with optimistic concurrency SHA256 tokens.
   - Single-joint jog maintenance with automatic neutral return.
4. **Firmware Tab (`[🛠 Firmware]`)**:
   - Allowlisted PlatformIO environment selector (`receiver_gen2_1`, `transmitter_gen2_1`).
   - Build trigger with scrollable build terminal log.
   - Triple-confirmed upload dialog (safe mock upload mode enabled by default).

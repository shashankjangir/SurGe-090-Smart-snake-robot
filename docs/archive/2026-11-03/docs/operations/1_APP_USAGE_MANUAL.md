# Gen 2.1 operating guide

Run commands from the repository root with the Python environment containing
`generations/gen3-experimental-3d/backend/web_dashboard/requirements.txt`. Python 3.11 is the integration environment.

## Web dashboard

`python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py` binds to 127.0.0.1:5000.
Motion controls require an active operator login. See
[controller operation](CONTROLLER_UPGRADES.md) for browser gamepad setup,
hold-to-run, 3D inspection and measured-pose navigation.

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

`python generations/gen3-experimental-3d/controller_node.py --gen 2.1 --operator NAME`
sends to the local dashboard (simulation by default; `--port COM7` selects hardware).
Use `--url http://<host>:5000` for a different host.
A starts while LB is held, B stops, X reverses smoothly, Y blends shape; left stick
steers and RT controls gait rate. Loss of input expires after 500 ms.
The receiver separately stops when target packets cease for 750 ms.
Radio delivery and actual stop latency still need hardware measurement.

## Bench tools — physical movement

```sh
python generations/gen2-st3215/tools/bench_gen2_1.py align --port COM7
python generations/gen2-st3215/tools/bench_gen2_1.py sine --port COM7 --duration 10
python generations/gen2-st3215/tools/bench_gen2_1.py spiral --port COM7 --duration 10
```

Alignment requires encoder feedback from all ten motors within 30 counts of centre
for two consecutive samples. A timeout does not report success. All tools request
STOP and close the port in cleanup. Port selection may also use `SURGE_PORT`.

## Other versions

Gen 2.0 `main.py` uses the 1 Mbps transparent bridge, not the Gen 2.1 text receiver.
Gen 2.0 `robot_esp32_v2` generates its own onboard gait. Gen 3.0 is a separate
experiment; its script defaults to printing targets without opening hardware.
See [versions](../versions/VERSIONS.md) and [firmware](../../generations/gen2-st3215/firmware/README.md).


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

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**Gen 3 control console (1–2 Nov).**
- Saved `joint_map.json`: speed 1500, `tracking_error` **216** (was 100), timeout 0.5 s; sign map
  unchanged (pitch ID 1 = 1, IDs 3/5/7/9 = −1, yaw = 1). Software now accepts speed 1–3000
  counts/s; 3000 is a command ceiling, not a measured capability.
- Live telemetry: each joint shows error, peak error and a 2 s error-trend sparkline recorded at
  the 20 Hz loop rate. Colours now use the running job's real limit (fixed a hard-coded 25-count bug).
- Per-joint control: new pose mode (Move to Pose, hold 2–300 s, return to neutral) and per-joint
  gait overrides (enabled, gain 0–2, phase ±180°, bias ±70°), all limit-checked before start.
- Shape presets (Straight, Head raised, Cobra stand, Cobra stand tall, Ring near-closed, S-curve rest)
  and Caterpillar crawl presets (10° commissioning, 20°). Tuned in simulation only.
- Controls has a 3D Gait Preset selector that loads the draft only; it never starts motion.
- Transmitter COM port is recommended from the USB socket and remembered in
  `transmitter_port.json` (gitignored).

**Gen 2.1 radio firmware (31 Oct).**
- Fixed `surge_sign_text_command`: it returned `bool` but its caller used the value as the packet
  length, so only one byte was sent. It now returns the full length.
- At the owner's request, all wireless commands now use **plain text**. Transport was adapted from partner
  repo `Snake_SURGE` commit `7d80490`. The receiver accepts known commands without HMAC, sequence or MAC
  allowlist; use only in a controlled environment.
- Kept: watchdog Stop, torque-off read-back, joint limits, queue-overflow Stop, packet bounds/printable
  checks and EEPROM maintenance lock.
- Both boards were uploaded with servo power disconnected. **COM6 = receiver** (`28:05:a5:4f:e5:ac`),
  **COM7 = PC transmitter** (`68:09:47:5c:10:ec`). HELLO → `SURGE,2.1` exchanges passed, including after
  a transmitter-only reset. Use COM7 for the dashboard.
- `platformio.ini` transmitter monitor: `send_on_enter`, LF line endings.
- New `tests/test_text_auth.cpp` compiles for ESP32. It was not run on the host because no host compiler is installed.

**Dashboard and website (31 Oct – 2 Nov).**
- Fonts are self-hosted (Antonio, Bowlby One, Inter; `static/fonts/`). Images are WebP.
- Removed the GSAP bundle, `socket.io.min.js` and `snake_motion.mp4`. `OrbitControls-r128.js` is vendored for `/3d`.
- `web_app.py` adds asset versioning, compression and cache headers.
- Generation-switch transition rewritten as one 2D-canvas controller (shaded 3D and flat planner
  variants, approaching viper head); no GSAP.
- Hero snake trail is 1.5× stronger. Battery indicator added to both headers.
- 2 Nov "AI-look" audit (`archive/AI_LOOK_AUDIT_REPORT.md`, screenshots in `report-assets/`).
  Follow-ups: remediation plan `docs/ideas/ai-look-remediation-plan.md` and research
  `docs/research/ai-look-primary-research.md`. These are **proposals only, not implemented**.

**Hardware status (as of 2 Nov).**
- **No fuses are installed** (owner, 1 Nov). Fuses in the split-bus v3 drawing are design intent only.
- Power: external 3S 1800 mAh LiPo on long wires; the central battery section is removed.
- 31 Oct trial: 30° yaw / 25° pitch, 0.5 Hz, speed 1500. ID 1 had a WRITE failure and IDs 7/8 stopped
  replying. Owner then reported a wiring fault and fixed it.
  Still pending: a logged all-ten diagnostics query, and a repeat of the trial with minimum voltage recorded.
- Both dashboard headers show a BATTERY estimate from cached diagnostic voltages
  (`clamp((V − 11.1) / 1.5 × 100)`). It is a sampled recharge hint, not live state of charge.

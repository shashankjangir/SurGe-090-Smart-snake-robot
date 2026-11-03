# Repository Comparison: Snake_SURGE vs. SurGe-090

Comparison between base repository [bhaveshbanshiwal/Snake_SURGE](https://github.com/bhaveshbanshiwal/Snake_SURGE) and current repository [shashankjangir/SurGe-090-Smart-snake-robot](https://github.com/shashankjangir/SurGe-090-Smart-snake-robot).

---

## 1. High-Level Summary

| Dimension | Base Repository (`Snake_SURGE`) | Current Repository (`SurGe-090`) |
| :--- | :--- | :--- |
| **Architecture** | Flat single-folder prototype | 3-generation modular architecture (`gen1`, `gen2`, `gen3`) |
| **Hardware Targets** | Mixed/untracked ST3215 & SG90 experiments | Gen 1 (Dynamixel XL330), Gen 2/2.1 (Planar ST3215), Gen 3 (3D Spatial ST3215) |
| **Power Distribution** | Single direct rail (brownout/short prone) | Split Power Bus v3 (15A main split across 5× 3A regulated branches) |
| **Firmware Stack** | Standalone `.ino` sketches | PlatformIO multi-environment build + structured text protocol |
| **Locomotion** | Basic 2D serpenoid wave equation | Planar continuous projection, PID cross-track steering, 3D spatial gaits |
| **Operator UI** | Desktop Tkinter GUI + rudimentary Flask UI | Dual-generation responsive web cockpit (Slush design, WebGL 3D, Gamepad/QR) |
| **Safety & Security** | None (open endpoints, unverified bounds) | PBKDF2 operator auth, exclusive lease locks, auto-stop fail-safe, angle clamps |
| **Test Coverage** | 4 basic hardware ping scripts | 110+ automated tests (Python pytest + Node.js Puppeteer/Playwright test suites) |

---

## 2. Structural & Generational Reorganization

```
Base (Flat Structure):
├── app.py / web_app.py
├── src/ (mixed kinematics, serial, simulator)
├── 3d_parts/ (unversioned CAD)
└── templates/ & static/ (legacy styles)

Current (Generational Modular Structure):
├── generations/gen1-dynamixel/          # Dynamixel XL330 prototype (Raspberry Pi, U2D2, CAD, docs)
├── generations/gen2-st3215/             # Planar ST3215 robot (CAD v1-v6, split bus, host/firmware tools)
├── generations/gen3-experimental-3d/    # 3D spatial robot (10 alternating pitch/yaw joints, 3D gaits)
│   ├── backend/             # Unified Flask/Socket.IO backend + `surge_control` package
│   ├── cad/                 # Plate-chain and 3D motion connectors
│   └── tests/               # 40+ unit and browser integration tests
├── audit/ & tests/          # Root test suites and security remediation audits
├── docs/                    # Architectural decisions, wiring schematics, and handoff logs
└── platformio.ini           # Unified embedded build configuration
```

---

## 3. Key Feature Changes

### Mechanical & CAD
- **Base:** Generic ST3215 proxy step and single segment 3D mesh.
- **Current:**
  - Iterative body segment CAD versions (v4, v5, and design-of-record **v6**).
  - 11-connector frame accommodating 10 servos in alternating orthogonal planes (odd IDs = vertical pitch, even IDs = horizontal yaw).
  - Derived simulation CAD meshes for WebGL rendering.

### Power & Electronics
- **Base:** Direct battery/adapter feeds causing driver short circuits and reset loops.
- **Current:**
  - **Split Power Bus v3:** 15A master input stepped down to 5 independent 3A buck channels (2 servos per channel).
  - Isolated logic and motor ground planes.
  - Dual-ESP32 architecture: USB transmitter base station + robot receiver board running ESP-NOW.

### Firmware & Communication Protocol
- **Base:** Raw byte streaming and basic Arduino sketches (`esp32_st3215.ino`, `esp_now_transmitter.ino`).
- **Current:**
  - Standardized text protocol: `HELLO`, `RUN`, `STOP`, and `P,id:pos:speed`.
  - PlatformIO unified build system with board configurations for multiple targets.
  - Heartbeat monitoring and communication loss recovery.

### Kinematics, Gaits & Path Simulation
- **Base:** Basic 2D sine wave calculation; trajectory stalled prematurely after 20% traversal.
- **Current:**
  - Continuous whole-path undulation via segment projection in `path_engine.py`.
  - Cross-track error PID steering with nearest-point trajectory acquisition.
  - 3D locomotion gaits: Lateral undulation, sidewinding, rolling, helix/spiral, and pure pitch waves.
  - Head-frame referenced kinematics (ID 1 designated as snake head).
  - Calibrated sign mapping: Pitch ID 1 = `+1`, Pitch IDs 3/5/7/9 = `-1`, all Yaw IDs = `+1`.

### Web Dashboard & Visualization
- **Base:** Monolithic Tkinter desktop interface (`app.py`) and static Flask dashboard (`web_app.py`).
- **Current:**
  - **Gen 2.1 Planar Cockpit (`/`):** Responsive 5-box layout (Mathematical Presets, Gamepad/QR Node, 520px Trajectory Canvas with touch/pen drawing, Sim Physics, and 2×5 10-Joint Actuator Telemetry).
  - **Gen 3 3D Console (`/gen3`):** Multi-tab console (*Operate*, *Calibration*, *Firmware*, *Terminal*).
  - **Interactive 3D WebGL Viewer:** Three.js-based rendering with custom camera follow modes, ordered 3D routes, and trail overlays.
  - **Slush Design Identity:** Micro-interactions (`PixelSnakeHeading`, `GridBeam`, `ShaderLensBlur`, `MorphingButton`, `DistortedGlass`) and View Transitions API page morphing.
  - **Input Devices:** Web Gamepad API support and QR-code mobile operator node.

### Safety, Security & Quality Assurance
- **Base:** No authentication, raw serial passthrough, unvalidated parameter inputs.
- **Current:**
  - **Operator Session Gating:** PBKDF2 password hashing, lease-based exclusive control tokens, and automatic lease timeout.
  - **Hardware Safeguards:** Emergency stop fail-safe, calibrated straight neutral at 2048 counts, software bounds clamped to 1252–2844 (±70°).
  - **Automated Verification:** 110+ tests spanning Python kinematics, web endpoints, security revalidation, and headless browser UI tests.
  - **Knowledge & Dependency Tracking:** Graphify visual architecture reports.

---

## 4. File-Level Change Map

| Subsystem | Base Location | Current Location | Status / Change |
| :--- | :--- | :--- | :--- |
| **Planar Control App** | `app.py`, `web_app.py` | `generations/gen3-experimental-3d/backend/web_dashboard/` | Re-architected as unified web app |
| **Kinematics Engine** | `src/snake_locomotion.py` | `backend/surge_control/gait.py` | Upgraded to 3D gaits & head-frame logic |
| **Path Follower** | `src/path_engine.py` | `backend/surge_control/path_engine.py` | Added segment projection & continuous pathing |
| **Physics Simulation** | `src/simulation_interface.py` | `backend/simulation/` | PyBullet backend with URDF + WebGL frontend |
| **Motor Interface** | `src/st3215_interface.py` | `backend/surge_control/hardware.py` | Rewritten with safety bounds and lease locking |
| **Firmware** | `src/esp32_st3215/` | `generations/gen2-st3215/firmware/`, `platformio.ini` | Migrated to PlatformIO & structured protocol |
| **CAD Files** | `3d_parts/` | `generations/gen1-dynamixel/cad/`, `generations/gen2-st3215/cad/`, `generations/gen3-experimental-3d/cad/` | Versioned across generations (v1 to v6) |
| **Documentation** | 10 Markdown docs | `docs/` (35+ technical guides & handoffs) | Added wiring v3, handoffs, and audit logs |
| **Test Suites** | None (4 test scripts) | `tests/`, `generations/gen3-experimental-3d/tests/` | 110+ comprehensive automated tests |

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

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

**Simulation now uses the owner's CAD assembly (2 Nov).**
- Browser viewer and default PyBullet model load the V2 prototype
  `cad/3D_motion_parts/V2/assembly_neutral_2048_PROTOTYPE_fit_and_load_validation_required_v2.SLDASM`
  (round Ø57 mm bodies, covered tail, head sensor bay), exported read-only from SolidWorks.
- Joint pivots: 20.61 mm head to ID 1, then 58.37 mm; bounds ≈ 679 × 57 × 57 mm.
  Contact boxes follow the CAD section (0.057 m).
- Mass (0.25 kg/body), box inertia and friction (0.8, anisotropy `[0.1, 1, 1]`) are still illustrative.
- New tools `tools/export_native_assembly.ps1` and `tools/export_assembly_simulation.py`
  produce `static/models/gen3-cad.json` and `gen3-body-0..10.obj`. The older KiCad exporter is superseded.
- `--link-length` still selects the older uniform-box bench.
- PyBullet caterpillar result: lag −72° moved +0.21 m in 24 s; +72° moved −0.13 m.
  Shape presets were tuned with the old 0.1 m links and need re-tuning on the CAD spacing.
- Details: `docs/gen3/GEN3_SIMULATION.md`.

**Dashboard and website (31 Oct – 2 Nov).**
- Fonts are self-hosted (Antonio, Bowlby One, Inter; `static/fonts/`). Images are WebP.
- Removed the GSAP bundle, `socket.io.min.js` and `snake_motion.mp4`. `OrbitControls-r128.js` is vendored for `/3d`.
- `web_app.py` adds asset versioning, compression and cache headers.
- Generation-switch transition rewritten as one 2D-canvas controller (shaded 3D and flat planner
  variants, approaching viper head); no GSAP.
- Hero snake trail is 1.5× stronger. Battery indicator added to both headers.
- 2 Nov "AI-look" audit (`docs/archive/AI_LOOK_AUDIT_REPORT.md`, screenshots in `report-assets/`).
  Follow-ups: remediation plan `docs/ideas/ai-look-remediation-plan.md` and research
  `docs/research/ai-look-primary-research.md`. These are **proposals only, not implemented**.

Since this comparison was written, the plain-text ESP-NOW transport from the base repo
(`Snake_SURGE` main `7d80490`) was adapted into the maintained Gen 2.1 transmitter/receiver pair.
The base repo's older dashboard command handlers were **not** taken.

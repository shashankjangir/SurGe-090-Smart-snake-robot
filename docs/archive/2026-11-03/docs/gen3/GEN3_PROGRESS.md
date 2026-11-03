# Gen 3 Control Console · Progress & Security Transition

This document records the architectural adjustments implemented per the Change Request overriding Section 5 (Team access) and the security parts of Sections 1, 6, and 7 of `docs/archive/GEN3_ANTIGRAVITY_PLAN.md`.

---

## 1. Removed Security Layer & Justification

The following security features and mechanisms were removed or omitted:
1. **CSRF Protection**: Removed `csrf_token` generation, cookie distribution, client `X-CSRF-Token` headers, and server-side token validation.
2. **Origin Checks**: Removed `Origin` / `Host` request header validation.
3. **Secret & Session-Key Management**: Removed dynamic secret key generation and per-session cryptographic keys.
4. **Rate Limiting**: Removed request rate limiting.
5. **Opt-in LAN Gating**: Removed localhost-only restriction (`127.0.0.1` / `::1`). The server can listen on `0.0.0.0` to permit dashboard access over the local laboratory area network without extra command-line flags.
6. **Per-Route Authorization Frameworks**: Replaced heavy auth frameworks with lightweight role inspection.
7. **Authenticated Viewer Concept**: Viewers require no authentication whatsoever. Anyone opening `/gen3` on the network is immediately connected in Viewer mode.

### Justification
The SURGE-090 robot operates exclusively within a dedicated, trusted laboratory and bench testing environment. Eliminating complex token exchanges, origin constraints, and LAN firewalls prevents friction during multi-device observation (e.g. tablet or bench laptop monitoring) while eliminating token expiration bugs. A warning notice is preserved in `README.md` stating that the app has no network transport encryption or security and should only be operated on a trusted network.

---

## 2. Role Model: Viewer vs. Operator

The console enforces two distinct roles on the server and UI:

### Viewer (Default for all connections)
- **Permissions**: Read-only observation plus safety STOP.
- **Capabilities**:
  - Live telemetry, joint targets, measured encoder positions, tracking error table.
  - Job execution status, run history, annotations, and CSV/JSON log downloads.
  - Preset library exploration and calibration inspection.
  - Diagnostic snapshots already collected from the bus.
  - Safety STOP: Viewers **can always trigger STOP / Torque Off** at any time.
  - Draft tuning: Viewers can adjust sliders locally in the browser to explore gait parameter values, but no commands are dispatched to the robot.
- **Restrictions**:
  - Cannot start a run, jog, align, apply live parameter updates, save/delete presets, modify calibration map, run bus diagnostics, connect hardware ports, or initiate firmware actions.
  - Mutating UI controls are visibly disabled with accessible labels and tooltips (`Operator mode required`).
  - Direct API calls to mutating endpoints are rejected by the backend with HTTP 403 `{"error": "Operator mode required"}`.

### Operator (Login Required)
- **Permissions**: Full control over robot motion, tuning, calibration, presets, and maintenance.
- **Allowed Operator Names**: Exactly three authorized operators (case-insensitive canonical match):
  1. `Shashank`
  2. `Bhavesh`
  3. `Mahima`
- **Shared Password**: Single shared password stored in `generations/gen3-experimental-3d/operators.json`. Verified using constant-time `hmac.compare_digest` to prevent timing attacks. The password is never written to logs, run manifests, API responses, or URLs.
- **Session**: Managed via server-side session cookie (`surge_gen3_session`) and `X-Session-ID` header.
- **Morphing Password Button UI**: Adapted from the React `MorphingButton` spring animation pattern into vanilla CSS and ES6 (`morphing-button.css` & `morphing-button.js`). The compact pill (`[ 🔒 Password ]`) expands smoothly on click with spring dynamics (`cubic-bezier(0.34, 1.35, 0.64, 1)`) into an inline password input with auto-focus and a morphing submit pill (`[ Login → ]`), collapses on outside click or Escape, and triggers a subtle error shake keyframe on invalid credentials.

---

## 3. Motion-Safety & Ownership Rules

The core motion-safety mechanisms remain strictly enforced:
1. **Single Active Operator**: Only ONE operator may hold the active control lease at any time.
2. **Graceful Multi-User Contention**:
   - If an operator logs in while another operator holds an active lease, the login succeeds but their session is placed in **Viewer mode** with an informative message (e.g., `"Shashank is currently operating"`).
3. **No Takeover During Motion**:
   - Operator lease transfer and logouts are blocked while hardware motion is active. Handoff requires the active run to finish or be stopped.
4. **Heartbeat & Lease Expiry**:
   - The active operator's browser issues a heartbeat every `1.0s` to renew a `3.0s` lease.
   - Viewers cannot renew the lease.
   - If the operator disconnects or the lease expires during hardware motion, the backend immediately requests an emergency safety STOP.
5. **Operator Audit Logging**:
   - Operator names are logged on every `start`, `apply`, `stop`, `jog`, calibration save (`save_map`), and firmware build action in the run records.

---

## 4. Configuration: Operators & Password

Operator accounts and the shared password are configured in:
`generations/gen3-experimental-3d/operators.json`

```json
{
  "operators": [
    "Shashank",
    "Bhavesh",
    "Mahima"
  ],
  "password": "test-only-operator-password"
}
```

- This file is excluded from version control via `.gitignore`.
- To update authorized operator names or change the shared password, edit `operators.json` directly.
- Fallback defaults in `shared/surge_control/session.py` ensure the system operates reliably if the file is absent.

---

## 5. UI Architecture & Interactive Design System

The Gen 3 and Gen 2.1 interfaces have been unified under the Slush Design System with rich interactive physics and compositor-accelerated micro-interactions:
1. **`PixelSnakeHeading`**: Serpentine locomotion wave ($y, x, \theta$ per vertebra link) and cursor-reactive pixel glyph scrambling (`S` → `5` → `$` → `S`) on the `SURGE 090` display headline.
2. **`CanvasFractalGrid`**: Responsive full-window background with traveling wave dot matrix and dual orbital Lissajous gradients (`#3498DB` / `#1ABC9C`).
3. **`GridBeam`**: 2x3 metrics strip with animated glowing light beams traveling across divider lines and 4 selectable color palettes (`colorful`, `mono`, `ocean`, `sunset`).
4. **`ShaderLensBlur`**: WebGL 2D fragment shader backdrop with signed distance field (SDF) rendering for 4 geometric variations (Square, Circle, Ring, Triangle).
5. **`MorphingButton`**: Spring physics operator password input pill with validation shake keyframe on invalid credentials.
6. **`DistortedGlass`**: SVG `<feTurbulence>` frosted glass refraction with specular highlight across the hero ribbon.
7. **`RollingNumber`**: Hardware-accelerated vertical wheel rolls with `font-variant-numeric: tabular-nums`.
8. **In-place Telemetry DOM & Polling Deduplication**: Telemetry rows are updated in-place without `replaceChildren()` to minimize GC churn; `/api/gen3/session` is queried only on operator transitions.

---

## 6. Test Verification Summary

All test suites pass cleanly (updated 28 October 2026):
- `generations/gen3-experimental-3d/tests/test_console.py`: 17/17 tests passed (continuous phase transitions, lease renewal, idempotence, presets, disarmed diagnostics).
- `generations/gen3-experimental-3d/tests/test_console_hardening.py`: 19/19 tests passed (viewer 403 enforcement, viewer STOP access, credential validation, 3-operator login, contention demotion, lease expiry stop, password redaction).
- `generations/gen3-experimental-3d/tests/test_gait.py`: 33/33 tests passed (mathematical gait envelopes, neutral start/stop, joint clamp, runner execution).
- `generations/gen3-experimental-3d/tests/test_web.py`: 8/8 tests passed (port validation, hardware connection gating, calibration preservation).
- `tests/test_gen2_1.py`: 29/29 tests passed (Gen 2.1 runtime, simulation headless checks, hardware demux, API contracts).
- **Node Component Tests (11/11 passed)**:
  - `test_pixel_snake_heading.cjs` (6/6 checks)
  - `test_canvas_fractal_grid.cjs` (5/5 checks)
  - `test_grid_beam.cjs` (5/5 checks)
  - `test_shader_lens_blur.cjs` (7/7 checks)
  - `test_morphing_button.cjs` (7/7 checks)
  - `test_distorted_glass.cjs` (5/5 checks)
  - `test_console_search.cjs` (7/7 checks)
  - `test_hover_background.cjs` (3/3 checks)
  - `test_port_select.cjs` (independent port selection)
  - `test_preset_selection.cjs` (8/8 checks)
  - `test_rolling_number.cjs` (4/4 checks)
  - `test_gen21_dashboard_enhancements.cjs` (12/12 checks)

---

## 7. Gen 2.1 Research Dashboard Restoration & Slush Unification (28 October 2026)

- Restored and refined `shared/web-dashboard/templates/index.html` with full research-grade instrument design:
  - True 11-link / 10-joint kinematics notation with ±70° hardware angle limits.
  - Centered Live Trajectory Viewport (`#canvas-hub`) with non-capturing scroll when disconnected, smooth camera following (`panX += (targetPanX - panX) * 0.12`), and guaranteed visible grid density ($\ge 64$ blocks via `Math.sqrt(totalArea / 64.0)`).
  - Canvas footer controls synchronized with real state: `#btn-canvas-start` and `#btn-canvas-stop` wired to `/api/start` and `/api/stop`, `#btn-clear` with instant pose reset (`robotPose = { x: 0, y: 0, yaw: 0 }`), and `#btn-tracker-3d` viewer launch button.
  - Persistent bottom motion dock (`aria-label="Motion controls"`) featuring `#btn-start` and `#btn-stop`.
  - Serial port dropdown `<select id="serial-port">` with scan button `#refresh-ports` wired to `loadSerialPorts()`.
  - Mathematical path generator with 8 presets (Sine, Lemniscate $\infty$ parametric, Archimedean Spiral, Circular Orbit, Damped Barrier Avoidance) and custom formula evaluation.
  - Simulation physics tuning card `#sim-controls-card` with `#btn-apply-physics` (`/api/params`), `#btn-reset-physics` (Set to Default), `#physics-applied-pill`, corrected 2.0 N·m torque baseline, and honest Low Power Mode disclosure (*"Limits simulation gait speed to 10% and torque clamp to ≤1.8 N·m. Note: Does not measure or guarantee motor current on physical hardware."*).
  - Cross-generation navigation switcher `.generation-switch` with interactive hover cards (`#tooltip-gen21` and `#tooltip-gen3`) detailing planar vs spatial locomotion.
  - All automated test suites verified: `test_gen21_dashboard_enhancements.cjs` (12/12 passed), `test_pixel_snake_heading.cjs` (6/6 passed), and `test_gen2_1.py` (31 passed).

## October 2026 Unified Dashboard & Consolidation Update
- Consolidated all web dashboard components into `generations/gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- Implemented symmetrical Slush UI header, generation switcher, task tabs, and floating emergency Stop button across both `/` and `/gen3`.
- Independent post-implementation audit completed with 96.0% verified completion rate.
- Passed 30/30 Node suites (`generations/gen3-experimental-3d/tests/*.cjs`) and 39 backend console tests.
- Launch command:
  ```powershell
  conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
  ```

---

## 8. Simulation UX & Controls Hardening (30 October 2026)

All seven requirements from `archive/SURGE_090_SIMULATION_UX_FIX_PLAN.md` implemented without hardware actuation:
1. **Full Path Traversal**: `PathEngine` sequential checkpoint traversal logic (`idle → ready → acquiring → tracking ↔ completed | stopped | stalled`). Traversal continues to path end; stalls (>30s) report honestly without auto-stopping prematurely.
2. **Head Path Tracking & Acquisition**: Nearest-point orthogonal projection and acquisition from arbitrary origins; pure pursuit curvature lookahead combined with cross-track error PID correction (`kp=0.4`, `ki=0.05`, `kd=0.08`), integral anti-windup, and joint limit clamping.
3. **Physics Explanations & Compact Grouping**: Accessible parameter help text with physical units and bounds added across Gen 2.1 sliders; Gen 3 simulation physics reorganized into three compact grouped accordions (`.sim-physics-group`).
4. **Clear Canvas Result Snapshot**: Preserves run results upon Clear Canvas; displays a compact `Last Run Result` button with 60s countdown; automatically expires or purges when new motion begins.
5. **Compact Presets & Runs Live Sim Controls**: Gait presets reduced to compact cards; added Simulation Gait Settings to the Runs tab with live bidirectional sync to 3D Simulation engine inputs.
6. **Separated Joint Map & Safety Cards**: Joint Map Calibration and Saved Map Safety Limits split into distinct cards on a responsive grid (`1.35fr` / `0.85fr`), stacking cleanly on smaller displays while preserving table accessibility and optimistic concurrency tokens.
7. **Zero Numeric Telemetry Overflow**: Enforced `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis`, and `tabular-nums` across telemetry boxes and data rows with hover tooltips for full metrics access.

---

## 9. 3D Robotic-Snake Generation Loading Transition (30 October 2026)

A custom cross-generation loading transition between Gen 2.1 (`/`) and Gen 3 (`/gen3`) has been implemented and verified:
1. **Visual Identity & Design (Slush / Playdate System)**:
   - Sits in an accessible `<dialog class="generation-stage">` using the Slush palette: Sky Wash backdrop (`#dceeff`), radial illumination, Mint Pop status dot (`#55db9c`), Electric Blue (`#4da2ff`), and Ember (`#fb4903`).
   - Symmetrical header indicator pill (`SWITCHING TO GEN 3` / `SWITCHING TO GEN 2.1`) in bold humanist type with rounded pill geometries.
2. **True 3D Serpentine Robotic Snake**:
   - Model constructed in Three.js with genuine perspective camera (42° FOV on desktop, 58° on mobile).
   - Features 11 realistic articulated links and 10 mechanical joints with servo housings, metal pivot pins, side rails, and cast/received soft shadow maps on an ambient ground grid.
   - Dynamic articulation: Gen 3 transitions display alternating pitch/yaw links (mint and blue) with 3D spatial wave undulation; Gen 2.1 transitions display planar yaw articulation.
3. **Paced 3.0-Second Motion Timeline & Readiness Gate**:
   - `0.0–0.4s`: Current dashboard transitions out.
   - `0.4–1.1s`: Distant robotic snake emerges.
   - `1.1–2.4s`: Snake approaches camera with natural serpentine motion.
   - `2.4s Gate`: Pauses until the destination dashboard signals initialization readiness via `window.SurgeGenerationTransition.ready()`. Prevents white flashes or half-rendered UI.
   - `2.4–3.0s`: Snake swoops near the camera as a rounded inset wipe reveals the destination page.
4. **Resilience & Fallback Engineering**:
   - **Reduced Motion**: Immediately bypasses the 3D canvas and executes a static fade transition (<2.5s) honoring `prefers-reduced-motion: reduce`.
   - **WebGL Fallback**: When WebGL is unavailable or context is lost, gracefully falls back to a clean dashed SVG serpentine track.
   - **Fault Recovery**: 10-second bounded timeout on hung initialization with immediate GPU resource disposal, presenting an accessible recovery view with Retry and Go Back actions.
   - **Navigation Debouncing & History Integrity**: Rapid repeated clicks cannot spawn duplicate navigation; browser Back and Forward history traversal cleans up overlays without orphan elements.
   - **Zero Console Errors**: Graceful WebGL degradation in `3d_viewer.html` and corrected SVG path attribute in `index.html`.
5. **Verification**:
   - 100% green pass in `generations/gen3-experimental-3d/tests/test_generation_transition_browser.py` across 16 rigorous headless Playwright scenarios (desktop, mobile, keyboard, network delays, context loss, and error recovery).





## 10. Gen 2.1 Dashboard Restructuring, Continuous Path Simulation & UI Polishing (31 October 2026)

All updates completed and verified without physical hardware actuation:
1. **Continuous Whole-Path Traversal**: Fixed waypoint advancement in `path_engine.py` to evaluate segment projection ($t \ge 0.85$, cross-track error $\le 0.25$ m) alongside proximity ($0.10$ m). Fixes undulation stall at 20% progress.
2. **Conditional Manual Stop Accuracy Report**: Updated `/api/stop` in `web_app.py` and `script.js` to inspect path progress: manual stops $>20\%$ coverage trigger the accuracy modal; manual stops $<20\%$ halt silently; full-path completion triggers report display upon arrival.
3. **5-Box Dashboard Layout (Schematic Architecture)**: Restructured Gen 2.1 dashboard (`index.html` & `style.css`) to match operator drawing:
   - Box 1 (Top-Left): Mathematical Path Generator.
   - Box 2 (Bottom-Left): Gamepad State Live Feed & Node Instructions.
   - Box 3 (Center): Live Trajectory Tracking (native unscaled 520px canvas).
   - Box 4 (Right): Full-height Simulation Physics (6 sliders, low power mode, Apply / Set Default).
   - Box 5 (Bottom): 10-Joint Actuator Telemetry (2x5 grid spanning columns 1 & 2 directly beneath controls and tracking).
   - Removed intermediate visual boxes ("Connection Engine" and "Sensor Node") between hero and footer.
4. **Header Control Tuning**: Shortened `#serial-port` dropdown to 195px snug width; hid redundant bottom motion dock bar (`.motion-dock { display: none !important; }`).
5. **Gen 3 Console Aesthetic Alignment**: Fixed CSS overrides in `gen3.css` and `morphing-button.css` to restore 32px pill dimensions, dark high-contrast `#18181b` typography, and moved `Connect simulation engine` button to the right of `Serial port`.
6. **Test Verification**: 33/33 Node tests passing, 44/44 Python Gen 2.1 tests passing, 103/103 Python Gen 3 tests passing.

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

**Hardware status (as of 2 Nov).**
- **No fuses are installed** (owner, 1 Nov). Fuses in the split-bus v3 drawing are design intent only.
- Power: external 3S 1800 mAh LiPo on long wires; the central battery section is removed.
- 31 Oct trial: 30° yaw / 25° pitch, 0.5 Hz, speed 1500. ID 1 had a WRITE failure and IDs 7/8 stopped
  replying. Owner then reported a wiring fault and fixed it.
  Still pending: a logged all-ten diagnostics query, and a repeat of the trial with minimum voltage recorded.
- Both dashboard headers show a BATTERY estimate from cached diagnostic voltages
  (`clamp((V − 11.1) / 1.5 × 100)`). It is a sampled recharge hint, not live state of charge.

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

**Verification (1–2 Nov).**
- Gen 3 Python: 105 tests passed (web, console, hardening, gait, battery), plus 98 targeted
  assembly-simulation tests. All 38 Node suites passed. Offline Chrome checks at 320–1440 px passed.
- New tests: `test_assembly_simulation.py`, `test_battery*.py/.cjs`, `test_bus_metrics.cjs`,
  `test_control_spatial_presets.cjs`, `test_port_detection.py`, `test_pose_presets.cjs`.
- Not verified: clicking Move to Pose in a browser (needs an operator login), and any hardware run of the new features.

**Open items.**
1. Logged all-ten diagnostics query, then repeat the speed-1500 trial with minimum voltage logged.
2. Small pose (≈10°) in simulation, then on the robot. Confirm pitch "up" matches, then run the 10° caterpillar.
3. Measure real masses, friction and fit; re-tune shape presets on the CAD spacing.
4. Telemetry part 2: voltage/temperature/status during motion (needs a receiver firmware change).
5. Install fuses before speed trials 1500 → 1800 → 2200 → 2600.
6. Closed loop, sensors, SLAM. Commit the working tree.

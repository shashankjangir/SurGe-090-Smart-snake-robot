# Gen 3 Control Console Review & Handoff

Date: 27 October 2026  
Repository: `C:\1. SurGe 090 Smart snake robot`  
Branch: `codex/gen3-dashboard`  
Author: Antigravity Assistant  
Reviewer: Codex (Independent Review)

---

## 1. Starting Baseline & Pre-Existing Uncommitted Changes

Before implementation began, the repository was inspected at commit `077dedb` on branch `codex/gen3-dashboard`. Pre-existing uncommitted work in the working tree was documented and strictly preserved:
- `README.md`
- `gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp` & `transmitter_gen2_1.cpp`
- `gen2-st3215/tests/*`
- `gen3-experimental-3d/test_3d_snake.py`, `tests/test_gait.py`, `tests/test_web.py`
- `gen3-experimental-3d/joint_map.json` (measured handoff calibration: all zeros at 2048, odd pitch, even yaw, pitch signs 1: +1, 3/5/7/9: -1, yaw signs: +1, limits 1252–2844, speed 100 counts/s, tracking error 25 counts)
- `tests/test_gen2_1.py`
- `graphify-out/*`

The starting test baseline was 41 passing Gen 3 tests and 29 passing Gen 2 offline regression tests.

---

## 2. Files Changed & Created

### Modified Files:
1. `gen3-experimental-3d/gait.py`:
   - Added optional `speed=None` argument to `validate_gait` to support per-run speed overrides without altering the saved map.
   - Added `calc_peak_speed` to compute instantaneous speed demand across all joints.
2. `shared/surge_control/hardware.py`:
   - Added `read_diagnostics(self)` to `ST3215Interface` implementing disarmed `D` command querying (model reg 8, torque status, raw voltage, raw temperature, status byte).
3. `shared/surge_control/gen3.py`:
   - Implemented `GaitMotionGenerator` with monotonic phase integration and smooth $C^1$ parameter transitions.
   - Implemented `FirmwareManager` for allowlisted PlatformIO compilation and safe mock uploads.
   - Added multi-user operator lease checking, heartbeat tracking, and automatic safety stop on lease expiration.
   - Added SHA256 revision checking in `save_map` for optimistic concurrency.
   - Added presets manager (`runs/presets.json`) and runs journal annotation (`runs/<run_id>.json`).
4. `shared/web-dashboard/web_app.py`:
   - Added session extraction, CSRF header validation, and origin checking.
   - Added endpoints: `/api/gen3/session` (GET/POST/claim/release/heartbeat), `/api/gen3/apply`, `/api/gen3/diagnostics`, `/api/gen3/center`, `/api/gen3/presets`, `/api/gen3/runs`, `/api/gen3/runs/<id>/annotate`, `/api/gen3/firmware/build`, `/api/gen3/firmware/upload`, `/api/gen3/firmware/status`.
5. `shared/web-dashboard/templates/gen3.html`:
   - Unified whole-site Slush Design System: full-bleed marquee scrolling ticker, `.top-nav` pill navigation with Antonio/Bowlby One branding, hero poster with 3D inflatable blue ribbon backdrop (`inflatable_blue_ribbon.jpg`), 4 retro sticker confetti badges, crushed `SURGE 090` display headline, smooth `.generation-switch-hero` switcher (`Gen 2.1` ↔ `Gen 3`), live host hardware stats (`CPU`, `RAM`, `TEMP`), and hero action bar with transmitter port select, start motion, stop/torque off, and connection status.
   - Repositioned Console Section Navigation: moved the 4 tab pill buttons (`[🎮 Controls]`, `[📍 Runs & Presets]`, `[⚡ Calibration & Diag]`, `[🛠 Firmware]`) out of the header and placed them directly above `.console-search` inside `<main>`, styled with high-contrast pill borders, Slush yellow sunburst (`#ffd731`) active state, and smooth gliding hover background pill.
   - Four coherent operational areas organized cleanly beneath the search bar:
     1. **Operate**: Live gait motion, quick presets, mode toggles, parameter inputs, speed demand indicator, draft vs pending vs applied status, telemetry table with missing feedback highlighting.
     2. **Runs & Presets**: Saved presets manager, immutable runs journal, CSV/JSON downloads, manual annotations (displacement, surface, notes), and "Repeat Run" draft populator.
     3. **Calibration & Diagnostics**: Read all snapshot, align all, physical order calibration map with optimistic concurrency token, separate free-shaft centering maintenance with safety gate, and disarmed D diagnostics snapshot table.
     4. **Firmware**: Allowlisted PlatformIO environment selector, structured build trigger, scrollable terminal logs, and triple-confirmation safety checklist for uploads.
6. `shared/web-dashboard/static/gen3.js`:
   - Complete frontend client implementation with session management, heartbeat interval (1s), tab switching with URL hash sync, dynamic speed demand calculation, draft vs applied diff checking, live apply, presets, run annotations, and firmware workflow.
7. `shared/web-dashboard/static/gen3.css`:
   - High-contrast, responsive, accessible styles supporting keyboard navigation, visible focus rings, tabular numbers, status badges, and reduced-motion preferences.
8. `shared/web-dashboard/static/hover-background.css` & `hover-background.js`:
   - Vanilla CSS/ES6 implementation of animated gliding card background hover pill adapted from `AnimatedBackground` (React) pattern, attached to `.tab-nav`, `.mode-toggles`, `#presets-list`, and `#console-search-list` with `cubic-bezier(.22, 1, .36, 1)` easing and prefers-reduced-motion suppression.
9. `shared/web-dashboard/static/rolling-number.css` & `rolling-number.js`:
   - Vanilla CSS/ES6 implementation of animated rolling numbers (odometer digit columns) with spring-like cubic-bezier ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`), `font-variant-numeric: tabular-nums`, screen-reader `aria-label` accessibility, and `prefers-reduced-motion` suppression. Applied across all 4 key console locations:
     1. **Peak Speed Demand Badge** (`.demand-texture-card #demand-value`) in Operate tab.
     2. **Elapsed Run Timer / Monotonic Clock** (`#run-elapsed` and `#run-duration`) in header.
     3. **Diagnostics Snapshot TextureCards** (`#diag-summary-cards`: Min Voltage, Peak Temperature, Responding Servos) in Calibration tab.
     4. **Runs Journal Stats TextureCards** (`#runs-summary-cards`: Total Trials, Total Measured Travel cm, Average Duration) in Runs tab.
10. `shared/web-dashboard/static/distorted-glass.css` & `distorted-glass.js`:
   - Vanilla CSS/SVG implementation of the `DistortedGlass` component pattern (Cult UI / 21st.dev). Combines SVG fractal noise displacement filters (`feTurbulence` + `feDisplacementMap`) and `feSpecularLighting` to simulate organic liquid glass refraction, specular highlight sheens, and physical headlight lens flares. Applied across:
     1. **Display Headlines**: `.display-headline.distorted-glass-headline` on `SURGE 090` hero title with glass refraction and hover sheen.
     2. **Top Navigation Header**: `.top-nav.distorted-glass-header` providing a fixed distorted glass morphism bar as content scrolls behind it.
     3. **Headlights & Status Lights**: `.headlight-glass` and `.headlight-beacon` on `#status-dot`, `.status-indicator`, and `.logo-badge` with point-light specular highlights and radial chromatic refraction.
     4. **Hero Glass Ribbon**: `.distorted-glass-ribbon` backdrop divider over the inflatable ribbon sculpture.
11. `shared/web-dashboard/static/morphing-button.css` & `morphing-button.js`:
   - Vanilla CSS/ES6 implementation of the spring-animated `MorphingButton` pattern (adapted from React / motion/react) for operator password entry:
     1. **Initial Collapsed Pill**: Sleek pill badge (`[ 🔒 Password ]`) with 32px border radius, subtle border, and compact footprint inside the header.
     2. **Spring Morphing Transition**: Expands smoothly (`cubic-bezier(0.34, 1.35, 0.64, 1)`, stiffness 240 / damping 18 equivalent) to 250px on click, sliding the password input in with focus auto-transfer and morphing the trigger into a highlighted submit pill (`[ Login → ]`).
     3. **Dismissal & Accessibility**: Collapses on click-outside or Escape key, supports Enter key form submission, and features an accessible `has-error` shake keyframe on invalid credentials.
12. `shared/web-dashboard/static/shader-lens-blur.css` & `shader-lens-blur.js`:
   - WebGL Signed Distance Field (SDF) lens blur shader component (adapted from Codrops / Cult UI / 21st.dev `ShaderLensBlur`) applied across the complete hero header section in both Gen 2.1 and Gen 3:
     1. **Interactive GPU Canvas Backdrop**: Full-bleed WebGL shader quad with procedural SDF shapes, noise-driven wave distortion, pointer-reactive lens focus, and 4-stop gradient color blending (`#D5F981`, `#A1BBE7`, `#F2BAE2`, `#1E1E2E`).
     2. **Shape Variations**: Supports Square (0), Solid Circle (1), Hollow Circle / Ring (2), and Triangle (3) with real-time uniform updates.
     3. **Interactive Control Popover**: Floating Slush pill (`#shader-blur-pill`) with accessible dialog popover allowing on-the-fly shape variation selection, 4 curated color palettes (`Slush Neon`, `Cyber Blue`, `Sunburst Glow`, `Cyber Mint`), pointer hover inversion, and blur opacity slider.
     4. **Resilience & Accessibility**: Smooth lerped pointer inertia, `prefers-reduced-motion` suppression, and graceful zero-error fallback to CSS background if WebGL is unavailable.
13. `shared/web-dashboard/static/canvas-fractal-grid.css` & `canvas-fractal-grid.js`:
   - Fullscreen HTML5 canvas background component (`CanvasFractalGrid`) rendering an interactive dot matrix across the entire website behind all buttons, cards, and navigation bars:
     1. **Serpentine Snake Wave Motion**: Dots undulate with traveling serpentine curvature waves ($\phi_1 = \frac{x_0}{160} - 1.6t$, $\phi_2 = \frac{x_0}{220} + \frac{y_0}{180} - 2.2t$) inspired by Hirose serpenoid kinematics, creating physical traveling snake undulations across the matrix.
     2. **Two Animated Radial Gradients**: Dynamic 4-stop orbital color gradients (`#3498DB`, `#2980B9`, `#1ABC9C`, `#16A085`) undulating on 5-second harmonic orbits.
     3. **Interactive Pointer Attraction**: Cursor interaction within `waveRadius = 250px` produces S-curve serpentine ripples with `waveIntensity = 40`.
     4. **Layer Elevation**: Background is strictly fixed at `z-index: 0` (`pointer-events: none`) while all website buttons, navigation pills, stickers, and cards sit elevated at `z-index: 2` and `z-index: 3`.

### New Files Created:
1. `shared/surge_control/session.py`:
   - Session and lease manager enforcing single active operator, heartbeat renewal (1.0s interval, 3.0s timeout), lease expiration callbacks, and CSRF token comparison.
2. `gen3-experimental-3d/tests/test_console.py`:
   - 17 unit tests verifying monotonic phase integration, frequency reversal continuity, live transitions, speed derivative checks, request idempotency, stale revision rejection, lease expiry stop, CSRF/auth gating, calibration concurrency, diagnostics, presets, and firmware mock upload.
3. `.scratch/gen3-console/spec.md`:
   - Specification document following `docs/agents/issue-tracker.md`.
4. `.scratch/gen3-console/issues/01` to `07`:
   - Local issue tracker tickets tracking delivery stages.
5. `.scratch/browser_verify.py`:
   - Automated browser verification and screenshot capture script using headless Chrome.
6. `docs/evidence/*`:
   - Rendered PNG screenshots of all four tabs and mobile viewport.

---

## 3. Scope Summary: Implemented vs. Deferred

### Implemented:
- **Operate Tab**: Live gait tuning with explicit Apply button; waveform modes (yaw-only, pitch-only, combined 3D); amplitudes, bias, frequency, direction, lag, offset, run speed override, ramp, and duration; real-time speed demand readout; telemetry table with freshness and missing feedback alerts; emergency STOP button.
- **Runs Tab**: Preset library (built-in + user created); runs journal with CSV/JSON links; in-line manual annotations (displacement in cm, surface type, notes); repeat run to draft.
- **Calibration & Diagnostics Tab**: Read all snapshot, jog single joint, physical-order calibration table with SHA256 concurrency conflict detection and automated backups; separate free-shaft centering maintenance action; disarmed D diagnostic table.
- **Firmware Tab**: Constrained allowlisted PlatformIO environments (`receiver_gen2_1`, `transmitter_gen2_1`); shell-free subprocess execution; live log viewer; triple-gated mock upload protocol.
- **Multi-User Leases**: Server-enforced operator lease with 1.0s heartbeat and 3.0s expiry; automatic STOP on lease timeout; viewer STOP access; CSRF validation on all mutating routes.
- **Visual & Interactive System Enhancements**:
  - `PixelSnakeHeading`: Cursor-reactive serpentine locomotion wave and pixel glitch blinking for `.display-headline` (`SURGE 090`), translating characters with Serpenoid wave offsets and matrix glyph cycling on hover/proximity.
  - `GridBeam`: Animated glowing light beams traveling across grid divider boundaries with variant and breathing controls.
  - `CanvasFractalGrid`: Full-window responsive background with traveling wave dot matrix and dual orbital color gradients.
  - `ShaderLensBlur`: WebGL SDF lens blur with 4 shape variations (Square, Circle, Ring, Triangle).
  - `MorphingButton`: Smooth spring physics operator password input pill with validation shake.
  - `DistortedGlass`: SVG turbulence displacement glass backdrop with headlights specular refraction.
  - `RollingNumber`: Tabular digit roll transitions for host metrics and status counters.

### Deferred (per project guidelines):
- Physical hardware actuation (motors were not commanded on physical serial).
- Physical board flashing (firmware upload runs in safe mock mode).
- CAD-accurate 3D robot assembly viewer (deferred pending owner CAD files).
- Reinforcement learning backend / learned policy deployment.
- Remote cloud infrastructure / database hosting (local Flask USB architecture preserved).

---

## 4. State, API, and Data Contracts

### Formal State Machine:
- `idle`: No active motion; connection closed or disarmed.
- `connecting`: Opening serial transport, performing `HELLO` / `SURGE,2.1` handshake.
- `aligning`: Jogging or ramping joints to straight zero (2048) or jog start pose.
- `running`: Actively executing gait waveform or jog trajectory.
- `returning`: Finite motion complete; returning joints to calibrated neutral.
- `stopping`: Explicit STOP or timeout triggered; disabling torque.
- `completed`: Run finished cleanly; torque disabled.
- `fault`: Tracking error, watchdog timeout, servo error, or communication loss detected; torque release commanded.
- `firmware_maintenance`: Exclusive firmware compile or upload task active; motion blocked.

### Key API Endpoints:
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/gen3/session` | Any | Retrieves current session ID, user role, and active operator status |
| `POST` | `/api/gen3/session/login` | Any | Authenticates operator (`name`, `password`), returns `operator` or `viewer` mode |
| `POST` | `/api/gen3/session/logout` | Operator | Releases operator lease (blocked while busy with motion) |
| `POST` | `/api/gen3/session/heartbeat` | Operator | Renews operator lease for 3.0 seconds (viewers cannot renew) |
| `GET` | `/api/gen3/status` | Any | Returns full state snapshot, telemetry, operator status, and firmware status |
| `GET` | `/api/gen3/map` | Any | Returns joint map configuration along with SHA256 `revision` hash |
| `POST` | `/api/gen3/map` | Operator | Saves joint map; rejects if `expected_revision` does not match disk hash (403 for viewers) |
| `POST` | `/api/gen3/start` | Operator | Starts finite motion trial (`mode`: read, jog, center, gait; `execution`: preview, simulation, hardware) |
| `POST` | `/api/gen3/apply` | Operator | Submits candidate live parameter update with `request_id` and `expected_revision` |
| `POST` | `/api/gen3/stop` | Any | Immediately commands STOP / torque disable; preempts active transitions |
| `POST` | `/api/gen3/diagnostics` | Operator | Sends disarmed `D` command and returns servo diagnostic snapshot |
| `POST` | `/api/gen3/center` | Operator | Executes free-shaft centering maintenance (requires `free_shaft: true`) |
| `GET` | `/api/gen3/presets` | Any | Returns preset list |
| `POST` | `/api/gen3/presets` | Operator | Saves preset (403 for viewers) |
| `DELETE` | `/api/gen3/presets/<name>` | Operator | Deletes custom preset (403 for viewers) |
| `GET` | `/api/gen3/runs` | Any | Lists recent run records from `runs/*.json` |
| `POST` | `/api/gen3/runs/<id>/annotate` | Any | Attaches manual displacement, surface, and notes annotations |
| `POST` | `/api/gen3/firmware/build` | Operator | Triggers PlatformIO compilation of allowlisted environment |
| `POST` | `/api/gen3/firmware/upload` | Operator | Triggers firmware upload (runs safe mock protocol) |
| `GET` | `/api/gen3/firmware/status` | Any | Returns firmware compilation and upload logs |

---

## 5. Transition Math & Phase Continuity

### Monotonic Continuous Phase:
Frequency changes do not recompute phase as $2\pi f \cdot t$ (which causes instantaneous position discontinuities). Instead, phase is integrated monotonically:
$$\phi_{k+1} = \phi_k + 2\pi f_k \cdot \Delta t$$
When frequency reverses from $+f$ to $-f$, $f(t)$ transitions smoothly through zero; the snake slows down, pauses momentarily at its instantaneous extremum, and reverses smoothly without position jumps.

### Raised-Cosine Parameter Interpolation:
Candidate parameters transition from $p_{\text{from}}$ to $p_{\text{to}}$ over a transition duration $T_{\text{trans}} \in [1.5, 2.0]$ seconds using a smooth $S$-curve:
$$\tau = \frac{t - t_{\text{start}}}{T_{\text{trans}}} \in [0, 1]$$
$$w(\tau) = \frac{1 - \cos(\pi \tau)}{2}$$
$$p(t) = p_{\text{from}} + (p_{\text{to}} - p_{\text{from}}) \cdot w(\tau)$$
Because $\dot{w}(0) = 0$ and $\dot{w}(1) = 0$, both position and velocity are continuous ($C^1$).

### Transition Derivative & Speed Limit Check:
The maximum derivative contribution from parameter blending is:
$$v_{\text{trans}} = \frac{4096}{2\pi} \cdot \frac{\pi}{2 T_{\text{trans}}} \cdot \max(|\Delta yaw|, |\Delta pitch|, |\Delta bias|)$$
The total peak speed demand is evaluated as:
$$v_{\text{peak}} = v_{\text{steady}}(p_{\text{to}}) + v_{\text{trans}}$$
If $v_{\text{peak}} > v_{\text{limit}}$, $T_{\text{trans}}$ is lengthened if sufficient duration headroom exists; otherwise, the update is rejected with an explicit error explaining the required speed or amplitude adjustment.

---

## 6. Multi-User Lease & Role Model (Viewer vs. Operator)

Per the project Change Request, heavy transport security (CSRF, Origin checks, LAN opt-in gating) was removed in favor of a lean, reliable two-tier role model suited for local laboratory operation:

1. **Viewer (Default, No Login)**:
   - Real-time observation of telemetry, joint angles, tracking error, run logs, presets, and diagnostic snapshots.
   - STOP is **always available** to all users.
   - Draft sliders can be adjusted locally in browser for exploration without sending commands to robot.
   - Mutating buttons are visibly disabled with `title="Operator mode required"` and `aria-disabled="true"`.
   - Direct API calls to mutating endpoints are rejected with HTTP 403 `{"error": "Operator mode required"}`.
2. **Operator (Login Required)**:
   - Exactly three authorized operator names: `Shashank`, `Bhavesh`, `Mahima` (matched case-insensitively).
   - Shared password stored in `gen3-experimental-3d/operators.json` (gitignored). Verified using `hmac.compare_digest`.
   - Single active operator lease: If a second operator logs in while another is active, they become a viewer with an informative message (`"<Name> is currently operating"`).
   - Heartbeat protocol: Active operator sends `POST /api/gen3/session/heartbeat` every 1.0 second renewing a 3.0 second lease. Viewers cannot renew.
   - Expiry stop: If the active lease expires during hardware motion, `Gen3Control` automatically aborts motion and commands receiver STOP / torque release.
   - Audit logging: The operator name is recorded on every start, live apply, stop, jog, calibration save, and firmware action.
   - Shared endpoints (`/api/connect`, `/api/start` for hardware) require an active operator session so physical serial ports cannot be reached without authorization.

---

## 7. Parameter Limits & Calibration Defaults

- **Calibration Baseline (Preserved)**:
  - All ten straight zero positions: `2048`.
  - Joint planes: Odd IDs pitch, even IDs yaw.
  - Saved Signs: ID 1: `+1`, Pitch IDs 3, 5, 7, 9: `-1`, Yaw IDs 2, 4, 6, 8, 10: `+1`.
  - Bounds: `min: 1252`, `max: 2844` ($\approx \pm 70^\circ$).
  - Default map speed: `100` counts/s ($\approx 8.8^\circ$/s).
  - Tracking error: `25` counts; timeout: `0.5` seconds.
- **Waveform Bounds**:
  - `yaw`: $0^\circ$ to $90^\circ$ (effective motion bounded by joint limits).
  - `pitch`: $0^\circ$ to $90^\circ$.
  - `bias`: $-90^\circ$ to $+90^\circ$.
  - `frequency`: $-0.6$ Hz to $+0.6$ Hz (negative denotes reverse).
  - `lag`, `offset`: $-360^\circ$ to $+360^\circ$.
  - `speed` override: $1$ to $1500$ counts/s.
  - `ramp`: $1$ to $30$ seconds (must be $\le \text{duration} / 2$).
  - `duration`: $2$ to $300$ seconds.

---

## 8. Verification Results

### Unit & Regression Test Suite:
Command executed:
```powershell
conda run -n surge python -B -m unittest discover -s gen3-experimental-3d/tests -v
```
**Result**: 77 passed, 0 failed (Ran 77 tests in 1.787s, exit code 0).
- 41 baseline gait & runner tests passing (alignment, centering, speed envelope, slew, dry-run, partial read, error logging, etc.).
- 17 console tests passing (`test_console.py`):
  - Phase continuity, frequency reversal, idempotence, transition speed derivatives, lease renewal, 3-operator login, contention demotion, presets, disarmed diagnostics.
- 19 console hardening tests passing (`test_console_hardening.py`):
  - Viewer 403 enforcement on mutating endpoints, viewer STOP access, 401 on bad credentials, case-insensitive operator name resolution, busy motion handoff protection, lease expiry stop, and password redaction from all API responses and logs.

### JavaScript Client & Motion Tests:
Commands executed:
```powershell
node gen3-experimental-3d/tests/test_rolling_number.cjs
node gen3-experimental-3d/tests/test_hover_background.cjs
node gen3-experimental-3d/tests/test_console_search.cjs
node gen3-experimental-3d/tests/test_port_select.cjs
node gen3-experimental-3d/tests/test_preset_selection.cjs
node gen3-experimental-3d/tests/test_distorted_glass.cjs
node gen3-experimental-3d/tests/test_morphing_button.cjs
node gen3-experimental-3d/tests/test_shader_lens_blur.cjs
node gen3-experimental-3d/tests/test_canvas_fractal_grid.cjs
```
**Result**: All JS unit tests passed:
- `test_rolling_number.cjs`: 4 precision, formatting, string/timer, and column reuse checks passed.
- `test_hover_background.cjs`: 3 bounding box and scroll geometry checks passed.
- `test_console_search.cjs`: 7 ranking and filter checks passed.
- `test_port_select.cjs`: Independent port selection and failure handling passed.
- `test_preset_selection.cjs`: 8 preset selection and draft population checks passed.
- `test_distorted_glass.cjs`: 5 SVG noise filter, specular headlights, and headline refraction checks passed.
- `test_morphing_button.cjs`: 7 collapsed initial state, click expand, outside click collapse, Escape key collapse, shake validation, and Enter key submit checks passed.
- `test_shader_lens_blur.cjs`: 7 hex-to-RGB, 4-stop palette presets, 4 SDF variations, default Ring, popover toggle, variation switch, and click-outside dismissal checks passed.
- `test_canvas_fractal_grid.cjs`: 5 default configuration props, dual radial gradients, animation lifecycle, serpentine snake wave math, and clean destroy checks passed.

### Gen 2 Regression Suite:
Command executed:
```powershell
conda run -n surge python -B -m unittest discover -s tests -v
```
**Result**: 29 passed, 0 failed (Ran 29 tests in 14.870s, exit code 0).

### PlatformIO Firmware Compilation:
1. `receiver_gen2_1`:
   ```powershell
   python -m platformio run -e receiver_gen2_1
   ```
   **Result**: SUCCESS (Took 6.98 seconds; RAM: 13.6%, Flash: 62.1%).
2. `transmitter_gen2_1`:
   ```powershell
   python -m platformio run -e transmitter_gen2_1
   ```
   **Result**: SUCCESS (Took 1.91 seconds; RAM: 13.4%, Flash: 56.0%).

---

## 9. Browser Evidence & Rendered UI Screenshots

Automated headless Chrome verification was executed against the Flask backend. Real browser rendering was verified with no console errors:
- `docs/evidence/gen3_console_operate.png` (Operate tab: live controls, demand calculation, telemetry table).
- `docs/evidence/gen3_console_runs.png` (Runs tab: preset library, journal table, annotations).
- `docs/evidence/gen3_console_calibration.png` (Calibration tab: physical-order map, concurrency token, free-shaft centering).
- `docs/evidence/gen3_console_firmware.png` (Firmware tab: allowlist dropdown, build log terminal, safety checklist).
- `docs/evidence/gen3_console_mobile.png` (Mobile viewport: 375x812 responsive layout).

---

## 10. Known Limitations

1. **Protocol Limitations**:
   - The ESP-NOW / serial protocol has no per-packet sequence numbers or high-resolution hardware timestamps; packet loss is detected via timeouts and feedback validity checks.
2. **Receiver Safety Cutoffs**:
   - Receiver firmware currently lacks automated battery under-voltage cutoffs or motor thermal cutoffs. Power disconnect must remain immediately accessible during trials.
3. **Unmeasured Mechanical Properties**:
   - Friction, link mass distribution, continuous motor torque ratings, and external power wire drag remain unmeasured. PyBullet simulation remains illustrative.
4. **Mock Upload Protocol**:
   - Firmware flashing from the browser executes in mock mode to protect hardware during development. Physical flashing must be executed manually via PlatformIO CLI following owner verification.

---

## 11. Reproducible Launch Instructions

To launch the Gen 3 Control Console locally:

1. Open PowerShell in `C:\1. SurGe 090 Smart snake robot`.
2. Activate the conda `surge` environment and start the web dashboard on port 5001:
   ```powershell
   conda run --no-capture-output -n surge python shared/web-dashboard/web_app.py --port 5001
   ```
3. Open a browser and navigate to:
   ```
   http://127.0.0.1:5001/gen3
   ```

---

## 12. Manual Owner Hardware Test Sequence

When commissioning hardware physically:
1. **Support links**: Ensure all 10 links are mechanically supported and external LiPo power wire is slack.
2. **Plug transmitter**: Connect the transmitter ESP32 to USB (confirm COM port in dashboard).
3. **Open Console**: Navigate to `http://127.0.0.1:5001/gen3`.
4. **Claim Operator**: Click "Claim Operator" in the header and enter operator name.
5. **Read Diagnostics (Disarmed)**:
   - Navigate to Tab 3 (Calibration & Diagnostics).
   - Select port and click "Query Disarmed D Diagnostics".
   - Confirm all 10 servos report model `reg8=1`, `torque=0`, normal voltage (`~113` for 11.3V), and status `0`.
6. **Execute Single-Joint Jog**:
   - In Tab 3, select Motor 1, ticks 20, duration 4s. Click "Jog Selected Joint".
   - Confirm the head joint moves slightly and returns smoothly to measured origin.
7. **Run Finite Pitch Wave Trial**:
   - In Tab 1 (Operate), select Execution `Hardware`, Quick Preset `Pitch wave 5°` (yaw 0°, pitch 5°, freq 0.1 Hz, duration 10s, ramp 2s).
   - Click "Start Finite Motion Trial".
   - Confirm snake aligns to 2048, executes wave, returns to neutral, and releases torque.
8. **Live Tuning Verification**:
   - Start a 30-second trial with preset `Pitch wave 10°`.
   - While moving, adjust Pitch amplitude to 8° in the form. Notice "Apply Live Tuning (1 change)" activates.
   - Click "Apply Live Tuning". Observe smooth transition over 1.5 seconds without target jerks.
9. **Emergency Stop Verification**:
   - During motion, click "STOP / TORQUE OFF". Confirm motors immediately unpower and release torque.

---

## 13. October 2026 Consolidated Architecture Addendum

The web dashboard backend has been consolidated from `shared/web-dashboard/` to `gen3-experimental-3d/backend/web_dashboard/web_app.py`.

### Active Run Command
```powershell
conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```

- Accessible at `http://127.0.0.1:5001/gen3` for Gen 3 Spatial Commissioning and `http://127.0.0.1:5001/` for Gen 2.1 Planar Cockpit.
- Symmetrical Slush UI header, generation switcher with interactive hover cards, task tabs, and persistent floating emergency Stop dock implemented across both pages.


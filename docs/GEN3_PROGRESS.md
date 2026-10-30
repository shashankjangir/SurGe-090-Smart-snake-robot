# Gen 3 Control Console · Progress & Security Transition

This document records the architectural adjustments implemented per the Change Request overriding Section 5 (Team access) and the security parts of Sections 1, 6, and 7 of `docs/GEN3_ANTIGRAVITY_PLAN.md`.

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
- **Shared Password**: Single shared password stored in `gen3-experimental-3d/operators.json`. Verified using constant-time `hmac.compare_digest` to prevent timing attacks. The password is never written to logs, run manifests, API responses, or URLs.
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
`gen3-experimental-3d/operators.json`

```json
{
  "operators": [
    "Shashank",
    "Bhavesh",
    "Mahima"
  ],
  "password": "xyz@1234"
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
- `gen3-experimental-3d/tests/test_console.py`: 17/17 tests passed (continuous phase transitions, lease renewal, idempotence, presets, disarmed diagnostics).
- `gen3-experimental-3d/tests/test_console_hardening.py`: 19/19 tests passed (viewer 403 enforcement, viewer STOP access, credential validation, 3-operator login, contention demotion, lease expiry stop, password redaction).
- `gen3-experimental-3d/tests/test_gait.py`: 33/33 tests passed (mathematical gait envelopes, neutral start/stop, joint clamp, runner execution).
- `gen3-experimental-3d/tests/test_web.py`: 8/8 tests passed (port validation, hardware connection gating, calibration preservation).
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
- Consolidated all web dashboard components into `gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- Implemented symmetrical Slush UI header, generation switcher, task tabs, and floating emergency Stop button across both `/` and `/gen3`.
- Independent post-implementation audit completed with 96.0% verified completion rate.
- Passed 30/30 Node suites (`gen3-experimental-3d/tests/*.cjs`) and 39 backend console tests.
- Launch command:
  ```powershell
  conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
  ```

---

## 8. Simulation UX & Controls Hardening (30 October 2026)

All seven requirements from `SURGE_090_SIMULATION_UX_FIX_PLAN.md` implemented without hardware actuation:
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
   - 100% green pass in `gen3-experimental-3d/tests/test_generation_transition_browser.py` across 16 rigorous headless Playwright scenarios (desktop, mobile, keyboard, network delays, context loss, and error recovery).




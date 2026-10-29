# Master Prompt: Complete Redesign & Feature Implementation of SURGE-090 Gen 2.1 Web Dashboard

> **Target Codebase:** SURGE-090 Smart Snake Robot  
> **Target Files:**  
> - `shared/web-dashboard/templates/index.html` (Markup & Structure)  
> - `shared/web-dashboard/static/style.css` (Slush Design System & 3-Column Layout)  
> - `shared/web-dashboard/static/script.js` (Trajectory Tracking, Canvas Engine & Telemetry)  
> - `shared/web-dashboard/static/hero-snake-motion.js` (Autonomous 11-Segment Hero Canvas)  
> - `shared/web-dashboard/static/morphing-button.js` (Morphing Password Button Component)  
> - `shared/web-dashboard/static/generation-switch.css` (Generation Hover Info Cards)  
> - `gen3-experimental-3d/tests/test_gen21_dashboard_enhancements.cjs` (Verification Test Suite)

---

## High-Level Objective
Rebuild, optimize, and polish the **SURGE-090 Gen 2.1 Web Dashboard** (`/`) to match the Slush aesthetic of Gen 3, reduce excessive scroll length, optimize the 3-column operational layout, make the live trajectory canvas the primary focal center, implement an autonomous 11-segment procedural hero snake, fix the gamepad layout, provide mathematical trajectory generators with 100% path completion, add physics tuning controls with "Set to Default", and introduce rich interactive generation tooltips.

---

## Detailed Requirement Specifications & Change Directives

### 1. Navigation Header, Serial Port Selector & 3D Viewer Launch
- **Reduce Scroll Length & Header Clutter:**
  - Standardize the top navigation bar with a high-contrast Slush aesthetic: distorted glass header, SurGe badge, CPU/RAM/TEMP system stats pills.
- **Dynamic Serial Port Dropdown:**
  - Replace static or manual serial text inputs with an asynchronous `<select id="serial-port">` dropdown and a `↻` refresh button (`#refresh-ports`).
  - Wire `loadSerialPorts()` in `script.js` to fetch `/api/ports` and populate available COM/tty ports automatically on load and on click.
- **3D Viewer Navigation:**
  - Add a dedicated **`3D Viewer 🌐`** button (`#btn-hero-3d`) in the hero action row next to *Trace Trajectory*, linking directly to `/3d` (Three.js 3D Snake Viewer).
  - Also provide `#btn-open-3d` in the top navbar and `#btn-tracker-3d` on the trajectory toolbar.

### 2. Operator Login & Morphing Password Button Component
- **Morphing Expansion Animation:**
  - Implement a morphing password button container (`#morphing-password-container`) that starts as a compact pill with a lock icon and "Password" label.
  - On click, smoothly expand into a rounded input field with an eye icon button (`#btn-toggle-password`).
  - Collapse on outside click or pressing Escape; shake on authentication failure.
- **Cursor Autofocus:**
  - When the operator clicks the password button, automatically focus the cursor inside the password input (`#login-password.focus()`).
- **Show/Hide Eye Toggle & Live Text Sync:**
  - Provide an eye toggle SVG icon (`eye-show` vs `eye-hide`) to switch input type between `password` and `text`.
  - Ensure the input text updates live as the operator types without lag or masking glitches.

### 3. Generation Switcher & Interactive Hover Tooltip Cards
- **Standalone Modular Switcher:**
  - Place `<span class="modular-control-badge">Modular Snake Control</span>` cleanly above the generation switcher.
  - Structure the switcher with two prominent tab pills: **Gen 2.1** (active record on `/`) and **Gen 3** (link to `/gen3`).
- **Rich Hover Tooltips on Both Generations:**
  - When hovering over **Gen 2.1**:
    - Display `.gen-info-card#tooltip-gen21` with badge `Planar Snake` (Mint), title `SURGE 090 • Gen 2.1`, description: *"Planar serpenoid kinematics with horizontal lateral undulation in 2D space."*
    - Bulleted specs: `10 Yaw Joints (11 rigid links)`, `±70° Joint Limits on horizontal plane`, `ST3215 Protocol & PyBullet 2D Sim`, `Pure Pursuit trajectory tracking`. Footer: `Planar Baseline of Record`.
  - When hovering over **Gen 3**:
    - Display `.gen-info-card#tooltip-gen3` with badge `3D Spatial Snake` (Cyan), title `SURGE 090 • Gen 3`, description: *"Non-planar 3D spatial locomotion with alternating pitch & yaw articulation."*
    - Bulleted specs: `Alternating 5 Pitch + 5 Yaw Joints`, `3D Gaits: Sidewinding, Rolling, Corkscrew`, `Calibrated Sign Inversions (IDs 3,5,7,9 = -1)`, `Spatial WebGL Visualizer & Command Bar`. Footer: `Experimental 3D Locomotion`.
- **Slush Sticker Confetti:**
  - Display four angled 2D sticker badges on the hero poster:
    1. `🚀 11 LINKS / 10 JOINTS`
    2. `⭐ PLANAR SERPENOID`
    3. `✔ ±70° ANGLE LIMIT`
    4. `⚡ ST3215 PROTOCOL`

### 4. Hero Autonomous 11-Segment Snake Motion Canvas
- **Removal of Static Video Background:**
  - Remove all video files/elements (`<video>`). Replace with a lightweight procedural HTML5 Canvas (`#hero-snake-canvas`).
- **11 Rigid Segments & 10 Active Yaw Joints:**
  - Render an 11-segment articulated snake robot using forward kinematics.
  - Joint angles clamped strictly within $\pm 70^\circ$ physical servo limits.
- **Autonomous Kinematics vs Cursor Following:**
  - By default, the snake executes smooth autonomous serpentine meandering across the hero area using Perlin-like phase integration.
  - **Strict Bounding Box Containment:** When the user's cursor enters inside the `.hero-section` bounding box, the snake smoothly steers its head toward the cursor position.
  - When the cursor leaves the hero area, it smoothly transitions back to autonomous wandering.
  - The snake must never escape the boundary of the hero section.

### 5. Floating Action Controls & Dedicated Customization Modal
- **Fixed Bottom-Right Custom Button:**
  - Place a floating `#btn-custom-effects` button fixed at the bottom-right corner (`bottom: 24px; right: 24px; z-index: 9999;`).
  - It must remain fixed in place and not move when scrolling.
- **Dedicated Customization Panel Modal:**
  - Move all visual effect toggles (Shader Lens Blur WebGL background, blur variations, solid vs frosted glass fills, grid beam animations, canvas fractal grid, telemetry animations) inside this dedicated `#custom-effects-modal` popup dialog.
  - Remove redundant inline visual settings from the main dashboard body to keep the main view clean and zero-scroll.
- **Persistent Floating Emergency STOP Button:**
  - In addition to the header and canvas STOP buttons, maintain a persistent floating emergency STOP / Torque Off button (`#floating-stop-btn`) in the viewport corner for immediate hardware safety.

### 6. Main Dashboard 3-Column Optimized Layout
Configure `.main-content` with CSS Grid: `grid-template-columns: 280px 1fr 310px; gap: 20px; align-items: start;`.

#### Left Column (`.control-panel`): Connection Engine, Math Paths & Gamepad
1. **Connection Engine Card:**
   - Radio buttons: `Simulation (PyBullet Planar)` (checked default) vs `Hardware (ST3215 + ESP32)`.
   - Safe default checkbox: `Headless Sim (Safe Default)` (`#sim-headless`).
2. **Mathematical Path Generator Card (`.card-lavender`):**
   - Provide a diverse preset dropdown (`#math-preset`):
     - `sine`: Hirose Serpentine Sine: $\sin(x)$
     - `high_freq`: High Frequency Wave: $\sin(2x) \cdot 0.8$
     - `double_harm`: Double Harmonic / S-Turn: $\sin(x) \cdot 1.2 + \sin(2x) \cdot 0.4$
     - `lemniscate`: Lemniscate (Figure-8) Curve
     - `spiral`: Archimedean Spiral
     - `circle`: Circular Orbit (Radius 3m)
     - `damped`: Damped Barrier Avoidance: $\sin(x) / (0.2 |x| + 1)$
     - `chirp`: Chirp / Acceleration: $\sin(0.15 x^2) \cdot 0.8$
     - `custom`: Custom Formula $f(x)$
   - Input fields: Function text box (`#math-func`), From $x$ (`#math-a`), To $x$ (`#math-b`).
   - Action button: `Generate Path` (`#btn-generate`).
3. **Gamepad State Visualizer Card (`#gamepad-card`):**
   - Visual stick container with live steer dot (`#stick-dot`).
   - Trigger bar visualizer (`#rt-fill`).
   - **Correct Standard Diamond Layout for Face Buttons:**
     - **Top:** **`Y`** (Preset, Amber `#ffd731`)
     - **Left:** **`X`** (Reverse, Blue `#4da2ff`)
     - **Right:** **`B`** (Stop, Red `#ef4444`)
     - **Bottom:** **`A`** (Start, Green `#22c55e`)
4. **Gamepad Node QR / Documentation Card:**
   - Slush stylized QR code icon and command hint to run `controller_node.py` for wireless control.

#### Center Column (`.canvas-container#canvas-hub`): Trajectory Tracking Hub
- **Toolbar:**
  - Title: `Live Trajectory Tracking`
  - Secondary button: `Launch 3D Viewer 🌐` (`#btn-tracker-3d`)
  - Status badges: `● Target Path` (blue), `● Actual Path` (green), `● 10 Segments` (orange).
- **Canvas Viewport (`#pathCanvas`):**
  - High-resolution interactive canvas (700×380 responsive).
  - Supports left-click drag to draw freehand paths, right-click/arrows to pan, Ctrl+Scroll to zoom.
- **Dynamic Camera Follow & 64 Grid Blocks Guarantee:**
  - When simulation is running, dynamic camera smoothly tracks the snake head (`panX += (targetPanX - panX) * 0.12`).
  - Automatically calculate grid spacing based on viewport dimension (`Math.sqrt(totalArea / 64.0)`) to guarantee a minimum of **64 grid blocks** ($8 \times 8$) are visible at all times.
  - When disconnected, keep scrolling and panning smooth and non-intrusive.
- **100% Full Path Traversal Guarantee:**
  - The pure pursuit path tracking algorithm must not terminate prematurely at 70% or 80%. It must traverse all generated waypoints until 100% of the trajectory is completed.
- **Canvas Controls Footer:**
  - Helpful controls hint text.
  - Action buttons row:
    - **`▶ Start Motion`** (`#btn-canvas-start`)
    - **`⏹ STOP`** (`#btn-canvas-stop`)
    - **`Clear Canvas`** (`#btn-clear`)
- **Instant Pose Reset on Clear Canvas:**
  - Clicking `Clear Canvas` must immediately reset `robotPose = { x: 0, y: 0, yaw: 0 }`, clear actual path history points, and redraw the robot in neutral straight pose at $(0, 0)$.

#### Right Column (`.control-panel`): Simulation Physics Tuning
- **Physics Help Note:**
  - State clearly: *"Gen 2.1 planar model; gait settings also affect hardware. Simulation is not a measured prediction."*
- **Parameter Tuning Sliders & Numeric Readouts:**
  - `Friction Wheel Ratio` (`#param-fric`): 1 to 50, step 0.5, default 20.0
  - `Sine Amplitude (rad)` (`#param-amp`): 0.1 to 1.2, step 0.1, default 0.8
  - `Sine Frequency (rad/s)` (`#param-freq`): 0.1 to 5.0, step 0.1, default 2.0
  - `Phase Lag (rad)` (`#param-phase`): 0.1 to 3.0, step 0.1, default 1.0
  - `Max Motor Torque (Nm)` (`#param-force`): 0.1 to 2.94, step 0.01, default 2.0
  - `Gait Speed` (`#param-speed`): 0.1 to 3.0x, step 0.1, default 1.0x
- **Honest Low Power Mode Disclosure:**
  - Checkbox `#param-lowpower`.
  - Explicit warning: *"10% gait speed; simulated torque ≤1.8 Nm. Does not measure or guarantee motor current."*
- **Action Buttons:**
  - **`Apply Physics`** (`#btn-apply-physics`): Applies live values to simulation engine and displays `#physics-applied-pill` confirmation.
  - **`Set to Default`** (`#btn-reset-physics`): Instantly restores all sliders to default factory values (Fric: 20.0, Amp: 0.8, Freq: 2.0, Phase: 1.0, Force: 2.0, Speed: 1.0, LowPower: false) and flashes confirmation.

#### Bottom Section (`.telemetry-section#telemetry-hub`): 10-Joint Actuator Telemetry
- 10 Slush sticker cards with 1px black outline and alternating palette headers:
  - Motor ID (1 to 10)
  - Angle (deg)
  - Speed (raw)
  - Torque (kg·cm or Nm)

---

## Verification Test Suite (`test_gen21_dashboard_enhancements.cjs`)
A standalone Node.js test script must assert and verify all 12 enhancements:
1. `canvas-hub` is located in the middle column before `sim-controls-card`.
2. CSS defines `grid-template-columns: 280px 1fr 310px;`.
3. `#btn-apply-physics` and `#physics-applied-pill` exist and are wired.
4. `#math-preset` contains `sine`, `lemniscate`, `spiral`, `circle`, and `damped`.
5. Low power mode disclaims motor current measurement.
6. Serial port is a `<select id="serial-port">` with `#refresh-ports`.
7. Hero section has `#btn-hero-3d` linking to `/3d`.
8. Canvas grid computation uses `Math.sqrt(totalArea / 64.0)`.
9. Camera smoothly tracks snake head with `panX += (targetPanX - panX) * 0.12`.
10. `#btn-reset-physics` exists and is wired in `script.js`.
11. `#btn-clear` resets `robotPose = { x: 0, y: 0, yaw: 0 }`.
12. Gamepad face buttons follow standard diamond layout (Y, X, B, A).
13. Trajectory canvas footer contains Start, Stop, and Clear buttons.
14. Generation switch elements provide hover information cards for Gen 2.1 and Gen 3.

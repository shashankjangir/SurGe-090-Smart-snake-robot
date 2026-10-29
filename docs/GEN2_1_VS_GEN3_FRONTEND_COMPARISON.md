# SURGE-090 Dashboard: Gen 2.1 vs Gen 3 Frontend Differences

**Document Version:** 1.0  
**Date:** 28 October 2026  
**Scope:** Frontend UI/UX, styling, layout architecture, transitions, and interactive effects between the Gen 2.1 Planar Dashboard (`/`) and the Gen 3 3D Locomotion Console (`/gen3`).

---

## 1. Executive Overview

Both the Gen 2.1 and Gen 3 web interfaces share the unified **Slush design identity** (high-contrast display typography, physical sticker badges, electric blue, mint, lavender, and ember accents, plus composited interactive background shaders). However, each interface is engineered for a distinct robotics operational paradigm:

1. **Gen 2.1 (`/`)**: Designed as an **interactive live tracking cockpit** centered around continuous 2D planar serpenoid kinematics, mouse/pointer trajectory drawing, mathematical waveform generation, and PyBullet simulation tuning.
2. **Gen 3 (`/gen3`)**: Designed as a **multi-tab commissioning and research instrument** for 3D spatial locomotion, discrete trial execution, physical head-to-tail joint calibration (alternating 5 pitch + 5 yaw joints), single-joint safety jogs, and operator-gated hardware testing.

---

## 2. Navigation Switching & View Transitions

### 2.1 View Transitions API
- **Seamless Page Morphing:** Configured in `shared/web-dashboard/static/generation-switch.css` with `@view-transition { navigation: auto; }`.
- **Sliding Indicator Pill:** The active pill pseudo-element `::before` carries `view-transition-name: generation-selection;`, causing the white active indicator pill to smoothly slide across the segmented toggle track when switching pages.

### 2.2 Hover Information Cards (`.gen-info-card`)
Hovering or keyboard-focusing either generation option triggers an elevated tooltip card with spring easing (`transform: translateY(0)` from `translateY(6px)`, `opacity: 1`):

| Spec Property | Gen 2.1 Hover Card (`#tooltip-gen21`) | Gen 3 Hover Card (`#tooltip-gen3`) |
| :--- | :--- | :--- |
| **Status Badge** | `Active Control of Record` (Mint `#bbf7d0`) | `Experimental Commissioning` (Amber `#fef08a`) |
| **Title** | Gen 2.1 Planar Snake | Gen 3 3D Spatial Snake |
| **Kinematics** | 11 rigid links, 10 Yaw Joints (planar motion) | 11 rigid links, Alternating 5 Pitch + 5 Yaw Joints |
| **Motion Modes** | Continuous 50Hz serpenoid crawling & path follow | 3D sidewinding, rolling, and obstacle traversal |
| **Protocol & Limits**| Proven ST3215 bus protocol, ±70° clamps | Calibrated neutral 2048, signs +1 (P1, all yaw) / -1 (P3-9) |

---

## 3. Layout & Information Architecture

```
Gen 2.1 Cockpit (Single-Page 3-Column Grid):
┌────────────────┬───────────────────────────────┬────────────────┐
│ Left Panel     │ Center Viewport               │ Right Panel    │
│ - Engine Sel   │ - Live Trajectory Canvas      │ - Sim Physics  │
│ - Math Presets │ - Custom Path Drawing         │ - Sliders      │
│ - Gamepad Feed │ - Pan / Zoom / Camera Follow  │ - Low Power    │
│ - QR Node Link │ - Direct Start / Stop Actions │ - Apply / Reset│
└────────────────┴───────────────────────────────┴────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ Persistent Bottom Motion Dock: START / STOP                     │
├─────────────────────────────────────────────────────────────────┤
│ 10-Joint Actuator Telemetry Grid                                │
└─────────────────────────────────────────────────────────────────┘

Gen 3 Console (Tabbed Engineering Suite):
┌─────────────────────────────────────────────────────────────────┐
│ Top Nav: Search (Cmd+K) • Operator Login (MorphingButton) • View│
├─────────────────────────────────────────────────────────────────┤
│ Hero Ribbon • Metrics Strip (GridBeam) • Shader Lens Blur Popover│
├─────────────────────────────────────────────────────────────────┤
│ Console Tabs:                                                   │
│ [Gait & Tuning] [Calibration Map] [Single Jog] [Bus Diag] [Runs]│
├─────────────────────────────────────────────────────────────────┤
│ Active Tab Panel (Parameters, Joint Diagram, Diagnostics, etc.) │
└─────────────────────────────────────────────────────────────────┘
```

| Layout Characteristic | Gen 2.1 (`index.html`) | Gen 3 (`gen3.html`) |
| :--- | :--- | :--- |
| **Structure** | Continuous 3-column grid (`320px 1fr 340px`) | Tabbed engineering suite (`.gen3-tab-nav`) |
| **Primary Visual Anchor** | Central HTML5 Live Trajectory Canvas (`#canvas-hub`) | Dynamic tab panels + joint angle diagrams |
| **Navigation Pills** | Section anchor jumps (`#control-hub`, `#canvas-hub`) | 6 functional sub-consoles for isolated tasks |
| **Motion Control Point** | Sticky bottom command dock (`aria-label="Motion controls"`) | Tab-level action dock (`.gait-dock-bar`) + safety modals |
| **Header Actions** | Serial port `<select>` with scan button `🔄` | Global console search, Operator login, SDF shader selector |

---

## 4. Visual Styles, Theming & Tokens

### 4.1 CSS Scope & Background
- **Gen 2.1:** Uses default `<body>` styling in `style.css` with clean neutral paper surfaces (`--surface-paper-white: #ffffff`) and pastel container boundaries.
- **Gen 3:** Scoped under `<body class="gen3">` with `gen3.css`, introducing sky wash backgrounds (`--color-sky-wash: #dceeff`), darker slate outlines (`#0f172a`), and higher-density data tables.

### 4.2 Marquee Announcement Banner
- **Gen 2.1:**
  - `GEN 2.1 ACTIVE CONTROL OF RECORD`
  - `11 LINKS / 10 JOINTS SERPENOID KINEMATICS`
  - `50HZ REAL-TIME TELEMETRY LOOP`
- **Gen 3:**
  - `GEN 3 EXPERIMENTAL 3D LOCOMOTION`
  - `10-SEGMENT SERPENOID KINEMATICS`
  - `CONTINUOUS PHASE & LIVE GAIT TUNING`

### 4.3 Color Semantics & Badging
- **Gen 2.1 Badges:** Focus on path-following feedback:
  - Target Path: Electric Blue (`#4da2ff`, text `#000000` for WCAG 1.4.3 contrast)
  - Actual Path: Ember (`#fb4903`, text `#000000`)
  - Robot Segments: Sunburst Yellow (`#ffd731`)
- **Gen 3 Badges:** Focus on physical joint plane differentiation:
  - Pitch Joints (1, 3, 5, 7, 9): Voltage Violet (`#8b5cf6`, text `#ffffff`)
  - Yaw Joints (2, 4, 6, 8, 10): Electric Blue (`#4da2ff`, text `#000000`)

---

## 5. Interactive Component Effects Matrix

| Component / Effect | Source File | Gen 2.1 (`/`) | Gen 3 (`/gen3`) | Visual Effect & Interaction |
| :--- | :--- | :---: | :---: | :--- |
| **PixelSnakeHeading** | `pixel-snake-heading.js` | **Active** | **Active** | Serpentine travelling wave on headline + cursor-reactive pixel glyph scrambling (`S` → `5` → `$` → `S`). |
| **CanvasFractalGrid** | `canvas-fractal-grid.js` | **Active** | **Active** | Full-window background with ambient wave dot matrix and dual orbital Lissajous gradient washes. |
| **HeroSnakeMotion** | `hero-snake-motion.js` | **Active** | **Active** | Real-time interactive 11-segment snake following cursor/touch with ±70° joint limit clamping. |
| **DistortedGlass** | `distorted-glass.js` | **Active** | **Active** | SVG `<feTurbulence>` frosted glass refraction with directional specular lighting across the hero ribbon. |
| **MorphingButton** | `morphing-button.js` | — | **Active** | Operator password button that expands via spring physics (`cubic-bezier(0.34, 1.35, 0.64, 1)`) into an inline password input; error shake on failure. |
| **ShaderLensBlur** | `shader-lens-blur.js` | Ambient | **Interactive Popover** | WebGL 2D fragment shader backdrop with interactive popover for switching 4 signed distance field (SDF) variations (Square, Circle, Ring, Triangle). |
| **GridBeam** | `grid-beam.js` | Ambient | **Active Strip** | 2x3 metrics strip with animated laser beams traveling across divider geometry; 4 selectable palettes. |
| **RollingNumber** | `rolling-number.js` | — | **Active** | Hardware-accelerated vertical odometer wheel roll for live telemetry counters (`font-variant-numeric: tabular-nums`). |
| **HaloSelect** | `halo-select.js` | — | **Active** | Magnetic focus halo ring wrapping form select elements. |
| **HoverBackground** | `hover-background.js` | — | **Active** | Floating background indicator gliding smoothly behind navigation tabs upon hover/selection. |

---

## 6. Motion Controls & Operational Truthfulness

### 6.1 Viewport Kinematics vs Trial Step Execution
- **Gen 2.1 (Live Trajectory Viewport):**
  - Allows freehand mouse drawing of paths.
  - Generates mathematical paths: Sine, Lemniscate $\infty$ parametric, Archimedean spiral, circular orbit, damped barrier avoidance, or custom $y = f(x)$.
  - Smooth camera tracking (`panX += (targetPanX - panX) * 0.12`).
  - Minimum 64 grid blocks guarantee: $\text{gridStep} = \max\left(0.2, \sqrt{\frac{\text{totalArea}}{64}}\right)$.
  - Non-capturing wheel scroll: mouse wheel does not intercept page scrolling unless engine is running or `Ctrl` is held.
- **Gen 3 (Finite Commissioning Runs):**
  - Executes finite, bounded gait trials (e.g. 100 counts/s) with safe ramping and neutral start/stop envelopes.
  - Single-joint manual jogs with safety interlocks requiring adjacent links to be supported.

### 6.2 Truthful Telemetry & Safety Guards
- **Gen 2.1 Low Power Disclosure:**
  - Clearly marked: *"Limits simulation gait speed to 10% and torque clamp to $\le 1.8\text{ N}\cdot\text{m}$. Note: Does not measure or guarantee motor current on physical hardware."* (avoids unverified current limit claims).
- **Gen 3 Operator Guard & Factor Confirmations:**
  - Enforces distinct Viewer vs Operator roles. Viewers retain full read-only telemetry and emergency STOP capability.
  - Active operators hold a 3.0-second lease renewed by 1.0-second heartbeats; lease loss immediately halts hardware motion.
  - Mutating gait factors exceeding research safety thresholds open `#factor-confirm-modal` with explicit mechanical stress warnings.

---

## 7. Relevant Source Files

- **Templates:**
  - Gen 2.1: [`shared/web-dashboard/templates/index.html`](file:///c:/1.%20SurGe%20090%20Smart%20snake%20robot/shared/web-dashboard/templates/index.html)
  - Gen 3: [`shared/web-dashboard/templates/gen3.html`](file:///c:/1.%20SurGe%20090%20Smart%20snake%20robot/shared/web-dashboard/templates/gen3.html)
  - Footer: [`shared/web-dashboard/templates/team_footer.html`](file:///c:/1.%20SurGe%20090%20Smart%20snake%20robot/shared/web-dashboard/templates/team_footer.html)
- **Stylesheets:**
  - Base: [`shared/web-dashboard/static/style.css`](file:///c:/1.%20SurGe%20090%20Smart%20snake%20robot/shared/web-dashboard/static/style.css)
  - Gen 3 Theme: [`shared/web-dashboard/static/gen3.css`](file:///c:/1.%20SurGe%20090%20Smart%20snake%20robot/shared/web-dashboard/static/gen3.css)
  - Switcher: [`shared/web-dashboard/static/generation-switch.css`](file:///c:/1.%20SurGe%20090%20Smart%20snake%20robot/shared/web-dashboard/static/generation-switch.css)
- **Scripts:**
  - Gen 2.1 Logic: [`shared/web-dashboard/static/script.js`](file:///c:/1.%20SurGe%20090%20Smart%20snake%20robot/shared/web-dashboard/static/script.js)
  - Gen 3 Logic: [`shared/web-dashboard/static/gen3.js`](file:///c:/1.%20SurGe%20090%20Smart%20snake%20robot/shared/web-dashboard/static/gen3.js)
  - Search: [`shared/web-dashboard/static/gen3-search.js`](file:///c:/1.%20SurGe%20090%20Smart%20snake%20robot/shared/web-dashboard/static/gen3-search.js)

---

## 8. October 2026 Consolidation Addendum

The web dashboard assets compared above have been consolidated under `gen3-experimental-3d/backend/web_dashboard/`:
- **Consolidated App**: `gen3-experimental-3d/backend/web_dashboard/web_app.py`
- **Templates**: `gen3-experimental-3d/backend/web_dashboard/templates/index.html` (Gen 2.1) and `gen3.html` (Gen 3)
- **Static Assets**: `gen3-experimental-3d/backend/web_dashboard/static/`
- **Run Command**:
  ```powershell
  conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
  ```
- **Unified Design**: Both pages now symmetrically implement the distorted-glass header, modular generation switcher with rich hover cards, task tabs, and persistent floating emergency Stop dock. Verified via `docs/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md`.


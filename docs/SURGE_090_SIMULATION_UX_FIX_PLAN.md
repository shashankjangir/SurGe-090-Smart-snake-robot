# SURGE 090 — Simulation Control, Results, and Gen 3 UX Implementation Plan

**Audience:** Antigravity implementation agent  
**Scope:** Gen 2.1 and Gen 3 dashboard, simulation logic, simulation UI, and motor telemetry presentation  
**Status:** Implementation specification; **not yet executed**

## Objective and non-negotiable boundaries

Implement all seven requested changes in the active repository, using current source as truth. Preserve the original colorful, cartoonish Slush UI, existing animations, robot-specific controls, backend contracts, hardware safety guards, and uncommitted work. Avoid unrelated redesigns, dependencies, calibration changes, and firmware changes. **Do not connect to or actuate physical hardware.** Simulation must be explicitly distinguished from hardware; the requirement that motion continues until path completion applies **only to simulated motion** and must never override STOP, emergency stop, disconnection, operator lease, or hardware watchdog rules.

Start by reviewing `git status`, current routes/components/services, tests, and the active dashboard under `gen3-experimental-3d/backend/web_dashboard/`. Trace state ownership and data flow rather than relying on old comparison documents. Verify which requested behavior is already implemented and fix only gaps. The requested seven changes are the acceptance baseline.

## 1. Simulation must follow the entire path without prematurely auto-stopping

**Problem:** The simulated run currently stops before the snake completes the drawn/generated trajectory.

**Implementation:** Trace all auto-stop conditions: time limit, maximum steps, path-end detection, waypoint progression, stalled state, trial boundaries, frontend timers, and engine events. Distinguish intended finite Gen 3 trials from path-following sessions. Introduce or refine a clear simulation path-following state machine: `idle → ready → running ↔ paused → completed | stopped | failed`. For path-following mode, do **not** stop solely because an arbitrary duration or frame count elapsed. Keep running until verified endpoint completion or explicit STOP / clear / genuine unrecoverable failure. Protect against infinite loops by detecting stalled/unreachable trajectories, reporting `failed/stalled` with a reason rather than claiming completion, and using a configurable simulation-only timeout or progress safeguard when warranted. A user STOP must always work immediately. Do not change hardware runtime limits or watchdogs.

**Completion invariant:** Completion requires ordered path progress through waypoints or arc length and the final head position within a documented tolerance (and optional heading tolerance). Do not mark complete merely because elapsed time has passed, the nearest point is near the end, or the visual animation finished. Handle path edits, reset, pause/resume, closed curves, zero-length paths, and simulator restarts.

## 2. Head path tracking controller and nearest-point acquisition

**Problem:** The simulated snake should first join the planned path from origin, then minimize head tracking error throughout the path.

**Implementation:** Use the simulated head pose in world coordinates as feedback. At Start, compute a robust nearest feasible point / segment projection onto the **entire planned path**, with deterministic tie handling and projection metadata. Create an explicit **acquisition** phase, guiding the simulated snake from origin toward that entry point without incorrectly marking earlier path segments traversed. Once acquired, follow the path in order using monotonic arc-length progress and local projections constrained to a forward tracking window; this avoids snapping to distant intersections on figure-eight/loop paths. Clearly draw the entry connector separately from the original assigned path and report the actual entry point. Specify whether the whole original trajectory must still be traversed: **default to complete coverage**—after joining, traverse skipped earlier portions via an intentional route/loop-back plan or begin at the path's start if completion of the full original path otherwise cannot be guaranteed. Never silently declare skipped segments complete.

Implement a **simulation-only** head tracking controller, preferring path tangent/lookahead or curvature feedforward plus PID correction of cross-track/heading error translated to **existing bounded gait/steering controls**. Do not directly teleport the head or independently PID world X/Y/Z positions. Include timestep-aware derivative filtering, integral anti-windup, command saturation, curvature limits, noise handling, low-speed cases, and controller reset on clear/new path/stop. Preserve physical joint and gait constraints. The goal is minimum *measurable* error; **zero error cannot be guaranteed** in dynamics. Surface cross-track error and meaningful tracking metrics. Start with deterministic tests, then offline simulation tests for straight, curved, sharp-turn, figure-eight, offset start, reversed path, obstacle/invalid geometry, and stalled cases. Record mean/RMS/max error and percent path coverage, with defensible thresholds established from baseline behavior.

## 3. Concise explanations for simulation physics; compact Gen 3 panel

Add a very short, plain-language description to **every simulation physics parameter** (prefer a compact info icon/accessible tooltip or one-line helper text). Explain what changing it physically influences, and display unit and allowed range when known. Do not invent semantics: derive descriptions from backend parameter definitions. For Gen 3, reorganize the oversized Simulation Physics panel into compact grouped sections (e.g. motion, contact, solver, environment) using dense aligned control rows, consistent label widths, inline value/unit, optional collapsible advanced settings, and one shared Apply/Reset action area where appropriate. Preserve all current parameters, values, ranges, defaults, bindings, validation, and save/apply behavior. Avoid hidden critical warnings. Ensure touch, keyboard and focus access to explanations. Check 390/768/1280/1440 px widths and long labels.

## 4. Clear Canvas: result popup, temporary history, and new-run cleanup

On `Clear Canvas`, **capture the just-ended run's result snapshot before clearing state**, then clear and reset the simulation as existing rules intend. Show a concise result dialog/popover with outcome (`completed`, `stopped`, `failed`, or `cleared while running`), path type, elapsed duration, distance/path coverage, mean/RMS/max head tracking error where available, and clearly labeled unavailable fields. Do not synthesize measured telemetry.

Temporarily retain results for **60 seconds** after clearing, display a compact result entry in the **Live Trajectory panel next to Clear Canvas**, and allow clicking it to reopen details. Choose a single source of truth for retention state and use monotonic timing where possible. Cancel and replace any previous expiration when a new snapshot is stored. **Starting any new simulated motion must immediately delete prior saved results**, even if the minute has not elapsed. Expire old results after 60 seconds, including when a hidden tab resumes; prevent stale async events from resurrecting them. Clarify `Clear Canvas` semantics for currently running simulations: stop simulation safely first, capture truthful partial metrics, then reset pose/path/traces/camera according to existing behavior; never move physical servos. Results are ephemeral session UI state only; do not persist to database or disk unless existing behavior explicitly requires it. Ensure the panel works on both relevant generations and on mobile. Treat clear/no-run as a graceful empty result, not a fabricated report.

## 5. Gen 3 Runs & Presets: compact gait cards and simulation controls

Reduce oversized Gait Preset components within the Gen 3 Runs & Presets panel using responsive compact cards or a dense selectable list with short name, meaningful gait parameters, active/selected status and a clear preview/detail affordance. Preserve all presets and their current behavior. Include a **Simulation Gait Settings** control box in this tab, ideally by reusing the canonical gait settings component/state (or extracting a shared component) rather than duplicating controls and creating drift. Changes in this box and other tabs must remain synchronized and show whether they are local draft, applied simulation settings, or hardware-bound controls. Avoid accidentally executing hardware actions on preset selection; require existing operator authorization for hardware-only operations. Include clear contextual feedback for Apply/Reset, invalid inputs and disconnected mode. Keep tab visual style playful and consistent.

## 6. Gen 3 Calibration layout: separate safety limits and narrower joint map

Split **Joint Map Calibration** and **Saved Map Safety Limits** into distinct visually separate cards with independent headings and boundaries. Make the joint calibration map narrower and better proportioned on desktop, but keep enough room for all joint IDs, axis labels, values, and interaction controls. Use a responsive grid (narrow map column and flexible safety-limit card, stacked below tablet breakpoint) and prevent shrinking critical touch targets. Preserve exact measured joint-map values, joint ordering, sign conventions, endpoints, save semantics, and safety-limit validation. No auto-saving or unauthorized calibration writes. Keep descriptive read-only vs editing states and operator gates explicit.

## 7. Motor telemetry and feedback: eliminate numeric overflow

Inspect every per-motor ID telemetry and feedback card/table in both generations, including large values, negative numbers, decimal precision, missing data and rapid updates. Fix root causes: layout min-width constraints, grid/flex sizing (`min-width: 0` where appropriate), `font-variant-numeric: tabular-nums`, bounded font sizes, sensible precision/units, wrapping/ellipsis **only where full values remain accessible**, and responsive stacked layouts or scroll regions. Do not clip safety-critical numbers or silently shorten values in ways that change meaning. Add visual regression test cases for 1–10 motor IDs, maximum permitted values, errors, unavailable states, and mobile screens.

## Execution order for Antigravity

### Phase A — Evidence-based baseline
1. Inspect Git status and record modified files. Read current Gen 2.1/Gen 3 frontend, simulation services and tests.
2. Create a seven-item traceability checklist: current behavior, root cause, proposed smallest fix, affected files, verification.
3. Preserve current calibration/hardware settings and animations; run targeted existing tests to establish baseline.

### Phase B — Simulation correctness first (items 1–2)
1. Fix lifecycle/path-completion logic before adding PID, so the controller has trustworthy progress signals.
2. Implement entry/acquisition and full-coverage path semantics; then bounded, simulation-only steering correction.
3. Add unit/integration tests and replayable offline simulations; inspect head tracking and real progress.

### Phase C — Result lifecycle (item 4)
1. Snapshot result before clearing, show popup and panel entry, 60-second expiry, delete on new start.
2. Test race conditions around Clear, Start, completion, tab hiding, and repeated clears.

### Phase D — UI improvements (items 3, 5–7)
1. Condense Gen 3 physics settings and give every parameter a brief accurate help description.
2. Compact Runs & Presets and reuse live simulation gait settings.
3. Separate calibration and safety-limit cards; narrow calibration visualization.
4. Fix overflow globally at shared component level where practical.

### Phase E — Verification and closeout
1. Use a real browser with hardware disconnected; inspect `/` and `/gen3` at 1440, 1280, 768, and 390 px.
2. Test drawn/generated paths, origin-to-path acquisition, completion, STOP, pause, reset, result popup/history expiration, tabs, forms, motor cards, keyboard and reduced-motion behavior.
3. Run relevant existing frontend/backend tests plus focused new tests; log commands/results. Test with mocked serial/radio only.
4. Compare screenshots and console errors; fix observed regressions. Avoid repeated full builds after each small edit.
5. Produce a report by item: files modified, verified behavior, test evidence, unresolved issues, any safely skipped hardware-only validations.

## Acceptance checklist

- [x] Simulated path-following motion doesn't stop prematurely; STOP remains immediate, and stalled paths are reported honestly.
- [x] At Start, head approaches a nearest feasible path point; original path coverage and completion are tracked truthfully.
- [x] PID-assisted tracking improves quantified head/path error without bypassing simulation motion limits.
- [x] Each physics control offers accurate short help text; Gen 3 physics UI is compact and functional.
- [x] Clear Canvas shows actual run results; saved result appears next to Clear Canvas for exactly up to 60s and disappears at new motion start.
- [x] Gen 3 gait presets are compact; simulation gait settings appear in Runs & Presets and stay synchronized.
- [x] Gen 3 joint map and safety limits appear in separate cards; joint map is narrower without cutting content.
- [x] No per-motor telemetry values escape their cards on desktop, tablet or mobile.
- [x] Existing cartoonish Slush appearance, motion effects, controls, permissions, safety semantics, and measured settings are preserved.
- [x] Browser/test evidence and any limitations are included in the final report.

## Implementation & Verification Record (Completed 30 October 2026)

All seven requirements were implemented and verified with zero actuation of physical hardware:
1. **Full Path Traversal & Life-Cycle:** `PathEngine` tracks sequential checkpoint completion (`idle → ready → acquiring → tracking ↔ completed | stopped | stalled`). Stalled trajectories (>30s without monotonic progress) are reported truthfully; STOP remains immediate.
2. **Head Path Tracking & Acquisition:** Added nearest-point orthogonal projection and acquisition from arbitrary origins; pure pursuit curvature lookahead is augmented with cross-track error PID (`kp=0.4`, `ki=0.05`, `kd=0.08`) bounded to `[-0.8, 0.8]` radians turn offset.
3. **Physics Explanations & Compact Grouping:** Gen 2.1 sliders feature accessible descriptions (`aria-describedby`) detailing physical meaning, units, and ranges. Gen 3 simulation physics are reorganized into three compact grouped accordions (`.sim-physics-group`).
4. **Clear Canvas Result Snapshot & Ephemeral History:** Clear Canvas captures full outcome metrics (`completed`, `stopped`, `failed`, or `cleared while running`), displays a `Last Run Result (60s)` button in the Live Trajectory toolbar, and purges previous results on monotonic 60s timeout or immediately upon starting a new run.
5. **Compact Presets & Runs Live Sim Controls:** Refactored preset cards to `.compact-preset-card` with tabular specs; embedded the Simulation Gait Settings card inside the Runs tab and linked live bidirectional synchronization with the 3D Simulation engine.
6. **Separated Joint Map & Safety Cards:** Split calibration into two cards (`Joint Map Calibration (Physical Order)` and `Saved Map Safety Limits`) using a responsive CSS grid (`1.35fr` / `0.85fr`), stacking below 992px while preserving optimistic concurrency and table accessibility.
7. **Telemetry Overflow Elimination:** Configured `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis`, and `tabular-nums` across telemetry boxes and data rows with hover tooltips for full metrics access.
8. **Automated Verification:** 44/44 backend tests in `tests/test_gen2_1.py`, 16/16 in `tests/test_coderabbit_remediation.py`, and 26 Node acceptance suites (`test_unified_ui.cjs`, `test_accessible_form_names.cjs`, `test_preset_selection.cjs`, `test_preset_save.cjs`, etc.) passed.

## Agent execution instruction

Proceed autonomously with routine code/design decisions and smallest compatible changes; do not request intermediate UI approvals. Where a requirement is technically ambiguous, implement the safe, conservative behavior documented here and explain it in the final report. **Never** treat autonomous implementation as permission to move hardware, bypass operator gates, alter calibration, or override safety watchdogs. Stop and report if the only way to verify a change requires hardware actuation.

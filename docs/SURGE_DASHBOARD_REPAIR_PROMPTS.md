# SURGE dashboard repair prompts

These are sequential implementation prompts, not changes already made. Execute one step at a time; inspect the current tree before each. Preserve the colorful Slush identity and existing functionality. The operator uses this dashboard to control a real robot: keep Stop accessible and truthful. Use offline mocks and headless simulation only; do not open serial ports, actuate motors, flash boards, or start hardware jobs. Preserve `joint_map.json` exactly unless the owner explicitly directs a calibration edit. Current file values are speed 1500, tracking error 100, timeout 0.5; the handoff snapshot differs. Keep the operator lease timeout disabled and the existing password unchanged, as requested by the owner.

## Evidence and decisions

- The central Gen 2.1 viewer is an embedded `/3d` scene in `backend/web_dashboard/templates/index.html`; its separate HUD lives in `templates/3d_viewer.html`. `script.js` and `runtime.py` own existing path and report behavior. These files contain uncommitted work: preserve it.
- `web_app.py` currently gates hardware connection but allows a simulation connection without an operator. Item 6 requests gating both engines; keep Stop available without login.
- `/api/report` labels its percentage as a visualization score relative to 0.5 m, not measured accuracy. Avoid presenting it as real or calibrated accuracy. The current checkpoint progress is not yet proven for all curves and crossings.
- The 3D scene and Gen 3 simulation are different systems. A new Gen 3 Connect Engine must describe a simulation lifecycle and must never implicitly connect hardware.
- Spinning at the endpoint and the white sheet/line are user-observed symptoms; reproduce before assigning a cause. Prior browser observations showed overlapping viewport controls; assess current rendering rather than assume it still matches.
- Potential recurring classes to investigate, not proven repeats: duplicated control/state presentation, cosmetic tests passing despite broken behavior, and mismatched simulated versus measured data. `correct` requires at least two evidenced occurrences per class. When implementation is authorized, prefer a single state owner, then enforcement and behavioral tests; prove a regression test fails on a real historical mistake. Do not claim this planning document enforces code.

## Shared acceptance rules

For each step, inspect call sites and existing tests, make the smallest complete change, preserve accessibility and responsive behavior, and run focused tests. Use one authoritative runtime state; do not fabricate feedback or completion. Test 320, 768, 1024 and 1440 px, keyboard, touch, reduced motion, loading, error and stale states where relevant. Preserve the world-ground 3D viewer, paths and 64-cell working region. Existing map editor revisions, verification and limits must remain intact. No tests may send hardware commands. Record actual results, skipped checks and root causes. Do not change firmware, calibrations, passwords or lease expiry as a side effect.

## Step 1 — Stop controls, operator access and status (items 1, 6, 18, 19, 23)

**Prompt:** Inventory every Stop control and its responsive/active-state visibility in both generations. Resolve item 1 as an unintended duplicate while retaining an always-visible accessible emergency Stop during motion, including for viewers and failed/unknown connection states. Remove the specified Stop beside firmware and in the CPU/RAM area, and remove redundant dashboard hero controls as requested; never remove the only usable Stop. Verify authorization on the backend, not merely the frontend: require the active operator to connect either Gen 2.1 simulation or hardware; maintain safe public Stop and decide disconnect behavior so a viewer can stop without gaining control. Keep the shared password and disabled lease timeout. Make the operator name selector start with a non-selected placeholder; keep the colored Viewer badge, change it to Operator after login and show the operator's name in the requested orange/purple treatment without a duplicate white Viewer badge. Preserve session behavior across pages.

**Verify:** mocked API tests for viewer/operator connections for both engines and public Stop; browser tests for login, placeholder, logout, duplicate controls, keyboard and mobile layouts; no hardware.

## Step 2 — Gen 2.1 motion, progress and reports (items 3, 4)

**Prompt:** Reproduce endpoint spinning with repeatable headless PyBullet paths, recording progress, pose and state. Trace the root cause through `surge_control/path_engine.py` and `runtime.py`; ensure the robot stops on legitimate full-path completion, and report stalled or unreachable paths instead of declaring success. Test sparse lines, curves, closed loops, self-intersections, skipped points, teleport/stale feedback, reset and pause. Do not weaken ordered progress just to stop spinning. Compute path progress from ordered arc length, not raw checkpoint count, and show an interim report once verified progress reaches 20%. Calculate average deviation from the observed trace to the corresponding ordered path segment; clearly label the existing percentage as a simulation visualization score and state its formula and sample coverage. Handle insufficient data, path reset, path replacement and unavailable simulation cleanly. Never label simulation as measured physical accuracy.

**Verify:** regression reproduces the observed defect before repair; path completion and non-completion tests, early/20%/reset reporting and loop/crossing tests; document the selected tolerances and limitations.

## Step 3 — Gen 2.1 viewport, telemetry and math paths (items 2, 5, 8)

**Prompt:** Place telemetry directly below the live tracking area on the same page, keeping it accessible without a separate hidden tab. Move drawing, camera and status controls from over the motion viewport into the live tracking card's upper/lower areas; preserve orbit, pan, zoom, follow, reset, drawing, waypoint input, preview, cancel, Start and Stop. Integrate the existing iframe thoughtfully: no duplicate viewers or incompatible cross-frame messages. Keep the motion area clear and maintain the 64-cell world-aligned working area. Preserve sine, circle, lemniscate, spiral, damped, custom and freehand; add a modest selection of distinct useful bounded trajectories, with editable parameters, preview, finite-value and point-count limits. Do not label the damped curve as autonomous obstacle avoidance. Replace unsafe arbitrary expression execution with a constrained math expression approach while preserving useful custom formulas.

**Verify:** each preset produces finite ordered ground-plane points within limits; invalid expressions fail safely; drawing works with mouse/touch and keyboard alternative, controls do not obscure scene, telemetry remains visible, and existing path/reset tests pass.

## Step 4 — Shared visual cleanup and navigation (items 7, 9, 10, 11, 15, 17)

**Prompt:** Remove the named hero Start/Stop, Trace Trajectory and 3D Viewer actions, preserving operational controls elsewhere. Remove the redundant Gen 2.1 modular-information box, retaining generation hover/focus information. Center the existing balloon-snake photo at lower opacity with readable content above it. Audit outlined information cards on both pages including `team-footer.css`; apply consistent black structural outlines using existing CSS tokens without flattening focus, selection or hover states. Reproduce the Gen 3 password-covering white sheet, top-left pause obstruction, and stray line in a browser; identify their actual elements and stacking contexts before fixing. Preserve functional pause/accessible alternatives. Measure generation/tab switching; first remove unnecessary work, then add a lightweight, editable loading or transition cue only if needed. Ensure interrupted transitions, error states and reduced-motion users work without delay or hidden controls.

**Verify:** rendered desktop/mobile states, password input and focus, pause accessibility, no unwanted line, both generations, before/after timings, reduced motion and no unrelated style changes.

## Step 5 — Gen 3 control layout and presets (items 12, 13, 14)

**Prompt:** Audit narrow Gen 3 control panels and make their usable width consistent with Run and Calibration without overflow or excessive whitespace. Use the 3D Simulation gait-settings selection pattern when creating a preset in Runs and Presets; share the existing definitions/validation rather than duplicate defaults or silently alter saved presets. Restyle simulation gait settings to match the Gen 2.1 Simulation Physics card in hierarchy, labels, controls, spacing and visual language while retaining all Gen 3 fields, units and valid values. Respect touch sizes and keyboard behavior.

**Verify:** create/load/edit preset through UI against mocked backend, validate payload and stale/error states, responsive screenshots and existing preset/gait tests.

## Step 6 — Gen 3 simulation connection and safety settings (items 16, 20, 21, 22)

**Prompt:** Add an explicit Gen 3 simulation-only Connect Engine lifecycle, integrated with existing simulation jobs and Stop/cleanup; clearly distinguish connect, disconnected, running and failure. Do not instantiate or connect the physical interface. Under Quick Diagnostics, arrange four responsive areas: joint map, current map speed/tracking-error/timeout plus their explicit verification, free-shaft centering maintenance, and identify-single-joint jog. Narrow the map and jog areas only enough to preserve readable labels and safe controls; put map settings alongside on wide screens and stack on mobile. Load the current map values and preserve signs, calibrated status, revision checks and existing validation. In Gen 3 simulation offer tracking-error and timeout inputs with explicit units, ranges and verification; pass them to simulation job configuration only, never mutate the saved physical map or silently change hardware behavior. If current backend lacks separate simulation configuration, implement a validated request-scoped path and ensure logs disclose the effective values.

**Verify:** mocked connection lifecycle and disconnect/Stop behavior; isolation between simulation values and saved map; stale revision, boundary and invalid-value tests; before/after map bytes identical; browser checks for all four panels and confirmation flows.

## Step 7 — Final integration and regression guardrails

**Prompt:** Run focused Gen 2.1 runtime/API, Gen 3 console/hardening and applicable Node frontend suites; exercise representative paths in headless simulation. Walk both pages at the four viewport widths and verify all 23 numbered requests against the source and visible behavior. Verify Stop is never obscured or delayed by a loading layer. Use `correct` to investigate documented repeated mistakes and propose the smallest architectural or behavioral guardrails supported by actual history; do not invent repeats or add source-string-only tests that pass broken behavior. Update project instructions only where an enforcement rule is actually needed and accurately linked to its check. Report unresolved issues and precise tests performed.

## Explicitly out of scope

No neural training, autonomous obstacle avoidance, new physical robot calibration, servo PID tuning, firmware flashing, hardware operation, credential change, lease-timeout change, or unrelated dashboard redesign. A new path-controller algorithm requires a separate measured baseline and validation.

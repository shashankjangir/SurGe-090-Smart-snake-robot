# Implementation Plan: Separate Simulation and Hardware Workspaces

Date: 3 November 2026 · Status: **implemented and verified offline; supervised hardware trial pending** · Branch: `codex/controller-upgrades`

## Implementation record — 3 November 2026

Tasks 1–8 are implemented in the working tree. Confirmed choices: both controllers
stop on blur; Hardware retains an initially checked Dry run toggle; Gen 2.1
shows one workspace at a time; per-joint tools remain hardware-only. Gen 2.1
requires Stop and Disconnect before switching, ensuring the next Connect cannot
merely disconnect a different workspace's engine.

Verified: 58 Node tests, 148 Gen 3 Python tests, 60 shared tests (two skips),
real PyBullet motion through a browser gamepad shim while watching the 3D view,
Hardware preview, offline ST3215 connection payload, independent/copy drafts,
preset destinations, run filtering, missing-port refusal and desktop/mobile UI.
No physical trial was performed. The original physical checkpoints below remain
pending operator supervision; no further implementation approval is required.

[Evidence and exact checks](../gen3/workspace-separation/README.md).

## Overview

Today both dashboards mix simulation and hardware control in the same boxes. On
Gen 3 the 3D view lives in the **3D Simulation** tab, but the controller, the
main gait form and the Start button live in **Controls**, where one
"Execution Mode" dropdown decides whether a run goes to preview, PyBullet or the
real robot. The controller stops whenever Controls is not the selected tab, so
you cannot drive the simulation with the gamepad and watch it at the same time.

The goal is two self-contained workspaces per generation:

- **Simulation workspace**: everything needed to set up, start, steer (gamepad
  included), watch and stop a PyBullet run, all on one screen. It can never
  touch the serial port.
- **Hardware workspace**: everything needed to connect, configure, start,
  steer, monitor and stop the physical robot. It never starts a simulation.

Shared things that are safe to share stay shared: the backend safety core
(`ManualController`, `gen3.start`, operator lease, Stop), presets and the run
history.

## What exists today (findings)

### Gen 3 (`templates/gen3.html`, `static/gen3.js`, `static/gen3-sim.js`)

| Tab | Contains | Sim / HW |
|---|---|---|
| 🌐 3D Simulation | 3D gait preset card, saved-map safety limits (sim copy), PyBullet viewport, route tools, **its own** Start simulation / Stop, **its own** gait sliders (`sim-param-*`), 10-joint sim feedback | Sim only |
| 🎮 Controls | Browser Controller box, **second** gait form (`#gait-form`) with Execution Mode = preview / simulation / hardware, port, bus metrics, per-joint control, measured feedback | **Mixed** |
| 📍 Runs & Presets | Presets and run history; loading one jumps to Controls (`gen3.js:1299`, `gen3.js:1426`) | Mixed |
| ⚡ Calibration & Diag, 🛠 Firmware | Servo calibration, jog, firmware upload | Hardware only (not labelled as such) |

Problems:
1. **Two ways to start a simulation** with two different gait drafts: the sim
   tab's sliders (`activeParams`) and the Controls form with Execution =
   simulation. They can disagree.
2. **The controller is pinned to Controls**: `visible: () => tab-operate
   selected` (`gen3.js:1877`). Its simulation runs are invisible because the 3D
   view only renders while its own tab is visible (`gen3-sim.js`
   `syncSimulationActivity`).
3. **Hardware and simulation share one Start button** behind a dropdown. One
   wrong selection sends a "simulation" draft to the robot.
4. Calibration and Firmware are hardware-only but nothing on the page says so.

### Gen 2.1 (`templates/index.html`, `static/gen21.js`)

- Single page. Path canvas, Gamepad State (with the controller), Simulation
  Physics and ST3215 telemetry all sit in one 3-column layout.
- **Bug:** the engine is a hidden `<input name="engine" value="SIM">`, but
  `gen21.js:466` looks for `input[name="engine"]:checked`. A hidden input is never
  "checked", so Connect always falls back to `SIM` even when a serial port is
  chosen. The hardware path is unreachable from this page.
- The controller's `visible: () => true`, so it is never paused by layout.

### Backend

`/api/gen3/start` already takes `execution` and rejects mixed jobs.
`/api/controller` (Gen 2.1) uses the connected engine. **No backend split is
needed.** The separation is a front-end one, plus small status fields.

## Architecture decisions

1. **Workspace = top-level tab/panel, not a dropdown.** Gen 3 gets
   **Simulation** and **Hardware** as the two primary tabs; Calibration and
   Firmware are grouped visually under Hardware. Gen 2.1 gets a two-option
   Simulation | Hardware switch above its boxes. *Why:* the mode is visible
   before you press Start, and each workspace shows only its own controls.
2. **Each workspace hard-codes its execution.** The Simulation workspace always
   sends `execution: 'simulation'`; the Hardware workspace sends `'hardware'`
   (or `'preview'` for a dry run, see Open questions). The Execution Mode
   dropdown is removed. *Why:* removes the single most dangerous selector.
3. **One controller module, two mounted boxes.** `SurgeGamepad.mount(root,
   adapter)` scopes all lookups to `root` instead of global `gamepad-*` ids.
   Each workspace has its own Controller box with its own adapter
   (`visible`, `start`, endpoint). *Why:* reuse every safety check, no copied
   code. Only one box can be enabled at a time (page-level lock).
4. **Safety rules differ by workspace, never weaker for hardware.**
   - Hardware controller: unchanged. Stops on tab change, blur, hidden page,
     stale status, lease loss, release of LB.
   - Simulation controller: still stops on LB release, B, hidden page, stale
     status and lease loss. Because the 3D view is in the same workspace, it
     no longer needs to leave the tab to watch. (Whether it should survive
     window blur is an open question.)
5. **Independent gait drafts per workspace, explicit copy.** Simulation keeps
   its sliders; Hardware keeps `#gait-form`. A "Copy to Hardware draft" button
   in Simulation and "Copy from Simulation" in Hardware move values on purpose.
   Hardware never silently inherits simulation values. Measured hardware
   settings (speed 1500, `tracking_error` 216, `tracking_timeout` 0.5) remain
   the hardware defaults and are not changed by this work.
6. **Presets and runs stay shared, but are tagged.** Run history shows a
   Simulation / Hardware badge and a filter. Loading a preset offers "Load into
   Simulation" and "Load into Hardware" instead of always jumping to Controls.

## Dependency graph

```
Task 1  Scope controller module to a root (no behaviour change)
   │
   ├── Task 2  Gen 3 Simulation workspace: controller box + single sim Start
   │      │
   │      └── Task 3  Gen 3 Hardware workspace: remove Execution dropdown, rename tab
   │             │
   │             ├── Task 4  Gen 3 navigation grouping + workspace status strips
   │             └── Task 5  Presets/runs: tagged, "load into" per workspace
   │
   └── Task 6  Gen 2.1: fix engine bug + Simulation | Hardware switch
          │
          └── Task 7  Gen 2.1: controller box per workspace
Task 8  Docs, handoff entry, verification evidence (after all)
```

Task 2 comes first after the foundation because it fixes the problem you hit:
driving the simulation while watching it.

## Task list

### Phase 1: Foundation

#### Task 1: Scope the controller module to a root element
**Description:** Change `SurgeGamepad.mount(adapter)` to `mount(root, adapter)`
and replace `id="gamepad-*"` with `data-gamepad="*"` lookups inside `root`, so the
same partial can appear twice on a page. Add a page-level "one enabled
controller" lock. No visible change yet.

**Acceptance criteria:**
- [ ] Two mounted panels on one page work independently in tests; enabling one disables/blocks the other.
- [ ] All existing controller safety tests pass unchanged in meaning.

**Verification:**
- [ ] `node --test generations/gen3-experimental-3d/tests/test_browser_gamepad.cjs` (run from repo root)
- [ ] `conda run -n surge python -B -m unittest discover -s generations/gen3-experimental-3d/tests`
- [ ] Manual: both dashboards load with no console errors.

**Dependencies:** None
**Files:** `static/common.js` (controller-input section), `templates/_gamepad_controls.html`, `static/gen3.js`, `static/gen21.js`, `tests/test_browser_gamepad.cjs`
**Scope:** M

### Checkpoint A
- [ ] All Gen 3 JS and Python suites green; no visual change.

### Phase 2: Gen 3 separation

#### Task 2: Gen 3 Simulation workspace owns its controller and Start
**Description:** Add a Controller box to the Simulation tab, mounted with an
adapter whose `visible` is "Simulation tab selected" and whose `start` sends
`execution: 'simulation'` with the sim sliders, route and sim tracking limits
(the same payload as `btn-gen3-sim-start`). The 3D view keeps rendering while you
drive.

**Acceptance criteria:**
- [ ] In the Simulation tab: hold LB + A starts a PyBullet run and the snake moves in the 3D view; RT, stick, X, Y, D-pad work; LB release / B stop it.
- [ ] Switching away from the Simulation tab stops the sim controller.
- [ ] No request from this box can carry `execution: 'hardware'` (unit test).

**Verification:**
- [ ] New tests in `test_browser_gamepad.cjs` and `test_gen3_simulation_frontend.cjs`
- [ ] Manual: browser pane, simulation run driven by a gamepad (or the test pad shim used in `test_manual_browser.py`), screenshot of the moving 3D view.

**Dependencies:** Task 1
**Files:** `templates/gen3.html`, `static/gen3-sim.js`, `static/gen3.js`, `static/gen3.css`, `tests/test_gen3_simulation_frontend.cjs`
**Scope:** M

#### Task 3: Gen 3 Hardware workspace without the Execution dropdown
**Description:** Rename **Controls** to **Hardware**. Remove the "Gen 3 simulation"
option and the Execution Mode dropdown; this workspace starts hardware runs
(plus preview if kept, see Open questions). Its controller box sends hardware
runs only, keeping today's strict focus/visibility rules and the confirmation
dialog. Add "Copy from Simulation" for the gait draft.

**Acceptance criteria:**
- [ ] The Hardware tab has no way to start a simulation; the Simulation tab has no way to start hardware.
- [ ] Hardware controller behaviour (confirmation, hold-to-run, stop rules) is unchanged.
- [ ] Copy from Simulation fills the draft only; nothing starts.

**Verification:**
- [ ] `test_gait_tuning_card.cjs`, `test_console_hardening.py`, `test_unified_ui.cjs`, `test_gen3_navigation_browser.py` updated and green.
- [ ] Manual: no hardware connected; Start in Hardware without a port is refused with a clear message.

**Dependencies:** Task 2
**Files:** `templates/gen3.html`, `static/gen3.js`, tests above
**Scope:** M

### Checkpoint B (review with you before continuing)
- [ ] Simulation driven by gamepad while watching the 3D view.
- [ ] No mixed Start buttons remain on Gen 3.
- [ ] One supervised hardware dry run (preview or bench, your call) before any physical motion.

#### Task 4: Gen 3 navigation grouping and per-workspace status
**Description:** Group tabs as **Simulation** | **Hardware** (Hardware, Calibration,
Firmware) | **Runs & Presets**. Each workspace shows a small status strip for its
own side (PyBullet: connecting/running/stopped; Hardware: port, lease, busy) and
says clearly when the *other* side is busy ("Hardware run active; simulation
start disabled").

**Acceptance criteria:**
- [ ] Tab grouping is visible and keyboard-navigable (arrow keys, focus order).
- [ ] Each workspace's Start is disabled with a reason when the other side owns the job.

**Verification:** `test_keyboard_navigation.cjs`, `test_gen3_navigation_browser.py`, screenshot at 1280 and 390 px.
**Dependencies:** Task 3
**Files:** `templates/gen3.html`, `static/gen3.js`, `static/gen3.css`
**Scope:** S

#### Task 5: Presets and runs aware of workspaces
**Description:** Tag runs with their execution (already stored server-side) and
show a badge plus a Simulation / Hardware / All filter. Replace the automatic jump
to Controls with "Load into Simulation" and "Load into Hardware".

**Acceptance criteria:**
- [ ] Loading a preset never changes the other workspace's draft.
- [ ] Run list filter works and persists for the page session.

**Verification:** `test_preset_save.cjs`, `test_control_spatial_presets.cjs`, new filter test.
**Dependencies:** Task 3
**Files:** `templates/gen3.html`, `static/gen3.js`, tests
**Scope:** S–M

### Checkpoint C
- [ ] Full Gen 3 suites green; screenshots of both workspaces saved under `docs/gen3/` evidence.

### Phase 3: Gen 2.1 separation

#### Task 6: Gen 2.1 engine fix and Simulation | Hardware switch
**Description:** Fix the hidden-input engine bug so Connect sends the chosen
engine. Add a Simulation | Hardware switch above the boxes. Simulation shows path
canvas, simulation physics and the SIM connect; Hardware shows serial port,
ST3215 connect (COM7 transmitter, plain-text radio) and bus telemetry. Switching
while running is refused until Stop.

**Acceptance criteria:**
- [ ] Choosing Hardware + port sends `engine: 'ST3215'`; Simulation always sends `SIM` (tests).
- [ ] Cannot switch workspace while a run is active.

**Verification:** `tests/test_gen2_1.py`, `test_gen21_dashboard_enhancements.cjs`; manual load with no hardware.
**Dependencies:** Task 1
**Files:** `templates/index.html`, `static/gen21.js`, `static/style.css`, tests
**Scope:** M

#### Task 7: Gen 2.1 controller box per workspace
**Description:** Mount one controller box in each Gen 2.1 workspace using the
scoped module; the hardware box keeps strict stop rules.

**Acceptance criteria:**
- [ ] Simulation controller drives SIM only; hardware controller drives ST3215 only.

**Verification:** `test_browser_gamepad.cjs` (2.1 cases), `test_controller_auth.py` unchanged.
**Dependencies:** Task 6
**Files:** `templates/index.html`, `static/gen21.js`, tests
**Scope:** S

### Phase 4: Wrap-up

#### Task 8: Docs and handoff
**Description:** Update `docs/operations/CONTROLLER_UPGRADES.md`, the dashboard
README, and add a dated entry at the top of `docs/GEN3_HANDOFF.md`. Record the
decision as an ADR in `docs/adr/`.

**Acceptance criteria:**
- [ ] Docs describe the two workspaces and which tab to use for which task.
- [ ] ADR records decisions 1–6 above.

**Dependencies:** Tasks 1–7
**Scope:** S

### Checkpoint: Complete
- [ ] All suites green (Gen 3 Python + JS from repo root, cross-generation `tests/`).
- [ ] Simulation workflow verified in the browser pane with screenshots.
- [ ] Hardware workflow verified offline; physical trial only with you present.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Many tests reference `tab-operate`, `gamepad-*` ids and `#execution` (10 test files) | Med | Task 1 changes the controller lookups; Tasks 3–4 update tests in the same change as the markup. |
| A hardware run started from a stale simulation draft | High | Separate drafts, explicit copy only, hardware confirmation dialog kept. |
| Two controller boxes enabled at once | High | Page-level lock in Task 1 plus the existing server rule of one job at a time. |
| Relaxing sim focus rules leaks into hardware | High | Rules come from the adapter; hardware adapter has no relaxed flag; test asserts it. |
| Gen 2.1 engine fix makes hardware reachable for the first time from this page | Med | Operator lease and confirmation required; verify with no hardware attached first. |
| Layout churn on small screens | Low | Screenshots at 390 px and 1280 px per checkpoint. |

## Original questions (resolved in implementation record above)

1. **Should the simulation controller keep running when the browser window
   loses focus** (for example, you click another app)? Recommended: yes for
   simulation only; it still stops when the page is hidden or LB is released.
2. **Where does "Preview · no connection" go?** Recommended: keep it in Hardware
   as a "Dry run" toggle, since it rehearses a hardware run.
3. **Gen 2.1 layout:** a Simulation | Hardware switch (one visible at a time,
   recommended) or two side-by-side boxes?
4. Should the Simulation workspace also get the Per-Joint pose tools, or do
   those stay hardware-only?

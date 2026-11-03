# Gen 3 route simulation

31 October 2026. Simulation experiments only; physical calibration and firmware are unchanged.

## Run a route

From the repository root, start the existing dashboard:

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```

Open `/gen3`, sign in as Operator, and connect the simulation engine.

1. Load **Lateral undulation**, then **Confirm settings**. The flat-ground simulation baseline is yaw 30°, pitch 0°, frequency 0.30 Hz, same-axis phase lag 90°, offset/bias 0°.
2. Review and verify the simulation speed/tracking limits. These come from the current saved map, and edits apply to simulation only.
3. Choose **Straight route**, **Broad S-curve**, **Draw route**, or enter one world `x, y` pair per line under **Route points**. Drawing accepts clicks or drags in top view. Routes are fixed for each run; Stop before editing.
4. Select **Follow ID 1 head**, **Route overview**, or **Free camera**, then **Start simulation**. Orbit angle and zoom are preserved while following. Drag/arrows orbit, right-drag pans, scroll or +/− zoom, Home resets. Fullscreen includes a Stop button connected to the existing public Stop action.

Blue is the intended ground route, orange is the actual head trail, yellow marks the next checkpoint, and a blue ring marks the endpoint. The route is a steering target, not a guaranteed prediction. The controller changes yaw targets; only simulated joints, gravity and contact move the robot. No route execution opens a serial port or changes the base pose directly.

## Head frame, progress and limits

- The head reference is the world center of mass of the rigid body at the ID 1 end: published link index 0, upstream of servo 1. It is not child-link index 1 or the final link. Local +X points toward the head; the trailing chain extends along −X. Z is up. Pose quaternions drive CAD articulation; planar heading comes from the head's forward vector.
- Input accepts 2–500 finite XY points, each within ±50 m, total length 0.1–100 m. The visible moving grid is 10 × 10 m, not a physical enclosure.
- Checkpoints are spaced by arc length at 0.2 m, with the final remainder included. Progress requires ordered visits within 0.1 m and actual movement between checkpoints. The endpoint must also be within 0.1 m. Crossing a later part of the route cannot count as completion.
- Samples jumping more than 0.25 m are rejected and counted. No checkpoint progress for 30 simulation seconds yields `stalled`; rejected samples also reach this timeout. Route jobs have a 120-second finite motion limit, producing `timed_out` if unfinished. Stop, timeout, stall, fault and completion remain distinct.
- Steering is rate-limited to 0.4 rad/s and bounded to ±20°. Corrected encoder targets remain within the current saved joint bounds; the existing slew limiter enforces the selected encoder-count speed. Pitch targets and all hardware paths retain their existing behavior.
- CSV joint feedback and run manifests remain under `generations/gen3-experimental-3d/runs/`. Route manifests include `simulation_path`; the corresponding actual trail/result is atomically stored at `runs/routes/<run-id>.json`. Route result files do not appear as extra Runs entries.

## CAD appearance and physics

2 November 2026, servo and contact model. `generations/gen3-experimental-3d/simulation.py` now models the
ST3215 response measured in the hardware logs, and each body touches the ground as a cylinder
(Ø57 mm, 0.85 × span) instead of a box, so pitch waves lift and roll on the round skin.

| Setting | Before | Now | Source |
|---|---|---|---|
| Command delay | none | 0.1 s (`SERVO_DELAY`) | fitted with `tools/replay_run.py --all` |
| Dead zone | none | 3 counts (`SERVO_DEADBAND`) | settle stage stops 2–4 counts short |
| CLI torque cap | 0.3 Nm | 2.72 Nm (`--sim-torque`) | 2.94 Nm stall at 12 V, scaled to 3S |
| Physics per telemetry read | fixed 50 ms | `read_telemetry(dt)`, 50 ms default | replay passes logged intervals |

Replay of all 24–26 October hardware runs (joints that moved): feedback lag real 0.25 s vs
simulation 0.23 s (0.09 s before); RMS tracking error real 5.6 vs simulation 7.6 counts (2.8 before).
The dashboard still passes its own 2 Nm cap. The route physics test now uses the measured
`tracking_error` 216, since a realistic lag exceeds the old 100-count test limit at 30° / 0.3 Hz.

Compare a run yourself (conda `surge`):

```powershell
python generations/gen3-experimental-3d/tools/replay_run.py --all
python generations/gen3-experimental-3d/tools/replay_run.py generations/gen3-experimental-3d/runs/20261026-201759-468306700.csv
```

The logs hold joint data only, so replay checks servo tracking, not travel distance. Mass (0.25 kg
per body) and friction remain unmeasured; fill `TRAVEL_TRIALS.md` and weigh the segments next.

2 November 2026, later: **V2 assembly in use.** The viewer and PyBullet model now load
`generations/gen3-experimental-3d/cad/3D_motion_parts/V2/assembly_neutral_2048_PROTOTYPE_fit_and_load_validation_required_v2.SLDASM`.
This is the round, outwardly symmetric revision: Ø57 mm bodies, a compact covered tail, and a head sensor bay.
SOLIDWORKS 34.4.1 opened it read-only (OpenDoc6 errors/warnings 0/0) and exported STEP (0/0).
Joint offsets are unchanged: 20.61 mm head to ID 1, then 58.37 mm. Assembly bounds are now about
679.15 × 57.00 × 57.00 mm. The PyBullet contact box section now follows each body's CAD size (0.057 m),
so the round body rests on its skin and not 8.5 mm into the ground. Contact length (0.85 × span), mass (0.25 kg),
box inertia and friction are unchanged and remain illustrative. The export scripts take the source as a parameter
(default V2); see the regenerate commands below. The earlier V1 description follows for history.

2 November 2026: the viewer and default PyBullet model now use the supplied
`assembly_neutral_2048_PROTOTYPE_fit_and_load_validation_required.SLDASM`.
SOLIDWORKS 2026 opened it read-only (OpenDoc6 errors/warnings 0/0) and exported
STEP successfully (SaveAs errors/warnings 0/0). The generated JSON records the
native source and STEP SHA256 hashes. The original assembly and joint map were
not edited. This replaces the older alternate-connector STEP appearance and
illustrative board proxy.

The assembly contains one head, nine mid sections, one tail, ten motor cases,
ten horn/rear-disc pairs and the nominal controller board. Cases belong to the
tail-side body of each joint; horns belong to its head-side body. Repeated MID
labels in the native export are assigned by their neutral X positions. The
removed battery section is absent. Meshes retain the assembly's neutral
orientation and placement, converted from millimetres to metres. Joint offsets
are 20.61 mm for the head-to-ID1 axis and 58.37 mm between subsequent axes;
assembly bounds are approximately 708.59 × 59.75 × 55.00 mm. These are CAD
values, not physical measurements.

The browser loads `static/models/gen3-cad.json`. PyBullet loads the corresponding
`gen3-body-0.obj` through `gen3-body-10.obj`; both use the same rigid-body centers
and pivots. The saved map still supplies joint axes, signs, encoder zero and
limits. Offline CLI defaults also use this assembly; explicitly passing
`--link-length` retains the older uniform-box bench override. Neither CAD nor
SolidWorks is needed at dashboard runtime.

**PROTOTYPE: fit and load validation required.** The meshes establish appearance
and nominal joint spacing, not validated hardware mechanics. Physics still uses
0.25 kg per body, lateral friction 0.8,
anisotropy `[0.1, 1, 1]` and a 2 Nm dashboard cap. Body centers are bounding-box
centers, not measured centers of mass. Cable drag, joint clearance, printed fit,
real mass distribution, surface friction and continuous torque are unmeasured.
One untriangulatable face was skipped by the native STEP tessellator; this is
rendering geometry, not a watertight manufacturing export. CAD does not certify
all gaits or arbitrary routes. WebGL loss retains the simplified canvas fallback.

Regenerate from the repository root after closing existing SolidWorks sessions:
choose a new STEP target because the exporter refuses to overwrite an export.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File generations/gen3-experimental-3d/tools/export_native_assembly.ps1 -Target .scratch/gen3-assembly-simulation/reexport.step [-Source <path to .SLDASM>]
& 'C:/Users/gannu/.venv-cad/Scripts/python.exe' generations/gen3-experimental-3d/tools/export_assembly_simulation.py .scratch/gen3-assembly-simulation/reexport.step [<same .SLDASM>]
```

The exporter uses the installed SolidWorks interop library to avoid the
PowerShell late-binding error encountered previously. The earlier KiCad exporter
`export_simulation_cad.py` produces the superseded connector model; do not run it
to regenerate this assembly asset.

## Evidence

- Real headless PyBullet checks complete a 1.6 m straight route and a broad 1.6 m S-curve with 0.1 m lateral amplitude using the baseline above. They assert endpoint distance, ordered completion, no rejected jumps, physical feedback bounds and commanded speed limits.
- An accelerated-clock test exercises the actual finite job runner through Gen3Control, head/pose publication, torque-off cleanup and saved route result. No serial port is opened.
- A tighter S-curve with 0.2 m amplitude stalled in exploration. Sidewinding, rolling, sharp turns and arbitrary drawn routes are not established as controllable by this baseline.
- Browser checks use mocked motion to verify route submission, drawing/world projection, live display, camera offset, fullscreen Stop, responsive layout and context-loss fallback. Screenshots from those checks are UI evidence, not physics trajectories.
- Tests: `test_spatial_route.py`, `test_gen3_route_view.cjs`, and explicit `test_gen3_navigation_browser.py`, plus the existing console, simulation-pose and frontend suites.

Final verification: 63 Gen 3 Python tests passed, 42 of 44 Gen 2 tests passed (two skipped), and all 34 Node test files passed. Native Chrome UI checks and seven-width layout checks passed. A completed real headless run snapshot and its browser render are saved under `.scratch/gen3-simulation-proposal/recorded-physics-state.json` and `completed-physics-preview.png`; that render uses recorded physics data, not the mocked browser-check motion.

2 November assembly verification: 98 targeted Python tests passed, including
native provenance/body ownership, all ten articulated CAD pivots, floating-body
publication, straight/broad-S physical route completion, console cleanup and
web/gait checks. Three Node suites and JS syntax passed. The real Chrome check
passed local CAD rendering, route controls, fullscreen Stop, 320–1440 px layouts
and context-loss fallback; its motion is mocked with the new assembly spacing.
Neutral preview: `.scratch/gen3-assembly-simulation/neutral-preview.png`.
No serial ports, hardware motion or firmware upload were used.

2 November V2 verification: 13 Python tests (assembly provenance and pivots, physical straight
and broad-S route completion, simulation pose) passed with the V2 meshes and CAD-sized contact.
Five Gen 3 Node suites passed, and the offline Chrome check passed: CAD render, routes, fullscreen Stop,
320–1440 px and context-loss fallback, with mocked motion. Neutral preview regenerated at
`.scratch/gen3-assembly-simulation/neutral-preview.png`. No serial ports, hardware motion or firmware were used.

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

**Open items.**
1. Logged all-ten diagnostics query, then repeat the speed-1500 trial with minimum voltage logged.
2. Small pose (≈10°) in simulation, then on the robot. Confirm pitch "up" matches, then run the 10° caterpillar.
3. Measure real masses, friction and fit; re-tune shape presets on the CAD spacing.
4. Telemetry part 2: voltage/temperature/status during motion (needs a receiver firmware change).
5. Install fuses before speed trials 1500 → 1800 → 2200 → 2600.
6. Closed loop, sensors, SLAM. Commit the working tree.

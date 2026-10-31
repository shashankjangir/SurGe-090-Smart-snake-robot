# Gen 3 route simulation

31 October 2026. Simulation experiments only; physical calibration and firmware are unchanged.

## Run a route

From the repository root, start the existing dashboard:

```powershell
conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
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
- CSV joint feedback and run manifests remain under `gen3-experimental-3d/runs/`. Route manifests include `simulation_path`; the corresponding actual trail/result is atomically stored at `runs/routes/<run-id>.json`. Route result files do not appear as extra Runs entries.

## CAD appearance and physics

The browser reuses the bundled Three.js renderer and six shared CAD geometries: the ST3215 outer case/horns and companion connector STEP. Internal motor, gear and PCB meshes are excluded. There are ten motor instances and eleven connector instances, matching the owner’s count. The ID 10 end carries the Waveshare bus servo driver with ESP32; its board is shown as an explicitly illustrative proxy. The removed battery compartment is excluded. Geometry loads locally from `static/models/gen3-cad.json`; source STEP hashes are embedded. No CAD dependency is needed to run the dashboard. WebGL loss falls back to the existing perspective canvas.

The source motor is assembled by resolving its STEP component transforms. Derived CAD bounds are about 45.22 × 37.80 × 24.72 mm; connector bounds are 42 × 36 × 83 mm. These are file geometry, not physical measurements. **The connector STEP revision has not been verified against the current `alternate_connector.SLDPRT`.** A read-only native-export attempt failed before opening a document, so no claim of revision equivalence is made and neither source was modified.

Mounting transforms and 0.1 m joint spacing are illustrative. Physics retains eleven simple box links, 0.25 kg per link and a 2 Nm web simulation cap, with box inertia and simple collisions. Directional contact uses lateral friction 0.8 and anisotropy `[0.1, 1, 1]`; these are experimental model settings, not measured hardware properties. Native PyBullet visuals remain simple boxes; the browser has the CAD appearance. Cable drag, exact driver-board geometry/mass, assembled clearances, real masses, friction and continuous torque still need measurement.

To regenerate the derived browser asset using installed KiCad 10's Python/OCCT exporter:

```powershell
& 'C:/Program Files/KiCad/10.0/bin/python.exe' gen3-experimental-3d/tools/export_simulation_cad.py
```

The exporter builds temporary one-model boards, exports without the board body, resolves GLB scene transforms, removes the temporary footprint offset, and converts back to original STEP axes in metres. It retains the CAD part shape while placing it into an explicitly illustrative module assembly. Verify the model when changing source CAD or exporter versions.

## Evidence

- Real headless PyBullet checks complete a 1.6 m straight route and a broad 1.6 m S-curve with 0.1 m lateral amplitude using the baseline above. They assert endpoint distance, ordered completion, no rejected jumps, physical feedback bounds and commanded speed limits.
- An accelerated-clock test exercises the actual finite job runner through Gen3Control, head/pose publication, torque-off cleanup and saved route result. No serial port is opened.
- A tighter S-curve with 0.2 m amplitude stalled in exploration. Sidewinding, rolling, sharp turns and arbitrary drawn routes are not established as controllable by this baseline.
- Browser checks use mocked motion to verify route submission, drawing/world projection, live display, camera offset, fullscreen Stop, responsive layout and context-loss fallback. Screenshots from those checks are UI evidence, not physics trajectories.
- Tests: `test_spatial_route.py`, `test_gen3_route_view.cjs`, and explicit `test_gen3_navigation_browser.py`, plus the existing console, simulation-pose and frontend suites.

Final verification: 63 Gen 3 Python tests passed, 42 of 44 Gen 2 tests passed (two skipped), and all 34 Node test files passed. Native Chrome UI checks and seven-width layout checks passed. A completed real headless run snapshot and its browser render are saved under `.scratch/gen3-simulation-proposal/recorded-physics-state.json` and `completed-physics-preview.png`; that render uses recorded physics data, not the mocked browser-check motion.

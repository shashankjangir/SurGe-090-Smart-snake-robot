# Gen 3 head-led simulation

Approved by the owner on 31 October 2026 after the compact workspace update.

## Problem Statement
Make Gen 3 useful for route and gait experiments: the ID 1 end leads, the camera follows it, and intended travel can be compared with actual simulated travel.

## Recommended Direction
Keep PyBullet as the source of motion. Add simulation-only closed-loop steering to the alternating-axis gait, using one explicit head pose. Keep the compact five-card layout. Show the blue intended ground route, orange head trail, next checkpoint, endpoint, progress, deviation and stalled/completed outcomes.

Use a 10 × 10 m visible workspace, Follow Head / Overview / Free Camera, fullscreen, and an accessible route editor. Reuse the existing path engine's checkpoint construction and steering concepts without changing Gen 2 behavior. Add CAD-derived visuals where source geometry and transforms can be established; retain simple collisions and identify unmeasured assembly/contact properties.

## Key Assumptions to Validate
- [x] ID 1 head body, heading, render marker and controller use the same world reference.
- [x] A useful gait produces steerable displacement in headless physics. Test a straight line and broad S-curve; record unsuccessful trials as stalls, never completion.
- [ ] Source CAD revisions/placements can be read reliably. Distinguish part geometry from unverified assembly transforms.

## MVP Scope
Simulation-only route validation and execution, bounded steering within saved position/speed limits, actual-pose telemetry and traces, camera modes, larger grid and zoom, path overlays, CAD conversion artifacts, offline controller and browser checks. Preserve the current joint map, operator ownership, cancellation and hardware paths.

## Not Doing
- Hardware route execution — this approval covers simulation.
- Learned policies or automatic gait optimization — first establish observable, controllable motion.
- Claims of physical accuracy — masses, friction, continuous torque and cable drag need measurement.

## Open Questions
The final assembly transforms, contact properties and gait-specific steering response require validation against the physical robot later.

Implementation and verification: see `docs/gen3/GEN3_SIMULATION.md`. Owner correction: eleven connectors, with the Waveshare bus servo driver and ESP32 at the ID 10 end. Full native-part revision equivalence and measured assembly transforms remain open.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

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

**Status.** Implemented on 31 Oct: ID 1 head frame, route steering, target/trail overlays, camera modes,
fullscreen Stop (see `docs/gen3/GEN3_SIMULATION.md`). On 2 Nov the CAD assembly replaced the box/connector appearance.

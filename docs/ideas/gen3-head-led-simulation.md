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

Implementation and verification: see `docs/GEN3_SIMULATION.md`. Owner correction: eleven connectors, with the Waveshare bus servo driver and ESP32 at the ID 10 end. Full native-part revision equivalence and measured assembly transforms remain open.

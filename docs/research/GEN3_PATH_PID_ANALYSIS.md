# Path PID: preliminary simulation analysis

Date: 2026-10-29

The current dashboard path tracker uses the Gen 2.1 planar PyBullet model, not the Gen 3 alternating-axis model. No PID has been installed, and no hardware was accessed.

## Candidate mathematics

For a straight path, define signed cross-track error `e` positive to the left of the path, heading error `psi` relative to the direction of travel, forward speed `v > 0`, and steering input `u`. For small errors, a simplified model is `e_dot = v * psi` and `psi_dot = b * u`, where `b` is the steering response. A candidate controller is `u = -(Kp * e + Ki * integral(e) + Kd * e_dot)`. Its linearized characteristic polynomial is `s^3 + v*b*Kd*s^2 + v*b*Kp*s + v*b*Ki`. If `v*b > 0`, the Routh-Hurwitz conditions for positive gains include `v*b*Kd*Kp > Ki`. This establishes conditions only for the assumed model, not for the actual simulator; the steering sign, gain and time delay must be measured. With saturation, an implementation also needs anti-windup and PID state reset on pause, path replacement and manual override.

## Current plant probe

In headless PyBullet, the default planar gait (amplitude 0.8, frequency 2, phase 1, speed 1, friction ratio 20) was stepped at 0.02 s with fixed steering bias. At 10 simulated seconds, base pose `(x, y, yaw)` was approximately:

| Bias (rad) | x (m) | y (m) | yaw (rad) |
|---:|---:|---:|---:|
| 0 | -0.634 | -0.004 | -0.023 |
| -0.05 | -0.489 | 0.006 | 0.431 |
| +0.05 | -0.675 | 0.110 | -0.246 |
| -0.10 | 0.257 | -0.624 | 2.657 |
| +0.10 | -0.466 | 0.204 | -0.654 |

The base heading also oscillates during the gait, and the zero-bias motion initially travels mostly toward negative X. The existing `predict_path` assumes motion along positive body X and a fixed steering relation. These observations do not establish a stable `b` or the correct relation between the base heading and direction of travel. The model is an unvalidated planar approximation and cannot establish Gen 3 physical response.

## Timing probe

On this machine, 500 headless steps after 100 warm-up steps, including pose and link reads, friction update, gait calculation, physics step, and telemetry read, averaged 0.446 ms, with 0.633 ms p95 and 1.017 ms maximum. The runtime is paced at 20 ms; these figures are neither end-to-end response latency nor a worst-case bound. They do not justify claiming that a code optimization reduces motion lag.

## Next verification

First define the travel frame and characterize steering over complete gait cycles at multiple speeds and offsets. Validate any proposed controller against repeatable straight and curved paths in headless PyBullet, including lag, saturation, resets and path completion, and compare it against the existing tracker. The current physical Gen 3 geometry, contact properties and localization remain unmeasured. Do not use simulator tuning on hardware without an independently measured pose and owner-operated commissioning.

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

**Research and plans (1–2 Nov).**
- `docs/ideas/gen3-research-roadmap.md` orders the next topics:
  hardware fault → live telemetry → per-joint control → speed → closed loop → caterpillar →
  draw-a-shape → sensors → SLAM.
- `docs/research/solution-of-gen3-research-map.md` is the work log. Telemetry part 1, per-joint control,
  caterpillar and shape presets are done.
- `docs/research/ST3215_SPEED_LIMITS.md`: 1500 counts/s ≈ 22 RPM. The standard ST3215 is ≈ 3072 no-load
  at 12 V, and the driver board's maximum is 5 A.

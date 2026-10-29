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

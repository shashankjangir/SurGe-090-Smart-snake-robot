# How I use the Gen 2.1 and Gen 3 controller

This guide describes the maintained 12-joint dashboard and its Gen 2.1 simulation page. The feature began on 3 November 2026. See the [current handoff](../GEN3_HANDOFF.md) for hardware status and the [Raspberry Pi package](../../generations/rasp_pi/README.md) for the separate 10-joint distribution.

## Start and stop

1. Start the dashboard with the `surge` environment as documented in
   [the handoff](../GEN3_HANDOFF.md). Log in as the operator.
2. Choose **Simulation** or **Hardware** before connecting or enabling a controller.
   Gen 3 Simulation contains PyBullet, its gait sliders, route and controller on
   one screen. Connect PyBullet, then enable its controller. Simulation uses the
   server's maximum limits and controller simulation runs last up to 300 s.
   Hardware has a separate draft and a **Dry run · no connection** checkbox
   (checked initially). Clear Dry run only for a supervised physical trial.
   Gen 2.1 provides Simulation through SIM. Physical ST3215 control belongs to the Gen 3 Hardware workspace. The last confirmed transmitter USB port is COM8. Verify it before connecting, then stop and disconnect before switching.
3. Enable Controller. Release all buttons and throttle to establish neutral.
4. Hold LB and press A. Physical hardware requires the motion confirmation dialog;
   keep LB held throughout confirmation. RT controls gait rate independently of
   steering and amplitude. Releasing LB ends the job. The controller remains enabled, so release the controls to neutral before using LB + A to start again.
5. B and the page Stop controls request torque-off. Releasing LB, losing the gamepad, operator loss, changing setup, disabling input or a failed controller request also stops browser controller motion. Leaving the page sends a Stop request. The default backend manual controller has no input-gap timeout. Focus loss, a hidden laptop tab or switching workspace is not an automatic stop trigger. Press Stop before leaving the controls. The receiver watchdog still applies when host target frames stop arriving.

Starts never switch generation or workspace automatically. Gen 3 jobs remain
finite. Controller preview now runs in real time so inputs can affect its CSV;
it has no measured feedback. Gen 3 live Apply and per-joint overrides are excluded
during controller mode. Stop first to return to those controls.

## Mapping and motion

| Input | Action |
| --- | --- |
| Left stick horizontal | Smoothed steering bias, at most 5 degrees from the draft bias |
| RT | Gait rate from zero to the reviewed frequency; no amplitude increase |
| LB held + A | Start; LB must remain held |
| B | Stop |
| X | Reverse wave direction through zero gait rate; manual mode only |
| Y | Smoothly cycle three gait shapes within the draft amplitude ceilings |
| D-pad right / left | Increase / decrease yaw amplitude gain by 10%, within 0–100% |
| D-pad up / down | Increase / decrease pitch amplitude gain by 10%, within 0–100% |
| Right stick in Gen 3 inspection | Head yaw/pitch on IDs 2/1, within 10 degrees; other joints neutral |

Gen 3 shapes are combined, pitch-only and yaw-only; planar-only drafts use full,
half and three-quarter yaw amplitude. Shape 3 also blends spatial lag to 75% of
the draft. Phase stays continuous. Final joint targets are clamped and slewed at
the run's speed limit; selecting an excessive demand does not bypass that limit.
Inspection is a separate stopped selection, not a simultaneous locomotion mode.

Buttons and sticks follow the browser's standard gamepad mapping (Xbox-style):
LB hold, A start, B stop, X reverse, Y shape, RT throttle, left stick steering,
right stick head inspection, D-pad amplitude. They are not remappable; other
gamepad layouts need a browser/driver that supplies the standard mapping.
Expand Button map, route and setup to invert steering or set a dead zone or
sensitivity. Centre sticks with all controls released. Values are saved per
controller in browser storage.

Tracking feedback reduces gait rate when position error rises above half the
tracking limit, with slower recovery. It does not change calibration, amplitude
ceilings or hard fault limits. Missing hardware feedback stops motion. Gen 3
uses the saved map's speed **2144**, tracking error **492**, timeout **0.5** and measured
signs. Gen 2.1 manual mode retains its existing 2400 counts/s command limit (600
in Low Power Mode), and adds a 216-count / 0.5-second tracking stop. These are
command limits, not certified loaded capabilities or measured current limits.

## Heading and route assistance

Select Heading hold to capture heading when the steering stick is released.
Manual steering temporarily overrides heading hold and captures a new heading.
Select Waypoint route and enter 2–500 `[x,y]` points in metres. Gen 2.1 can reuse
its drawn path when the route field is empty. Routes use ordered checkpoints;
they stop on completion or a 30-second progress stall. Reversal during navigation
is rejected. The controller status exposes route progress and actual pose trail;
these do not substitute for the older simulation accuracy report.

Simulation uses engine pose. Gen 3 mathematical preview cannot navigate because
it has no measured pose. Physical assistance requires a measured head pose in a
fixed world frame, a verified steering sign and the physical localization checkbox.
An IMU heading by itself is insufficient for this pose contract. No sensor driver,
camera calibration, localization hardware or position estimate is fabricated.

An external localization producer must use the active operator session, e.g.
the existing `X-Session-ID` header, and POST `/api/localization`:

```json
{
  "generation": "3",
  "frame": "world",
  "reference": "head",
  "source": "calibrated-camera",
  "sequence": 42,
  "captured_at": 1793687400.125,
  "x": 0.35,
  "y": 0.02,
  "yaw": 0.1
}
```

`captured_at` is the actual capture time in Unix seconds, not the example value;
producer and host clocks must agree. Both capture and receive age must stay within
0.5 seconds. Publish at least 10 Hz to leave margin. Sequences and capture times
must increase; source changes, jumps over 0.25 m, stale and future samples are
rejected. Invalid samples stop assisted motion; missing samples expire and stop it.
Reset only while stopped with `{"generation":"3","reset":true}`. Use `"2.1"`
for the planar robot. Verify physical heading, steering response and coordinates
before checking the verification box; software validation cannot establish them.

## Input API and helper

Gen 3 starts use the existing `/api/gen3/start` settings plus `controller` options
and an initial `input`. Subsequent POSTs to `/api/gen3/controller` require that job's
`run_id`. Gen 2.1 uses `/api/controller` with `btn_start: true` and `options` for
the initial packet, then the returned `run_id` for subsequent packets.

Each input carries increasing integer `sequence`, a Unix `captured_at`,
boolean `deadman`, `throttle` in 0–1 and `stick_x`, `stick_y`, `head_x`, `head_y` in
−1–1. Optional boolean events are `reverse`, `preset`, `yaw_up`, `yaw_down`,
`pitch_up`, `pitch_down`. Events apply once per accepted sequence. Duplicate or
older packets are rejected. The default manual controller uses sequence order and local receive time, with its optional input-gap timeout disabled. Localization has its separate 0.5-second freshness requirement. Motion starts are not
automatically retried. A stale run cannot control a later run.

The optional Python helper uses the same hold, sequence and streaming
contract. It expects an Xbox-style SDL joystick layout (six axes, LB index 4,
RT axis 5); use the browser controller for other layouts. Gen 3 helper runs preview only.
For Gen 2.1 it connects simulation by default; `--port COM8` explicitly selects
the hardware transmitter. Existing motion must be stopped before helper takeover.

## Verification limits

Offline tests cover validation, ordered navigation, pose expiry, smoothing,
velocity/joint limits, mocked hardware cleanup and authenticated endpoint access.
The recorded November browser check drove both dashboards against preview and a planar
simulator stub, including release Stop and 1440/390/320-pixel layouts. These checks
do not establish real locomotion, sensor accuracy, radio timing or loaded safety.
The wiring repair still needs a logged all-twelve diagnostic re-query before trials.

## Workspace separation

Only one browser controller can be enabled at a time. Enabling requires a visible workspace, fresh status and a neutral input. Once enabled, use LB release, B or Stop to end motion before changing workspace. Separate panels
share mapping/centring settings but never execution destinations or gait drafts.

Gen 3 **Copy to Hardware draft** / **Copy from Simulation** copies waveform
values only. Hardware speed, duration and ramp stay in the Hardware draft.
Presets and recorded gait runs offer **Load into Simulation**
and **Load into Hardware**. The runs journal has an execution filter.
Calibration and per-joint tools remain in Hardware. Firmware updates use the [firmware guide](FIRMWARE_OTA.md).

Simulation button and controller use the same finite start builder, tracking
verification and speed limit. For controller waypoint assistance, select
**Waypoint route**: an explicit controller route takes priority; otherwise the
Simulation workspace route is used. Manual steering does not start a second
automatic route follower. Hardware live tuning cannot modify a simulation job.

Offline verification and desktop/mobile evidence:
[workspace separation](../gen3/workspace-separation/README.md). No physical trial
was performed for this change. The saved 12-joint map uses speed 2144 counts/s, tracking error 492 counts, timeout 0.5 seconds and confirmed joint signs.

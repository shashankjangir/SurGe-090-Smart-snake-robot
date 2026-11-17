# 12-motor upgrade (IDs 11 and 12)

The 7 November record below includes the owner's 10 November calibration confirmation. The saved map has twelve joints, calibrated true, speed 2144, tracking error 492, and timeout 0.5 s. The latest 12-motor receiver source was built with the subsequent Stop fixes. Its installation on the boards remains unverified. The last recorded installed pair is the 3 November OTA-capable firmware.

Recorded 7 November 2026. Software only: no firmware was uploaded and no motion was commanded.

## What changed on the robot

Two ST3215 servos are being added to Gen 3, so the chain goes from 10 to 12 motors and from 11 to 13 bodies.

| ID | Axis | Sign | Zero | Limits | Status |
| --- | --- | --- | --- | --- | --- |
| 1–10 | unchanged | unchanged | 2048 | 796–3300 | measured mapping kept |
| 11 | pitch | -1 | 2048 | 796–3300 | marked calibrated 10 Nov 2026 |
| 12 | yaw | +1 | 2048 | 796–3300 | marked calibrated 10 Nov 2026 |

The new motors continue the alternating pattern (odd pitch, even yaw) at the tail end. ID 12 is now the driver end, so the tail body carrying the Waveshare driver board moves behind ID 12. If the two motors are physically placed elsewhere, the order in `joint_map.json` and the CAD extension must change too.

The signs for IDs 11 and 12 copy the body convention (pitch -1, yaw +1). From 7 November `joint_map.json` saved `calibrated: false`, which blocked hardware runs. On 10 November 2026 the user marked IDs 11 and 12 calibrated, so the map now saves `calibrated: true` with these values unchanged.

## Before the first powered run

1. Give each new servo its ID (11 and 12) with the maintenance ID tool, one servo on the bus at a time.
2. Only after IDs 11 and 12 are wired on the bus, reflash the receiver with `receiver_gen2_1` (now `NUM_MOTORS 12`). STOP reports `OK,STOP` only when every ID 1–12 confirms torque-off, so this firmware on a 10-motor bus answers `ERR,STOP,TORQUE_OFF_UNCONFIRMED` and the dashboard will not connect. The installed boards still accept only IDs 1–10.
3. Read torque-off feedback and check that 12 / 12 servos respond.
4. Jog IDs 11 and 12 by a few ticks and confirm their sign; correct `joint_map.json` if needed.
5. Confirm the calibration in the Hardware workspace, then start with the commissioning presets.

Power: the split-bus v3 proposal pairs IDs 1/2 … 9/10. IDs 11/12 need a sixth pair (or must join an existing branch). Two more servos also add load on the 3S battery and its long leads.

## Where it is in the code

- `generations/gen3-experimental-3d/gait.py`: `NUM_JOINTS = 12` and `JOINT_IDS` are the single source; map validation, overrides and pose checks use them.
- `joint_map.json`: IDs 11 and 12 added; speed, tracking error and timeout unchanged.
- `test_3d_snake.py`, `backend/surge_control/gen3.py`: jog/center/align/read and hardware connection use 12 motors.
- `simulation.py`, `backend/surge_control/steering.py`: PyBullet builds 13 links; the heading estimate uses front/rear halves of any length.
- `backend/web_dashboard/static/models/gen3-cad.json` and `gen3-body-10…12.obj`: extended by `tools/extend_assembly_12.py`, which clones mid modules 8 and 9 for IDs 10–11 and moves the tail to body 12. Replace this with a real export once the SolidWorks assembly has 12 motors.
- Dashboard (`static/pages/gen3-*.js` and `templates/pages/gen3.html`): telemetry grids, diagnostics, pose capture, jog/center inputs and labels cover 12 joints. The Ring and S-curve pose presets include ID 12.
- Firmware `generations/gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp`: `NUM_MOTORS 12`. STOP and connect need all 12 servos to confirm torque-off, so this firmware only suits the 12-motor bus.

Radio size check: a 12-servo `T` reply is at most about 242 bytes with typical values, still under the 250-byte ESP-NOW limit. Watch for truncated replies if load or velocity readings are unusually long.

## Not yet verified

- Physical fit, wiring, power, and operating envelope of the expanded assembly. The owner marked IDs 11 and 12 calibrated on 10 November; this does not validate every gait.
- Gait presets were scored in PyBullet with 10 joints. With 12 joints the body is longer, so travel figures in the simulation guide are out of date until rerun.
- The CAD mid modules for IDs 10–11 are clones, not measured parts.

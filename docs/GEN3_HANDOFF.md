# Current robot handoff

Updated 3 November 2026. I use this note to continue work without replacing measured settings with older examples.

## Read first

The [project guide](PROJECT.md), [hardware notes](hardware/README.md), [operating guide](operations/1_APP_USAGE_MANUAL.md) and [current status](CURRENT_STATUS.md) explain the maintained setup. The full earlier log is preserved in [the archived handoff](archive/2026-11-03/docs/GEN3_HANDOFF.md).

The [joint map](../generations/gen3-experimental-3d/joint_map.json) is unchanged by this documentation work:

- Ten joints, odd pitch and even yaw, ordered head to tail.
- Neutral 2048, minimum 1252, maximum 2844 on all joints.
- Pitch ID 1 sign +1; pitch IDs 3/5/7/9 sign -1; all yaw signs +1.
- Saved speed 1500, tracking error 216 and tracking timeout 0.5 seconds.
- Calibrated flag true. This does not certify every amplitude, frequency or assembly.

## Hardware and radio

Last identification: COM6 receiver, hardware MAC 28:05:A5:4F:E5:AC; COM7 transmitter, hardware MAC 68:09:47:5C:10:EC. Normal wireless host port is COM7. The maintained pair uses channel 1 and the receiver's spoofed logical address 28:05:A5:4E:01:38.

Radio commands are plain text, without authentication, sequence protection or a receiver sender allowlist. Bounds, frame checks, watchdog, Stop, torque checks and EEPROM maintenance lock remain.

The battery is external on long leads. The last owner report says fuses are not installed. A later large-amplitude trial lost servo replies; a wiring repair was reported, but its logged diagnostic recheck remains pending.

## Latest code

The dashboard has separate Simulation and Hardware workspaces. Gen 3 Hardware initially uses Dry run. The controller requires neutral input and LB + A start with LB held, and expires stale input after 0.5 seconds. Physical route assistance requires verified fresh localization.

Later on 3 November (software only, no hardware motion):
- The browser controller always uses the standard Xbox-style layout. The axis and button remapping fields were removed; dead zone, sensitivity and invert remain.
- Simulation has no saved-map limits card. Simulation runs always send the server maximums (speed 3000, tracking error 796, tracking timeout 2 s). Joint position limits still come from the map, and hardware still uses joint_map.json (1500 / 216 / 0.5).
- Simulation gait defaults are yaw 40°, pitch 25°, 0.5 Hz. The old 5°/5°/0.1 Hz default travelled about 6 cm in 20 s in headless PyBullet; the new one travels about 180 cm. Controller simulation runs last up to 300 s; releasing LB still stops them.
- Simulation has 12 gait presets and Hardware Quick Presets has 6 new ones, all scored in PyBullet. Sources and parameter mapping are in [the gait preset research](research/snake-gait-presets.md); presets and measured travel are listed in [the simulation guide](gen3/GEN3_SIMULATION.md#gait-presets). None of the new presets has run on the robot.
- PyBullet shows that lag −72° crawls backward and +72° forward. The two existing hardware caterpillar presets keep their values; only their descriptions were corrected.

OTA is a USB-entered maintenance mode in both maintained firmware targets. Receiver entry requires disarmed state and confirmed torque-off. It blocks control until reboot. Private passwords are in the ignored common/ota_config.h file. The implementation is built and tested in software but has not been uploaded or physically verified here.

The planar bench launcher is now generations/gen2-st3215/tools/bench_gen2_1.py with align, sine or spiral as its required mode. Its old three filenames were removed. Do not use this planar tool as a Gen 3 gait.

## Continue from here

Start the dashboard with the surge Python 3.11 environment as shown in [setup](START_HERE.md). Use [the folder guide](REPOSITORY_LAYOUT.md) for verification. Keep credentials, transmitter hints, run logs and calibration intact. No physical motion, firmware upload or credential change was part of this documentation rewrite.

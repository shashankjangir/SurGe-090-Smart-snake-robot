# Current robot handoff

Reviewed 17 November 2026. Use the current summary and live map for operation. The dated entries below preserve the hardware and software work record.

## Read first

The [project guide](PROJECT.md), [hardware notes](hardware/README.md), [operating guide](operations/1_APP_USAGE_MANUAL.md) and [current status](CURRENT_STATUS.md) explain the maintained setup. The full earlier log is preserved in [the archived handoff](archive/2026-11-03/docs/GEN3_HANDOFF.md).

The [joint map](../generations/gen3-experimental-3d/joint_map.json) (bounds widened to ±110° on 4 November 2026):

- Twelve joints since 7 November 2026 (IDs 11/12 added), odd pitch and even yaw, ordered head to tail.
- Neutral 2048, minimum 796, maximum 3300 on all joints (±110°; previously 1252–2844, ±70°).
- Pitch ID 1 sign +1; pitch IDs 3/5/7/9/11 sign -1; all yaw signs +1 (IDs 11/12 marked calibrated 10 November 2026).
- Saved speed 2144, tracking error 492 and tracking timeout 0.5 seconds.
- Calibrated flag true since 10 November 2026, when the user marked IDs 11/12 calibrated (it was false from 7 November). It does not certify every amplitude, frequency or assembly.

## Current software and installation state

The maintained 12-joint app lives under `generations/gen3-experimental-3d/`. Its screens, shared pieces and data code use the `pages/`, `components/` and `data/` folders described in [the asset guide](../generations/gen3-experimental-3d/backend/web_dashboard/static/README.md). The refined dashboard is an independent copy. The Raspberry Pi package remains the legacy 10-joint distribution.

The server-side manual-controller input-gap timeout is currently disabled by owner request. LB release, B and Stop still stop motion. Dated references below to a 0.5-second manual timeout describe the earlier behavior.

The shared gait amplitude and signed bias cap is 90 degrees. Joint travel bounds remain approximately ±110 degrees. Current receiver source expects 12 motors and includes watchdog torque-off reporting and pending Stop priority fixes. The OTA-capable pair was installed on 3 November; these later source changes have not been installed or physically verified. COM6 receiver and COM8 transmitter are the last confirmed USB mapping from that installation.

Software audit items 1–20 have been addressed in the working tree. The [current status](CURRENT_STATUS.md) records the changes and verification. The 17 November publication-only export passed 179 maintained Python tests, 175 refined tests, 66 root tests with two skips, and 21 Gen 2 offline tests. All 43 maintained and 41 refined Node scripts passed. Documentation checks covered 164 Markdown files with zero local-link errors, and layout checks covered 1,289 move records and 52 asset paths. These runs used the existing Windows Conda environment; a fresh dependency installation and GitHub CI run remain pending. Those checks do not establish hardware behavior. A Wi-Fi OTA transfer/reboot, diagnostics after the wiring repair, full CAD export and physical fit remain pending.

## Dated work record

The following entries describe what was true at their recorded dates. Older ten-joint counts, provisional calibration flags and trial settings belong to that history. Use the current map summary above when continuing work.

## Dashboard UI refresh (9–10 November 2026, software only)

The Gen 2.1 and Gen 3 dashboards were tidied with a design checklist while keeping every effect: one `tokens.css`, 4 px spacing grid, AA text contrast, busy and accepted/refused cues on buttons, operator-only buttons that flip to "Operator mode required" for viewers (Gen 2.1 buttons are now locked for viewers too), Gait Presets and Runs Journal scrolling three items at a time, and eighteen helper lines hidden in a commented CSS block. Full record: [the UI refresh note](gen3/DASHBOARD_UI_REFRESH.md). No motion was commanded.

## IDs 11 and 12 marked calibrated (10 November 2026)

At the user's instruction `joint_map.json` now saves `calibrated: true` with the existing values for IDs 11 (pitch, -1) and 12 (yaw, +1): zero 2048, limits 796–3300. Hardware runs are no longer refused for an uncalibrated map. The same flag was set in the isolated `gen3-dashboard-refined` copy. The Raspberry Pi copy under `generations/rasp_pi` still has the 10-joint map and was not changed. No motion was commanded by the assistant.

## 12-motor upgrade: IDs 11 and 12 (7 November 2026, software only)

Two servos are being added at the tail: ID 11 pitch (sign -1, provisional) and ID 12 yaw (sign +1, provisional), zero 2048, limits 796–3300. ID 12 is now the driver end. `gait.py` defines `NUM_JOINTS = 12`; backend, PyBullet (13 links), steering, dashboard, tests and the receiver firmware (`NUM_MOTORS 12`) follow it. The CAD web asset was extended with `tools/extend_assembly_12.py` (cloned mid modules) until the SolidWorks assembly is re-exported. `joint_map.json` now saves `calibrated: false` because IDs 11/12 are unmeasured, so hardware runs are refused until the map is confirmed in the dashboard; speed, tracking error and timeout are unchanged. Receiver not reflashed, no motion commanded. Details and the commissioning steps are in [the upgrade note](hardware/12_MOTOR_UPGRADE.md).

## 3D Motions controller steering (4 November 2026, simulation only)

The new Simulation preset 3D Motions lets the controller steer the snake in 3D (details in [the simulation guide](gen3/GEN3_SIMULATION.md#3d-motions-controller-steered)). Left/right sets a desired heading and up/down sets a desired head pitch. Every update closes the loop on the simulated body's heading and head pitch and recomputes all ten servo targets. Turns travel down the body, follow-the-leader style, and a two-joint neck (ID 1, ID 3) raises the head up to 30°. The code is `backend/surge_control/steering.py`, wired through `manual.py` (controller option `steering: '3d'`) and `GaitMotionGenerator`. Browser stick Y (axis 1) is now sent as `stick_y`; only 3D Motions uses it. Tests: `tests/test_steering.py`, including two headless PyBullet runs. Hardware execution with 3D Motions is refused, because the robot has not been trialled and the firmware still clamps to ±70°; Dry run works open loop. No hardware motion was commanded.

## Joint limit widened to ±110° (4 November 2026, software only)

The joint position limit was raised from ±70° (1252–2844 counts) to ±110° (796–3300 counts, 2048 ± 1252) everywhere it is enforced: the Gen 3 map validator and gait checks (`gait.py`; per-joint bias and pose angles ±110°), the backend clamps and feedback checks (`surge_control/gait.py`, `hardware.py`, `runtime.py`), the live-settings bounds in `gen3.py` (yaw/pitch 0–110°, bias ±110°, previously 90°), the PyBullet clamp, the dashboard inputs/sliders/labels, and the Gen 2 / 2.1 firmware sources (`receiver_gen2_1.cpp`, `robot_esp32.cpp`, `robot_esp32_v2.cpp`) plus `robot_config.py`. All ten joints in joint_map.json now save min 796 / max 3300; zero, signs, speed, tracking error and timeout are unchanged. The tracking-error ceiling stays 796 counts (it is not a joint limit).

The current dashboard and API use the gait validator's 90° cap for shared yaw and pitch amplitudes and signed bias. The calibrated joint travel limits are separate.

Not yet done: the receiver/ESP32 firmware has not been reflashed, so installed boards still clamp to ±70°. No motion beyond ±70° has been commanded. The v6 Gen 2 segment was earlier documented as ±80° mechanical and the Gen 3 CAD checklist still says 1252–2844, so confirm physical clearance and raise amplitudes gradually.

## Hardware and radio

3 November 2026 upload: the owner connected both USB boards and confirmed the robot battery disconnected. MAC reads identified COM6 as receiver (28:05:A5:4F:E5:AC) and COM8 as transmitter (68:09:47:5C:10:EC). Both current maintained firmware environments were uploaded successfully with flash hashes verified. Twenty HELLO-only exchanges sent to COM8 returned SURGE,2.1 on both USB ports: ten after upload and ten after a transmitter-only RTS reset. No RUN, position or EEPROM commands were sent. Serial ports were closed afterward. The ignored transmitter socket hint was updated; use COM8 for the dashboard in this USB setup. Upload logs remain in the local scratch record and are excluded from GitHub.

The maintained pair uses channel 1 and the receiver's spoofed logical address 28:05:A5:4E:01:38. Earlier COM7 examples refer to the previous USB setup. Calibration is unchanged. Servo operation and torque-off confirmation were not verified with battery power disconnected, and Wi-Fi OTA transfer/reboot remains untested.

Radio commands are plain text, without authentication, sequence protection or a receiver sender allowlist. Bounds, frame checks, watchdog, Stop, torque checks and EEPROM maintenance lock remain.

The battery is external on long leads; the owner reported replacing it with a 2200 mAh 3S LiPo on 3 November 2026. The last owner report says fuses are not installed. A later large-amplitude trial lost servo replies; a wiring repair was reported, but its logged diagnostic recheck remains pending.

## Software recorded on 3 November 2026

The dashboard has separate Simulation and Hardware workspaces. Gen 3 Hardware initially uses Dry run. The controller requires neutral input and LB + A start with LB held, and expires stale input after 0.5 seconds. Physical route assistance requires verified fresh localization.

Later on 3 November (software only, no hardware motion):
- Saved hand-positioned poses now have Re-calibrate selected preset: capture a replacement with torque off, then explicitly Update selected pose under the same name. Updates compare the previously loaded preset to prevent overwriting concurrent edits. Robot joint calibration is unchanged; built-in shapes remain read-only.
- Hardware bus metrics now refresh automatically every three seconds while its tab is visible, an Operator is logged in, a port is selected, and control/firmware jobs are stopped. This uses the existing torque-off connection and disarmed diagnostics; failed requests back off for 15 seconds. Idle tracking says torque off because no target exists. During motion, latency/rate/tracking use the run's existing telemetry; voltage/temperature/battery remain the last stopped snapshot because installed firmware rejects armed D diagnostics. The battery label now records the owner-reported 2200 mAh 3S LiPo; reserve remains a voltage estimate, not measured capacity. Software verification uses fake hardware; physical automatic refresh remains unverified.
- Hardware Per-Joint Control now captures a hand-positioned static pose through a torque-off connection and saves named poses in runs/pose_presets.json. Capture requires valid feedback from all ten joints within the saved limits; saved poses retain encoder precision and refuse loading against changed calibration. Capture/save/load never starts motion; Move to Pose keeps its existing confirmation and return to neutral. Software tests use fake hardware; powered physical capture remains unverified. See the operating guide's hand-positioned shape section.
- The browser controller always uses the standard Xbox-style layout. The axis and button remapping fields were removed; dead zone, sensitivity and invert remain.
- Simulation has no saved-map limits card. Simulation runs always send the server maximums (speed 3000, tracking error 796, tracking timeout 2 s). Joint position limits still come from the map, and hardware still uses joint_map.json (1500 / 216 / 0.5).
- Simulation gait defaults are yaw 40°, pitch 25°, 0.5 Hz. The old 5°/5°/0.1 Hz default travelled about 6 cm in 20 s in headless PyBullet; the new one travels about 180 cm. Controller simulation runs last up to 300 s; releasing LB still stops them.
- Simulation has 12 gait presets and Hardware Quick Presets has 6 new ones, all scored in PyBullet. Sources and parameter mapping are in [the gait preset research](research/snake-gait-presets.md); presets and measured travel are listed in [the simulation guide](gen3/GEN3_SIMULATION.md#gait-presets). None of the new presets has run on the robot.
- PyBullet shows that lag −72° crawls backward and +72° forward. The two existing hardware caterpillar presets keep their values; only their descriptions were corrected.

OTA is a USB-entered maintenance mode in both maintained firmware targets. Receiver entry requires disarmed state and confirmed torque-off. It blocks control until reboot. Private passwords are in the ignored common/ota_config.h file. The OTA-capable pair is now installed as recorded above; an actual Wi-Fi update transfer remains unverified. Do not bypass the receiver torque-off requirement when unpowered servos cannot acknowledge it.

The planar bench launcher is now generations/gen2-st3215/tools/bench_gen2_1.py with align, sine or spiral as its required mode. Its old three filenames were removed. Do not use this planar tool as a Gen 3 gait.

## Continue from here

Start the dashboard with the surge Python 3.11 environment as shown in [setup](START_HERE.md). Use [the folder guide](REPOSITORY_LAYOUT.md) for verification. Keep credentials, transmitter hints, run logs and calibration intact. No physical motion, firmware upload or credential change was part of this documentation rewrite.

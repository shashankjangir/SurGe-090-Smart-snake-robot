# How the software works

I keep the motion calculation on the host for the maintained Gen 2.1 and Gen 3 workflows. The ESP32 receiver handles the servo bus. That makes it possible to inspect targets, simulate them and record feedback without putting the whole dashboard inside the firmware.

## What runs where

| Layer | Files | What it does |
| --- | --- | --- |
| Web server | generations/gen3-experimental-3d/backend/web_dashboard/web_app.py | Flask pages, sessions, API requests and runtime ownership |
| Browser | The templates and static folders beside web_app.py | Workspace controls, gamepad input, plots and the 3D view |
| Shared host control | generations/gen3-experimental-3d/backend/surge_control/ | Serial transport, planar runtime, Gen 3 jobs, sessions, simulation and controller logic |
| Gen 3 calculation | generations/gen3-experimental-3d/gait.py and test_3d_snake.py | Joint-map validation, wave targets, finite runs and tracking checks |
| Robot receiver | generations/gen2-st3215/firmware/receiver_gen2_1/ | Checks commands and writes the ST3215 bus |
| PC transmitter | generations/gen2-st3215/firmware/transmitter_gen2_1/ | Relays USB commands and ESP-NOW replies |

Python handles the backend and experimental runners. HTML, CSS and JavaScript handle the browser. C++ with the Arduino ESP32 framework handles firmware. PyBullet provides the articulated simulation, and Three.js displays the browser model. The dashboard does not need a JavaScript bundler.

## Following one hardware command

The operator selects Hardware and reviews the waveform and timing. A start request passes through session ownership, map and parameter validation. The host opens the chosen serial port, identifies the receiver with HELLO and requests Stop before operation.

RUN arms the receiver. Position frames contain joint IDs, counts and speed. In Gen 3, axis, sign, neutral position and bounds come from the joint map. Slew limiting prevents a target from jumping faster than the selected envelope. The host checks feedback and stops on missing or sustained tracking faults.

The receiver validates the whole position frame before writing a joint. It clamps targets to its position range and checks bus operations. A missing write acknowledgement can be confirmed only by matching fresh register reads. An explicit servo fault, mismatch or failed read still stops the receiver.

The host eventually requests STOP and closes the connection. Stop disables torque; it is not a request to hold the last pose. Pitch links need support.

## Three different meanings of a preview

A mathematical dry run calculates targets without opening hardware. PyBullet runs a physical model with contacts and simulated joint feedback. A physical trial reads the real encoders and uses the real servo bus.

Gen 3 now has separate Simulation and Hardware workspaces. Hardware starts with Dry run selected. Simulation owns its physics controls and route. Settings are copied explicitly; copying a waveform does not silently replace the hardware speed, ramp or duration.

## Operator and controller ownership

The session code allows the configured names Shashank, Bhavesh and Mahima. One operator owns the active lease. Viewer access includes observation and public Stop. The browser renews the lease every second; the configured timeout is three seconds.

The current implementation compares the configured shared password using hmac.compare_digest. The older report's PBKDF2 claim does not describe this code. This is a local development application, not an internet deployment.

Gamepad input has a separate 0.5-second freshness timeout. LB must remain held after starting with A. Focus loss, a hidden page, disabling input or loss of ownership ends controller motion. Feedback can reduce the gait rate, but cannot raise the map limits.

Navigation on the physical robot requires an explicitly verified, fresh external localization feed. Servo angles do not provide world position. The simulator supplies its own pose. See the [controller guide](operations/CONTROLLER_UPGRADES.md).

## Firmware and radio

The maintained pair uses plain-text ESP-NOW on channel 1. The receiver has a 750 ms position-target watchdog, prioritizes Stop and requests Stop on queue overflow. The transmitter bounds serial lines, filters replies and reports delivery/queue faults.

This radio path has no command authentication, encryption or sequence-based replay protection. A nearby sender can send known receiver commands. The USB-only OTA entry and upload password do not secure the normal command radio.

OTA mode creates a password-protected access point only after local USB entry. The receiver must be disarmed and confirm torque-off. In OTA mode it stops dispatching control commands until reboot, including after a failed upload. See [OTA operation](operations/FIRMWARE_OTA.md).

## Records and extensions

Gen 3 runs, snapshots and calibration backups stay in its runs folder. CSV feedback describes joint tracking. It is not a physical distance measurement. The battery indicator is an estimate from sampled valid diagnostic voltage, not a calibrated state-of-charge instrument.

The old Gen 2 onboard firmware, optional sensor node, Gen 1 tools and research experiments remain in the repository. Their presence does not make them part of the current host-command setup. I use the [folder guide](REPOSITORY_LAYOUT.md) to select the right entry point.

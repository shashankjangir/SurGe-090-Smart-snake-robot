# How I built SURGE-090

I am Shashank Jangir. This is how I explain our project as it stands on 3 November 2026. I use "I" for the design I am explaining and "we" for the work recorded across the project. Bhavesh and Mahima are also named operators in the software.

## What I am trying to make

I want a chain of joints to move as one body. Turning a servo is only the first step. Useful movement also depends on ground contact, the travelling wave, electrical power and wiring that survives repeated bending.

The current experiment uses ten ST3215 servos. In Gen 3, alternate joints bend vertically and horizontally. That gives us pitch waves, yaw waves and combinations of the two. My immediate goal is repeatable, measured movement. A video of moving joints is not enough to establish that.

## Why the repository has three generations

| Generation | What we built or investigated |
| --- | --- |
| Gen 1 | A Dynamixel XL330 prototype with the earlier Pi/U2D2 setup. |
| Gen 2 and 2.1 | A ten-joint planar ST3215 chain, servo-bus tools and host controls. |
| Gen 3 | An alternating pitch/yaw ST3215 body, mapped calibration and 3D simulation. |

Gen 2.0 calculates its gait onboard in the robot firmware. Gen 2.1 calculates targets on the host and sends them to the receiver. Gen 3 uses that maintained text transport with its own motion runner and joint map. I keep these systems separate because their actuator protocols and mechanical assumptions differ.

## How the body is made

The CAD folders contain the development of the planar segments, motor holders, plates and alternating-axis connectors. The current simulation uses the V2 neutral assembly: a head, nine middle sections, a tail and ten motor joints. Every servo is at encoder count 2048 in the neutral pose.

Native SolidWorks files and STEP exports stay with the relevant generation. We derive meshes for the browser and articulated bodies for PyBullet. Opening the assembly in CAD does not prove that a printed part can carry the robot. The prototype filenames explicitly retain the fit-and-load-validation warning.

The central battery section was removed from the recorded physical setup. The battery is external on long leads. Its drag and position affect the real robot, so we need to account for them when comparing trials with simulation.

## How I send a joint target

```mermaid
flowchart LR
    Browser[Browser dashboard] --> Host[Python control runtime]
    Host -->|USB 115200 baud| TX[PC transmitter ESP32]
    TX -->|ESP-NOW channel 1| RX[Robot receiver ESP32]
    RX -->|UART 1 Mbps| Motors[Ten ST3215 servos]
    Motors --> RX
    RX --> TX
    TX --> Host
```

The host sends a motor ID, encoder position and speed. The receiver checks the frame, applies bounds and reports faults. Feedback tells us whether a joint follows its target; it does not tell us where the whole robot is on the floor.

We adapted the plain-text ESP-NOW transport from Bhavesh's Snake_SURGE repository and kept our maintained command handlers. Our receiver adds arming, torque-off Stop, bounds, a target watchdog, maintenance protection and write/read-back checks. The command radio remains plain text without command authentication.

## What we changed in the software

We moved source and CAD into generation folders, consolidated dashboard assets and made one maintained backend serve Gen 2.1 and Gen 3. We added finite trials, calibration, tracking faults, pose tools, per-joint settings and run records.

The dashboard now separates Simulation and Hardware. Gen 3 Hardware starts with Dry run selected. Simulation has its own PyBullet model, route and controller. Copying waveform settings between workspaces is explicit and does not copy the measured hardware speed.

We added hold-to-run gamepad control, slowing when tracking error rises, localization-gated route assistance and OTA maintenance mode. The three Gen 2.1 bench launchers are now one command with an align, sine or spiral argument.

## What the results show

The physical record includes centering and pitch-only trials at 2, 5 and 10 degrees. A 10-degree trial used an eight-second ramp. Later, a 30-degree yaw / 25-degree pitch trial at 0.5 Hz and speed 1500 produced a write fault and missing responses from IDs 7 and 8. A wiring repair was reported afterward. A corresponding logged diagnostic recheck and repeated trial remain outstanding in the handoff.

Software checks cover parts of the browser, simulation, firmware and control logic. They do not measure traction, validate printed parts or establish wireless stop latency on the assembled robot.

My next physical steps are to confirm all ten motors again, record voltage under load and measure travel during small, repeatable trials. [Current status](CURRENT_STATUS.md) separates these pending steps from completed software work.

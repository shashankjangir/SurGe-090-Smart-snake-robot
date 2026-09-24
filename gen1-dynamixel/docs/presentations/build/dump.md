<!-- Slide number: 1 -->

![](Picture8.jpg)
INSTITUTION

GROUP CODE · SURGE 090
Indian Institute of Technology, Delhi
PROJECT GUIDE
Progress Review (Design & Development)
Professor Amartansh Dubey
Smart Snake Robot
with Dynamixel Smart Servo Motors

![preencoded.png](Image0.jpg)

Shashank Jangir
Bhavesh Bansiwal
Mahima Chotiya

ENTRY NO.
ENTRY NO.
ENTRY NO.
2024EE11048
2024ME10487
2024ME11187
PROJECT REPOSITORY
https://github.com/shashankjangir/SurGe-090-Smart-snake-robot

### Notes:
Title slide for the 25% progress review of the Smart Snake Robot project, Group SURGE 090. Introduce the team and milestone scope.

<!-- Slide number: 2 -->
ACTUATOR SELECTION STUDY
Why Dynamixel Motors?
OPTIONS COMPARED

| Criterion | Conventional Servo | Dynamixel Smart Servo |
| --- | --- | --- |
| Communication | Individual signal wire per motor | Daisy-chain communication |
| Wiring Complexity | High | Low |
| Feedback | Not available | Position, load, temperature, voltage feedback |
| Controller | External controller required | Built-in controller |
| Scalability | Difficult for many joints | Designed for multi-joint robots |
| Precision | Moderate | High |
| Robotics Applications | Hobby projects | Research and industrial robotics |
THE REQUIREMENT
A snake robot drives many joints at once. The actuator must deliver:
Precise position control
Simple wiring architecture
Scalability for multiple joints
Reliable communication
Real-time feedback
Compact size & sufficient torque

![](Picture10.jpg)

![](Picture8.jpg)

<!-- Slide number: 3 -->
ARCHITECTURE & DECISION
Daisy-Chain Architecture & Final Selection

Conventional Servo — Separate Wiring

Dynamixel — Daisy-Chain

Servo 1

Controller
Servo 2

Ctrl
M1
M2
M3
M4

Servo 3

Servo 4

Every motor needs its own signal wire back to the controller.
One cable carries power and data to every joint in sequence.

KEY LEARNINGS
FINAL SELECTED ACTUATOR
Dynamixel XL330 Series
Daisy-chain wiring sharply cuts cabling and assembly effort.
A controller built into every motor simplifies integration.
Real-time feedback enables future closed-loop control.
Compact form factor suits modular robot segments.
High precision and smart control fit advanced robotics.
Chosen for its smart serial communication, full-state feedback, compact form factor and effortless multi-joint scaling — the right fit for a multi-segment snake robot.

<!-- Slide number: 4 -->
GOALS & EXPECTED OUTCOMES
What This Project Sets Out to Build

01
02
03

![preencoded.png](Image0.jpg)

![preencoded.png](Image1.jpg)

![preencoded.png](Image2.jpg)
Modular Architecture
Dynamixel Actuators
Raspberry Pi Control
A repeatable segment-based mechanical design.
Integrate smart servos with daisy-chained control.
A single-board-computer control system.

04
05
06

![preencoded.png](Image3.jpg)

![preencoded.png](Image4.jpg)

![preencoded.png](Image5.jpg)
Locomotion Algorithms
Sensor Integration
Scalable Platform
Implement serpentine and gait-based motion.
Add sensing for future intelligent navigation.
Keep it maintainable and easy to extend.

### Notes:
Six concrete goals across mechanics, actuation, computing, control, sensing and scalability. These map to the timeline phases.

<!-- Slide number: 5 -->
WORK COMPLETED SO FAR
Quarter-One Progress Summary

COMPLETED TASKS
OVERALL COMPLETION(till now)

Literature review & project understanding

Raspberry Pi setup & configuration
25 %

![preencoded.png](Image0.jpg)

![preencoded.png](Image5.jpg)

Hardware selection & BOM preparation

Wi-Fi connectivity testing on the Pi

![preencoded.png](Image1.jpg)

![preencoded.png](Image6.jpg)

CAD design of snake-robot segment

Basic Raspberry Pi lab projects executed

![preencoded.png](Image2.jpg)

![preencoded.png](Image7.jpg)
Phase 1 complete · Phase 2 underway

Assembly sized to Dynamixel XL330 dims

GitHub repository created & maintained

10
2
1

![preencoded.png](Image3.jpg)

![preencoded.png](Image8.jpg)
Tasks done
Segments printed
Pi configured

3D printing of two prototype segments

Procurement process initiated

![preencoded.png](Image4.jpg)

![preencoded.png](Image9.jpg)

### Notes:
About a quarter done: ten tasks closed across research, mechanical design, fabrication and the compute platform.

<!-- Slide number: 6 -->
SYSTEM ARCHITECTURE

Conceptual Block Diagram
Architecture finalized    ·    Implementation in progress
FUTURE INTEGRATION

Power Supply

IMU / Force Sensors

Camera Module

Raspberry Pi 5  [Central Controller]

Control Algorithms

Wireless Control Module

Communication Layer  (U2D2 / UART)

Dynamixel Motor Network

Robot Segments  (10 × servo joints)
LEGEND
Implemented

In Progress

Planned Future Work

Current Implementation Status
Raspberry Pi 5 configured and tested
Mechanical segments fabricated

Communication architecture defined
Dynamixel integration pending hardware

### Notes:
Controller at the centre. Solid cyan = implemented/in progress; dashed amber (sensors, camera) = designed-in but scheduled for a later phase.

<!-- Slide number: 7 -->

![preencoded.png](Image4.jpg)
ASSEMBLY FLOW
③ Full Assembly
Motor → Segment Parts → Full Chain Assembly
CAD DESIGN DEVELOPMENT
A Segment Designed Around the Motor
The CAD model is built to the exact dimensions of the Dynamixel XL330-M288 servo, using a modular, segment-based architecture focused on manufacturability and scalability.

![](Picture8.jpg)

![The image depicts a simple, sturdy, black, rectangular wooden shelving unit with a rectangular shelf in the middle. AI-generated content may be incorrect.](Picture33.jpg)

![The image depicts a simple, grey, rectangular, flat-sided, metallic-looking panel or bracket, likely with some sort of mechanical attachment or mounting hardware visible, placed on a plain, light-colored background. AI-generated content may be incorrect.](Picture35.jpg)

DESIGN CONSIDERATIONS

![The image depicts a gray, rectangular frame with an open, hinged structure, likely part of a larger assembly.](Picture43.jpg)

Motor mounting  — Precise seats for XL330 servo bodies.

![preencoded.png](Image0.jpg)

![The image depicts a simple, abstract representation of a zigzag pattern or a wave-like structure, rendered in a monochromatic, minimalistic style. AI-generated content may be incorrect.](Picture41.jpg)

Structural rigidity  — Stiff frame to resist motion loads.

![preencoded.png](Image1.jpg)

Cable routing  — Clean daisy-chain channels for wiring.

![preencoded.png](Image2.jpg)

Electronics ready  — Space reserved for future boards.

![preencoded.png](Image3.jpg)

① Motor
② Segment Parts
③ Full Assembly

### Notes:
CAD modelled to real XL330 dimensions so printed parts mate with the actual servos. Replace the placeholder with CAD screenshots.

<!-- Slide number: 8 -->
PROTOTYPE FABRICATION
From Model to Printed Hardware

FABRICATION STATUS

![The image shows a white, rectangular piece of furniture, possibly a desk or shelf, resting on a patterned carpet with a few scattered fabric scraps nearby.](Picture4.jpg)

![preencoded.png](Image0.jpg)
Two prototype segments 3D printed
DONE

![preencoded.png](Image2.jpg)
Both segments produced from the CAD model.
PRINTED SEGMENT — PHOTO 1

Initial dimensional verification done
DONE
Insert photo of the first 3D-printed segment

![preencoded.png](Image3.jpg)
Printed parts measured against design specs.

![The image shows a white, rectangular plastic structure lying flat on a patterned carpeted floor. AI-generated content may be incorrect.](Picture6.jpg)

Physical validation of CAD initiated
NEXT

![preencoded.png](Image4.jpg)
Checking fit, tolerances and assembly.

![preencoded.png](Image1.jpg)

Preparing for motor-integration tests
NEXT

PRINTED SEGMENT — PHOTO 2

![preencoded.png](Image5.jpg)
Next: seat XL330 servos into segments.
Insert photo of the second segment / assembly

### Notes:
Two segments printed and measured, validating the CAD. Next step is servo integration. Drop prototype photos on the left.

<!-- Slide number: 9 -->
RASPBERRY PI LEARNING & DEVELOPMENT

Standing Up the Compute Platform
Development Environment Setup

PROGRESS MILESTONES

![The image shows a schematic diagram of the Raspberry Pi GPIO pinout, detailing the connections between various pins and components such as power, ground, and communication interfaces. AI-generated content may be incorrect.](Picture45.jpg)

![The image shows a schematic diagram of the Raspberry Pi GPIO pinout, detailing the connections between various pins and components such as power, ground, and communication interfaces. AI-generated content may be incorrect.](Picture8.jpg)
Raspberry Pi 5 received & configured

![preencoded.png](Image1.jpg)

![preencoded.png](Image0.jpg)

Raspberry Pi OS installation completed

![preencoded.png](Image3.jpg)

![preencoded.png](Image2.jpg)

Raspberry Pi OS Desktop
GPIO / Python Testing
Wi-Fi connectivity established

![preencoded.png](Image5.jpg)

![preencoded.png](Image4.jpg)

![The image shows a Windows command prompt window, with a user logged into a remote Linux system via SSH, navigating through directories and listing files on a desktop. AI-generated content may be incorrect.](Picture4.jpg)

![The image shows a purple rectangular device, presumably a Raspberry Pi E, with four black USB ports, placed on a wooden surface.](Picture6.jpg)

SSH & remote access explored

![preencoded.png](Image7.jpg)

![preencoded.png](Image6.jpg)

Basic GPIO & intro projects performed

![preencoded.png](Image9.jpg)

![preencoded.png](Image8.jpg)
SSH Remote Access
System Configuration

Raspberry Pi Platform Successfully Configured and Tested

Linux environment & Python familiarity

![preencoded.png](Image11.jpg)

![preencoded.png](Image10.jpg)

### Notes:
Control computer is live: OS installed, networked, remotely accessible, exercised with intro GPIO and Python. De-risks software before motors arrive.

<!-- Slide number: 10 -->

HARDWARE PROCUREMENT & RESOURCE AVAILABILITY
Hardware Procurement & Resource Availability

Hardware Strategy: Raspberry Pi 4 was planned in the BOM; however, a Raspberry Pi 5 was already available in the laboratory, enabling immediate software development and testing without waiting for delivery. To accelerate development, the team utilised the laboratory Raspberry Pi 5 platform while the ordered components remain under procurement.

AVAILABLE & IN USE
ORDERED — AWAITING DELIVERY
COMPLETED PREPARATORY WORK

Raspberry Pi 5 (Laboratory Resource)
Raspberry Pi Starter Kit
Raspberry Pi OS Environment
GitHub Repository
3D Printed Prototype Segments
Dynamixel XL330 Smart Servo Motors
U2D2 Communication Interface
U2D2 Power Hub Board
Dynamixel Communication Cables
5V Power Supply
ESP32 Development Board
Hardware selection finalised
Bill of Materials prepared
CAD model completed
Segment fabrication initiated
Software environment configured
DEVELOPMENT PROGRESS

✓

✓

✓

✓

✓

⏳

→

Component
Selection
Procurement
Initiated
CAD
Design
Prototype
Printing
RPi
Learning
Motor
Integration
Locomotion
Testing
Awaiting HW
Upcoming

★
Key Achievement: Although the primary Dynamixel hardware has not yet arrived, the team has successfully utilised available laboratory resources to complete design, fabrication, documentation, and software preparation activities, ensuring project progress is maintained.

### Notes:
Live BOM from the purchasing sheet. Compute hardware in hand; actuation and power chain ordered. Total approx Rs 33,760.

<!-- Slide number: 11 -->

REPOSITORY & DOCUMENTATION
Version Control From Day One

GITHUB REPOSITORY SCREENSHOTS

![Locomotion set too 2D forward sine curve movement. AI-generated content may be incorrect.](Picture8.jpg)
Repository created
Central home for the whole project.

1

Version control established
Tracked, reversible change history.

2

CAD files uploaded
Design source committed to the repo.

3

GitHub repository — project root & structure

![The image shows a collection of text documents and files related to Raspberry Pi setup and testing, including installation guides, hardware documentation, and various scripts and manuals. AI-generated content may be incorrect.](Picture6.jpg)

Design iterations documented
Every revision captured in commits.

![step AI-generated content may be incorrect.](Picture4.jpg)

4

Progress tracking in place
Milestones and issues logged.

5
Commit history — tracked iterations & uploads

Team collaboration workflow
Shared branches and pull requests.

6
✓ All milestones tracked in GitHub

### Notes:
The repo is the single source of truth — CAD, docs, tracked iterations — with a collaboration workflow already running.

<!-- Slide number: 12 -->
PROJECT TIMELINE
Eight Phases · Currently at 25%

PHASE 1
PHASE 3
PHASE 5
PHASE 7
Research & Design
Mechanical Assembly
Control Algorithms
Testing & Optimisation
Completed
Up next

1

2

3

4

5

6

7

8

PHASE 2
PHASE 4
PHASE 6
PHASE 8
Hardware Procurement
Motor Integration
Sensor Integration
Final Demonstration
In progress

WE ARE HERE

### Notes:
Eight-phase plan: Phase 1 complete, Phase 2 active, Phase 3 next — about 25%. Phases 4-8 cover integration, control, sensing, testing, demo.

<!-- Slide number: 13 -->
CURRENT ACHIEVEMENTS
Concrete Wins in Quarter One

![preencoded.png](Image1.jpg)

![preencoded.png](Image3.jpg)

![preencoded.png](Image5.jpg)

![preencoded.png](Image0.jpg)

![preencoded.png](Image2.jpg)

![preencoded.png](Image4.jpg)
Architecture finalized
CAD design completed
Prototype fabrication started
System block diagram locked.
Segment modelled to motor specs.
Two segments printed & checked.

![preencoded.png](Image7.jpg)

![preencoded.png](Image9.jpg)

![preencoded.png](Image11.jpg)

![preencoded.png](Image6.jpg)

![preencoded.png](Image8.jpg)

![preencoded.png](Image10.jpg)
Pi environment established
GitHub workflow operational
Procurement initiated
OS, network and tooling ready.
Version control and docs live.
Core compute received; rest ordered.

### Notes:
Six headline achievements: design, fabrication, compute, tooling and procurement all moving — a working foundation.

<!-- Slide number: 14 -->

SIMULATION & VALIDATION

Simulation-Based Validation of Control Architecture

![](Picture1.jpg)
SIMULATION OBJECTIVE
A virtual testing platform to validate the control architecture before Dynamixel actuators and communication hardware arrive — enabling software development, algorithm verification, and sensor integration in parallel with procurement.
COMPONENTS SIMULATED

![Controller](Graphic14.jpg)

![Sensors](Graphic15.jpg)

![Display](Graphic16.jpg)

![Actuators](Graphic17.jpg)
Controller
Sensors
Display
Actuators
ESP32 · 5-Servo joint network · MPU6050 IMU · HC-SR04 ultrasonic · SSD1306 OLED · control & communication framework
FUNCTIONAL VALIDATION COMPLETED
Multi-joint servo coordination
Travelling-wave serpentine gait generation
Obstacle detection via ultrasonic sensing
IMU integration for orientation feedback
OLED-based system status monitoring
Sensor–controller–actuator communication
ENGINEERING BENEFITS
Reduced dependence on hardware delivery timelines
Enabled early software debugging & control-architecture verification
Established migration path to Raspberry Pi 5 + Dynamixel XL330, reducing integration risk
Wokwi-based simulation environment developed to validate locomotion control, sensor integration, and communication architecture before physical Dynamixel hardware arrival.
KEY OUTCOME  A complete software-validation framework was developed, allowing locomotion, sensing, and control workflows to be tested before physical robot assembly.

<!-- Slide number: 15 -->

FUTURE WORK & DEVELOPMENT ROADMAP

Planned Activities for the Next Development Phase

Hardware Arrival

Mechanical Assembly

Communication Setup

Locomotion Development

Sensor Integration

Testing & Optimization

1

2

3

4

5

6

![Hardware arrival](Graphic247.jpg)

![Mechanical assembly](Graphic248.jpg)

![Communication setup](Graphic249.jpg)

![Locomotion development](Graphic250.jpg)

![Sensor integration](Graphic251.jpg)

![Testing and optimization](Graphic252.jpg)
Receive Dynamixel XL330 motors
Receive U2D2 interface
Verify purchased components
Assemble complete snake body
Install Dynamixel actuators
Route communication cables
Configure motor IDs
Establish serial communication
Validate daisy-chain architecture
Port simulation code to Pi 5
Implement serpentine locomotion
Synchronize multi-joint movement
Integrate MPU6050 IMU
Integrate obstacle detection
Implement feedback control
Motion performance testing
Power & reliability analysis
System optimization
Completed phase
Ongoing work
Future milestone

EXPECTED DELIVERABLES
TARGET FOR NEXT REVIEW
Fully assembled snake robot
Dynamixel-based locomotion
Sensor-assisted navigation
Integrated Raspberry Pi 5 control system
Demonstration-ready prototype
Final SURGE project showcase
Complete hardware integration
Demonstrate basic snake locomotion
Validate communication architecture
Validate sensing framework

Goal: ~60–70% project completion

<!-- Slide number: 16 -->

![](Picture8.jpg)

WHAT CHANGED SINCE THIS REVIEW
Generation 2 — Corrections & Cause
Slides 1–15 are unchanged from the 25% review. This slide records what has since been superseded.
| SLIDE | THAT DECK SAID | TODAY | WHY |
| --- | --- | --- | --- |
| 10 | XL330 · U2D2 · Power Hub — “ORDERED, AWAITING DELIVERY” | Order cancelled. 10× ST3215 + Waveshare ESP32 driver in hand | Part unobtainable in India |
| 12 | “Eight Phases · Currently at 25%” | Phase 3 — Fabrication & Assembly | Eight weeks of Gen 2 work since |
| 13 | “Prototype fabrication started” | Gen 1 segments printed; Gen 2 v6 not yet printed | Design of record changed |
| 15 | Roadmap step 1 — “Receive Dynamixel XL330 motors” | Superseded — see slide 29 | Different motors received |

Constraint
Six-week stall
Re-architecture

WHAT HAPPENED
IMPACT
COMMIT a32b675 · 2026-08-20
2 of 10 XL330 received, then the part vanished
Control stack written against absent hardware
“No dynamixel in the market. So switched to Servos”
WHAT IT BOUGHT   5.7× joint torque (0.52 → 2.94 N·m)  ·  a 12 V rail  ·  sourceable in India  —  consequences of the switch, not its reason. Torque budget: slide 23.

### Notes:
Open by saying the deck up to this point is unchanged from the 25 percent review and is being left that way deliberately - those slides are a record of what we believed then, not a claim about now. Then walk the register top to bottom. It takes about forty seconds and it pre-empts every 'but slide 10 says' interruption in the second half. Say the honest version of the pivot out loud: this was a procurement failure, not an engineering preference, and a re-architecture under a supply constraint is a legitimate result. The follow-up question a reviewer asks is 'where is your torque budget' - it is slide 23, and it did not exist at the 25 percent review.

<!-- Slide number: 17 -->
ACTUATOR RE-SELECTION
From XL330 to Waveshare ST3215
XL330 VS ST3215 — AS SELECTED

| Criterion | Dynamixel XL330 (Gen 1) | Waveshare ST3215 (Gen 2) |
| --- | --- | --- |
| Stall torque | 0.52 N·m | 2.94 N·m — 5.7× higher |
| Voltage rail | 5 V | 6.0–12.6 V |
| Stall current | 0.35 A | 2.7 A @ 12 V |
| Encoder | 12-bit absolute | 12-bit absolute, 0–4095 |
| Bus protocol | Dynamixel 2.0, 1 Mbps | Feetech STS, 1 Mbps half-duplex |
| Driver hardware | U2D2 + Power Hub + MCU | Waveshare driver, ESP32 onboard |
| Availability in India | Unobtainable | In stock — 10 units held |
THE CONSTRAINT
The Gen 1 trade study was sound and its conclusion still holds: a snake robot needs smart serial bus servos. Only the vendor changed. XL330 became unobtainable in the Indian market after 2 of 10 units were received.
Precise absolute position control
Single-cable daisy-chain wiring
Per-joint load and current feedback
Built-in controller, no external driver per joint
Scalable to 10 coordinated joints
Procurable in India, in quantity

![](Picture10.jpg)

![](Picture8.jpg)

### Notes:
The Gen 1 trade study is not invalidated - its conclusion was smart bus servos, and that is what we still run. Only the vendor changed, and it changed for supply reasons, not engineering ones. The torque column is the favourable consequence: 5.7x more joint torque at the same joint count. The voltage change from 5 V to 12 V is what forced the power architecture rework on slide 24.

<!-- Slide number: 18 -->
GEN 1 → GEN 2 ARCHITECTURE

From Tethered Pi Control to Onboard ESP32
Control moved onto the robot    ·    Pi 5 relegated to base station    ·    Link is now wireless
OFF-ROBOT & PLANNED

3S LiPo 1800 mAh   (11.1 – 12.6 V)

MPU6050 IMU  (I²C 21 / 22)

ESP32 Camera  (planned)

Waveshare Driver + ESP32   [Robot Master]

Gait CPG runs onboard

ESP-NOW → ESP32 #2 → Pi 5

Feetech STS Bus   (1 Mbps, half-duplex)

10 × Waveshare ST3215 Servos

Robot Segments   (10 × servo joints)
LEGEND
Implemented

In Progress

Planned Future Work

Generation 2 Implementation Status
All firmware targets written and building
v6 segments not yet printed

Servo IDs not yet assigned — all ship as ID 1
ESP-NOW link not yet exercised on hardware

### Notes:
The single most important change is where control lives. In Generation 1 the Raspberry Pi was the controller and sat on the robot, tethered over USB to a U2D2. In Generation 2 the ESP32 on the Waveshare driver is the master, the Pi 5 moved off the robot entirely, and the link between them is ESP-NOW rather than a cable. That is what makes untethered operation possible. Compare this against the Generation 1 block diagram on slide 6 - the shape of the system is genuinely different, not just re-labelled.

<!-- Slide number: 19 -->

ONBOARD FIRMWARE STACK
ESP32 Firmware — Four Targets, One Bus

Firmware Strategy: the Waveshare driver's onboard ESP32 is the robot master and owns the servo bus; a second ESP32 at the base station receives telemetry over ESP-NOW and forwards it to the Pi 5 by USB serial. Bench and field firmware are mutually exclusive on the driver board — one is flashed at a time.

ROBOT ESP32 — FIELD
BASE STATION ESP32 #2
BENCH & BRING-UP TOOLS

robot_esp32 — gait CPG, 10-DOF
MPU6050 on I2C GPIO 21 / 22
Current-stall obstacle FSM
ESP-NOW telemetry transmit
base_esp32 — ESP-NOW receive
USB serial to Pi 5 @ 115200
base_station.py logs telemetry
spin_all — broadcast smoke test
assign_ids — one servo at a time
usb_servo_bridge — Python stack
PlatformIO, one env per sketch
FIRMWARE BRING-UP SEQUENCE

✓

✓

✓

⏳

→

→

→

Firmware
written
PlatformIO
builds
Broadcast
smoke test
ID
assignment
Bus
verification
Gait on
hardware
ESP-NOW
telemetry
Upcoming
Upcoming

★
Key Achievement: all five firmware targets are written and compile clean under PlatformIO, and the broadcast smoke test drives all ten servos before any ID has been assigned — so the control stack was validated without waiting on bring-up.

### Notes:
Three ESP32s in total, two on the robot and one at the base. The important design point is that video and telemetry are separate radio links: ESP-NOW carries telemetry, ordinary WiFi will carry camera video. Do not try to push video through ESP-NOW - the payload cap is 250 bytes. The bring-up rail is honest: we are at ID assignment, not past it.

<!-- Slide number: 20 -->
BUS PROTOCOL
Feetech STS Control Table & Packet Format
CONTROL TABLE — IMPLEMENTED

| Register | Addr | Width and meaning |
| --- | --- | --- |
| ID | 5 | 1 byte, EEPROM — factory default 1 |
| TORQUE\_ENABLE | 40 | 1 byte 0 = off, 1 = on |
| GOAL\_POSITION | 42 | 2 bytes, little-endian, 0–4095 |
| GOAL\_SPEED | 46 | 2 bytes, steps per second |
| LOCK | 55 | 1 byte, EEPROM write gate |
| PRESENT\_POSITION | 56 | 2 bytes, centre = 2048 |
| PRESENT\_CURRENT | 69 | 2 bytes, bit15 = sign, 6.5 mA/count |
PACKET FORMAT
All ten servos share one half-duplex TTL line at 1 Mbps. Every packet is addressed to a single ID, or to broadcast ID 0xFE, which every servo acts on and none replies to — the only safe way to drive the bus before IDs are assigned.
Header  0xFF 0xFF
ID  1–253, or 0xFE broadcast
Length  parameters + 2
Instruction  0x03 = WRITE, 0x02 = READ
Parameters  address, then data bytes
Checksum  bitwise NOT of the byte sum
Multi-byte fields are little-endian

![](Picture10.jpg)

![](Picture8.jpg)

### Notes:
This is the whole interface. Two register facts matter downstream: GOAL_POSITION is little-endian and 0-4095 with centre 2048, which is a 4x scale difference from the SC-series servos the Waveshare board ships configured for; and PRESENT_CURRENT at address 69 is how we detect a stall, at 6.5 mA per count with the sign in bit 15. The 1200 mA threshold in robot_config.py is still a placeholder and needs calibrating against a real stall.

<!-- Slide number: 21 -->

CAD EVOLUTION
Segment Design v4 → v5 → v6

Design Strategy: the segment is a parametric CadQuery model, not a hand-drawn solid, so every dimension traces to a named constant and the model refuses to export if its own assumptions stop holding. v6 is the design of record; its three fixes were found by measuring the earlier versions rather than looking at them.

V4 — BASELINE
V5 — SUPERSEDED
V6 — DESIGN OF RECORD

First parametric segment
58 mm joint-to-joint pitch
Ground contact never measured
Superseded, still printable
Widened yoke rectangle
Early sidewall bug fixed
Shares v4's bounding box
Dimensional error — do not print
Belly scales now touch ground
Scales reoriented for undulation
Positive M2 motor retention
Self-check asserts all three
FABRICATION PIPELINE

✓

✓

⏳

→

→

→

→

Parametric
model
Self-check
passes
Probe
ST3215 STEP
Print one
segment
Measure
friction
Print
remaining 10
Chain
assembly
Upcoming
Upcoming

★
Key Achievement: v6 caught three defects that v4 and v5 shared — the bottom plate sat 0.45 mm below the belly scales so 94% of ground contact was the one surface never meant to touch; the scales resisted the wrong axis for lateral undulation; and the motor had no positive retention at all.

### Notes:
The headline is that these defects were found by measurement, not by inspection - the model enumerates every face at minimum z and asserts which ones they are. Print v6, not v4 and definitely not v5. The friction measurement in step 5 is the real unknown: every locomotion claim in this deck assumes anisotropic belly friction that has never been measured on a printed part.

<!-- Slide number: 22 -->
STRUCTURE & LOAD PATH
v6 Load Path & Positive Motor Retention

v4 / v5 — Motor Lifts Straight Out

v6 — Captured in a Closed Cradle

Slip-fit 0.4 mm

Horn
Open at top

Horn
M2
M2
M2
M2

Lightening windows

~1 mm rear wall

The motor sits in an open pocket with no fastener. Nothing resists it lifting out.
Four M2 screws capture the motor against a closed cradle wall.

LOAD PATH
RETENTION — RESOLVED IN V6
Four M2 screws through a closed cradle
Horn face transfers joint torque to the next segment
F623ZZ flange bearing on the horn-opposite side
Bearing carries radial load off the motor shaft
14 mm bolt circle, 4 × M2 blind holes each face
Closed cradle wall reacts motor reaction torque
v4 and v5 relied on an interference fit alone. Under repeated gait loading that is a slow failure: the pocket wears, the motor rocks, and joint backlash grows. v6 adds positive fastening and restores the sidewall the lightening windows removed.

### Notes:
The load path point is that the motor shaft should not be carrying radial load - the F623ZZ bearing on the opposite face does that, and the horn only transfers torque. The retention fix matters more than it sounds: an interference fit that loosens turns into joint backlash, and backlash in a 10-joint chain compounds into a gait that will not track. This was found by measuring the pocket, not by looking at it.

<!-- Slide number: 23 -->
FRICTION, KEELS & TORQUE
Why v6 Can Actually Move — Friction & Torque Budget

v4 / v5 — Scales Never Touched Ground

v6 — Keels Carry the Robot

Plate at −3.45 mm

Belly
Scales at −3.00 mm

Belly
Grip
Slide
Grip
Slide

Plate 1006 mm²

Scales 66 mm²

The plate hung 0.45 mm below the scales — 94% of ground contact was the one surface never meant to touch.
Scales swept along the body: grip across it, slide along it — the asymmetry lateral undulation requires.

TORQUE BUDGET
THE REMAINING UNKNOWN
Anisotropic friction ratio is unmeasured
ST3215 stall torque 2.94 N·m at 12 V
XL330 was 0.52 N·m — 5.7× less
10 joints, 58 mm pitch, ~580 mm body
Head pod adds ≈ 0.02 N·m — under 1% of budget
Torque is no longer the binding constraint
Every locomotion claim in this deck assumes the belly grips across the body and slides along it. That ratio has never been measured on a printed part. Printing one v6 segment and measuring fore/aft versus lateral friction is the single highest-value next experiment.

### Notes:
Two halves. The torque half is settled - 5.7 times more joint torque than Generation 1, and the head pod barely registers against it, so torque stopped being the limiting factor the moment we switched actuators. The friction half is not settled and I want to be explicit about that. A snake robot moves by having different friction across the body than along it. v4 and v5 got that backwards and also never touched the ground with the feature that was supposed to do it. v6 fixes both in CAD, but nobody has put a printed segment on a surface and measured the ratio. Until that happens, the gait is theory.

<!-- Slide number: 24 -->
ELECTRICAL & POWER ARCHITECTURE

Field and Bench Power Paths
Robot rail resolved    ·    No DC conversion needed    ·    Protection hardware outstanding
BENCH PATH (TETHERED)

3S LiPo 1800 mAh   —   20.0 Wh

Mean Well LRS-100-5  (5 V, 20 A)

12 V 2 A supply  —  ID assignment

Inline fuse  +  XT60 loop key   [NOT YET HELD]

≈ 22 min at 4 A

XL6009 boost  —  one servo only

1000 µF bulk capacitor   [NOT YET HELD]

Waveshare Driver VIN   (6 – 12 V)

10 × ST3215   —   27 A worst-case stall
LEGEND
Implemented

In Progress

Planned Future Work

Power Status & Open Risks
LiPo sits inside the servo range — no conversion needed
Fuse, BMS and loop key are not yet in inventory

Driver is rated 6–12 V; a full 3S pack is 12.6 V
LiPo C-rating unverified — sets the real current ceiling

### Notes:
The resolved part is the robot rail: a 3S pack sits inside the ST3215's 6.0 to 12.6 volt window, so it feeds the driver directly with no buck or boost anywhere in the path. That removes the whole conversion problem Generation 1 had at 5 volts. Two things are not resolved and both belong on the record. First, Waveshare rates this board 6 to 12 volts, and a fully charged 3S pack is 12.6 - so we are 0.6 volts over spec at the top of every charge cycle. Second, none of the three protection parts are held yet. The 27 amp figure is worst-case all-joints-stalled, not normal draw, but it is what sizes the fuse.

<!-- Slide number: 25 -->
SAFETY ARCHITECTURE & CRITICAL GAPS
Five Protection Parts the Robot Does Not Yet Have

![preencoded.png](Image1.jpg)

![preencoded.png](Image3.jpg)

![preencoded.png](Image5.jpg)

![preencoded.png](Image0.jpg)

![preencoded.png](Image2.jpg)

![preencoded.png](Image4.jpg)
Inline fuse — MISSING
Loop-key disconnect — MISSING
LiPo alarm / BMS — MISSING
Nothing limits fault current on a 27 A-capable pack.
No safe way to isolate the battery from the bus.
No cell-level undervoltage protection below 3.0 V.

![preencoded.png](Image7.jpg)

![preencoded.png](Image9.jpg)

![preencoded.png](Image11.jpg)

![preencoded.png](Image6.jpg)

![preencoded.png](Image8.jpg)

![preencoded.png](Image10.jpg)
Bulk capacitor — MISSING
Balance charger & bag — MISSING
Current-stall limit — IN FIRMWARE
Servo inrush transients reach the driver unsuppressed.
No safe charge, balance or storage path for the pack.
Software torque cap works, but is not a fuse.

### Notes:
This is the slide I would rather not need. Five of the six cards are amber and they are all cheap - roughly 3600 rupees for the whole row. The reason it is on the deck rather than buried in a spreadsheet is that a 3S lithium polymer pack capable of 27 amps, with no fuse, no cell monitoring and no disconnect, is the one genuinely hazardous thing in this project. The sixth card is deliberate: the firmware current limit is real and it works, but software cannot protect against a short circuit. Nothing goes on the LiPo until the first three are fitted.

<!-- Slide number: 26 -->
GAIT & OBSTACLE RESPONSE
Gait Generation and the Evasion State Machine

Lateral Undulation — Travelling Wave

Evasion Finite State Machine

Joint 1   φ = 0°

CPG
Joint 2   φ = 72°

FSM
RUN
STALL
BACK
TURN

Joint 3   φ = 144°

Joint 4   φ = 216°

A serpenoid phase offset propagates down the chain at 50 Hz; amplitude 400 ticks ≈ 35°.
A sustained current rise trips STALL; the robot reverses, turns away, then resumes.

GAIT PARAMETERS
OBSTACLE DETECTION
Proprioceptive — no external sensor
Control loop 50 Hz
Amplitude 400 encoder ticks ≈ 35°
Phase offset 72° per joint, 10 joints
Goal position written as a sync payload
Gait continues if the IMU is absent
Collision is inferred from PRESENT_CURRENT at address 69 rather than a rangefinder. The threshold is still a placeholder at 1200 mA and must be calibrated against a measured free-run and stall current before it can be trusted.

### Notes:
The gait is a central pattern generator - a travelling sine wave with a fixed phase offset per joint, which is the standard lateral undulation formulation. The part worth drawing attention to is obstacle detection: there is no ultrasonic sensor and no rangefinder in the loop. The robot notices an obstacle because a joint draws more current than it should, which is proprioception rather than exteroception. That is elegant and it costs nothing in hardware, but the threshold is a guess until we measure a real stall on a real segment.

<!-- Slide number: 27 -->
VERIFICATION & MOCK-MODE RESULTS
What Has Been Proven Without Hardware

![preencoded.png](Image1.jpg)

![preencoded.png](Image3.jpg)

![preencoded.png](Image5.jpg)

![preencoded.png](Image0.jpg)

![preencoded.png](Image2.jpg)

![preencoded.png](Image4.jpg)
v6 CAD self-check
Mock mode — SURGE_MOCK=1
Wokwi simulation
Model refuses to export if its assumptions break.
Full gait stack runs with no servos attached.
ESP32, servos, IMU and display validated virtually.

![preencoded.png](Image7.jpg)

![preencoded.png](Image9.jpg)

![preencoded.png](Image11.jpg)

![preencoded.png](Image6.jpg)

![preencoded.png](Image8.jpg)

![preencoded.png](Image10.jpg)
PlatformIO — five targets
Broadcast smoke test
Hardware verification
All firmware environments compile clean.
Ten servos driven before any ID was assigned.
Ping, stall calibration and gait still outstanding.

### Notes:
The honest framing is that this is verification without hardware, which is worth a lot but is not the same as a working robot. The five green cards are real: the CAD model asserts its own ground-contact geometry, the Python stack runs a full gait in mock mode, the simulation covers the electronics, every firmware target builds, and the broadcast test moved all ten servos on the bench. The amber card is the point of the slide - nothing has been calibrated against a real stall current yet, and that is the next measurement.

<!-- Slide number: 28 -->

INVENTORY, BUDGET & PROCUREMENT GAPS
What We Hold, What We Still Need

Budget Position: Gen 1 spend was approximately ₹33,760 of the ₹1,00,000 SURGE grant. Remaining procurement is estimated at ₹10,200 and is almost entirely consumables and safety hardware — the expensive actuator and compute line items are already held.

IN HAND — 9 LINE ITEMS
MISSING — CRITICAL (SAFETY)
MISSING — HIGH PRIORITY

10× Waveshare ST3215 servos
Waveshare driver with ESP32
ESP32 #2, Pi 5 8 GB, MPU6050
3S LiPo 1800 mAh, Mean Well 5 V
Camera Module 3, XL6009 boost
Inline fuse and holder
LiPo alarm / BMS module
XT60 loop-key disconnect
Without these the pack is unsafe
3S balance charger, storage bag
Servo daisy-chain cables ×12
F623ZZ bearings, M2 fasteners
PLA+ filament, TPU belly pads
PROCUREMENT STATUS

✓

✓

✓

⏳

→

→

→

Actuators
received
Compute
received
Power
source held
Safety
parts
Fasteners
& bearings
Filament
& pads
Camera
for ESP32
Upcoming
Upcoming

★
Key Achievement: the actuator blocker that stalled Generation 1 is cleared — all ten servos, the driver board and the power source are in hand. Every remaining gap is a low-cost consumable, not a supply-chain risk.

### Notes:
Be direct about the sunk Gen 1 cost. The favourable point is that Gen 2 needs only consumables and safety parts and the grant covers it comfortably. The critical row is not optional - running a 3S LiPo with no fuse, no BMS and no disconnect is the one genuinely unsafe thing in this project. Verify the ST3215 purchase cost before presenting; the inventory lists them as held but records no price.

<!-- Slide number: 29 -->
ROADMAP
Path to Demonstration — Generation 2
Replaces the Generation 1 roadmap on slide 15, which was written around Dynamixel XL330 delivery and is now obsolete.

PHASE 1
PHASE 3
PHASE 5
PHASE 7
Power Verification
Segment Fabrication
Field Integration
Characterisation
In progress
Planned

1

2

3

4

5

6

7

8

PHASE 2
PHASE 4
PHASE 6
PHASE 8
Servo Bring-Up
Mechanical Assembly
Locomotion Trials
Final Demonstration
Up next

WE ARE HERE

### Notes:
Open by naming slide 15 and saying plainly that it is superseded - do not let the audience find two roadmaps on their own and wonder which one is live. The eight phases here are the actual next steps from the hardware inventory, not a re-skin of the old plan. Phase 1 is where we are: the pack cannot go on the robot until the fuse, loop key and BMS are fitted. Close on phase 3, because it contains the one experiment everything else depends on - printing a v6 segment and measuring whether the belly friction is actually anisotropic. If it is not, the gait does not work and we would rather know that before printing ten more segments. Target for the next review is first translating locomotion on hardware, which is a milestone you can watch rather than a percentage you have to trust.

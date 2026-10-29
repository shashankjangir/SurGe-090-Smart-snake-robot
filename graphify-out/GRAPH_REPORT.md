# Graph Report - 1. SurGe 090 Smart snake robot  (2026-10-26)

## Corpus Check
- Large corpus: 297 files · ~780,050 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1154 nodes · 2074 edges · 79 communities (35 shown, 44 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 192 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Test Gait / Simulation
- Test Offline / Feetech Protocol
- Robot Esp32 / Spin All
- Test Gait
- Robot Esp32 V2
- Socket.Io.Min
- Socket.Io.Min
- Dashboard
- App
- App
- Test Gen2 1
- Simulation Interface / App
- Web App
- Arduino / Usb Servo Bridge
- Simulation Interface
- Robot Config / Servo Driver
- Receiver Gen2 1 / Transmitter Gen2 
- Sensor Gen2 1 / Get Mac Oled
- Scservo
- Snake Segment / Segment V4
- Simulation / Simulation Interface
- App / Simulation Interface
- Arduino / Base Esp32
- Receiver Gen2 1
- Servo Driver / Utils
- Web App
- Web App
- Arduino / Assign Ids
- Align Snake / Test 3D Snake
- Obstacle Avoidance / Robot Config
- Test St3215 Terminal / Base Station
- Servo Test / Controller Node
- Gait / App
- Probe St3215 / Main
- Receiver Gen2 1 / Test Firmware
- Runtime
- Main
- Hardware
- Test Dynamixel Ping / Test Motor Fe
- Servo Driver
- Bench / Align Gen2 1
- Test Web
- St3215 Interface
- St3215 Interface
- Gen3
- Test Gen2 1
- Gen3
- Script
- Torque Controller
- Adafruit Ssd1306
- Arduino
- Arduino
- Path Engine
- Script
- Script
- Path Engine / Runtime
- Test Gen2 1
- Kinematics
- Segment V6
- Arduino
- Diagram
- Diagram
- Servo Driver
- Snake Locomotion
- Arduino / Base Esp32
- Kinematics
- Torque Controller
- Snake Locomotion
- Test Motor Feedback
- Utils
- Obstacle Avoidance
- Snake Locomotion
- Web App

## God Nodes (most connected - your core abstractions)
1. `create_app()` - 26 edges
2. `SimulationInterface` - 25 edges
3. `RunnerTests` - 24 edges
4. `ST3215Interface` - 24 edges
5. `FeetechBus` - 23 edges
6. `ControlRuntime` - 23 edges
7. `SimulationInterface` - 22 edges
8. `SnakeDashboard` - 21 edges
9. `SMS_STS` - 20 edges
10. `millis()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `processCommand()` --calls--> `millis()`  [INFERRED]
  removed/pre-recheck-2026-10-15/gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp → gen2-st3215/tests/firmware_stubs/Arduino.h
- `Gen3Control` --uses--> `SimulationInterface`  [INFERRED]
  shared/surge_control/gen3.py → gen3-experimental-3d/simulation.py
- `main()` --uses--> `ST3215Interface`  [INFERRED]
  gen3-experimental-3d/test_3d_snake.py → shared/surge_control/hardware.py
- `WebTests` --uses--> `Gen3Control`  [INFERRED]
  gen3-experimental-3d/tests/test_web.py → shared/surge_control/gen3.py
- `RuntimeTests` --uses--> `SnakeKinematics`  [INFERRED]
  tests/test_gen2_1.py → shared/surge_control/gait.py

## Import Cycles
- None detected.

## Communities (79 total, 44 thin omitted)

### Community 0 - "Test Gait / Simulation"
Cohesion: 0.05
Nodes (17): envelope(), load_map(), number(), slew(), targets_at(), validate_gait(), validate_map(), robot_xml() (+9 more)

### Community 1 - "Test Offline / Feetech Protocol"
Cohesion: 0.05
Nodes (9): checksum(), _extract_status(), FeetechBus, pack(), ControlTests, DriverTests, PacketTests, assign() (+1 more)

### Community 2 - "Robot Esp32 / Spin All"
Cohesion: 0.10
Nodes (26): applyCommand(), enableTorque(), feetechSignedMag(), gaitPositions(), imuBegin(), imuRead(), loop(), onRecv() (+18 more)

### Community 3 - "Test Gait"
Cohesion: 0.06
Nodes (4): Clock, example_map(), Fake, RunnerTests

### Community 4 - "Robot Esp32 V2"
Cohesion: 0.13
Nodes (33): advanceStart(), applyPending(), beginStart(), busInstruction(), busReadStatus(), busSend(), enterCenter(), enterGait() (+25 more)

### Community 5 - "Socket.Io.Min"
Cohesion: 0.14
Nodes (27): a(), c(), Ct(), d(), e(), Et(), f(), G() (+19 more)

### Community 6 - "Socket.Io.Min"
Cohesion: 0.14
Nodes (27): a(), c(), Ct(), d(), e(), Et(), f(), G() (+19 more)

### Community 10 - "Test Gen2 1"
Cohesion: 0.08
Nodes (4): ApiTests, FakeInterface, load(), PreservationTests

### Community 13 - "Arduino / Usb Servo Bridge"
Cohesion: 0.10
Nodes (4): constrain(), Queue, items, WiFiStub

### Community 15 - "Robot Config / Servo Driver"
Cohesion: 0.24
Nodes (5): Config, default_serial_port(), St3215Addr, ServoState, radians_to_encoder()

### Community 16 - "Receiver Gen2 1 / Transmitter Gen2 "
Cohesion: 0.14
Nodes (6): printTelemetry(), RadioReply, text, enterStop(), OnDataRecv(), torqueAll()

### Community 17 - "Sensor Gen2 1 / Get Mac Oled"
Cohesion: 0.13
Nodes (5): getAccurateDistance(), handleData(), jsonNumber(), loop(), delayMicroseconds()

### Community 18 - "Scservo"
Cohesion: 0.11
Nodes (7): SMS_STS, Error, failID, IOTimeOut, pSerial, targets, torque

### Community 19 - "Snake Segment / Segment V4"
Cohesion: 0.19
Nodes (10): _box(), build_motor_proxy(), build_segment(), _cyl(), place_real_motor_step(), plan_outline_wp(), verify(), vol() (+2 more)

### Community 22 - "Arduino / Base Esp32"
Cohesion: 0.20
Nodes (17): setup(), setupEspNow(), setupEspNow(), setup(), setup(), esp_now_add_peer(), esp_now_init(), esp_now_peer_info_t (+9 more)

### Community 23 - "Receiver Gen2 1"
Cohesion: 0.21
Nodes (16): ConnectionState, STATE_BOTH, STATE_DISCONNECTED, STATE_ESPNOW, STATE_INIT, STATE_USB, enterStop(), loop() (+8 more)

### Community 24 - "Servo Driver / Utils"
Cohesion: 0.20
Nodes (4): ServoDriver, encoder_to_radians(), to_signed_current(), to_signed_magnitude()

### Community 25 - "Web App"
Cohesion: 0.19
Nodes (9): connect_engine(), get_3d_status(), get_report(), get_status(), get_system_stats(), index(), set_params(), set_path() (+1 more)

### Community 26 - "Web App"
Cohesion: 0.20
Nodes (10): connect_engine(), get_3d_status(), get_report(), get_status(), get_system_stats(), handle_controller(), index(), set_params() (+2 more)

### Community 27 - "Arduino / Assign Ids"
Cohesion: 0.26
Nodes (9): loop(), loop(), readCommand(), handleSerial(), loop(), esp_now_send(), String, xQueueReceive() (+1 more)

### Community 28 - "Align Snake / Test 3D Snake"
Cohesion: 0.27
Nodes (4): main(), main(), main(), main()

### Community 29 - "Obstacle Avoidance / Robot Config"
Cohesion: 0.20
Nodes (3): ObstacleAvoidance, Config, DynamixelAddr

### Community 30 - "Test St3215 Terminal / Base Station"
Cohesion: 0.21
Nodes (4): main(), main(), move(), main()

### Community 32 - "Gait / App"
Cohesion: 0.22
Nodes (4): main(), run_headless(), SnakeKinematics, SimulationTests

### Community 34 - "Receiver Gen2 1 / Test Firmware"
Cohesion: 0.20
Nodes (11): millis(), main(), ConnectionState, STATE_BOTH, STATE_DISCONNECTED, STATE_ESPNOW, STATE_INIT, STATE_USB (+3 more)

### Community 36 - "Main"
Cohesion: 0.22
Nodes (3): disable_motors(), init_motors(), main()

### Community 44 - "Gen3"
Cohesion: 0.38
Nodes (8): action(), api(), cell(), poll(), ports(), renderMap(), showError(), update()

### Community 48 - "Script"
Cohesion: 0.36
Nodes (7): addPoint(), fetchAndShowReport(), post(), renderCanvas(), sendParams(), sendPath(), updateStatus()

### Community 51 - "Arduino"
Cohesion: 0.25
Nodes (5): HardwareSerial, enables, goals, respond, torque

### Community 52 - "Arduino"
Cohesion: 0.25
Nodes (3): size, Stream, incoming

### Community 54 - "Script"
Cohesion: 0.36
Nodes (4): addPoint(), fetchAndShowReport(), renderCanvas(), updateStatus()

### Community 55 - "Script"
Cohesion: 0.36
Nodes (4): addPoint(), fetchAndShowReport(), renderCanvas(), updateStatus()

### Community 62 - "Diagram"
Cohesion: 0.29
Nodes (6): author, connections, dependencies, editor, parts, version

### Community 63 - "Diagram"
Cohesion: 0.29
Nodes (6): author, connections, dependencies, editor, parts, version

### Community 66 - "Arduino / Base Esp32"
Cohesion: 0.33
Nodes (5): onRecv(), OnDataRecv(), OnDataRecv(), xQueueReset(), xQueueSend()

## Knowledge Gaps
- **32 isolated node(s):** `text`, `STATE_INIT`, `STATE_DISCONNECTED`, `STATE_USB`, `STATE_ESPNOW` (+27 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 503 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SnakeDashboard` connect `App` to `App / Simulation Interface`, `Simulation Interface`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `SimulationInterface` (e.g. with `SnakeDashboard` and `._run()`) actually correct?**
  _`SimulationInterface` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `text`, `STATE_INIT`, `STATE_DISCONNECTED` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Test Gait / Simulation` be split into smaller, more focused modules?**
  _Cohesion score 0.05403348554033485 - nodes in this community are weakly interconnected._
- **Why does `RunnerTests` connect `Test Gait` to `Test Gait / Simulation`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `Test Offline / Feetech Protocol` be split into smaller, more focused modules?**
  _Cohesion score 0.05288207297726071 - nodes in this community are weakly interconnected._
- **Why does `WebTests` connect `Test Web` to `Test Gait / Simulation`, `Test Web`, `Test Web`, `Gen3`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
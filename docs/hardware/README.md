# How the robot is built

I use ten ST3215 serial-bus servos in the current robot. Gen 2 is a planar yaw chain. Gen 3 alternates pitch and yaw so the same motor type can produce vertical and horizontal bending. This page describes the recorded setup, not a claim that every proposed electrical protection is installed.

## Parts and mechanical layout

| Part | Role in the project |
| --- | --- |
| Ten ST3215 servos | Joint IDs 1 through 10 |
| Waveshare Servo Driver with ESP32 | Robot receiver and servo bus interface |
| A second ESP32 | USB transmitter at the host computer |
| External 3S 1800 mAh LiPo | Recorded motor power source |
| Buck supply for the controller | Separate controller supply in the proposed power design |
| Raspberry Pi 5 and camera | Earlier host/vision work; the maintained dashboard can run on a PC |
| Optional sensor node | Separate sensor firmware, not proof of installed localization |

Our Gen 3 neutral CAD assembly has a head, nine middle bodies and a tail. Odd servo IDs are pitch; even IDs are yaw. Each motor needs its own ID before it joins the bus. The parts, plates and motor holders are in [Gen 2 CAD](../../generations/gen2-st3215/cad/) and [Gen 3 CAD](../../generations/gen3-experimental-3d/cad/). Prototype assembly files still require fit, strength and cable-clearance checks.

The neutral shaft position is 2048 on every joint. That does not mean I can force an assembled joint to 2048 without first checking its measured position and clearance. Mechanical centering and the software sign map are separate jobs.

## Connections used by the maintained receiver

| Connection | Setting |
| --- | --- |
| Host USB serial | 115200 baud, newline-delimited commands |
| Servo UART | 1 Mbps, ESP32 RX GPIO 18 and TX GPIO 19 |
| OLED I2C | SDA 21, SCL 22, address 0x3C |
| Status LEDs | Two NeoPixels on GPIO 23 |
| ESP-NOW | Channel 1 |
| Logical receiver radio address | 28:05:A5:4E:01:38 |

The receiver deliberately uses the logical address above so the transmitter can keep its destination. It differs from the receiver's hardware MAC. The last USB identification was COM6 receiver, hardware MAC 28:05:A5:4F:E5:AC, and COM7 transmitter, hardware MAC 68:09:47:5C:10:EC. I identify the boards again after changing the USB setup.

## Power design and what is actually installed

The split-bus v3 proposal divides motor power into five pairs: IDs 1/2, 3/4, 5/6, 7/8 and 9/10. It proposes a 15 A main fuse, a removable loop key, a main supply trunk and a 3 A fused injection point with a capacitor for each pair. DATA and GND remain continuous; the positive motor supply is isolated between groups. The controller's servo-port positive lead must not bridge those isolated feeds.

These are fused supply branches, not five independent regulated buck outputs. Grounds are shared for communication; the older report's claim of isolated logic and motor ground planes was incorrect.

**The last owner report says no fuses are installed.** The diagrams describe design intent. I cannot treat their fuses, estimated voltage drop or current figures as verified protection on the physical robot. The external battery and long leads also remain part of the recorded setup.

The ST3215 system uses the recorded 3S supply arrangement. The old 5 V bench supply is not the motor rail. Before changing wiring, I disconnect the battery, support the links and verify the actual board and supply connections. The old electrical calculations and bill of materials are preserved in [the hardware archive](../archive/2026-11-03/docs/hardware/).

## Current measured map

The source of truth is [joint_map.json](../../generations/gen3-experimental-3d/joint_map.json).

| Setting | Saved value |
| --- | --- |
| Neutral position | 2048 on every joint |
| Minimum / maximum | 1252 / 2844 counts |
| Speed | 1500 counts/s |
| Tracking error | 216 counts |
| Tracking timeout | 0.5 seconds |
| Calibrated flag | true |
| Pitch ID 1 sign | +1 |
| Pitch IDs 3, 5, 7, 9 sign | -1 |
| All yaw signs | +1 |

The Gen 3 software command ceiling is 3000 counts/s; the receiver protocol accepts speed up to 3400. Neither ceiling is a measured safe operating speed. Jogging and centering have their own lower limits. Old 100-count/s examples do not replace the saved map.

## What I check before another trial

I support the robot, confirm the power-disconnection path, identify the USB boards and read all ten joints. Missing feedback is a fault, not a centre position. After the reported wiring repair, we still need a logged all-ten diagnostic recheck and a repeat of the failed high-amplitude trial with voltage recorded.

The maintained host-command receiver does not inherit every battery, temperature and power-group feature of the older onboard robot_esp32_v2 firmware. I do not assume a protection exists just because it appears in a different firmware folder.

See [operation](../operations/1_APP_USAGE_MANUAL.md) for commissioning and [current status](../CURRENT_STATUS.md) for the physical limits still open.

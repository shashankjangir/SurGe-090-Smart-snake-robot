# SURGE-090 version map

Recorded 2026-10-15 during Gen 2.1 repository integration.

## Project versions

| Version | Name | Location | Mechanical arrangement | Control stack |
|---|---|---|---|---|
| **Gen 1** | Dynamixel prototype | `gen1-dynamixel/` | Alternating yaw/pitch XL330 design (2 motors obtained of 10 planned) | Raspberry Pi + `dynamixel-sdk` |
| **Gen 2.0** | Planar ST3215 design | `gen2-st3215/` (bench stack, `robot_esp32_v2`, CAD v6, power bus v3) | Planar all-yaw ST3215 × 10 | Onboard CPG on ESP32 + base ESP-NOW |
| **Gen 2.1** | Integrated control software | `shared/surge_control/`, `shared/web-dashboard/`, `shared/gamepad/`, `gen2-st3215/firmware/*_gen2_1/` | **Same planar Gen 2 mechanics** | Host-side gait + dashboard; receiver text protocol `HELLO` / `RUN` / `STOP` / `P,id:pos:speed` |
| **Gen 3.0** | Experimental 3D motion | `gen3-experimental-3d/` | Alternating pitch/yaw connectors and plate-chain CAD — **not** the planar Gen 2 build | Experimental scripts only; do not flash Gen 2.1 planar tools against Gen 3 hardware without reviewing joint mapping |

Gen 1 is frozen: do not rewrite its code, CAD, or docs for later generations.

## Component revisions (tracked alongside project versions)

| Component | Current | Notes |
|---|---|---|
| Body segment CAD | **v6** (`gen2-st3215/cad/segments/v6/`) | Design of record for planar Gen 2; v4 baseline, v5 superseded |
| Power bus | **v3** (`docs/hardware/power_split_bus_v3.md`) | 15 A main → 5× (2 servos @ 3 A); v1 centre-fed and v2 4+3+3 superseded |
| Field robot firmware (onboard gait) | `robot_esp32_v2` | Gen 2.0 onboard CPG path |
| Integrated receiver firmware | `receiver_gen2_1` | Gen 2.1 host-driven planar path |
| Simulation URDF | 11 links / 10 joints | `shared/simulation/pybullet/snake.urdf` — matches Gen 2.1 controller |

## Which controller supports which mechanism

| Controller / entry point | Supports |
|---|---|
| `gen1-dynamixel/main.py` | Gen 1 Dynamixel only |
| `gen2-st3215/main.py` + `usb_servo_bridge` | Gen 2.0 host bench gait |
| `robot_esp32_v2` + `base_esp32` | Gen 2.0 onboard gait |
| `shared/web-dashboard/web_app.py` + `shared/surge_control` | Gen 2.1 planar sim + Gen 2.1 hardware receiver |
| `gen2-st3215/tools/*_gen2_1.py` | Gen 2.1 planar hardware bench |
| `gen3-experimental-3d/test_3d_snake.py` | Gen 3.0 experimental 3D CAD / motion trials |

## Current project status — 16 October 2026

The project maintainer confirms Gen 2.0 and Gen 2.1 are working well in trials.
Gen 3.0 remains in active development. Photos are in `gen2-st3215/media/`;
no videos have been added yet. This does not replace measured safety and
performance tests.

## Preservation baselines

The tag `archive/pre-gen2.1-integration-2026-10-15` records project HEAD
`f64e79b`. Original tracked files replaced or missing locally are recovered under
`removed/pre-gen2.1/`. Gen 1 is checked against `gen1-git-baseline.json`.

The earlier complete incoming archive (recorded HEAD `b15efef`) and local bundles
were absent on 16 October and are not part of this sync. See
[archive availability](../../removed/INDEX.md). The integration map records the
original source-to-destination mapping, not a guarantee that the original archive
is present.

See [verification](VERIFICATION.md) and [whole-folder recheck](RECHECK.md).

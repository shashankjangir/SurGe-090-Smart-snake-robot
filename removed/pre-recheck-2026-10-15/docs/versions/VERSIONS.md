# SURGE-090 version map

Recorded 2026-10-15 during Gen 2.1 repository integration.

## Project versions

| Version | Name | Location | Mechanical arrangement | Control stack |
|---|---|---|---|---|
| **Gen 1** | Dynamixel prototype | `gen1-dynamixel/` | Planar XL330 chain (2 motors obtained of 10 planned) | Raspberry Pi + `dynamixel-sdk` |
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
| `gen2-st3215/main.py` + `robot_esp32_v2` | Gen 2.0 planar onboard gait |
| `shared/web-dashboard/web_app.py` + `shared/surge_control` | Gen 2.1 planar sim + Gen 2.1 hardware receiver |
| `gen2-st3215/tools/*_gen2_1.py` | Gen 2.1 planar hardware bench |
| `gen3-experimental-3d/test_3d_snake.py` | Gen 3.0 experimental 3D CAD / motion trials |

## Preservation baselines

| Artifact | Meaning |
|---|---|
| Git tag `archive/pre-gen2.1-integration-2026-10-15` | Project HEAD `f64e79b` before integration commits |
| Incoming control repo HEAD | `b15efef` (`Snake_SURGE` snapshot) |
| `removed/baselines/*.bundle` | Full git bundles of both starting points |
| `removed/baselines/*-sha256.json` | Content hashes for Gen 1, incoming tree, pre-integration active files, and working-tree snapshot |
| `removed/pre-gen2.1/` | Copies of active files replaced or wrapped during integration |
| `removed/gen2.1-source-snapshot/Snake_SURGE/` | Complete incoming tree (including its nested `.git`) |

See also `docs/versions/integration-map.json` and `removed/INDEX.md`.

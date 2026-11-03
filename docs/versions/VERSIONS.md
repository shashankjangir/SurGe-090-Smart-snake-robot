# SURGE-090 version map

Recorded 2026-10-15 during Gen 2.1 repository integration.

## Project versions

| Version | Name | Location | Mechanical arrangement | Control stack |
|---|---|---|---|---|
| **Gen 1** | Dynamixel prototype | `generations/gen1-dynamixel/` | Ten-joint alternating yaw/pitch XL330 design | Raspberry Pi + `dynamixel-sdk` |
| **Gen 2.0** | Planar ST3215 design | `generations/gen2-st3215/` (bench stack, `robot_esp32_v2`, CAD v6, power bus v3) | Planar all-yaw ST3215 × 10 | Onboard CPG on ESP32 + base ESP-NOW |
| **Gen 2.1** | Integrated control software | `shared/surge_control/`, `shared/web-dashboard/`, `shared/gamepad/`, `generations/gen2-st3215/firmware/*_gen2_1/` | **Same planar Gen 2 mechanics** | Host-side gait + dashboard; receiver text protocol `HELLO` / `RUN` / `STOP` / `P,id:pos:speed` |
| **Gen 3.0** | Experimental 3D motion | `generations/gen3-experimental-3d/` | Alternating pitch/yaw connectors and plate-chain CAD — **not** the planar Gen 2 build | Experimental scripts only; do not flash Gen 2.1 planar tools against Gen 3 hardware without reviewing joint mapping |

Gen 1 code, CAD and original reports remain historical. Its overview was refreshed
on 16 October 2026; the original README is preserved under
`removed/pre-gen1-docs-2026-10-16/`. The preservation check uses that copy for the
README and the original paths for all other baseline files.

## Component revisions (tracked alongside project versions)

| Component | Current | Notes |
|---|---|---|
| Body segment CAD | **v6** (`generations/gen2-st3215/cad/segments/v6/`) | Design of record for planar Gen 2; v4 baseline, v5 superseded |
| Power bus | **v3** (`docs/hardware/power_split_bus_v3.md`) | 15 A main → 5× (2 servos @ 3 A); v1 centre-fed and v2 4+3+3 superseded |
| Field robot firmware (onboard gait) | `robot_esp32_v2` | Gen 2.0 onboard CPG path |
| Integrated receiver firmware | `receiver_gen2_1` | Gen 2.1 host-driven planar path |
| Simulation URDF | 11 links / 10 joints | `shared/simulation/pybullet/snake.urdf` — matches Gen 2.1 controller |

## Which controller supports which mechanism

| Controller / entry point | Supports |
|---|---|
| `generations/gen1-dynamixel/main.py` | Gen 1 Dynamixel only |
| `generations/gen2-st3215/main.py` + `usb_servo_bridge` | Gen 2.0 host bench gait |
| `robot_esp32_v2` + `base_esp32` | Gen 2.0 onboard gait |
| `generations/gen3-experimental-3d/backend/web_dashboard/web_app.py` + `shared/surge_control` | Gen 2.1 planar sim + Gen 2.1 hardware receiver |
| `generations/gen2-st3215/tools/*_gen2_1.py` | Gen 2.1 planar hardware bench |
| `generations/gen3-experimental-3d/test_3d_snake.py` | Gen 3.0 experimental 3D CAD / motion trials |

## Current project status — 16 October 2026

The project maintainer confirms Gen 2.0 and Gen 2.1 are working well in trials.
Gen 3.0 remains in active development. Photos are in `generations/gen2-st3215/media/`;
no videos have been added yet. This does not replace measured safety and
performance tests.

## Preservation baselines

The tag `archive/pre-gen2.1-integration-2026-10-15` records project HEAD
`f64e79b`. Original tracked files replaced or missing locally are recovered under
`removed/pre-gen2.1/`. Gen 1 is checked against `gen1-git-baseline.json`.

The complete original source snapshot (recorded HEAD `b15efef`) and both Git
bundles were restored on 16 October. All 66 source-snapshot files and 46 selected
pre-integration files match their original SHA-256 manifests. See the
[archive index](../../removed/INDEX.md) and [audit](../../removed/AUDIT.md).

See [verification](VERIFICATION.md) and [whole-folder recheck](RECHECK.md).

## October 2026 Addendum: Consolidated Backend & Unified Cockpit Architecture

The web dashboard and control runtime have been consolidated under `generations/gen3-experimental-3d/backend/`:
- **Web Dashboard Entry Point**: `generations/gen3-experimental-3d/backend/web_dashboard/web_app.py`
- **Shared Controller Package**: `generations/gen3-experimental-3d/backend/surge_control/`
- **Simulation Interface**: `generations/gen3-experimental-3d/backend/simulation/`

### Unified Launch Command
```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```

Supports:
- `/` — Gen 2.1 planar simulation and hardware receiver control
- `/gen3` — Gen 3.0 experimental 3D spatial commissioning and finite motion trials
- `/3d` — 3D spatial visualizer


---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

Commits since 16 Oct: `2440c9e` (22 Oct), `077dedb` (25 Oct), PR #1, `4959334` / PR #2 (29 Oct), `2515ae1`, `b2d64c5` (30 Oct), `fc24e4e` (31 Oct).

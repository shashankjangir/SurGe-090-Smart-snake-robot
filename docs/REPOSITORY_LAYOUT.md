# Repository layout

The maintained dashboard and simulation live together under `generations/gen3-experimental-3d/`. Preserve that folder structure when exporting the runtime.

| Location | Contents |
| --- | --- |
| `generations/gen1-dynamixel/` | Original Dynamixel code, CAD, media and records |
| `generations/gen2-st3215/` | Planar code, maintained ESP32 firmware, bench tools, CAD and media |
| `generations/gen3-experimental-3d/` | Current 12-joint map, runners, backend, CAD and recorded runs |
| `generations/gen3-dashboard-refined/` | Independent refined dashboard, default port 5001 |
| `generations/rasp_pi/` | Legacy 10-joint Pi distribution |
| `gen3-experimental-3d/cad/segments_v1/` | Active segment CAD generator retained at the root |
| `docs/` | Guides, research, decisions, presentations and historical records |
| `tests/` and `tools/` | Cross-generation tests and repository checks |
| `artifacts/` | Generated outputs and an older Graphify index |
| `platformio.ini` | Firmware source root and build environments |

Both pages of the maintained app use `generations/gen3-experimental-3d/backend/`. Templates and scripts use `pages/` and `components/` folders. Browser data code lives in `static/data/` and server persistence in `surge_control/data/`. See [the asset guide](../generations/gen3-experimental-3d/backend/web_dashboard/static/README.md).

## Export the current runtime

Keep the complete `backend/` folder and these files together inside `generations/gen3-experimental-3d/`.

- `gait.py`
- `simulation.py`
- `test_3d_snake.py`, which the server imports
- `joint_map.json`

The backend includes local fonts, images, JavaScript vendors, browser meshes and the planar URDF. Keep `runs/` if you want saved presets, poses and run history. Add the generation CAD and media folders and `docs/` for the project record. The root CAD generator has its own [guide](../gen3-experimental-3d/cad/segments_v1/README.md).

Recreate Python dependencies on the destination. Configure fresh operator credentials for a shared export. Keep private operator and OTA credentials, transmitter-port hints, local environments, scratch work and build output outside Git. Firmware builds additionally need `platformio.ini` and `generations/gen2-st3215/firmware/`. [Setup](START_HERE.md)

## Run checks

From the repository root, choose the checks for the code you changed.

~~~powershell
python tools/verify_layout.py
python tools/verify_docs.py
conda run --no-capture-output -n surge python -B -m unittest discover -s tests
conda run --no-capture-output -n surge python -B -m unittest discover -s generations/gen3-experimental-3d/tests
conda run --no-capture-output -n surge python -B -m unittest discover -s generations/gen2-st3215/tests -p test_offline.py
Get-ChildItem generations/gen3-experimental-3d/tests/test_*.cjs | ForEach-Object { node $_.FullName }
pio run -e receiver_gen2_1 -e transmitter_gen2_1
~~~

Python and Node commands above use offline checks. Browser scripts may need Playwright and an installed browser. PlatformIO builds firmware without uploading. Native C++ instructions are in [the Gen 2 test guide](../generations/gen2-st3215/tests/README.md).

The layout checker accepts the intentional root CAD folder. It checks historical move records for uniqueness and containment, without requiring private settings or caches from those records to be present. Runtime files and dashboard asset paths must exist. The documentation checker validates portable local Markdown links. [Current status](CURRENT_STATUS.md) records the passing publication-export checks and their environment. The [offline CI workflow](../.github/workflows/python-package.yml) runs the suites with Python 3.11 and Node 22.

## Firmware installation

`receiver_gen2_1` and `transmitter_gen2_1` are the maintained environments. The retained `esp32_st3215_receiver` and `esp_now_transmitter` aliases select the same implementations.

The last confirmed installation used COM6 receiver and COM8 transmitter on 3 November 2026. Identify the boards again before installation, disconnect servo power and support the robot. Current receiver source expects 12 motors. Follow [the firmware guide](../generations/gen2-st3215/firmware/README.md), [the OTA guide](operations/FIRMWARE_OTA.md) and [the handoff](GEN3_HANDOFF.md) for the physical procedure.

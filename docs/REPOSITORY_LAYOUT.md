# Where I keep the project files

I keep each robot generation together so an old motor interface or mechanical assumption does not get mistaken for the current one.

| Location | Contents |
| --- | --- |
| generations/gen1-dynamixel/ | Original Dynamixel source, CAD and reports |
| generations/gen2-st3215/ | Planar ST3215 code, maintained ESP32 firmware, bench tools and CAD |
| generations/gen3-experimental-3d/ | Alternating-axis runner, map, simulation, shared backend and recorded runs |
| docs/ | Current guides, decisions, research, proposals and archived records |
| tests/ | Cross-generation offline tests |
| tools/ | Repository verification |
| artifacts/ | Preserved generated output; the old graph is not a current source index |
| platformio.ini | Firmware source root and individual build environments |

Both dashboard generations use generations/gen3-experimental-3d/backend/. The source is shared; there is no maintained root shared/desktop-app folder in this checkout.

## Files I keep local

Git ignores operator credentials, OTA credentials, the transmitter-port hint, Python environments, PlatformIO output and scratch work. I do not publish those by force-adding the whole folder. The measured joint map and run records need deliberate review because they are project data rather than disposable build output.

The earlier layout record is in [the archive](archive/2026-11-03/docs/REPOSITORY_LAYOUT.md). The [move manifest](reorganization/moves.csv) maps older paths to current destinations. The three merged bench launchers share one recorded consolidation destination.

## Check the software

From the repository root:

```powershell
python tools/verify_layout.py
conda run --no-capture-output -n surge python -B -m unittest discover -s tests
conda run --no-capture-output -n surge python -B -m unittest discover -s generations/gen3-experimental-3d/tests
conda run --no-capture-output -n surge python -B -m unittest discover -s generations/gen2-st3215/tests -p test_offline.py
Get-ChildItem generations/gen3-experimental-3d/tests/test_*.cjs | ForEach-Object { node $_.FullName }
pio run -e receiver_gen2_1 -e transmitter_gen2_1
```

The Python and Node commands are offline checks. Browser-specific checks need their browser/test dependencies. The firmware command builds; it does not upload. Live serial tests must be selected deliberately, not mixed into software verification.

Native C++ checks are described in [the Gen 2 test notes](../generations/gen2-st3215/tests/README.md). This machine also has a compiler under C:/Strawberry/c/bin; its runtime DLL directory must be on PATH when running those executables.

## Build and install firmware

The maintained environments are receiver_gen2_1 and transmitter_gen2_1. The retained esp32_st3215_receiver and esp_now_transmitter environment names select those same CPP implementations.

```powershell
pio run -e receiver_gen2_1 -e transmitter_gen2_1
```

Only after identifying the board, disconnecting servo power and supporting the robot do I run an upload. These are separate, physical actions:

```powershell
pio run -e receiver_gen2_1 -t upload --upload-port COM6
pio run -e transmitter_gen2_1 -t upload --upload-port COM7
```

The port numbers are the last confirmed mapping, not automatic board detection. Use [the OTA guide](operations/FIRMWARE_OTA.md) for subsequent Wi-Fi transfers. Never upload a transmitter application to the robot receiver.

## What the documentation rewrite changed

Thirty-one earlier project-facing guides are under [docs/archive/2026-11-03](archive/2026-11-03/README.md), with SHA256 values in its manifest. Original guide paths are retained for replacement guides or short links to the current explanation. Agent conventions, ADRs, research and proposal records stay in their existing folders.

The rewrite changes documentation and the stale bench entries in the move manifest. It does not change motor settings, firmware, CAD, credentials or run data.

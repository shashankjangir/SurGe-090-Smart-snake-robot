# Archive requirements

## Read and restore

- Git is required to verify or clone the `.bundle` history backups.
- Python 3.11 is the recommended inspection environment; SHA-256 verification
  needs only the standard library. Do not run archived `.pyc` files as entry points.
- Markdown/text editor and a PDF viewer cover documentation. Use a compatible
  CAD viewer/editor for STEP, SolidWorks and 3MF artifacts. Viewing a model does
  not verify dimensions or printability.
- Keep enough disk space for the bundles, source snapshots and any separate clones.
  Downloading a GitHub ZIP does not include the repository's outer Git history;
  the included bundles provide the historical restore path.

## Historical Python software

From the repository root, create a separate environment when inspecting old code:

```powershell
py -3.11 -m venv .venv-archive
.venv-archive/Scripts/python.exe -m pip install -r removed/requirements.txt
```

The convenience requirements include PySerial, Flask, psutil, PyBullet, pygame,
requests and matplotlib. Tkinter comes with the standard Windows Python installer;
Linux installations may need their distribution's Tk package. This is a dependency
list, not a guarantee that archived applications run unchanged. Original dependency
files remain untouched inside their snapshots. Historical imports, protocol
mismatches and missing project files can still require a separate restoration.

For current apps use [shared/requirements.txt](../shared/requirements.txt) and the
[operating guide](../docs/1_APP_USAGE_MANUAL.md).

## Firmware and hardware

Use PlatformIO and the active [platformio.ini](../platformio.ini) for current builds;
its environments declare Arduino ESP32 and the required servo/display/sensor
libraries. The archived intermediate configs may lack dependencies. Restoring old
firmware does not establish compatibility with current wiring or servo mapping.
This archive audit installed nothing, ran no hardware, and flashed no boards.

# Desktop control and headless simulation

This app provides a Tkinter interface to the Gen 2.1 controller, alongside a
small command-line launcher for simulation and finite hardware runs. The GUI
includes gait settings, path drawing and plots.

From the repository root, after installing [shared requirements](../requirements.txt):

```powershell
.venv/Scripts/python.exe shared/desktop-app/app.py --sim --duration 3
.venv/Scripts/python.exe shared/desktop-app/app.py --gui
```

The default launcher runs a finite headless simulation. GUI dependencies are
loaded only when `--gui` is selected.

For hardware, use the Gen 2.1 receiver and an explicit serial port:

```powershell
.venv/Scripts/python.exe shared/desktop-app/app.py --hardware --port COM3 --duration 10
```

In the GUI, Connect and Start begins motion and STOP requests torque-off.
The port can also be supplied through `SURGE_PORT`.

Drawn paths and trajectory reports are available in simulation. Physical mode
runs planar undulation; use the web dashboard and gamepad for manual steering.
See the [operating guide](../../docs/1_APP_USAGE_MANUAL.md) for setup details.

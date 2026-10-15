# Gen 2.1 Desktop and Headless App

The launcher `app.py` uses the shared Gen 2.1 package. `dashboard.py` retains the
Tkinter path drawing, math-path generator, PyBullet controls and plotting interface.
GUI dependencies load only when `--gui` is selected.

From the repository root:

```sh
python shared/desktop-app/app.py --sim --duration 3
python shared/desktop-app/app.py --gui
python shared/desktop-app/app.py --hardware --port COM3 --duration 10
```

Default: a finite headless simulation. Hardware needs Gen 2.1 receiver firmware.
GUI Connect and Start starts motion; STOP requests torque-off. Hardware port may
be supplied with `--port` or SURGE_PORT. Drawn paths/reports are simulation-only;
physical mode runs straight planar undulation. Web/gamepad provides manual steering.

See [full guide](../../docs/1_APP_USAGE_MANUAL.md).

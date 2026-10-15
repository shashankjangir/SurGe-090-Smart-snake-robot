# Gen 2.1 Web Dashboard

Gen 2.1 is working in project trials, confirmed on 16 October 2026. See the
[Gen 2 prototype photos](../../gen2-st3215/media/README.md) and
[version map](../../docs/versions/VERSIONS.md). Gen 3.0 is in development.

From the repository root:

```sh
python -m pip install -r shared/web-dashboard/requirements.txt
python shared/web-dashboard/web_app.py
```

Open http://127.0.0.1:5000. Select an engine, connect, then explicitly start motion.
STOP requests torque-off on hardware. A selected hardware serial port or SURGE_PORT
is required. Flash `receiver_gen2_1`; use `transmitter_gen2_1` for wireless.

The worker starts in the command-line entry point; importing `create_app()` has no
thread, serial or GUI side effects. Embedded users must call `runtime.start_worker()`
and `runtime.close()`. App routes and the worker serialize access to the interface.

| Endpoint | Purpose |
|---|---|
| GET `/`, `/3d` | Dashboard and Three.js viewer |
| POST `/api/connect` | Connect or disconnect; body engine, port, headless |
| POST `/api/start`, `/api/stop` | Explicit motion start and torque-off |
| POST `/api/params` | Validated gait/friction/force/speed settings |
| POST `/api/set_path` | Simulation path only |
| POST `/api/controller` | Gamepad input |
| GET `/api/status` | State, motor validity, sensor values and age |
| GET `/api/3d_status` | Simplified simulated segment transforms |
| GET `/api/report` | Mean distance to target polyline and display score |
| GET `/api/system_stats` | Host CPU/RAM (temperature may be unavailable) |

Hardware pose/localization is not implemented. Actual physical trajectory and
physical accuracy are not inferred from commanded joint positions. Sensor
broadcasts are displayed separately; missing samples are not normal readings.
Three.js/font CDN resources need network access in the browser.

See [operating guide](../../docs/1_APP_USAGE_MANUAL.md) and
[protocol](../../docs/API_DOCUMENTATION.md). Previous versions are preserved in
[removed](../../removed/INDEX.md).

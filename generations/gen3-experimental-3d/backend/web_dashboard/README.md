# Shared web dashboard

This Flask backend serves the planar Gen 2.1 page at `/`, the alternating-axis Gen 3 page at `/gen3`, the phone controller at `/phone`, and the viewer at `/3d` or `/3d_viewer`. Robot control lives in the neighbouring `surge_control` package.

Use [setup](../../../../docs/START_HERE.md) for installation and operator login, [operation](../../../../docs/operations/1_APP_USAGE_MANUAL.md) for physical connection, and [software](../../../../docs/SOFTWARE.md) for the runtime structure.

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

The default address is http://127.0.0.1:5000. Server startup does not connect serial hardware. Simulation and Hardware have separate controls. Gen 3 Hardware initially checks Dry run; Simulation uses PyBullet.

Viewer is the default role. A configured operator owns the motion lease. Public Stop remains available. The [joint map](../../joint_map.json) holds the current calibration and speed.

The browser asset layout is described in [static/README.md](static/README.md). Native motion, tracking and connection rules belong in the Python runtime rather than in an unchecked browser-only control. See [the API reference](../../../../docs/architecture/API_DOCUMENTATION.md) before adding clients.

Idle viewer sessions expire after 30 minutes, checked at most once a minute. The active operator is retained. Start requests keep the latest 1,000 IDs for retry detection. A retry with an older evicted ID is treated as a new request.

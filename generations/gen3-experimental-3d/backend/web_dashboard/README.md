# Shared web dashboard

This backend serves my planar Gen 2.1 page at / and alternating-axis Gen 3 page at /gen3. It uses Flask and the neighbouring surge_control package.

Use [setup](../../../../docs/START_HERE.md) for installation and operator login, [operation](../../../../docs/operations/1_APP_USAGE_MANUAL.md) for physical connection, and [software](../../../../docs/SOFTWARE.md) for the runtime structure.

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

The default address is http://127.0.0.1:5000. Server startup does not connect serial hardware. Simulation and Hardware have separate controls. Gen 3 Hardware initially checks Dry run; Simulation uses PyBullet.

Viewer is the default role. A configured operator owns the motion lease. Public Stop remains available. The current saved map uses speed 1500, not the 100-count/s value in earlier commissioning notes.

The browser asset layout is described in [static/README.md](static/README.md). Native motion, tracking and connection rules belong in the Python runtime rather than in an unchecked browser-only control. See [the API reference](../../../../docs/architecture/API_DOCUMENTATION.md) before adding clients.

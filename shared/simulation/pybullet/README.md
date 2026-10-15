# Planar snake simulation

The PyBullet model gives us a place to work on gait control and path following
without needing the physical robot connected. The web and desktop apps share
this model through `shared/surge_control/simulation.py`.

`snake.urdf` contains eleven links and ten yaw joints, with 58 mm joint spacing
and limits of approximately ±70 degrees. Its box-link geometry, mass and friction
are simplified. It represents the planar Gen 2 arrangement; it does not represent
the alternating yaw/pitch mechanism being developed for Gen 3.

Run a short headless simulation from the repository root:

```powershell
.venv/Scripts/python.exe shared/desktop-app/app.py --sim --duration 3
```

Install [shared requirements](../../requirements.txt) first. The
[desktop app](../../desktop-app/README.md) and [web dashboard](../../web-dashboard/README.md)
provide interactive controls and path tools.

Each simulation instance has its own BulletClient and explicit time step.
The URDF path is resolved relative to the module. `simulation_interface.py`
remains as a compatibility import for older code.

Simulation reports describe the model's trajectory. They are not measurements
of physical robot speed, traction or tracking accuracy.

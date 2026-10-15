# Gen 2.1 Planar PyBullet Model

`snake.urdf` has **11 links / 10 all-yaw joints**, with 58 mm link spacing and
software limits of approximately ±70 degrees. It is a simple box-link model;
its mass, contact geometry and friction are not calibrated to the physical robot.
It does not represent Gen 3.0 alternating pitch/yaw mechanics.

Implementation: `shared/surge_control/simulation.py`. The historical
`simulation_interface.py` path forwards to this implementation. URDF loading is
relative to the module, so the caller's working directory does not matter.
Each instance uses a separate BulletClient. Physics time step is explicit.

Run from root: `python shared/desktop-app/app.py --sim --duration 3`.
The web dashboard uses the same model and exposes a Three.js view. GUI mode also
supports PyBullet sliders. These are simulation results, not physical validation.

# SURGE-090 · Desktop Control App (Tkinter)

Native desktop application for controlling the Snake SURGE robot. Built with **Tkinter** and **Matplotlib**, it provides a full control dashboard with path drawing, mathematical path generation, PyBullet simulation integration, live 10-motor telemetry, and path accuracy reporting.

> **Source:** Integrated from the `Snake_SURGE` standalone prototype.

---

## Features

| Feature | Description |
|---|---|
| **GUI Dashboard** | Full Tkinter window (1100×900) with path canvas, telemetry grid, and connection panel |
| **Headless Mode** | Lightweight mode for Raspberry Pi — no GUI, just straight-line slither |
| **Dual Engine** | Switch between PyBullet simulation and ST3215 hardware |
| **Mouse Path Drawing** | Click and drag on the 2D canvas to trace custom paths |
| **Math Path Generator** | Type `sin(x)`, `cos(x)*2`, `exp(-x/5)*sin(x)`, etc. |
| **Zooming Canvas** | Mouse wheel zooms the 2D path canvas in/out |
| **PyBullet Sync** | Simulation sliders in PyBullet 3D window sync back to the Tkinter app |
| **Live Telemetry** | Real-time angle (°), speed, and torque (Nm) for all 10 actuators |
| **Auto-Stop + Report** | Stops when snake reaches path end; pops up Matplotlib accuracy graph |

---

## Usage

### GUI Mode (Laptop / Desktop)

```bash
cd desktop-app
python app.py --gui
```

Opens the full Tkinter dashboard. Choose Simulation or Hardware mode, then:
1. Draw a path with your mouse, or type a math function and click "Generate Path"
2. Click "Connect Engine"
3. Watch the snake follow the path in real-time
4. When the snake reaches the end, an accuracy report auto-opens

### Headless Mode (Raspberry Pi)

```bash
python app.py
```

Runs the snake in a straight line forever using the ST3215 hardware. No GUI libraries needed. Press `Ctrl+C` to stop.

### Headless + Simulation

```bash
python app.py --sim
```

Runs the simulation engine headlessly (useful for testing without hardware or a display).

---

## Dependencies

Requires the `src/` modules from the project root. The app imports:
- `src.snake_locomotion` — Serpenoid gait engine
- `src.path_engine` — Pure pursuit path following
- `src.simulation_interface` — PyBullet digital twin
- `src.st3215_interface` — ST3215 hardware bridge

Additional Python packages:
- `tkinter` (usually bundled with Python)
- `matplotlib` (for accuracy report graphs)
- `pyserial` (for hardware mode)
- `pybullet` (for simulation mode)

---

## See Also

- **Web Dashboard:** [`../web-dashboard/`](../web-dashboard/) — Browser-based alternative (Flask)
- **PyBullet Simulation:** [`../simulation/pybullet/`](../simulation/pybullet/) — Physics engine details
- **App Usage Manual:** [`../../docs/1_APP_USAGE_MANUAL.md`](../../docs/1_APP_USAGE_MANUAL.md) — Detailed operating instructions

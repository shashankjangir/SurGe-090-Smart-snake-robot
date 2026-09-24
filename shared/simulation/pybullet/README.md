# SURGE-090 · PyBullet Physics Simulation (Digital Twin)

Full-physics simulation of the 10-segment snake robot using **PyBullet**. Acts as a digital twin for the hardware — same motor interface, same kinematics engine, but running in a physics sandbox with gravity, friction, and collision.

> **Source:** Integrated from the `Snake_SURGE` standalone prototype.

---

## What's In Here

| File | Description |
|---|---|
| `simulation_interface.py` | PyBullet digital twin (213 lines) — loads URDF, supports GUI + headless modes, anisotropic friction, camera tracking, telemetry readback, 3D state export for Three.js |
| `snake.urdf` | 10-segment snake URDF model with visual, collision, and inertial properties for each link + revolute joints |

---

## Requirements

```bash
pip install pybullet>=3.2.0
```

---

## Usage

### From Python

```python
from simulation_interface import SimulationInterface

sim = SimulationInterface(num_motors=10)

# GUI mode (opens 3D window)
success, msg = sim.connect(headless=False)

# Headless mode (no window, faster)
success, msg = sim.connect(headless=True)
```

### GUI Features (non-headless)

When running with `headless=False`, the PyBullet window provides:
- **Camera tracking** — Follow, Top-Down, or Side views via slider
- **Live tuning sliders** — Amplitude, Frequency, Phase Lag, Motor Force, Friction Ratio
- **Ground grid** with 0.5m spacing and axis indicators
- **Head trail** drawn in purple to visualize the path taken
- **Target path** drawn in blue on the ground plane

### Interface Methods

| Method | Description |
|---|---|
| `connect(headless=False)` | Start PyBullet and load the snake URDF |
| `disconnect()` | Close PyBullet |
| `write_positions(angles_dict, max_force)` | Apply target joint angles and step physics |
| `read_telemetry()` | Get virtual load, velocity, position per joint |
| `get_robot_pose()` | Get (X, Y, Yaw) of the snake head |
| `get_all_segment_positions()` | Get (X, Y) tuples for all segments |
| `get_3d_state()` | Get 3D XYZ + Quaternion for Three.js rendering |
| `read_sliders()` | Read PyBullet GUI slider values |
| `update_physics(fric, pov, zoom, pos)` | Update friction, camera, and draw trails |
| `draw_target_path(path)` | Draw a blue path on the ground |

---

## URDF Model

The `snake.urdf` defines a 10-link chain (link0 through link9) connected by 9 revolute joints:
- **Segment size:** 60mm × 55mm × 55mm boxes
- **Joint limits:** ±1.5 radians (~86°)
- **Mass per segment:** 100g
- **Joint axis:** Z (yaw-only, planar motion)

---

## Integration

This simulation engine is used by:
- **Web Dashboard** (`../../web-dashboard/`) — via headless mode for server-side physics
- **Desktop App** (`../../desktop-app/`) — via GUI mode with live PyBullet window
- Both share the same `SimulationInterface` API as the hardware `ST3215Interface`

---

## See Also

- **Wokwi Simulation:** [`../wokwi/`](../wokwi/) — Browser-based ESP32 simulation with SG90 servos
- **Web Dashboard:** [`../../web-dashboard/`](../../web-dashboard/) — Flask web control dashboard
- **Desktop App:** [`../../desktop-app/`](../../desktop-app/) — Tkinter control suite

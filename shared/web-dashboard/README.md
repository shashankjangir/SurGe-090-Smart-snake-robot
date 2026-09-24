# SURGE-090 · Web Dashboard (Flask)

Browser-based control dashboard for the Snake SURGE robot. Runs a **Flask** web server with a real-time REST API, 2D trajectory canvas, 3D Three.js viewer, motor telemetry, and simulation parameter tuning — all accessible from any device on the network.

> **Source:** Integrated from the `Snake_SURGE` standalone prototype.

---

## Features

| Feature | Description |
|---|---|
| **Dual Engine Support** | Switch between PyBullet simulation and ST3215 hardware via the web UI |
| **2D Path Canvas** | Draw paths with mouse or generate mathematically (`sin(x)`, `cos(x)`, etc.) |
| **3D Snake Viewer** | Three.js-based real-time 3D visualization of the snake (`/3d` route) |
| **Live Telemetry** | Real-time angle, speed, and torque for all 10 motors |
| **Simulation Sliders** | Tune friction, amplitude, frequency, phase lag, motor force, and sim speed |
| **Path Accuracy Report** | Auto-generates accuracy % and deviation metrics when path is completed |
| **System Stats** | Live CPU, RAM, and temperature monitoring (ideal for Raspberry Pi) |
| **Auto-Stop** | Automatically stops and reports when the snake reaches the end of a target path |

---

## Repository Layout

```
web-dashboard/
├── web_app.py              # Flask server + background physics thread
├── requirements.txt        # Python dependencies
├── templates/
│   ├── index.html          # Main dashboard UI
│   └── 3d_viewer.html      # Three.js 3D snake viewer
└── static/
    ├── script.js           # Client-side canvas, API polling, UI logic
    └── style.css           # Dashboard styling
```

---

## Setup

```bash
cd web-dashboard
pip install -r requirements.txt
```

Dependencies: `flask>=2.0.0`, `psutil>=5.8.0`, `pyserial>=3.5`, `pybullet>=3.2.0`

---

## Running

```bash
python web_app.py
```

Opens on **http://localhost:5000**. Access the 3D viewer at **http://localhost:5000/3d**.

> **On Raspberry Pi:** Access from any device on the same Wi-Fi network using `http://<pi-ip>:5000`

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Main dashboard HTML |
| `GET` | `/3d` | Three.js 3D viewer HTML |
| `POST` | `/api/connect` | Connect/disconnect engine (`{"engine": "SIM"` or `"ST3215"}`) |
| `POST` | `/api/params` | Set simulation parameters (`fric`, `amp`, `freq`, `phase`, `force`, `speed`) |
| `POST` | `/api/set_path` | Set target path (`{"path": [[x1,y1], [x2,y2], ...]}`) |
| `GET` | `/api/status` | Get running state, robot pose, telemetry, segments, actual path |
| `GET` | `/api/3d_status` | Get 3D segment positions + quaternions for Three.js |
| `GET` | `/api/system_stats` | Get CPU %, RAM %, and Pi temperature |
| `GET` | `/api/report` | Get path accuracy % and deviation metrics |

> Full protocol details: [`../../docs/API_DOCUMENTATION.md`](../../docs/API_DOCUMENTATION.md)

---

## See Also

- **Desktop App:** [`../desktop-app/`](../desktop-app/) — Tkinter desktop control suite (offline use)
- **PyBullet Simulation:** [`../simulation/pybullet/`](../simulation/pybullet/) — Physics engine details
- **API Documentation:** [`../../docs/API_DOCUMENTATION.md`](../../docs/API_DOCUMENTATION.md) — Serial protocol templates

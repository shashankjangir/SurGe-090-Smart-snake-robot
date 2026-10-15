# Gen 2.1 operating guide

Run commands from the repository root with the Python environment containing
`shared/requirements.txt`. Python 3.11 is the integration environment.

## Web dashboard

`python shared/web-dashboard/web_app.py` binds to 127.0.0.1:5000.
For a trusted local network use `--host 0.0.0.0`; authentication is not implemented.

1. Select Simulation or Hardware. Hardware requires a port such as COM3 or /dev/ttyUSB0.
2. Connect. Connections start stopped; hardware handshake requires `receiver_gen2_1`.
3. Draw/generate a simulation path if wanted, then press Start motion.
4. STOP disables hardware torque through the receiver; disconnect also sends STOP.

Hardware uses manual gait steering. Drawn paths and physical accuracy reports
are unavailable because there is no measured world pose. The simulation path
score is a display metric relative to 0.5 m deviation, not a research accuracy claim.
Slow gait reduces commanded speed; it does not guarantee a current limit.

## Desktop and headless

```sh
python shared/desktop-app/app.py --sim --duration 3
python shared/desktop-app/app.py --gui
python shared/desktop-app/app.py --gui --port COM3
python shared/desktop-app/app.py --hardware --port COM3 --duration 10
```

Default is a 10-second headless simulation. `--duration 0` runs until Ctrl+C.
Tkinter and Matplotlib load only for `--gui`. The desktop Connect and Start
button deliberately starts motion; its STOP button disables torque. Reconnect
to restart. Desktop hardware runs the straight planar gait; drawn paths and reports
are simulation-only. Use the web/gamepad controller for manual steering.

## Gamepad

`python shared/gamepad/controller_node.py` sends to the local dashboard.
Use `--url http://<host>:5000` for a different host.
A=start, B=stop, X=reverse, Y=amplitude preset; left stick steers.
Loss of an active controller stream stops the web runtime after 750 ms.
The receiver separately stops when target packets cease for 750 ms.
Radio delivery and actual stop latency still need hardware measurement.

## Bench tools — physical movement

```sh
python gen2-st3215/tools/align_gen2_1.py --port COM3
python gen2-st3215/tools/sine_gen2_1.py --port COM3 --duration 10
python gen2-st3215/tools/spiral_gen2_1.py --port COM3 --duration 10
```

Alignment requires encoder feedback from all ten motors within 30 counts of centre
for two consecutive samples. A timeout does not report success. All tools request
STOP and close the port in cleanup. Port selection may also use `SURGE_PORT`.

## Other versions

Gen 2.0 `main.py` uses the 1 Mbps transparent bridge, not the Gen 2.1 text receiver.
Gen 2.0 `robot_esp32_v2` generates its own onboard gait. Gen 3.0 is a separate
experiment; its script defaults to printing targets without opening hardware.
See [versions](versions/VERSIONS.md) and [firmware](../gen2-st3215/firmware/README.md).

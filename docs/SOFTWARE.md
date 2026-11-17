# How the software works

The maintained Gen 2.1 and Gen 3 workflows calculate motion on the host. Flask serves the browser interface, and the ESP32 receiver handles the servo bus. The app uses Python, Jinja, plain JavaScript and CSS, PyBullet, and Three.js.

| Location under `generations/gen3-experimental-3d/` | Responsibility |
| --- | --- |
| `backend/web_dashboard/web_app.py` | Pages, API requests and control ownership |
| `backend/web_dashboard/templates/pages/` and `static/pages/` | Screens and their controls |
| `backend/web_dashboard/templates/components/` and `static/components/` | Shared markup and behavior |
| `backend/web_dashboard/static/data/` | Browser requests and saved preferences |
| `backend/surge_control/data/` | Calibration, presets and run-file storage |
| `backend/surge_control/` | Runtime, serial transport, sessions and controllers |
| `gait.py`, `test_3d_snake.py`, `simulation.py` | Gen 3 validation, finite runs and simulation |

The [asset guide](../generations/gen3-experimental-3d/backend/web_dashboard/static/README.md) describes script order and where to make changes. Search for an existing feature before adding a file. Give each file one job.

An operator start request passes through ownership, map and parameter validation. The host opens the selected serial port, exchanges `HELLO`, and requests Stop before operation. `RUN` arms the receiver. Targets carry motor IDs, encoder counts and speed. The host checks feedback and stops on missing responses or sustained tracking faults.

The measured map has 12 joints, calibrated zero and sign values, and joint travel bounds of 796–3300 counts, approximately ±110 degrees. Shared gait amplitudes are capped at 90 degrees and signed gait bias at ±90 degrees. Per-joint limits still constrain the resulting targets. Read the [handoff](GEN3_HANDOFF.md) before changing these values.

Hardware starts with **Dry run** selected. Dry run calculates targets; PyBullet uses simulated contacts and feedback; a physical trial uses real servo responses. Each workspace owns its settings. The simulator's mass, contact and inertia assumptions remain illustrative.

The configured operator names are Shashank, Bhavesh and Mahima. The browser renews the lease every second, with a 30-minute timeout. Viewer records expire after 30 minutes of inactivity. Start retries retain the latest 1,000 request IDs. The login routes share the same secure handler. Keep private credentials outside Git.

Gamepad input requires neutral input before starting, LB held, and A to start. The server-side input-gap timeout is disabled by owner request. Explicit LB release, B and Stop still stop motion. The browser also checks its local controller and connection state. Physical route assistance requires verified fresh localization. Servo angles alone do not locate the robot on the floor. The [controller guide](operations/CONTROLLER_UPGRADES.md) explains these rules.

The receiver and transmitter source lives under `generations/gen2-st3215/firmware/`. The maintained text radio uses ESP-NOW channel 1. Receiver code prioritizes Stop and reports whether torque-off was confirmed, including after its 750 ms target watchdog. The normal command radio has no authentication, encryption or replay protection. See the [API reference](architecture/API_DOCUMENTATION.md).

OTA mode requires local USB entry, disarmed state and confirmed torque-off on the receiver. It blocks control until reboot. The OTA-capable pair was installed on 3 November 2026; subsequent firmware fixes still need installation and physical checks. The [OTA guide](operations/FIRMWARE_OTA.md) covers that procedure.

Runs and saved records live in the generation's `runs/` folder. Writes use atomic file replacement, with validation and locking in the controller. Malformed saved gait presets produce an error rather than being overwritten by defaults. Calibration writes keep backups. CSV records describe joint tracking; ground travel requires a separate measurement.

The [refined dashboard](../generations/gen3-dashboard-refined/README.md) and [legacy Pi package](../generations/rasp_pi/README.md) have separate code, maps, credentials and logs. Their operator leases do not coordinate across servers.

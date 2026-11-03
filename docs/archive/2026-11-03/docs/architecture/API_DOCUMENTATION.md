# SURGE Gen 2.1 serial API

Communication is identical over USB into `receiver_gen2_1` or through `transmitter_gen2_1` (ESP-NOW relay).

## Link settings

- Baud: **115200**
- Line ending: `\n`
- Set **DTR/RTS = false** before open so the ESP32 is not reset on every connect

## Commands

| Command | Response | Notes |
|---|---|---|
| `HELLO` | `SURGE,2.1` | Read-only handshake; required by `shared/surge_control/hardware.py` |
| `RUN` | `OK,RUN` | Arm motion. Position commands ignored until armed |
| `STOP` | `OK,STOP` | Disarm and **torque off** all servos |
| `P,<id>:<pos>:<speed>,...` | *(none)* | `pos` clamped to ±70° ticks (1252–2844); `speed` 1–3400. Speed may be omitted (`id:pos`) → default 2400 |
| `T` | `T,<id>:<load>:<vel>:<pos>,...` | Only motors that respond are listed. Host must not invent missing readings |
| `I,<new_id>` | `ID_SET_OK` | EEPROM ID assign — **one** servo on the bus |

### Watchdog

If armed and no `P` command arrives for **750 ms**, the receiver disables torque (emits `STOP,WATCHDOG`).

### Sensor side-channel

Lines beginning with `T:` (colon, not comma) may carry optional sensor key/value pairs and are parsed separately from motor telemetry `T,`.

## Python entry point

Use the Gen 2.1 interface (no port open at import):

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path("shared").resolve()))
from surge_control.hardware import ST3215Interface

iface = ST3215Interface(port="COM12")  # or SURGE_PORT
ok, msg = iface.connect()
assert ok, msg
iface.start()
iface.write_positions({i: 2048 for i in range(1, 11)}, speed=600)
telem = iface.read_telemetry()  # missing motors stay valid=False
iface.stop()
iface.disconnect()
```

Dashboard (headless-safe import; worker starts only under `__main__`):

```bash
cd generations/gen3-experimental-3d/backend/web_dashboard
python web_app.py
```

## Mechanical scope

This protocol drives the **planar Gen 2 / Gen 2.1** ST3215 chain. Gen 3.0 3D motion CAD and scripts live under `generations/gen3-experimental-3d/` and use this transport only for explicitly selected experimental physical trials; the planar gait/simulator do not represent that mechanism.

## Older Gen 2.0 onboard path

`robot_esp32_v2` uses a different RUN/STOP + ESP-NOW binary telemetry model for onboard CPG. See `generations/gen2-st3215/firmware/robot_esp32_v2/` and `docs/versions/VERSIONS.md`.

Pre-integration API wording is preserved under `removed/pre-gen2.1/docs/architecture/API_DOCUMENTATION.md`.

The handshake/STOP ACK confirms receiver command handling, not a measured torque or motion state. The physical stop path needs bench verification.

## Gen 3 Web REST API

The Gen 3 console exposes dedicated JSON endpoints on /api/gen3/:

| Endpoint | Method | Role | Description |
|---|---|---|---|
| /api/gen3/status | GET | All | Current runtime status, 10-joint telemetry, elapsed duration, operator lease |
| /api/gen3/session | GET | All | Current session role, active operator name, lease expiration time |
| /api/gen3/session/login | POST | All | Operator login with name and shared password (via MorphingButton) |
| /api/gen3/session/logout | POST | Operator | Release operator lease and revert to Viewer |
| /api/gen3/session/heartbeat | POST | Operator | Renew active operator lease (1.0s interval, 3.0s timeout) |
| /api/gen3/start | POST | Operator | Start finite motion trial (requires valid calibrated map) |
| /api/gen3/apply | POST | Operator | Apply live gait tuning parameters (smooth C¹ monotonic transition) |
| /api/gen3/stop | POST | **All** | Emergency safety stop and torque-off (available to Viewers & Operators) |
| /api/gen3/diagnostics | POST | Operator | Query disarmed D bus diagnostics snapshot |
| /api/gen3/center | POST | Operator | Centering maintenance for uncoupled motor output shafts |
| /api/gen3/presets | GET/POST | Viewer (read), Operator (save/delete) | Manage gait presets |
| /api/gen3/runs | GET | All | Run journal history with CSV/JSON log links |
| /api/gen3/runs/<id>/annotate | POST | Operator | Record manual trial annotations (displacement in cm, surface, notes) |
| /api/gen3/firmware/build | POST | Operator | Trigger allowlisted PlatformIO compilation |
| /api/gen3/firmware/upload | POST | Operator | Triple-confirmed firmware upload (executes in safe mock mode) |


---

## Protocol V3 Security Architecture & Authentication (October 2026)

### Authenticated Radio Text Framing
For wireless communication over ESP-NOW, privileged commands are signed by `transmitter_gen2_1` using RFC 2104 HMAC-SHA256:
```
AUTH,<seq>,<tag_hex_16>,<raw_command>
```
- `<seq>`: Monotonically increasing sequence number.
- `<tag_hex_16>`: 16-character hex string representing the first 8 bytes of `HMAC-SHA256(key, "<seq>:<raw_command>")`.
- `<raw_command>`: The underlying command (`HELLO`, `RUN`, `P,...`, `T`, `D`, `MAINT,UNLOCK,CONFIRM`, `I,...`).
- `STOP`: Can be sent in raw unauthenticated format for immediate fail-safe emergency torque cutoff.

### Maintenance Authorization Gating
- `I,<new_id>` (EEPROM servo ID assignment) returns `ERR,MAINTENANCE_LOCKED` unless preceded by `MAINT,UNLOCK,CONFIRM`.
- The maintenance window expires after **15 seconds** and re-locks immediately upon successful servo ID assignment (single-use).

### Watchdog Separation
- Repeated `RUN` commands return `OK,RUN,ALREADY_ARMED` and do not reset the position watchdog.
- Only accepted and applied `P,` target frames refresh the 750 ms position freshness timer.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**Gen 3 control console (1–2 Nov).**
- Saved `joint_map.json`: speed 1500, `tracking_error` **216** (was 100), timeout 0.5 s; sign map
  unchanged (pitch ID 1 = 1, IDs 3/5/7/9 = −1, yaw = 1). Software now accepts speed 1–3000
  counts/s; 3000 is a command ceiling, not a measured capability.
- Live telemetry: each joint shows error, peak error and a 2 s error-trend sparkline recorded at
  the 20 Hz loop rate. Colours now use the running job's real limit (fixed a hard-coded 25-count bug).
- Per-joint control: new pose mode (Move to Pose, hold 2–300 s, return to neutral) and per-joint
  gait overrides (enabled, gain 0–2, phase ±180°, bias ±70°), all limit-checked before start.
- Shape presets (Straight, Head raised, Cobra stand, Cobra stand tall, Ring near-closed, S-curve rest)
  and Caterpillar crawl presets (10° commissioning, 20°). Tuned in simulation only.
- Controls has a 3D Gait Preset selector that loads the draft only; it never starts motion.
- Transmitter COM port is recommended from the USB socket and remembered in
  `transmitter_port.json` (gitignored).

**API changes (uncommitted).**
- `/api/system_stats` now returns a `battery` object (percent, colour, stale/N/A state).
- Gen 3 job start accepts `mode: 'pose'` with pose targets, and `joints` per-joint gait overrides. Both are saved in the run manifest.
- The Gen 3 ports listing includes a `recommended` transmitter port; the chosen port is remembered.

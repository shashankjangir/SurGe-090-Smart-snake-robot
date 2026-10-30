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
cd shared/web-dashboard
python web_app.py
```

## Mechanical scope

This protocol drives the **planar Gen 2 / Gen 2.1** ST3215 chain. Gen 3.0 3D motion CAD and scripts live under `gen3-experimental-3d/` and use this transport only for explicitly selected experimental physical trials; the planar gait/simulator do not represent that mechanism.

## Older Gen 2.0 onboard path

`robot_esp32_v2` uses a different RUN/STOP + ESP-NOW binary telemetry model for onboard CPG. See `gen2-st3215/firmware/robot_esp32_v2/` and `docs/versions/VERSIONS.md`.

Pre-integration API wording is preserved under `removed/pre-gen2.1/docs/API_DOCUMENTATION.md`.

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

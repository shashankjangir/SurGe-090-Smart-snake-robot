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

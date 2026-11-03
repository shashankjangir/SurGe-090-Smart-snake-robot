# Receiver commands and web interfaces

This is the interface I use for the maintained Gen 2.1/Gen 3 host system. It is not the binary protocol of the earlier onboard robot firmware.

## USB and radio transport

USB uses 115200 baud with newline-delimited text. The host interface sets DTR and RTS false before opening the port. Wireless commands go through the transmitter on ESP-NOW channel 1. The receiver accepts known commands in plain text; there is no authenticated command channel.

The implementation is [hardware.py](../../generations/gen3-experimental-3d/backend/surge_control/hardware.py). Neither importing it nor starting the web server opens a serial port.

| Command | Meaning and response |
| --- | --- |
| HELLO | Identification reply SURGE,2.1 |
| RUN | Arms target acceptance; OK,RUN or OK,RUN,ALREADY_ARMED |
| STOP | Disarms and requests torque-off on all ten motors; OK,STOP only when confirmed |
| P,id:position:speed,... | Validates the whole target frame, clamps position to 1252–2844 and writes the servos |
| T | Motor feedback as T,id:load:velocity:position,... |
| D | Stopped-only diagnostic registers, torque, voltage, temperature and status |
| MAINT,UNLOCK,CONFIRM | Opens the stopped EEPROM maintenance window for 15 seconds |
| I,new_id | One-servo ID programming, allowed only after maintenance unlock; relocks afterward |
| OTA | Local USB maintenance entry on the receiving board itself |

Omitting speed in P uses the receiver default 2400. The protocol permits speeds 1–3400; Gen 3 validates its own 1–3000 command envelope and the current map saves 1500. Those are three different settings.

Unarmed position frames are ignored. Duplicate IDs, invalid targets or servo faults stop the receiver. Missing acknowledgements are checked against fresh register read-back where supported; failed or mismatched reads do not count as success.

STOP can return ERR,STOP,TORQUE_OFF_UNCONFIRMED. A software acknowledgement does not certify that the unsupported body cannot fall. The receiver's 750 ms target watchdog disables torque and emits STOP,WATCHDOG if armed targets stop arriving.

## Diagnostics and missing data

T includes only motors with valid feedback. The host represents missing readings as invalid; it does not fill them with 2048. D reports id:register8:torque:voltage_raw:temperature_raw:status entries. It rejects an armed request and does not unlock or write EEPROM.

Optional sensor lines start with T: rather than T,. They are separate from motor feedback. A sensor packet is not automatically a trusted robot pose.

## Web interfaces

The Flask routes are defined in [web_app.py](../../generations/gen3-experimental-3d/backend/web_dashboard/web_app.py). The two pages share operator ownership and Stop behaviour.

| Route family | Purpose |
| --- | --- |
| /api/gen3/status | Current Gen 3 job, state and feedback |
| /api/gen3/session | Session state; login, heartbeat and ownership use its subroutes |
| /api/ports and /api/gen3/ports | Serial-port discovery |
| /api/gen3/ | Calibration, commissioning, finite trials, runs and firmware operations |
| /api/controller and /api/gen3/controller | Controller input for each runtime |
| /api/localization | Explicitly verified external pose input |
| /api/system_stats | Host stats and sampled diagnostic battery estimate |

The route families above describe source organisation, not interchangeable request payloads. Read the matching route function and tests before writing an API client. Mutations need the appropriate operator/session checks; public Stop remains available. Do not replace the browser's ownership and confirmation sequence with an unauthenticated script.

See [software](../SOFTWARE.md) for runtime ownership and [OTA](../operations/FIRMWARE_OTA.md) for update commands.

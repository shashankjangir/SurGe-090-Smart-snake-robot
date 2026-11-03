# Gen 2 software checks

The receiver/transmitter C++ harnesses also cover USB-only OTA entry, armed and
torque-off refusal, AP startup failure, command blocking and upload-error lockout.
`test_ota_credentials.cpp` checks that empty credentials cannot enable OTA:

```powershell
g++ -std=c++17 -I generations/gen2-st3215/tests/firmware_stubs generations/gen2-st3215/tests/test_ota_credentials.cpp -o "$env:TEMP/surge-ota-test.exe"
& "$env:TEMP/surge-ota-test.exe"
```

From the repository root, run the hardware-free Python suite:

```powershell
python -m unittest discover -s generations/gen2-st3215/tests -v
python generations/gen2-st3215/main.py --mock --duration 1
```

`test_motor_feedback.py` and `test_st3215_ping.py` remain explicit live tools.
Discovery does not call them or open serial ports. The offline suite tests
packet framing, echoes, error replies, missing feedback, cleanup, ID assignment,
gait limits, experimental controls and the Gen 2.1 terminal transport.

With a C++17 compiler on PATH, compile the actual firmware against the minimal
clock/serial/servo doubles in `firmware_stubs`:

```powershell
g++ -std=c++17 generations/gen2-st3215/tests/test_text_auth.cpp -o "$env:TEMP/surge-text-auth-test.exe"
& "$env:TEMP/surge-text-auth-test.exe"

g++ -std=c++17 -I generations/gen2-st3215/tests/firmware_stubs generations/gen2-st3215/tests/test_firmware.cpp -o "$env:TEMP/surge-firmware-test.exe"
& "$env:TEMP/surge-firmware-test.exe"
g++ -std=c++17 -I generations/gen2-st3215/tests/firmware_stubs generations/gen2-st3215/tests/test_receiver.cpp -o "$env:TEMP/surge-receiver-test.exe"
& "$env:TEMP/surge-receiver-test.exe"
g++ -std=c++17 -I generations/gen2-st3215/tests/firmware_stubs generations/gen2-st3215/tests/test_transmitter.cpp -o "$env:TEMP/surge-transmitter-test.exe"
& "$env:TEMP/surge-transmitter-test.exe"
g++ -std=c++17 -I generations/gen2-st3215/tests/firmware_stubs generations/gen2-st3215/tests/test_legacy_firmware.cpp -o "$env:TEMP/surge-legacy-test.exe"
& "$env:TEMP/surge-legacy-test.exe"
g++ -std=c++17 -I generations/gen2-st3215/tests/firmware_stubs generations/gen2-st3215/tests/test_sweep.cpp -o "$env:TEMP/surge-sweep-test.exe"
& "$env:TEMP/surge-sweep-test.exe"
```

These execute startup, STOP priority, first-frame ramping, feedback-loss stops,
clock wrap, fragmented/oversized lines, atomic target validation, joint limits,
servo faults and watchdog expiry. They do not model electrical timing, real
radio concurrency, mechanical clearance or calibrated loads.

Build all ESP32 environments, without uploading:

```powershell
pio run
```

The shared app regression suite is separate:

```powershell
python -m unittest discover -s tests -v
```

Use Python 3.11 with `generations/gen3-experimental-3d/backend/web_dashboard/requirements.txt` for its Flask and PyBullet checks.
Bench hardware requires `usb_servo_bridge`; text-protocol tools require the
Gen 2.1 receiver. Do not mix those transports.

## Verification on 21 October 2026

- 21 Gen 2 offline Python tests passed.
- 25 shared integration tests passed under Python 3.11, including PyBullet.
- All four native firmware test programs passed with GCC 13.2.
- Gen 2 Python sources passed syntax parsing; all 30 CAD file hashes were unchanged.
- ESP32 compilation could not complete: PlatformIO's Xtensa toolchain download
  failed across mirrors with truncated transfers, DNS failures and timeouts.
  Native tests do not establish ESP32 build compatibility or physical safety.
- No board was flashed and no physical motor, sensor or radio was exercised.

The existing local `.venv` points to a missing interpreter. Integration checks
used an available Python 3.11 interpreter with the already-installed packages;
recreate the local environment before using the README's `.venv` launch commands.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**Gen 2.1 radio firmware (31 Oct).**
- Fixed `surge_sign_text_command`: it returned `bool` but its caller used the value as the packet
  length, so only one byte was sent. It now returns the full length.
- At the owner's request, all wireless commands now use **plain text**. Transport was adapted from partner
  repo `Snake_SURGE` commit `7d80490`. The receiver accepts known commands without HMAC, sequence or MAC
  allowlist; use only in a controlled environment.
- Kept: watchdog Stop, torque-off read-back, joint limits, queue-overflow Stop, packet bounds/printable
  checks and EEPROM maintenance lock.
- Both boards were uploaded with servo power disconnected. **COM6 = receiver** (`28:05:a5:4f:e5:ac`),
  **COM7 = PC transmitter** (`68:09:47:5c:10:ec`). HELLO → `SURGE,2.1` exchanges passed, including after
  a transmitter-only reset. Use COM7 for the dashboard.
- `platformio.ini` transmitter monitor: `send_on_enter`, LF line endings.
- New `tests/test_text_auth.cpp` compiles for ESP32. It was not run on the host because no host compiler is installed.

`test_text_auth.cpp` (signed-packet length regression) has been added and is listed above. On this PC it was only
compiled for ESP32, because there is no host g++.

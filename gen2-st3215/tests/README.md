# Gen 2 software checks

From the repository root, run the hardware-free Python suite:

```powershell
python -m unittest discover -s gen2-st3215/tests -v
python gen2-st3215/main.py --mock --duration 1
```

`test_motor_feedback.py` and `test_st3215_ping.py` remain explicit live tools.
Discovery does not call them or open serial ports. The offline suite tests
packet framing, echoes, error replies, missing feedback, cleanup, ID assignment,
gait limits, experimental controls and the Gen 2.1 terminal transport.

With a C++17 compiler on PATH, compile the actual firmware against the minimal
clock/serial/servo doubles in `firmware_stubs`:

```powershell
g++ -std=c++17 -I gen2-st3215/tests/firmware_stubs gen2-st3215/tests/test_firmware.cpp -o "$env:TEMP/surge-firmware-test.exe"
& "$env:TEMP/surge-firmware-test.exe"
g++ -std=c++17 -I gen2-st3215/tests/firmware_stubs gen2-st3215/tests/test_receiver.cpp -o "$env:TEMP/surge-receiver-test.exe"
& "$env:TEMP/surge-receiver-test.exe"
g++ -std=c++17 -I gen2-st3215/tests/firmware_stubs gen2-st3215/tests/test_legacy_firmware.cpp -o "$env:TEMP/surge-legacy-test.exe"
& "$env:TEMP/surge-legacy-test.exe"
g++ -std=c++17 -I gen2-st3215/tests/firmware_stubs gen2-st3215/tests/test_sweep.cpp -o "$env:TEMP/surge-sweep-test.exe"
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

Use Python 3.11 with `shared/requirements.txt` for its Flask and PyBullet checks.
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

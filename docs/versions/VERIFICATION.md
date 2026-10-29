> **Archive restored — 16 October 2026:** Both bundles are valid and the original
> source snapshot is complete again (66/66 SHA-256 matches). The earlier missing
> archive notes below describe the previous sync. See [archive audit](../../removed/AUDIT.md).
> This update used targeted integrity checks, not a rerun of the full test suite.

## GitHub sync check — 16 October 2026

- Regression suite: **24 passed, 1 skipped**. The skipped test needs the original
  incoming archive, now absent locally. No failing tests.
- Gen 1: 347 tracked files match the pre-integration Git objects, including Git
  line-ending normalization. No Gen 1 files changed.
- JavaScript syntax and active tracked-file whitespace checks passed.
- Nine new JPEGs inspected and selected for upload: 10.88 MiB total; largest
  2.39 MiB. No videos present. No new upload candidate exceeds 10 MiB.
- Forty missing CAD reference parts recovered byte-for-byte from the baseline
  into `removed/pre-gen2.1/`, preserving the current active-tree organization.
- Gen 2.0 / 2.1 working status is maintainer-confirmed; Gen 3.0 is in development.
- No firmware changes or uploads in this sync; earlier build results follow.

> **16 October update:** The results below record the 15 October recheck.
> The original full local archive is now absent; its preservation check cannot
> currently be repeated. See [archive availability](../../removed/INDEX.md).
> The maintainer now confirms Gen 2.0 and Gen 2.1 are working in project trials;
> hardware behavior was not independently measured during this GitHub sync.

# Gen 2.1 integration verification — 15 October 2026

## Checks completed

- 25 regression tests passed using Python 3.11.7 in `.venv`, including API pages,
  runtime timing and stop behavior, transport validation, measured alignment,
  preservation hashes, and independent real PyBullet clients.
- Headless desktop simulation completed a finite one-second run successfully.
- Gen 3.0 experimental script completed its default dry run without hardware.
- All 60 Python sources in the generation, shared and test folders parsed.
- Dashboard JavaScript passed `node --check`; templates have no duplicate IDs.
- Four new PlatformIO targets compiled successfully: `receiver_gen2_1`,
  `transmitter_gen2_1`, `sensor_gen2_1`, and `get_mac_oled`.
- Receiver rebuilt successfully after correcting SCServo acknowledgement handling:
  failed target/torque writes now request a stop rather than count as success.
- Gen 1 and the complete archived source checkout match recorded SHA-256 hashes.
  Preserved copies of the original active files also match their recorded hashes.
- Both baseline Git bundles verified; no files were deleted or firmware uploaded.

## Reproduce software checks

Run from the repository root in PowerShell:

```powershell
.venv/Scripts/python.exe -X utf8 -B -m unittest discover -s tests -v
.venv/Scripts/python.exe -X utf8 -B shared/desktop-app/app.py --sim --duration 1
.venv/Scripts/python.exe -X utf8 -B gen3-experimental-3d/test_3d_snake.py
node --check shared/web-dashboard/static/script.js
pio run -e receiver_gen2_1 -e transmitter_gen2_1 -e sensor_gen2_1 -e get_mac_oled
```

The firmware build used Espressif32 7.0.1 / Arduino ESP32 2.0.17. Compilation
and mocked transport checks do not establish physical actuator behavior.

## Remaining validation

Physical servo motion, radio reliability, emergency stop behavior, power delivery,
protection thresholds and timing require a controlled hardware bench check. Gen 2.1
does not inherit the Gen 2.0 battery/temperature stops or evasion state machine.
Desktop GUI and browser visual behavior have not been interactively validated.
CAD and binary documents were inventoried and preserved, not geometrically or
visually certified. The generic simulation is not a validated mechanical twin.
See [recheck scope](RECHECK.md) and [versions](VERSIONS.md).

## October 2026 Verification Addendum: Unified Dashboard & Frontend Audit

### Reproduce Current Software Checks
From repository root in PowerShell:

```powershell
# 1. Frontend component & visual verification (30/30 suites)
node --test gen3-experimental-3d/tests/*.cjs

# 2. Backend console & hardening verification (39 tests)
python -m unittest gen3-experimental-3d/tests/test_console.py gen3-experimental-3d/tests/test_console_hardening.py

# 3. Planar Gen 2.1 regressions (31 tests)
python tests/test_gen2_1.py

# 4. Launch unified web server
conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```

Verification status: Full audit completed in `docs/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md`. 96.0% implementation pass rate, zero console errors, zero horizontal overflow across 320px–1440px viewports, and persistent emergency Stop controls verified.


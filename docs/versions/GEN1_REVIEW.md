# Gen 1 review — 16 October 2026

The Gen 1 overview now follows the same project-history style as the main README.
It presents the original ten-motor architecture, explains the move to ST3215,
and links the original reports, CAD and media. Procurement and test history
remain in the original records; the overview does not claim a fully tested build.

The source review confirmed that odd IDs receive the yaw wave while even IDs
hold centre, `main.py` calls the Dynamixel SDK directly, and `servo_driver.py`
is a mock implementation outside that entry point. The README now records the
fixed serial-port defaults, immediate torque enabling and live nature of the
hardware scripts under `tests/`.

Known limitations remain in the original code: failed current reads become zero,
initialization does not require every motor to respond, torque enabling precedes
the loop cleanup block, the loop delay does not guarantee 50 Hz, and current sign
does not establish obstacle side. This was a documentation review, not a firmware
or controller retrofit.

## Checks

- All 20 Python files parse successfully; no hardware entry points were run.
- Every local link in the refreshed README resolves.
- The targeted Gen 1 preservation test passes.
- All 348 original SHA-256 entries match, using the archived original README
  for that entry and the existing Gen 1 paths for the others.
- Source, CAD, reports, presentation assets and media were not modified.
- CAD geometry, PDF/PPTX rendering and physical actuator behavior were not tested.
- The full regression suite was not rerun.

The original overview is at
[removed/pre-gen1-docs-2026-10-16/gen1-dynamixel/README.md](../../removed/pre-gen1-docs-2026-10-16/gen1-dynamixel/README.md).
Original baseline manifests remain unchanged. The preservation test now explicitly
checks that archived overview alongside the unchanged original project files.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**Gen 1 status.** Gen 1 (Dynamixel XL330, Raspberry Pi) is archived. No Gen 1 files have changed since
commit `2782bf9` (16 Oct 2026). Active work is Gen 2.1 firmware (ESP-NOW radio) and Gen 3 (3D ST3215
snake, web console, CAD simulation); see `docs/GEN3_HANDOFF.md`.

# Workspace separation verification

3 November 2026. Implementation is uncommitted. No physical port was opened and
no hardware motion or firmware upload was performed. The browser harness makes
physical Gen 3 transport raise immediately; Gen 2.1 hardware Connect is intercepted.

## Automated checks

Run from the repository root:

```powershell
node --test generations/gen3-experimental-3d/tests/*.cjs
conda run -n surge python -B -m unittest discover -s generations/gen3-experimental-3d/tests
conda run -n surge python -B -m unittest discover -s tests
conda run --no-capture-output -n surge python -B generations/gen3-experimental-3d/tests/test_manual_browser.py
conda run --no-capture-output -n surge python -B generations/gen3-experimental-3d/tests/test_gen3_navigation_browser.py
```

Results: 58 Node tests passed; 148 Gen 3 Python tests passed; 60 shared tests
passed with two existing skips. Playwright was installed in the existing surge
environment for explicit browser checks; application dependencies did not change.

The manual-browser script uses a browser gamepad shim, real Gen 3 PyBullet and
an isolated map/run directory. It verifies moving PyBullet links with controller
route assistance, RT/stick streaming, LB-release Stop, Hardware mathematical
preview, Gen 2.1 SIM, and intercepted Hardware Connect with engine ST3215/COM7.
It verifies Simulation preset loading preserves Hardware draft, explicit copy
preserves Hardware speed, execution filter persistence, missing-port refusal,
cleared disconnected feedback and header geometry. No page errors or horizontal
overflow at 1280, 390 and 320 pixels. Existing navigation-browser checks passed
for CAD, routes, fullscreen Stop, drawing, WebGL fallback and 320–1440 pixels.

## Captures

- `simulation-controller-{1280,390,320}.png`: real Gen 3 simulation with controller.
- `hardware-controller-{1280,390,320}.png`: Gen 3 Hardware workspace in Dry run.
- `gen21-simulation-controller-{1280,390,320}.png`: Gen 2.1 SIM controller.
- `gen21-hardware-{1280,390}.png`: Gen 2.1 Hardware disconnected, intercepted Connect.
- `browser-results.json`: captured motion requests and page errors.
- `hero-{1280,390}.json`: compact header containment geometry.

The Impeccable reviewer scored its reported fixes resolved: offline feedback
ownership, truthful helper text, hidden Simulation-only help and Hardware header
containment. Existing visual identity remains. The Gen 2.1 switch uses the
transitions.dev CSS snippet and reduced-motion guard; GSAP is unnecessary for
this interaction and the previously removed bundle remains absent.

## Limits

No supervised physical trial or real gamepad-device mapping trial. No firmware
changes. Existing generated `distorted-glass-filter` SVG ID duplication remains
outside scope; new template/controller IDs are unique. The design detector also
reports incumbent contrast/decorative rules, and DESIGN.md differs from the
implemented incumbent palette; these were recorded without an unrelated redesign.
Motion was checked through the live workflow and reduced-motion CSS, not replayed
at 10% speed in DevTools. Physical calibration/settings are preserved: speed1500,
tracking error216, timeout0.5, pitch ID1 sign+1, remaining pitch signs−1, yaw+1.

# Dashboard integration audit — 29 October 2026

Scope: local dashboard code, offline mocks, and headless PyBullet. No serial port was opened, no motor was actuated, and `joint_map.json` was not changed. Before and after SHA-256: `42ab1c641269594bb35fd4f26a373e34fe54600fbff09a5bd59df33c59f73836`.

## Numbered request audit

| Item | Result |
| --- | --- |
| 1 | One persistent general Stop is present on each dashboard. It stays clickable over the Gen 3 confirmation dialog at 320, 768, 1024, and 1440 px. |
| 2 | Gen 2.1 telemetry is below live tracking in the same page. |
| 3 | A 0.5 m line and a sine-shaped curve completed in headless PyBullet. The original 1 m line now stops as stalled instead of circling indefinitely; a loop and figure-eight also stalled. Controller tracking remains unresolved for those paths. |
| 4 | The interim report opens after 20% verified ordered arc length and identifies its score as simulation visualization, with formula and sample count. It is not physical accuracy. |
| 5 | Embedded viewer controls occupy areas above/below the canvas. Keyboard waypoint entry and a mock preview/apply were exercised. Physical touch drawing was not tested. |
| 6 | Backend tests require an operator for both planar engines and motion commands; Stop remains public. |
| 7 | Team cards and changed diagnostic surfaces have black outlines. A complete audit of every information card is outstanding. |
| 8 | The bounded math generator includes additional presets, scale/bounds, preview, cancellation, and a constrained expression parser. |
| 9 | Hero Start, Stop, Trace Trajectory, and 3D Viewer actions were removed; operational controls remain elsewhere. |
| 10 | The ribbon image is centered and faded behind the hero content. |
| 11 | The redundant Gen 2.1 hero information badge/tagline was removed; generation hover/focus descriptions remain. |
| 12 | The Gen 3 simulation settings column is wider on large screens; controls and preset form were inspected at four widths. |
| 13 | Preset creation uses the simulation gait definitions with current draft speed, ramp, and duration; explicit replacement and stale-snapshot rejection protect existing presets. |
| 14 | Simulation settings use the shared card, labels, and range styling, retaining the existing fields and units. |
| 15 | Gen 3 form overrides no longer whiten the password input or ticker pause control; the ribbon border causing the stray line was removed. |
| 16 | Gen 3 has an operator-controlled headless simulation connection lifecycle, including Stop, disconnect, and failure states. |
| 17 | Four local browser navigation observations, including automation overhead, were 333–369 ms until Stop was visible. There is no pre-change baseline or representative slow-device measurement, so the lag request remains open; no loading layer was added. |
| 18 | Operator selector starts with an unselected placeholder. |
| 19 | Header Stop and duplicate Viewer name were removed; operator name uses the orange and purple badge. |
| 20 | The map table and saved speed/tracking settings share a responsive layout, retaining revision and physical verification. |
| 21 | Simulation tracking error and timeout are verified, range-checked, request-scoped, and logged; map bytes remain unchanged. |
| 22 | Free-shaft and single-joint jog panels are arranged beneath the map/settings area and stack on mobile. |
| 23 | The Stop beside the Gen 3 firmware tab was removed; persistent Stop remains. |

The live 3D viewer uses a fixed world-ground grid. The old test claiming a 64-visible-cell guarantee inspected the hidden 2D canvas rather than the embedded viewer and was removed. The visible 64-cell guarantee remains unverified, especially under zoom and pan.

## Verification

- `conda run --no-capture-output -n surge python tests/test_gen2_1.py`: 43 tests passed, including headless runs.
- `conda run --no-capture-output -n surge python -m unittest gen3-experimental-3d/tests/test_console.py gen3-experimental-3d/tests/test_console_hardening.py gen3-experimental-3d/tests/test_web.py`: 54 tests passed.
- `node --test gen3-experimental-3d/tests/*.cjs`: 32 suites passed.
- Repeated headless paths: sine-shaped curve completed at 9.68 simulated seconds; closed circle stalled at 56.76 seconds with 7.96% verified progress; figure-eight stalled at 32.90 seconds with 16.41% verified progress. These are simulator outcomes, not physical validation.
- Both pages were inspected at 320, 768, 1024, and 1440 px. Stop was hit-tested at each width; the Gen 3 factor-confirmation dialog was also open during a second four-width Stop check. The operator name, viewer mode, login/logout, and simulation connect/run/Stop/disconnect were exercised against a temporary backend in earlier checks.
- The map verification dialog was opened and cancelled using a temporary map. No calibration save or hardware command was sent.
- Reduced-motion behavior and touch drawing were not exercised on real devices; pre-change and slow-device page-switch timings were not measured. The design detector returned findings requiring a broader visual audit.

## Repeated mistake investigation

The committed `4959334` versions contain two examples of settings confirmation that did not reflect the effective action: Gen 2.1 applied on slider input and showed success after request failure, while Gen 3 mutated effective settings on slider input before its confirmation. Both now keep edits as drafts until Apply/Confirm. `test_sim_settings_behavior.cjs` exercises failed, cancelled, and confirmed actions; it fails against each actual historical source and passes on the current code. This uses the state owner and behavioral tests rather than an instruction-only rule.

The former 64-cell assertion checked an unused hidden 2D implementation, and former hero-control checks required controls that the current brief removes. These are examples of source-presence checks passing or failing independently of the visible behavior. The obsolete checks were removed; no automated browser test was added because this repository does not currently provide a browser-test runtime or CI test workflow. The in-browser Stop and grid findings above are manual observations, not CI guarantees.

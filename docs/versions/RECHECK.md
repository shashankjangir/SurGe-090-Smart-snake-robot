> **Archive restored — 16 October 2026:** Both bundles are valid and the original
> source snapshot is complete again (66/66 SHA-256 matches). The earlier missing
> archive notes below describe the previous sync. See [archive audit](../../removed/AUDIT.md).
> This update used targeted integrity checks, not a rerun of the full test suite.

> **16 October update:** The results below record the 15 October recheck.
> The original full local archive is now absent; its preservation check cannot
> currently be repeated. See [archive availability](../../removed/INDEX.md).
> The maintainer now confirms Gen 2.0 and Gen 2.1 are working in project trials;
> hardware behavior was not independently measured during this GitHub sync.

# Whole-folder recheck scope — 15 October 2026

The integration keeps Gen 1 intact, retains planar Gen 2.0, adds the Gen 2.1 host
stack, and separates Gen 3.0 3D experiments. Nothing is discarded. See INDEX under
`removed/` for source snapshots, old active files, Git bundles and hashes.

## Findings addressed

- Shared app imports, matching gait return type and consistent tick/radian limits.
- Explicit URDF path, 10 joints / 11 links, separate physics clients and time step.
- Headless startup, optional GUI dependencies, explicit serial port selection.
- Version handshake, wireless handshake/ACK forwarding, RUN and torque-off STOP.
- Receiver torque enable on targets, requested speeds, malformed-target rejection,
  radio command queue, bounded serial wait, and watchdog timestamp rollover logic.
- Single gait-clock increment, preset application, controller timeout, paused path
  completion without busy looping, and serialized API/worker access.
- Valid/missing servo readings and separate sensor frames with sample age.
- Hardware localization claims removed; path tracking/reports remain simulation-only.
- Encoder-based alignment, cleanup on failures, and experimental dry-run default.
- Active instructions reconciled with entry points and firmware roles.

## Retained limitations

- Gen 2.0 source remains a design baseline; previous parser/soft-start limitations
  are not claimed fixed by changes to the separate Gen 2.1 package.
- Gen 2.1 does not inherit Gen 2.0 battery/temperature stops or its evasion FSM.
- Physical servo operation, radio transport, protection thresholds and timings
  require bench validation. No firmware was uploaded in this task.
- CAD, STEP/SolidWorks, PDF, PPTX and video artifacts were inventoried/preserved;
  this is not an exhaustive geometric, document-layout or footage validation.
- Old docs in `removed/` are archival, may conflict with current designs and must
  not be used as build instructions. Historical credentials remain in preserved
  originals; active sensor firmware uses a configurable setup password.
- Browser 3D/font resources still use CDNs; offline-browser support is not complete.
- LLM autonomy remains a documented proposal. Interview preparation is out of scope.

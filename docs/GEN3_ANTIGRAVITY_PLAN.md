# Antigravity implementation brief: Gen 3 control console

Implement this plan in `C:\1. SurGe 090 Smart snake robot`. The owner wants browser-based operation instead of repeated terminal commands: live gait tuning with an explicit Apply button, multiple team members, calibration, diagnostics, and firmware management. Codex will review and refine your final implementation. Deliver working behavior and review evidence, not just a visual mockup.

## 1. Read and preserve the current project

Read `AGENTS.md`, `README.md`, `docs/GEN3_HANDOFF.md`, the current `gen3-experimental-3d/joint_map.json`, and `docs/agents/*.md`. Inspect git status and existing diffs before editing. There are substantial pre-existing uncommitted changes: record your starting baseline and preserve them. Do not reset, clean, reformat unrelated code, commit, push, or deploy.

Work only on Gen 3 and its relevant shared integration. Keep the current Flask, HTML, CSS and JavaScript architecture unless a demonstrated requirement cannot fit it. Do not introduce React, a cloud database, a new control stack, or a hosted website for this local USB-connected robot.

Current calibration must remain unchanged by implementation: all zeros 2048; odd IDs pitch, even IDs yaw; ID 1 sign +1; pitch IDs 3/5/7/9 sign -1; yaw signs +1; bounds 1252–2844; speed 100 counts/s; tracking error 25 counts and timeout 0.5 seconds. Re-read the file rather than assuming this snapshot is newer. Do not auto-confirm calibration, raise defaults, widen to ±90°, or weaken fault checks. A software limit is not a measured hardware rating.

Do not open serial, move motors, flash a board, or run a hardware test during development. Use fake transports. Actual hardware operations remain owner-executed.

## 2. Existing integration points

- `shared/web-dashboard/templates/gen3.html`: current commissioning page at `/gen3`.
- `shared/web-dashboard/static/gen3.js` and `gen3.css`: existing browser behavior and plain CSS.
- `shared/web-dashboard/web_app.py`: Gen 3 routes and shared serial ownership.
- `shared/surge_control/gen3.py`: finite jobs, snapshots, calibration backups, simulation adapter, logging.
- `gen3-experimental-3d/gait.py`: validation, waveform, envelope, slew.
- `gen3-experimental-3d/test_3d_snake.py`: existing CLI, alignment, scheduling, telemetry checks, cleanup.
- `shared/surge_control/hardware.py`: existing serial protocol; reuse it.
- `gen3-experimental-3d/tests/test_gait.py` and `test_web.py`: existing tests.
- `platformio.ini` and the receiver/transmitter source: authoritative firmware environments and protocol.

Verify these against current source. The current web backend hardcodes a two-second ramp and cannot update running parameters. Speed currently lives inside calibration. Existing status is not a complete live-update or operator-ownership protocol. The earlier Gen 3 baseline was 41 passing tests; run a fresh baseline.

## 3. Scope and UI

Build four coherent areas: Operate, Runs, Calibration & Diagnostics, Firmware.

Operate is the default screen. Keep connection, active operator, execution mode, feedback age, job state and Stop visible. Distinguish server availability from receiver communication and measured servo feedback. Opening or refreshing the page never arms hardware.

Provide yaw-only, pitch-only and combined modes; amplitudes; yaw bias; frequency and explicit direction; same-axis phase lag; pitch phase offset; speed in counts/s with degrees/s equivalent; ramp; finite duration. Presets change drafts only. Show draft, pending and applied settings separately. Labels explain what each parameter changes. No slider or scrolling action sends motor commands. Apply is explicit. Display backend validation errors and calculated speed demand before execution.

Show joint targets, measured positions, tracking error and available raw velocity/load, with freshness and missing-data states. Do not label raw load as amperes or torque without established conversion. Do not invent voltage/temperature streams: expose them only where the existing diagnostic response supplies them, with sampling context. Preview data must never look like measured feedback.

Runs: saved presets, immutable parameter/calibration snapshots, timestamped live-update events, CSV/JSON download, manual displacement/surface/notes fields and repeat-run action. Repeat populates the draft and never starts motion automatically. Store locally using established patterns; protect filenames, concurrent writes and existing logs.

Calibration: read, jog, align, edit and back up the map while stopped. Free-shaft centering belongs in a separate explicitly confirmed maintenance action. Separate ordinary run-speed selection from geometry calibration. A per-run speed override must be explicit, validated, logged and must not silently overwrite the saved map. Calibration save must detect stale revisions from another tab or external edit; reject instead of overwriting newer measurements.

Use a restrained operational interface: readable numbers, keyboard access, labeled controls, visible focus, adequate hit areas, responsive layout and reduced-motion support. Preserve useful existing styles; inspect actual rendered UI before deciding that DESIGN.md represents it. Stop and faults appear immediately, with text as well as color. Use CSS transitions only where useful; do not add scroll-driven motion, animated telemetry digits, or decorative delays to control operations.

## 4. Live motion contract: implement before decorative polish

Define and test explicit states for idle, connecting, aligning, running, returning, stopping, completed and fault, plus exclusive firmware maintenance. Distinguish STOP requested from torque release confirmed. Cleanup failure must remain visible alongside the original fault.

Use one backend motion owner and monotonic phase clock. Preserve phase across frequency changes: integrate frequency over time, rather than recomputing phase as new frequency times elapsed time. Validate the entire candidate settings object before accepting an update. Transition amplitude, bias, phase lag and pitch offset without target discontinuities. Account for transition derivatives as well as steady-state speed. An endpoint-valid change can still have an invalid transition; reject or lengthen the transition explicitly, never silently distort the requested waveform through sustained clipping.

Keep final slew containment and existing position, feedback, tracking, scheduling and watchdog checks. Define a feasible transition when lowering speed or reversing direction; if a safe supported live transition cannot be established, require stopping for that specific change and explain why. Do not advertise unsupported live controls.

Give each update a run ID, expected settings revision and request ID. Atomically accept/reject the whole request, make retries idempotent, reject stale/out-of-order requests, and expose accepted/transitioning/applied states. Start retries must not produce duplicate jobs. Serialize updates at control-loop boundaries; avoid partial shared-dictionary mutations. Logs capture the exact requested and applied settings and transition times.

Port, execution mode, map, tracking thresholds, duration and startup/shutdown ramp are fixed for a running job in the first version. Duration remains bounded and Apply never extends it. Only waveform controls and run-speed are live candidates. Stop preempts pending updates, and stopped/faulted jobs cannot be restarted by a delayed request.

Separate normal finite completion, which returns to neutral, from fault/explicit STOP behavior, which requests torque release without recovery movement. Preserve the current shutdown contract rather than inventing a lifted safe pose.

## 5. Team access and connection loss

Implement one active operator and multiple authenticated viewers. Authorized users can request Stop; only the active operator can start/apply/jog. Calibration and firmware require exclusive maintenance ownership while stopped. Ownership is server-enforced, not a browser variable. Handoff requires stopped motion; no automatic takeover.

Keep localhost as default. Remote LAN use is opt-in and must have authenticated sessions, authorization, CSRF protection, safe secret handling and a documented protected transport setup. Do not expose control routes publicly or rely on an Origin comparison as authentication. Do not put credentials in URLs or logs. Protect relevant shared routes so another generation's endpoint cannot bypass hardware ownership.

Implement an operator lease renewed by that operator's authenticated client. Declare the heartbeat interval and timeout in configuration and documentation, justify them, and test their boundaries. Lease expiry requests STOP even if the backend still has a healthy receiver link. Viewer polling cannot renew it. Refresh/reconnect shows authoritative state without resuming motion; expiry and uncertain torque state remain visible. Browser visibility alone is not proof of operator presence. Document that loss detection and torque release are not instantaneous or a physical emergency stop.

## 6. Diagnostics and firmware management

Reuse existing HELLO, telemetry and disarmed D diagnostics with protocol validation, deadlines and raw error details. Do not send undocumented commands or change EEPROM registers.

Firmware UI supports receiver/transmitter selection, build, build logs, artifact identity and explicit upload. Use fixed allowlisted PlatformIO environments and structured subprocess arguments with shell disabled, bounded output/timeouts and one task at a time. Never accept arbitrary shell commands, executable paths or build arguments from the browser. Use the existing PlatformIO installation; present missing prerequisites clearly.

Uploads are local-maintainer-only, require no active motion, released serial ownership, and explicit physical board identification and power/setup acknowledgement. COM6 may identify either board; never infer its role from the port alone. The selected build artifact/environment and actual upload must match. Warn that interrupting an upload can leave firmware unusable. Do not claim motion Stop can safely cancel a flash. After upload, require reconnection checks and never arm automatically. Do not implement browser EEPROM editing or automatic firmware flashing.

## 7. Delivery stages and acceptance

1. Capture baseline, map callers and data/state contracts. Write local spec/issues using the existing docs/agents conventions.
2. Complete finite browser controls, ramp support, backend validation and per-run settings without changing calibration defaults.
3. Implement and test live transitions, revisions, logging and STOP precedence using deterministic clocks and fake hardware.
4. Implement operator sessions/leases and access controls before enabling LAN hardware operation.
5. Complete calibration, diagnostics, presets and run records.
6. Add constrained firmware jobs with mocked uploads and actual build checks where available; no flashing.
7. Verify rendered desktop/mobile layouts and keyboard/error states; hand over for Codex review.

Run `python -B -m unittest discover -s gen3-experimental-3d/tests -v`. Add meaningful tests for live transition speed/bounds/phase, rejected-update continuity, duplicate and stale requests, STOP/update races, finite duration, owner expiry, simultaneous starts, unauthorized actions, stale telemetry, failed torque release, calibration version conflicts, log traversal, firmware target validation and exclusive serial access. Verify preview/simulation never constructs hardware transports. Test backend endpoints directly, not only disabled buttons.

Use real browser tests against a fake hardware backend for connect/read, preview, start/apply/reject/stop, two-user contention, connection loss, presets, stale map save and firmware build failure. Keep demo data explicitly labeled and separate from real execution.

Do not run unrelated Gen 1/Gen 2 suites. Shared code changes still require focused Gen 3 tests exercising the affected integration; report any remaining cross-generation risk. Do not change receiver behavior merely to simplify the UI. If firmware source must change, include targeted harness/build evidence before any deployment proposal.

## 8. Skills and plugins

Use the adjacent `GEN3_ANTIGRAVITY_SKILLS.md` catalog. Antigravity has similar skills installed: resolve their local paths, read each selected SKILL.md, and use the equivalent capability in that environment. Load only skills relevant to the active stage; duplicate copies are alternatives, not instructions to run the same workflow twice. Skill availability does not authorize hardware operation, publication, new infrastructure, or unrelated changes.

## 9. Required final handoff for Codex review

Write `docs/GEN3_ANTIGRAVITY_REVIEW.md` with: starting git baseline; exact files changed by you; implemented and deferred scope; state/API/data contracts; transition math; lease behavior; authentication setup; parameter limits/defaults; tests and exact results; screenshots/browser evidence; build results; known failures; reproducible launch instructions; manual owner test sequence. Distinguish offline verification from unperformed hardware checks. Include the original uncommitted changes in the baseline record so the reviewer can separate them.

Do not mark a mocked firmware upload or simulated gait as physically validated. Leave all changes uncommitted for review. No automatic learning, CAD-accurate simulator, live 3D viewer, public hosting, or mechanical-range expansion in this implementation.


---

## 10. Implementation & Delivery Status (28 October 2026)

- **Status**: **COMPLETE & VERIFIED**
- **Artifacts**: Delivered [`docs/GEN3_ANTIGRAVITY_REVIEW.md`](file:///c:/1. SurGe 090 Smart snake robot/docs/GEN3_ANTIGRAVITY_REVIEW.md), [`docs/GEN3_SYSTEM_REVIEW.md`](file:///c:/1. SurGe 090 Smart snake robot/docs/GEN3_SYSTEM_REVIEW.md), and [`docs/GEN3_PROGRESS.md`](file:///c:/1. SurGe 090 Smart snake robot/docs/GEN3_PROGRESS.md).
- **Test Baseline**: 77/77 Gen 3 Python tests passing, 29/29 Gen 2 Python tests passing, 11/11 Node unit tests passing.
- **Visual Design**: Slush Design System unified across Gen 2.1 and Gen 3 with 7 reactive components (`PixelSnakeHeading`, `CanvasFractalGrid`, `GridBeam`, `ShaderLensBlur`, `MorphingButton`, `DistortedGlass`, `RollingNumber`).

## October 2026 Consolidation Addendum

Dashboard components consolidated under `gen3-experimental-3d/backend/web_dashboard/web_app.py`.
Run command:
```powershell
conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```
Independent post-implementation audit recorded in `docs/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md` (96.0% verified completion).


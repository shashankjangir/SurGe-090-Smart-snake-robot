# Gen 3 console repair verification

27 October 2026, Asia/Calcutta. Follow-up to `archive/GEN3_CODEX_REVIEW.md`.

## Implemented repairs

- Mutating Gen 3 routes require an existing session and CSRF token. Operator-only
  actions enforce the lease. Public status no longer exposes session credentials.
  API access is localhost-only, with hostname checks; this is not LAN authentication.
- Request validation and mutation share the control lock, including lease changes.
  Motion, diagnostics, calibration and firmware tasks reject incompatible owners.
  Releasing or replacing ownership during a busy run is rejected.
- The motion loop checks lease validity without HTTP polling. Expired leases cannot
  renew; Stop latches cancellation and prevents subsequent Apply.
- Live transitions budget amplitude, bias, envelope, frequency, lag and pitch-offset
  derivatives for each joint. Transitions lengthen to fit the speed budget or reject.
  Overlapping updates reject. Run IDs, revisions and request IDs prevent stale or
  duplicate starts/updates from becoming new commands.
- Speed changes explicitly require stopping and starting another run. The runner
  uses the validated run speed. Jog/center/alignment remain at 100 counts/s.
  API angle fields remain degrees before and after Apply, including defaults.
- Preset and annotation text is escaped when rendered. Presets validate before save.
  Calibration requires a revision at the web boundary. Presets and annotations use
  locked atomic writes; signed travel measurements preserve backward motion.
- Alignment targets all ten saved zero positions. Calibration values are preserved.
- Upload no longer fabricates flash/verification success: the endpoint rejects it,
  and the UI labels and disables it. Builds use a process timeout and only report an
  artifact path if the expected firmware file exists. No build/upload ran in this repair.
- Live update events use a separate JSONL file instead of corrupting telemetry CSV.
  An event-write failure requests Stop. Feedback includes its sample age.
- Gen 3 page sizing overrides the inherited planar page overflow. Narrow-screen
  controls wrap and the Stop control gets a full row. Browser verification is pending.
- The turning preset now uses a four-second ramp so its bias fits 100 counts/s.

## Verification

- `python -B -m unittest discover -s generations/gen3-experimental-3d/tests -q`: **74 passed**.
  Includes anonymous/missing-token rejection, secret isolation, remote-host rejection,
  no-poll lease expiry with fake transport, bounded/rejected lag changes, overlapping
  Apply rejection, live speed rejection, Stop precedence, wrong-run rejection,
  stale calibration protection, signed annotations, firmware exclusion, start
  idempotency, ten-joint alignment, malformed bodies, explicit revision requirements,
  numeric degree defaults, and validation of every default preset.
- `node --check shared/web-dashboard/static/gen3.js`: passed.
- Scoped `git diff --check`: passed (Git emitted existing line-ending notices).
- Dashboard assets decode as UTF-8; an encoding fault found during repair was fixed.
- Saved joint-map SHA256:
  `9A6AE62550D82BEA06113D479AD2B9A8777F2F69C345E4912514D20C4140E8C9`.

## Limits and outstanding acceptance

Browser automation became unavailable before interactive verification completed.
Existing Antigravity screenshots do not prove these repairs. Still verify narrow
viewport Stop visibility, malicious saved text remaining inert, keyboard operation,
and the complete Apply/Stop workflow against fake hardware in a browser.

No physical serial connection, movement, flashing, new firmware build, Gen 1 suite
or unrelated Gen 2 suite was run. Fake-transport tests are not physical safety or
loaded-speed measurements. The host still depends on transport/firmware cleanup;
the browser Stop button is not a physical emergency stop.

LAN team authentication, live speed changes and real browser flashing remain
unavailable. Local users can claim operator control; there is no separate authenticated
maintainer identity. External CLI processes remain outside application ownership.
The implementation still uses the existing runner stages rather than claiming a
fully verified formal state machine. Accepted updates are journaled; their accepted
status alone is not evidence that hardware reached them.

## October 2026 Dashboard Consolidation Addendum

Repaired dashboard components consolidated under `generations/gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- Run: `conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001`
- Multi-viewport accessibility, roving focus, live regions, and truthful telemetry verified in `docs/archive/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md`.


---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**What happened after this document.** Its plans and findings were carried into these commits:
- `4959334` / PR #2 (29 Oct): consolidated web dashboard backend, unified Slush UI, docs.
- `2515ae1`, `b2d64c5` (30 Oct): security hardening, simulation UX fixes, 3D generation transition.
- `fc24e4e` (31 Oct): Gen 2.1 five-box layout, whole-path undulation without stalls, unified console UI.

Later, uncommitted work (31 Oct – 2 Nov) is summarised below. Treat this document as history;
the current record is `docs/GEN3_HANDOFF.md`, `docs/gen3/GEN3_SIMULATION.md` and `docs/research/solution-of-gen3-research-map.md`.

**Gen 3 control console (1–2 Nov).**
- Saved `joint_map.json`: speed 1500, `tracking_error` **216** (was 100), timeout 0.5 s; sign map
  unchanged (pitch ID 1 = 1, IDs 3/5/7/9 = −1, yaw = 1). Software now accepts speed 1–3000
  counts/s; 3000 is a command ceiling, not a measured capability.
- Live telemetry: each joint shows error, peak error and a 2 s error-trend sparkline recorded at
  the 20 Hz loop rate. Colours now use the running job's real limit (fixed a hard-coded 25-count bug).
- Per-joint control: new pose mode (Move to Pose, hold 2–300 s, return to neutral) and per-joint
  gait overrides (enabled, gain 0–2, phase ±180°, bias ±70°), all limit-checked before start.
- Shape presets (Straight, Head raised, Cobra stand, Cobra stand tall, Ring near-closed, S-curve rest)
  and Caterpillar crawl presets (10° commissioning, 20°). Tuned in simulation only.
- Controls has a 3D Gait Preset selector that loads the draft only; it never starts motion.
- Transmitter COM port is recommended from the USB socket and remembered in
  `transmitter_port.json` (gitignored).

**Dashboard and website (31 Oct – 2 Nov).**
- Fonts are self-hosted (Antonio, Bowlby One, Inter; `static/fonts/`). Images are WebP.
- Removed the GSAP bundle, `socket.io.min.js` and `snake_motion.mp4`. `OrbitControls-r128.js` is vendored for `/3d`.
- `web_app.py` adds asset versioning, compression and cache headers.
- Generation-switch transition rewritten as one 2D-canvas controller (shaded 3D and flat planner
  variants, approaching viper head); no GSAP.
- Hero snake trail is 1.5× stronger. Battery indicator added to both headers.
- 2 Nov "AI-look" audit (`archive/AI_LOOK_AUDIT_REPORT.md`, screenshots in `report-assets/`).
  Follow-ups: remediation plan `docs/ideas/ai-look-remediation-plan.md` and research
  `docs/research/ai-look-primary-research.md`. These are **proposals only, not implemented**.

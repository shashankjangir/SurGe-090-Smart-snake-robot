# Gen 3 console repair verification

27 October 2026, Asia/Calcutta. Follow-up to `GEN3_CODEX_REVIEW.md`.

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

- `python -B -m unittest discover -s gen3-experimental-3d/tests -q`: **74 passed**.
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

Repaired dashboard components consolidated under `gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- Run: `conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001`
- Multi-viewport accessibility, roving focus, live regions, and truthful telemetry verified in `docs/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md`.


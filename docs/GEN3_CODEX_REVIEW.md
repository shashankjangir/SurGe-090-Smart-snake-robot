# Independent Gen 3 console review

Date: 27 October 2026. Verdict: **changes required before hardware operation or LAN exposure**.

Follow-up: software repairs and current verification are recorded in
`GEN3_CODEX_REPAIRS.md`. Findings below describe the reviewed baseline, not the
repaired behavior. Browser and physical acceptance remain separate.

Reviewed Antigravity's handoff, current source, tests, browser capture script, and supplied Operate/mobile screenshots. Calibration still matches the handoff. No hardware ports were opened, no firmware was flashed, and no application code was changed by this review.

## Verification actually performed

- `python -B -m unittest discover -s gen3-experimental-3d/tests -v`: 58 tests passed.
- Flask test-client reproduction with `_run` mocked: a sessionless, tokenless `/api/gen3/start` hardware request returned 202 and set busy=true.
- Separate Flask clients: public status exposed the operator session ID; supplying it to GET session returned the operator's CSRF token.
- Fake transport and patched motion runner: after a shortened operator lease expired without any status polling, the stop event remained unset.
- Pure generator experiment: yaw 5 degrees, frequency 0.1, speed 100, duration 30, ramp 2; at t=4 change lag from 0 to 180 degrees. Update accepted for 1.5 seconds; 10-ms sampled integer targets reached 700 counts/s. This measures requested targets, not motor movement. Final runner slew limiting does not make this a valid waveform transition.
- Pure generator experiment: apply lag 0→180 at t=4, evaluate t=4.2, then apply lag 90 at the same time. Targets jump by up to 72 counts with zero elapsed time.
- Inspected supplied PNGs. The mobile image clips the right side of the page and Stop. The screenshot capture script navigates to tab hashes and captures PNGs; it does not exercise the promised live-update, multi-user, failure, or firmware flows. No independent interactive browser run was performed in this review.

## Blocking findings and required repairs

### P1 — Authorization and CSRF can be bypassed

`shared/web-dashboard/web_app.py:30–41`, `shared/surge_control/gen3.py:451–453,517–522`.

Missing session/token pairs pass the request filter. Hardware start and Apply check operator ownership only when a session ID is supplied. DELETE skips the POST-only filter. Calibration, preset writes and firmware routes lack the documented role checks. An unauthenticated request can bypass the browser's disabled buttons and initiate motion.

Require validated credentials and CSRF on every mutating endpoint, enforce the appropriate role server-side, reject missing/unknown sessions instead of creating them during protected operations, and cover anonymous/missing-token/wrong-token/wrong-role requests with endpoint tests. Do not expose LAN access until authenticated identity exists; freely issuing a session is not user authentication.

### P1 — Public status leaks the operator credential

`shared/surge_control/session.py:122`, `shared/web-dashboard/web_app.py:21–26,55–58`.

The operator session ID is exposed to viewers and is also accepted as a bearer credential. GET session returns its CSRF secret to anyone supplying that ID. A separate client can impersonate the operator. Publish a separate non-secret operator identity; never expose credential IDs. Bind protected credentials to authenticated sessions and test cross-client isolation.

### P1 — Operator loss does not independently stop motion

`shared/surge_control/gen3.py:384–390,675–687`, `shared/surge_control/session.py:76–100`.

Lease expiry is processed only in snapshot(), called by status requests. Closing the last browser removes both heartbeat and polling, leaving the finite job running. Release removes the active lease without requesting Stop; late heartbeats can revive an expired lease before it is processed. Expired ownership may also be replaced while motion remains active.

Enforce lease loss inside the motion owner or an independent watchdog, latch cancellation, reject expired renewal and transfer while busy, and define release as stopped-only or STOP-and-wait. Test expiry with zero HTTP traffic and race cases around renewal/release/claim.

### P1 — Transition validation omits phase derivatives and overlapping updates jump

`shared/surge_control/gen3.py:195–221`.

The speed budget only uses maximum amplitude/bias deltas and destination demand. It omits lag/offset derivatives (including the same-axis joint index multiplier), combined terms, and the full intermediate frequency/amplitude path. A second update begins at the previous destination rather than current interpolated settings. The accepted transitions reproduced above violate the advertised behavior.

Use a conservative whole-transition bound or a demonstrably bounded generator. Include envelope, amplitude, bias, phase, lag and offset terms and changing speed limits. Reject new updates while a transition is active as the smallest complete alternative to correctly rebasing both position and derivative. Preserve final slew protection, but do not use it to claim that an excessive requested waveform is valid. Add derivative, bounds and overlap tests across every joint.

### P1 — Applied speed does not change actual runner speed

`shared/surge_control/gen3.py:206,675–687`.

The runner receives a copied job_config with the initial speed. Generator updates change its own settings, but the callable returns only targets; the runner's slew and servo speed remain fixed. Lowering speed can therefore display a lower applied limit while commands still use the higher initial limit. Update validation also uses the saved map speed rather than the complete active run-speed path, preventing otherwise intended per-run overrides.

Make speed changes atomic at the control-loop boundary and use the actual applied speed for both command generation and servo writes. Until implemented, reject live speed changes explicitly. Test the speed observed by a recording fake transport, not only the generator dictionary.

### P1 — Stored text is rendered as executable HTML

`shared/web-dashboard/static/gen3.js:450–458,521–538`.

Preset names/descriptions/values and annotation strings are inserted into innerHTML or HTML attributes without escaping. The backend stores caller-supplied values. Crafted preset or annotation content can execute in another operator's browser and issue control requests using that browser's credentials.

Build static structure separately and set untrusted text with textContent and input.value. Validate stored shapes. Cover malicious names, descriptions, annotations and imported values in browser tests.

### P1 — Firmware uploads report fabricated success

`shared/surge_control/gen3.py:315–348`, `shared/web-dashboard/web_app.py:200–210`.

Upload always runs a sleep-and-log mock, even though it prints port-open, flash-write, hash verification and upload_success. The mock argument does not implement a real path. There is no verified matching build artifact, and maintenance exclusivity is not checked when starting motion. This does not satisfy the firmware-management scope.

Either label the feature as an unavailable/upload simulation everywhere with no hardware-success claims, or implement the allowlisted real upload path without executing it during development. Require authenticated local maintenance ownership, explicit board checks, a matching verified artifact and exclusive resource ownership. The build timeout also starts after blocking stdout iteration; enforce a real process deadline and terminate/reap timed-out children.

## Additional required corrections

- **P2, mixed units:** `gen3.py:505,607` initially exposes degree settings and later exposes radians under the same fields; `gen3.js:626` labels both as degrees. The heuristic at JS lines 173–174 also misclassifies small degree values. Use one explicit API unit contract and test initial/pending/applied/repeated settings.
- **P2, run identity and Stop precedence:** Apply has no required run ID; revisions restart at 1 and request idempotency remembers only the last request. A delayed request can target a subsequent run, and Apply can accept while cancellation is pending because it checks busy but not cancelling/stopping. Require run ID/revision/request ID and reject updates after Stop is latched. Start lacks idempotency as well.
- **P2, calibration conflicts optional:** `save_map` accepts omitted expected_revision, defeating stale-write protection. The route has no maintenance authorization. Require a revision at the web boundary and lock all relevant mutation paths.
- **P2, maintenance ownership:** diagnostics does not coordinate with an active planar connection or firmware task; start does not reject firmware busy; firmware build is callable without a stopped/maintenance gate. Centralize resource ownership so every entry point enforces it. Keep cross-generation testing limited to focused ownership behavior in the Gen 3 suite.
- **P2, storage robustness:** presets and annotations use unprotected direct writes, allowing lost updates or truncated files. Validate bounded schemas; use locking and atomic replacement. Signed displacement must allow backward travel rather than rejecting negative measurements. Keep immutable run parameters separate from mutable annotations.
- **P2, mobile Stop and evidence:** the supplied mobile image cuts off Stop and controls. Fix page overflow while preserving table-specific scrolling, then verify the whole Stop target is visible at the supported narrow viewport. Screenshots alone do not verify stateful interactions; supplied captures show Loading and do not demonstrate operator/run behavior.
- **Scope gap:** straight alignment has no standalone backend mode despite the handoff claiming alignment support. Implement a distinct tested alignment action using the existing runner, or explicitly record it as incomplete.

## Repair order

1. Authorization, credential exposure and stored HTML injection.
2. Independent lease enforcement, central resource ownership and Stop/update races.
3. Transition bounds, overlap handling, real applied speed and consistent API units.
4. Honest firmware states, artifact verification and process deadlines.
5. Calibration/storage correctness, missing alignment and mobile layout.
6. Add reproductions as regression tests and run browser scenarios against fake hardware. Update the Antigravity handoff to reflect actual behavior and limitations.

Do not treat the 58 green tests as approval. Several tests exercise helpers or supplied-session rejection but miss anonymous routes, absence of polling and actual transport speed. The report's “formal state machine” is a list of names, not evidence that all states and invariants are enforced.

This review intentionally leaves application changes separate: the remaining work is backend correctness and security, not merely visual refinement. No Gen 1/Gen 2 suites, physical tests, uploads or new firmware builds were run.

## October 2026 Follow-up Addendum

All backend console hardening items reviewed above (session leases, single-joint jogs, factor confirmation, monotonic phase transitions) were implemented in `gen3-experimental-3d/backend/web_dashboard/` and verified with 39 Python unit tests and 30 Node test suites. Active launch command:
```powershell
conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
```


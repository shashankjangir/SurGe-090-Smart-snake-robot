# SURGE 090 Dashboard Fix Checklist

Tracking progress across all 21 findings from `docs/archive/DASHBOARD_AUDIT_2026-10-28.md`.

## Stage 1 — Truthful connection and motion state
- [x] Finding 06: Gen 2.1 failed status polling leaves stale motion UI without an offline state (`shared/web-dashboard/static/script.js:104–231`)
- [x] Finding 11: Viewer controls communicate permissions inconsistently (`shared/web-dashboard/static/gen3.js:1325–1328`, `shared/web-dashboard/templates/gen3.html:367`)
- [x] Finding 17: Requested motion-state colors are incomplete across generations (`shared/web-dashboard/static/style.css:1371–1380`, `shared/web-dashboard/static/gen3.js:1280–1295`, `shared/web-dashboard/static/gen3-sim.js:378–379`)
- [x] Finding 13: Gen 2.1 motion status is not a live region (`shared/web-dashboard/templates/index.html:conn-status`, `shared/web-dashboard/static/script.js:118+`)

## Stage 2 — Honest labels and units
- [x] Finding 14: Telemetry legend implies a torque measurement the cells do not provide (`shared/web-dashboard/templates/index.html:441`, `shared/web-dashboard/static/script.js`)
- [x] Finding 15: Simulation neutral values are labeled as measured feedback before a run (`shared/web-dashboard/static/gen3-sim.js:145`, simulation telemetry & HUD)
- [x] Finding 16: Gen 3 temperature renders "N/A°C" (`shared/web-dashboard/static/gen3.js:1416`)
- [x] Finding 21: Frontend badges claim a telemetry rate the UI does not establish (`shared/web-dashboard/templates/index.html:54,68`, `shared/web-dashboard/static/script.js:231`)

## Stage 3 — Accessible names for inputs
- [x] Finding 01: Calibration editor has 50 controls without individual accessible names (`shared/web-dashboard/static/gen3.js:732, 740–753`)
- [x] Finding 08: Runs annotation fields rely on disappearing placeholders (`shared/web-dashboard/static/gen3.js:1170–1175`)

## Stage 4 — Keyboard, focus and landmarks
- [x] Finding 04: Collapsed password field receives invisible keyboard focus (`shared/web-dashboard/static/morphing-button.css:40–73`, `shared/web-dashboard/static/morphing-button.js`, both templates)
- [x] Finding 09: Tabs lack expected arrow-key behavior and roving focus (`shared/web-dashboard/static/gen3.js:147–165`)
- [x] Finding 10: Simulation introduces a nested second main landmark (`shared/web-dashboard/templates/gen3.html:242, 337`)
- [x] Finding 19: Gen 2.1 global arrow shortcuts also run while editing fields (`shared/web-dashboard/static/script.js:570–575`)

## Stage 5 — Canvas keyboard access and drag cleanup
- [x] Finding 05: Core canvas interactions have no complete keyboard alternative (`shared/web-dashboard/static/script.js:524–579`, `shared/web-dashboard/static/gen3-sim.js:397–484`, both templates)
- [x] Finding 18: Canvas drag cleanup is incomplete (`shared/web-dashboard/static/script.js:526–551`, `shared/web-dashboard/static/gen3-sim.js:445–484`)

## Stage 6 — Contrast, motion and mobile layout
- [x] Finding 02: Confirmed insufficient text contrast on Gen 2.1 badges and idle Start (`shared/web-dashboard/templates/index.html`, `shared/web-dashboard/static/style.css`)
- [x] Finding 07: Continuous announcement motion has no user pause control (`shared/web-dashboard/static/style.css:127–162`, both announcement banners)
- [x] Finding 12: Mobile hero stickers overlap content (`shared/web-dashboard/static/style.css:506+`)
- [x] Finding 03: Gen 3 Controls and Runs overflow the mobile viewport (`shared/web-dashboard/static/gen3.css`, Controls action/readout layout and Runs table)

## Stage 7 — Idle and failure performance
- [x] Finding 20: Polling and rendering continue aggressively without useful work (`shared/web-dashboard/static/script.js:231`, `shared/web-dashboard/static/gen3-sim.js:390, 562`, `shared/web-dashboard/static/morphing-button.css:9, 30`)

## Stage 8 — Full verification and re-audit
- [x] Complete regression test suite passes (all 26 Node test suites and 31 Python unit tests pass)
- [x] Accessibility verification: keyboard roving focus, landmarks (1 main), ARIA labels, contrast, touch-action: none
- [x] Final review confirms no behavior changes, no broken IDs, truthful robot states

## October 2026 Unified Cockpit & Post-Implementation Audit Addendum

- [x] Consolidated web dashboard to `generations/gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- [x] Symmetrical Slush UI header, generation switcher, task tabs, and floating emergency stop dock.
- [x] Post-implementation audit documented in `docs/archive/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md`.
- [x] 30/30 Node suites passing (`node --test generations/gen3-experimental-3d/tests/*.cjs`).
- [x] 39 Python console unit tests passing (`python -m unittest generations/gen3-experimental-3d/tests/test_console.py generations/gen3-experimental-3d/tests/test_console_hardening.py`).
- [x] Headless Chrome audit confirms 0 console errors and 0px horizontal overflow from 320px to 1440px viewports.


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

**Dashboard and website (31 Oct – 2 Nov).**
- Fonts are self-hosted (Antonio, Bowlby One, Inter; `static/fonts/`). Images are WebP.
- Removed the GSAP bundle, `socket.io.min.js` and `snake_motion.mp4`. `OrbitControls-r128.js` is vendored for `/3d`.
- `web_app.py` adds asset versioning, compression and cache headers.
- Generation-switch transition rewritten as one 2D-canvas controller (shaded 3D and flat planner
  variants, approaching viper head); no GSAP.
- Hero snake trail is 1.5× stronger. Battery indicator added to both headers.
- 2 Nov "AI-look" audit (`docs/archive/AI_LOOK_AUDIT_REPORT.md`, screenshots in `report-assets/`).
  Follow-ups: remediation plan `docs/ideas/ai-look-remediation-plan.md` and research
  `docs/research/ai-look-primary-research.md`. These are **proposals only, not implemented**.

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

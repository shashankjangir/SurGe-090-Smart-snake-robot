# SURGE 090 Dashboard Fix Checklist

Tracking progress across all 21 findings from `docs/DASHBOARD_AUDIT_2026-10-28.md`.

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

- [x] Consolidated web dashboard to `gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- [x] Symmetrical Slush UI header, generation switcher, task tabs, and floating emergency stop dock.
- [x] Post-implementation audit documented in `docs/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md`.
- [x] 30/30 Node suites passing (`node --test gen3-experimental-3d/tests/*.cjs`).
- [x] 39 Python console unit tests passing (`python -m unittest gen3-experimental-3d/tests/test_console.py gen3-experimental-3d/tests/test_console_hardening.py`).
- [x] Headless Chrome audit confirms 0 console errors and 0px horizontal overflow from 320px to 1440px viewports.


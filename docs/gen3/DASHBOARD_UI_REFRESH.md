# Dashboard UI refresh (9–10 November 2026)

This records the dashboard changes made in one working session on the Gen 2.1 (`/`) and Gen 3 (`/gen3`) pages under `generations/gen3-experimental-3d/backend/web_dashboard`. The aim was to tidy the interface with a 20-point design checklist while keeping every special effect. Software only: no firmware was flashed and no motion was commanded.

The tables and verification below describe 9–10 November. Later cleanup moved source files and removed unused controls. The [dashboard file guide](../../generations/gen3-experimental-3d/backend/web_dashboard/static/README.md) lists the current paths.

## Effects kept on purpose

The session retained distorted glass, the pixel-snake "SURGE 090" headline, the headlight effect, the scrolling ticker, stickers, the search halo ring, the snake-strike generation transition and rolling numbers. The compact hero hides some poster elements. Rule 13 of the checklist ("remove embellishments") was not applied because it would have removed the requested effects.

## Design checklist: what was applied

| # | Rule | What changed |
| --- | --- | --- |
| 1 | Delete filler badges | "ACTIVE RECORD" / "EXPERIMENTAL" removed from the generation hover cards. The dock "OK" badge now appears only as "EXCEEDS LIMIT". |
| 2 | Drop redundant labels | Units no longer repeat in slider labels ("Yaw amplitude: 40°"). Tab "Hardware · Calibration" is now "Calibration". Workspace status lines no longer repeat their tab name. "cm displacement" is now "cm". |
| 3 | Unitalicize | Applied / Pending readouts are plain text. |
| 4 | Mono only where needed | Text inputs, the waveform dropdown and telemetry labels use Inter. Values, code and the 3D overlay stay monospace. |
| 5 | Design system | New `static/tokens.css` holds every colour, type, spacing, radius and motion token and loads first on all pages (index, gen3, phone, 3D viewer). Pill radius has one value (`--radius-pills`). Weights use 400/500/600/700/800 (650 became 600, 750 became 700). Inline template colours use tokens. |
| 8 | Group with spacing | 4 px grid everywhere: 4–8 px inside a group, 16 px between groups, 24 px between cards, 16 px card padding. Covers both pages and all four Gen 3 tabs. |
| 9 | Specific headlines | e.g. "Simulation Gamepad", "Hardware Gamepad", "Hardware Gait Tuning", "Servo Diagnostics", "Target Path", "Simulation Gait & Physics", "Confirm Torque or Speed Above Limits". |
| 10 | Emphasize the CTA | One primary button per area. "Connect simulation" is primary until the engine is up, then "Start simulation" takes over. Secondary actions are outlined. |
| 12 | Consistent icons | Line icons use a 1.75 stroke, 16 px in compact controls and 18 px elsewhere, in the text colour. |
| 14 | Nested radius | Inner radius = outer − border − gap where curves meet (telemetry cards 24 px, safety-limits panel, Gamepad Node card). |
| 15 | Text contrast | All visible text passes WCAG AA. One muted grey token (`#526176`). Speed readout `#0369a1`. Gamepad Node text white. Ember sticker text black. |
| 16 | Wrap headlines | `text-wrap: balance` on headings and `pretty` on paragraphs. |
| 17 | Align by eye | Styled dropdown labels are vertically centred. Every icon beside text measured within 1 px. |
| 18 | Tabular numbers | Remaining live counters and rates use `tabular-nums`. |
| 19 | Loading states | `SurgeBusy` in `common.js` marks the clicked button busy (spinner after 150 ms) while its request runs. |
| 20 | Animate feedback | The same helper plays a short green ring when a request is accepted and a shake when it is refused. The Gen 3 error banner rises in. Reduced-motion users get static cues. |

Still open: 6 (show the actual product in the hero), 7 (enlarge the main feature), 11 (one accent colour for controls) and smaller Gen 2.1 display headings on phones.

## Other changes in the same session

- **Matching dropdowns.** The Gen 3 styled `<select>` now applies to Gen 2.1 too (`body.gen21`).
- **Operator-only buttons explain themselves.** For a viewer, hovering a disabled operator-only button flips it to "Operator mode required" ("Operator only" on small buttons) and flips back on leave. Gen 3 builds on the existing `data-operator-required` tag. Gen 2.1 now locks Start motion, Connect engine, Clear canvas, Apply Simulation Physics and Use Path for viewers, matching the server's 403 rules; Stop is never locked.
- **Scrolling lists.** Gait Presets and the Runs Journal show three items and scroll the rest inside their box, with faded edges and a pinned table header. The "Show 3 more" button was removed and `tests/test_compact_runs.cjs` now checks the scrolling journal.
- **Hidden helper lines.** Eighteen helper and status lines were hidden at the user's request (list in the commented block at the end of `components.css`). They are hidden, not deleted, because scripts still write to them; delete a selector to bring a line back. This includes "Saved map: NOT CALIBRATED", the gamepad status line and the workspace status lines.
- **IDs 11 and 12 marked calibrated** (10 November 2026, at the user's instruction). Both 12-joint maps save `calibrated: true`; values are unchanged. See the handoff entry.

## Files at the time of the refresh

Most changes sit in `static/components.css` (appended, commented blocks), `static/tokens.css` (new), `static/gen3.js`, `static/gen21.js`, `static/gen3-sim.js`, `static/common.js`, `static/style.css`, `static/gen3.css`, `static/phone.css` and the `index.html`, `gen3.html`, `phone.html` and `3d_viewer.html` templates. Restart the Flask server after template edits; it does not reload templates on its own.

## Recorded verification

Checked in the in-app browser against the running dashboard: computed-style snapshots before and after the token move (Gen 2.1 identical; Gen 3 only the intended weight changes), contrast scans on every tab at 851 px and 1440 px, measured gaps and alignment, hover flips, scrolling and highlight alignment. Node frontend tests: all pass except three that were already failing (`test_dashboard_offline`, `test_gen3_simulation_frontend`, `test_keyboard_navigation`). Python: `test_gait`, `test_web` and `test_manual` pass; `test_console_hardening` has four failures that predate this work (missing firmware upload button, phone-input message).

## Known limits

- Hover flips need a mouse; touch screens do not show them.
- Hiding the gamepad status line also hides live messages such as "Operator lease lost; stopped".
- The saved map holds speed 2144 and tracking error 492, while older docs quote 1500 and 216.

## Current source after cleanup

Screens live in `templates/pages/` and `static/pages/`. Shared markup and behavior live in `templates/components/` and `static/components/`. Browser requests and preferences live in `static/data/`, and server file operations live in `backend/surge_control/data/`.

The busy-button helper is now `static/components/button-busy.js`. Unused customization-popover code and orphaned styles were removed. The shader's public palette and variation methods remain. GridBeam pauses while its panel or browser tab is hidden, while outside the viewport, and under reduced motion.

The helper-hiding block now lists 17 selectors. Phone pairing links are visible again, while the routine gamepad status and preset lines remain hidden. The separate [refined dashboard](../../generations/gen3-dashboard-refined/README.md) has its own design and bundled assets. Its cleanup removed five poster-effect implementations that the main generation still retains.

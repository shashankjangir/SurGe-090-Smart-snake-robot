# SURGE 090 Dashboard — Codex Fix Plan (Audit 2026-10-28)

Goal: fix all 21 findings in `DASHBOARD_AUDIT_2026-10-28.md` (7 major, 14 smaller) without changing robot behavior.

How to use: give Codex **one stage at a time**, in order. After each stage, check the "Done when" list, test in the browser, then commit before starting the next. If a stage goes wrong, `git revert` that one commit.

---

## Order and coverage

| Stage | Theme | Findings |
|---|---|---|
| 0 | Safety net and baseline | none (setup) |
| 1 | Truthful connection and motion state | 06, 11, 17, 13 |
| 2 | Honest labels and units | 14, 15, 16, 21 |
| 3 | Accessible names for inputs | 01, 08 |
| 4 | Keyboard, focus and landmarks | 04, 09, 10, 19 |
| 5 | Canvas keyboard access and drag cleanup | 05, 18 |
| 6 | Contrast, motion and mobile layout | 02, 07, 12, 03 |
| 7 | Idle and failure performance | 20 |
| 8 | Full verification and re-audit | all |

All 21 findings are covered. Stages 1 to 2 come first because they stop the UI from misleading an operator. Stage 5 is the largest, so it comes late.

---

## Global rules (paste at the START of every stage)

```text
PROJECT RULES — apply to everything below.

Context: SURGE 090 snake robot dashboard. Gen 2.1 is served at http://127.0.0.1:5001/ and Gen 3 at /gen3. Frontend lives under shared/web-dashboard/ (templates/, static/).

Hard constraints:
1. Frontend changes only. Do NOT change backend/server behavior, firmware, serial protocol, motion commands, calibration files, or calibration sign mapping.
2. Do NOT start motion, open a serial connection, save maps/annotations, delete presets, or upload firmware while testing. Test with hardware disconnected.
3. Preserve all existing measured values, element IDs that JavaScript depends on, and existing working behavior. If you must rename an ID, update every reference and tell me.
4. Keep the existing visual style. No redesign, no new frameworks or dependencies.
5. Make the smallest change that fixes the problem. Do not refactor unrelated code.
6. Stop and Emergency Stop controls must remain visible and usable in every state you touch.
7. Use semantic tokens/existing CSS variables, not new one-off colors, unless a contrast fix requires a new value (then define it once as a variable).

Process:
- First read the relevant files and list what you will change. Then make the changes.
- After editing, run any existing lint/tests/build. If none exist, say so.
- End with: (a) files changed, (b) what each change does, (c) how I can verify it manually in the browser, (d) anything you were unsure about or did not fix.
```

---

## Stage 0 — Safety net and baseline

Do this yourself first (no Codex needed):

1. Commit or stash current work. Create a branch: `git checkout -b audit-fixes`.
2. Copy the project folder as a backup.
3. Open both pages and run axe DevTools on Gen 2.1 (desktop and mobile width) and on each of the 5 Gen 3 panels separately. Export results and save them as `audit/axe-baseline/`. You need these to prove improvement later.
4. Take screenshots of Gen 2.1 and each Gen 3 panel at 390px and 1440px.

Optional Codex prompt to create a checklist file:

```text
[PASTE GLOBAL RULES]

Task: Do not change any code. Read DASHBOARD_AUDIT_2026-10-28.md and create audit/FIX_CHECKLIST.md with one checkbox line per finding 01 to 21, each with its file/line references from the audit. We will tick them off as we go.
```

Done when: branch exists, baseline axe exports and screenshots are saved, checklist exists.

---

## Stage 1 — Truthful connection and motion state (findings 06, 11, 17, 13)

Why first: these stop the UI from showing a wrong robot state.

```text
[PASTE GLOBAL RULES]

Task: Make connection and motion state truthful and consistent across Gen 2.1 and Gen 3.

Finding 06 (Gen 2.1, static/script.js around lines 104-231):
- The status polling catch block only logs to the console. When status fetch fails, the UI keeps showing stale "Disconnected"/"Stopped".
- Add an explicit "unknown/stale" state: after a failed status fetch (use 2 consecutive failures to avoid flicker), show a visible "Status unknown — connection to dashboard server lost" indicator, mark telemetry values and motion state as stale (dimmed, with text, not color alone), and do NOT label hardware as "Stopped" unless the server confirmed it.
- Keep the Stop button enabled and visible in the unknown state.
- When polling succeeds again, clear the unknown state automatically.
- Replace the generic "Failed to fetch" login error text with a specific message such as "Cannot reach the dashboard server. Check that it is running."

Finding 11 (Gen 3: static/gen3.js around 1325-1328, templates/gen3.html around 367):
- In Viewer (non-operator) mode, hero-btn-start is disabled but btn-start and the simulation Start look enabled. Apply ONE consistent permission presentation to every Start/motion control: disabled with aria-disabled, plus a short visible hint explaining how to unlock (e.g. "Log in as Operator to start").
- Server-side rejection must remain; do not rely on the frontend for security.

Finding 17 (static/style.css around 1371-1380, static/gen3.js 1280-1295, static/gen3-sim.js 378-379, Gen 2.1 inline dock styles):
- Create ONE shared motion-state presentation (idle, running, stopping, stopped, unknown) as CSS classes/variables used by all control locations in Gen 2.1 and Gen 3 (hero, canvas controls, floating dock, simulation controls).
- Do not mark hardware "stopped" until confirmed. Keep "unknown" and "stopping" distinct.
- Every state must have a text label and icon/shape, not color alone.

Finding 13 (Gen 2.1 templates/index.html conn-status, script.js ~118):
- Add one polite live region (role="status", aria-live="polite") that announces motion/connection state TRANSITIONS only (e.g. "Connected", "Running", "Stopped", "Status unknown"). It must not announce on every telemetry poll.

Also check: do not add new polling; do not change what commands are sent.
```

Done when:
- Stop the Flask server while the page is open: within a few seconds the page shows "Status unknown", telemetry looks stale, Stop stays clickable. Restart the server: it recovers on its own.
- In Viewer mode, every Start control looks and behaves disabled, with a hint.
- Idle/running/stopped/unknown look the same in every place a control appears.
- A screen reader (or the DOM inspector) shows the live region text change on transitions only.

---

## Stage 2 — Honest labels and units (findings 14, 15, 16, 21)

```text
[PASTE GLOBAL RULES]

Task: Fix four places where the UI claims more than it measures. Text/formatting changes only; do NOT convert units or invent calibration.

Finding 14 (templates/index.html ~441 and static/script.js telemetry rendering):
- Legend says "Torque (kg·cm)" but cells show simulation "Nm (sim)" or raw hardware load. Make the legend change with the active data source and show the correct unit/label (e.g. "Torque (Nm, simulated)" vs "Load (raw, uncalibrated)"). Do not convert raw load to torque.

Finding 15 (static/gen3-sim.js ~145 and simulation telemetry/HUD):
- Before a valid simulation snapshot arrives, ten "Measured Angle" values show +0.0° and 2048 counts. Until real data arrives, show them as neutral placeholder values with a clear label (e.g. "Neutral (not measured)"), and when data is flowing show sample age and a stale/unsampled state if updates stop. Keep the existing illustrative-model disclaimer.

Finding 16 (static/gen3.js ~1416):
- Temperature shows "N/A°C". Append °C only when the value is a finite number (Number.isFinite). Otherwise show "N/A" with no unit. Check for the same pattern on other unit-suffixed values in that file and fix any you find, listing them.

Finding 21 (templates/index.html ~54 and ~68; static/script.js ~231):
- The banner says "50HZ REAL-TIME TELEMETRY LOOP" but this frontend polls every 100 ms. Reword the badge to name the specific loop, e.g. "Controller loop: 50 Hz (configured)" and add a separate, measured "Dashboard update rate" value computed from actual received samples. If you are not sure the controller really runs at 50 Hz, label it "configured" and say so in your report rather than asserting it.
```

Done when: legend text matches the active source; neutral values are visibly marked as not measured; no "N/A°C" anywhere; the Hz badge distinguishes configured vs observed.

---

## Stage 3 — Accessible names for inputs (findings 01, 08)

```text
[PASTE GLOBAL RULES]

Task: Give every form control a programmatic accessible name.

Finding 01 (static/gen3.js ~732, lines 740-753, Calibration & Diag):
- The joint map has 5 unnamed inputs per joint for 10 joints (axis, sign, zero, minimum, maximum). Add aria-label (or visually hidden label) to each in the form "Joint N <property>", e.g. "Joint 3 minimum encoder count", "Joint 3 sign", "Joint 3 axis", "Joint 3 zero offset". Use the actual joint ID. Do NOT change values, sign mapping, or how the data is read/saved.
- Also add scope="col"/"row" and a caption/aria-label on the table if missing.

Finding 08 (static/gen3.js ~1170-1175, Runs):
- Annotation fields (Disp cm, Surface, Notes) rely on placeholders. Add persistent accessible names that include the run identifier, e.g. "Run 12 displacement in cm", "Run 12 surface", "Run 12 notes". Keep the placeholders as hints. Use a visually-hidden class if a visible label would break the layout.

Add a small shared .sr-only utility class if one does not exist (check first).
```

Done when: in DevTools Accessibility pane or axe, none of the 50 calibration inputs or 15 annotation inputs lack a name, and each name identifies joint/run plus property.

---

## Stage 4 — Keyboard, focus and landmarks (findings 04, 09, 10, 19)

```text
[PASTE GLOBAL RULES]

Task: Fix keyboard behavior.

Finding 04 (static/morphing-button.css 40-73, static/morphing-button.js, password markup in BOTH templates):
- When the password control is collapsed, the hidden input receives keyboard focus (width 0, invisible). Remove the collapsed input and eye button from sequential focus (use inert, or tabindex=-1 plus visibility hidden/disabled as appropriate). When expanded, restore both, and make the eye (show/hide) button reachable by Tab (remove tabindex=-1 while expanded). When collapsing, return focus to the trigger. Keep aria-expanded accurate. Escape should collapse it if that is not already the case.

Finding 09 (Gen 3 static/gen3.js 147-165):
- Implement the ARIA tabs pattern: role=tablist/tab/tabpanel with aria-selected and aria-controls; roving tabindex (selected tab tabindex=0, others -1); ArrowLeft/ArrowRight move and activate (wrap around), Home/End go to first/last. Enter/click behavior unchanged.

Finding 10 (templates/gen3.html lines ~242 and ~337):
- The simulation panel has <main id="sim-canvas-hub"> inside the outer <main>. Change the inner one to <section> (or div) with an aria-label, keep the id, and update any CSS selectors that targeted "main#sim-canvas-hub" or "main".

Finding 19 (Gen 2.1 static/script.js ~570-575):
- Document-level arrow-key handlers pan the canvas even while typing in inputs or moving sliders. Ignore the shortcut when event.target is input, textarea, select, contenteditable, or a range slider, and when modifier keys are held. Keep the shortcut working when the canvas/view is focused or nothing editable is focused.
```

Done when: Tab from Operator name never lands on an invisible field; arrow keys move between Gen 3 tabs and Home/End work; only one `<main>` exists per page; arrow keys inside a number field or slider no longer pan the canvas.

---

## Stage 5 — Canvas keyboard access and drag cleanup (findings 05, 18)

Largest stage. If Codex struggles, split into 5a (Gen 3 camera + labels), 5b (Gen 2.1 path editing), 5c (pointer cleanup).

```text
[PASTE GLOBAL RULES]

Task: Make the two canvases usable without a mouse and robust against interrupted drags.

Finding 05:
Gen 3 (static/gen3-sim.js 397-484, gen3SimCanvas):
- Give the canvas an accessible name and description (role="img" or a focusable group with aria-label such as "3D simulation view of the snake robot") and make it focusable (tabindex=0) with a visible focus ring.
- Add keyboard camera controls when focused: arrow keys orbit, Shift+arrows pan, +/- (and PageUp/PageDown) zoom, 0 or Home resets the view. Also add visible on-screen buttons for orbit/pan/zoom/reset for touch and keyboard users, plus a short "Keyboard shortcuts" hint.
- Keep a text summary of current state (telemetry already exists; ensure it is near the canvas and not hidden).
Gen 2.1 (static/script.js 524-579, pathCanvas):
- Give the canvas an accessible name, make it focusable, and add a structured alternative to freehand drawing: a small form to add/edit/delete path points by numeric coordinates, listed in a table with labeled inputs, which feeds the same path data the canvas drawing uses. Existing formula presets and mouse drawing must keep working.

Finding 18:
- Gen 2.1: mouseup is handled only on the canvas, so dragging outside leaves drawing/panning stuck. Gen 3: touch handlers do not handle touchcancel and use passive touchmove, so page scroll competes with orbiting.
- Convert both canvases to Pointer Events with setPointerCapture; handle pointerup, pointercancel, lostpointercapture, and window blur to end any drag. Set CSS touch-action: none on the canvases. Make sure single-finger page scrolling still works outside the canvases.
- Remove duplicated legacy mouse/touch handlers once pointer events cover them, but keep pinch-zoom working on Gen 3 if it exists today.
```

Done when: you can orbit/zoom/reset Gen 3 with the keyboard only; you can build a path in Gen 2.1 without a mouse; dragging out of the canvas and releasing ends the drag; touch cancel (e.g. a system gesture) does not leave the view stuck.

---

## Stage 6 — Contrast, motion and mobile layout (findings 02, 07, 12, 03)

```text
[PASTE GLOBAL RULES]

Task: Fix visual accessibility and mobile layout.

Finding 02 (templates/index.html, static/style.css):
- Text contrast fails WCAG AA 4.5:1 on: Target Path badge (white on #4da2ff, 2.65:1), Actual Path badge (white on #fb4903, 3.47:1), idle floating Start (white on #16a34a, 3.30:1).
- Change the badge text to a dark color that reaches 4.5:1 on each background (or darken the backgrounds), and use a darker green for the Start button so white text reaches 4.5:1. Compute and report the new ratios. Define colors as CSS variables. Keep the badge colors recognizable as the legend for the plotted lines.

Finding 07 (static/style.css 127-162, both announcement banners):
- .marquee-track scrolls forever. Add a visible Pause/Play button (aria-pressed) that stops the animation (animation-play-state), and honor prefers-reduced-motion by showing the banner static by default. Also pause on hover and on focus-within. Remember the choice for the session only.

Finding 12 (shared .sticker-pos-* rules, static/style.css from ~506):
- At 390px the hero stickers overlap each other, the heading, and the trajectory/status actions. At small breakpoints, reposition the decorative stickers so they never cover text or controls (e.g. place them in normal flow below the heading, shrink them, or hide purely decorative ones with aria-hidden). Do not remove them on desktop.

Finding 03 (static/gen3.css, Controls action/readout layout and Runs table):
- At 390px the document is 529px wide on Controls (Start trial button reaches ~529px) and 670px on Runs. Fix with flex-wrap/grid, min-width: 0 on shrinking children, and wrap action rows. Put the wide Runs table in its own container with overflow-x: auto, tabindex=0, role="region" and an aria-label so only the table scrolls. Do NOT use global overflow-x: hidden to hide the problem.
```

Done when: new contrast ratios are 4.5:1 or higher (check with DevTools); banner can be paused and respects reduced motion; at 390px no horizontal page scroll on Controls or Runs (check `document.documentElement.scrollWidth <= window.innerWidth`) and the Start trial button is fully visible; stickers do not overlap text.

---

## Stage 7 — Idle and failure performance (finding 20)

```text
[PASTE GLOBAL RULES]

Task: Stop doing unnecessary work.

Finding 20 (static/script.js ~231, static/gen3-sim.js ~390 and ~562, static/morphing-button.css lines 9 and 30):
- Gen 2.1 polls status every 100 ms even during repeated failures. Add exponential backoff on consecutive failures (e.g. 100 ms to 250, 500, 1000, up to 2000 ms) and reset to 100 ms on the first success. Do not slow the normal healthy rate. Keep the Stage 1 "unknown" state working.
- Gen 3 simulation polls about every 100 ms and runs a continuous render loop. Pause polling and requestAnimationFrame when the document is hidden (visibilitychange) or the Simulation panel is not the active tab, and resume cleanly when it returns. Ensure no duplicate loops are created on resume.
- morphing-button.css permanently sets will-change (including max-width). Remove the permanent will-change and apply it only during the animation (or drop it).
- No measurement claims: do not state CPU/GPU improvements unless you actually measured them.
```

Done when: with the server stopped, request frequency drops in the Network tab; switching tabs or minimizing the window pauses simulation requests and rendering; everything resumes correctly.

---

## Stage 8 — Full verification and re-audit

Do this yourself, then use the Codex prompt for a code review.

1. Run axe DevTools again on Gen 2.1 (desktop and mobile) and all 5 Gen 3 panels. Compare with the baseline in `audit/axe-baseline/`.
2. Manual checks: keyboard-only walkthrough of both pages, 200% browser zoom, reduced-motion on (OS setting), screen reader on at least the login, tabs and calibration table.
3. Resize to 390, 746 and 1440 widths and look at every panel.
4. With the robot hardware disconnected, test: server stopped, Viewer mode, login errors.
5. Only after that, plan a separate supervised hardware test of Stop behavior and state labels.

Codex review prompt:

```text
[PASTE GLOBAL RULES]

Task: Code review only. Do NOT edit files.

Review the git diff of branch audit-fixes against main. For each of the 21 findings in DASHBOARD_AUDIT_2026-10-28.md, state: fixed / partially fixed / not fixed, with file and line evidence. Then list:
1. Any change that could alter robot behavior, commands sent, calibration handling, or backend contracts.
2. Any broken element ID, selector, or event handler references.
3. Any new accessibility problems introduced (focus order, names, contrast, live region noise).
4. Any place where the UI could still show a wrong robot state.
Be specific and cite code. Do not praise; report problems only.
```

Done when: no axe regressions, no new critical or serious issues, every checklist item ticked, and the review prompt returns no behavior-changing risks.

---

## Troubleshooting

- Codex changes too much: re-send the stage with "Make the smallest possible change. Revert any edit not listed in this stage."
- Codex edits backend code: reject it and add "Frontend files only" to the prompt.
- A stage breaks the page: `git revert` that commit, then re-run the stage with the specific error pasted in.
- Hit your usage limit mid-stage: each stage is self-contained, so you can continue with another model by pasting the Global Rules and the stage prompt.

## Known limits

- Findings 18 and 19 were only identified from source, so reproduce them first if you want proof.
- The audit did not test real hardware, authenticated flows, modal focus trapping, or physical touch. Test these after Stage 8.
- The audit's line numbers may have moved if you edited files since 28 Oct. Tell Codex to search by function or element name if a line number does not match.

## October 2026 Implementation Completion Addendum

All 21 audit findings and unified UI requirements have been implemented and independently audited.
- Backend consolidation path: `gen3-experimental-3d/backend/web_dashboard/web_app.py`
- Launch command: `conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001`
- Comprehensive audit report: `docs/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md`
- Verification: 30/30 Node suites pass; 0 console errors and 0px horizontal overflow across all viewports.


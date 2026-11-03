# SURGE 090: AI-look remediation plan

Date: 2 November 2026  
Status: Proposal only — no implementation authorized by this document.  
Scope: Gen 2.1 `/`, Gen 3 `/gen3`, their shared chrome, and viewer presentation affected by shared changes.

## Recommendation

Make SURGE a calm, recognizable engineering instrument. Preserve its task structure and hardware behavior; remove the competing decorative systems; unify controls around the existing warm-neutral design reference. Let the robot viewer, measured data, and clear operating state carry the identity.

This is an **Operate** surface. The primary audience is the operator planning a path, tuning a simulation, reviewing a run, or commissioning the robot. Success means they can identify the active generation, execution source, connection and sample validity, find the next permitted action, and reach STOP without interpreting decorative effects.

**How might we make the console immediately understandable and trustworthy without changing the robot's operational contracts?**

The smallest complete solution is a visual and presentation-layer cleanup using the existing Flask/Jinja templates, plain CSS, vanilla JavaScript, self-hosted Inter, and Three.js viewers. No framework migration, animation-library installation, new dashboard navigation, or backend redesign is needed.

## Evidence and authority

Read alongside [the audit](../archive/AI_LOOK_AUDIT_REPORT.md), [DESIGN.md](../../DESIGN.md), [current handoff](../GEN3_HANDOFF.md), [joint map](../../generations/gen3-experimental-3d/joint_map.json), and [primary-source research](../research/ai-look-primary-research.md).

This plan combines source inspection with the supplied desktop hero and mobile tab screenshots. It is not a new live-browser audit. The audit's other screenshots and computed measurements remain reported evidence, not independently reproduced results.

Priority when documents disagree:

1. Current user constraints and measured hardware settings.
2. Existing safety, authentication, data-validity, and command behavior.
3. Owner-approved task layout in the handoff.
4. The console-specific design decisions proposed here.
5. Marketing-reference details in DESIGN.md and individual animation recipes.

Important corrections to the audit:

- “AI-made” describes visual symptoms; neither effect filenames nor styling prove who authored the interface. Fix conflicting hierarchy and misleading states, not filenames for their own sake.
- DESIGN.md contradicts itself about violet. Proposed resolution: Carbon-filled primary actions, neutral secondary actions, violet links/focus/selection/checkboxes, and semantic red for STOP/errors. No violet decoration. Document this console adaptation when implementation is approved; do not silently rewrite DESIGN.md now.
- Inter is already self-hosted and explicitly allowed by DESIGN.md. Keep it instead of fetching Manrope or unlicensed Roobert. Remove novelty display fonts from dashboard use.
- The audit's 44px recommendation is a good touch target, but is not the WCAG 2.2 AA minimum. AA target-size rules use 24 CSS px with exceptions; 44px is the enhanced criterion. Use 44px here as the product requirement. Disabled controls have a contrast exception; still make their labels readable. See the linked research.
- Ash is too light to assume it works for ordinary text or necessary control boundaries. Use Carbon for important helper text; verify final combinations. Do not adopt “Ash on Fog” blindly.
- The handoff preserves a specific Gen 2.1 five-box desktop layout and 520px viewer. Do not replace it with new Plan/Physics/Telemetry tabs or a universal table.
- Current generation-transition source has a 2,800ms snake sequence and 500ms reduced-motion path. Its timing differs from the audit's abbreviated description. Remove the navigation ceremony rather than merely shortening the ellipsis.

## Alternatives considered

| Direction | User value | Feasibility / hardest part | Distinctiveness | Decision |
|---|---|---|---|---|
| Delete decoration only | Fast reduction in noise | Small, but leaves mismatched controls and false empty states | Low | First step, insufficient alone |
| Reproduce the Playdate brochure literally | Strong visual identity | Feasible; oversized type/bands displace operating controls | High visual character | Reject for task surfaces |
| Warm-neutral operator console | High scanability and state clarity | Moderate; cascade and DOM dependencies need care | Comes from the robot and engineering content | **Choose** |
| Full-screen 3D cockpit | Viewer becomes dominant | Hides settings and complicates small screens | Strong, but another visual demo | Reject; preserve current layout |
| Step-by-step commissioning wizard | Helps first-time setup | New workflow and state-management scope | Useful for a different task | Defer; would slow expert operation |
| Marketing landing page plus separate console | Clear audience separation | Adds routes/content and maintenance | Good longer-term separation | Defer; not needed to resolve audit |

Three families emerge: cosmetic cleanup, brochure redesign, and operational simplification. Operational simplification wins because it resolves the safety-adjacent layout issues and conflicting styles together. Its main risk is accidentally removing behavior bundled with decoration; the dependency and verification steps below address that risk.

## Proposed visual system

Use the existing CSS system; revise shared rules instead of appending another override stylesheet.

| Role | Decision |
|---|---|
| Main text | Carbon `#312f27`; no global pure-black text |
| Page / groups | Paper `#ffffff`, Fog `#efefef`, Sand `#e9e4d9`; use spacing before adding boxes |
| Brand | Sunbeam `#ffc500` in one deliberate identity band carrying the lowercase wordmark, plus optionally the viewer robot. This band is required, not optional: with the hero, glass and stickers gone it is the only brand moment, and removing it too turns the console generic gray. No yellow status pills elsewhere |
| Primary action | Carbon fill with Paper text; one obvious primary action per task group |
| Interactive accent | Violet `#7700ff` for links, focus, selected affordances and native checkbox accent |
| Status | Existing red family consolidated around `#b91c1c`; green only with an explicit confirmed/healthy label; warning text remains explicit. Preserve battery warning semantics |
| Borders | Keep structural dividers and necessary input/focus boundaries. Borderless content panels do not mean borderless controls |
| Surfaces | Flat Paper groups; 2.85px content radius, 6px controls; no hard offset shadows. A restrained overlay shadow is acceptable for an actual overlay |
| Type | Self-hosted Inter, normal body weight, semibold controls, bold headings. Sentence case; monospaced text only for logs/identifiers where useful |
| Type scale | 13px metadata, 15px body/control labels, 18px section headings, 24px page title; rem equivalents. Mobile text inputs at least 16px. Do not shrink to fit |
| Spacing | 4/8/12/16/24/32px console rhythm; 16px mobile outer gutters, 24px desktop group padding. No automatic 60px brochure section gaps |
| Controls | At least 40px desktop / 44px touch hit areas. Visible focus outline with sufficient contrast. STOP at least 56px tall |
| Data | Tabular numerals, explicit units, stable alignment, no odometer animation |
| Icons | Reuse existing inline SVG conventions, `currentColor`, consistent 1.5–2px optical weight. Text-only tabs. No new icon package |

Cards that are not actionable have no hover effect. Focus and hover communicate actual interaction. Use text and symbols alongside semantic color; neither green nor a full bar establishes valid measurement by itself.

## Layout and interaction specification

### Shared shell

Replace the marquee, stickers, glass headline plate, dot backdrop and animated hero with a compact identity/task header. Keep a single wordmark and a task title: “Plan a planar path” or “Run 3D gaits.” Do not insert a second product render above the existing working viewer.

Desktop order: identity and generation links → operator/session and system status → connection controls and execution state → task workspace. Keep CPU/RAM/temperature/battery as plain aligned values, with sample freshness and N/A preserved. Never relabel the diagnostic battery estimate as live state of charge.

Mobile order: identity/generation → connection and session controls → task navigation → task workspace. Allow sensible row wrapping; do not shrink controls into pills. Search stays on Gen 3 and retains its navigation-only behavior.

Keep native links for generation changes, including modifier-click, reload, back/forward and no-JavaScript navigation. Remove the transition overlay and its interception; never add an artificial minimum loading duration.

### Persistent STOP

Move the existing STOP control into a dedicated bottom dock, outside tab scrolling. Keep its element IDs and existing generation-specific handlers. Desktop: compact action aligned to the dock edge. Mobile: full-width 56px action. Keep its current state text adjacent and readable.

Reserve the **actual dock height**, safe-area inset and a small gap in page layout and scroll offsets. A fixed 90px guess is insufficient when text wraps, zoom increases or the keyboard opens. Prefer a layout-reserved dock; if fixed positioning is retained, measure its rendered height. Verify the last input, button and footer link remain visible.

STOP must not depend on a successful sign-in, an animation completing, a tab switch, or a confirmation dialog. Preserve current lease-loss behavior. A click is a request, not proof of torque release: retain “Stop unconfirmed” and “Status unknown” paths. Do not call this a physical emergency-stop circuit.

### Gen 2.1

Preserve the owner-approved desktop arrangement:

```text
Math path         | Live trajectory (520px) | Simulation physics
Gamepad state/node|                        | 
Joint telemetry across left + center      |
```

Keep the generator, preview/use/cancel, tracking toolbar, physics Apply/Reset, gamepad and telemetry capabilities in their existing contexts. At widths where columns cannot fit, stack viewer and its task controls, math path, gamepad, physics, then telemetry. Keep visual and keyboard reading order coherent.

Retain the 2×5 desktop telemetry organization; allow fewer columns on mobile. Disconnected telemetry still lists joint IDs with unavailable values and one explanation. Do not create fictitious speed/load fields where a source lacks them.

### Gen 3 tabs

Preserve all five tabs and their existing panel IDs. Use one horizontal scroll row on narrow screens, with a clear overflow affordance and selected-tab visibility. No wrapping oval, hover lift, extra underline or animated backdrop. Keep tab roles, selected state, roving keyboard focus and arrow/Home/End navigation; no focusable controls in hidden panels.

| Tab | Proposed treatment |
|---|---|
| 3D Simulation | Retain gait selection, viewer and settings topology. One viewer toolbar and compact legend. Distinguish illustrative neutral pose, simulated pose and measured samples |
| Controls | Group draft inputs, per-joint settings and actions; keep limits, units, validation, confirmation and live Apply semantics. Show draft versus applied state using existing state |
| Runs & Presets | Replace KPI tiles with a truthful summary. Keep preset actions; quiet Delete without weakening confirmation. Use six primary journal columns: Run, Time, Mode, Execution, Duration, Actions; retain speed and downloads in expanded details |
| Calibration & Diag | Preserve separate map and safety-limit groups, revision/conflict detection and physical-order joint IDs. Explain disabled actions using the actual missing prerequisite; keep maintenance warnings beside the affected action |
| Firmware | One clear capability/limitation notice followed by the existing checklist. Keep logs and technical details available. Preserve allowlists, structured arguments and upload restrictions |

Use an **inline expanded run row**, not a new drawer framework, for displacement, surface and notes. Keep persistent labels, units, validation errors and save state. On small screens use a labeled run summary with expandable details rather than compressed placeholder-only inputs. Cancel preserves stored values; failed saves preserve the draft; refresh must not silently discard edits.

Search results show title, destination tab and a sentence-case snippet ending at a word boundary. Opening a result selects and focuses its destination; it must never execute the matched action. A long identifier may wrap without forcing page overflow.

### Viewer

Unify stage chrome and toolbar across generations without merging their simulation implementations. Use a neutral stage with a distinct robot silhouette; try Slate and a yellow model only if paths, grid, selected joints and axes remain legible. Keep target/actual paths distinguishable by line style and labels, not just color. Do not recolor semantic diagnostics into brand yellow.

Keep essential execution/source state visible on mobile. Move optional camera details into a compact disclosure; do not blindly hide the entire HUD. Preserve fullscreen and camera controls.

Normal wheel/touch gestures scroll the page until the viewer is engaged. Engage on click/tap or keyboard focus (Gen 2 drawing already starts with a pointer press on the canvas, so no extra step is added); release on Esc, blur or a click outside. Show a small hint (“Click to zoom · Esc to release”) only while disengaged and hovered. Keep keyboard-accessible zoom/reset buttons. Do not add a separate “Interact with view” mode toggle. Preserve browser Ctrl+wheel zoom rather than commandeering it. Ensure pointer capture ends on release/cancel. Test the shared `/3d` consumer for regressions.

## Truthful state contract

| State | Required display and behavior |
|---|---|
| Disconnected / no sample | `—`, empty unfilled track, “No samples yet” for the group; joint IDs remain visible |
| Measured zero | Numeric zero with units; not treated as missing. Position bars must encode their domain, not generic percentage completion |
| Partial samples | Show available joints; mark missing joints individually so one group message cannot hide partial failure |
| Stale sample | Last known value only with explicit stale age/state; do not present stale fill as live health |
| Simulation / preview | Label the source; a neutral render is illustrative, never measured feedback |
| Run without displacement annotation | “No displacement recorded”; exclude missing values from measurement aggregates |
| Some annotated runs | State coverage, e.g. “Displacement recorded for 8 of 50 runs”; report only valid finite recorded values. Preserve legitimate 0 and existing sign semantics |
| No duration | Do not inject zero into an average; use valid duration records and identify the denominator |
| Viewer / missing lease | Explain the exact prerequisite for the relevant action; preserve server-side gates and independently available STOP |
| Request pending / failure | Pending is not success. Keep actionable error text and retry behavior; do not erase last useful data or unsaved input |

Changing wording must not weaken domain truth. “Changes apply live” is appropriate only for inputs with that contract; never apply it wholesale to calibration, saved physics, or draft-only controls. Keep revision tokens available under Details and expose actionable save conflicts prominently.

## Motion decisions

Use the transitions skills as a vocabulary, not an instruction to animate every eligible element. Apply tokens by **purpose**, never by proximity to a number. No blanket timing replacement in polling, debounce, simulation interpolation, watchdogs or hardware deadlines.

| Audit motion IDs | Decision |
|---|---|
| M1, M5–M11, M23, M29–M31, M33 | Remove decorative loops, hover movement, hero/shader effects, heading effects and generation overlay |
| M2–M4, M12, M17, M20, M24, M28 | Explicit color/background/border transitions, 150ms ease-out. No lift and **no press scale anywhere**, including the team footer's existing `.96` (M28), so the console has one consistent rule: color-only feedback, zero transforms on controls. Press state is a darker background, shown immediately |
| M13 | Keep slider geometry stable; use focus/active color rather than thumb expansion |
| M14–M15 | Preserve live-input responsiveness. Consider scaleX for trigger fill if equivalent; leave existing 100ms stick smoothing alone unless measurement identifies a problem |
| M16, M19 | Replace bouncing width morph/error shake with a stable sign-in disclosure and persistent inline error. Preserve input focus, visibility toggle and submit handling |
| M18 | Password visibility icon may switch instantly with an accessible label; no blur/scale recipe needed |
| M21 | If generation hints remain: focus and hover support, 80ms pointer intent delay, at most 150ms opacity reveal, immediate dismissal; hints cannot carry essential generation information |
| M22, M27 | Preserve useful restrained feedback; standardize only where semantic roles match |
| M25 | Use static selected-tab/search states. A moving indicator is unnecessary; removes width/height animation and resize bookkeeping |
| M26 | Render live numbers immediately with tabular numerals; retain precision/units and all callers |
| M32 | Immediate safety/status text. Optional noncritical color fade up to 150ms; do not normalize merely because 120/200ms is off the catalog scale |

For an existing genuine dropdown/dialog that remains: 250ms open, 150ms close, smooth-out; no entrance delay, overshoot or mandatory blur. Do not install the full transitions.dev token catalog for these few uses. Ordinary CSS transitions are sufficient; do not add modals solely to use a recipe.

Reduced motion removes nonessential transforms, blurs, staggers and loops. State changes and focus movement still occur. Essential simulation rendering remains truthful and must be separately controllable; disabling decorative motion must not halt status processing or control logic. Hidden elements must also leave the interaction/focus order; opacity alone is insufficient.

**GSAP decision:** do not restore or add GSAP for this work. The current working tree already stages removal of its vendor file and the proposed motion needs no coordinated timeline. If a later, separate requirement genuinely needs one, scope it with `gsap.matchMedia()`, revert on teardown, respect reduced motion, use documented transform aliases and interruption handling, and never drive robot commands from tween callbacks. See primary-source research.

## Audit closure map and polish coverage

Locations below are relative to `generations/gen3-experimental-3d/backend/web_dashboard/`. Audit selectors identify elements where a line number is not needed. This is a full-scope **planning review**, not an approval of rendered implementation.

| Severity | Audit IDs / location | Before | Proposed after | Why |
|---|---|---|---|---|
| MEDIUM | F01–F02, F14–F15, F28; `static/style.css`, `gen3.css`, `unified-cockpit.css:5` | Multiple palette/font/card recipes | Shared tokens, Inter and flat groups | Consistent hierarchy and legibility |
| MEDIUM | F03–F05, F07, F23; both templates' hero/header | Repeated branding, glass, stickers, marquee, chips | Compact task header and plain status values | Product tasks become the focal point |
| MEDIUM | F06, F27, F30; tabs, generation hints, checkboxes | Emoji and unrelated hint styles | Text tabs, existing SVG idiom, shared controls | Consistent affordances |
| HIGH | F08, F17, F22; `static/gen3-sim.js:213`, `gen3.js:1369`, `#telemetry-hub` | Half bars / zero aggregates without data | Explicit unavailable/partial/stale states and annotated-run coverage | Avoid invented precision |
| HIGH | F09, F29; `static/unified-cockpit.css:37` | Wrapping pill and competing selected treatments | Scrollable tab row and one static selected treatment | Mobile navigation remains usable |
| HIGH | F10; `#floating-stop-btn`, `static/gen3.js:1162` | STOP overlays content | Reserved dock with unchanged immediate handler | Reachable action and unobscured controls |
| HIGH | F11; hero canvas | Decoration crosses controls | Remove decorative canvas from task header | Prevent obstruction and distraction |
| MEDIUM | F12–F13; Gen 2 controls, diagnostic actions | Small hit areas and compounded disabled opacity | 40/44px targets and legible prerequisite explanations | Reliable interaction and discoverability |
| MEDIUM | F16, F20; Controls / Calibration / Firmware | Internal jargon and nested callouts | Task-specific copy; details disclosure; visible safety prerequisites | Lower reading cost without losing warnings |
| MEDIUM | F18–F19; `static/gen3.js:1395`, presets | Cramped annotations and loud Delete | Expanded editor; quiet destructive action with existing safeguards | Prevent mistaken editing/deletion |
| MEDIUM | F21; `static/gen3-search.js:68` | Raw truncated snippets | Destination labels, word-boundary snippets, focus navigation | Results explain where they lead |
| LOW | F24; `templates/team_footer.html` | Repeated cards and disabled social links | Neutral compact list, existing factual identity and working links | Remove placeholder appearance |
| MEDIUM | F25, F31; viewers and camera handlers | Divergent HUD/stage and wheel capture | Consistent chrome and explicit interaction mode | Preserve scrolling and viewing clarity |
| HIGH | F26; retained text/control combinations | Reported low contrast | Check all retained text at 4.5:1 ordinary / 3:1 large; required visual boundaries at 3:1 | Accessible reading and control recognition |
| MEDIUM | M1–M33; motion section above | Decoration and data animation mixed with functionality | Remove decoration; preserve numeric updates and input feedback | Motion restraint and correctness |

| Polish category | Evidence inspected | Boundary / result |
|---|---|---|
| Typography | Font declarations, shared CSS, audit F14–15, supplied desktop screenshot | Existing Inter confirmed; rendered final metrics not verified |
| Surfaces | Shared CSS, template includes, desktop/mobile screenshots | Hard borders/shadows and tab geometry corroborated; all routes not rerendered |
| Animations | Generation transition, morphing-password logic, numeric callers, shared rules; M1–33 | Timing and dependencies inspected; 10% speed browser review not run |
| Icons | Password toggle source, supplied screenshots, audit inventory | Reuse SVG/text prescribed; full SVG asset audit not performed |
| Performance | Template effect imports, live numeric updates, prior optimization note | Redundant effects identified; no fresh performance trace or claimed speedup |

## Implementation reach and migration order — future work

The working tree already contains substantial changes, including staged asset deletions. Recheck it at implementation time; preserve unrelated work. Do not restore deleted dependencies just because older tests reference them.

| Area | Files / callers that must be considered together |
|---|---|
| Shared styling | `style.css`, `unified-cockpit.css`, `gen3.css`, `motion-state.css`, `generation-switch.css`, `halo-select.css`, `team-footer.css`, inline template styles and JS-generated styles |
| Structure | `templates/index.html`, `gen3.html`, `team_footer.html`, `battery_indicator.html`; shared-style impact on `3d_viewer.html` |
| Stateful presentation | `gen3.js` run summary/editor/diagnostics/timers, `gen3-sim.js` initial **and ongoing** sample rendering, `script.js` telemetry/STOP/controls, `gen3-search.js` navigation |
| Auth and status contracts | `morphing-button.js`, `operator-session.js`, `motion-state.js`, `battery.js`; retain exports, events, IDs and consumers until migrated |
| Numeric rendering | Every `updateRollingNumber` caller: demand, diagnostic voltage/temperature/active count, run summary and elapsed/duration. Update to ordinary values before retiring `rolling-number.js/css`; guarded callers otherwise silently stop updating |
| Decoration retirement | Template imports, CSS hooks, initializers, globals, storage and tests for distorted-glass, shader-lens-blur, grid-beam, pixel-snake-heading, liquid-grid, hero-fluid-trail, hero-snake-motion, hover-background and generation-transition |
| Navigation retirement | `SurgeGenerationTransition.ready/fail` consumers, session-storage handoff, dialog/focus handling, root hiding classes, browser tests; remove together so a destination cannot remain hidden |
| Tests / fixtures / docs | Existing CJS and Python frontend checks, browser screenshots, offline asset tests, visual baselines, DESIGN.md console clarification and handoff if behavior visibly changes |
| Out of implementation scope | Hardware map, gait limits, firmware, API authorization, serial handling, stored runs/presets, package dependencies and build tooling |

Do not delete an effect file until a repository-wide reference search confirms all real consumers, test imports and template hooks have been handled. `morphing-button.js` is functional code, not an expendable CSS effect. `hover-background.js` may serve search and tabs: migrate both before removal. Preserve WebGL used for actual simulation.

### Sequence

1. **Record baseline and behavioral contracts.** Capture the existing two routes, five Gen 3 tabs, disconnected/fixture states and dirty-tree scope. Confirm handler IDs and safety paths. Record the chosen DESIGN.md conflict resolution in the proposed console design notes.
2. **Fix obstruction and misleading data first.** Tab overflow, STOP layout, touch targets, no-sample bars in both initialization and render loop, and missing-versus-zero journal values. Keep safety logic unchanged.
3. **Remove decoration and unify primitives together.** Shared shell, flat surfaces, type, icons, legends, disabled/focus states. Migrate functional dependencies before retiring files. Avoid another layer of CSS overrides.
4. **Finish task-specific presentation.** Run editor, preset actions, firmware notices, diagnostic copy, search and viewer gestures. Keep Gen 2 topology and Gen 3 tab structure.
5. **Verify retained motion and all operational states.** Add only the few useful transitions, test reduced motion and rapid interruption, compare screenshot matrix, and check offline loading. Stop when the acceptance criteria pass; no animation embellishment phase.

Each step should leave a usable console. Do not promise the audit's “under a day” estimates before the dependency inventory is complete.

## Acceptance and verification plan

No code tests were run for this Markdown-only proposal. The following are future implementation gates, not completed verification.

**Two tiers.** The **per-stage gate** (run after every sequence step) is: `/` and all five `/gen3` tabs at **390px and 1440px**, the truthfulness fixtures (item 3), the command invariants (item 4), and the exit metrics below. Everything else in this list is the **final sweep**, run once after step 5. This keeps each stage cheap enough for one person to verify without dropping safety or data-truth checks.

**AI-look exit metrics.** Measured in the live browser on `/` and each `/gen3` tab with the same `getComputedStyle` scripts the audit used (baseline in brackets: Gen 2 / Gen 3):

| Metric | Baseline | Target |
|---|---|---|
| Distinct non-transparent background colors | 22 / 28 | ≤ 10 |
| Emoji characters in UI text | 14 / 18 | 0 |
| Pill-radius (≥ 999px) elements under 40px tall | 48 / 34 | ≤ 10, all state or filter chips |
| Distinct border-radius values | 10 / 14 | ≤ 4 (2.85px, 6px, 22px, 50%) |
| Hard offset shadows (`Npx Npx 0`) | 7 / 19 | 0 |
| Font families rendered (excluding monospace for logs/IDs) | 3 / 3 | 1 (Inter) |
| Infinite CSS animations or rAF loops outside the simulation viewers | 4 (marquee, headlight beacon, hero snake, transition ellipsis) | 0 |
| `transition: all` rules (shorthand without a property list) | present | 0 |
| Distinct transition durations | 17 | ≤ 3 (100, 150, 250ms) |
| Transforms on hover/press of controls | ~15 | 0 (stick-dot and trigger fill excepted as live input) |
| Generation switch time added by UI | 2,800ms | 0ms |

A stage may not claim “done” if it moved any metric the wrong way.

1. **Layout:** final sweep adds 320, 768 and 1024px to the gate's 390/1440px; 200% zoom and browser reflow checks; virtual keyboard and long labels. No page-wide horizontal overflow. Tables/canvas may use clearly bounded local overflow where necessary. All focused controls and the final row remain above the STOP dock.
2. **Interaction:** keyboard-only sign-in, show/hide password, search, tabs, sliders, row expansion, preset controls and firmware details. Native link behavior, browser back/forward and reload remain intact. Focus is visible, restored after disclosure/overlay dismissal, and absent from hidden content.
3. **Truthfulness:** fixtures for disconnected, first sample, zero, partial samples, stale, invalid/non-finite values, no annotated runs, mixed annotations, valid zero displacement and missing duration. Values and freshness must remain consistent through updates and disconnects.
4. **Command invariants:** mocked/fixture checks for immediate STOP dispatch, independent lease-loss stop, failed stop acknowledgment, viewer permissions, draft/apply distinction, map conflicts and unsafe requests rejected. Search and tab changes issue no robot commands.
5. **Motion:** default and reduced motion, first render, rapid open/close, repeated clicks, resize during reveal and hidden-tab return. Replay any retained motion at 10% speed. No live-number animation, looping hero, fake loader or interaction blocked by transition cleanup.
6. **Accessibility:** measure final contrast instead of trusting token names; verify 40/44px targets without overlapping hitboxes, labels/units, status announcements that do not spam on every telemetry tick, and viewer controls independent of pointer gestures.
7. **Offline/performance:** self-hosted assets resolve without internet; no retired script 404s or missing globals. Compare visible-tab performance with simulation fixtures before/after; confirm decorative loops are gone without pausing safety/session processing. Do not claim an FPS or load-time improvement without measurement.
8. **Regression suites:** extend `test_truthful_telemetry.cjs`, `test_action_contract.cjs`, `test_operator_session.cjs`, `test_keyboard_navigation.cjs`, `test_accessible_form_names.cjs`, `test_console_search.cjs`, `test_canvas_accessibility.cjs`, `test_visual_accessibility_mobile.cjs`, battery suites and preset tests as relevant. Run existing Python web/console hardening checks if templates or command-facing bindings change.

`test_unified_ui.cjs` currently asserts the presence of decorative canvases and telemetry wiggle. Replace those obsolete appearance expectations with task and accessibility assertions; do not retain the effects just to keep source-string checks green. Retire effect-specific tests only when the effect has no remaining consumers; retain behavior tests for login, navigation, sample rendering and STOP. Browser checks must prove geometry and interaction, since string assertions cannot prove a dock does not overlap content.

After the UI is implemented, run the Impeccable detector on changed UI targets and do a human-style rendered review. Planning-review verdict: **Block visual sign-off** while the reported HIGH concerns remain unresolved. Live rendering, connected/signed-in states, contrast, touch gestures, motion replay and performance remain unverified in this review; this is not an instruction to block existing operation or start hardware tests.

## Assumptions, limits and non-goals

- Assumption: repeated operation is the primary use, not a public product demonstration. Existing control structure and the handoff support this. Validate with a short operator walkthrough before adopting any broader redesign.
- Assumption: removing decorative identity is acceptable when the robot, wordmark and restrained yellow remain. A future marketing surface can carry more expression without changing this console.
- Assumption: annotation data can distinguish absent values from zero. Confirm actual API fixtures; if it cannot, report that contract gap rather than infer measurements.
- Keep current map values: pitch ID 1 `+1`, pitch IDs 3/5/7/9 `-1`, all yaw IDs `+1`, zero `2048`, min/max `1252/2844`, speed `1500`, tracking error `216`, timeout `0.5`, calibrated `true`. These are the inspected JSON values, not replacement defaults. Older handoff paragraphs mentioning speed 500/error 25 do not override the file.
- Simulation geometry/contact and loaded locomotion remain limited by measured evidence. Styling must not imply a validated digital twin, autonomous navigation or field safety. Preserve those distinctions.
- No new framework, styling system, GSAP installation, icon library, chart library, universal motion catalog, dark-theme redesign, synthetic telemetry, generated robot imagery, new route, or commissioning wizard.
- No hardware connection, serial query, motion trial, firmware upload, calibration edit, API/security relaxation, stored-data migration, commit or deployment is part of this plan.

The main implementation risk is behavior hidden inside decorative modules and tests coupled to their markup. Resolve it by migrating callers first, retaining validation, and testing observable behavior. This document authorizes no implementation; it supplies the reviewable direction for the next task.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**Dashboard and website (31 Oct – 2 Nov).**
- Fonts are self-hosted (Antonio, Bowlby One, Inter; `static/fonts/`). Images are WebP.
- Removed the GSAP bundle, `socket.io.min.js` and `snake_motion.mp4`. `OrbitControls-r128.js` is vendored for `/3d`.
- `web_app.py` adds asset versioning, compression and cache headers.
- Generation-switch transition rewritten as one 2D-canvas controller (shaded 3D and flat planner
  variants, approaching viper head); no GSAP.
- Hero snake trail is 1.5× stronger. Battery indicator added to both headers.
- 2 Nov "AI-look" audit (`../archive/AI_LOOK_AUDIT_REPORT.md`, screenshots in `report-assets/`).
  Follow-ups: remediation plan `docs/ideas/ai-look-remediation-plan.md` and research
  `docs/research/ai-look-primary-research.md`. These are **proposals only, not implemented**.

**Status.** Still a proposal. Nothing implemented; awaiting owner approval.

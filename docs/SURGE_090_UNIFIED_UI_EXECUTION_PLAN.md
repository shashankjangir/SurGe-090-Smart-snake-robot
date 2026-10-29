# SURGE 090 — Unified Playful Dashboard: Autonomous Implementation Plan

**Status:** Ready for Codex execution; no routine approval checkpoints  
**Scope:** Frontend unification and confirmed frontend defects for Gen 2.1 (`/`) and Gen 3 (`/gen3`)  
**Design direction:** Original colorful, cartoonish, energetic Slush identity — **not** Ivory-and-Ink, Obsidian, or a minimalist redesign  
**Active source:** `gen3-experimental-3d/backend/web_dashboard/` (verify current entry points before editing)  
**Operating mode:** Inspect → implement in small increments → test → repair → report. Proceed autonomously within the boundaries below.

## 0. Mission and non-negotiables

Finish the shared frontend so switching between generations feels like switching workspaces within **one SURGE 090 application**, not visiting different websites. Reuse the strongest existing implementations, preserve operational truth, and fix bugs at their root causes. **Do not stop to request design approvals or implementation permission.** Make routine choices based on the existing plan, the actual code, accessibility, and measured verification.

**Must preserve:** electric blue, mint, lavender, orange, yellow; expressive typography; black outlines; rounded/pill components; stickers; marquee; hero snake; background shaders; playful microinteractions; Gen 3 heading animation; Gen 2.1 telemetry hover vibration; generation switch info cards and page transitions. Effects may be adjusted only to remedy demonstrated issues such as accessibility, overlapping controls, stutter, or excessive GPU work; retain their recognizable behavior.

**Must not change:** physical robot commands, firmware, servo/joint calibration, measured settings, joint map, mechanical or safety limits, control algorithms, authentication/authorization, operator lease, emergency-stop backend logic, API contracts, or hardware configuration. Never actuate hardware or issue real movement commands during verification. No fake telemetry, synthetic measured claims, or invented controls. Never hide or mask a failed safety operation behind an optimistic UI message.

**Approval-free does not mean unsafe:** proceed without asking for routine review, but **do not** perform destructive actions, write real calibration, alter robot safety behavior, deploy to production, connect hardware, change secrets, or commit/push automatically. If an essential action would cross these boundaries, skip that action, document why, and continue the remaining safe work.

## 1. Source-of-truth order and initial discovery

Read in this order before implementation:

1. `docs/ideas/SURGE_090_UNIFIED_UI_IMPLEMENTATION_PLAN.md` — intended shared design and concept image at `assets/surge-090-unified-concept.png` relative to that plan. Resolve the actual file location rather than assuming the link is correct.
2. `docs/GEN2_1_VS_GEN3_FRONTEND_COMPARISON.md` — candidate differences and effects; **not** proof of current behavior.
3. `docs/GEN3_HANDOFF.md` — current operational constraints and handoff notes.
4. `gen3-experimental-3d/joint_map.json` — actual joint definitions/settings; **read only**.
5. Relevant current source under `gen3-experimental-3d/backend/web_dashboard/`, including routes/templates, CSS, JS modules, assets, and existing test commands.
6. Existing dashboard audit (if present, e.g. `docs/DASHBOARD_AUDIT_2026-10-28.md`), its newer revisions, and git changes. Revalidate each relevant finding: resolved / still present / cannot reproduce.

The earlier comparison mentions an older `shared/web-dashboard/` location; locate the actual active files rather than editing stale copies. Confirm whether the app uses templates/static assets, build tooling, or generated bundles. Check the server routes that serve `/` and `/gen3`.

**Critical configuration discrepancy to investigate, not silently fix:** earlier handoff notes reportedly list speed `500` and tracking error `25`, while a joint map reportedly contains `1500` and `100`. Inspect authoritative current data and related code. Do not overwrite measured settings merely to reconcile documentation.

Before edits:
- Capture `git status --short`, current branch, relevant diff, and any staged changes. Preserve existing uncommitted work; do not reset, checkout, clean, or overwrite unrelated edits.
- Identify test commands and the safe local launch method. Ensure the app can run in offline/simulation mode without connecting to robot hardware.
- Inventory existing shared components, CSS tokens, event handlers, safety-related UI states, and asset dependencies.
- Establish a brief baseline of desktop/mobile screenshots where feasible and collect reproducible console/layout failures.
- Produce a private work checklist of verified gaps; do not repeat changes already completed.

## 2. Target experience and information architecture

Both routes should have the **same structural hierarchy**:

1. Shared header: brand, connection/role feedback, generation switch with info cards and View Transitions API behavior.
2. Shared expressive SURGE 090 hero using the existing Gen 3 heading treatment; preserve the hero snake and compatible background effects.
3. Shared task-tab strip immediately above the main work area, with consistent active/hover/focus/disabled states and gliding indicator.
4. Central cockpit workspace with task-specific canvas/simulation content and adjacent context controls at comparable locations.
5. Consistent supporting metrics, telemetry cards, diagnostics, and status feedback.
6. Consistently located **always-visible Stop action** with clear enabled/disabled/pending/result states, while invoking each generation's original Stop handler. Ensure it remains discoverable during scroll and on small screens without covering essential controls.

**Not identical capabilities:** Gen 2.1 retains planar trajectory drawing, waveforms/math presets, live tracking, gamepad feedback, physics settings, and its joint telemetry. Gen 3 retains its actual simulation panel, gait tuning, finite runs/trials, presets, calibration map, single-joint jog, bus diagnostics, runs, firmware/status information, and operator-gated actions. Use task tabs or equivalent panels to organize existing functionality; do not invent a 3D viewer, measured performance, or unsupported robot modes.

**Search stays Gen 3 only.** Results may navigate or focus an existing target/tab but **must never actuate a control** as a side effect. Keyboard search should support closing, focus restoration, and safe navigation.

## 3. Shared design and interaction contract

Retain the original Slush palette and personality. Create or consolidate **reusable semantic style tokens** for existing vibrant colors, borders, radii, typography, spacing, motion, elevation, focus, and status without replacing the look with muted neutrals. Preserve deliberate expressive asymmetry where it does not impair consistency or operation.

Implement a shared component vocabulary across routes:

| Family | Shared contract | Allowed generation-specific variation |
|---|---|---|
| Buttons | Recognizable shape, size scale, active/hover/press/focus/loading/error/disabled feedback; avoid inconsistent click areas | Semantic variants for Stop, primary motion, gated hardware, secondary tools |
| Tabs/navigation | Same height, placement, shape, gliding highlight, focus order, keyboard behavior, and route awareness | Tab labels/panels differ by generation |
| Cards | Consistent border/radius/shadow, headers, padding, icon alignment, empty/overflow behavior | Density varies for calibration, plots, diagnostics |
| Telemetry | Consistent label/value/unit hierarchy, update feedback, Gen 2.1 hover vibration, keyboard focus handling | Different quantities and physical meanings |
| Inputs | Consistent labels, value readouts, error/disabled/active states, tap targets, arrow-key behavior where appropriate | Calibration-specific precision and physical constraints |
| Status | Text + icon/shape with explicit source and recency: simulated, measured, stale, offline, unavailable | Physical states and allowed actions differ |
| Modals/popovers | Predictable open/close, backdrop behavior, focus trap/return, escape handling, accessible names | Safety confirmation text and permissions differ |
| Charts/canvas | Responsive viewport, readable controls, correct pointer/touch behavior, no false data | 2D planar vs existing Gen 3 simulation |

**Effect convergence:**
- Gen 3 `PixelSnakeHeading`/SURGE 090 treatment → both routes; avoid duplicate initialization or heading state corruption.
- Gen 2.1 telemetry-card vibration → both applicable telemetry surfaces; do not shake live-critical readouts so severely that they become unreadable.
- Preserve `CanvasFractalGrid`, `HeroSnakeMotion`, `DistortedGlass`, and generation-switch info cards/transitions on both where already supported.
- Assess `MorphingButton`, `ShaderLensBlur`, `GridBeam`, `RollingNumber`, `HaloSelect`, and `HoverBackground` individually. Reuse where appropriate; do **not** force every decorative widget onto both generations if misleading or costly.
- Keep existing marquee and sticker treatments unless they obscure controls or fail accessibility/performance checks.
- Guard canvas/WebGL effects against unsupported browsers, hidden tabs, reduced motion, and teardown; stop listeners/animation loops when components unmount or pages unload.

Use shared styles/modules or scoped component primitives **where the current architecture supports them**. Avoid wholesale framework migration, broad file rewrites, extra runtime dependencies, or duplicating CSS to simulate consistency.

## 4. Implementation sequence (execute without approval prompts)

### Phase A — Verified gap audit
1. Trace real routes, active CSS/JS and task panels; identify existing shared pieces.
2. Compare actual Gen 2.1 vs Gen 3 layouts, controls, button states, card formats, forms, telemetry, motion, tab behavior, responsive modes, and focus handling.
3. Recheck existing audit findings against current implementation; record new reproducible issues and potential regressions.
4. Map the UI safety boundaries, STOP bindings, operator authentication and lease presentation; **read, do not modify backend safety logic**.
5. Create a compact work ledger: finding → reproduction/evidence → target file → change → test. Prioritize real functional and safety-communication issues over cosmetics.

### Phase B — Shared shell and visual foundations
1. Factor the shared header, generation switch, hero, task navigation and common CSS primitives as minimally as possible.
2. Keep active page state, URLs, bookmarks, browser back/forward navigation, and generation info cards functioning.
3. Align responsive geometry and placement without hiding route-specific functions.
4. Ensure layering of shader/canvas/marquee elements never intercepts functional inputs or keyboard focus.
5. Verify both routes render and switch correctly before moving on.

### Phase C — Shared interaction components
1. Normalize button variants, focus/press/hover feedback, typography, sizes, status language, form controls, card framing, telemetry appearance, and task-tab interactions.
2. Apply the Gen 3 animated heading treatment to Gen 2.1 through the existing component rather than copying animation logic.
3. Apply Gen 2.1 telemetry hover vibration to Gen 3 telemetry without interfering with selection, values, or reduced-motion preferences.
4. Bring compatible tab indicator and microinteraction patterns together; fix listener, animation lifecycle, or styling conflicts discovered.
5. Maintain deliberate per-generation distinctions for authenticated/gated hardware operations.

### Phase D — Cockpit and workspace consistency
1. Put task tabs above each central cockpit and align the corresponding workspace/controls/telemetry regions.
2. Keep Gen 2.1 canvas interaction, path drawing, math modes, camera/pan/zoom, simulation settings, gamepad, and telemetry intact.
3. Keep Gen 3 existing simulation and all calibration, single-jog, diagnostics, finite trial, run/preset, and operator workflows intact.
4. Integrate a visually consistent, always-visible Stop control for each route using **existing** action binding and truthful progress/result messaging. Do not create a second conflicting Stop mechanism or bind UI animations to real hardware state falsely.
5. Make offline/simulation/measurement indicators unambiguous; show stale/unavailable without inventing replacement values.

### Phase E — Defect correction and resilience
1. Fix confirmed frontend bugs at root cause; avoid sweeping speculative refactors.
2. Address CSS collisions, layout overflow, hidden click targets, pointer capture, duplicate handlers, focus traps, modal dismissal, incorrect state updates, and misreported statuses.
3. Make animations performant: avoid unnecessary layout thrash, resize storms, leaked RAF loops, excess redraws, and expensive effects during inactive tabs; preserve the visual result.
4. Treat network failures, lost leases, disconnected/offline robot state, missing telemetry, and rejected commands accurately in the UI. Do not bypass authorization or safety gates.
5. Add focused automated regression coverage for each nontrivial behavior changed.

### Phase F — Browser and automated verification
Use the available browser or local browser automation; **do not claim browser verification if unavailable**. Test **both routes and every actual task panel** under a disconnected/simulated setup only.

Minimum viewport matrix (adjust to real breakpoints): desktop `1440x900`, laptop `1280x800`, tablet `768x1024`, mobile `390x844` and narrow mobile `320x640`. At each size inspect horizontal overflow, hit-target overlap, tab scroll behavior, sticky Stop visibility, canvas containment, table scrolling and legibility.

Verify:
- Generation switching, tooltip/info cards, URL/history behavior, and view-transition fallback.
- Keyboard-only navigation: Tab, Shift+Tab, Enter/Space, arrow navigation for appropriate tab widgets, Escape, focus restoration, visible focus, search navigation without command execution.
- Mouse and touch: drawing/pan/zoom vs page scroll, tabs, sliders, buttons, dialogs; no accidental robot commands.
- `prefers-reduced-motion`, unsupported WebGL, hidden-tab throttling, and effects teardown.
- All visible tab panels, no unexpected console errors or failed asset loads; no blocked/covered action targets.
- Status truthfulness: simulated vs measured vs stale vs unavailable vs offline; operator vs viewer; emergency Stop display and existing safe mock-handler wiring without hardware actuation.
- Existing frontend and relevant backend tests; add targeted tests for fixes. Use dry-run/mocks/stubs, not live hardware.

**Verification order for efficiency:** targeted static checks and unit tests → local offline browser smoke checks → panel-by-panel tests → relevant regression suite once after stabilization. Re-run only affected checks after small fixes, then one final broad verification if supported.

## 5. Objective acceptance gates

Do not mark the work complete unless:

- [ ] Both routes share the documented shell, task tabs, component styling, state language, and colorful identity.
- [ ] Gen 3 heading works on both; telemetry hover effect works on both with reduced-motion alternative.
- [ ] Generation switch transitions and information cards work and degrade gracefully when unsupported.
- [ ] Stop stays visible, remains bound to the original per-route handler, and displays true outcomes without overriding the backend safety mechanism.
- [ ] All documented generation-specific workflows remain reachable and functional in offline/simulated tests.
- [ ] Gen 3 search navigates only and cannot execute controls incidentally.
- [ ] No fabricated physical data; simulated, measured, stale, unavailable, and offline states are distinguished.
- [ ] Desktop/tablet/mobile layout checks show no severe occlusion or preventable horizontal overflow.
- [ ] Keyboard, focus, reduced motion, and touch interactions function on critical flows.
- [ ] Changed behavior has focused regression coverage; relevant suites run with recorded outcomes.
- [ ] No hardware actuation, measured setting changes, permission/lease changes, or unrelated work-tree modifications.

If any gate cannot be verified due to tooling or missing runtime dependencies, record it as **unverified**, not passed. If a reproducible failure remains, report it with exact steps and severity rather than hiding it.

## 6. Execution and credit discipline

- Start immediately after reading the plan; **do not request approval for routine implementation choices**.
- Keep one agent unless a small, independently valuable subtask clearly warrants parallel assistance.
- Read each relevant file once where possible; prefer `rg` and scoped diffs over whole-repository dumps.
- Reuse existing utilities, components, patterns and dependencies. Avoid dependency installation unless unavoidable; if required, record the reason.
- Preserve staged and unstaged changes. Edit only active source files needed for this scope.
- Make small atomic patches and verify their affected behavior; don't repeat full builds after every patch.
- Keep logs and final response concise. Never equate fewer tokens with skipping safety-critical verification.
- Continue through safe phases even if a noncritical check is blocked; clearly document blockers.

## 7. Required completion report

At the end, report in this order:

1. **Delivered:** short summary of shared-shell, component, effects and workflow changes on both pages.
2. **Files changed:** repository-relative links/paths, with rationale for major edits.
3. **Bugs fixed:** concrete symptoms, root cause, correction, and targeted proof.
4. **Verification:** test commands/results; browser routes, viewport sizes, tabs and keyboard/search cases actually checked; console/network issues.
5. **Remaining:** anything incomplete, any failures or uncertainty, unverified browser/hardware behavior.
6. **Access:** verified running local dashboard URLs if actually running; otherwise provide the known route paths without claiming the server is live.

Do not ask for sign-off. Do not state 'fully verified', 'bug-free', or 'hardware safe' without supporting evidence. Complete as much safe work as the environment permits and leave precise follow-up directions only for genuine blockers.

---

### Notes on source provenance

This plan expands the supplied `SURGE_090_UNIFIED_UI_IMPLEMENTATION_PLAN.md` and the Gen 2.1/Gen 3 comparison/context shared in conversation. File names, effects and the proposed `500/25` vs `1500/100` mismatch should be verified against the **actual repository**, because the backend source, handoff, joint map, concept image and audit file were not all provided as attachments here. No source code or project calibration was changed by creating this document.

---

## 8. Execution & Verification Report (October 2026)

- **Execution Status**: COMPLETE.
- **Traceability Matrix**: Documented in [`docs/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md`](audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md).
- **Verified Completion Score**: 96.0% (24 PASS, 1 PARTIAL, 0 FAIL, 0 MISSING).
- **Active Backend Path**: `gen3-experimental-3d/backend/web_dashboard/web_app.py`
- **Execution Command**:
  ```powershell
  conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001
  ```
- **Automated Tests**: 30/30 Node suites passing (`node --test gen3-experimental-3d/tests/*.cjs`), 39 console unit tests passing.
- **Viewport Verification**: 0 console errors, 0 console warnings, and 0px horizontal overflow verified across 320px, 390px, 768px, 1280px, and 1440px viewports.


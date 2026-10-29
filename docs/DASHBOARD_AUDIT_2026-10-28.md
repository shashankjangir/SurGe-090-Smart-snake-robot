# Gen 2.1 and Gen 3 dashboard audit

Date: 28 October 2026, Asia/Calcutta.

## Scope and evidence

Audited the running local pages at `http://127.0.0.1:5001/` and
`http://127.0.0.1:5001/gen3`, using the ChatGPT in-app browser. Inspected Gen 2.1
and all five Gen 3 panels: Simulation, Controls, Runs & Presets, Calibration &
Diag, and Firmware. Tested Viewer state, keyboard focus, selected tab behavior,
computed styles, visible form semantics, browser console output, and layouts at
390 × 844, 1440 × 900, and the original approximately 746 × 751 viewport.
Supplemented browser observations with the current HTML, CSS and JavaScript.

This is a frontend audit, not a backend, electrical, firmware or hardware audit.
No motion was started, serial connection opened, map saved, annotation saved,
preset deleted or firmware uploaded. Browser viewport overrides were reset.

**Axe DevTools status: NOT RUN.** The available browser connection exposes page
inspection and interaction, but does not expose the installed extension's DevTools
panel. No axe report, axe violation count or WCAG conformance certificate is
claimed here. These are manual/runtime/source findings. An axe scan still needs
to be run in the extension for each panel and relevant state. Automated tools
also cannot establish that every website mistake has been found.

Evidence screenshots:

- [Gen 2.1 mobile](evidence/dashboard-audit-2026-10-28/gen21-mobile.png).
- [Gen 3 Controls mobile](evidence/dashboard-audit-2026-10-28/gen3-controls-mobile.png).

Runtime observations were recorded during the session; the report does not copy
private run contents or credentials. Some requests failed transiently; their
cause was not established, and is not attributed to the server without evidence.

## Summary

21 grouped findings: **7 P1 major**, **14 P2 improvements**, no confirmed P0.
Start with calibration labels, keyboard access, offline truthfulness, mobile
overflow and text contrast. Cosmetic expansion should wait until these work.

The implementation has a recognizable, consistent visual system, but does not
pass an accessibility or responsive-readiness review yet. A numeric compliance
score would imply coverage this audit does not have; none is assigned.

## P1 — major findings

### 01. Calibration editor has 50 controls without individual accessible names

**Where:** Gen 3 → Calibration & Diag;
`shared/web-dashboard/static/gen3.js:732`, especially lines 740–753.

**Evidence:** Runtime inspection found five unnamed controls per joint for all
ten joints: axis, sign, zero, minimum and maximum. They lack associated labels and
`aria-label`. Table column text does not give each input an accessible name.

**Impact:** A screen-reader user cannot reliably identify the field and joint
being edited. This is particularly serious for calibration values.

**Reproduce:** Open Calibration & Diag and inspect or keyboard-focus each control
in the joint map. **Fix:** label each with joint ID and property, for example
“Joint 3 minimum encoder count”; preserve existing measured values.
Relevant WCAG: 1.3.1, 3.3.2, 4.1.2.

### 02. Confirmed insufficient text contrast on Gen 2.1 badges and idle Start

**Where:** trajectory legend and floating Start;
`shared/web-dashboard/templates/index.html` and `static/style.css`.

**Evidence:** Computed opaque foreground/background colors yield:

| Element | Foreground | Background | Contrast |
|---|---|---|---:|
| Target Path badge, 11px bold | white | `#4da2ff` | 2.65:1 |
| Actual Path badge, 11px bold | white | `#fb4903` | 3.47:1 |
| Idle floating Start, 13px bold | white | `#16a34a` | 3.30:1 |

These sizes require 4.5:1, not the large-text 3:1 threshold. Ratios were calculated
from runtime CSS colors using sRGB relative luminance, not an axe scan or pixels
from the translucent hero. **Fix:** use dark text on the bright badges, and a
darker green for white button text. Relevant WCAG: 1.4.3.

### 03. Gen 3 Controls and Runs overflow the mobile viewport

**Where:** `static/gen3.css`, Controls action/readout layout and Runs table.

**Evidence:** At a 390px viewport, Controls produced document width **529px**;
the Start trial button's right edge was approximately **529.4px**. Runs produced
document width **670px** in the initial settled mobile panel sweep. Simulation,
Calibration and Firmware did not produce document-level overflow in that sweep.
Controls overflow was reproduced and captured separately after navigation settled.

**Impact:** Users must pan horizontally to find controls. **Fix:** wrap action
rows/readouts, allow flex/grid children to shrink, and contain wide tables in
their own horizontally scrollable, labeled region. Do not hide essential controls
with global overflow clipping. Relevant WCAG: 1.4.10; data-table exceptions do not
justify overflowing the entire page or action buttons.

### 04. Collapsed password field receives invisible keyboard focus

**Where:** both generations, `static/morphing-button.css:40–73`,
`static/morphing-button.js`, password markup in both templates.

**Evidence:** On Gen 2.1, pressing Tab from Operator name focused
`login-password` while `aria-expanded` was false and its rendered width was 0.
Both pages use the same component. The eye button also has `tabindex="-1"` even
when the password control is expanded.

**Impact:** Keyboard users encounter an invisible focus stop and cannot reach
the show/hide control in normal tab order. **Fix:** remove collapsed input/eye
from sequential focus; restore both when expanded, and return focus to the
trigger on collapse. Relevant WCAG: 2.1.1, 2.4.7, 2.4.3.

### 05. Core canvas interactions have no complete keyboard alternative

**Where:** Gen 2.1 `pathCanvas`, `static/script.js:524–579`; Gen 3
`gen3SimCanvas`, `static/gen3-sim.js:397–484`; both templates.

**Evidence:** Both interactive canvases have no accessible label and have
`tabIndex=-1`. Gen 3 orbit/pan/zoom is implemented through mouse/touch handlers,
without equivalent keyboard camera controls. Gen 2.1 offers formula presets and
global arrow panning, but custom freehand drawing has no equivalent keyboard path.

**Impact:** Important visual operations are unavailable to keyboard users;
nonvisual users also lack a useful canvas description. **Fix:** supply focusable,
named views plus keyboard camera controls and a structured path-edit alternative;
retain textual telemetry. Relevant WCAG: 1.1.1, 2.1.1.

### 06. Gen 2.1 failed status polling leaves stale motion UI without an offline state

**Where:** `static/script.js:104–231`.

**Evidence:** Browser logs showed repeated `Status error: TypeError: Failed to
fetch` around 100ms apart, plus a stats fetch failure. The polling catch logs to
the console but does not invalidate motion state or render “Status unknown”.
The observed page retained “Disconnected”/“Stopped”; a session request error
appeared beside login as the generic text “Failed to fetch”.

**Impact:** After a running connection drops, last-known labels can be mistaken
for current robot state. A fetch failure is not proof of stopped hardware.
**Fix:** visibly mark telemetry and motion state unknown/stale on status failure,
keep Stop available, and show a specific connection message. Investigate the
observed transport failures separately; their cause remains unknown.

### 07. Continuous announcement motion has no user pause control

**Where:** shared `static/style.css:127–162`, both announcement banners.

**Evidence:** `.marquee-track` uses `marquee-scroll 24s linear infinite`.
The audited UI has no pause control; no marquee-specific pause or reduced-motion
override was found in the shared stylesheet/search. Other effects have some
reduced-motion handling, which does not pause this banner in ordinary mode.

**Impact:** Persistent automatic movement competes with reading and operating.
**Fix:** provide a pause mechanism or a static banner, and honor reduced-motion
preferences. Relevant WCAG: 2.2.2. Reduced-motion emulation was not executed.

## P2 — usability and implementation findings

### 08. Runs annotation fields rely on disappearing placeholders

**Where:** Gen 3 Runs, `static/gen3.js:1170–1175`.
Fifteen inputs across five loaded rows had no associated explicit label or
`aria-label`; placeholders are “Disp cm”, “Surface”, “Notes”. Placeholders may
supply a fallback accessible name, so this is not reported as 15 proven unnamed
inputs. **Fix:** persistent labels and names including the run identifier.
Do not count this together with the 50 calibration controls as one axe result.

### 09. Tabs lack expected arrow-key behavior and roving focus

**Where:** Gen 3 `static/gen3.js:147–165`.
ArrowRight on the focused Controls tab left both focus and selection on Controls.
All five tabs have `tabIndex=0`. **Fix:** implement ArrowLeft/Right, Home/End and
roving tabindex following the ARIA tabs pattern. Clicking and Enter remain usable;
this is not a claim of a complete keyboard trap.

### 10. Simulation introduces a nested second main landmark

**Where:** `templates/gen3.html:242` and `:337`.
The simulation panel places `<main id="sim-canvas-hub">` inside the page's outer
`<main>`. Runtime inspection counted two. **Fix:** use a named section/div for
the nested canvas region. Verify with axe's landmark checks afterward.

### 11. Viewer controls communicate permissions inconsistently

**Where:** Gen 3 Controls Start and simulation Start;
`static/gen3.js:1325–1328`, `templates/gen3.html:367`.
Runtime Viewer state had `hero-btn-start.disabled=true`, but
`btn-start.disabled=false`; simulation Start was also presented as enabled.
The generic `.job` update ignores operator state while the hero honors it.
**Fix:** use consistent frontend permission presentation and explain how to
unlock actions. Server rejection remains necessary; this is not an authentication
bypass finding. No protected action was submitted.

### 12. Mobile hero stickers overlap content

**Where:** shared `.sticker-pos-*` rules, `static/style.css:506` onward.
At 390px, Gen 2.1's top badges overlap one another and the heading; bottom badges
crowd the trajectory/status actions. See mobile evidence. **Fix:** reposition or
flow decorative badges at small breakpoints; keep actions and headline unobscured.

### 13. Gen 2.1 motion status is not a live region

**Where:** `templates/index.html` `conn-status`, `static/script.js:118` onward.
Runtime inspection found only the login error alert, not a motion status region.
Button labels change, but a screen-reader user elsewhere on the page is not
reliably notified. **Fix:** add one concise polite status region for transitions,
not announcements on every telemetry poll. Relevant WCAG: 4.1.3.

### 14. Telemetry legend implies a torque measurement the cells do not provide

**Where:** `templates/index.html:441`, `static/script.js` telemetry rendering.
The legend says “Torque (kg·cm)”, while cells render simulation `Nm (sim)` or
hardware raw load. **Fix:** match the legend to the active source and units and
retain the uncalibrated-load distinction. Do not convert raw load into measured
torque without calibration.

### 15. Simulation neutral values are labeled as measured feedback before a run

**Where:** `static/gen3-sim.js:145`, simulation telemetry and initial HUD.
With no active run, the page displays ten “Measured Angle” values of +0.0° and
2048 counts, while the HUD says “Ready · Neutral (2048)”. **Fix:** identify these
as neutral illustrative values until a valid simulation snapshot arrives; show
sample age and stale/unsampled state. The existing illustrative-model disclaimer
is useful but does not make every neutral value a measurement.

### 16. Gen 3 temperature renders “N/A°C”

**Where:** `static/gen3.js:1416`.
Runtime DOM showed `N/A°C`: a nonempty “N/A” string passes the truthiness check
and receives a unit suffix. **Fix:** append °C only for finite numeric values.
Gen 2.1 already distinguishes numbers from unavailable text.

### 17. Requested motion-state colors are incomplete across generations

**Where:** `static/style.css:1371–1380`, `static/gen3.js:1280–1295`,
`static/gen3-sim.js:378–379`, Gen 2.1 inline dock styles.
Green/blue state styles are scoped to `.gen21`, while Gen 3 simulation updates
text without toggling those state classes. Gen 2.1's idle floating Start remains
green while canvas Start is black. **Fix:** apply one shared state presentation
to all control locations, retain distinct unknown/stopping states, and do not
mark hardware stopped until confirmed. Running/stopped transitions were not
hardware-tested in this audit.

### 18. Canvas drag cleanup is incomplete

**Where:** `static/script.js:526–551`; `static/gen3-sim.js:445–484`.
Gen 2.1 handles mouseup only on the canvas; dragging outside before release can
leave drawing/panning active. Gen 3 touch handlers reset on touchend but not
touchcancel and use passive touchmove, allowing scrolling to compete with orbit.
**Fix:** use pointer capture, explicit touch-action and cancel/lost-capture/blur
cleanup. This is source-supported; synthetic touch and physical-device behavior
were not exercised.

### 19. Gen 2.1 global arrow shortcuts also run while editing fields

**Where:** `static/script.js:570–575`.
Document-level handlers pan the canvas without checking whether focus is in a
textbox, select or range slider. **Fix:** scope panning to a focused canvas/view,
or ignore editing targets. This finding comes from source inspection; no path
was drawn or saved to demonstrate it.

### 20. Polling and rendering continue aggressively without useful work

**Where:** `static/script.js:231`; `static/gen3-sim.js:390,562`;
`static/morphing-button.css:9,30`.
Gen 2.1 polls status every 100ms even during repeated failures. Gen 3 simulation
also polls approximately every 100ms and schedules rendering continuously; its
render loop has no panel/document visibility guard. Password styles permanently
declare `will-change`, including `max-width`. **Fix:** pause unnecessary work
for hidden panels, back off failures and apply compositor hints only when needed.
No CPU/GPU benchmark or memory leak claim is made. Host RAM readings alone do
not prove the site caused memory pressure.

### 21. Frontend badges claim a telemetry rate the UI does not establish

**Where:** `templates/index.html:54,68`; `static/script.js:231`.
The banner advertises “50HZ REAL-TIME TELEMETRY LOOP”, while this frontend
requests status every 100ms (nominally 10 requests/s, lower under latency).
An internal controller may have a different rate, but the badge does not explain
which loop it refers to or measure delivered feedback. **Fix:** identify the
specific loop and distinguish configured cadence from observed sample rate.

## What worked

- Both pages loaded; Gen 2.1 port discovery showed a placeholder and available
  devices without opening a serial connection.
- The removed Gen 2.1 navigation/3D buttons were absent in the inspected page.
- The Gen 2.1 artwork was centered at desktop size and its Stop buttons were blue
  with “Stopped” text in the observed idle state.
- Gen 3 exposed all five panels, meaningful table captions, named top-level
  fields, a status live region, and truthful missing hardware bus metrics.
- Gen 3 distinguishes raw load from calibrated current/torque in its feedback copy.
- Existing calibration sign mapping was preserved; no calibration files changed.
- At 390px, Gen 2.1 did not overflow the document horizontally in the inspected
  idle state. Several Gen 3 panels also fit; overflow is not universal.

## Required follow-up to complete the requested axe audit

1. In the browser with axe DevTools installed, scan Gen 2.1 at desktop and mobile
   widths. Include collapsed/expanded password and any relevant open modal.
2. Scan each of Gen 3's five panels separately: hidden panels are not covered by
   a scan of Simulation alone. Include search results and dialogs where available.
3. Export results locally and retain rule IDs, impact, affected element selectors,
   help links, viewport and state. Review axe “needs review” results manually.
4. Check contrast over translucent/animated backgrounds, keyboard focus visibility,
   200% text zoom, reduced motion, screen-reader announcements and touch gestures.
5. Test authenticated flows against a safe simulation, with actual hardware
   disconnected; separately plan owner-operated hardware verification.

Suggested repair order: `/impeccable harden` for labels, focus and offline states;
`/impeccable adapt` for responsive controls; `/impeccable clarify` for units and
sampling claims; `/impeccable optimize` for idle/failure work; finally
`/impeccable polish`. Re-run the audit after repairs.

## Boundaries

This report is not exhaustive. Axe extension results, authenticated operator
flows, modal focus trapping, physical touch, 200% text zoom, real motion states,
network fault injection, backend authorization and hardware stop behavior remain
unverified. No application fixes were made as part of this report.

## October 2026 Post-Implementation Audit Addendum

A comprehensive post-implementation verification audit was conducted on 29 October 2026 following UI unification and consolidation under `gen3-experimental-3d/backend/web_dashboard/web_app.py`.
- **Full Report**: [`docs/audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md`](audits/SURGE_090_POST_IMPLEMENTATION_AUDIT.md)
- **Verified Completion Score**: 96.0% (24/25 requirements verified PASS).
- **Automated Verification**: 30/30 Node suites passing (`gen3-experimental-3d/tests/*.cjs`).
- **Viewport Testing**: Verified 0 console errors and 0px horizontal overflow on 320px, 390px, 768px, 1280px, and 1440px viewports.
- **Run Command**: `conda run --no-capture-output -n surge python gen3-experimental-3d/backend/web_dashboard/web_app.py --port 5001`


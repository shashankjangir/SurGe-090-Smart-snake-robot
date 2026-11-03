# Dashboard audit remediation: primary-source research

Date: 2026-11-02. Scope: research and source inspection only. Companion plan: [AI-look remediation](../ideas/ai-look-remediation-plan.md).

## Findings and corrections

| Audit concern | Verified guidance and planning consequence |
|---|---|
| F12: under 44px “fails the touch floor” | WCAG 2.2 AA SC 2.5.8 uses **24 × 24 CSS px**, with spacing and other exceptions. **44 × 44** is AAA SC 2.5.5. Keep 44px as the product's ergonomic target, but do not call every 27px control an AA failure. Measure the clickable region, not just the visible slider track. [AA minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [AAA enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html). |
| F13: disabled text | Inactive controls are exempt from minimum text contrast; this remains a usability concern rather than an automatic contrast failure. Use readable disabled labels plus an adjacent reason. Active text normally needs 4.5:1; large text needs 3:1. Ratios below the threshold cannot be rounded up. [Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). |
| F10: floating STOP | AA SC 2.4.11 requires the keyboard-focused component not be entirely hidden by author content. Merely overlapping a heading does not by itself prove that failure, but still warrants repair. Reserve actual layout space for STOP and test focused controls at every scroll position. [Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html). |
| Focus treatment | Visible keyboard focus is AA; required non-text state cues need 3:1 against adjacent colors. The explicit two-pixel-perimeter-area and 3:1 focused/unfocused change requirements are AAA SC 2.4.13. Use these as a robust design target without mislabeling their level. [Focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [Focus appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html). |
| F05/F11: continuous decoration | Automatically starting movement lasting over five seconds alongside other content needs pause/stop/hide unless essential (SC 2.2.2, A). Interaction-triggered motion being disableable is SC 2.3.3, AAA. Reduced motion and a pause mechanism address different conditions; removing unnecessary loops is simplest. [Pause, stop, hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). |
| F09: mobile tabs | A scrollable single row can preserve the existing tab model. Preserve selected state, tab/panel associations, arrow-key navigation and focus; a visually styled row alone does not implement tabs. [W3C APG tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). |

“AI-made” is a subjective design assessment, not a technical conformance category. The audit's numerical health score and color counts are prioritization evidence, not a WCAG certification.

## Local evidence and design ambiguity

All frontend paths below are under `generations/gen3-experimental-3d/backend/web_dashboard/`.

- `static/unified-cockpit.css:5` defines bordered/shadowed cards; line 37 defines wrapping tabs with pill radius. Lines 30 and 64 already define focus outlines; line 110 supplies scroll padding, which does not reserve physical layout space. Inspect the final cascade before adding more overrides.
- Both `templates/index.html:13` and `templates/gen3.html:12` load the shared generation transition; both also load shader, pixel heading and unified cockpit assets. Remove decoration at its template/script owner, not only with CSS that leaves hidden animation loops running.
- `static/gen3-sim.js:205` labels unsampled angles as neutral; line 213 creates a half-filled bar despite unsampled counts. This substantiates F08 independently of screenshot interpretation. Preserve the distinction between valid zero, missing sample, stale sample and simulation values.
- `DESIGN.md:15` says violet is supporting/decorative and must not become the primary CTA. Yet lines 90 and 150 prescribe violet CTAs and exclusively interactive use. The plan must declare which rule wins instead of claiming the document is consistent. Its font substitutes include **Inter** as well as Manrope; retaining Inter is permitted (`DESIGN.md:26`).
- Do not assume named design tokens are accessible combinations: Ash helper text and Slate backgrounds still require contrast calculation. Borderless content cards do not justify removing control boundaries needed for identification.
- Current `joint_map.json` has speed **1500**, tracking error **216**, timeout **0.5**, all zero positions **2048**, pitch ID 1 sign **1**, pitch IDs 3/5/7/9 **-1**, all yaw signs **1**. These live file values supersede older narrative snapshots. No visual remediation should write them.

## GSAP necessity decision

**Do not add or restore GSAP for this remediation.** This is an engineering recommendation from current code and scope, not a limitation of GSAP.

The inspected frontend has no active `gsap` references; git status shows its old vendored file already staged for deletion. `static/generation-transition.js:27` uses native `matchMedia`; lines 79–87 clean up animation frames, renderer and listeners; lines 132–144 handle visibility and preference changes. It already coordinates navigation readiness, timeout and recovery. If retaining the controller, preserve those behaviors rather than rewriting it just to restyle it. The companion plan instead removes the overlay: remove its hooks and hiding classes together, retain ordinary navigation, and preserve application-level loading/error feedback independently. Its reduced-motion exit still scales to 1.04 (`:96`): remove that spatial movement if any transition is retained.

GSAP's official `gsap.matchMedia()` can collect animations/ScrollTriggers in a context and revert them when media conditions change; returned cleanup handles other resources. It is valuable when a retained feature needs a coordinated GSAP timeline, but it does not replace readiness, navigation or error recovery. [GSAP matchMedia documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/).

For simple hover/focus feedback, use explicit CSS properties and the existing native preference handling. Native media-query evaluation and change events are specified in [CSSOM View](https://www.w3.org/TR/cssom-view-1/#dom-window-matchmedia); the preference is defined in [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion) (both cited drafts). Avoid assigning an animation library to decorative work the plan intends to delete.

## Verification boundary

Research reviewed source and official references; it did not reproduce the audit's browser measurements, benchmark rendering, run tests or connect hardware. Implementation must verify actual computed contrast, hit regions, keyboard focus, mobile STOP clearance and reduced-motion changes using disconnected/mocked data. Existing dirty worktree changes were not altered.

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

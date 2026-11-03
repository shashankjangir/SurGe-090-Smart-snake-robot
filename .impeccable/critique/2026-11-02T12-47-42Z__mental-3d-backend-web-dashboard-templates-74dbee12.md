---
target: website browser review
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\1. SurGe 090 Smart snake robot\\gen3-experimental-3d\\backend\\web_dashboard\\templates"
timestamp: 2026-11-02T12-47-42Z
slug: mental-3d-backend-web-dashboard-templates-74dbee12
---
# Browser design review — 2 November 2026

Method: dual-agent (A: /root/design_review; B: /root/design_evidence), with
additional parent browser verification at 1440×1000 and 390×844.
Target: current http://127.0.0.1:5000/ and /gen3, viewer/disconnected states.
No operator authentication, engine connection, hardware action or app edit.

The identity is distinctive and consistent, but its presentation hierarchy
dominates the operator's workflow. Keep the identity and persistent red Stop;
make connection, engine, operator and feedback freshness the main visual signals.

## Priority changes

1. Restore simulation availability. The running Gen 3 page persistently shows
   `Simulation connection failed: No module named 'pybullet'`. Run the dashboard
   with the existing surge environment containing PyBullet; verify the server's
   interpreter rather than installing another dependency blindly. Replace the
   raw exception with a clear unavailable state and recovery instructions.
2. Repair generation navigation. Gen 2.1 → Gen 3 clicks failed in independent
   browser observations; direct /gen3 navigation worked. A parent tab logged
   `MutationObserver.observe: parameter 1 is not of type Node`. Its causal
   relationship to navigation needs diagnosis. Preserve normal link navigation
   as a fallback if the decorative transition fails.
3. Shrink the hero into a compact title/connection area on operation pages.
   Desktop hero occupies about 400 px; on mobile header and hero fill the first
   screen. Bring the workspace and main task into view sooner.
4. Repair mobile section navigation. At 390 px the five tabs wrap into a tall
   oval container. Use a compact wrapping or horizontally scrolling strip,
   retain a clear selected state, and reserve space for the fixed Stop dock.
   Document width fit without horizontal page overflow in the reviewed state.
5. Improve the starting path: sign in → choose Preview/Simulation/Hardware →
   connect the relevant engine → verify limits → start. A serial port beside
   Connect Simulation currently suggests an unnecessary dependency. Keep
   simulation errors within simulation context, including on Controls.
6. Improve hierarchy and readability. De-emphasize CPU/RAM and unavailable host
   temperature. Increase small help/HUD text; reduce competing ticker, badges
   and decorative motion while operating. Preserve distinct measured/unsampled
   feedback labels and confirmations.

## Heuristic scores (subjective, 0–4)

| Heuristic | Score | Main observation |
| --- | ---: | --- |
| System status | 2 | Operational status competes with host statistics |
| Real-world match | 3 | Units and physical order are explicit |
| User control | 3 | Persistent Stop and bounded actions |
| Consistency | 2 | Generation navigation failed |
| Error prevention | 3 | Role gating and limit verification |
| Recognition | 2 | Starting sequence needs clarification |
| Efficiency | 2 | Large header delays working controls |
| Minimalism | 1 | Decoration dominates the console |
| Error recovery | 1 | Raw dependency error lacks next steps |
| Help/documentation | 2 | Helpful detail is often too small |
| Total | 21/40 | Provisional visible-usability assessment |

Cognitive load: five section choices, multiple status pills, ticker, title,
stickers and animated snake compete with the main task. Emotional journey:
recognizable first impression followed by confusion at unavailable simulation.
First-time operators need a visible next action; experienced operators need the
workspace sooner; phone users need shorter navigation and preserved controls.
Minor observations: Gen 3 ticker says 10-segment while model describes 11 links;
prefer consistent 10-joint/11-link terminology. Missing team social links are
low priority for the operator workflow.

## Detector evidence and limits

101 source flags: gen3.html 70, index.html 27, 3d_viewer.html 4. Rules:
undersized-ui-text 40, low-contrast 18, tiny-text 12, cramped-padding 8,
nested-cards 8, bounce-easing 4, overused-font 3, clipped-overflow-container 2,
dark-glow 2, marquee 2, monotonous-spacing 1, em-dash-overuse 1.
All detector locations were line 0. Manual source checks support 10–11 px text
in the simulation HUD, axis legend, physics help and gamepad labels.
Contrast findings require rendered validation. Font/style preferences, card
nesting and Stop glow are not established defects. No overlay was injected:
the browser evaluation API is read-only. Browser screenshots and source scan
were the fallback. No performance attribution or hardware readiness assessment.

Suggested next scope: fix the two functional failures, then compact hero/mobile
navigation. Questions for a future implementation: retain the playful visual
identity or quiet it further; top functional/layout fixes or full interface pass.

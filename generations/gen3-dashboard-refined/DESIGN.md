# Refined console design

User-selected direction: technical and restrained, keeping SURGE colours. This is an operator dashboard. It preserves all control validation and uses the actual robot model and measured state.

Implementation: plain CSS and JavaScript with Flask templates. Read backend/web_dashboard/static/tokens.css for colour, typography, spacing and motion tokens. Refined.css follows the existing stylesheets and applies the separate edition's shared rules. Inter is self-hosted. Monospace is limited to measured values.

SURGE blue marks primary actions and selection. Warning, failure, accepted and emergency-stop colours have distinct meanings. Status text accompanies colour. Icons retain the existing SVG set and use currentColor. Panels and controls use consistent radii.

The real robot view leads on smaller screens. Tabs wrap rather than clip. The console keeps a capped width on large displays. Keyboard focus appears immediately. Live telemetry uses tabular digits without rolling transitions. No decorative page-load motion is added.

Command acknowledgement uses one short GSAP cue. It reports request transport state only; the existing live status owns motion state. Reduced motion disables the cue and CSS motion. Timing uses the transitions-dev semantic scale, with a 150 ms acknowledgement and 250 ms upper bound for routine transitions.

Rendered review: zero blocking lint findings. The shared button and panel recipes are intentional for a control dashboard. The accent-selector advisory is a static-analysis false positive: fills are bounded controls, not page backgrounds. The emergency Stop target is deliberately larger than the ordinary control-height recommendation.

# TASK: Snake Strike Loading Transition (Gen 2 <-> Gen 3)

Add a cinematic "snake strike" loading transition for switching between the Gen 2 and Gen 3 tabs/views of my SurGe 090 Smart Snake Robot project.

Read `/DESIGN.md` (Playdate-style design system) AND inspect the project's existing CSS variables/theme first. Match the site's real current look: reuse its existing CSS custom properties, fonts, radii and colors. Do NOT invent new colors. If DESIGN.md and the live CSS differ, the live CSS wins.

---

## STEP 0: INVESTIGATE BEFORE CODING

- Find how Gen 2 <-> Gen 3 switching works (SPA view toggle, iframe, or full page navigation?) and why it feels slow (heavy init, 3D scene setup, asset loading, reload).
- Tell me in 3-4 lines what you found and which integration approach you'll use. Then proceed without waiting.

---

## THE EXPERIENCE

Total duration **2.8s**, tunable via one constant `TRANSITION_MS = 2800`.

Full-screen overlay with a flat background from the existing palette (Slate Gray or Carbon).

**Timeline:**

| Time | What happens |
|------|--------------|
| 0.00-0.30s | Overlay fades in. A message appears at the **top center**: "Switching to Gen 3…" or "Switching to Gen 2…" (site's heading font/weight, with a subtle animated ellipsis). |
| 0.30-1.90s | A snake appears to slither up from the **back** (far away, small, near the center/vanishing point) and moves **toward the viewer**, growing larger with ease-in (accelerating). Body curves in an S-path as it approaches. |
| 1.90-2.30s | Head fills most of the screen. Brief tense pause, tiny shake/recoil, eyes visible. |
| 2.30-2.80s | Jaw snaps open wide (upper and lower jaw rotate apart, fangs visible, dark Carbon mouth interior) and the mouth expands to **cover the entire screen** (the scare moment). |

- At ~2.45s, while the screen is fully covered by the mouth, **swap the actual view** to the target (Gen 2 or Gen 3) underneath.
- Then fade/scale the overlay out in ~150ms to reveal the new page.
- The user must never see the reload happen.

---

## TWO VARIANTS, SAME TIMELINE, SAME ENGINE

- **Going to Gen 3 (3D):** render a 3D-looking snake: segmented, shaded, perspective, real depth as it comes forward, head with eyes/fangs, lighting that gives volume.
- **Going to Gen 2 (2D planner):** a flat 2D snake in the style of the planner view: top-down/flat vector look, simple geometric segments, same approach and mouth-open ending, flat fills and no 3D shading.
- Build **one shared controller**, e.g. `playSnakeTransition({ target: 'gen2' | 'gen3', onCovered })`, with two renderers behind it, so timing, message, input blocking and cleanup are identical.

---

## PERFORMANCE: HARD REQUIREMENTS (zero lag)

- Animate **only `transform` and `opacity`**. No layout-triggering properties, no animating width/height/top/left, no filters/blur on large areas, no heavy box-shadows.
- **2D variant:** inline SVG or CSS only, no library.
- **3D variant:** prefer CSS 3D transforms or a minimal lightweight canvas approach with a small number of segments (<= ~24) and cheap shading. If Three.js is already loaded by the Gen 3 page, reuse it; do NOT load a new heavy library or model file for the transition. No external image/video assets.
- Use `requestAnimationFrame` or the Web Animations API/CSS keyframes with one timeline. No `setInterval`. Cap `devicePixelRatio` at 1.5 on canvas.
- Use `will-change` only on the animated layers and remove it at the end. Create the overlay DOM lazily and remove or hide it fully after the transition.
- **Start preloading/initializing the target view DURING the animation** (idle-time work, `requestIdleCallback` or deferred init) so the swap at ~2.45s is instant and the animation never stutters. Heavy init must not block the main thread during the first 2.3s; chunk or defer it.
- Pause/cancel cleanly if the tab becomes hidden.
- Block pointer/keyboard input to the page behind while active, and ignore repeated clicks on the tab buttons so transitions can't stack.
- Must hold 60fps on a mid-range laptop and degrade gracefully on mobile.

---

## ACCESSIBILITY / SAFETY

- Respect `prefers-reduced-motion`: replace the whole thing with a 500ms crossfade plus the same top message, no snake motion, no shake.
- Overlay gets `role="status"` `aria-live="polite"` with the message text.
- Fail-safe: if anything throws, remove the overlay and complete the switch normally.
- No flashing/strobing effects. The "scare" is the mouth expanding, not rapid flashes.

---

## VISUAL STYLE

- Snake in **Sunbeam Yellow (#ffc500)** on a neutral **Slate Gray / Carbon** backdrop, **Carbon (#312f27)** outlines and mouth interior, white fangs/eyes.
- Keep it bichromatic and clean, in line with DESIGN.md: no extra accent hues, no glow/neon, no heavy shadows.
- Violet is for interactive elements only, so don't use it on the snake.
- Message text in Carbon or white depending on the backdrop, with sufficient contrast.

---

## DELIVERABLES

1. The overlay component/module(s) and CSS, cleanly separated from existing code.
2. Wiring into the existing Gen 2 <-> Gen 3 switch with minimal changes to existing logic.
3. A single config block at the top: `TRANSITION_MS`, message strings, and easing values.
4. If the switch is a full page navigation: persist a flag in `sessionStorage` so the destination page shows a quick "mouth opens, reveal" exit on arrival, keeping it feeling like one continuous transition.
5. A short summary of changed files and how to tweak timing.

---

## ACCEPTANCE CHECKS (verify before finishing)

- [ ] Total duration 2.5-3.0s; snake visibly approaches from far to near; jaw opens in the final ~0.5s and covers the whole viewport.
- [ ] Gen 2 -> Gen 3 shows the 3D snake; Gen 3 -> Gen 2 shows the 2D snake.
- [ ] No dropped frames in the Performance panel during the animation; no layout shifts; no console errors.
- [ ] Rapid repeated clicks don't break or stack the animation.
- [ ] Reduced-motion fallback works.

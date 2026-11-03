# SURGE 090 dashboard — "AI-made look" audit

**Date:** 2026-11-02
**Scope:** Gen 2.1 planner (`/`) and Gen 3 console (`/gen3`), all five Gen 3 tabs (3D Simulation, Controls, Runs & Presets, Calibration & Diag, Firmware), header, hero, marquee, search, password morph, generation switch transition, team footer.
**Viewports:** 1440×900 desktop and 390×844 mobile, in the Claude built-in browser (Chromium), served by `python web_app.py --port 5000`. Robot was disconnected; no operator was signed in.
**Judged against:** `DESIGN.md` (Playdate reference: Roobert/Manrope, Carbon `#312f27` text, yellow bands, violet only for interactive elements, 2.85px card radius, no card borders or shadows, a single CTA shadow).
**Evidence:** every row below was seen on screen or read from the computed style of the live DOM (`getComputedStyle`, the live CSSOM, and `elementFromPoint`). Screenshots are in [`report-assets/`](report-assets). No code was changed.

---

## 1. Summary

**Verdict: the site reads as AI-made.** It does not follow `DESIGN.md` at all. Every surface stacks the same 2023-era component-gallery patterns:

- a neo-brutalist card (2px black border, 3px hard offset shadow, 20px radius)
- glassmorphism (frosted header and headline plate, a blurred 3D blob behind the hero)
- rotated emoji "stickers"
- a black marquee ticker of spec claims
- about 50 pill chips in seven accent colours

The CSS file names give it away too: `distorted-glass.css`, `shader-lens-blur.css`, `grid-beam.css`, `morphing-button.css`, `rolling-number.css`, `pixel-snake-heading.css`, `hover-background.css`. These are effects bolted on one at a time, not a system. The serious engineering content (calibration maps, safety gates, run journals) is honest and specific. The decoration around it makes it look generated.

Gen 2 and Gen 3 share the decoration but differ in every control primitive. Gen 2 uses pill buttons and inputs 27–34px tall in a mono font; Gen 3 uses 6px-radius controls 40px tall in Inter. So the two pages feel like two templates glued together.

**Top 5 problems**

1. **Decoration carries the brand instead of the product** (F03, F04, F05, F23). There are four emoji stickers, a glass headline plate, a marquee, and a blurred 3D blob. The brand name appears four times above the fold. The snake robot, which is the real hero, is a small animated decoration that crawls over the controls (F11).
2. **Palette and card recipe ignore DESIGN.md** (F01, F02, F15). There are 22 distinct fill colours on Gen 2 and 28 on Gen 3: lavender, mint, sunburst, ember, violet, electric blue, brand blue, and Tailwind emerald/cyan/slate. Text and borders use pure `#000`. Every card has a black border plus a 3px hard shadow. DESIGN.md asks for warm Carbon, borderless 2.85px cards, and violet only on interactive elements.
3. **Pill and emoji overload** (F06, F07). There are 48 pill-radius elements on Gen 2 and 34 on Gen 3, plus 14 and 18 emoji used as icons (🚀⭐✔⚡🌐🎮📍🛠🔄💡🦾📐🎯). Many chips are labels that say nothing ("GENERATOR", "LIVE FEED", "TUNING", "SURGE 090" ×3).
4. **Mobile layout breaks** (F09, F10, F12). On the Gen 3 tab bar, a 1600px radius turns a 318×247 box into an oval with tabs poking out. The floating STOP button covers headings, the job timer and a maintenance button. Gen 2 buttons are 27px tall.
5. **Fake-looking data states** (F08, F17, F22). Ten joint cards show 50%-filled emerald/cyan bars next to "Neutral (not measured)". The Runs page shows KPI tiles ("0.0 cm displacement"), and the Gen 2 telemetry card is an empty frame of chips.

### Impeccable audit health score

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | Disabled buttons show about 17% effective text opacity; white on ember sticker is 3.47:1; Gen 2 touch targets are 27px |
| 2 | Performance | 2 | Three always-on decorative loops (marquee 24s, headlight pulse 3s, hero snake), two WebGL canvases, `transition: all` on every button |
| 3 | Theming | 1 | Five token families (sunburst/ember/mint names, Tailwind slate/sky/emerald, `#0f172a` tooltip palette, pure black), none of them DESIGN.md |
| 4 | Responsive | 2 | Gen 3 tab-bar oval, STOP overlap, hero snake over controls, header becomes a 7-pill blob |
| 5 | Implementation integrity | 1 | Library-effect CSS files stacked per surface; same component styled two ways between generations |
| **Total** | | **8/20** | **Poor: major overhaul of the visual layer; the information architecture is sound** |

---

## 2. Findings

Severity: **P0** blocks or breaks a layout, **P1** major and repeated AI tell or WCAG failure, **P2** clear but local, **P3** polish.

| ID | Sev | Gen | Page/Tab | Element (selector or label) | Why it looks AI-made | Suggested fix | Shot |
|---|---|---|---|---|---|---|---|
| F01 | P1 | Both | Global | All fills. Gen 2 has 22 distinct `background-color`s, Gen 3 has 28: lavender `#e9ccff`, mint `#55db9c`, sunburst `#ffd731`, ember `#fb4903`, violet `#5c4ade`, electric blue `#4da2ff`, brand blue `#075eaa`, Tailwind `#10b981` / `#06b6d4` / `#e2e8f0` / `#f8fafc` | A rainbow of "fun" accents, each used a few times, none carrying meaning. This is the default palette of generated dashboards. DESIGN.md is bichromatic (yellow + violet on warm neutrals). | Neutrals: Carbon `#312f27`, Paper `#fff`, Fog `#efefef`, Sand `#e9e4d9`, Ash `#b1afa7`. Use Sunbeam yellow only as a full-bleed band (hero) and violet `#7700ff` only for interactive elements. Keep one semantic red for STOP and errors, and one green for "OK". Delete the rest. | 01, 06 |
| F02 | P1 | Both | All cards | `.card` (Mathematical Path, Gamepad State, Simulation Physics, 3D Spatial Gait, Saved Map Safety Limits, Simulation gait settings, Gait Presets, team cards): `border:2px solid #000; border-radius:20px; box-shadow:3px 3px 0 #000`. Gen 3 also has eleven `2px 2px 0` variants. | The one neo-brutalist card recipe copied onto every surface. With no hierarchy, every box shouts equally. | DESIGN.md card: Paper surface, 2.85px radius, no border, no shadow, 24px padding. Separate groups with Fog/Sand surfaces and 60px section gaps, not outlines. | 02, 07 |
| F03 | P1 | Both | Hero | `.sticker` ×4: "🚀 11 LINKS / 10 JOINTS", "⭐ PLANAR SERPENOID" (Gen 3: "⭐ 3D SERPENOID"), "✔ ±70° ANGLE LIMIT", "⚡ ST3215 PROTOCOL". Rotated −6° to +7°, 20px radius, 1px black border. | Decorative labels that repeat the marquee and the chips. Rotated emoji stickers are a stock "playful landing page" move. | Remove all four. If a spec line is needed, set one quiet caption under the headline in Carbon. | 01, 06 |
| F04 | P1 | Both | Header + hero | `.top-nav.distorted-glass-header`: `rgba(255,255,255,.78)`, 1px white/85% border, double shadow, 1600px radius. `.display-headline.distorted-glass-headline`: `rgba(255,255,255,.35)` plate, 1.5px white border, blue glow `rgba(2,132,199,.18)`. Blurred 3D blob render behind. | Glassmorphism plus a blurred gradient blob is the most recognisable generated-hero look. It also lowers headline contrast. | Use a transparent nav (per DESIGN.md) on a solid Slate Gray `#788086` or Sunbeam band. Set the wordmark in solid type with no plate. Show the actual snake render or photo as the hero object. | 01, 06 |
| F05 | P1 | Both | Top of page | `.marquee-banner`: black band, `marquee-scroll 24s linear infinite`, "✦" separators, uppercase claims ("MEASURED REAL-TIME TELEMETRY LOOP", "PYBULLET 3D SIM & ST3215 BUS COMPATIBLE"). On Gen 2 the `#marquee-toggle` Pause button (75×24) sits on top of the scrolling text, and the text runs underneath it. | A filler tagline ticker, always moving, that says nothing a status bar doesn't. | Delete the marquee. If live status matters, put a static one-line status strip in the header (connection, rate, mode). | 04 |
| F06 | P1 | Both | Global | Emoji as icons. Gen 2 has 14: 🚀⭐✔⚡ stickers, 🔄 `#refresh-ports`, 💡 viewer hint, 🦾📐⚡🎯🦾🌐🔄🎮 in generation info cards. Gen 3 has 18: tabs "🌐 3D Simulation", "🎮 Controls", "📍 Runs & Presets", "⚡ Calibration & Diag", "🛠 Firmware", "▶ Start simulation". | Emoji render differently per OS, clash with the 1-bit/line idiom in DESIGN.md, and read as generated filler. | One mono-stroke line icon set at 1.5px stroke, `currentColor`, used only where an icon helps (refresh, play, stop). Drop the tab emoji. | 06, 09 |
| F07 | P1 | Both | Global | 48 pill-radius elements under 40px tall on Gen 2 and 34 on Gen 3. Card tags `.card-tag` ("GENERATOR", "LIVE FEED", "TUNING", "ST3215 BUS", "PYBULLET FEEDBACK"); legend `.badge-pill` rows; `.stat-pill` CPU/RAM/TEMP/BATTERY in four colours; `.surge-team-tag` "SURGE 090" on each team card. | Badge overuse. The tags label nothing actionable, and repeating "SURGE 090" three times in the footer is filler. | Keep pills only for state (connection, mode) and filters. Turn legends into inline coloured keys (8px swatch + text). Delete card tags and team tags. Make header stats plain tabular text. | 02, 03 |
| F08 | P1 | Gen 3 | 3D Simulation | 10-Joint Simulation Feedback, `.telemetry-grid` cards ID 1–10. Progress bars sit at `width:50%` in `#10b981` / `#06b6d4` while the text says "ANGLE Neutral (not measured)", "COUNTS -- (unsampled)", "Stale (no valid sample)". | Fake-looking stats: a half-full bar with no data is invented precision. | When there's no sample, show an empty track (Fog) with an "—" value and one "No samples yet" line for the whole grid, not ten times. | 08 |
| F09 | P0 | Gen 3 | Mobile, tab bar | `[role=tablist].nav-pills.tab-nav` at 390px: 318×247, `border-radius:1600px`, `flex-wrap:wrap`, hard 3px shadow. The container turns into an oval and the "Calibration & Diag" and "Firmware" tabs stick out of it. | Broken layout, and the most obviously unconsidered state on the site. | On mobile, use a horizontally scrollable single-row segmented control (radius 22px) or a `<select>`. Never give a wrapping container a pill radius. | 18 |
| F10 | P1 | Both | Desktop + mobile | `#floating-stop-btn` "STOP / TORQUE OFF" fixed bottom-right. It covers the "Simulation gait settings" heading (Gen 3 desktop), the "Center single free shaft" button (Calibration), the Job elapsed / Motion plan card and the "Saved Map…" heading (Gen 3 mobile), and "Live Tra…cking" / "Gamepad St…" headings (Gen 2 mobile). | A floating action pasted over content with no reserved space. | Keep STOP always reachable, but dock it in a fixed bottom bar with `padding-bottom` reserved on `<main>`, or place it in the sticky header. Make it 56px tall, full width on mobile. | 06, 13, 17, 22 |
| F11 | P1 | Both | Hero | Hero canvas snake (blue beads, orange head) crawls over the serial port label, the "CONNECT SIMULATION ENGINE" text and "Simulation disconnected" on Gen 3 mobile. On Gen 2 desktop it crosses the Gen toggle. | Decorative motion layered over real controls. It reads as a demo effect, not an instrument. | Contain the snake in its own stage area with no overlap with controls, or show the static product render. Pause it when it isn't in view. | 19, 01 |
| F12 | P1 | Gen 2 | Mobile | `#btn-generate` "Preview" 103×27, `#btn-use-generated` 118×27, `#btn-cancel-generated` 74×27, `#btn-canvas-start` 154×27, `#btn-clear` 116×27, `#refresh-ports` 41×29, `#marquee-toggle` 75×24, `#btn-toggle-password` 21×21, range inputs 298×8 track | Under 44px, which fails the touch floor. Gen 3's equivalents are 40px, so the two generations differ. | 44px minimum on mobile and 40px on desktop for all buttons. Give range inputs a 44px hit area around the 8px track. | 22 |
| F13 | P1 | Gen 3 | Calibration & Diag | Quick Diagnostic Actions: "Read all · torque off snapshot", "Align all joints to 2048", "Query Disarmed D Diagnostics". Disabled with `color: rgba(16,16,16,.3)` × `opacity:.55`, so the text is about 17% visible. | Near-invisible ghost buttons, with no reason given. "Disarmed D Diagnostics" reads like a typo. | One disabled style (Ash text on Fog, about 3:1) plus a single line saying why ("Sign in as Operator and connect to run diagnostics"). Rename it "Query disarmed diagnostics". | 13 |
| F14 | P2 | Both | Headings | Two display families: `Bowlby One` (h1 100.8px; card h2 18px uppercase) and Inter (telemetry h2 22.5px on Gen 2 and 18px on Gen 3; team h2 26px; team h3 22px). Gen 2 "Live Trajectory Tracking" is 24px while its sibling cards are 18px. Gen 3 "Simulation gait settings" (sentence case) is forced uppercase next to Title Case siblings. Sizes in use: 9.5, 10, 11, 12, 13, 15, 18, 22, 22.5, 24, 26, 100.8. | Chunky novelty display face plus inconsistent heading roles. There are 12 sizes with no scale. | One family (Roobert, or Manrope as DESIGN.md's substitute). Use the DESIGN.md scale: caption 19 / body 21–22 / subheading 24 / heading 34 / hero 68. For the dense console, define a compact scale (13/15/18/24) and use it everywhere. Sentence case on all headings. | 02, 07 |
| F15 | P2 | Both | Global | Body text `rgb(0,0,0)`, all borders `#000`. Uppercase labels tracked +0.33 to +0.48px (`.card-tag` 0.352px, `.sticker` 0.416px, `.gen-card-badge` 0.475px). | Pure-black-and-tracked-caps is the default "brutalist template" voice. DESIGN.md forbids both (Carbon text, −0.007em max). | Carbon `#312f27` for text. Ash `#b1afa7` for the few structural dividers. Remove positive tracking and most uppercase. | 02 |
| F16 | P2 | Gen 3 | Controls / Calibration / Firmware | Subtitle "Continuous Phase Integration · Discontinuity-Free Live Tuning". "Optimistic concurrency active: revision token dab1c0cfed3210f3. Concurrent saves from other tabs will be detected and rejected." "Fixed allowlisted PlatformIO environments with structured arguments (shell disabled)." | Buzzword taglines and developer-internal copy shown to operators. | Replace with what the operator needs: "Changes apply live while a trial runs." Move revision tokens and security notes into a collapsible "Details" or tooltip. | 09, 13, 14 |
| F17 | P2 | Gen 3 | Runs & Presets | Three KPI tiles: "TOTAL TRIALS 50 completed", "TOTAL MEASURED TRAVEL 0.0 cm displacement", "AVERAGE DURATION 11.0 s / run". | Hero-metric tiles from a SaaS template. "0.0 cm measured travel" over 50 runs looks broken or fake. | Show one summary line above the table ("50 runs · 11 s average · no displacement recorded yet"). Hide travel until a run has an annotation. | 12 |
| F18 | P2 | Gen 3 | Runs journal | Annotation inputs in each row: placeholders clipped to "Disp c" / "Disp (", "Surface", "Notes"; the SAVE button is ghosted. | Cramped, clipped, generated-looking table cells. | Move annotation into a row-expand or side drawer. Give the table 6 columns max: Run, Time, Mode, Exec, Duration, Actions. | 12 |
| F19 | P2 | Gen 3 | Runs & Presets | Gait Presets: a salmon "DELETE" button on each of 6 rows. Three nested panels inside the card ("Simulation Gait Settings", "Save Current Draft as Preset"), each 6px radius with its own border. | The destructive action is the loudest element on every row, and the boxes nest inside boxes. | Delete goes in an overflow menu or as a quiet text action. Flatten to two columns with no inner borders. | 11 |
| F20 | P2 | Gen 3 | Firmware | A dashed red callout ("Browser upload is unavailable…") containing a yellow "IMPORTANT:" callout and then checkboxes. | Nested alert boxes in two colours with two border styles. | One Sand callout (per DESIGN.md) with a red left rule for the danger line, then the checklist on the plain surface. | 14 |
| F21 | P2 | Gen 3 | Console search | `#console-search-results`: centered titles, uppercase grey snippets truncated mid-word ("…WITHOUT MEAS", "…READS ARE INSTANTANEOUS SNAPSH"). | A raw text dump styled like a template card. | Left-align. Show the title plus tab name ("Calibration & Diag") in sentence case, with 1-line snippets ending in "…" at word boundaries. | 16 |
| F22 | P2 | Gen 2 | Telemetry | `#telemetry-hub` "10-Joint Actuator Telemetry" while disconnected: a 40px-radius frame with a title and 5 chips, and no body. | An empty frame with no empty state looks unfinished. | Add an empty state: "Connect the engine to stream joint telemetry" plus a ghost table with the 10 joint IDs. | 03 |
| F23 | P2 | Both | Header + hero | The brand appears in the header ("S" badge + "SURGE 090 / SMART SNAKE SYSTEM"), the 100.8px hero headline "SURGE 090", the marquee ("SURGE-090 SMART SNAKE ROBOT"), and the footer heading. | Repeated brand with no information, a classic generated landing-page filler. | Keep the header wordmark (lowercase, per DESIGN.md wordmark rule). Make the hero say what this screen does ("Plan a planar path", "Run 3D gaits"). | 01, 06 |
| F24 | P2 | Both | Team footer | `.surge-team-card` ×3: initials avatars "BB" (mint), "MC" (lavender), greyed Email/GitHub/Instagram buttons for 2 of 3 people. | Placeholder avatars and disabled social buttons look like template filler. | Show only working links. Use one neutral avatar treatment (photo or Sand initials). Use a simple list instead of three bordered cards. | 03 |
| F25 | P2 | Both | 3D viewer | Gen 2 viewer: light-blue grid, a "WAITING FOR SIMULATION ENGINE…" chip. Gen 3 viewer: dark navy, neon cyan snake, mono HUD (VIEW / CAMERA / STATE) that covers about 40% of the viewport on mobile. | Two visual worlds for the same component, and the neon-on-navy HUD is a "sci-fi dashboard" cliché. | Pick one stage (Slate Gray `#788086` floor, Paper grid lines, yellow snake per DESIGN.md "yellow product on gray"). Collapse the HUD to a single line that hides on mobile. | 02, 07, 20 |
| F26 | P2 | Both | Contrast | White on ember sticker: 3.47:1 at 13px. Slate `#64748b` on lavender: 3.30:1 (Gen 3 "Direct parameter sliders tuning dual orthogonal spatial waves."). Badge "3D Spatial Snake" at 9.5px: 4.47:1. | Low-contrast decorative text is common in generated UIs. | Removed with F01, F03 and F07. Any text that stays must reach 4.5:1. | 01, 07 |
| F27 | P2 | Both | Generation switch | `.gen-info-card` hover card: `#0f172a` 1.5px borders, `system-ui` 9.5px/800 uppercase badges, Tailwind `#bbf7d0` / `#bae6fd` fills, 12px radius plus a mixed soft and hard shadow. | A third, separate type and colour system inside one component. | Reuse the shared tooltip: Paper, Carbon text, 6px radius, one soft shadow, product font. | — (computed style) |
| F28 | P3 | Both | Page background | Light sky `#dceeff` with a dot-grid pattern behind all content. | A template "canvas" background. | Use full-bleed bands per DESIGN.md: Slate hero, then Paper/Fog working area. | 01, 06 |
| F29 | P2 | Gen 3 | Tabs | The active tab "3D Simulation" has a yellow fill, a blue underline, a black 1px border, a sliding lavender `::before` pill (`rgb(224,234,255)`), and lifts −2px on hover. | Four overlapping "selected" signals. | One signal: Carbon text on a Paper pill sliding on a Fog track. No underline, no lift. | 06, 09 |
| F30 | P3 | Gen 3 | Per-joint / Calibration | Native blue checkboxes ("In gait" ×10, "I verified the simulation limits", calibration confirm). | Browser-default accent clashes with everything else. | `accent-color: #7700ff` (violet is interactive per DESIGN.md). | 10, 13 |
| F31 | P3 | Gen 2 | Desktop, viewer | The Live Trajectory WebGL canvas captures the mouse wheel. Three scroll attempts with the cursor over the viewer did not move the page. | Scroll-jacking. It feels like an embedded demo. | Require Ctrl or a click-to-focus before wheel zoom, and show a hint "Ctrl + scroll to zoom". | 02 |

---

## 3. Gen 2 vs Gen 3 component differences

| Component | Gen 2 name + effect | Gen 3 name + effect | Difference | Unify to |
|---|---|---|---|---|
| Marquee pause | `#marquee-toggle` "❚❚ PAUSE", translucent `rgba(255,255,255,.16)`, 1px white/35% border, 11px, 75×24; hover background/border 150ms | Same id, solid black fill, 1px white border, 15px/650, 93×28 | Size, weight and fill differ | Remove with the marquee (F05) |
| Header sign-in | `.morphing-action-btn` "PASSWORD" (uppercase), 112×28; transitions bg/color/shadow/padding 300ms, transform 200ms | Same class, "Password" (sentence case), 101×26; bg/color 200ms, transform 100ms | Case, size and timing differ | Sentence case, 40px, color 150ms ease-out, expand 250ms `--ease-smooth-out` |
| Operator select | Native `<select>` with native chevron, 126×26 | `halo-select`, 143×32, 20px radius, custom ▼, hover tint `#eff6ff` with blue border | Two select styles | One select: Fog fill, 6px radius (DESIGN input), 40px |
| Hero eyebrow | — | "MODULAR SNAKE CONTROL" pill badge | Only on Gen 3 | Drop; use a real subtitle (F23) |
| Hero stickers | "⭐ PLANAR SERPENOID" + 3 shared | "⭐ 3D SERPENOID" + 3 shared | Same decoration, different text | Remove (F03) |
| Generation switch | `.generation-switch`, mint active, info card on hover | Same | Identical | Keep the segmented control; restyle per F29 |
| Serial port select | Mono font, pill radius, + "🔄" emoji refresh button 41×29 | Inter, 6px radius; refresh "↻" lives in the Controls tab | Font, radius and refresh location differ | One select style + one line-icon refresh button 40×40, in the same place on both |
| Connect button | "CONNECT ENGINE" pill, 162×38, white | "CONNECT SIMULATION ENGINE", 6px radius, 272×40, disabled ghost | Label, radius and size differ | One primary button: label "Connect", 6px radius, 40/44px |
| Connection status | "DISCONNECTED" pill with dot | "Simulation disconnected" text **and** an "IDLE; NO CONNECTION" pill **and** a job timer card | One indicator vs three | One status chip (dot + label) + elapsed time when running |
| Primary button | `.btn-primary` `#075eaa`, 40px radius, 27px tall | `.btn-primary` `#075eaa`, 6px radius, 40px tall, uppercase 12px/650 | Radius and height | Violet `#7700ff` pill (28.5px radius per DESIGN.md), 44px, sentence case |
| Secondary button | White pill (1600px), 1px black border | White, 6px radius, 1px black border | Radius | Paper with Ash 1px border, same radius as primary |
| Danger button | "CLEAR CANVAS" red-700 pill | "DELETE" salmon (`#f87171`-like), STOP tab action | Two reds | One danger red, only for STOP and confirm dialogs |
| Text and number inputs | Pill radius (1600px), 34px, mono | 6px radius, 40px, Inter, slate border `#64748b` | Radius, font, height | DESIGN.md input: Fog fill, 6px, 1px subtle border, violet 2px focus |
| Card | `.card` 2px black border + 3px hard shadow + 20px radius | Same `.card`, plus 6px-radius nested sub-panels and 2px-shadow variants | Gen 3 nests more | Flat Paper card, 2.85px radius (F02) |
| Card title | Bowlby One 18px uppercase; "Live Trajectory Tracking" 24px | Bowlby One 18px uppercase, incl. sentence-case source text | Viewer title size differs | One heading style (F14) |
| Section wrapper | `.telemetry-section` 40px radius, 1px border | Same | Same, but a different radius from `.card` (20px) | Remove wrappers; use spacing |
| Card tag | "GENERATOR", "LIVE FEED", "TUNING", "ST3215 BUS" | "PYBULLET FEEDBACK" | Different labels, same no-value pill | Remove (F07) |
| Legend chips | Above viewer: Target / Actual / 11 Links / Path %. Below viewer: Inflatable blue body / Ember head / Target trajectory | Above viewer: 5 pitch / 5 yaw / 11 links / 3D ground plane. Axis legend inside HUD | Different content, placement and count | One inline swatch legend below the viewer |
| 3D viewer stage | Light-blue grid, white background | Dark navy, neon cyan snake, mono HUD | Two visual worlds (F25) | One stage style |
| Viewer toolbar | "DRAW PATH / FOLLOW HEAD: ON / RESET VIEW", small pills inside the canvas | Camera select + FULLSCREEN + route buttons below (6px) | Placement and shape | One toolbar row above the viewer, 40px buttons |
| Settings panel | "Simulation Physics", flat list, Apply / Set to Default pills | "Simulation gait settings", ▾ collapsible groups, Confirm / Reset defaults full-width 6px | Pattern, verbs and button shapes | Collapsible groups + "Apply" / "Reset" on both |
| Slider | Yellow thumb, value right in mono; hover scale 1.15 + turns electric blue (100ms) | Same CSS | Same | Violet thumb (interactive), no colour swap on hover |
| Toggle/option | "LOW POWER MODE" yellow `.pill-option` with a checkbox inside | Native blue checkboxes | Two checkbox looks | One checkbox with `accent-color` violet |
| Telemetry | "10-Joint Actuator Telemetry" Inter 22.5px, empty frame + rate pill | "10-Joint Simulation Feedback" Inter 18px, 10 bordered cards with 50% bars | Name, size, content | One table: 10 rows × (angle, speed, load, status), honest empty state |
| Tabs | None (single scroll page) | 5 emoji pill tabs, yellow active + underline + sliding bg (320ms) + hover lift | Only Gen 3 | Gen 3 segmented tabs per F29; Gen 2 can use the same tabs for Plan / Physics / Telemetry |
| Search | None | Command search bar, 2px blue border + glow, centered results | Only Gen 3 | Fine to keep on Gen 3; restyle per F21 |
| Gamepad | "Gamepad State" card + violet QR "Gamepad node" card | In the Controls tab | Different home | Same "Controller" panel name on both |
| STOP | "STOP / TORQUE OFF" (2 lines) + "IDLE" | "STOP / TORQUE OFF" (3 lines) + "STATUS UNKNOWN" / "IDLE" | Line count and status text | One docked STOP bar (F10) |
| Log / console | None visible | Firmware: dark PlatformIO terminal | Only Gen 3 | Keep; use Carbon background, not `#0f172a` navy |
| Tables | None | Per-joint table, calibration table, runs table (slate headers) | Only Gen 3 | One table style: Carbon header text, Ash dividers, no outer border |
| Generation transition | Grey wash + **yellow** cartoon snake with a face + "Switching to Gen 3 ..", ellipsis 900ms loop | Same, reverse | Mascot is yellow; hero snake is blue | Remove the overlay; plain navigation (or a 250ms page slide) |
| Team footer | 3 bordered cards, initials avatars, greyed links | Same | Identical | Simple list (F24) |

---

## 4. Motion and polish (`transitions-polish`)

Values were read from the live CSSOM and confirmed with computed styles and hover/click in the browser. Token names are from the transitions.dev scale (`--duration-quick` 150ms, `--duration-fast` 250ms, `--duration-slow` 400ms, `--ease-smooth-out` `cubic-bezier(0.22,1,0.36,1)`).

**Systemic issue:** there are 17 distinct durations (100, 120, 150, 160, 180, 200, 220, 300, 320, 380, 400, 420, 900ms, 3s, 24s) and 6 easings, including two overshoot curves on surfaces. `button, .btn { transition: .15s }` animates *all* properties on every button in both generations.

| # | Gen | Element | Trigger | Current | Problem | Change to |
|---|---|---|---|---|---|---|
| M1 | Both | `.marquee-track` | Always | `marquee-scroll 24s linear infinite` | Perpetual decorative motion | Remove |
| M2 | Both | `button, .btn` | Hover/press | `transition: 0.15s` (all, `ease`) | `transition: all` | `transition-property: background-color, color, border-color, transform; 150ms ease-out` |
| M3 | Both | `.btn-primary/-secondary/-danger:hover` | Hover | `translateY(-1px)` + bg | Hover lift on every button is a template tic | Colour only on hover; `scale(.96)` on `:active` |
| M4 | Both | `body .btn:active` | Press | `translateY(1px)` | Inconsistent with the footer's `scale(.96)` | `scale(.96)`, 150ms ease-out |
| M5 | Both | `.card:hover` | Hover | `translateY(-2px)` + shadow 3→5px, 180ms `cubic-bezier(.16,1,.3,1)` | Static containers shouldn't move on hover | Remove (cards aren't clickable) |
| M6 | Both | `.sticker:hover` | Hover | `scale(1.1) rotate(0)`, 200ms ease (verified: `matrix(1.1,0,0,1.1,0,0)`) | Toy effect | Remove with the stickers |
| M7 | Both | `.logo-badge:hover` | Hover | `rotate(-8deg) scale(1.05)`, 150ms | Decorative wiggle | Remove |
| M8 | Both | `.display-headline:hover` | Hover | `translateY(-2px) scale(1.01)` + blue glow, 300ms | Non-interactive text reacts to hover | Remove |
| M9 | Both | `.headlight-beacon` | Always | `headlight-pulse 3s ease-in-out infinite alternate` | Decorative loop | Remove |
| M10 | Both | Hero snake canvas | Always | Continuous crawl over controls | Covers controls (F11) | Static, or contained and paused offscreen |
| M11 | Gen 2 | `.telem-box:hover` | Hover | `telemetry-wiggle 0.3s ease-in-out` | Data cells wiggle | Remove |
| M12 | Both | `.nav-pill` | Hover | `transition: .12s` (all) + −1px | `all`, lift | bg 150ms ease-out |
| M13 | Both | Range thumb | Hover | `transform .1s`; hover `scale(1.15)` + colour swap to electric blue | Colour swap + big scale | `scale(1.1)` max, 150ms ease-out, no colour swap |
| M14 | Gen 2 | `.trigger-bar-fill` | Live | `width .1s` | Layout property | `transform: scaleX()` 100ms linear |
| M15 | Gen 2 | `.stick-dot` | Live | `transform .1s cubic-bezier(.25,.46,.45,.94)` | Fine for live input | Keep |
| M16 | Both | `.morphing-button-container` | Open sign-in | `max-width .38s cubic-bezier(.34,1.35,.64,1)` (overshoot) | Bouncy, layout-animating open | 250ms `--ease-smooth-out` open, 150ms close, no overshoot |
| M17 | Both | `.morphing-action-btn` | Hover/expand | Gen 2: bg/color/shadow/padding 300ms + transform 200ms. Gen 3: bg/color 200ms + transform 100ms | Same component, different timing per page; padding animated with bounce | color 150ms ease-out on both |
| M18 | Both | `.morphing-icon-slot` | Icon swap | `transform .3s cubic-bezier(.34,1.35,.64,1)`, opacity 200ms | Bounce on an icon swap | 250ms `ease-in-out`, scale .25→1, blur 2px→0 |
| M19 | Both | `.morphing-button-container.has-error` | Error | `morphing-shake .4s ease-in-out` | OK idea, long | 80ms segments, 6px/8px travel |
| M20 | Both | `.morphing-eye-btn:hover` | Hover | `scale(1.08)`, 150ms | Unneeded | Colour only |
| M21 | Both | `.gen-info-card` | Hover tooltip | opacity/transform 180ms `cubic-bezier(.16,1,.3,1)`, 6px Y | No intent delay; appears on pass-over | 80ms delay, 150ms `ease-out`, scale .98, 4px |
| M22 | Both | `.generation-switch a` | Hover | color/bg 150ms ease-out | On-grid | Keep |
| M23 | Both | Generation transition overlay | Navigate | Full-page grey wash + cartoon snake + `generation-ellipsis 900ms infinite` | Loading-theatre for a same-origin page load | Remove, or a 250ms page slide (8px, blur 3px) |
| M24 | Gen 3 | `.cockpit-tabs [role=tab]` | Hover | `transform 160ms cubic-bezier(.22,1,.36,1)`, hover −2px | Tab lift | No lift; colour 150ms |
| M25 | Gen 3 | `.moving-background::before` (tab and search highlight) | Tab change / hover | transform + **width + height** 320ms `cubic-bezier(.22,1,.36,1)`; opacity 120ms | Animates layout properties; off-token duration | 250ms `--ease-smooth-out`, transform + scaleX only |
| M26 | Gen 3 | `.rolling-column` (rolling number) | Data update | `transform 420ms cubic-bezier(.16,1,.3,1)` | Numbers update at ~3 Hz, so they never settle | No animation for live values; `tabular-nums` |
| M27 | Gen 3 | `.gen3 select` | Hover | border/bg 150ms ease-out; picker icon rotate 150ms | On-grid | Keep |
| M28 | Both | `.surge-team-action` | Hover/press | bg/transform 150ms ease-out; `:active scale(.96)` | **The right pattern** | Use as the reference for all buttons |
| M29 | Gen 3 | `.shader-blur-toggle-btn` / `.shader-blur-popover` | Hover / open | hover −2px + `0 6px 20px` shadow; popover-in 200ms `cubic-bezier(.16,1,.3,1)` | Lift + heavy shadow; off-token | Open 250ms smooth-out scale .97 → close 150ms |
| M30 | Gen 3 | `.grid-beam-pill`, `.grid-beam-metric-cell` | Hover | `.12s` all; bg 150ms | `all`; decorative cyan "beam" lines in Bus Metrics | Remove beams; bg 150ms |
| M31 | Gen 3 | `.pixel-snake-char` | Hover | color + text-shadow 120ms | Decorative heading effect | Remove |
| M32 | Both | `.pill-option`, `.status-indicator .dot`, `.status-stale` | State | 120ms / 200ms / 200ms | Off-grid but harmless | 150ms ease-out |
| M33 | Both | `.top-nav.distorted-glass-header` | Scroll state | background/border/shadow 300ms | Glass effect | Remove with F04 |

**Reduced motion:** `prefers-reduced-motion` rules exist for the marquee, cards, generation switch, telemetry wiggle, beacon, rolling number, tabs, selects and team actions. There is **no** reduced-motion handling for `.sticker:hover`, `.logo-badge:hover`, the range-thumb scale, `.shader-blur-popover`, `.grid-beam-*` or the hero snake canvas. The morphing-button reduced-motion rule sets an empty `transition`.

---

## 5. Prioritized fix plan

Each stage can ship on its own, and each one leaves the site coherent.

### Stage 1 — Quick wins (deletions, under a day)
1. Remove the marquee band (F05, M1) and the four hero stickers (F03, M6).
2. Remove hover motion on non-interactive things: `.card:hover`, `.display-headline:hover`, `.logo-badge:hover`, `.telem-box:hover` wiggle, `.headlight-beacon` loop (M5, M7–M9, M11).
3. Replace `transition: .15s` (all) on `button, .btn` with explicit properties at 150ms ease-out. Copy the `.surge-team-action` press pattern, `scale(.96)`, to all buttons (M2–M4, M28).
4. Delete the decorative card tags and footer "SURGE 090" tags (F07).
5. Fix the disabled-button style and the "Disarmed D" label (F13).
6. Fix the 50% fake bars: empty track when there's no sample (F08).
7. `accent-color` on all checkboxes (F30).

### Stage 2 — Medium (layout + consistency, 2–4 days)
1. **Mobile:** tab bar as a horizontal scroller (F09); docked STOP bar with reserved space (F10); 44px controls on Gen 2 (F12); keep the hero snake off the controls (F11).
2. **Unify primitives across generations:** one button (radius, 40/44px height, sentence case), one input, one select, one status chip, one legend style, one settings-panel pattern (Section 3 "Unify to" column).
3. **Copy pass:** remove the brand repetition, rewrite the jargon subtitles, empty states for Gen 2 telemetry and the Runs KPIs (F16, F17, F22, F23).
4. **Flatten nesting:** Gait Presets, Firmware callouts, Runs annotation drawer, search results (F18–F21).
5. **Emoji → one line-icon set** (F06).
6. **Motion tokens:** adopt the `_root.css` duration and easing tokens. Fix the morphing button (M16–M20), the tab indicator (M25), tooltip intent delay (M21) and rolling numbers (M26). Add reduced-motion coverage for the gaps listed above.

### Stage 3 — Larger (visual system, about 1–2 weeks)
1. **Decide whether DESIGN.md applies to this operator console.** It is a Playdate *marketing brochure* reference (Persuade mode); this site is mostly an *Operate* tool. Recommended: keep its tokens (Carbon, Paper, Fog, Sand, Ash, Sunbeam band, violet interactive, Manrope as the Roobert substitute, 2.85px cards, 6px inputs, 28.5px CTA pills) and add a dense console type scale. Also fix the DESIGN.md contradiction: violet is "do not promote to CTA" in the token table but is the CTA in Components and Do's.
2. **Replace the palette and card recipe** (F01, F02, F15): remove the hard shadows and black borders; neutrals per DESIGN.md.
3. **Rebuild the hero** (F04, F23, F25, F28): Slate Gray band, lowercase wordmark in yellow, the real snake as the product on stage, no glass and no blob. Build one 3D viewer stage style shared by both generations.
4. **Retire the effect files** that only decorate: `distorted-glass.css`, `shader-lens-blur.css`, `grid-beam.css`, `pixel-snake-heading.css`, the decorative parts of `hover-background.css` and `generation-transition.css` (M23, M29–M31, M33).
5. **Single typeface and scale** (F14); then re-run this audit and `$impeccable polish`.

---

### Verification notes
- Screenshot frames from the browser pane sometimes lagged one action behind. Each screenshot used here was re-taken after a settle delay and cross-checked against `getBoundingClientRect`.
- The Gen 2 → Gen 3 switch works with a correctly targeted click (shot 05); an earlier failed click was my mis-targeting, not a bug.
- **Not verified:** connected or streaming states (no hardware or simulation engine running), the signed-in Operator UI, dark theme (`[data-theme="dark"]` rules exist but no toggle was found), the `/3d` viewer route, and real touch gestures (mobile was an emulated viewport; touch was not synthesized).

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
- 2 Nov "AI-look" audit (`AI_LOOK_AUDIT_REPORT.md`, screenshots in `report-assets/`).
  Follow-ups: remediation plan `docs/ideas/ai-look-remediation-plan.md` and research
  `docs/research/ai-look-primary-research.md`. These are **proposals only, not implemented**.

None of the findings have been fixed yet. Next step: owner review of `docs/ideas/ai-look-remediation-plan.md`.
Note that `docs/research/ai-look-primary-research.md` corrects some severity labels, for example 24 px (AA) vs 44 px (AAA) target size.

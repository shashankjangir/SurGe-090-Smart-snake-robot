# Dashboard optimization plan (not implemented)

Scope: `generations/gen3-experimental-3d/backend/web_dashboard` (Flask `web_app.py`, 3 pages: `/`, `/gen3`, `/3d`).
Method: `performance-optimization` skill — measure, fix one thing, re-measure, keep or revert.

## Step 0 — Baseline first (no changes)
- Run Lighthouse / built-in browser Network+Performance on `/`, `/gen3`, `/3d` (cold + warm cache). Record LCP, INP, CLS, transferred bytes, request count.
- Time `/api/status`, `/api/3d_status`, `/api/gen3/status` under a running SIM.
- Log every attempt (kept or reverted) in a ledger at the bottom of this file.

### Baseline — 2026-10-31 (Flask dev server, localhost:5001, built-in browser, idle / no SIM running)

Reliable (byte and request counts):

| Page | Requests | Transferred (cold) | Decoded | Transferred (warm) | DOM nodes | Biggest items |
|---|---|---|---|---|---|---|
| `/` | 170 (incl. polling) | 2,556 KB | 2,520 KB | 88 KB | 482 | avatar PNG 1,646 KB, hero JPG 480 KB |
| `/gen3` | 87 | 1,532 KB (CSS/images already cached) | 3,866 KB | — | 1,789 | `gen3-cad.json` 661 KB, `three-r128.min.js` 590 KB, 17 CSS + 17 JS files |
| `/3d` | 23 | 26 KB + CDN | 717 KB | — | 36 | three.js from CDN, 118 KB gzipped |

- LCP element on `/` and `/gen3`: `IMG inflatable_blue_ribbon.jpg`. CLS ≤ 0.007 on every page (already good).
- No compression: `gen3.js` is served at 58,318 B with `Cache-Control: no-cache`, so every visit revalidates. gzip -9 sizes: three.js 603→149 KB, CAD JSON 677→131 KB, gen3.js 58→15 KB, gen3-sim.js 57→15 KB, script.js 46→10 KB, gen3.css 44→9 KB, style.css 36→7 KB.
- The CDN copy of three.js on `/3d` was 118 KB because it's gzipped; the vendored copy on `/gen3` was 590 KB. Direct evidence for #5.
- API polling in a 10 s window: `/` ≈ 35 req (`/api/status`, `/api/gen3/session`, `/api/system_stats`); `/gen3` ≈ 70 req (≈ 49 × `/api/gen3/status`, i.e. ~5/s); `/3d` ≈ 96 req (`/api/3d_status`; at 50 ms the target is 200/10 s, so the browser was already throttling it).
- API latency when idle (curl, 15 samples): every endpoint p50 3–6 ms, p90 ≤ 25 ms, payloads ≤ 2 KB. **The backend is not a bottleneck while idle.**

Unreliable (timing, recorded but not to be trusted): the Browser pane was hidden or not in view for most runs (`fps` 2–27, worst frame ~1.9 s = background throttling). Recorded: `/` cold LCP 4.6 s / DCL 4.1 s; `/` warm LCP 5.6 s / DCL 2.6 s; `/gen3` DCL 3.7 s, load 5.5 s, 354 ms of long tasks; `/3d` long tasks 108 ms. Re-measure LCP, DCL and FPS with the window in view before judging any fix on timing.

Not yet measured: anything **with a SIM running** (it needs an operator login): payload growth of `/api/status` and `/api/3d_status` as `actual_path` fills, and `/api/status` latency during a long POST (#15).

## P1 — Big, cheap wins
| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | Footer avatar is 1.68 MB PNG shown at 56×56 | `static/images/shashank-jangir.png`, `templates/team_footer.html:22` | Export 112×112 WebP (~10 KB). |
| 2 | Hero image 491 KB JPG, likely the LCP element, no size/priority hints | `inflatable_blue_ribbon.jpg`, `index.html:159`, `gen3.html:175` | WebP/AVIF + `width`/`height` + `fetchpriority="high"`; `srcset` for mobile. |
| 3 | `/3d` polls `/api/3d_status` every **50 ms** and returns full, unbounded `target_path`/`actual_path` each time | `3d_viewer.html:441`, `web_app.py:442` | Poll at 100–200 ms (match `gen3-sim.js`), send path tail / only when `path_revision` changes, pause when tab hidden. |
| 4 | `/api/status` deep-copies the whole state (incl. full `actual_path`) then slices to 500 | `web_app.py:434-440` | Slice before copy. |
| 5 | No HTTP compression; JS/CSS/JSON served raw | `requirements.txt` has no compressor | `flask-compress` (gzip/br). `gen3-cad.json` 677 KB and three.js 603 KB shrink most. |
| 6 | Static files have no long cache headers | Flask default | Set `SEND_FILE_MAX_AGE_DEFAULT` + `?v=` cache-busting in templates. |

## P2 — Page load structure
| # | Finding | Evidence | Fix |
|---|---|---|---|
| 7 | 16–17 render-blocking CSS files per page, 11–16 JS files | `gen3.html:11-44`, `index.html:11-38` | Concatenate per page (simple build step or Flask-Assets), or at least merge the small effect CSS files. |
| 8 | `generation-transition.js` loaded without `defer` in `<head>` | `gen3.html:15`, `index.html:16` | `defer` unless it must run before first paint (check). |
| 9 | `index.html` loads `motion-state.js`, `operator-session.js`, `script.js` blocking at end of body; gen3 uses `defer` | `index.html:506-508` | Consistent `defer`. |
| 10 | three.js (603 KB) loaded on `/gen3` even when the 3D sim tab is never opened | `gen3.html:40` | Lazy-load three.js + `gen3-cad.json` when the sim tab is first shown. |
| 11 | `/3d` pulls three.js + OrbitControls from two CDNs while `/gen3` uses the vendored copy | `3d_viewer.html:186-187` | Use vendored copy (works offline in the lab, one cached file). |
| 12 | Google Fonts on every page (3 families, 5 Inter weights) — external, fails offline | all templates | Self-host WOFF2 subset, drop unused weights. |

## P3 — Runtime cost
| # | Finding | Fix |
|---|---|---|
| 13 | Many always-on `requestAnimationFrame` effects (shader-lens-blur, liquid-grid, grid-beam, hero-fluid-trail, hero-snake-motion, pixel-snake-heading); only some pause on `visibilitychange` | Pause all effects when hidden/offscreen (IntersectionObserver); profile INP while the sim is running. |
| 14 | `operator-session.js` polls session every 1 s; `script.js` stats every 2 s; gen3 loop 400 ms — none pause when hidden | Pause on `document.hidden`; consider merging session into status response. |
| 15 | Global `control.lock` is held for the **entire** duration of every non-GET `/api/` request (`before_request` → `teardown_request`) | Measure `/api/status` latency during a long POST (e.g. diagnostics, firmware start); if it stalls, narrow the lock to the critical section. Safety-critical — needs tests first. |

## P4 — Dead weight (delete)
- `static/socket.io.min.js` (50 KB) — no server, no template loads it.
- `static/vendor/gsap-3.15.0.min.js` (73 KB) — not referenced.
- `static/videos/snake_motion.mp4` (1 MB) — not referenced.
- `static/canvas-fractal-grid.{js,css}` — not loaded by any template.
- Unused API aliases `/api/gen3/session/claim|release` (kept by user decision, 2026-10-31).

## Skills to use per phase
- `performance-optimization` — baseline, ledger, keep/revert discipline (all phases).
- `anthropic-skills:built-in-browser` — Lighthouse-style measurement and network waterfall (`browser-testing-with-devtools` needs a chrome-devtools MCP that isn't configured).
- `frontend-ui-engineering` / `make-interfaces-feel-better` — image, font and CSS consolidation without visual regressions.
- `transitions-polish` — trim/pause animation effects (#13).
- `test-driven-development` + `doubt-driven-development` — the lock change (#15); it touches motion safety.
- `ponytail-audit` — confirm dead-code list (P4) before deleting.
- `incremental-implementation` — one fix per commit with before/after numbers.

## Ledger
| Idea | Baseline → Result | Verdict | Why |
|---|---|---|---|
| #1 Avatar → 168×168 WebP (q82, 3× DPR) + `loading="lazy"` `decoding="async"` | 1,646 KB → 3.2 KB transferred; `/` cold page weight 2,556 KB → ~910 KB | kept (2026-10-31) | Bytes are deterministic, so no timing noise. Below the fold, so it no longer competes with the LCP hero image. Checked visually in the footer. Old `shashank-jangir.png` is now unreferenced; delete it with P4. |
| #2 Hero → 1146×640 WebP (q78, 2× its 573×320 display) + `width`/`height` + `fetchpriority="high"` | 480 KB → 21 KB | kept | It's the LCP element on `/` and `/gen3`. Checked visually. |
| #3 `/3d_status` sends the last 500 trail points (same as `/api/status`); poll chained instead of `setInterval`, paused while hidden; still 50 ms for smooth motion | 163 KB → 14 KB per poll with a 10k-point trail (≈ 3.2 MB/s → 0.28 MB/s at 20 Hz) | kept | Bench: `scratchpad/bench_status.py`, Flask test client, 200 samples. |
| #4 `/api/status` trims the trail before deep-copying | p50 13.7 ms → 1.3 ms (same 14,237 B body) | kept | Same bench, 2 runs each. |
| #5 stdlib gzip in `after_request` (text/JS/JSON/SVG ≥ 1 KB; static gzip cached per ETag) | gen3.js 58→15 KB, three.js 603→149 KB, CAD JSON 677→130 KB; decompressed bytes identical | kept | No new dependency for the Pi. 304 revalidation still works. |
| #6 `?v={{ asset_v }}` on every template `/static/` URL + `max-age=31536000, immutable` when it matches | Warm `/gen3`: 17 revalidations → 1 (only `gen3-cad.json`, fetched from JS); server log confirms | kept | Version = CRC of all static mtimes/sizes, rescanned ≤ 1/s, so any edit busts the cache. Unversioned URLs keep `no-cache`. |
| #7 Concatenate CSS/JS | — | **not done** | 16 scripts start with file-level `'use strict'`, so joining them changes semantics, and the browser tests serve only real `/static/` files. With #5 and #6 a warm load makes 0 asset requests. |
| #8 `defer` on generation-transition.js | — | **not done** | It must run before first paint (adds `generation-entering` to `<html>`). Now cached immutably. |
| #9 `defer` on end-of-body scripts in index.html | — | **not done** | Blocking scripts at the very end of `<body>` cost about the same as `defer`. |
| #10 Lazy-load three.js + CAD on `/gen3` | — | **not done** | The 3D Simulation tab is the default active tab, so they're needed on every load. |
| #11 `/3d` uses vendored three.js | CDN → local (149 KB gz, shared cache with `/gen3`) | kept | OrbitControls vendored too (`static/vendor/OrbitControls-r128.js`, 26 KB, same pinned three@0.128.0 file), after approval on 2026-10-31. |
| #12 Self-host Google Fonts (`static/fonts/`, 10 woff2 + rewritten `fonts.css`, OFL 1.1) | 3 external origins per page → 0; a page downloads only `inter-latin` (48 KB) + `bowlby-one-latin` (22 KB) via unicode-range | kept (2026-10-31) | Verified in the browser: no external requests on `/`, `/gen3`, `/3d`; fonts load from local files. The dashboard now renders correctly with no internet. |
| #13 Effects: `gen3-sim.js` skips the canvas draw when off-screen (IntersectionObserver) and writes telemetry DOM only on change; hero snake pauses off-screen | gen3-sim main thread: top 162 → 7 ms/s, canvas in view 196 → 60 ms/s, bottom 90 → 11 ms/s; hero snake off-screen 25–42 → 0 ms/s | kept | rAF wrapper measured 3 s per position, window in view, 60 fps throughout. Hidden tabs already stop rAF. |
| #14 Display polls idle while hidden (`script.js` status + stats, `gen3.js` loop); `/gen3` system stats 400 ms → 2 s | `/gen3` stats 2.5 → 0.5 req/s | kept | **Operator heartbeat left untouched**: lease 3 s (`session.py:48`), and expiry triggers a safety stop. |
| #15 Narrow the global lock | — | **not done** | Slow handlers (diagnostics, connect) take `control.lock` themselves around serial I/O, so narrowing the outer lock wouldn't unblock anything; the Gen 3 status poll doesn't take it. Restructuring hardware I/O locking needs hardware tests. |
| P4 Delete dead files | socket.io.min.js 50 KB, gsap 73 KB, snake_motion.mp4 1 MB, old avatar PNG 1.6 MB, old hero JPG 480 KB | kept | `canvas-fractal-grid.*` kept: it has its own test (`test_canvas_fractal_grid.cjs`). |

**Totals (cold, gzip, local assets):** `/` 2,556 KB → **105 KB**; `/gen3` ≈ 1,532 KB transferred / 3,866 KB decoded → **412 KB**; `/3d` 150 KB (now same-origin). Tests: 108 Python + 34 Node pass (two Node tests changed to accept the `?v=` suffix).

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

**Status.** The plan is still not run step by step. Related changes now in the working tree: self-hosted fonts,
WebP images, removal of GSAP / socket.io / the MP4, and asset versioning with compression and cache headers in
`web_app.py`. Re-measure against the 31 Oct baseline before claiming any gain.

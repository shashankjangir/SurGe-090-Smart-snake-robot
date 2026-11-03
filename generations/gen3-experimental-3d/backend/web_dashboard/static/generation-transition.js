/* Snake-strike generation switch. A normal document navigation owns each dashboard and its
 * polling lifecycle; the overlay starts on the source page and resumes on the destination,
 * keyed to the click time, so both halves read as one continuous transition. */
(() => {
  'use strict';

  // ---- Config ------------------------------------------------------------------------------
  const TRANSITION_MS = 2800;      // full timeline; the reveal waits for this and for readiness
  const APPROACH_START_MS = 300;   // overlay has faded in, the snake appears far away
  const APPROACH_END_MS = 1900;    // head fills most of the screen
  const STRIKE_MS = 2300;          // jaws snap open
  const COVER_MS = 2450;           // mouth covers the viewport; the destination is underneath
  const EXIT_MS = 150;             // overlay fade/scale out
  const REDUCED_MS = 500;          // reduced-motion crossfade, split between fade in and out
  const DEADLINE_MS = 10000;
  const SEGMENTS = 18;
  const MESSAGES = { '/gen3': 'Switching to Gen 3', '/': 'Switching to Gen 2.1' };
  const EASE = {
    approach: p => p * p,                  // accelerates toward the viewer
    snap: p => 1 - Math.pow(1 - p, 3),     // jaw opens fast and settles
    lunge: p => p * p * p,                 // mouth expansion accelerates over the viewer
    exit: 'cubic-bezier(0.22, 1, 0.36, 1)'
  };

  const KEY = 'surge-generation-transition';
  const TAU = Math.PI * 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;
  let readiness = 'pending';
  let incoming;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
    if (saved && ['/', '/gen3'].includes(saved.to) && ['/', '/gen3'].includes(saved.from) &&
        saved.to === location.pathname && Date.now() - saved.at < 15000 && Date.now() >= saved.at) incoming = saved;
  } catch (_) { /* Storage restrictions retain ordinary navigation. */ }
  if (incoming) {
    document.documentElement.classList.add('generation-entering');
    if (!reduced.matches && Date.now() - incoming.at >= COVER_MS) document.documentElement.classList.add('generation-entering-covered');
  }

  window.SurgeGenerationTransition = {
    ready() { readiness = 'ready'; active?.settle(); },
    fail() { readiness = 'failed'; active?.fail(); }
  };

  const clamp01 = v => Math.min(1, Math.max(0, v));
  const lerp = (a, b, p) => a + (b - a) * p;

  // One controller for both variants: timing, message, input blocking, deadline and cleanup.
  function playSnakeTransition(record, arriving) {
    if (active) return;
    const root = document.documentElement;
    const stage = document.createElement('dialog');
    stage.className = 'generation-stage';
    stage.dataset.variant = record.to === '/gen3' ? 'gen3' : 'gen2';
    stage.setAttribute('aria-labelledby', 'generation-status');
    stage.innerHTML = `<div class="generation-caption"><p id="generation-status" role="status" aria-live="polite">${MESSAGES[record.to]}<span class="generation-ellipsis" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>
      <div class="generation-recovery" hidden><p>The dashboard could not finish loading.</p><div>
      <a href="${record.from}">Go back</a><button type="button">Reload dashboard</button></div></div>`;
    document.body.append(stage);
    stage.showModal();
    root.classList.remove('generation-entering', 'generation-entering-covered');

    let renderer = null, frame = 0, disposed = false, failed = false, exiting = false;
    const elapsed = () => Date.now() - record.at;
    const timeout = setTimeout(() => arriving && readiness === 'ready' ? exit() : fail(), DEADLINE_MS);

    function dropRenderer() {
      cancelAnimationFrame(frame);
      frame = 0;
      renderer?.dispose();
      renderer = null;
    }
    function cleanup(focus = false) {
      if (disposed) return;
      disposed = true;
      clearTimeout(timeout);
      dropRenderer();
      reduced.removeEventListener('change', reduceMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      stage.close();
      stage.remove();
      root.classList.remove('generation-entering', 'generation-entering-covered');
      active = null;
      if (focus) document.querySelector('.generation-switch a[aria-current="page"]')?.focus({ preventScroll: true });
    }
    function exit() {
      if (disposed || failed || exiting) return;
      exiting = true;
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      const duration = renderer ? EXIT_MS : REDUCED_MS / 2;
      setTimeout(() => cleanup(true), duration + 100);
      try {
        stage.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.04)' }],
          { duration, easing: EASE.exit, fill: 'forwards' }).onfinish = () => cleanup(true);
      } catch (_) { cleanup(true); }
    }
    function fail() {
      if (disposed || failed) return;
      failed = true;
      clearTimeout(timeout);
      // The source page keeps its navigation running; the overlay only offers recovery links.
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      dropRenderer();
      stage.getAnimations().forEach(animation => animation.cancel());
      stage.classList.add('generation-failed');
      stage.querySelector('#generation-status').textContent = 'Switch paused';
      stage.querySelector('.generation-recovery').hidden = false;
      stage.querySelector('button').focus();
    }
    // The destination reveals once the timeline has finished and the dashboard reports ready.
    function settle() {
      if (disposed || failed || !arriving || readiness !== 'ready') return;
      if (!renderer || elapsed() >= TRANSITION_MS) exit();
    }
    function tick() {
      frame = 0;
      if (disposed || failed || exiting || !renderer) return;
      const t = elapsed();
      try {
        renderer.draw(t);
      } catch (_) {
        dropRenderer();
        settle();
        return;
      }
      if (t >= TRANSITION_MS) settle();
      else frame = requestAnimationFrame(tick);
    }
    function onVisibility() {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else if (!frame) tick();
    }
    function reduceMotion() {
      if (!reduced.matches || failed) return;
      dropRenderer();
      settle();
    }

    active = { cleanup, settle, fail };
    reduced.addEventListener('change', reduceMotion);
    document.addEventListener('visibilitychange', onVisibility);
    stage.addEventListener('cancel', event => { event.preventDefault(); location.assign(record.from); });
    const retry = stage.querySelector('button');
    if (!arriving) retry.textContent = 'Try again';
    retry.onclick = () => {
      if (arriving) { location.reload(); return; }
      cleanup();
      record.at = Date.now();
      try { sessionStorage.setItem(KEY, JSON.stringify(record)); } catch (_) {}
      playSnakeTransition(record, false);
      location.assign(record.to);
    };
    if (arriving && readiness === 'failed') { fail(); return; }
    if (!arriving) {
      try {
        stage.animate([{ opacity: 0 }, { opacity: 1 }],
          { duration: reduced.matches ? REDUCED_MS / 2 : APPROACH_START_MS, easing: 'ease-out' });
      } catch (_) { /* Opaque immediately. */ }
    }
    if (!reduced.matches) {
      try { renderer = createSnakeRenderer(stage, record.to === '/gen3'); } catch (_) { renderer = null; }
    }
    if (renderer) tick();
    else settle();
  }

  // Draws the approaching snake on one 2D canvas. `solid` selects the shaded 3D variant;
  // otherwise it is the flat planner-style variant. Same geometry, same timeline.
  function createSnakeRenderer(host, solid) {
    const canvas = document.createElement('canvas');
    canvas.className = 'generation-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;
    host.prepend(canvas);

    const css = getComputedStyle(document.documentElement);
    const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const sun = token('--color-sunburst', '#ffd731');
    const ink = token('--color-carbon', '#000000');
    const paper = token('--color-paper-white', '#ffffff');
    const backdrop = token('--color-concrete-gray', '#cccccc');
    const light = mix(sun, paper, 0.55);
    const dark = mix(sun, ink, 0.28);

    let W = 0, H = 0;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.clientWidth || innerWidth;
      H = canvas.clientHeight || innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    addEventListener('resize', resize);

    function paint(x, y, r) {
      if (!solid) return sun;
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
      g.addColorStop(0, light);
      g.addColorStop(0.55, sun);
      g.addColorStop(1, dark);
      return g;
    }

    function segment(x, y, r) {
      if (r < 0.4) return;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = paint(x, y, r);
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * (solid ? 0.07 : 0.1));
      ctx.strokeStyle = ink;
      ctx.stroke();
      if (!solid) {
        // Planner joint marker
        ctx.beginPath();
        ctx.arc(x, y, r * 0.2, 0, TAU);
        ctx.fillStyle = ink;
        ctx.fill();
      }
    }

    function fang(x, y, w, len) {
      if (len <= 0.5) return;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x, y + len);
      ctx.closePath();
      ctx.fillStyle = paper;
      ctx.fill();
      ctx.stroke();
    }

    // Front view of a viper-style head: wide at the jaw hinges, tapering to the snout.
    function headPath(rx, ry) {
      ctx.beginPath();
      ctx.moveTo(-rx * 0.42, ry * 0.92);
      ctx.bezierCurveTo(-rx * 1.02, ry * 0.5, -rx * 1.12, -ry * 0.55, -rx * 0.62, -ry * 0.9);
      ctx.quadraticCurveTo(0, -ry * 1.14, rx * 0.62, -ry * 0.9);
      ctx.bezierCurveTo(rx * 1.12, -ry * 0.55, rx * 1.02, ry * 0.5, rx * 0.42, ry * 0.92);
      ctx.quadraticCurveTo(0, ry * 1.06, -rx * 0.42, ry * 0.92);
      ctx.closePath();
    }

    function tongue(x, y, len, w) {
      if (len <= 1) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len);
      ctx.moveTo(x, y + len);
      ctx.lineTo(x - len * 0.22, y + len * 1.3);
      ctx.moveTo(x, y + len);
      ctx.lineTo(x + len * 0.22, y + len * 1.3);
      ctx.stroke();
      ctx.restore();
    }

    function head(hx, hy, hr, k, open, flick) {
      const rx = hr * 1.1, ry = hr, split = ry * 0.32;
      const gap = open * ry * 0.6;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(k, k);
      ctx.lineWidth = Math.max(1.5, hr * 0.045);
      ctx.strokeStyle = ink;
      ctx.lineJoin = 'round';

      if (open > 0) {
        ctx.beginPath();
        ctx.ellipse(0, split, rx * 0.86, gap * 1.15 + ry * 0.04, 0, 0, TAU);
        ctx.fillStyle = ink;
        ctx.fill();
      } else {
        tongue(0, ry * 0.98, ry * 0.42 * flick, Math.max(1.5, hr * 0.05));
      }
      const jaw = (shift, top) => {
        ctx.save();
        ctx.translate(0, shift);
        ctx.beginPath();
        if (top) ctx.rect(-2 * rx, -2 * ry, 4 * rx, 2 * ry + split);
        else ctx.rect(-2 * rx, split, 4 * rx, 2 * ry);
        ctx.clip();
        headPath(rx, ry);
        ctx.fillStyle = paint(0, -ry * 0.1, Math.max(rx, ry));
        ctx.fill();
        ctx.stroke();
        if (open > 0) {
          ctx.clip();
          ctx.beginPath();
          ctx.moveTo(-2 * rx, split);
          ctx.lineTo(2 * rx, split);
          ctx.stroke();
        }
        ctx.restore();
      };
      jaw(gap, false);
      jaw(-gap, true);

      // Eyes, brows and nostrils ride the upper jaw
      for (const side of [-1, 1]) {
        const ex = side * rx * 0.58, ey = -ry * 0.38 - gap;
        ctx.beginPath();
        ctx.ellipse(ex, ey, hr * 0.15, hr * 0.12, 0, 0, TAU);
        ctx.fillStyle = paper;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(ex, ey, hr * 0.035, hr * 0.11, 0, 0, TAU);
        ctx.fillStyle = ink;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ex - side * hr * 0.2, ey - hr * 0.12);
        ctx.lineTo(ex + side * hr * 0.17, ey - hr * 0.27);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(side * rx * 0.13, ry * 0.12 - gap, hr * 0.03, hr * 0.045, side * 0.5, 0, TAU);
        ctx.fill();
      }

      if (open > 0) {
        for (const side of [-1, 1]) {
          fang(side * rx * 0.38, split - gap, rx * 0.12, ry * 0.55 * open);
          ctx.save();
          ctx.scale(1, -1);
          fang(side * rx * 0.2, -(split + gap), rx * 0.07, ry * 0.18 * open);
          ctx.restore();
        }
      } else {
        ctx.save();
        headPath(rx, ry);
        ctx.clip();
        ctx.beginPath();
        ctx.moveTo(-rx * 1.1, split - ry * 0.12);
        ctx.quadraticCurveTo(0, split + ry * 0.1, rx * 1.1, split - ry * 0.12);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    function draw(t) {
      if (t >= COVER_MS) {
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, W, H);
        return;
      }
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, W, H);
      if (t < APPROACH_START_MS) return;

      const f = Math.min(W, H) * 0.9;
      const cx = W / 2, cy = H * 0.5;
      const p = clamp01((t - APPROACH_START_MS) / (APPROACH_END_MS - APPROACH_START_MS));
      const headZ = 1 / lerp(1 / 26, 1 / 1.3, EASE.approach(p));
      const phase = t * 0.0055;

      // Body trails back toward the vanishing point in an S-curve; the neck rises to eye level.
      for (let i = SEGMENTS; i >= 1; i--) {
        const s = i * 0.62;
        const z = headZ + 0.3 + s * 0.95;
        const x = 0.45 * s + 1.1 * Math.sin(phase - s * 0.85) * (s / (s + 1.2));
        const y = 1.5 * Math.min(1, s / 2.4) ** 0.8;
        segment(cx + x * f / z, cy + y * f / z, 0.36 * (1 - 0.55 * i / SEGMENTS) * f / z);
      }
      const flick = t < APPROACH_END_MS ? Math.max(0, Math.sin(t * 0.011)) ** 2 : 0;

      let hx = cx + 0.12 * Math.sin(phase * 0.8) * f / headZ * (1 - p);
      let hy = cy;
      let k = 1, open = 0;
      if (t > APPROACH_END_MS && t < STRIKE_MS) {
        const q = (t - APPROACH_END_MS) / (STRIKE_MS - APPROACH_END_MS);
        hx += Math.sin(t * 0.11) * 3 * (1 - q);
        hy += Math.cos(t * 0.13) * 2 * (1 - q);
        k = 1 - 0.06 * EASE.snap(clamp01((t - (STRIKE_MS - 150)) / 150));
      } else if (t >= STRIKE_MS) {
        const q = (t - STRIKE_MS) / (COVER_MS - STRIKE_MS);
        open = EASE.snap(clamp01(q * 1.5));
        k = 0.94 + EASE.lunge(clamp01(q)) * 9;
      }
      head(hx, hy, 0.5 * f / headZ, k, open, flick);
    }

    return {
      draw,
      dispose() {
        removeEventListener('resize', resize);
        canvas.remove();
      }
    };
  }

  function mix(a, b, amount) {
    const parse = hex => {
      const h = hex.replace('#', '');
      const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
      const n = parseInt(full, 16) || 0;
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const x = parse(a), y = parse(b);
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * amount)).join(',')})`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (incoming) playSnakeTransition(incoming, true);
    document.addEventListener('click', event => {
      const link = event.target.closest('.generation-switch a');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || !['/', '/gen3'].includes(url.pathname) || url.pathname === location.pathname) return;
      // A stale or failed overlay must never swallow the click: drop it and navigate plainly.
      if (active) { active.cleanup(); return; }
      event.preventDefault();
      const record = { from: location.pathname, to: url.pathname, at: Date.now() };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(record));
        playSnakeTransition(record, false);
      } catch (_) {
        try { active?.cleanup(); sessionStorage.removeItem(KEY); } catch (_) {}
      } finally {
        location.assign(url.href);
      }
    });
  });
  window.addEventListener('pagehide', () => active?.cleanup());
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      active?.cleanup();
      document.documentElement.classList.remove('generation-entering', 'generation-entering-covered');
      try { sessionStorage.removeItem(KEY); } catch (_) {}
    }
  });
})();

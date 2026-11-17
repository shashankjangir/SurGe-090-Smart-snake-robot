/**
 * Liquid Grid - Rippling dot-matrix page background
 * Adapted from LiquidGrid (React / Originkit) to Vanilla HTML5 Canvas.
 * A damped 2D wave field is driven by the pointer; dots ride the wave and
 * pick up the glow colour as they are displaced.
 */
(function() {
  'use strict';

  const DEFAULT_CONFIG = {
    mode: 'dots',
    // Slush sky-wash paper with ink-blue dots and a voltage-violet wake
    background: '#dceeff',
    lineColor: 'rgba(22, 44, 96, 0.2)',
    glowColor: '#5c4ade',
    cellSize: 18,
    lineWidth: 1.4,
    radius: 58,
    intensity: 100,
    collide: true,
    clickRipple: true
  };

  const DAMPING = 0.97;
  const WAVE_HEIGHT = 14;
  const STEP = 8;
  const MAX_CELLS = 150;
  const PAD = 20;
  const WAVE_C = Math.SQRT1_2;
  const MUR_K = (WAVE_C - 1) / (WAVE_C + 1);
  const ABSORB_MAX = 0.6;
  const BUCKETS = 4;
  const GLOW_FULL = 4;
  const TAU = Math.PI * 2;

  function parseColor(color) {
    const s = String(color || '').trim();
    const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return [+m[1], +m[2], +m[3]];
    const h = s.replace('#', '');
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
    const n = parseInt(f, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function clamp(n, min, max, fallback) {
    const v = typeof n === 'number' ? n : parseFloat(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  }

  function settingsFor(p) {
    const weight = clamp(p.lineWidth, 1, 10, DEFAULT_CONFIG.lineWidth);
    return {
      mode: p.mode === 'lines' ? 'lines' : 'dots',
      background: p.background,
      lineColor: p.lineColor,
      glowColor: p.glowColor,
      cellSize: clamp(p.cellSize, 8, 120, DEFAULT_CONFIG.cellSize),
      lineWidth: weight / 2,
      dotRadius: weight,
      radius: clamp(p.radius, 20, 600, DEFAULT_CONFIG.radius),
      hoverStrength: (clamp(p.intensity, 0, 100, DEFAULT_CONFIG.intensity) / 100) * 0.6,
      collide: p.collide !== false,
      click: p.clickRipple !== false
    };
  }

  function initLiquidGrid(customConfig) {
    const canvas = document.getElementById('liquid-grid');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const config = Object.assign({}, DEFAULT_CONFIG, customConfig || {});
    const reducedMotion = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };

    const rip = {
      cur: new Float32Array(0),
      prev: new Float32Array(0),
      W: 0, H: 0, rW: 0, rH: 0, gW: 0, gH: 0,
      live: false
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.max(1, canvas.clientWidth);
      const H = Math.max(1, canvas.clientHeight);
      const pw = Math.round(W * dpr);
      const ph = Math.round(H * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (rip.W === W && rip.H === H) {
        drawFrame(settingsFor(config));
        return;
      }
      rip.W = W;
      rip.H = H;
      const scale = Math.min(1 / 3, MAX_CELLS / Math.max(W, H));
      rip.rW = Math.max(4, Math.floor(W * scale));
      rip.rH = Math.max(4, Math.floor(H * scale));
      rip.gW = rip.rW + PAD * 2;
      rip.gH = rip.rH + PAD * 2;
      rip.cur = new Float32Array(rip.gW * rip.gH);
      rip.prev = new Float32Array(rip.gW * rip.gH);
      rip.live = true;
      drawFrame(settingsFor(config));
    }

    function addDrop(cx, cy, radius, strength, collide) {
      const { W, H, rW, rH, gW, gH, cur } = rip;
      if (!W || !gW) return;
      const gx = (cx / W) * rW + PAD;
      const gy = (cy / H) * rH + PAD;
      const gr = Math.max(1, radius * (rW / W));
      const loX = collide ? PAD + 1 : 1;
      const loY = collide ? PAD + 1 : 1;
      const hiX = collide ? PAD + rW - 2 : gW - 2;
      const hiY = collide ? PAD + rH - 2 : gH - 2;
      for (let y = Math.max(loY, Math.floor(gy - gr)); y <= Math.min(hiY, Math.ceil(gy + gr)); y++) {
        for (let x = Math.max(loX, Math.floor(gx - gr)); x <= Math.min(hiX, Math.ceil(gx + gr)); x++) {
          const d = Math.sqrt((x - gx) ** 2 + (y - gy) ** 2);
          if (d < gr) cur[y * gW + x] += (1 - d / gr) ** 2 * strength;
        }
      }
      rip.live = true;
    }

    // Mur absorbing boundary + sponge layer so waves leave the screen when collide is off
    function openEdges() {
      const { gW, gH, cur, prev } = rip;
      const last = gH - 1;
      const right = gW - 1;
      for (let x = 0; x < gW; x++) {
        const b = last * gW + x;
        cur[x] = prev[gW + x] + MUR_K * (cur[gW + x] - prev[x]);
        cur[b] = prev[(last - 1) * gW + x] + MUR_K * (cur[(last - 1) * gW + x] - prev[b]);
      }
      for (let y = 0; y < gH; y++) {
        const l = y * gW;
        const r = l + right;
        cur[l] = prev[l + 1] + MUR_K * (cur[l + 1] - prev[l]);
        cur[r] = prev[r - 1] + MUR_K * (cur[r - 1] - prev[r]);
      }
      for (let y = 0; y < gH; y++) {
        const dy = Math.min(y, last - y);
        for (let x = 0; x < gW; x++) {
          const d = Math.min(dy, x, right - x);
          if (d >= PAD) {
            if (right - PAD <= x) break;
            x = right - PAD;
            continue;
          }
          const t = 1 - d / PAD;
          const f = 1 - ABSORB_MAX * t * t;
          const i = y * gW + x;
          cur[i] *= f;
          prev[i] *= f;
        }
      }
    }

    let lastCollide = null;
    function updateRipple(collide) {
      const { gW, gH, rW, rH, cur, prev } = rip;
      if (lastCollide !== null && lastCollide !== collide) {
        cur.fill(0);
        prev.fill(0);
        lastCollide = collide;
        rip.live = false;
        return;
      }
      lastCollide = collide;
      const x0 = collide ? PAD + 1 : 1;
      const y0 = collide ? PAD + 1 : 1;
      const x1 = collide ? PAD + rW - 1 : gW - 1;
      const y1 = collide ? PAD + rH - 1 : gH - 1;
      let energy = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * gW + x;
          const v = ((cur[(y - 1) * gW + x] + cur[(y + 1) * gW + x] +
            cur[y * gW + x - 1] + cur[y * gW + x + 1]) * 0.5 - prev[i]) * DAMPING;
          prev[i] = v;
          energy += v * v;
          n++;
        }
      }
      rip.cur = prev;
      rip.prev = cur;
      if (!collide) openEdges();
      if (energy < n * 2e-6) {
        rip.live = false;
        rip.cur.fill(0);
        rip.prev.fill(0);
      }
    }

    function sample(cx, cy) {
      const { W, H, rW, rH, gW, gH, cur } = rip;
      if (!rW || !W) return 0;
      const gx = (cx / W) * rW + PAD;
      const gy = (cy / H) * rH + PAD;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      if (ix < 0 || ix >= gW - 1 || iy < 0 || iy >= gH - 1) return 0;
      const fx = gx - ix;
      const fy = gy - iy;
      return cur[iy * gW + ix] * (1 - fx) * (1 - fy) +
        cur[iy * gW + ix + 1] * fx * (1 - fy) +
        cur[(iy + 1) * gW + ix] * (1 - fx) * fy +
        cur[(iy + 1) * gW + ix + 1] * fx * fy;
    }

    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let pk = new Float32Array(0);
    function fitScratch(n) {
      if (px.length >= n) return;
      px = new Float32Array(n);
      py = new Float32Array(n);
      pk = new Float32Array(n);
    }

    function glowStyle(rgb, i) {
      const t = (i + 1) / BUCKETS;
      return t >= 1
        ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
        : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${t.toFixed(2)})`;
    }

    function drawFrame(S) {
      const { W, H } = rip;
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      if (S.background && S.background !== 'transparent') {
        ctx.fillStyle = S.background;
        ctx.fillRect(0, 0, W, H);
      }

      const cs = S.cellSize;
      const base = new Path2D();
      const glow = [];
      for (let b = 0; b < BUCKETS; b++) glow.push(new Path2D());
      const rgb = parseColor(S.glowColor);

      if (S.mode === 'dots') {
        const numH = Math.ceil(H / cs);
        const offY = (H - numH * cs) / 2;
        const numV = Math.ceil(W / cs);
        const offX = (W - numV * cs) / 2;
        const rad = S.dotRadius;
        for (let iy = 0; iy <= numH; iy++) {
          const baseY = offY + iy * cs;
          for (let ix = 0; ix <= numV; ix++) {
            const cx = offX + ix * cs;
            const d = sample(cx, baseY) * WAVE_HEIGHT;
            const cy = baseY + d;
            base.moveTo(cx + rad, cy);
            base.arc(cx, cy, rad, 0, TAU);
            const k = Math.min(1, Math.abs(d) / GLOW_FULL);
            if (k < 0.06) continue;
            const bi = Math.min(BUCKETS - 1, Math.floor(k * BUCKETS));
            const lit = rad * (1 + k * 0.6);
            glow[bi].moveTo(cx + lit, cy);
            glow[bi].arc(cx, cy, lit, 0, TAU);
          }
        }
        ctx.fillStyle = S.lineColor;
        ctx.fill(base);
        for (let i = 0; i < BUCKETS; i++) {
          ctx.fillStyle = glowStyle(rgb, i);
          ctx.fill(glow[i]);
        }
        return;
      }

      fitScratch(Math.floor(Math.max(W, H) / STEP) + 2);
      function emit(n) {
        base.moveTo(px[0], py[0]);
        for (let i = 1; i < n; i++) base.lineTo(px[i], py[i]);
        for (let i = 1; i < n; i++) {
          const k = pk[i] > pk[i - 1] ? pk[i] : pk[i - 1];
          if (k < 0.06) continue;
          const b = Math.min(BUCKETS - 1, Math.floor(k * BUCKETS));
          glow[b].moveTo(px[i - 1], py[i - 1]);
          glow[b].lineTo(px[i], py[i]);
        }
      }

      const numH = Math.ceil(H / cs);
      const offY = (H - numH * cs) / 2;
      for (let li = 0; li <= numH; li++) {
        const baseY = offY + li * cs;
        let n = 0;
        for (let x = 0; x <= W; x += STEP) {
          const d = sample(x, baseY) * WAVE_HEIGHT;
          px[n] = x;
          py[n] = baseY + d;
          pk[n] = Math.min(1, Math.abs(d) / GLOW_FULL);
          n++;
        }
        emit(n);
      }

      const numV = Math.ceil(W / cs);
      const offX = (W - numV * cs) / 2;
      for (let li = 0; li <= numV; li++) {
        const baseX = offX + li * cs;
        let n = 0;
        for (let y = 0; y <= H; y += STEP) {
          const d = sample(baseX, y) * WAVE_HEIGHT;
          px[n] = baseX + d;
          py[n] = y;
          pk[n] = Math.min(1, Math.abs(d) / GLOW_FULL);
          n++;
        }
        emit(n);
      }

      ctx.lineWidth = S.lineWidth;
      ctx.strokeStyle = S.lineColor;
      ctx.stroke(base);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < BUCKETS; i++) {
        ctx.strokeStyle = glowStyle(rgb, i);
        ctx.lineWidth = S.lineWidth * (1 + ((i + 1) / BUCKETS) * 0.9);
        ctx.stroke(glow[i]);
      }
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }

    let rect = canvas.getBoundingClientRect();
    function toLocal(clientX, clientY) {
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    // Pointer input; the canvas itself ignores pointer events so the page stays clickable
    let queued = null;
    function onMove(e) {
      if (reducedMotion.matches) return;
      queued = toLocal(e.clientX, e.clientY);
    }
    function onDown(e) {
      const S = settingsFor(config);
      if (!S.click || reducedMotion.matches) return;
      const local = toLocal(e.clientX, e.clientY);
      if (local) addDrop(local.x, local.y, S.radius * 1.6, 2.5, S.collide);
    }

    let animId = null;
    function loop() {
      rect = canvas.getBoundingClientRect();
      const S = settingsFor(config);
      if (rip.W > 0 && rip.H > 0) {
        if (queued) {
          addDrop(queued.x, queued.y, S.radius, S.hoverStrength, S.collide);
          queued = null;
        }
        if (rip.live) {
          updateRipple(S.collide);
          drawFrame(S);
        }
      }
      animId = requestAnimationFrame(loop);
    }

    function start() {
      if (animId) return;
      animId = requestAnimationFrame(loop);
    }
    function stop() {
      if (animId) cancelAnimationFrame(animId);
      animId = null;
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);
    else window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    resize();
    start();

    const publicApi = {
      config,
      start,
      stop,
      repaint: () => drawFrame(settingsFor(config)),
      ripple: (x, y, strength) => addDrop(x, y, config.radius * 1.6, strength || 2.5, config.collide !== false),
      destroy: () => {
        stop();
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerdown', onDown);
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };

    window.LiquidGrid = publicApi;
    return publicApi;
  }

  if (typeof module === 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initLiquidGrid());
    } else {
      initLiquidGrid();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initLiquidGrid, DEFAULT_CONFIG, parseColor, settingsFor };
  }
})();

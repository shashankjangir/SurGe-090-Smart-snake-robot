/**
 * GridBeam - Animated Glowing Light Beams Along Grid Dividers
 * Adapted from GridBeam (React / Cult UI / 21st.dev) to Vanilla HTML5 Canvas & ES6.
 */
(function() {
  'use strict';

  const PALETTES = {
    colorful: {
      stops: ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981'],
      glow: '#38bdf8',
      name: 'colorful'
    },
    ocean: {
      stops: ['#0284c7', '#0ea5e9', '#14b8a6', '#06b6d4'],
      glow: '#06b6d4',
      name: 'ocean'
    },
    sunset: {
      stops: ['#ffd731', '#f59e0b', '#f97316', '#ef4444'],
      glow: '#f97316',
      name: 'sunset'
    },
    mono: {
      stops: ['#71717a', '#a1a1aa', '#d4d4d8', '#ffffff'],
      glow: '#ffffff',
      name: 'mono'
    }
  };

  const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
  const caf = typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : clearTimeout;

  function initGridBeam(containerEl, customOptions) {
    if (!containerEl) {
      containerEl = document.querySelector('.grid-beam-container');
    }
    if (!containerEl) return null;

    let canvas = containerEl.querySelector('.grid-beam-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'grid-beam-canvas';
      containerEl.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const options = Object.assign({
      rows: 2,
      cols: 3,
      colorVariant: 'colorful',
      active: true,
      breathe: true,
      duration: 3.6,
      strength: 0.95
    }, customOptions || {});

    let width = 0;
    let height = 0;
    let animId = null;
    let isRunning = false;
    const startTime = performance.now();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = containerEl.clientWidth || 600;
      height = containerEl.clientHeight || 200;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(containerEl);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const isReducedMotion = mediaQuery && mediaQuery.matches;

    function render(currentTime) {
      if (!isRunning) return;

      const t = (currentTime - startTime) * 0.001;
      ctx.clearRect(0, 0, width, height);

      if (!options.active || isReducedMotion) {
        if (!isReducedMotion) animId = raf(render);
        return;
      }

      const palette = PALETTES[options.colorVariant] || PALETTES.colorful;
      const breatheFactor = options.breathe ? (0.75 + 0.35 * Math.sin(t * 2.4)) : 1.0;
      const currentStrength = options.strength * breatheFactor;

      const duration = options.duration || 3.6;
      const progress = (t % duration) / duration;

      // Draw light beams traveling along divider paths
      ctx.save();
      ctx.lineWidth = 2.0;

      // 1. Horizontal Dividers
      const rowStep = height / options.rows;
      for (let r = 1; r < options.rows; r++) {
        const y = Math.round(r * rowStep);
        const phaseOffset = (r * 0.33) % 1.0;
        const lineProg = (progress + phaseOffset) % 1.0;

        const beamLen = Math.min(width * 0.35, 180);
        const headX = (lineProg * (width + beamLen * 2)) - beamLen;
        const tailX = headX - beamLen;

        const x1 = Math.max(0, tailX);
        const x2 = Math.min(width, headX);

        if (x2 > x1) {
          const grad = ctx.createLinearGradient(tailX, y, headX, y);
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(0.5, palette.stops[1]);
          grad.addColorStop(1, palette.glow);

          ctx.shadowBlur = 10 * currentStrength;
          ctx.shadowColor = palette.glow;
          ctx.strokeStyle = grad;

          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
        }
      }

      // 2. Vertical Dividers
      const colStep = width / options.cols;
      for (let c = 1; c < options.cols; c++) {
        const x = Math.round(c * colStep);
        const phaseOffset = (c * 0.42 + 0.2) % 1.0;
        const lineProg = (progress + phaseOffset) % 1.0;

        const beamLen = Math.min(height * 0.4, 120);
        const headY = (lineProg * (height + beamLen * 2)) - beamLen;
        const tailY = headY - beamLen;

        const y1 = Math.max(0, tailY);
        const y2 = Math.min(height, headY);

        if (y2 > y1) {
          const grad = ctx.createLinearGradient(x, tailY, x, headY);
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(0.5, palette.stops[0]);
          grad.addColorStop(1, palette.glow);

          ctx.shadowBlur = 10 * currentStrength;
          ctx.shadowColor = palette.glow;
          ctx.strokeStyle = grad;

          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
          ctx.stroke();
        }
      }

      ctx.restore();

      animId = raf(render);
    }

    function start() {
      if (isRunning) return;
      isRunning = true;
      animId = raf(render);
    }

    function stop() {
      isRunning = false;
      if (animId) {
        caf(animId);
        animId = null;
      }
    }

    start();

    // Wire up interactive pills if present
    const pillButtons = containerEl.querySelectorAll('.grid-beam-pill');
    pillButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const variant = btn.dataset.variant;
        const action = btn.dataset.action;

        if (variant && PALETTES[variant]) {
          options.colorVariant = variant;
          containerEl.querySelectorAll('.grid-beam-pill[data-variant]').forEach(b => {
            b.classList.toggle('active', b.dataset.variant === variant);
          });
        } else if (action === 'toggle-play') {
          options.active = !options.active;
          btn.classList.toggle('active', options.active);
          btn.textContent = options.active ? '⏸ pause' : '▶ play';
        } else if (action === 'toggle-breathe') {
          options.breathe = !options.breathe;
          btn.classList.toggle('active', options.breathe);
          btn.textContent = options.breathe ? '~ breathe' : '— static';
        }
      });
    });

    const publicApi = {
      options,
      PALETTES,
      start,
      stop,
      resize,
      setVariant: (v) => { if (PALETTES[v]) options.colorVariant = v; },
      setActive: (a) => { options.active = !!a; },
      setBreathe: (b) => { options.breathe = !!b; },
      isRunning: () => isRunning,
      destroy: () => {
        stop();
        window.removeEventListener('resize', resize);
      }
    };

    window.GridBeam = publicApi;
    return publicApi;
  }

  // Only auto-initialize in browser environment
  if (typeof module === 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initGridBeam());
    } else {
      initGridBeam();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initGridBeam, PALETTES };
  }
})();

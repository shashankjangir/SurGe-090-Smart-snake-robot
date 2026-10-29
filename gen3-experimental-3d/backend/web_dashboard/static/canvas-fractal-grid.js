/**
 * Canvas Fractal Grid - Animated Snake Dot Grid Background
 * Adapted from CanvasFractalGrid (React / Cult UI / 21st.dev) to Vanilla HTML5 Canvas.
 * Implements serpentine serpenoid traveling wave motion across the dot matrix.
 */
(function() {
  'use strict';

  const DEFAULT_CONFIG = {
    dotSize: 5,
    dotSpacing: 25,
    dotOpacity: 0.8,
    gradientAnimationDuration: 5,
    waveIntensity: 40,
    waveRadius: 250,
    dotColor: "rgba(100, 200, 255, 0.2)",
    glowColor: "rgba(100, 200, 255, 1)",
    enableNoise: true,
    noiseOpacity: 0.05,
    enableMouseGlow: false,
    initialPerformance: "high",
    gradients: [
      {
        stops: [
          { color: "#3498DB", position: 0 },
          { color: "#2980B9", position: 25 },
          { color: "#1ABC9C", position: 50 },
          { color: "transparent", position: 75 }
        ],
        centerX: 30,
        centerY: 70
      },
      {
        stops: [
          { color: "#16A085", position: 0 },
          { color: "#2980B9", position: 25 },
          { color: "#3498DB", position: 50 },
          { color: "transparent", position: 75 }
        ],
        centerX: 70,
        centerY: 30
      }
    ]
  };

  const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
  const caf = typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : clearTimeout;

  function initCanvasFractalGrid(customConfig) {
    const canvas = document.getElementById('canvas-fractal-grid');
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const config = Object.assign({}, DEFAULT_CONFIG, customConfig || {});

    let width = 0;
    let height = 0;
    let animId = null;
    let isRunning = false;
    const startTime = performance.now();

    // Mouse coordinates tracking
    const mouse = {
      x: -9999,
      y: -9999,
      active: false
    };

    // Pre-render static noise texture pattern for film-grain effect
    let noiseCanvas = null;
    let noisePattern = null;

    function createNoisePattern() {
      if (!config.enableNoise) return;
      try {
        noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 128;
        noiseCanvas.height = 128;
        const nCtx = noiseCanvas.getContext('2d');
        if (!nCtx) return;
        const imgData = nCtx.createImageData(128, 128);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const val = Math.floor(Math.random() * 255);
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = Math.floor(config.noiseOpacity * 255);
        }
        nCtx.putImageData(imgData, 0, 0);
        noisePattern = ctx.createPattern(noiseCanvas, 'repeat');
      } catch (e) {
        noisePattern = null;
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth || document.documentElement.clientWidth || 1200;
      height = window.innerHeight || document.documentElement.clientHeight || 800;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      createNoisePattern();
    }

    window.addEventListener('resize', resize);
    resize();

    // Mouse event handlers for wave interaction
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
      mouse.active = false;
    });

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const isReducedMotion = mediaQuery && mediaQuery.matches;

    function render(currentTime) {
      if (!isRunning) return;

      const t = (currentTime - startTime) * 0.001;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Animated Radial Gradients
      const gradDuration = config.gradientAnimationDuration || 5;
      const angle = (t % gradDuration) / gradDuration * Math.PI * 2;

      for (let g = 0; g < config.gradients.length; g++) {
        const gradDef = config.gradients[g];
        // Undulate center along a smooth Lissajous curve
        const orbitRadiusX = width * 0.12;
        const orbitRadiusY = height * 0.12;
        const phaseOffset = g * Math.PI;

        const cx = (gradDef.centerX / 100 * width) + Math.cos(angle + phaseOffset) * orbitRadiusX;
        const cy = (gradDef.centerY / 100 * height) + Math.sin(angle * 1.2 + phaseOffset) * orbitRadiusY;
        const maxRadius = Math.max(width, height) * 0.65;

        const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
        for (let s = 0; s < gradDef.stops.length; s++) {
          const stop = gradDef.stops[s];
          radial.addColorStop(stop.position / 100, stop.color);
        }

        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 2. Render Serpentine Snake Dot Grid
      const spacing = config.dotSpacing || 25;
      const baseRadius = (config.dotSize || 5) * 0.5;
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;

      const waveIntensity = config.waveIntensity || 40;
      const waveRadius = config.waveRadius || 250;

      // Group rendering by alpha/glow for high performance
      ctx.save();

      for (let r = -1; r < rows; r++) {
        const y0 = r * spacing;

        for (let c = -1; c < cols; c++) {
          const x0 = c * spacing;

          let dx = 0;
          let dy = 0;
          let crestIntensity = 0;

          if (!isReducedMotion) {
            // Serpenoid traveling wave (Hirose-inspired traveling curvature)
            const snakePhase1 = (x0 / 160) - (t * 1.6);
            const snakePhase2 = (x0 / 220) + (y0 / 180) - (t * 2.2);

            const sin1 = Math.sin(snakePhase1);
            const cos1 = Math.cos(snakePhase1);
            const sin2 = Math.sin(snakePhase2);
            const cos2 = Math.cos(snakePhase2);

            dy = (sin1 * 18 * Math.cos(y0 / 280)) + (sin2 * 14);
            dx = (cos1 * 8 * Math.sin(y0 / 240)) + (cos2 * 6);

            crestIntensity = Math.max(0, sin1);

            // Interactive mouse snake attraction / repulsion
            if (mouse.active) {
              const dist = Math.hypot(x0 - mouse.x, y0 - mouse.y);
              if (dist < waveRadius) {
                const factor = Math.pow(1 - dist / waveRadius, 2);
                const tangent = Math.atan2(y0 - mouse.y, x0 - mouse.x) + (Math.PI * 0.5 * Math.sin(t * 3.2));
                const mouseWave = Math.sin((dist / 32) - (t * 4.0)) * waveIntensity * factor;
                dx += Math.cos(tangent) * mouseWave;
                dy += Math.sin(tangent) * mouseWave;
                crestIntensity = Math.min(1, crestIntensity + factor * 0.8);
              }
            }
          }

          const px = x0 + dx;
          const py = y0 + dy;

          // Compute dot size & color
          const dotRadius = baseRadius + (crestIntensity * 1.2);
          const alpha = 0.25 + (crestIntensity * 0.55);

          ctx.beginPath();
          ctx.arc(px, py, dotRadius, 0, Math.PI * 2);

          if (crestIntensity > 0.6) {
            ctx.fillStyle = config.glowColor || "rgba(100, 200, 255, 1)";
          } else {
            ctx.fillStyle = `rgba(52, 152, 219, ${alpha})`;
          }
          ctx.fill();
        }
      }

      ctx.restore();

      // 3. Optional Film Grain Noise Texture
      if (config.enableNoise && noisePattern) {
        ctx.save();
        ctx.globalAlpha = config.noiseOpacity || 0.05;
        ctx.fillStyle = noisePattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      if (!isReducedMotion) {
        animId = raf(render);
      }
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

    const publicApi = {
      config,
      start,
      stop,
      resize,
      isRunning: () => isRunning,
      destroy: () => {
        stop();
        window.removeEventListener('resize', resize);
      }
    };

    window.CanvasFractalGrid = publicApi;
    return publicApi;
  }

  if (typeof module === 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initCanvasFractalGrid());
    } else {
      initCanvasFractalGrid();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initCanvasFractalGrid, DEFAULT_CONFIG };
  }
})();

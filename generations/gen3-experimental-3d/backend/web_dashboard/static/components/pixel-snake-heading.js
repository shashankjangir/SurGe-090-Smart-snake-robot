/**
 * SURGE 090 — Pixel Snake Heading
 * Interactive serpentine wave motion and cursor-driven pixel blinking for .display-headline
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PixelSnakeHeading = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const raf = typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : (cb) => setTimeout(cb, 16);
  const caf = typeof cancelAnimationFrame !== 'undefined'
    ? cancelAnimationFrame
    : clearTimeout;

  const GLYPH_VARIANTS = {
    'S': ['5', '$', '§', 'S', '■'],
    'U': ['V', 'µ', '|_|', 'U', '⋃'],
    'R': ['Я', '2', 'P', 'R', '®'],
    'G': ['6', 'C', '&', 'G', '9'],
    'E': ['3', 'Ξ', '€', 'E', 'Σ'],
    '0': ['O', '∅', 'Ø', '0', '□'],
    '9': ['q', 'g', '8', '9', 'P'],
  };

  const DEFAULT_OPTIONS = {
    selector: '.display-headline',
    staggerDelay: 0.18,      // Wave offset between vertebrae / characters
    idleSpeed: 2.2,          // Base sinusoidal undulation speed (rad/s)
    activeSpeed: 5.5,        // Undulation speed when cursor is near/hovering
    idleAmpY: 3.5,           // Vertical wave amplitude (idle) in px
    activeAmpY: 14.0,        // Vertical wave amplitude (active) in px
    idleAmpX: 1.0,           // Lateral shift (idle) in px
    activeAmpX: 6.0,         // Lateral shift (active) in px
    idleTilt: 3.0,           // Max rotation tilt (idle) in deg
    activeTilt: 15.0,        // Max rotation tilt (active) in deg
    interactionRadius: 320,  // Proximity radius in px around headline
    blinkProbability: 0.04,  // Chance per frame to trigger a pixel blink when active
    blinkDuration: 180,      // Duration of each pixel blink cycle in ms
  };

  class PixelSnakeHeading {
    constructor(elementOrSelector, options = {}) {
      this.options = Object.assign({}, DEFAULT_OPTIONS, options);
      if (typeof elementOrSelector === 'string') {
        this.element = typeof document !== 'undefined' ? document.querySelector(elementOrSelector) : null;
      } else {
        this.element = elementOrSelector;
      }

      this.chars = [];
      this.originalText = '';
      this.animId = null;
      this.isRunning = false;
      this.intensity = 0.0;
      this.targetIntensity = 0.0;
      this.lastTime = 0;
      this.phase = 0;
      this.cursor = { x: 0, y: 0, active: false };

      // Bound handlers
      this._onPointerMove = this._handlePointerMove.bind(this);
      this._onPointerLeave = this._handlePointerLeave.bind(this);
      this._onCharEnter = this._handleCharEnter.bind(this);
      this._frame = this._tick.bind(this);

      if (this.element) {
        this.init();
      }
    }

    init() {
      if (!this.element) return;
      this.originalText = this.element.textContent.trim();
      this.wrapCharacters();
      this.attachEvents();
      this.start();
    }

    wrapCharacters() {
      if (!this.element) return;
      const text = this.originalText;
      this.element.setAttribute('aria-label', text);
      this.element.innerHTML = '';
      this.element.classList.add('pixel-snake-active');
      this.chars = [];

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === ' ') {
          const space = document.createElement('span');
          space.className = 'pixel-snake-space';
          space.setAttribute('aria-hidden', 'true');
          space.innerHTML = '&nbsp;';
          this.element.appendChild(space);
        } else {
          const span = document.createElement('span');
          span.className = 'pixel-snake-char';
          span.setAttribute('aria-hidden', 'true');
          span.dataset.char = char;
          span.dataset.index = String(this.chars.length);
          span.textContent = char;
          this.element.appendChild(span);

          const charObj = {
            element: span,
            originalChar: char,
            currentChar: char,
            index: this.chars.length,
            blinking: false,
            blinkTimer: null,
            glyphIndex: 0,
          };
          this.chars.push(charObj);
        }
      }
    }

    attachEvents() {
      if (typeof window === 'undefined') return;
      window.addEventListener('pointermove', this._onPointerMove, { passive: true });
      window.addEventListener('pointerleave', this._onPointerLeave, { passive: true });

      // Direct hover triggers instant interactive blink & crawl
      this.chars.forEach((c) => {
        c.element.addEventListener('pointerenter', this._onCharEnter);
      });
    }

    detachEvents() {
      if (typeof window === 'undefined') return;
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerleave', this._onPointerLeave);

      this.chars.forEach((c) => {
        if (c.element) {
          c.element.removeEventListener('pointerenter', this._onCharEnter);
        }
        if (c.blinkTimer) {
          clearTimeout(c.blinkTimer);
          c.blinkTimer = null;
        }
      });
    }

    _handlePointerMove(e) {
      if (!this.element) return;
      const rect = this.element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.cursor.x = e.clientX;
      this.cursor.y = e.clientY;
      this.cursor.active = true;

      const radius = this.options.interactionRadius;
      if (dist < radius) {
        // Proximity intensity: 1.0 at center down to 0.15 at periphery
        this.targetIntensity = 0.15 + 0.85 * (1 - dist / radius);
      } else {
        this.targetIntensity = 0.0;
      }
    }

    _handlePointerLeave() {
      this.cursor.active = false;
      this.targetIntensity = 0.0;
    }

    _handleCharEnter(e) {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      if (!isNaN(idx) && this.chars[idx]) {
        this.triggerBlink(idx);
        // Also trigger neighbor links in the snake body for propagation
        if (idx > 0) setTimeout(() => this.triggerBlink(idx - 1), 60);
        if (idx < this.chars.length - 1) setTimeout(() => this.triggerBlink(idx + 1), 60);
      }
    }

    triggerBlink(charIndex) {
      const c = this.chars[charIndex];
      if (!c) return;

      const variants = GLYPH_VARIANTS[c.originalChar] || ['■', '✦', c.originalChar];
      if (c.blinkTimer) {
        clearTimeout(c.blinkTimer);
      }

      c.blinking = true;
      c.element.classList.add('blinking', 'pixel-mode');

      // Cycle through 2-3 pixel glyphs rapidly before settling
      let step = 0;
      const totalSteps = 3;
      const stepInterval = Math.max(30, Math.floor(this.options.blinkDuration / totalSteps));

      const cycleGlyph = () => {
        if (!c.element) return;
        step++;
        if (step <= totalSteps) {
          const nextGlyph = variants[Math.floor(Math.random() * variants.length)];
          c.currentChar = nextGlyph;
          c.element.textContent = nextGlyph;
          c.blinkTimer = setTimeout(cycleGlyph, stepInterval);
        } else {
          // Reset to pristine original character
          c.blinking = false;
          c.currentChar = c.originalChar;
          c.element.textContent = c.originalChar;
          c.element.classList.remove('blinking', 'pixel-mode');
          c.blinkTimer = null;
        }
      };

      cycleGlyph();
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      this.animId = raf(this._frame);
    }

    stop() {
      this.isRunning = false;
      if (this.animId) {
        caf(this.animId);
        this.animId = null;
      }
    }

    _tick(nowMs) {
      if (!this.isRunning) return;

      const now = (nowMs || (typeof performance !== 'undefined' ? performance.now() : Date.now())) / 1000;
      const dt = Math.min(now - this.lastTime, 0.1);
      this.lastTime = now;

      // Smooth lerp intensity toward target
      this.intensity += (this.targetIntensity - this.intensity) * Math.min(dt * 6.0, 1.0);

      // Current snake wave parameters
      const speed = this.options.idleSpeed + this.options.activeSpeed * this.intensity;
      this.phase += dt * speed;

      const ampY = this.options.idleAmpY + this.options.activeAmpY * this.intensity;
      const ampX = this.options.idleAmpX + this.options.activeAmpX * this.intensity;
      const tilt = this.options.idleTilt + this.options.activeTilt * this.intensity;

      const n = this.chars.length;
      for (let i = 0; i < n; i++) {
        const c = this.chars[i];
        if (!c.element) continue;

        // Serpenoid kinematic wave: traveling wave from head link to tail link
        const linkPhase = this.phase - i * this.options.staggerDelay;
        const waveY = Math.sin(linkPhase) * ampY;
        const waveX = Math.cos(linkPhase * 0.5) * ampX;
        const waveRot = Math.cos(linkPhase) * tilt;

        c.element.style.transform = `translate3d(${waveX.toFixed(2)}px, ${waveY.toFixed(2)}px, 0) rotate(${waveRot.toFixed(2)}deg)`;

        // Spontaneous pixel blink at wave crests when energized by cursor
        if (this.intensity > 0.35 && !c.blinking) {
          if (Math.sin(linkPhase) > 0.88 && Math.random() < this.options.blinkProbability) {
            this.triggerBlink(i);
          }
        }
      }

      this.animId = raf(this._frame);
    }

    destroy() {
      this.stop();
      this.detachEvents();
      if (this.element) {
        this.element.classList.remove('pixel-snake-active');
        this.element.textContent = this.originalText;
      }
      this.chars = [];
    }
  }

  // Auto-init for browser environments
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof module === 'undefined') {
    const autoInit = () => {
      const el = document.querySelector('.display-headline');
      if (el) {
        window.pixelSnakeHeadingInstance = new PixelSnakeHeading(el);
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInit);
    } else {
      autoInit();
    }
  }

  return PixelSnakeHeading;
});

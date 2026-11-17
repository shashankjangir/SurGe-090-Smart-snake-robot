/* asset: rolling-number.js */
'use strict';

/**
 * Updates or initializes a rolling number element with animated digit columns.
 * @param {HTMLElement} element - Target container element
 * @param {number|string} target - Target value or formatted string
 * @param {Object} [options]
 * @param {number} [options.precision] - Decimal places if target is a number
 * @param {function} [options.format] - Custom string formatter
 * @param {number} [options.duration] - Animation duration in ms (default 420)
 * @param {function} [options.onAnimationStart] - Callback when rolling begins
 * @param {function} [options.onAnimationComplete] - Callback when rolling finishes
 */
function updateRollingNumber(element, target, options = {}) {
  if (!element) return;

  const duration = options.duration ?? 420;
  let text = '';
  if (typeof options.format === 'function') {
    text = options.format(target);
  } else if (typeof target === 'number') {
    text = typeof options.precision === 'number'
      ? target.toFixed(options.precision)
      : String(target);
  } else {
    text = String(target ?? '');
  }

  if (document.body?.dataset.design === 'refined') {
    element.textContent = text;
    element.setAttribute('aria-label', text);
    return;
  }

  element.setAttribute('aria-label', text);
  if (!element.getAttribute('role')) {
    element.setAttribute('role', 'text');
  }

  // If already rendered with matching text, do nothing
  if (element.dataset.currentText === text) return;
  element.dataset.currentText = text;

  if (typeof options.onAnimationStart === 'function') {
    try { options.onAnimationStart(); } catch (e) { console.error(e); }
  }

  element.classList.add('rolling-number');

  // Match characters into columns
  const chars = Array.from(text);
  const currentCols = Array.from(element.children);

  // If column structure doesn't match, rebuild column layout
  const needsRebuild = currentCols.length !== chars.length || currentCols.some((col, idx) => {
    const isDigitCol = col.classList && col.classList.contains('rolling-digit');
    const isDigitChar = /\d/.test(chars[idx]);
    return isDigitCol !== isDigitChar;
  });

  if (needsRebuild) {
    element.replaceChildren();
    for (const ch of chars) {
      if (/\d/.test(ch)) {
        const colWrapper = document.createElement('span');
        colWrapper.className = 'rolling-digit';
        colWrapper.setAttribute('aria-hidden', 'true');
        const colInner = document.createElement('span');
        colInner.className = 'rolling-column';
        for (let d = 0; d <= 9; d++) {
          const digitSpan = document.createElement('span');
          digitSpan.textContent = String(d);
          colInner.appendChild(digitSpan);
        }
        colWrapper.appendChild(colInner);
        element.appendChild(colWrapper);
      } else {
        const charSpan = document.createElement('span');
        charSpan.className = 'rolling-char';
        charSpan.setAttribute('aria-hidden', 'true');
        charSpan.textContent = ch;
        element.appendChild(charSpan);
      }
    }
  }

  // Apply transforms
  const updatedCols = Array.from(element.children);
  chars.forEach((ch, idx) => {
    const col = updatedCols[idx];
    if (/\d/.test(ch)) {
      const inner = col.firstElementChild;
      if (inner) {
        const digit = parseInt(ch, 10);
        inner.style.transitionDuration = `${duration}ms`;
        inner.style.transform = `translateY(-${digit * 10}%)`;
      }
    } else {
      col.textContent = ch;
    }
  });

  if (typeof options.onAnimationComplete === 'function') {
    setTimeout(() => {
      try { options.onAnimationComplete(); } catch (e) { console.error(e); }
    }, duration);
  }
}

if (typeof module !== 'undefined') {
  module.exports = { updateRollingNumber };
}
/* endasset: rolling-number.js */

/* asset: morphing-button.js */
/**
 * Morphing Button - Operator Password Login Component
 * Vanilla ES6 implementation adapted from MorphingButton (React / Motion)
 */
(function() {
  'use strict';

  function initMorphingPassword() {
    const container = document.getElementById('morphing-password-container');
    const input = document.getElementById('login-password');
    const actionBtn = document.getElementById('btn-login');
    const label = document.getElementById('morphing-btn-label');
    const form = document.getElementById('operator-login-form');
    const toggleBtn = document.getElementById('btn-toggle-password');

    if (!container || !input || !actionBtn) return null;

    let isExpanded = false;
    let isPasswordVisible = false;

    function setPasswordVisibility(visible) {
      isPasswordVisible = visible;
      input.type = isPasswordVisible ? 'text' : 'password';
      if (toggleBtn) {
        const eyeShow = toggleBtn.querySelector ? toggleBtn.querySelector('.eye-show') : null;
        const eyeHide = toggleBtn.querySelector ? toggleBtn.querySelector('.eye-hide') : null;
        if (eyeShow && eyeHide && eyeShow.style && eyeHide.style) {
          eyeShow.style.display = isPasswordVisible ? 'none' : 'block';
          eyeHide.style.display = isPasswordVisible ? 'block' : 'none';
        }
        toggleBtn.setAttribute('title', isPasswordVisible ? 'Hide password' : 'Show password');
        toggleBtn.setAttribute('aria-label', isPasswordVisible ? 'Hide password' : 'Show password');
      }
    }

    function focusInput() {
      if (!input) return;
      try {
        input.focus({ preventScroll: true });
        const len = input.value ? input.value.length : 0;
        if (typeof input.setSelectionRange === 'function') {
          input.setSelectionRange(len, len);
        }
      } catch (e) {}
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPasswordVisibility(!isPasswordVisible);
        focusInput();
      });
    }

    function expand() {
      if (isExpanded) {
        focusInput();
        return;
      }
      isExpanded = true;
      input.tabIndex = 0;
      if (toggleBtn) toggleBtn.tabIndex = 0;
      container.classList.add('is-expanded');
      actionBtn.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Login →';
      // Immediate and staged focus to ensure cursor is active in password box
      focusInput();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => focusInput());
      }
      setTimeout(focusInput, 40);
      setTimeout(focusInput, 120);
      setTimeout(focusInput, 240);
    }

    function collapse() {
      if (!isExpanded) return;
      isExpanded = false;
      input.tabIndex = -1;
      if (toggleBtn) toggleBtn.tabIndex = -1;
      container.classList.remove('is-expanded');
      container.classList.remove('has-error');
      actionBtn.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Password';
      setPasswordVisibility(false);
    }

    function shake() {
      container.classList.remove('has-error');
      // Force reflow to re-trigger animation
      void container.offsetWidth;
      container.classList.add('has-error');
      setTimeout(() => {
        container.classList.remove('has-error');
      }, 450);
      try {
        input.focus();
        input.select();
      } catch (e) {}
    }

    // Live update as operator writes password: clear errors immediately
    input.addEventListener('input', () => {
      container.classList.remove('has-error');
      const errEl = document.getElementById('login-error');
      if (errEl) errEl.style.display = 'none';
    });

    // Toggle button handler
    actionBtn.addEventListener('click', (e) => {
      if (!isExpanded) {
        e.preventDefault();
        e.stopPropagation();
        expand();
        focusInput();
      } else {
        const val = input.value.trim();
        if (!val) {
          e.preventDefault();
          shake();
        } else {
          // If inside a form and type="submit", letting it proceed or requesting submit
          if (form) {
            e.preventDefault();
            form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
      }
    });

    // Clicking anywhere on the pill container expands or focuses the input
    container.addEventListener('click', (e) => {
      if (!isExpanded) {
        expand();
      } else if (e.target !== actionBtn && !actionBtn.contains(e.target) && e.target !== toggleBtn && (!toggleBtn || !toggleBtn.contains(e.target))) {
        focusInput();
      }
    });

    // Handle Enter and Escape in password input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (!val) {
          e.preventDefault();
          shake();
        } else if (form) {
          e.preventDefault();
          form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        collapse();
        actionBtn.focus();
      }
    });

    // Click outside listener
    document.addEventListener('mousedown', (e) => {
      if (isExpanded && container && !container.contains(e.target)) {
        collapse();
      }
    });

    const api = {
      expand,
      collapse,
      shake,
      isExpanded: () => isExpanded,
      isPasswordVisible: () => isPasswordVisible,
      setPasswordVisibility,
    };

    window.morphingPasswordButton = api;
    return api;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMorphingPassword);
  } else {
    initMorphingPassword();
  }

  // CommonJS export for Node test runner
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initMorphingPassword };
  }
})();
/* endasset: morphing-button.js */

/* asset: grid-beam.js */
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
          btn.textContent = options.active ? 'pause' : 'play';
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
/* endasset: grid-beam.js */

/* asset: motion-state.js */
/* Presentation only: status comes from the existing server polls. */
window.MotionState = {
  classify(status, running) {
    if (/failed|unconfirmed|error|fault/i.test(status)) return 'unknown';
    if (/^Stop requested/i.test(status)) return 'stopping';
    if (running) return 'running';
    if (/^(Stopped|Completed)\b|^Path Complete$/i.test(status)) return 'stopped';
    if (/^(Idle|Disconnected|Connected|Ready|Planar simulation)\b/i.test(status)) return 'idle';
    return 'unknown';
  },
  label(state) {
    return {idle: 'Idle', running: 'Running', stopping: 'Stopping', stopped: 'Stopped', unknown: 'Unknown · stale'}[state];
  },
  render(ids, state) {
    for (const id of ids) {
      const element = document.getElementById(id);
      if (!element) continue;
      element.classList.add('motion-state');
      element.dataset.motionState = state;
      element.classList.toggle('motion-active', state === 'running');
      element.classList.toggle('motion-stopped', state === 'stopped');
      element.dataset.motionLabel = this.label(state);
    }
  }
};
/* endasset: motion-state.js */

/* asset: operator-session.js */
document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const form = $('operator-login-form');
    if (!form) return;
    let isOperator = false;
    let pending = false;

    // The password control appears only after an operator is chosen.
    const nameSelect = $('login-name');
    const passwordWrapper = $('morphing-password-wrapper');
    const syncPasswordVisibility = () => {
        if (passwordWrapper && nameSelect) passwordWrapper.hidden = !nameSelect.value;
    };
    nameSelect?.addEventListener('change', syncPasswordVisibility);
    syncPasswordVisibility();

    async function request(action, body) {
        const response = await fetch(`/api/gen3/session${action}`, body === undefined ? {} : {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok || data.success === false) throw new Error(data.error || 'Session request failed');
        return data;
    }

    function render(data) {
        isOperator = Boolean(data.is_current_operator);
        $('mode-badge').textContent = isOperator ? 'Operator' : 'Viewer';
        $('user-badge').textContent = data.current_user?.name || '';
        $('user-badge').style.display = isOperator ? 'inline-flex' : 'none';
        form.style.display = isOperator ? 'none' : 'inline-flex';
        $('btn-logout').style.display = isOperator ? 'inline-block' : 'none';
        window.dispatchEvent(new CustomEvent('surge-session', {detail: data}));
    }

    function showError(error) {
        let msg = error?.message || 'Error';
        if (/failed to fetch/i.test(msg) || error instanceof TypeError) {
            msg = 'Cannot reach the dashboard server. Check that it is running.';
        }
        $('login-error').textContent = msg;
        $('login-error').style.display = 'inline';
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (pending) return;
        pending = true;
        $('btn-login').disabled = true;
        $('login-error').style.display = 'none';
        try {
            const result = await request('/login', {name: $('login-name').value, password: $('login-password').value});
            render(await request(''));
            if (isOperator) {
                $('login-password').value = '';
                window.morphingPasswordButton?.collapse();
            } else {
                throw new Error(result.message || 'Operator access unavailable');
            }
        } catch (error) {
            showError(error);
            window.morphingPasswordButton?.shake();
        } finally {
            pending = false;
            $('btn-login').disabled = false;
        }
    });

    $('btn-logout').addEventListener('click', async () => {
        try {
            await request('/logout', {});
            render(await request(''));
            $('login-error').style.display = 'none';
        } catch (error) { showError(error); }
    });

    let refreshing = false;
    async function refresh() {
        if (refreshing || pending) return;
        refreshing = true;
        try {
            if (isOperator) await request('/heartbeat', {});
            render(await request(''));
        } catch (error) {
            render({is_current_operator: false});
            showError(error);
        } finally { refreshing = false; }
    }
    refresh();
    setInterval(refresh, 1000);
});
/* endasset: operator-session.js */

/* asset: battery.js */
/* Display-only: shares the existing system-stats request; never polls hardware. */
window.SurgeBattery = (() => {
  let previous = '';
  function render(sample) {
    const pill = document.getElementById('battery-indicator');
    if (!pill) return;
    const valid = Number.isFinite(sample?.percent) && Number.isFinite(sample?.voltage);
    const fresh = valid && sample.state === 'fresh';
    const percent = valid ? Math.max(0, Math.min(100, Math.round(sample.percent))) : 0;
    const level = fresh ? (percent <= 20 ? 'low' : percent <= 50 ? 'medium' : 'high') : 'unavailable';
    const text = fresh ? `${percent}%` : valid && sample.state === 'stale' ? 'Stale' : 'N/A';
    const details = valid
      ? `${sample.voltage.toFixed(2)} V average · ${sample.sample_count} servos · sampled ${Math.round(sample.age_s)}s ago.`
      : 'No valid voltage feedback.';
    const hint = fresh ? (percent <= 20 ? 'Recharge soon.' : 'Voltage-based reserve estimate; not measured remaining mAh.')
      : 'Open Gen 3 Hardware as Operator for automatic stopped diagnostics. Voltage sampling pauses during motion.';
    const description = `${text} battery reserve. 2200 mAh 3S LiPo. ${details} ${hint} 12.6 V = 100%; 11.1 V = recharge.`;
    const key = `${level}|${description}`;
    if (key === previous) return;
    previous = key;
    pill.dataset.level = level;
    pill.title = description;
    pill.setAttribute('aria-label', description);
    document.getElementById('battery-value').textContent = text;
    document.getElementById('battery-fill').style.transform = `scaleX(${fresh ? percent / 100 : 0})`;
  }
  return { render };
})();
/* endasset: battery.js */

/* asset: hover-background.js */
'use strict';

function highlightBounds(group, item, scrollLeft = 0, scrollTop = 0) {
  return { x: item.left - group.left + scrollLeft, y: item.top - group.top + scrollTop,
    width: item.width, height: item.height };
}
if (typeof module !== 'undefined') module.exports = { highlightBounds };

if (typeof document !== 'undefined') {
  for (const [groupSelector, itemSelector] of [
    ['.cockpit-tabs', '[role="tab"]'],
    ['.tab-nav', '.tab-btn'],
    ['.mode-toggles', '.mode-btn'],
    ['#presets-list', '.preset-card'],
    ['#console-search-list', 'li'],
  ]) {
    const group = document.querySelector(groupSelector);
    if (!group) continue;
    group.classList.add('moving-background');
    let hovered = null;
    const findItem = node => node instanceof Element ? node.closest(itemSelector) : null;

    function update() {
      const focused = group.contains(document.activeElement) ? findItem(document.activeElement) : null;
      const item = hovered?.isConnected ? hovered : focused;
      if (!item || !group.contains(item) || item.disabled) {
        group.classList.remove('has-highlight');
        return;
      }
      const box = highlightBounds(group.getBoundingClientRect(), item.getBoundingClientRect(), group.scrollLeft, group.scrollTop);
      // Absolute coordinates start inside the container border.
      group.style.setProperty('--highlight-x', `${box.x - group.clientLeft}px`);
      group.style.setProperty('--highlight-y', `${box.y - group.clientTop}px`);
      group.style.setProperty('--highlight-width', `${box.width}px`);
      group.style.setProperty('--highlight-height', `${box.height}px`);
      group.classList.add('has-highlight');
    }
    group.addEventListener('pointerover', event => {
      if (event.pointerType === 'touch') return;
      hovered = findItem(event.target);
      update();
    });
    group.addEventListener('pointerleave', () => { hovered = null; update(); });
    group.addEventListener('focusin', () => { hovered = null; update(); });
    group.addEventListener('focusout', () => queueMicrotask(update));
    group.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(group);
  }
}
/* endasset: hover-background.js */

/* asset: distorted-glass.js */
'use strict';

/**
 * DistortedGlass - Interactive SVG fractal noise displacement & glassmorphism effect.
 * Inspired by Cult UI / 21st.dev DistortedGlass component.
 */

const DISTORTED_GLASS_SVG_ID = 'distorted-glass-defs-svg';

function createDistortedGlassDefs() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.id = DISTORTED_GLASS_SVG_ID;
  svg.setAttribute('class', 'distorted-glass-defs');
  svg.setAttribute('aria-hidden', 'true');

  svg.innerHTML = `
    <defs>
      <!-- Liquid Distorted Glass Filter for Headers & Headlines -->
      <filter id="distorted-glass-filter" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feTurbulence id="glass-turbulence" type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="3" result="noise" seed="42" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" result="displaced" />
        <feGaussianBlur in="displaced" stdDeviation="0.4" result="blurred" />
        <feMerge>
          <feMergeNode in="blurred" />
        </feMerge>
      </filter>

      <!-- Headlight Glass Lens Filter with Specular Light Point -->
      <filter id="headlight-glass-filter" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.06 0.12" numOctaves="2" result="noise" seed="17" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="B" result="displaced" />
        <feSpecularLighting in="noise" surfaceScale="2" specularConstant="1.2" specularExponent="20" lighting-color="#ffffff" result="specular">
          <fePointLight x="-50" y="-100" z="200" />
        </feSpecularLighting>
        <feComposite in="specular" in2="displaced" operator="in" result="specularDisplaced" />
        <feMerge>
          <feMergeNode in="displaced" />
          <feMergeNode in="specularDisplaced" />
        </feMerge>
      </filter>
    </defs>
  `;
  return svg;
}

function initDistortedGlass(options = {}) {
  if (typeof document === 'undefined') return;

  // 1. Ensure SVG defs are in DOM
  if (!document.getElementById(DISTORTED_GLASS_SVG_ID)) {
    const defs = createDistortedGlassDefs();
    document.body.prepend(defs);
  }

  // 2. Apply classes to headlines, top-nav, and headlights
  const topNav = document.querySelector('.top-nav');
  if (topNav) {
    topNav.classList.add('distorted-glass-header');
  }

  const headlines = document.querySelectorAll('.display-headline');
  headlines.forEach(headline => {
    headline.classList.add('distorted-glass-headline');
  });

  const headlights = document.querySelectorAll('.status-indicator .dot, #status-dot');
  headlights.forEach(hl => {
    hl.classList.add('headlight-glass');
  });

  const logoBadge = document.querySelector('.logo-badge');
  if (logoBadge) {
    logoBadge.classList.add('distorted-glass-logo');
  }

  // 3. Interactive glass refraction on mouse movement (parallax effect)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    const turbulence = document.getElementById('glass-turbulence');
    const hero = document.querySelector('.hero-section');
    if (turbulence && hero) {
      hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const baseFreqX = (0.035 + normX * 0.015).toFixed(4);
        const baseFreqY = (0.075 + normY * 0.015).toFixed(4);
        turbulence.setAttribute('baseFrequency', `${baseFreqX} ${baseFreqY}`);
      });
    }
  }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDistortedGlass());
  } else {
    initDistortedGlass();
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    DISTORTED_GLASS_SVG_ID,
    createDistortedGlassDefs,
    initDistortedGlass
  };
}
/* endasset: distorted-glass.js */

/* asset: phone-pad.js */
// Presents the /phone controller page as one more standard gamepad on the laptop dashboard.
window.SurgePhonePad = (() => {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  let pad = null, link = null;
  const waiting = [];
  async function poll() {
    try {
      const response = await fetch('/api/phone/pad', {cache: 'no-store', signal: AbortSignal.timeout(500)});
      const data = await response.json();
      pad = data.pad ? {id: 'SURGE phone controller', index: 99, connected: true, mapping: 'standard',
        axes: data.pad.axes, buttons: data.pad.buttons.map(value => ({pressed: value > .5, value}))} : null;
    } catch (_) { pad = null; }
    setTimeout(poll, pad ? 50 : 500);
  }
  if (local) {
    void poll();
    fetch('/api/phone/link').then(r => r.json()).then(data => { link = data; waiting.splice(0).forEach(fn => fn(data)); }).catch(() => {});
  }
  return {pad: () => pad, onLink: fn => { if (link) fn(link); else waiting.push(fn); }};
})();
/* endasset: phone-pad.js */

/* asset: controller-input.js */
window.SurgeGamepad = (() => {
  const observers = [];
  let activeController = null;
  function mount(root, adapter) {
    if (!root) return;
    const $ = id => root.querySelector(`[data-gamepad="${id}"]`);
    if (!$('enable')) return;
    if (!window.isSecureContext || typeof navigator.getGamepads !== 'function') {
      $('enable').disabled = $('calibrate').disabled = true;
      $('status').textContent = 'Gamepad API unavailable; use localhost or HTTPS.';
      return;
    }
    const gen3 = adapter.generation === '3';
    let enabled = false, operator = false, previous = null, device = null;
    let pending = false, starting = false, runId = null, sequence = 0, epoch = 0;
    let state = null, observedAt = 0, centres = [], loadedDevice = null;
    // W3C standard gamepad mapping; only standard-mapped pads are accepted.
    const AXIS = {steer: 0, move: 1, headX: 2, headY: 3};
    const BUTTON = {start: 0, stop: 1, reverse: 2, preset: 3, hold: 4, throttle: 7,
      dpadUp: 12, dpadDown: 13, dpadLeft: 14, dpadRight: 15};
    const fields = ['deadzone', 'sensitivity'];
    const defaults = Object.fromEntries(fields.map(name => [name, $(name).value]));
    const online = () => state !== null && Date.now() - observedAt <= 1500;
    function settings() {
      const result = {};
      for (const name of fields) {
        const el = $(name), value = Number(el.value);
        if (!Number.isFinite(value) || value < Number(el.min) || value > Number(el.max)) throw Error(`Invalid ${name}`);
        result[name] = value;
      }
      return result;
    }
    async function post(url, body) {
      const response = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body), signal: AbortSignal.timeout(1500)});
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Controller request failed');
      return data;
    }
    async function stop() {
      runId = null;
      try { await post('/api/stop', {}); }
      catch (error) { $('status').textContent = `Stop unconfirmed: ${error.message}. Use the physical stop.`; }
    }
    // forceStop sends Stop even when this page owns no run (the Stop button).
    function disable(message, forceStop = false) {
      const owned = forceStop || runId !== null || starting;
      enabled = false; previous = null; device = null; epoch++;
      if (activeController === root) activeController = null;
      $('enable').textContent = 'Enable Controller';
      $('enable').setAttribute('aria-pressed', 'false');
      $('status').textContent = message;
      if (owned) void stop();
    }
    // halt stops any run but leaves the controller enabled; only the operator disables it.
    function halt(message, forceStop = false) {
      const owned = forceStop || runId !== null || starting;
      previous = null; device = null; epoch++;
      $('status').textContent = message;
      if (owned) void stop();
    }
    function padNow() {
      const pads = [...Array.from(navigator.getGamepads()), window.SurgePhonePad?.pad()].filter(p => p && p.connected);
      return device === null ? pads[0] : pads.find(p => `${p.index}:${p.id}` === device);
    }
    function storageKey(pad) { return `surge-controller-v1:${pad.id}`; }
    function save(pad) {
      try {
        localStorage.setItem(storageKey(pad), JSON.stringify({
          values: Object.fromEntries(fields.map(name => [name, $(name).value])), invert: $('invert').checked, centres}));
      } catch (_) { /* Browser storage may be disabled; this session still works. */ }
    }
    function load(pad) {
      if (loadedDevice === pad.id) return;
      centres = [];
      for (const name of fields) $(name).value = defaults[name];
      $('invert').checked = false;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey(pad)) || 'null');
        if (saved) {
          for (const name of fields) if (saved.values?.[name] !== undefined) $(name).value = saved.values[name];
          $('invert').checked = saved.invert === true;
          if (Array.isArray(saved.centres) && saved.centres.every(v => Number.isFinite(v) && Math.abs(v) <= .25)) centres = saved.centres;
        }
      } catch (_) { /* Use the displayed defaults if storage is unavailable. */ }
      loadedDevice = pad.id;
    }
    function read(pad) {
      const s = settings();
      const axis = index => {
        const raw = pad.axes[index];
        if (!Number.isFinite(raw)) throw Error(`Controller axis ${index} unavailable`);
        const value = Math.max(-1, Math.min(1, raw - (centres[index] || 0)));
        return Math.abs(value) <= s.deadzone ? 0 : Math.sign(value) * (Math.abs(value) - s.deadzone) / (1 - s.deadzone);
      };
      const button = index => {
        if (!pad.buttons[index]) throw Error(`Controller button ${index} unavailable`);
        return pad.buttons[index];
      };
      return {
        sequence: ++sequence, captured_at: Date.now() / 1000,
        deadman: Boolean(button(BUTTON.hold).pressed), throttle: Math.max(0, Math.min(1, button(BUTTON.throttle).value || 0)),
        stick_x: axis(AXIS.steer) * s.sensitivity * ($('invert').checked ? -1 : 1),
        stick_y: -axis(AXIS.move) * s.sensitivity, // up is positive; only 3D Motions uses it
        head_x: axis(AXIS.headX), head_y: -axis(AXIS.headY),
        raw_buttons: Object.fromEntries(pad.buttons.map((b, i) => [`btn_${i}`, Number(b.pressed)]))
      };
    }
    function options() {
      const assist = $('assist').value;
      const result = {assist, inspection: $('inspection').checked, steering_sign: Number($('steering-sign').value),
        localization_verified: $('localization').checked};
      if (assist === 'route') result.path = $('path').value.trim() ? JSON.parse($('path').value) : state?.target_path;
      return result;
    }
    observers.push(data => {
      state = data; observedAt = Date.now();
      const busy = gen3 ? state.busy : state.is_running && !state.is_paused;
      if (runId && !busy && (gen3 ? state.run_id : state.controller_run_id) === runId) runId = null;
      const manual = gen3 ? state.controller : state.controller?.manual;
      if (!busy || (adapter.accepts && !adapter.accepts(state))) $('preset').textContent = 'Controller stopped';
      else if (manual?.steering) $('preset').textContent = `3D Motions · heading ${Math.round(manual.steering.heading)}° → ${Math.round(manual.steering.target_heading)}° · head ${Math.round(manual.steering.elevation)}° → ${Math.round(manual.steering.target_elevation)}° · rate ${manual.rate.toFixed(2)}`;
      else if (manual) $('preset').textContent = `Shape ${manual.preset + 1} · yaw ${Math.round(manual.yaw_gain * 100)}% · pitch ${Math.round(manual.pitch_gain * 100)}% · rate ${manual.rate.toFixed(2)} · ${manual.feedback_reason}`;
    });
    window.addEventListener('surge-session', event => {
      const wasOperator = operator;
      operator = Boolean(event.detail.is_current_operator);
      if (!enabled && operator !== wasOperator) $('status').textContent = operator ? 'Operator ready. Enable Controller in this workspace when ready.' : 'Log in as operator to enable the controller.';
      if (!operator && enabled) disable('Operator lease lost; stopped.');
    });
    window.SurgePhonePad?.onLink(info => {
      const el = $('phone');
      if (!el) return;
      el.replaceChildren('Phone controller: ');
      if (!info.lan) el.append('restart the dashboard with --host 0.0.0.0 so phones on this Wi-Fi can connect.');
      else if (!info.urls.length) el.append('no Wi-Fi address found on this laptop.');
      else {
        const a = document.createElement('a');
        a.href = a.textContent = info.urls[0];
        a.target = '_blank';
        el.append('open ', a, ' on a phone on the same Wi-Fi, then Enable Controller here.');
      }
      el.hidden = false;
    });
    $('inspection').disabled = !gen3;
    $('steering-sign').value = gen3 ? '-1' : '1';
    $('enable').onclick = () => {
      if (enabled) return disable('Controller disabled; stopped.');
      if (!operator || !online() || !adapter.visible()) return;
      if (activeController && activeController !== root) {
        $('status').textContent = 'Disable the other workspace controller first.'; return;
      }
      activeController = root;
      enabled = true; previous = null; device = null; epoch++;
      $('enable').textContent = 'Disable Controller'; $('enable').setAttribute('aria-pressed', 'true');
      $('status').textContent = 'Release buttons and throttle, then hold LB and press A.';
    };
    $('calibrate').onclick = () => {
      disable('Controller disabled for stick centring.');
      try {
        const pad = padNow();
        if (!pad || pad.mapping !== 'standard') throw Error('Connect a standard gamepad first');
        if (pad.buttons.some(b => b.pressed) || pad.axes.some(v => !Number.isFinite(v) || Math.abs(v) > .25)) throw Error('Release all sticks, buttons and throttle before centring');
        load(pad); centres = Array.from(pad.axes); save(pad);
        $('status').textContent = 'Stick centres saved. Enable Controller when ready.';
      } catch (error) { $('status').textContent = error.message; }
    };
    root.addEventListener('change', event => {
      if (!event.target.matches('input, select, textarea')) return;
      if (enabled) halt('Controller setup changed; stopped. Hold LB and press A to start again.');
      try { const pad = padNow(); if (pad) save(pad); } catch (_) { /* No controller connected. */ }
    });
    async function tick() {
      $('enable').disabled = !operator || !online();
      if (!enabled) return;
      if (!operator) { disable('Operator lease lost; stopped.'); return; }
      try {
        const pad = padNow();
        if (!pad) {
          if (device !== null) halt('Controller signal lost; robot stopped. Waiting for it to reconnect.');
          else $('status').textContent = 'Connect a controller and press then release a button.';
          return;
        }
        if (pad.mapping !== 'standard') throw Error('Standard button mapping required');
        load(pad); device = `${pad.index}:${pad.id}`;
        const input = read(pad);
        const buttons = pad.buttons.map(b => Boolean(b.pressed));
        if (previous === null) {
          if (!buttons.some(Boolean) && input.throttle < .05) previous = buttons;
          return;
        }
        const edge = index => Boolean(buttons[index] && !previous[index]);
        const startPressed = edge(BUTTON.start), stopPressed = edge(BUTTON.stop);
        input.reverse = edge(BUTTON.reverse); input.preset = edge(BUTTON.preset);
        input.yaw_up = edge(BUTTON.dpadRight); input.yaw_down = edge(BUTTON.dpadLeft);
        input.pitch_up = edge(BUTTON.dpadUp); input.pitch_down = edge(BUTTON.dpadDown);
        previous = buttons;
        if (stopPressed || ((runId || starting) && !input.deadman)) return halt('Stopped. Hold LB and press A to start again.', stopPressed);
        if (pending) return;
        if (startPressed && input.deadman && !runId) {
          if (gen3 ? state.busy : !state.is_paused) throw Error('Stop the current job before starting controller mode');
          pending = starting = true;
          const activeEpoch = epoch;
          const freshInput = () => {
            if (!enabled || epoch !== activeEpoch) throw Error('Controller start cancelled');
            const fresh = read(padNow());
            if (!fresh.deadman) throw Error('Hold LB through the start confirmation');
            return fresh;
          };
          try {
            const result = await adapter.start(options(), freshInput);
            if (!enabled || epoch !== activeEpoch) await stop();
            else runId = result.run_id;
          } catch (error) { await stop(); throw error; }
          finally { pending = starting = false; }
        } else if (runId) {
          pending = true;
          try { await post(gen3 ? '/api/gen3/controller' : '/api/controller', {...input, run_id: runId}); }
          finally { pending = false; }
        }
        if (enabled) $('status').textContent = `Connected: ${pad.id} · ${runId ? 'Hold to run' : 'Ready; hold LB + A to start'}`;
      } catch (error) { pending = starting = false; halt(`Robot stopped: ${error.message}`); }
    }
    const timer = setInterval(tick, 100);
    window.addEventListener('pagehide', () => {
      if (runId || starting) navigator.sendBeacon('/api/stop', new Blob(['{}'], {type: 'application/json'}));
      disable('Controller stopped.'); clearInterval(timer);
    });
    void tick();
  }
  return {mount, observe: data => observers.forEach(observer => observer(data))};
})();
/* endasset: controller-input.js */

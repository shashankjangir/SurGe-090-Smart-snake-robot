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

;
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

;
/* asset: shader-lens-blur.js */
/**
 * Shader Lens Blur - WebGL SDF Lens Blur Background Component
 * Based on Codrops / Cult UI / 21st.dev ShaderLensBlur
 */
(function() {
  'use strict';

  const vertexShaderSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform int u_variation;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform vec3 u_color4;
    uniform float u_opacity;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(rand(i), rand(i + vec2(1.0, 0.0)), f.x),
        mix(rand(i + vec2(0.0, 1.0)), rand(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }

    float sdfShape(vec2 p, int var) {
      if (var == 0) {
        // Square-ish rounded box frame
        vec2 d = abs(p) - vec2(0.38);
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.08;
      } else if (var == 1) {
        // Solid Circle
        return length(p) - 0.42;
      } else if (var == 2) {
        // Ring / Hollow Circle
        return abs(length(p) - 0.35) - 0.08;
      } else {
        // Triangle approximation
        vec2 q = abs(p);
        return max(q.x * 0.866025 + p.y * 0.5, -p.y) - 0.35;
      }
    }

    void main() {
      vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
      vec2 mouse = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
      float distToMouse = length(st - mouse);

      vec2 p = st;
      float n = noise(p * 3.0 + u_time * 0.18);
      p += (mouse - p) * smoothstep(0.85, 0.0, distToMouse) * 0.28 * (n + 0.5);

      float d = sdfShape(p, u_variation);
      float blurAmount = smoothstep(-0.45, 0.45, d + sin(u_time * 0.8 + p.x * 4.0) * 0.06);

      vec3 colA = mix(u_color1, u_color2, clamp(st.x + 0.5, 0.0, 1.0));
      vec3 colB = mix(u_color3, u_color4, clamp(st.y + 0.5, 0.0, 1.0));
      vec3 finalCol = mix(colA, colB, blurAmount);

      float glow = exp(-distToMouse * 2.8);
      finalCol += u_color1 * glow * 0.22;

      gl_FragColor = vec4(finalCol, u_opacity);
    }
  `;

  const PALETTES = {
    slush: ['#D5F981', '#A1BBE7', '#F2BAE2', '#1E1E2E'],
    cyber: ['#38bdf8', '#818cf8', '#c084fc', '#0f172a'],
    ember: ['#ffd731', '#f97316', '#ef4444', '#18181b'],
    mint:  ['#22c55e', '#06b6d4', '#3b82f6', '#022c22']
  };

  const VARIATION_NAMES = ['Square', 'Solid Circle', 'Hollow Circle', 'Triangle'];

  function hexToRgb(hex) {
    let clean = (hex || '#000000').replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const num = parseInt(clean, 16);
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255
    ];
  }

  function initShaderLensBlur() {
    const canvas = document.getElementById('shader-lens-blur-canvas');
    // Compact operator heroes keep the console still; the shader only runs on a full poster hero.
    if (!canvas) return null;

    const heroSection = canvas.closest('.hero-section') || canvas.parentElement;
    if (heroSection?.classList?.contains('hero-compact')) return null;

    const config = {
      variation: 2, // Default to Hollow Circle / Ring
      palette: 'slush',
      color1: PALETTES.slush[0],
      color2: PALETTES.slush[1],
      color3: PALETTES.slush[2],
      color4: PALETTES.slush[3],
      enableHover: true,
      invertMouse: true,
      opacity: 0.82
    };

    function saveConfig() {
      try {
        localStorage.setItem('surge_shader_config', JSON.stringify({
          variation: config.variation,
          palette: config.palette,
          color1: config.color1,
          color2: config.color2,
          color3: config.color3,
          color4: config.color4,
          enableHover: config.enableHover,
          invertMouse: config.invertMouse,
          opacity: config.opacity
        }));
      } catch (e) {}
    }

    // Try WebGL context
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true }) ||
           canvas.getContext('experimental-webgl', { alpha: true, antialias: true });
    } catch (e) {
      console.warn('ShaderLensBlur: WebGL not available, falling back to CSS background');
      return null;
    }

    if (!gl) {
      console.warn('ShaderLensBlur: WebGL context unavailable');
      return null;
    }

    // Shader compiler helper
    function createShader(type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vert = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const frag = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vert || !frag) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    gl.useProgram(program);

    // Quad geometry buffer
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const uMouseLoc      = gl.getUniformLocation(program, 'u_mouse');
    const uTimeLoc       = gl.getUniformLocation(program, 'u_time');
    const uVariationLoc  = gl.getUniformLocation(program, 'u_variation');
    const uColor1Loc     = gl.getUniformLocation(program, 'u_color1');
    const uColor2Loc     = gl.getUniformLocation(program, 'u_color2');
    const uColor3Loc     = gl.getUniformLocation(program, 'u_color3');
    const uColor4Loc     = gl.getUniformLocation(program, 'u_color4');
    const uOpacityLoc    = gl.getUniformLocation(program, 'u_opacity');

    // Pointer coordinates with smooth spring inertia
    const targetMouse  = { x: 0, y: 0 };
    const currentMouse = { x: 0, y: 0 };
    let hasMouseInteracted = false;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = Math.floor((canvas.clientWidth || heroSection.clientWidth || 800) * dpr);
      const displayHeight = Math.floor((canvas.clientHeight || heroSection.clientHeight || 300) * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
        if (!hasMouseInteracted) {
          targetMouse.x = currentMouse.x = displayWidth * 0.5;
          targetMouse.y = currentMouse.y = displayHeight * 0.5;
        }
      }
    }

    if (window.ResizeObserver && heroSection) {
      new ResizeObserver(resize).observe(heroSection);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();

    // Mouse tracking on hero section
    if (heroSection) {
      heroSection.addEventListener('mousemove', (e) => {
        if (!config.enableHover) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        hasMouseInteracted = true;
        const mx = (e.clientX - rect.left) * dpr;
        const my = (rect.height - (e.clientY - rect.top)) * dpr; // WebGL Y is flipped
        targetMouse.x = config.invertMouse ? canvas.width - mx : mx;
        targetMouse.y = config.invertMouse ? canvas.height - my : my;
      });

      heroSection.addEventListener('mouseleave', () => {
        // Gently return to center
        targetMouse.x = canvas.width * 0.5;
        targetMouse.y = canvas.height * 0.5;
      });
    }

    // Animation render loop
    const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
    const caf = typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : clearTimeout;
    let animId = null;
    const startTime = performance.now();

    function render() {
      // Lerp mouse coordinates towards target
      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.08;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.08;

      const elapsed = (performance.now() - startTime) * 0.001;

      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      gl.uniform2f(uMouseLoc, currentMouse.x, currentMouse.y);
      gl.uniform1f(uTimeLoc, elapsed);
      gl.uniform1i(uVariationLoc, config.variation);

      const c1 = hexToRgb(config.color1);
      const c2 = hexToRgb(config.color2);
      const c3 = hexToRgb(config.color3);
      const c4 = hexToRgb(config.color4);

      gl.uniform3f(uColor1Loc, c1[0], c1[1], c1[2]);
      gl.uniform3f(uColor2Loc, c2[0], c2[1], c2[2]);
      gl.uniform3f(uColor3Loc, c3[0], c3[1], c3[2]);
      gl.uniform3f(uColor4Loc, c4[0], c4[1], c4[2]);
      gl.uniform1f(uOpacityLoc, config.opacity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = raf(render);
    }

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (!mediaQuery || !mediaQuery.matches) {
      animId = raf(render);
    }

    // Wire up Popover & Controller UI if present in the DOM
    const pillBtn = document.getElementById('shader-blur-toggle-btn');
    const popover = document.getElementById('shader-blur-popover');
    const pillLabel = document.getElementById('shader-blur-pill-label');
    const closeBtn = document.getElementById('shader-popover-close');

    function updatePillLabel() {
      if (pillLabel) {
        pillLabel.textContent = `Custom: ${VARIATION_NAMES[config.variation] || 'Effects'}`;
      }
    }
    updatePillLabel();

    function setVariation(idx) {
      config.variation = parseInt(idx, 10);
      updatePillLabel();
      saveConfig();
      // Update UI active buttons
      document.querySelectorAll('.shader-variation-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.variation, 10) === config.variation);
      });
    }

    function setPalette(name) {
      const p = PALETTES[name];
      if (!p) return;
      config.palette = name;
      config.color1 = p[0];
      config.color2 = p[1];
      config.color3 = p[2];
      config.color4 = p[3];
      saveConfig();
      document.querySelectorAll('.shader-palette-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.palette === name);
      });
    }

    if (pillBtn && popover) {
      pillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = popover.hasAttribute('hidden');
        if (isHidden) {
          popover.removeAttribute('hidden');
          pillBtn.setAttribute('aria-expanded', 'true');
        } else {
          popover.setAttribute('hidden', '');
          pillBtn.setAttribute('aria-expanded', 'false');
        }
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          popover.setAttribute('hidden', '');
          pillBtn.setAttribute('aria-expanded', 'false');
        });
      }

      document.addEventListener('mousedown', (e) => {
        if (!popover.hasAttribute('hidden') && !popover.contains(e.target) && !pillBtn.contains(e.target)) {
          popover.setAttribute('hidden', '');
          pillBtn.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !popover.hasAttribute('hidden')) {
          popover.setAttribute('hidden', '');
          pillBtn.setAttribute('aria-expanded', 'false');
          pillBtn.focus();
        }
      });
    }

    // Variation buttons
    document.querySelectorAll('.shader-variation-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setVariation(btn.dataset.variation);
      });
    });

    // Palette buttons
    document.querySelectorAll('.shader-palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setPalette(btn.dataset.palette);
      });
    });

    // Hover switch
    const hoverSwitch = document.getElementById('shader-hover-switch');
    if (hoverSwitch) {
      hoverSwitch.checked = config.enableHover;
      hoverSwitch.addEventListener('change', () => {
        config.enableHover = hoverSwitch.checked;
        saveConfig();
      });
    }

    // Invert switch
    const invertSwitch = document.getElementById('shader-invert-switch');
    if (invertSwitch) {
      invertSwitch.checked = config.invertMouse;
      invertSwitch.addEventListener('change', () => {
        config.invertMouse = invertSwitch.checked;
        saveConfig();
      });
    }

    // Opacity slider
    const opacitySlider = document.getElementById('shader-opacity-slider');
    const opacityVal = document.getElementById('shader-opacity-val');
    if (opacitySlider) {
      opacitySlider.value = Math.round(config.opacity * 100);
      opacitySlider.addEventListener('input', () => {
        config.opacity = parseFloat(opacitySlider.value) / 100;
        if (opacityVal) opacityVal.textContent = `${opacitySlider.value}%`;
        saveConfig();
      });
    }

    // Wire up surface fill style (Solid vs Frosted)
    const btnFillSolid = document.getElementById('btn-fill-solid');
    const btnFillFrosted = document.getElementById('btn-fill-frosted');

    function applyFillStyle(mode) {
      const isFrosted = mode === 'frosted';
      document.querySelectorAll('.halo-field').forEach(el => {
        el.classList.toggle('frosted', isFrosted);
      });
      if (btnFillSolid && btnFillFrosted) {
        btnFillSolid.classList.toggle('active', !isFrosted);
        btnFillFrosted.classList.toggle('active', isFrosted);
        btnFillSolid.style.borderColor = !isFrosted ? '#000' : '#cbd5e1';
        btnFillSolid.style.backgroundColor = !isFrosted ? '#ffd731' : '#f8fafc';
        btnFillFrosted.style.borderColor = isFrosted ? '#000' : '#cbd5e1';
        btnFillFrosted.style.backgroundColor = isFrosted ? '#ffd731' : '#f8fafc';
      }
      try { localStorage.setItem('surge_fill_style', mode); } catch (_) {}
    }

    if (btnFillSolid) {
      btnFillSolid.addEventListener('click', () => applyFillStyle('solid'));
    }
    if (btnFillFrosted) {
      btnFillFrosted.addEventListener('click', () => applyFillStyle('frosted'));
    }

    // Wire up beam variant buttons in Custom popover
    document.querySelectorAll('.custom-beam-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const variant = btn.dataset.beamVariant;
        if (variant && window.GridBeam && window.GridBeam.setVariant) {
          window.GridBeam.setVariant(variant);
        }
        document.querySelectorAll('.custom-beam-pill').forEach(b => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.style.borderColor = active ? '#000' : '#cbd5e1';
          b.style.backgroundColor = active ? '#ffd731' : '#fff';
        });
        try { localStorage.setItem('surge_beam_variant', variant); } catch (_) {}
      });
    });

    const btnBeamPlay = document.getElementById('btn-custom-beam-play');
    if (btnBeamPlay) {
      let isPlaying = true;
      btnBeamPlay.addEventListener('click', () => {
        isPlaying = !isPlaying;
        if (window.GridBeam && window.GridBeam.setActive) {
          window.GridBeam.setActive(isPlaying);
        }
        btnBeamPlay.classList.toggle('active', isPlaying);
        btnBeamPlay.textContent = isPlaying ? 'Pause' : 'Play';
        btnBeamPlay.style.borderColor = isPlaying ? '#000' : '#cbd5e1';
        btnBeamPlay.style.backgroundColor = isPlaying ? '#ffd731' : '#fff';
      });
    }

    const btnBeamBreathe = document.getElementById('btn-custom-beam-breathe');
    if (btnBeamBreathe) {
      let isBreathe = true;
      btnBeamBreathe.addEventListener('click', () => {
        isBreathe = !isBreathe;
        if (window.GridBeam && window.GridBeam.setBreathe) {
          window.GridBeam.setBreathe(isBreathe);
        }
        btnBeamBreathe.classList.toggle('active', isBreathe);
        btnBeamBreathe.textContent = isBreathe ? '~ Breathe' : '— Static';
        btnBeamBreathe.style.borderColor = isBreathe ? '#000' : '#cbd5e1';
        btnBeamBreathe.style.backgroundColor = isBreathe ? '#ffd731' : '#fff';
      });
    }

    const publicApi = {
      config,
      setVariation,
      setPalette,
      PALETTES,
      VARIATION_NAMES,
      hexToRgb,
      destroy: () => {
        if (animId) caf(animId);
      }
    };

    window.ShaderLensBlur = publicApi;
    return publicApi;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShaderLensBlur);
  } else {
    initShaderLensBlur();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initShaderLensBlur, hexToRgb, PALETTES, VARIATION_NAMES };
  }
})();
/* endasset: shader-lens-blur.js */

;
/* asset: liquid-grid.js */
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
/* endasset: liquid-grid.js */

;
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

;
/* asset: pixel-snake-heading.js */
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
/* endasset: pixel-snake-heading.js */

;
/* asset: hero-fluid-trail.js */
// Fluid solver adapted from the user-supplied Originkit Fluid Trail.
// The hero snake supplies positions; this effect has no pointer listeners or animation loop.
(function (root) {
  'use strict';
function parseColor(c        )                           {
    if (!c) return [0.4, 0.4, 0.4]
    const m = c.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(",").map((v) => parseFloat(v))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    let h = c.replace("#", "").trim()
    if (h.length === 3)
        h = h
            .split("")
            .map((x) => x + x)
            .join("")
    const r = parseInt(h.slice(0, 2), 16) / 255
    const g = parseInt(h.slice(2, 4), 16) / 255
    const b = parseInt(h.slice(4, 6), 16) / 255
    return [r || 0, g || 0, b || 0]
}

// Fixed simulation constants — no customization.
const SPLAT_FORCE = 6000
// Dye intensity per splat; the display maps intensity to opacity. 0.675 = 1.5 × the original 0.45.
const TRAIL_STRENGTH = 0.675
const PRESSURE_ITERATIONS = 20
const CURL_STRENGTH = 30
const SIM_RESOLUTION = 128
const DYE_RESOLUTION = 512

const VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FS_ADVECT = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_texel;
uniform float u_dt;
uniform float u_dissipation;
uniform float u_outward;
out vec4 outColor;
void main() {
    vec2 coord = v_uv - u_dt * texture(u_velocity, v_uv).xy * u_texel;
    // Fade outside: sample toward centre so dye drifts outward as it fades.
    if (u_outward > 0.0) coord -= (v_uv - vec2(0.5)) * u_outward;
    outColor = u_dissipation * texture(u_source, coord);
}`

const FS_SPLAT = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_target;
uniform vec2 u_point;
uniform vec3 u_color;
uniform float u_radius;
uniform float u_aspect;
uniform float u_radial;
out vec4 outColor;
void main() {
    vec2 p = v_uv - u_point;
    p.x *= u_aspect;
    float falloff = exp(-dot(p, p) / u_radius);
    vec3 splat = falloff * u_color;
    // Radial outward push — fluid at the cursor gets shoved away from
    // centre so existing waves visibly collide with the cursor and spread.
    float plen = length(p);
    vec2 rdir = plen > 0.0001 ? p / plen : vec2(0.0);
    float rmag = length(u_color.xy) * 1.5;
    splat.xy += u_radial * rdir * falloff * rmag;
    vec3 base = texture(u_target, v_uv).xyz;
    outColor = vec4(base + splat, 1.0);
}`

const FS_DIVERGENCE = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
    float L = texture(u_velocity, v_uv - vec2(u_texel.x, 0.0)).x;
    float R = texture(u_velocity, v_uv + vec2(u_texel.x, 0.0)).x;
    float B = texture(u_velocity, v_uv - vec2(0.0, u_texel.y)).y;
    float T = texture(u_velocity, v_uv + vec2(0.0, u_texel.y)).y;
    vec2 C = texture(u_velocity, v_uv).xy;
    if (v_uv.x < u_texel.x) L = -C.x;
    if (v_uv.x > 1.0 - u_texel.x) R = -C.x;
    if (v_uv.y < u_texel.y) B = -C.y;
    if (v_uv.y > 1.0 - u_texel.y) T = -C.y;
    outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`

const FS_CURL = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
    float L = texture(u_velocity, v_uv - vec2(u_texel.x, 0.0)).y;
    float R = texture(u_velocity, v_uv + vec2(u_texel.x, 0.0)).y;
    float B = texture(u_velocity, v_uv - vec2(0.0, u_texel.y)).x;
    float T = texture(u_velocity, v_uv + vec2(0.0, u_texel.y)).x;
    outColor = vec4(R - L - T + B, 0.0, 0.0, 1.0);
}`

const FS_VORTICITY = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_curl;
uniform vec2 u_texel;
uniform float u_curlStrength;
uniform float u_dt;
out vec4 outColor;
void main() {
    float L = texture(u_curl, v_uv - vec2(u_texel.x, 0.0)).x;
    float R = texture(u_curl, v_uv + vec2(u_texel.x, 0.0)).x;
    float B = texture(u_curl, v_uv - vec2(0.0, u_texel.y)).x;
    float T = texture(u_curl, v_uv + vec2(0.0, u_texel.y)).x;
    float C = texture(u_curl, v_uv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(L) - abs(R));
    force /= length(force) + 0.0001;
    force *= u_curlStrength * C;
    force.y *= -1.0;
    vec2 vel = texture(u_velocity, v_uv).xy;
    vel += force * u_dt;
    vel = clamp(vel, -1000.0, 1000.0);
    outColor = vec4(vel, 0.0, 1.0);
}`

const FS_PRESSURE = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
    float L = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
    float R = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
    float B = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
    float T = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
    float d = texture(u_divergence, v_uv).x;
    outColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}`

const FS_GRADIENT_SUB = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
out vec4 outColor;
void main() {
    float L = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
    float R = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
    float B = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
    float T = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
    vec2 v = texture(u_velocity, v_uv).xy;
    v -= 0.5 * vec2(R - L, T - B);
    outColor = vec4(v, 0.0, 1.0);
}`

const FS_DISPLAY = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 outColor;
void main() {
    vec3 c = texture(u_tex, v_uv).rgb;
    // Alpha from dye intensity → empty areas stay transparent (no background).
    float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
    outColor = vec4(c / max(max(c.r, max(c.g, c.b)), 0.0001), a);
}`

const FS_CLEAR = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_value;
out vec4 outColor;
void main() {
    outColor = u_value * texture(u_tex, v_uv);
}`

function compileShader(
    gl                        ,
    type        ,
    src
)                     {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        // eslint-disable-next-line no-console
        console.error(gl.getShaderInfoLog(s))
        gl.deleteShader(s)
        return null
    }
    return s
}

function buildProgram(
    gl                        ,
    vsSrc        ,
    fsSrc
)                      {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) {
        if (vs) gl.deleteShader(vs)
        if (fs) gl.deleteShader(fs)
        return null
    }
    const p = gl.createProgram()
    if (!p) {
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        return null
    }
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        // eslint-disable-next-line no-console
        console.error(gl.getProgramInfoLog(p))
        gl.deleteProgram(p)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        return null
    }
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return p
}

function createFBO(
    gl                        ,
    w        ,
    h        ,
    internalFormat        ,
    format        ,
    type        ,
    filter
) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
    )
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteTexture(tex)
        gl.deleteFramebuffer(fbo)
        throw new Error('Unsupported fluid framebuffer')
    }
    gl._fluidTargets.push({ tex, fbo })
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return {
        tex,
        fbo,
        w,
        h,
        texel: [1 / w, 1 / h]                    ,
        attach(unit        ) {
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            return unit
        },
    }
}

function createDoubleFBO(
    gl                        ,
    w        ,
    h        ,
    internalFormat        ,
    format        ,
    type        ,
    filter
) {
    let read = createFBO(gl, w, h, internalFormat, format, type, filter)
    let write = createFBO(gl, w, h, internalFormat, format, type, filter)
    return {
        get read() {
            return read
        },
        get write() {
            return write
        },
        swap() {
            const t = read
            read = write
            write = t
        },
        w,
        h,
        texel: read.texel,
    }
}


  root.createHeroFluidTrail = function (canvas) {
    const gl = canvas.getContext('webgl2', { alpha: true, depth: false, stencil: false,
      antialias: false, premultipliedAlpha: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
    const linear = gl.getExtension('OES_texture_float_linear');
    gl._fluidTargets = [];
    gl._fluidPrograms = [];
    let quad;
    function releaseTargets() {
      for (const target of gl._fluidTargets) {
        gl.deleteTexture(target.tex);
        gl.deleteFramebuffer(target.fbo);
      }
      gl._fluidTargets.length = 0;
    }
    function destroy() {
      releaseTargets();
      for (const program of gl._fluidPrograms) gl.deleteProgram(program);
      gl._fluidPrograms.length = 0;
      if (quad) gl.deleteBuffer(quad);
    }
    try {
        // Full-screen quad.
        quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        )

        // Programs.
        const pAdvect = buildProgram(gl, VS, FS_ADVECT)
        const pSplat = buildProgram(gl, VS, FS_SPLAT)
        const pDiv = buildProgram(gl, VS, FS_DIVERGENCE)
        const pCurl = buildProgram(gl, VS, FS_CURL)
        const pVort = buildProgram(gl, VS, FS_VORTICITY)
        const pPressure = buildProgram(gl, VS, FS_PRESSURE)
        const pGradSub = buildProgram(gl, VS, FS_GRADIENT_SUB)
        const pDisplay = buildProgram(gl, VS, FS_DISPLAY)
        const pClear = buildProgram(gl, VS, FS_CLEAR)

        const programs = [
            pAdvect,
            pSplat,
            pDiv,
            pCurl,
            pVort,
            pPressure,
            pGradSub,
            pDisplay,
            pClear,
        ]
        gl._fluidPrograms.push(...programs.filter(Boolean))
        if (programs.some(program => !program)) throw new Error('Fluid shader failed')
        // Attach quad attribute once per program.
        for (const p of programs) {
            gl.useProgram(p)
            const loc = gl.getAttribLocation(p, "a_pos")
            if (loc >= 0) {
                gl.enableVertexAttribArray(loc)
                gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
            }
        }

        // FBOs sized to canvas-derived sim/dye res.
        let velocity
        let dye
        let pressure
        let divergence
        let curl

        function getResolution(target        ) {
            const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight)
            return { w: Math.max(1, Math.round(target * Math.min(1, aspect))),
                     h: Math.max(1, Math.round(target / Math.max(1, aspect))) }
        }

        function initFBOs() {
            releaseTargets()
            const sim = getResolution(SIM_RESOLUTION)
            const dyeR = getResolution(DYE_RESOLUTION)
            const ext = gl
            velocity = createDoubleFBO(
                ext,
                sim.w,
                sim.h,
                ext.RG16F,
                ext.RG,
                ext.HALF_FLOAT,
                (linear ? ext.LINEAR : ext.NEAREST)
            )
            dye = createDoubleFBO(
                ext,
                dyeR.w,
                dyeR.h,
                ext.RGBA16F,
                ext.RGBA,
                ext.HALF_FLOAT,
                (linear ? ext.LINEAR : ext.NEAREST)
            )
            pressure = createDoubleFBO(
                ext,
                sim.w,
                sim.h,
                ext.R16F,
                ext.RED,
                ext.HALF_FLOAT,
                ext.NEAREST
            )
            divergence = createFBO(
                ext,
                sim.w,
                sim.h,
                ext.R16F,
                ext.RED,
                ext.HALF_FLOAT,
                ext.NEAREST
            )
            curl = createFBO(
                ext,
                sim.w,
                sim.h,
                ext.R16F,
                ext.RED,
                ext.HALF_FLOAT,
                ext.NEAREST
            )
        }

        function blit(target                                     ) {
            if (target) {
                gl .bindFramebuffer(gl .FRAMEBUFFER, target.fbo)
                gl .viewport(0, 0, target.w, target.h)
            } else {
                gl .bindFramebuffer(gl .FRAMEBUFFER, null)
                gl .viewport(0, 0, canvas.width, canvas.height)
            }
            gl .drawArrays(gl .TRIANGLE_STRIP, 0, 4)
        }

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
            const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
            const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                initFBOs()
            }
        }
        resize()
        if (!velocity) initFBOs()
        let previous = null
        const palette = ['--color-electric-blue', '--color-mint-pop', '--color-lavender']
            .map(token => parseColor(getComputedStyle(canvas).getPropertyValue(token).trim()))

        function splatAt(
            x        ,
            y        ,
            dx        ,
            dy        ,
            color
        ) {
            const aspect = canvas.width / canvas.height
            // Mouse radius slider → gaussian falloff size.
            const mr = 10
            const radius = correctRadius((mr * 0.005) / 100, aspect)

            // Velocity splat.
            gl .useProgram(pSplat)
            gl .uniform1i(
                gl .getUniformLocation(pSplat, "u_target") ,
                velocity.read.attach(0)
            )
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_aspect") , aspect)
            gl .uniform2f(gl .getUniformLocation(pSplat, "u_point") , x, y)
            gl .uniform3f(gl .getUniformLocation(pSplat, "u_color") , dx, dy, 0)
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_radius") , radius)
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_radial") , 1.0)
            blit(velocity.write)
            velocity.swap()

            // Dye splat.
            gl .useProgram(pSplat)
            gl .uniform1i(
                gl .getUniformLocation(pSplat, "u_target") ,
                dye.read.attach(0)
            )
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_aspect") , aspect)
            gl .uniform2f(gl .getUniformLocation(pSplat, "u_point") , x, y)
            gl .uniform3f(
                gl .getUniformLocation(pSplat, "u_color") ,
                color[0],
                color[1],
                color[2]
            )
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_radius") , radius)
            gl .uniform1f(gl .getUniformLocation(pSplat, "u_radial") , 0.0)
            blit(dye.write)
            dye.swap()
        }

        function correctRadius(r        , aspect        ) {
            return aspect > 1 ? r * aspect : r
        }

        function step(dt        ) {
            // Curl + vorticity confinement.
            gl .useProgram(pCurl)
            gl .uniform2f(
                gl .getUniformLocation(pCurl, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pCurl, "u_velocity") ,
                velocity.read.attach(0)
            )
            blit(curl)

            gl .useProgram(pVort)
            gl .uniform2f(
                gl .getUniformLocation(pVort, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pVort, "u_velocity") ,
                velocity.read.attach(0)
            )
            gl .uniform1i(
                gl .getUniformLocation(pVort, "u_curl") ,
                curl.attach(1)
            )
            gl .uniform1f(
                gl .getUniformLocation(pVort, "u_curlStrength") ,
                CURL_STRENGTH
            )
            gl .uniform1f(gl .getUniformLocation(pVort, "u_dt") , dt)
            blit(velocity.write)
            velocity.swap()

            // Divergence.
            gl .useProgram(pDiv)
            gl .uniform2f(
                gl .getUniformLocation(pDiv, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pDiv, "u_velocity") ,
                velocity.read.attach(0)
            )
            blit(divergence)

            // Clear pressure with decay.
            gl .useProgram(pClear)
            gl .uniform1i(
                gl .getUniformLocation(pClear, "u_tex") ,
                pressure.read.attach(0)
            )
            gl .uniform1f(gl .getUniformLocation(pClear, "u_value") , 0.8)
            blit(pressure.write)
            pressure.swap()

            // Jacobi pressure iterations.
            gl .useProgram(pPressure)
            gl .uniform2f(
                gl .getUniformLocation(pPressure, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            const divLoc = gl .getUniformLocation(pPressure, "u_divergence")
            const presLoc = gl .getUniformLocation(pPressure, "u_pressure")
            gl .uniform1i(divLoc, divergence.attach(0))
            const iters = PRESSURE_ITERATIONS
            for (let i = 0; i < iters; i++) {
                gl .uniform1i(presLoc, pressure.read.attach(1))
                blit(pressure.write)
                pressure.swap()
            }

            // Subtract pressure gradient from velocity.
            gl .useProgram(pGradSub)
            gl .uniform2f(
                gl .getUniformLocation(pGradSub, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pGradSub, "u_pressure") ,
                pressure.read.attach(0)
            )
            gl .uniform1i(
                gl .getUniformLocation(pGradSub, "u_velocity") ,
                velocity.read.attach(1)
            )
            blit(velocity.write)
            velocity.swap()

            // Advect velocity.
            gl .useProgram(pAdvect)
            gl .uniform2f(
                gl .getUniformLocation(pAdvect, "u_texel") ,
                velocity.texel[0],
                velocity.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pAdvect, "u_velocity") ,
                velocity.read.attach(0)
            )
            gl .uniform1i(
                gl .getUniformLocation(pAdvect, "u_source") ,
                velocity.read.attach(0)
            )
            gl .uniform1f(gl .getUniformLocation(pAdvect, "u_dt") , dt)
            gl .uniform1f(
                gl .getUniformLocation(pAdvect, "u_dissipation") ,
                1 - 0.2 * dt
            )
            gl .uniform1f(gl .getUniformLocation(pAdvect, "u_outward") , 0)
            blit(velocity.write)
            velocity.swap()

            // Advect dye using velocity field.
            gl .useProgram(pAdvect)
            gl .uniform2f(
                gl .getUniformLocation(pAdvect, "u_texel") ,
                dye.texel[0],
                dye.texel[1]
            )
            gl .uniform1i(
                gl .getUniformLocation(pAdvect, "u_velocity") ,
                velocity.read.attach(0)
            )
            gl .uniform1i(
                gl .getUniformLocation(pAdvect, "u_source") ,
                dye.read.attach(1)
            )
            gl .uniform1f(gl .getUniformLocation(pAdvect, "u_dt") , dt)
            // Trail Duration in seconds → exponential dye fade (~95% gone after
            // `dur` seconds): factor exp(-dyeDiss·t), dyeDiss = 3/dur.
            const dur = 3.5
            const dyeDiss = 3 / dur
            gl .uniform1f(
                gl .getUniformLocation(pAdvect, "u_dissipation") ,
                1 - dyeDiss * dt
            )
            // Fade outside: drift dye outward from centre as it fades.
            const fadeOut = false
            gl .uniform1f(
                gl .getUniformLocation(pAdvect, "u_outward") ,
                fadeOut ? 0.6 * dt : 0
            )
            blit(dye.write)
            dye.swap()
        }

        function render() {
            gl .useProgram(pDisplay)
            gl .uniform1i(
                gl .getUniformLocation(pDisplay, "u_tex") ,
                dye.read.attach(0)
            )
            blit(null)
        }


        return {
            resize,
            clear() {
                previous = null
                initFBOs()
                render()
            },
            advance(tail, width, height, dt, time) {
                if (gl.isContextLost()) return
                resize()
                const x = tail.x / width
                const y = 1 - tail.y / height
                if (previous && Math.hypot(x - previous.x, y - previous.y) < 0.2) {
                    const phase = (time / 4) % palette.length
                    const index = Math.floor(phase)
                    const blend = phase - index
                    const color = palette[index].map((value, channel) =>
                        (value * (1 - blend) + palette[(index + 1) % palette.length][channel] * blend) * TRAIL_STRENGTH)
                    const dx = x - previous.x
                    const dy = y - previous.y
                    if (Math.hypot(dx, dy) > 0.00001) splatAt(x, y, dx * SPLAT_FORCE, dy * SPLAT_FORCE, color)
                }
                previous = { x, y }
                step(Math.min(0.033, Math.max(0.001, dt)))
                render()
            },
            destroy,
        }
    } catch (error) {
        destroy();
        console.warn('Hero fluid trail unavailable:', error.message);
        return null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
/* endasset: hero-fluid-trail.js */

;
/* asset: hero-snake-motion.js */
/**
 * SurGe 090 Hero Snake Motion
 * -------------------------------------------------------------
 * Standalone autonomous serpentine locomotion simulation rendered
 * on a dedicated HTML5 2D canvas strictly constrained within .hero-section.
 *
 * Kinematics specification:
 * - 11 discrete links (1 head, 9 body segments, 1 tail)
 * - 10 articulated revolute joints connecting the links
 * - Joint limits: Hardware constrained to ±70° (±1.2217 rad), matching ST3215 servo limits
 * - Hirose Serpenoid locomotion wave propagation:
 *     theta_i(t) = A * sin(omega * t - i * alpha) + gamma_turn
 * - Organic autonomous wandering with smooth boundary repulsion field
 * - Retina / high-DPI canvas rendering with automatic ResizeObserver
 * - Zero external dependencies; pauses cleanly when tab is hidden
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.heroSnakeMotion = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // Kinematic constants matching SurGe 090 physical robot
  const NUM_SEGMENTS = 11;
  const NUM_JOINTS = 10;
  const MAX_JOINT_LIMIT = 70 * (Math.PI / 180); // ±70° in radians (1.2217 rad)

  // Color palette (SurGe 090 Electric Blue + Ember + Carbon)
  const PALETTE = {
    headFill: '#f97316',        // Slush Ember
    headAccent: '#ea580c',      // Deep Ember
    bodyFill: '#0284c7',        // SurGe Electric Blue
    bodyFillAlt: '#0369a1',     // Alternating segment blue
    bodyStroke: '#0f172a',      // Slate Carbon outline
    jointCore: '#1e293b',       // Servo actuator chassis
    jointPin: '#e2e8f0',        // Titanium pivot pin
    jointAccent: '#38bdf8',     // Cyan telemetry LED
    tailLED: '#22c55e',         // Tail power LED
    headlight: '#38bdf8',       // Optical headlights
    headlightBeam: 'rgba(56, 189, 248, 0.25)',
    shadow: 'rgba(15, 23, 42, 0.12)',
  };

  class HeroSnakeMotion {
    constructor(canvasId = 'hero-snake-canvas', containerSelector = '.hero-section') {
      this.canvasId = canvasId;
      this.containerSelector = containerSelector;
      this.canvas = null;
      this.ctx = null;
      this.container = null;

      // Dimensions & Canvas Scaling
      this.width = 800;
      this.height = 220;
      this.dpr = 1;

      // Simulation parameters
      this.linkLength = 20;     // Segment spacing (pixels)
      this.speed = 82;          // Base forward speed (px/sec)
      this.waveFreq = 1.15;     // Undulation frequency (Hz)
      this.waveNum = 0.52;      // Inter-segment phase lag (rad/link)
      this.waveAmp = 0.38;      // Lateral undulation amplitude (rad ~22°)
      this.padding = 38;        // Boundary margin from edges (px)
      this.turnThreshold = 85;  // Boundary proximity where soft turn triggers (px)

      // Dynamic state
      this.segments = [];       // Array of 11 link positions {x, y, angle}
      this.jointAngles = [];    // Array of 10 relative angles
      this.currentHeading = 0;  // Current head orientation (rad)
      this.targetHeading = 0;   // Target steering orientation (rad)
      this.waveTime = 0;        // Undulation clock (sec)
      this.lastTime = 0;
      this.animId = null;
      this.isRunning = false;
      this.mouseTarget = null;  // Optional gentle cursor tracking {x, y}
      this.fluidTrail = null;
      this.fluidCanvas = null;

      // Event handlers / observers for clean teardown
      this._resizeObserver = null;
      this._visibilityHandler = null;
      this._mouseMoveHandler = null;
      this._mouseLeaveHandler = null;

      this.init();
    }

    init() {
      if (typeof document === 'undefined') return;

      this.canvas = document.getElementById(this.canvasId);
      this.container = document.querySelector(this.containerSelector);

      if (!this.canvas) {
        // Fallback: search for canvas in container
        if (this.container) {
          this.canvas = this.container.querySelector('canvas.hero-snake-canvas');
        }
      }

      // Compact operator heroes keep the console still; the snake only runs on a full poster hero.
      if (!this.canvas || !this.canvas.getContext || (typeof this.canvas.closest === 'function' && this.canvas.closest('.hero-compact'))) {
        this.canvas = null;
        return;
      }

      this.ctx = this.canvas.getContext('2d');
      this.updateDimensions();
      this.resetKinematics();
      if (this.container && typeof window.createHeroFluidTrail === 'function') {
        this.fluidCanvas = document.createElement('canvas');
        this.fluidCanvas.className = 'hero-fluid-canvas';
        this.fluidCanvas.setAttribute('aria-hidden', 'true');
        this.container.insertBefore(this.fluidCanvas, this.canvas);
        this._fluidMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this._fluidMotionHandler = () => {
          if (this.fluidTrail) this.fluidTrail.destroy();
          this.fluidTrail = null;
          this.fluidCanvas.style.display = this._fluidMotionQuery.matches ? 'none' : 'block';
          if (!this._fluidMotionQuery.matches) {
            this.fluidTrail = window.createHeroFluidTrail(this.fluidCanvas);
          }
        };
        this._fluidMotionQuery.addEventListener('change', this._fluidMotionHandler);
        this._fluidMotionHandler();
      }

      // Setup ResizeObserver for responsive boundary adaptation
      if (typeof ResizeObserver !== 'undefined' && this.container) {
        this._resizeObserver = new ResizeObserver(() => {
          this.updateDimensions();
          this.clampAllInsideBounds();
        });
        this._resizeObserver.observe(this.container);
      } else {
        window.addEventListener('resize', () => {
          this.updateDimensions();
          this.clampAllInsideBounds();
        });
      }

      // Pause when the tab is backgrounded or the hero is scrolled out of view, to preserve CPU
      this._onScreen = true;
      this._visibilityHandler = () => {
        if (document.hidden || !this._onScreen) {
          this.stop();
        } else {
          this.start();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
      if (typeof IntersectionObserver !== 'undefined') {
        this._intersectionObserver = new IntersectionObserver(([entry]) => {
          this._onScreen = entry.isIntersecting;
          this._visibilityHandler();
        });
        this._intersectionObserver.observe(this.container || this.canvas);
      }

      // Interaction: Snake follows the cursor ONLY when the cursor is strictly inside the
      // hero section box (.hero-section). Outside this box, it follows its regular autonomous path.
      const container = this.container || this.canvas;
      if (container) {
        this._mouseMoveHandler = (e) => {
          if (!this.canvas) return;
          const box = container.getBoundingClientRect();
          // Check strictly if cursor is inside the hero box
          if (
            e.clientX >= box.left &&
            e.clientX <= box.right &&
            e.clientY >= box.top &&
            e.clientY <= box.bottom
          ) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const rawX = e.clientX - canvasRect.left;
            const rawY = e.clientY - canvasRect.top;
            const targetX = Math.max(this.padding + 10, Math.min(this.width - this.padding - 10, rawX));
            const targetY = Math.max(this.padding + 10, Math.min(this.height - this.padding - 10, rawY));
            this.mouseTarget = { x: targetX, y: targetY };
          } else {
            // Outside the hero box: follow regular autonomous path
            this.mouseTarget = null;
          }
        };

        this._mouseLeaveHandler = () => {
          this.mouseTarget = null;
        };

        this._windowBlurHandler = () => {
          this.mouseTarget = null;
        };

        container.addEventListener('mouseleave', this._mouseLeaveHandler);
        if (typeof document !== 'undefined') {
          document.addEventListener('mousemove', this._mouseMoveHandler);
        }
        if (typeof window !== 'undefined') {
          window.addEventListener('blur', this._windowBlurHandler);
        }
      }

      this.start();
    }

    updateDimensions() {
      if (!this.canvas) return;
      const rect = this.container ? this.container.getBoundingClientRect() : this.canvas.getBoundingClientRect();
      const w = Math.max(280, Math.round(rect.width || this.canvas.clientWidth || 800));
      const h = Math.max(140, Math.round(rect.height || this.canvas.clientHeight || 220));

      this.width = w;
      this.height = h;
      this.dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';

      // Adaptive link length based on container height
      this.linkLength = Math.max(16, Math.min(24, Math.round(h * 0.095)));
      this.padding = Math.max(28, Math.min(48, Math.round(h * 0.16)));
      this.turnThreshold = Math.max(60, Math.min(100, Math.round(h * 0.38)));
      if (this.fluidTrail) this.fluidTrail.clear();
    }

    resetKinematics() {
      this.segments = [];
      this.jointAngles = new Array(NUM_JOINTS).fill(0);

      // Place initial snake centrally with heading pointing rightward (+X)
      const startX = Math.round(this.width * 0.45);
      const startY = Math.round(this.height * 0.5);
      this.currentHeading = 0.15;
      this.targetHeading = 0.15;
      this.waveTime = 0;

      // Initialize all 11 segments
      for (let i = 0; i < NUM_SEGMENTS; i++) {
        this.segments.push({
          x: startX - i * this.linkLength,
          y: startY + Math.sin(i * this.waveNum) * 8,
          angle: 0
        });
      }
    }

    clampAllInsideBounds() {
      const minX = this.padding;
      const maxX = this.width - this.padding;
      const minY = this.padding;
      const maxY = this.height - this.padding;

      for (let i = 0; i < this.segments.length; i++) {
        this.segments[i].x = Math.max(minX, Math.min(maxX, this.segments[i].x));
        this.segments[i].y = Math.max(minY, Math.min(maxY, this.segments[i].y));
      }
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      this.loop = this.loop.bind(this);
      if (typeof requestAnimationFrame !== 'undefined') {
        this.animId = requestAnimationFrame(this.loop);
      }
    }

    stop() {
      this.isRunning = false;
      if (this.animId && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    loop(timestamp) {
      if (!this.isRunning) return;

      const now = (typeof performance !== 'undefined' ? performance.now() : timestamp) / 1000;
      let dt = now - this.lastTime;
      this.lastTime = now;

      // Cap delta time to prevent physics explosions on frame stutter / tab switch
      if (dt > 0.1) dt = 0.033;
      if (dt <= 0) dt = 0.016;

      this.update(dt);
      if (this.fluidTrail) {
        this.fluidTrail.advance(this.segments[NUM_SEGMENTS - 1], this.width, this.height, dt, this.waveTime);
      }
      this.render();

      if (this.isRunning && typeof requestAnimationFrame !== 'undefined') {
        this.animId = requestAnimationFrame(this.loop);
      }
    }

    update(dt) {
      this.waveTime += dt;

      // Check if user prefers reduced motion
      const prefersReduced = typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const speedScale = prefersReduced ? 0.3 : 1.0;

      // 1. Strict Boundary Repulsion Field
      // Ensures the head smoothly turns away from all 4 walls well before touching
      const head = this.segments[0];
      const minX = this.padding;
      const maxX = this.width - this.padding;
      const minY = this.padding;
      const maxY = this.height - this.padding;

      let repulseX = 0;
      let repulseY = 0;

      // Left wall
      if (head.x < minX + this.turnThreshold) {
        const d = Math.max(1, head.x - minX);
        const strength = Math.pow(1 - d / this.turnThreshold, 2);
        repulseX += strength;
      }
      // Right wall
      if (head.x > maxX - this.turnThreshold) {
        const d = Math.max(1, maxX - head.x);
        const strength = Math.pow(1 - d / this.turnThreshold, 2);
        repulseX -= strength;
      }
      // Top wall
      if (head.y < minY + this.turnThreshold) {
        const d = Math.max(1, head.y - minY);
        const strength = Math.pow(1 - d / this.turnThreshold, 2);
        repulseY += strength;
      }
      // Bottom wall
      if (head.y > maxY - this.turnThreshold) {
        const d = Math.max(1, maxY - head.y);
        const strength = Math.pow(1 - d / this.turnThreshold, 2);
        repulseY -= strength;
      }

      const repulseMagnitude = Math.hypot(repulseX, repulseY);

      // 2. Autonomous Random Motion or Active Cursor Following
      if (this.mouseTarget) {
        // Cursor is in dashboard: actively steer towards cursor
        const dx = this.mouseTarget.x - head.x;
        const dy = this.mouseTarget.y - head.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 28) {
          const toMouseAngle = Math.atan2(dy, dx);
          if (repulseMagnitude > 0.08) {
            // Near wall: blend steering inward while pursuing cursor
            const boundaryAvoidAngle = Math.atan2(repulseY, repulseX);
            const blended = this.blendAngle(toMouseAngle, boundaryAvoidAngle, 0.45);
            this.targetHeading = this.blendAngle(this.targetHeading, blended, Math.min(1.0, 5.5 * dt));
          } else {
            this.targetHeading = this.blendAngle(this.targetHeading, toMouseAngle, Math.min(1.0, 6.0 * dt));
          }
        } else {
          // Reached cursor: orbit/circle softly around it
          const orbitAngle = Math.atan2(dy, dx) + Math.PI / 2;
          this.targetHeading = this.blendAngle(this.targetHeading, orbitAngle, Math.min(1.0, 3.5 * dt));
        }
        this.wanderAngle = this.targetHeading;
      } else {
        // Cursor not in dashboard: continuous autonomous random serpentine wandering
        if (this.wanderAngle === undefined) this.wanderAngle = this.currentHeading;
        const wanderNoise = (Math.random() - 0.5) * 2.8 * dt;
        this.wanderAngle += wanderNoise;
        this.targetHeading = this.wanderAngle;

        if (repulseMagnitude > 0.001) {
          const boundaryAvoidAngle = Math.atan2(repulseY, repulseX);
          const blendFactor = Math.min(1.0, repulseMagnitude * 3.5 * dt * 4.0);
          this.targetHeading = this.blendAngle(this.targetHeading, boundaryAvoidAngle, blendFactor);
          this.wanderAngle = this.targetHeading;
        }
      }

      // Smoothly steer current heading towards target heading
      this.currentHeading = this.blendAngle(this.currentHeading, this.targetHeading, Math.min(1.0, 5.0 * dt));

      // 3. Hirose Serpenoid Head Undulation Wave
      const waveOffset = this.waveAmp * Math.sin(2 * Math.PI * this.waveFreq * this.waveTime);
      const effectiveHeadAngle = this.currentHeading + waveOffset;

      // 4. Advance Head
      const v = this.speed * speedScale;
      head.x += Math.cos(effectiveHeadAngle) * v * dt;
      head.y += Math.sin(effectiveHeadAngle) * v * dt;
      head.angle = effectiveHeadAngle;

      // Hard clamp safety to strictly preserve .hero-section containment
      if (head.x < minX) {
        head.x = minX;
        this.targetHeading = 0; // Turn right
      } else if (head.x > maxX) {
        head.x = maxX;
        this.targetHeading = Math.PI; // Turn left
      }
      if (head.y < minY) {
        head.y = minY;
        this.targetHeading = Math.PI / 2; // Turn down
      } else if (head.y > maxY) {
        head.y = maxY;
        this.targetHeading = -Math.PI / 2; // Turn up
      }

      // 5. Follow-the-Leader Kinematics with Hardware Joint Angle Clamp (±70°)
      for (let i = 1; i < NUM_SEGMENTS; i++) {
        const prev = this.segments[i - 1];
        const curr = this.segments[i];

        // Desired vector from current to predecessor
        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        let angleToPrev = Math.atan2(dy, dx);

        // Hardware joint limit constraint relative to predecessor link
        let relAngle = this.normalizeAngle(angleToPrev - prev.angle);
        if (relAngle > MAX_JOINT_LIMIT) {
          relAngle = MAX_JOINT_LIMIT;
          angleToPrev = prev.angle + relAngle;
        } else if (relAngle < -MAX_JOINT_LIMIT) {
          relAngle = -MAX_JOINT_LIMIT;
          angleToPrev = prev.angle + relAngle;
        }

        // Record joint angle for robotics telemetry & testing
        this.jointAngles[i - 1] = relAngle;

        // Enforce rigid link length constraint
        curr.x = prev.x - Math.cos(angleToPrev) * this.linkLength;
        curr.y = prev.y - Math.sin(angleToPrev) * this.linkLength;
        curr.angle = angleToPrev;

        // Keep body segments within boundary
        curr.x = Math.max(minX - 10, Math.min(maxX + 10, curr.x));
        curr.y = Math.max(minY - 10, Math.min(maxY + 10, curr.y));
      }
    }

    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;

      // Clear full canvas
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.width, this.height);

      // Draw soft ambient depth shadows under all 11 segments
      this.renderShadows(ctx);

      // Draw 10 articulated joint pivot chassis/horns
      this.renderJoints(ctx);

      // Draw the 11 robot segment modules (Tail to Head for natural layering)
      for (let i = NUM_SEGMENTS - 1; i >= 0; i--) {
        this.renderSegment(ctx, i);
      }

      ctx.restore();
    }

    renderShadows(ctx) {
      ctx.save();
      ctx.fillStyle = PALETTE.shadow;
      for (let i = 0; i < NUM_SEGMENTS; i++) {
        const seg = this.segments[i];
        const radius = i === 0 ? 11 : (i === NUM_SEGMENTS - 1 ? 7 : 9);
        ctx.beginPath();
        ctx.ellipse(seg.x + 3, seg.y + 7, radius + 2, radius * 0.65, seg.angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    renderJoints(ctx) {
      ctx.save();
      for (let i = 0; i < NUM_JOINTS; i++) {
        const sA = this.segments[i];
        const sB = this.segments[i + 1];
        const midX = (sA.x + sB.x) / 2;
        const midY = (sA.y + sB.y) / 2;

        // Connector link beam
        ctx.beginPath();
        ctx.strokeStyle = PALETTE.jointCore;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        ctx.stroke();

        // High-torque servo actuator pivot disc
        ctx.beginPath();
        ctx.fillStyle = PALETTE.jointCore;
        ctx.arc(midX, midY, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Titanium center pin
        ctx.beginPath();
        ctx.fillStyle = PALETTE.jointPin;
        ctx.arc(midX, midY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    renderSegment(ctx, index) {
      const seg = this.segments[index];
      const isHead = index === 0;
      const isTail = index === NUM_SEGMENTS - 1;

      ctx.save();
      ctx.translate(seg.x, seg.y);
      ctx.rotate(seg.angle);

      if (isHead) {
        // --- Head Segment (SurGe Ember Module with Optical Beams) ---
        // Forward optical headlights glow
        const glowGrad = ctx.createRadialGradient(10, 0, 2, 22, 0, 28);
        glowGrad.addColorStop(0, PALETTE.headlightBeam);
        glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.moveTo(8, -6);
        ctx.lineTo(38, -18);
        ctx.lineTo(38, 18);
        ctx.lineTo(8, 6);
        ctx.closePath();
        ctx.fill();

        // Head Capsule Body
        const headGrad = ctx.createLinearGradient(-10, -11, 10, 11);
        headGrad.addColorStop(0, '#fb923c');
        headGrad.addColorStop(0.5, PALETTE.headFill);
        headGrad.addColorStop(1, PALETTE.headAccent);

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-10, -10, 22, 20, 8) : ctx.rect(-10, -10, 22, 20);
        ctx.fillStyle = headGrad;
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyStroke;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Nose Sensor Cone
        ctx.beginPath();
        ctx.arc(10, 0, 6, -Math.PI / 2, Math.PI / 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // Dual Headlights / Stereo Vision
        ctx.fillStyle = PALETTE.headlight;
        ctx.beginPath();
        ctx.arc(7, -5, 2.2, 0, Math.PI * 2);
        ctx.arc(7, 5, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Head glossy reflection
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.moveTo(-6, -7);
        ctx.lineTo(4, -7);
        ctx.stroke();

      } else if (isTail) {
        // --- Tail Segment (Tapered Hydrodynamic Module with Power LED) ---
        const tailGrad = ctx.createLinearGradient(-8, -7, 8, 7);
        tailGrad.addColorStop(0, PALETTE.bodyFill);
        tailGrad.addColorStop(1, PALETTE.bodyFillAlt);

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-8, -7, 16, 14, [4, 7, 7, 4]) : ctx.rect(-8, -7, 16, 14);
        ctx.fillStyle = tailGrad;
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tail telemetry status LED (Mint green)
        ctx.beginPath();
        ctx.fillStyle = PALETTE.tailLED;
        ctx.arc(-4, 0, 2, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // --- Standard Body Segment (Electric Blue SurGe 090 Link) ---
        const fillCol = (index % 2 === 0) ? PALETTE.bodyFill : PALETTE.bodyFillAlt;
        const segGrad = ctx.createLinearGradient(-9, -8, 9, 8);
        segGrad.addColorStop(0, '#38bdf8');
        segGrad.addColorStop(0.3, fillCol);
        segGrad.addColorStop(1, '#0369a1');

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-9, -8, 18, 16, 6) : ctx.rect(-9, -8, 18, 16);
        ctx.fillStyle = segGrad;
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Link Top Specular Highlight
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.lineWidth = 1;
        ctx.moveTo(-5, -5.5);
        ctx.lineTo(5, -5.5);
        ctx.stroke();

        // Micro-link ID badge (clean indicator dot)
        ctx.beginPath();
        ctx.fillStyle = '#0f172a';
        ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    blendAngle(a, b, t) {
      let diff = this.normalizeAngle(b - a);
      return a + diff * t;
    }

    normalizeAngle(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    }

    // Public API Methods & Diagnostics
    getState() {
      const minX = this.padding;
      const maxX = this.width - this.padding;
      const minY = this.padding;
      const maxY = this.height - this.padding;

      const allInside = this.segments.every(s =>
        s.x >= minX - 15 && s.x <= maxX + 15 && s.y >= minY - 15 && s.y <= maxY + 15
      );

      return {
        numSegments: this.segments.length,
        numJoints: this.jointAngles.length,
        maxJointLimit: MAX_JOINT_LIMIT,
        isRunning: this.isRunning,
        width: this.width,
        height: this.height,
        headPosition: this.segments[0] ? { x: this.segments[0].x, y: this.segments[0].y } : null,
        tailPosition: this.segments[NUM_SEGMENTS - 1] ? { x: this.segments[NUM_SEGMENTS - 1].x, y: this.segments[NUM_SEGMENTS - 1].y } : null,
        allSegmentsInsideBounds: allInside,
        jointAngles: [...this.jointAngles],
      };
    }

    setSpeed(newSpeed) {
      this.speed = Math.max(20, Math.min(200, Number(newSpeed) || 82));
    }

    destroy() {
      this.stop();
      if (this._fluidMotionQuery) {
        this._fluidMotionQuery.removeEventListener('change', this._fluidMotionHandler);
      }
      if (this.fluidTrail) this.fluidTrail.destroy();
      if (this.fluidCanvas) this.fluidCanvas.remove();
      this.fluidTrail = null;
      this.fluidCanvas = null;
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
      }
      if (this._intersectionObserver) {
        this._intersectionObserver.disconnect();
        this._intersectionObserver = null;
      }
      if (this._visibilityHandler) {
        document.removeEventListener('visibilitychange', this._visibilityHandler);
        this._visibilityHandler = null;
      }
      if (typeof document !== 'undefined') {
        if (this._mouseMoveHandler) document.removeEventListener('mousemove', this._mouseMoveHandler);
        if (this._mouseLeaveHandler) document.removeEventListener('mouseleave', this._mouseLeaveHandler);
      }
      if (typeof window !== 'undefined' && this._windowBlurHandler) {
        window.removeEventListener('blur', this._windowBlurHandler);
      }
      if (this.container) {
        if (this._mouseMoveHandler) this.container.removeEventListener('mousemove', this._mouseMoveHandler);
        if (this._mouseLeaveHandler) this.container.removeEventListener('mouseleave', this._mouseLeaveHandler);
      }
      if (this.canvas && this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
    }
  }

  // Factory initializer
  function initHeroSnakeMotion(canvasId, containerSelector) {
    return new HeroSnakeMotion(canvasId, containerSelector);
  }

  // Auto-boot on DOM ready if canvas exists
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.heroSnakeMotionInstance = initHeroSnakeMotion();
      });
    } else {
      window.heroSnakeMotionInstance = initHeroSnakeMotion();
    }
  }

  return {
    HeroSnakeMotion,
    initHeroSnakeMotion,
    NUM_SEGMENTS,
    NUM_JOINTS,
    MAX_JOINT_LIMIT,
  };
});
/* endasset: hero-snake-motion.js */

;
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

;
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

;
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

;
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

;
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

;
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
    const AXIS = {steer: 0, headX: 2, headY: 3};
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
        stick_x: axis(AXIS.steer) * s.sensitivity * ($('invert').checked ? -1 : 1), stick_y: 0,
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
      disable('Controller setup changed; stopped. Enable it again when ready.');
      try { const pad = padNow(); if (pad) save(pad); } catch (_) { /* No controller connected. */ }
    });
    async function tick() {
      $('enable').disabled = !operator || !online();
      if (!enabled) return;
      if (!operator || !online() || document.hidden || !document.hasFocus() || !adapter.visible()) {
        disable('Controller paused; stopped. Return to this workspace and enable again.'); return;
      }
      try {
        const pad = padNow();
        if (!pad) {
          if (device !== null) disable('Controller disconnected; stopped.');
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
        if (stopPressed || ((runId || starting) && !input.deadman)) return disable('Controller stopped. Enable again to restart.', stopPressed);
        if (pending) return;
        if (startPressed && input.deadman && !runId) {
          if (gen3 ? state.busy : !state.is_paused) throw Error('Stop the current job before starting controller mode');
          pending = starting = true;
          const activeEpoch = epoch;
          const freshInput = () => {
            if (!enabled || epoch !== activeEpoch || !document.hasFocus()) throw Error('Controller start cancelled');
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
      } catch (error) { pending = starting = false; disable(`Controller stopped: ${error.message}`); }
    }
    const timer = setInterval(tick, 100);
    window.addEventListener('blur', () => { if (enabled) disable('Focus lost; controller stopped.'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && enabled) disable('Page hidden; controller stopped.'); });
    window.addEventListener('pagehide', () => {
      if (runId || starting) navigator.sendBeacon('/api/stop', new Blob(['{}'], {type: 'application/json'}));
      disable('Controller stopped.'); clearInterval(timer);
    });
    void tick();
  }
  return {mount, observe: data => observers.forEach(observer => observer(data))};
})();
/* endasset: controller-input.js */

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
    if (!canvas) return null;

    const heroSection = canvas.closest('.hero-section') || canvas.parentElement;

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
        btnBeamPlay.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
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

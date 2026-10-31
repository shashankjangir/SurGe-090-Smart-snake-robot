/* A normal document navigation owns each dashboard and its polling lifecycle. */
(() => {
  'use strict';
  const KEY = 'surge-generation-transition';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;
  let readiness = 'pending';
  let libraries;
  let incoming;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
    if (saved && ['/', '/gen3'].includes(saved.to) && ['/', '/gen3'].includes(saved.from) &&
        saved.to === location.pathname && Date.now() - saved.at < 15000 && Date.now() >= saved.at) incoming = saved;
  } catch (_) { /* Storage restrictions retain ordinary navigation. */ }
  if (incoming) document.documentElement.classList.add('generation-entering');

  function loadLibraries() {
    return libraries ||= Promise.all([
      ['gsap', '/static/vendor/gsap-3.15.0.min.js'],
      ['THREE', '/static/vendor/three-r128.min.js']
    ].map(([name, src]) => window[name] ? Promise.resolve() : new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    })));
  }

  window.SurgeGenerationTransition = {
    ready() { readiness = 'ready'; active?.settle(); },
    fail() { readiness = 'failed'; active?.fail(); }
  };

  function start(record, destination) {
    if (active) return;
    const stage = document.createElement('dialog');
    stage.className = 'generation-stage';
    stage.setAttribute('aria-labelledby', 'generation-status');
    stage.innerHTML = `<div class="generation-studio" aria-hidden="true"><div class="generation-fallback">
      <svg viewBox="0 0 540 140" fill="none"><path d="M30 85C120 10 170 140 270 70S420 25 510 65" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-dasharray="23 23"/></svg>
      </div></div><div class="generation-caption"><span class="generation-dot" aria-hidden="true"></span>
      <p id="generation-status" role="status">SWITCHING TO ${record.to === '/gen3' ? 'GEN 3' : 'GEN 2.1'}</p></div>
      <div class="generation-recovery" hidden><p>The dashboard could not finish loading.</p><div>
      <a href="${record.from}">Go back</a><button type="button">Reload dashboard</button></div></div>`;
    document.body.append(stage);
    stage.showModal();
    document.documentElement.classList.remove('generation-entering');
    const studio = stage.querySelector('.generation-studio');
    let timeline, scene, fallbackTimer, disposed = false, atGate = false, failed = false;
    const timeout = setTimeout(() => destination && readiness === 'ready' ? cleanup(true) : fail(), 10000);
    const motion = { time: 0 };
    function cleanup(focus = false) {
      if (disposed) return;
      disposed = true;
      clearTimeout(timeout);
      clearTimeout(fallbackTimer);
      timeline?.kill();
      scene?.dispose();
      reduced.removeEventListener('change', reduceMotion);
      stage.close();
      stage.remove();
      document.documentElement.classList.remove('generation-entering');
      active = null;
      if (focus) document.querySelector('.generation-switch a[aria-current="page"]')?.focus({ preventScroll: true });
    }
    function fail() {
      if (disposed || failed) return;
      failed = true;
      clearTimeout(timeout);
      if (!destination) window.stop();
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      timeline?.kill();
      scene?.dispose();
      scene = null;
      clearTimeout(fallbackTimer);
      stage.style.opacity = '1';
      stage.style.clipPath = 'none';
      stage.classList.add('generation-failed');
      stage.querySelector('#generation-status').textContent = 'SWITCH PAUSED';
      stage.querySelector('.generation-recovery').hidden = false;
      stage.querySelector('button').focus();
    }
    function settle() {
      if (disposed || failed || !destination || !atGate || readiness !== 'ready') return;
      if (timeline && !reduced.matches) timeline.play();
      else cleanup(true);
    }
    function gate() {
      atGate = true;
      settle();
    }
    function reduceMotion() {
      if (!reduced.matches || failed) return;
      timeline?.kill();
      timeline = null;
      scene?.dispose();
      scene = null;
      stage.style.opacity = '1';
      stage.style.clipPath = 'none';
      gate();
    }
    active = { cleanup, settle, fail };
    reduced.addEventListener('change', reduceMotion);
    stage.addEventListener('cancel', event => { event.preventDefault(); location.assign(record.from); });
    const retry = stage.querySelector('button');
    if (!destination) retry.textContent = 'Try again';
    retry.onclick = () => {
      if (destination) { location.reload(); return; }
      cleanup();
      record.at = Date.now();
      try { sessionStorage.setItem(KEY, JSON.stringify(record)); } catch (_) {}
      start(record, false);
      location.assign(record.to);
    };
    if (destination && readiness === 'failed') { fail(); return; }
    if (reduced.matches) { gate(); return; }
    // Library/WebGL failure still has a bounded, accessible static transition.
    fallbackTimer = setTimeout(gate, 3000);
    loadLibraries().then(() => {
      if (disposed || failed || reduced.matches || atGate) return;
      try { scene = createScene(studio, record.from === '/gen3'); } catch (_) { scene = null; }
      clearTimeout(fallbackTimer);
      timeline = gsap.timeline({ id: 'generation-switch', paused: true, defaults: { ease: 'power2.inOut' }, onComplete: () => cleanup(true) });
      timeline.fromTo(stage, { opacity: destination ? 1 : 0 }, { opacity: 1, duration: 0.4 }, 0);
      timeline.to(motion, { time: 2.4, duration: 2.4, ease: 'none', onUpdate: () => scene?.render(motion.time) }, 0);
      timeline.addPause(2.4, gate);
      timeline.to(motion, { time: 3, duration: 0.6, ease: 'none', onUpdate: () => scene?.render(motion.time) }, 2.4);
      timeline.to(stage, { clipPath: 'inset(0% 0% 0% 100% round 100px)', duration: 0.6, ease: 'power3.inOut' }, 2.4);
      timeline.play(0);
      // Resume the same approach across navigation, without skipping the readiness gate.
      const elapsed = Math.min(2.35, Math.max(0, (Date.now() - record.at) / 1000));
      timeline.seek(elapsed, false);
    }).catch(() => { /* The static fallback and deadline remain active. */ });
  }

  function createScene(host, spatial) {
    const T = window.THREE;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true }) || canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!context) return null;
    const renderer = new T.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    host.append(canvas);
    host.classList.add('has-webgl');
    const world = new T.Scene();
    const camera = new T.PerspectiveCamera(42, 1, 0.01, 30);
    camera.position.set(0.13, 0.32, 0.9);
    camera.lookAt(0, 0.015, -0.6);
    world.add(new T.HemisphereLight(0xffffff, 0xa6bdd3, 0.8));
    const key = new T.DirectionalLight(0xffffff, 1.4);
    key.position.set(-1.5, 3, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 10 });
    key.shadow.bias = -0.0002;
    key.shadow.radius = 4;
    world.add(key);
    const fill = new T.DirectionalLight(0xe9ccff, 0.5);
    fill.position.set(2, 1, -2);
    world.add(fill);
    const floor = new T.Mesh(new T.PlaneGeometry(30, 30), new T.ShadowMaterial({ opacity: 0.16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    world.add(floor);
    const grid = new T.GridHelper(16, 100, 0x9bc7e8, 0x9bc7e8);
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    grid.position.y = -0.001;
    world.add(grid);
    const material = color => new T.MeshStandardMaterial({ color: new T.Color(color).convertSRGBToLinear(), roughness: 0.38, metalness: 0.06 });
    const blue = material(0x4da2ff), mint = material(0x55db9c), orange = material(0xfb4903);
    const housing = material(0x334456), metal = material(0xe9eef5);
    // shortcut: illustrative viewer proportions, replace with measured assembly CAD when available.
    const profile = new T.Shape();
    profile.moveTo(-0.0185, -0.0185);
    profile.lineTo(0.0185, -0.0185);
    profile.lineTo(0.0185, 0.0185);
    profile.lineTo(-0.0185, 0.0185);
    profile.closePath();
    const shell = new T.ExtrudeGeometry(profile, { depth: 0.067, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 3, steps: 1 });
    shell.center();
    const servo = new T.BoxGeometry(0.034, 0.034, 0.041);
    const pin = new T.CylinderGeometry(0.012, 0.012, 0.052, 20);
    const rail = new T.BoxGeometry(0.005, 0.012, 0.057);
    const robot = new T.Group();
    world.add(robot);
    const joints = [];
    let parent = robot;
    const mesh = (geometry, mat, owner, x = 0, y = 0, z = 0) => {
      const part = new T.Mesh(geometry, mat);
      part.position.set(x, y, z);
      part.castShadow = true;
      part.receiveShadow = true;
      owner.add(part);
      return part;
    };
    for (let i = 0; i < 11; i++) {
      const link = new T.Group();
      link.name = `generation-link-${i}`;
      parent.add(link);
      mesh(shell, i === 0 ? orange : spatial && i % 2 ? mint : blue, link, 0, 0, -0.0375);
      if (i < 10) {
        const hinge = new T.Group();
        hinge.name = `generation-joint-${i + 1}`;
        hinge.position.z = -0.09;
        link.add(hinge);
        mesh(servo, housing, hinge);
        const axle = mesh(pin, metal, hinge);
        if (spatial && i % 2 === 0) axle.rotation.z = Math.PI / 2;
        mesh(rail, metal, link, -0.026, 0, -0.07);
        mesh(rail, metal, link, 0.026, 0, -0.07);
        joints.push(hinge);
        parent = hinge;
      }
    }
    let lastTime = 0;
    const bounds = new T.Box3();
    function resize() {
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
      camera.fov = camera.aspect < 0.8 ? 58 : 42;
      camera.updateProjectionMatrix();
      render(lastTime);
    }
    function render(time) {
      lastTime = time;
      const approach = Math.max(0, (time - 0.4) / 2.6);
      robot.visible = time >= 0.4;
      robot.position.set(0.05 * Math.sin(time * 3) + Math.max(0, time - 2) * 0.18, 0.065, -1.8 + 3.4 * Math.pow(approach, 1.4));
      robot.rotation.y = 0.12 * Math.sin(time * 2.5);
      joints.forEach((joint, i) => {
        const wave = Math.sin(time * 5 - i * 0.65);
        joint.rotation.x = spatial && i % 2 === 0 ? wave * 0.09 : 0;
        joint.rotation.y = !spatial || i % 2 === 1 ? wave * 0.32 : 0;
      });
      bounds.setFromObject(robot);
      robot.position.y += 0.003 - bounds.min.y;
      renderer.render(world, camera);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let disposed = false;
    function dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      const resources = new Set([blue, mint, orange, housing, metal, shell, servo, pin, rail]);
      world.traverse(object => {
        if (object.geometry) resources.add(object.geometry);
        if (object.material) resources.add(object.material);
      });
      resources.forEach(resource => resource.dispose());
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      host.classList.remove('has-webgl');
    }
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); dispose(); }, { once: true });
    return { render: time => { if (!disposed) render(time); }, dispose };
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (incoming) start(incoming, true);
    document.addEventListener('click', event => {
      const link = event.target.closest('.generation-switch a');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
      if (active) { event.preventDefault(); return; }
      const url = new URL(link.href);
      if (url.origin !== location.origin || !['/', '/gen3'].includes(url.pathname) || url.pathname === location.pathname) return;
      event.preventDefault();
      const record = { from: location.pathname, to: url.pathname, at: Date.now() };
      try { sessionStorage.setItem(KEY, JSON.stringify(record)); } catch (_) { location.assign(url.href); return; }
      start(record, false);
      location.assign(url.href);
    });
  });
  window.addEventListener('pagehide', () => active?.cleanup());
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      active?.cleanup();
      document.documentElement.classList.remove('generation-entering');
      try { sessionStorage.removeItem(KEY); } catch (_) {}
    }
  });
})();

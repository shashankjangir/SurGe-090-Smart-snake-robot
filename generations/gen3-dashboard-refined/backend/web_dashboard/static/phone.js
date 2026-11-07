/* SURGE phone controller.
 * Sends a standard-gamepad snapshot (4 axes, 17 buttons) to the laptop every 50 ms.
 * The laptop dashboard treats it as a gamepad, so LB + A start, hold-to-run, the 0.5 s
 * input expiry and the hardware confirmation all stay on the laptop side.
 * HOLD pad = LB (dead-man) and its slide = RT (throttle); letting go stops. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const LB = 4, RT = 7, MIN_PRESS_MS = 250;  // the laptop samples every 100 ms; short taps must still be seen
  const axes = [0, 0, 0, 0];
  const held = new Array(17).fill(false);
  const pressedUntil = new Array(17).fill(0);
  const client = crypto.getRandomValues(new Uint32Array(2)).join('-');
  let key = new URLSearchParams(location.search).get('key') || '';
  let throttle = 0, sequence = 0, inFlight = false;

  try {
    if (key) localStorage.setItem('surge-phone-key', key);
    else key = localStorage.getItem('surge-phone-key') || '';
  } catch (_) { /* Storage may be blocked; the link key still works for this visit. */ }

  const timeout = ms => (AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);
  const capture = (el, id) => { try { el.setPointerCapture(id); } catch (_) { /* Pointer already gone. */ } };
  const buzz = () => { try { navigator.vibrate?.(12); } catch (_) { /* No haptics. */ } };

  function buttons() {
    const now = performance.now();
    return held.map((down, i) => {
      if (i === RT) return held[LB] ? Math.round(throttle * 1000) / 1000 : 0;
      return down || now < pressedUntil[i] ? 1 : 0;
    });
  }

  function payload() {
    return JSON.stringify({key, client, sequence: ++sequence,
      axes: axes.map(v => Math.round(v * 1000) / 1000), buttons: buttons()});
  }

  const LINK_TEXT = {
    connecting: 'Connecting…',
    linked: 'Laptop linked',
    waiting: 'Open the dashboard on the laptop',
    offline: 'No connection to laptop',
    key: 'Pairing key needed',
  };
  function setLink(state, message) {
    const chip = $('link');
    chip.dataset.state = state;
    chip.textContent = message || LINK_TEXT[state];
    $('key-form').hidden = state !== 'key';
  }

  async function send() {
    if (!key) { setLink('key'); return; }
    if (inFlight) return;
    inFlight = true;
    try {
      const response = await fetch('/api/phone/input', {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: payload(), cache: 'no-store', signal: timeout(400)});
      const data = await response.json().catch(() => ({}));
      if (response.status === 403) setLink('key');
      else if (!response.ok) setLink('error', data.error || 'Input rejected');
      else setLink(data.laptop_listening ? 'linked' : 'waiting');
    } catch (_) {
      setLink('offline');
    } finally {
      inFlight = false;
    }
  }

  function stopNow() {
    // A direct stop, independent of the laptop relaying B.
    fetch('/api/stop', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}', keepalive: true}).catch(() => {});
  }

  function releaseAll() {
    held.fill(false);
    pressedUntil.fill(0);
    axes.fill(0);
    throttle = 0;
    document.querySelectorAll('.is-pressed, .is-active, .is-held').forEach(el => el.classList.remove('is-pressed', 'is-active', 'is-held'));
    document.querySelectorAll('.knob').forEach(knob => { knob.style.transform = ''; });
    renderHold();
    if (key) navigator.sendBeacon?.('/api/phone/input', new Blob([payload()], {type: 'application/json'}));
  }

  // Buttons
  document.querySelectorAll('[data-button]').forEach(el => {
    const index = Number(el.dataset.button);
    const pointers = new Set();
    el.addEventListener('pointerdown', event => {
      event.preventDefault();
      capture(el, event.pointerId);
      pointers.add(event.pointerId);
      held[index] = true;
      pressedUntil[index] = performance.now() + MIN_PRESS_MS;
      el.classList.add('is-pressed');
      buzz();
      if (el.id === 'stop') stopNow();
      void send();
    });
    const up = event => {
      pointers.delete(event.pointerId);
      if (pointers.size) return;
      held[index] = false;
      el.classList.remove('is-pressed');
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(type, up);
  });

  // Sticks: left = axes 0/1 (steer), right = axes 2/3 (head inspection)
  function bindStick(el, ix, iy) {
    const knob = el.querySelector('.knob');
    let id = null, cx = 0, cy = 0, radius = 1;
    function move(event) {
      if (event.pointerId !== id) return;
      let dx = (event.clientX - cx) / radius, dy = (event.clientY - cy) / radius;
      const length = Math.hypot(dx, dy);
      if (length > 1) { dx /= length; dy /= length; }
      axes[ix] = dx; axes[iy] = dy;
      knob.style.transform = `translate(${dx * radius}px, ${dy * radius}px)`;
    }
    el.addEventListener('pointerdown', event => {
      if (id !== null) return;
      event.preventDefault();
      id = event.pointerId;
      capture(el, id);
      const box = el.getBoundingClientRect();
      cx = box.left + box.width / 2; cy = box.top + box.height / 2;
      radius = Math.max(1, (box.width - knob.offsetWidth) / 2);
      el.classList.add('is-active');
      move(event);
    });
    el.addEventListener('pointermove', move);
    const end = event => {
      if (event.pointerId !== id) return;
      id = null;
      axes[ix] = axes[iy] = 0;
      knob.style.transform = '';
      el.classList.remove('is-active');
      void send();
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(type, end);
  }
  bindStick($('steer'), 0, 1);
  bindStick($('head'), 2, 3);

  // HOLD pad: touching holds LB; sliding up from the first touch raises RT.
  const hold = $('hold');
  let holdId = null, startY = 0;
  function renderHold() {
    const percent = Math.round((held[LB] ? throttle : 0) * 100);
    $('hold-fill').style.height = `${percent}%`;
    $('hold-value').textContent = held[LB] ? `Speed ${percent}%` : 'to run';
    hold.setAttribute('aria-valuenow', String(percent));
    hold.classList.toggle('is-held', held[LB]);
  }
  hold.addEventListener('pointerdown', event => {
    if (holdId !== null) return;
    event.preventDefault();
    holdId = event.pointerId;
    capture(hold, holdId);
    startY = event.clientY;
    held[LB] = true;
    throttle = 0;
    buzz();
    renderHold();
    void send();
  });
  hold.addEventListener('pointermove', event => {
    if (event.pointerId !== holdId) return;
    throttle = Math.max(0, Math.min(1, (startY - event.clientY) / (hold.clientHeight * .8)));
    renderHold();
  });
  const releaseHold = event => {
    if (event.pointerId !== holdId) return;
    holdId = null;
    held[LB] = false;
    throttle = 0;
    renderHold();
    void send();
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) hold.addEventListener(type, releaseHold);

  document.addEventListener('contextmenu', event => event.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  window.addEventListener('pagehide', releaseAll);

  $('key-form').addEventListener('submit', event => {
    event.preventDefault();
    key = $('key-input').value.trim();
    try { localStorage.setItem('surge-phone-key', key); } catch (_) { /* Not remembered. */ }
    history.replaceState(null, '', `?key=${encodeURIComponent(key)}`);
    setLink('connecting');
  });

  $('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen();
        await screen.orientation?.lock?.('landscape');
      }
    } catch (_) { /* Some phones refuse full screen or orientation lock. */ }
  });

  // Robot status from the dashboard server
  async function status() {
    try {
      const response = await fetch('/api/gen3/status', {cache: 'no-store', signal: timeout(1500)});
      const state = await response.json();
      const mode = {hardware: 'Robot running', simulation: 'Simulation running', preview: 'Dry run'}[state.execution] || 'Running';
      $('run-state').textContent = state.busy ? mode : 'Stopped';
      $('run-state').dataset.busy = String(Boolean(state.busy));
      const c = state.controller;
      $('run-detail').textContent = state.busy && c
        ? `Shape ${c.preset + 1} · yaw ${Math.round(c.yaw_gain * 100)}% · pitch ${Math.round(c.pitch_gain * 100)}% · rate ${c.rate.toFixed(2)}${c.reversed ? ' · reversed' : ''}`
        : (state.status || 'Idle');
    } catch (_) {
      $('run-detail').textContent = 'Status unavailable';
    }
    setTimeout(status, 500);
  }

  renderHold();
  setInterval(send, 50);
  void send();
  void status();
})();

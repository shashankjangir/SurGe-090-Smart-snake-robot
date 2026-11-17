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
    function save(pad) {
      try {
        BrowserPreferences.saveController(pad.id, {
          values: Object.fromEntries(fields.map(name => [name, $(name).value])), invert: $('invert').checked, centres});
      } catch (_) { /* Browser storage may be disabled; this session still works. */ }
    }
    function load(pad) {
      if (loadedDevice === pad.id) return;
      centres = [];
      for (const name of fields) $(name).value = defaults[name];
      $('invert').checked = false;
      try {
        const saved = BrowserPreferences.readController(pad.id);
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
      if ($('enable').dataset) $('enable').dataset.operatorRequired = String(!operator);
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

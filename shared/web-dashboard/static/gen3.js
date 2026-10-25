'use strict';
const $ = id => document.getElementById(id);
let config;
let pending = false;

function showError(error) {
  $('error').textContent = error ? String(error.message || error) : '';
  $('error').hidden = !error;
}

async function api(path, body) {
  const response = await fetch('/api/gen3/' + path, body === undefined ? {} : {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function number(id) { return Number($(id).value); }

async function action(callback) {
  if (pending) return;
  pending = true;
  showError(null);
  document.querySelectorAll('.job').forEach(button => button.disabled = true);
  try { await callback(); }
  catch (error) { showError(error); }
  finally { pending = false; await poll(); }
}

function cell(row, value, className) {
  const td = document.createElement('td');
  td.textContent = value;
  if (className) td.className = className;
  row.append(td);
  return td;
}

function renderMap() {
  $('joint-map').replaceChildren();
  config.joints.forEach((joint, index) => {
    const row = document.createElement('tr');
    cell(row, index + 1);
    for (const key of ['id', 'axis', 'sign', 'zero', 'min', 'max']) {
      const input = document.createElement(key === 'axis' || key === 'sign' ? 'select' : 'input');
      input.dataset.field = key;
      input.setAttribute('aria-label', `Physical joint ${index + 1} ${key}`);
      if (input.tagName === 'SELECT') {
        for (const value of key === 'axis' ? ['yaw', 'pitch'] : [1, -1]) input.add(new Option(value, value));
      } else {
        input.type = 'number'; input.step = '1'; input.required = true;
        input.min = key === 'id' ? 1 : 1252; input.max = key === 'id' ? 10 : 2844;
      }
      input.value = joint[key];
      cell(row, '').append(input);
    }
    $('joint-map').append(row);
  });
  $('speed').value = config.speed;
  $('tracking-error').value = config.tracking_error;
  $('tracking-timeout').value = config.tracking_timeout;
  $('calibrated').checked = config.calibrated;
  $('calibration-state').textContent = config.calibrated ? 'Saved map: calibrated. Hardware trials are permitted after feedback checks.' : 'Saved map: NOT calibrated. Hardware gait trials are blocked. Read and jog remain available.';
}

async function ports() {
  const previous = $('port').value;
  const data = await api('ports');
  $('port').replaceChildren(new Option('Select a serial port', ''));
  for (const port of data.ports) $('port').add(new Option(`${port.device} · ${port.description}`, port.device));
  if (data.ports.some(port => port.device === previous)) $('port').value = previous;
}

async function poll() {
  try {
    const state = await api('status');
    $('status').textContent = state.status;
    $('stage').textContent = state.execution ? `${state.execution} / ${state.stage}` : '';
    $('log').hidden = !state.log || state.busy;
    if (state.log) $('log').href = '/api/gen3/log/' + encodeURIComponent(state.log);
    document.querySelectorAll('.job').forEach(button => button.disabled = state.busy || pending);
    $('telemetry').replaceChildren();
    for (let id = 1; id <= 10; id++) {
      const row = document.createElement('tr');
      const data = state.telemetry[id];
      cell(row, id);
      cell(row, !data ? 'Not sampled' : data.valid ? 'Valid' : 'Missing / invalid', data && !data.valid ? 'missing' : '');
      for (const field of ['position', 'target', 'velocity', 'load']) cell(row, data?.valid ? (data[field] ?? '—') : '—');
      $('telemetry').append(row);
    }
  } catch (error) { showError(new Error('Dashboard connection lost. Finite jobs may still be running; check the server and keep power disconnection accessible. ' + error.message)); }
}

$('refresh').onclick = () => action(ports);
$('read').onclick = () => action(() => api('start', {mode: 'read', execution: 'hardware', port: $('port').value}));
$('stop').onclick = async () => {
  try { await api('stop', {}); await poll(); }
  catch (error) { showError(error); }
};
$('jog-form').onsubmit = event => {
  event.preventDefault();
  action(() => api('start', {mode: 'jog', execution: 'hardware', port: $('port').value,
    id: number('motor'), ticks: number('ticks'), duration: number('jog-duration')}));
};
$('map-form').addEventListener('input', event => {
  if (event.target.id !== 'calibrated') $('calibrated').checked = false;
});
$('map-form').onsubmit = event => {
  event.preventDefault();
  action(async () => {
    const joints = [...$('joint-map').rows].map(row => Object.fromEntries([...row.querySelectorAll('[data-field]')].map(input =>
      [input.dataset.field, input.dataset.field === 'axis' ? input.value : Number(input.value)])));
    const updated = {...config, joints, calibrated: $('calibrated').checked, speed: number('speed'),
      tracking_error: number('tracking-error'), tracking_timeout: number('tracking-timeout')};
    await api('map', updated);
    config = await api('map'); renderMap();
    $('status').textContent = 'Calibration saved; previous map backed up';
  });
};
$('gait-form').onsubmit = event => {
  event.preventDefault();
  action(() => api('start', {mode: 'gait', execution: $('execution').value, port: $('port').value,
    ...Object.fromEntries(['yaw', 'pitch', 'bias', 'frequency', 'lag', 'offset', 'duration'].map(key => [key, number(key)]))}));
};

(async () => {
  try { config = await api('map'); renderMap(); await ports(); await poll(); }
  catch (error) { showError(error); }
  async function update() { await poll(); setTimeout(update, 500); }
  setTimeout(update, 500);
})();

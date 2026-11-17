'use strict';

// Centering Maintenance Form
$('center-form').onsubmit = e => {
  e.preventDefault();
  if (!$('confirm-free-shaft').checked) {
    showError(new Error('You must check the confirmation that the output horn is mechanically free.'));
    return;
  }
  action(async () => {
    await api('center', {
      id: number('center-id'),
      free_shaft: true,
      port: $('port').value
    });
  });
};

// Jog Form
$('jog-form').onsubmit = e => {
  e.preventDefault();
  action(async () => {
    await api('start', {
      mode: 'jog',
      execution: 'hardware',
      port: $('port').value,
      id: number('jog-id'),
      ticks: number('jog-ticks'),
      duration: number('jog-duration')
    });
  });
};

// Quick Diagnostics
$('read-all').onclick = () => action(() => api('start', { mode: 'read', execution: 'hardware', port: $('port').value }));
$('align-all').onclick = () => action(() => api('start', { mode: 'align', execution: 'hardware', port: $('port').value, speed: 100 }));
$('run-diagnostics').onclick = () => action(async () => {
  const data = await api('diagnostics', { port: $('port').value });
  renderDiagnostics(data);
});

let metricsRefreshAt = 0;
let metricsRefreshInFlight = false;
let metricsRefreshDelay = 3000;

async function refreshHardwareMetrics(state) {
  if (document.hidden || !currentIsOperator || pendingAction || state.busy || state.firmware?.is_busy ||
      $('tab-operate').getAttribute('aria-selected') !== 'true' || !$('port').value ||
      metricsRefreshInFlight || Date.now() - metricsRefreshAt < metricsRefreshDelay) return;
  metricsRefreshInFlight = true;
  metricsRefreshAt = Date.now();
  try {
    await api('metrics', {port: $('port').value});
    metricsRefreshDelay = 3000;
    $('bus-refresh-status').textContent = 'Automatic refresh · every 3 s while stopped';
  } catch (err) {
    metricsRefreshDelay = 15000;
    $('bus-refresh-status').textContent = `Automatic refresh failed: ${err.message}`;
  } finally {
    metricsRefreshAt = Date.now();
    metricsRefreshInFlight = false;
  }
}

// Motion uses its existing feedback; idle sampling also refreshes voltage and temperature.
function renderBusMetrics(data, state) {
  const bus = state?.bus;
  const idle = bus?.kind === 'idle';
  const live = Boolean(bus) && Number.isFinite(state.server_time) && state.server_time - bus.at < (idle ? 6 : 2);
  const feedback = Object.values(state?.telemetry || {}).filter(t => t.valid && Number.isFinite(t.position));
  const errors = feedback.filter(t => Number.isFinite(t.target)).map(t => Math.abs(t.target - t.position) * 360 / 4096);
  $('grid-metric-latency').textContent = live ? `${bus.latency_ms.toFixed(0)} ms` : 'Unavailable';
  $('grid-metric-rate').textContent = live && bus.interval_s > 0 ? `${(1 / bus.interval_s).toFixed(1)} Hz` : 'Unavailable';
  $('grid-metric-sync').textContent = live && errors.length ? `±${Math.max(...errors).toFixed(1)}°`
    : live && idle ? 'Idle · torque off' : 'Unavailable';
  const servos = Object.values(data?.servos || {});
  const voltages = servos.map(s => s.voltage).filter(v => Number.isFinite(v) && v > 0);
  const temperatures = servos.map(s => s.temperature).filter(t => Number.isFinite(t) && t >= 0);
  $('grid-metric-voltage').textContent = voltages.length ? `${(Math.min(...voltages) / 10).toFixed(1)} V` : 'Unavailable';
  $('grid-metric-temp').textContent = temperatures.length ? `${Math.max(...temperatures)} °C` : 'Unavailable';
  $('grid-metric-servos').textContent = live ? `${feedback.length} / ${JOINT_COUNT}`
    : data ? `${servos.filter(s => Number.isFinite(s.reg8) && s.reg8 >= 0).length} / ${JOINT_COUNT}` : 'Unavailable';
  const age = data ? `${Math.max(0, Math.floor(Date.now() / 1000 - data.timestamp))}s old` : '';
  $('bus-metrics-status').textContent = live
    ? `Bus Metrics · ${idle ? 'Auto refresh' : 'Live'} · ${bus.port}${data ? ` · voltage/temp snapshot ${age}` : ''}`
    : data ? `Bus Metrics · Snapshot · ${data.port} · ${age}`
    : 'Bus Metrics · Query disarmed diagnostics to sample';
}

function renderDiagnostics(data) {
  if (!data || !data.servos) return;
  renderBusMetrics(data);
  const tbody = $('diag-table-body');
  tbody.replaceChildren();
  let minVoltage = Infinity;
  let maxTemp = 0;
  let activeCount = 0;

  for (let id = 1; id <= JOINT_COUNT; id++) {
    const s = data.servos[id] || {};
    if (s.voltage && s.voltage > 0) {
      const v = s.voltage / 10;
      if (v < minVoltage) minVoltage = v;
    }
    if (s.temperature && s.temperature > maxTemp) {
      maxTemp = s.temperature;
    }
    if (Number.isFinite(s.reg8) && s.reg8 >= 0) {
      activeCount++;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${id}</strong></td>
      <td>${s.reg8 ?? '—'}</td>
      <td>${s.torque === 1 ? 'Enabled' : s.torque === 0 ? 'Disabled (0)' : 'Error'}</td>
      <td>${s.voltage ? `${(s.voltage / 10).toFixed(1)} V (${s.voltage})` : '—'}</td>
      <td>${s.temperature ? `${s.temperature} °C` : '—'}</td>
      <td>${s.status === 0 ? '<span class="text-success">0 (Normal)</span>' : `<span class="text-danger">${s.status}</span>`}</td>
    `;
    tbody.append(tr);
  }

  if (typeof updateRollingNumber === 'function') {
    if ($('diag-voltage-val')) {
      updateRollingNumber($('diag-voltage-val'), Number.isFinite(minVoltage) ? minVoltage : 0, { precision: 1 });
    }
    if ($('diag-temp-val')) {
      updateRollingNumber($('diag-temp-val'), maxTemp, { precision: 0 });
    }
    if ($('diag-active-val')) {
      updateRollingNumber($('diag-active-val'), activeCount, { precision: 0 });
    }
  }

  $('diag-results').hidden = false;
}

function hardwareExecution() {
  return $('hardware-dry-run').checked ? 'preview' : 'hardware';
}

/* asset: gen3.js */
'use strict';

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COUNTS_PER_RADIAN = 4096 / (2 * Math.PI);

document.addEventListener('change', event => {
  if (event.target.matches('select') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    event.target.animate([{ backgroundColor: '#dbeafe' }, { backgroundColor: '#f8fafc' }], { duration: 320, easing: 'ease-out' });
  }
});

let session = null;
let currentConfig = null;
let mapRevision = null;
let presets = [];
let selectedPresetName = null;
let pendingAction = false;
let appliedSettings = null;
let currentRunId = null;
let statusOnline = false;

// Helper for showing user-facing error messages
function showError(error) {
  const el = $('error');
  if (error) {
    el.textContent = String(error.message || error);
    el.hidden = false;
  } else {
    el.textContent = '';
    el.hidden = true;
  }
}

// Session-aware API fetch.
async function api(path, body, method = 'POST') {
  if (method === 'POST' && (path === 'start' || path === 'center')) {
    body = { ...body, request_id: body?.request_id || crypto.randomUUID() };
  }
  if (path === 'start' && body?.execution === 'hardware' && !body.port) throw new Error('Select the transmitter port before starting hardware.');
  const headers = {};
  if (session && session.session_id) {
    headers['X-Session-ID'] = session.session_id;
  }
  const options = { method, headers };
  if (body !== undefined && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch('/api/gen3/' + path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function formatUnit(val, unit) {
  if (val === null || val === undefined || val === 'N/A' || !Number.isFinite(Number(val))) return 'N/A';
  return `${val}${unit}`;
}

function number(id) {
  return Number($(id).value);
}

async function action(callback) {
  if (pendingAction || !statusOnline) return;
  pendingAction = true;
  showError(null);
  document.querySelectorAll('.job').forEach(btn => btn.disabled = true);
  try {
    await callback();
  } catch (err) {
    showError(err);
  } finally {
    pendingAction = false;
    await poll();
  }
}

// Tab navigation
let tabNavAnimated = null;
let modeTogglesAnimated = null;
window.addEventListener('resize', () => {
  for (const pill of document.querySelectorAll('.animated-bg-pill')) pill.style.transition = 'none';
  tabNavAnimated?.sync();
  modeTogglesAnimated?.sync();
  requestAnimationFrame(() => {
    for (const pill of document.querySelectorAll('.animated-bg-pill')) pill.style.transition = '';
  });
});

function initAnimatedBackground(container, options = {}) {
  if (!container) return null;
  const {
    pillClass = 'animated-bg-pill',
    itemSelector = ':scope > *',
    enableHover = true,
    trackActive = false,
    activeSelector = '.active'
  } = options;

  container.classList.add('animated-bg-container');
  let pill = container.querySelector(`:scope > .${pillClass}`);
  if (!pill) {
    pill = document.createElement('div');
    pill.className = pillClass;
    container.prepend(pill);
  }

  function updateItems() {
    container.querySelectorAll(itemSelector).forEach(el => {
      if (el !== pill) {
        el.style.position = 'relative';
        el.style.zIndex = '1';
      }
    });
  }
  updateItems();

  function moveTo(target) {
    if (!target) {
      pill.style.opacity = '0';
      pill.style.display = 'none';
      return;
    }
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const left = tRect.left - cRect.left;
    const top = tRect.top - cRect.top;
    pill.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    pill.style.width = `${tRect.width}px`;
    pill.style.height = `${tRect.height}px`;
    pill.style.display = 'block';
    pill.style.opacity = '1';
  }

  function sync() {
    if (trackActive) {
      const active = container.querySelector(itemSelector + activeSelector);
      if (active) {
        moveTo(active);
        return;
      }
    }
    pill.style.opacity = '0';
    pill.style.display = 'none';
  }

  if (enableHover) {
    container.addEventListener('mouseover', e => {
      const item = e.target.closest(itemSelector);
      if (item && item.parentElement === container && item !== pill) {
        moveTo(item);
      }
    });
    container.addEventListener('mouseleave', () => {
      sync();
    });
  }

  sync();
  return { moveTo, sync, updateItems };
}

const consoleTabs = Array.from(document.querySelectorAll('.tab-btn'));
function selectTab(index, focus = true) {
  consoleTabs.forEach((tab, i) => {
    const isTarget = i === index;
    tab.tabIndex = isTarget ? 0 : -1;
    tab.setAttribute('aria-selected', String(isTarget));
    if (tab.classList) {
      if (isTarget) tab.classList.add('active');
      else tab.classList.remove('active');
    }
    const panelId = tab.getAttribute('aria-controls');
    if ($(panelId) && $(panelId).classList) {
      if (isTarget) $(panelId).classList.add('active');
      else $(panelId).classList.remove('active');
    }
  });
  if (consoleTabs[index]) {
    const panelId = consoleTabs[index].getAttribute('aria-controls');
    if (panelId === 'panel-runs') loadRuns().catch(showError);
    if (panelId === 'panel-firmware') pollFirmwareLog().catch(showError);
    if (window.location) window.location.hash = panelId;
    if (focus && typeof consoleTabs[index].focus === 'function') consoleTabs[index].focus();
  }
  if (tabNavAnimated) tabNavAnimated.sync();
}

consoleTabs.forEach((btn, index) => {
  btn.onclick = () => {
    selectTab(index, false);
  };
  btn.addEventListener('keydown', (e) => {
    let targetIndex = null;
    if (e.key === 'ArrowRight') {
      targetIndex = (index + 1) % consoleTabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (index - 1 + consoleTabs.length) % consoleTabs.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = consoleTabs.length - 1;
    }
    if (targetIndex !== null) {
      e.preventDefault();
      selectTab(targetIndex, true);
    }
  });
});

function syncHashTab() {
  if (window.location.hash) {
    const tabBtn = document.querySelector(`[aria-controls="${window.location.hash.slice(1)}"]`);
    if (tabBtn) tabBtn.click();
  }
}
window.addEventListener('hashchange', syncHashTab);

// Dynamic speed demand calculation
function updateSpeedDemand() {
  const yawDeg = number('yaw');
  const pitchDeg = number('pitch');
  const biasDeg = number('bias');
  const freq = number('frequency');
  const ramp = Math.max(0.5, number('ramp'));
  const speedLimit = number('speed');

  const yawRad = (yawDeg * Math.PI) / 180;
  const pitchRad = (pitchDeg * Math.PI) / 180;
  const biasRad = (biasDeg * Math.PI) / 180;
  const maxAmp = Math.max(yawRad, pitchRad);

  const demand = COUNTS_PER_RADIAN * (2 * Math.PI * freq * maxAmp + (Math.PI / (2 * ramp)) * (maxAmp + Math.abs(biasRad)));
  const degPerSec = (speedLimit * 360) / 4096;
  $('speed-deg-equiv').textContent = `~${degPerSec.toFixed(1)} °/s`;

  const el = $('demand-readout');
  const exceeds = demand > speedLimit;
  if ($('demand-value') && typeof updateRollingNumber === 'function') {
    updateRollingNumber($('demand-value'), demand, { precision: 1 });
  }
  const badge = $('demand-limit-badge');
  if (badge) {
    badge.className = `badge ${exceeds ? 'badge-danger' : 'badge-success'}`;
    badge.textContent = exceeds ? 'EXCEEDS LIMIT' : 'OK';
  }
  if (el) {
    el.innerHTML = exceeds
      ? '<span class="text-danger">Exceeds run speed limit. Lower amplitude or raise speed.</span>'
      : '<span class="text-success">Within hardware speed envelope</span>';
  }

  checkDraftDifferences();
}

['yaw', 'pitch', 'bias', 'frequency', 'lag', 'offset', 'speed', 'ramp', 'duration'].forEach(id => {
  $(id).addEventListener('input', updateSpeedDemand);
});
$('direction').addEventListener('change', updateSpeedDemand);

// Gait mode selector buttons
$('btn-mode-yaw').onclick = () => {
  $('pitch').value = 0;
  $('btn-mode-yaw').classList.add('active');
  $('btn-mode-pitch').classList.remove('active');
  $('btn-mode-combined').classList.remove('active');
  if (modeTogglesAnimated) modeTogglesAnimated.sync();
  updateSpeedDemand();
};
$('btn-mode-pitch').onclick = () => {
  $('yaw').value = 0;
  $('bias').value = 0;
  $('btn-mode-pitch').classList.add('active');
  $('btn-mode-yaw').classList.remove('active');
  $('btn-mode-combined').classList.remove('active');
  if (modeTogglesAnimated) modeTogglesAnimated.sync();
  updateSpeedDemand();
};
$('btn-mode-combined').onclick = () => {
  if (number('yaw') === 0) $('yaw').value = 5;
  if (number('pitch') === 0) $('pitch').value = 5;
  $('btn-mode-combined').classList.add('active');
  $('btn-mode-yaw').classList.remove('active');
  $('btn-mode-pitch').classList.remove('active');
  if (modeTogglesAnimated) modeTogglesAnimated.sync();
  updateSpeedDemand();
};

function getDraftSettings() {
  const dir = Number($('direction').value);
  return {
    yaw: number('yaw'),
    pitch: number('pitch'),
    bias: number('bias'),
    frequency: number('frequency') * dir,
    lag: number('lag'),
    offset: number('offset'),
    speed: number('speed'),
    ramp: number('ramp'),
    duration: number('duration')
  };
}

function checkDraftDifferences() {
  if (!appliedSettings || !currentRunId) {
    $('btn-apply').disabled = true;
    $('btn-apply').textContent = 'Apply Live Tuning (0 changes)';
    return;
  }
  const draft = getDraftSettings();
  let diffCount = 0;
  ['yaw', 'pitch', 'bias', 'frequency', 'lag', 'offset', 'speed'].forEach(k => {
    let appVal = appliedSettings[k];
    if (Math.abs(Number(draft[k]) - Number(appVal)) > 0.001) {
      diffCount++;
    }
  });

  const btn = $('btn-apply');
  if (btn) {
    btn.disabled = !statusOnline || !currentIsOperator || diffCount === 0 || pendingAction;
    btn.textContent = `Apply Live Tuning (${diffCount} changes)`;
    if (!currentIsOperator) {
      btn.title = 'Operator mode required';
      btn.setAttribute('aria-disabled', 'true');
    }
  }
}


// Factor Metadata and Clear Safety Warnings
const PARAMETER_METADATA = {
  speed: {
    label: 'Run Speed of Counts',
    unit: 'counts/s',
    warning: 'Alters maximum joint servo angular velocity in encoder counts/sec. Increasing speed causes faster, more aggressive joint motion, higher kinetic inertia, higher instantaneous current draw from the power rail/LiPo battery, and increased mechanical stress on 3D-printed linkages. Decreasing speed slows motion and reduces peak demand.'
  },
  'cal-speed': {
    label: 'Default Map Speed of Counts',
    unit: 'counts/s',
    warning: 'Alters the baseline speed of counts used across all default motion runs, alignment cycles, and tests. Increasing this changes the nominal operating speed for all servos on this robot.'
  },
  yaw: {
    label: 'Yaw Amplitude',
    unit: '°',
    warning: 'Alters horizontal bending amplitude across odd/even joints. Larger angles produce tighter body curves and greater lateral ground shear, but increase mechanical stress, collision risk, and proximity to joint limits.'
  },
  pitch: {
    label: 'Pitch Amplitude',
    unit: '°',
    warning: 'Alters vertical undulation amplitude. Higher pitch lifts body segments higher, altering ground contact points, weight distribution, friction dynamics, and normal forces.'
  },
  bias: {
    label: 'Yaw Steering Bias',
    unit: '°',
    warning: 'Injects a constant angular offset into yaw joints, causing the snake robot to continuously turn or steer along a curved trajectory rather than traveling straight.'
  },
  frequency: {
    label: 'Wave Frequency',
    unit: 'Hz',
    warning: 'Alters wave cycles per second. Higher frequency drives faster undulations and drastically increases required joint velocity; verify that peak demand does not exceed the hardware speed envelope.'
  },
  lag: {
    label: 'Inter-segment Phase Lag',
    unit: '°',
    warning: 'Alters spatial wavelength spacing between consecutive joints along the body. Directly changes serpentine wave geometry, number of waves on the body, and propulsion efficiency.'
  },
  offset: {
    label: 'Pitch-to-Yaw Wave Offset',
    unit: '°',
    warning: 'Alters 3D phase relationship between pitch and yaw waves (90° produces helical sidewinding or rolling; 0° produces planar lateral undulation).'
  },
  direction: {
    label: 'Wave Direction',
    unit: '',
    warning: 'Reverses wave propagation direction, switching locomotion between forward (+1) and reverse (-1).'
  },
  ramp: {
    label: 'Envelope Ramp Duration',
    unit: 's',
    warning: 'Changes smooth cosine acceleration/deceleration time between straight neutral and full wave amplitude.'
  },
  duration: {
    label: 'Run Duration',
    unit: 's',
    warning: 'Sets total bounded runtime before automatic deceleration and torque release.'
  },
  'tracking-error': {
    label: 'Tracking Error Threshold',
    unit: 'counts',
    warning: 'Alters the encoder deviation threshold. If a motor lags its target by more than this count tolerance, an emergency tracking stop will trigger.'
  },
  'tracking-timeout': {
    label: 'Tracking Timeout',
    unit: 's',
    warning: 'Alters how long a joint position lag may persist before the safety watchdog cuts motor torque.'
  },
  calibrated: {
    label: 'Calibrated Flag',
    unit: '',
    warning: 'Marks the robot calibration state. Unchecking indicates unverified mechanical configuration; checking declares verified joint centering and limits.'
  }
};

function confirmParameterChanges(changes, actionTitle = 'Confirm Factor Update') {
  return new Promise((resolve) => {
    if (!currentIsOperator) {
      showError(new Error('Operator mode required. Please claim an operator lease to modify factors.'));
      resolve(false);
      return;
    }
    if (!changes || changes.length === 0) {
      resolve(true);
      return;
    }

    const modal = $('factor-confirm-modal');
    const titleEl = $('factor-confirm-title');
    const opEl = $('factor-confirm-operator');
    const listEl = $('factor-confirm-list');
    const btnProceed = $('factor-confirm-proceed');
    const btnCancel = $('factor-confirm-cancel');
    const btnClose = $('factor-confirm-close');

    if (!modal || !listEl) {
      const summary = changes.map(c => `${c.label || c.key}: ${c.oldVal} -> ${c.newVal}\nWARNING: ${c.warning || ''}`).join('\n\n');
      const ok = window.confirm(`${actionTitle}\n\nOperator: ${session?.name || 'Active'}\n\n${summary}\n\nProceed with update?`);
      resolve(ok);
      return;
    }

    titleEl.textContent = actionTitle;
    opEl.textContent = `Operator: ${session?.name || lastKnownOperator || 'Authenticated'} · Verified Lease`;
    listEl.replaceChildren();

    // Compact review: one row per change (from → to) and a single combined warning line.
    const table = document.createElement('table');
    table.className = 'factor-confirm-table';
    table.innerHTML = '<thead><tr><th scope="col">Setting</th><th scope="col">From</th><th scope="col">To</th></tr></thead>';
    const body = document.createElement('tbody');
    changes.forEach(c => {
      const unit = c.unit ? ` ${c.unit}` : '';
      const row = document.createElement('tr');
      if (c.warning) row.title = c.warning;
      row.innerHTML = `<th scope="row">${escapeHTML(c.label || c.key)}</th><td>${escapeHTML(String(c.oldVal))}${unit}</td><td><strong>${escapeHTML(String(c.newVal))}${unit}</strong></td>`;
      body.appendChild(row);
    });
    table.appendChild(body);
    const warning = document.createElement('p');
    warning.className = 'factor-confirm-warning';
    const motorDynamics = changes.some(c => c.key === 'speed' || c.key === 'cal-speed');
    warning.textContent = (motorDynamics ? 'Speed changes motor dynamics. ' : '') +
      'Check clearance, cable slack and a clear workspace before confirming.';
    listEl.append(table, warning);

    modal.style.display = 'flex';

    function cleanup(result) {
      modal.style.display = 'none';
      btnProceed.removeEventListener('click', onProceed);
      btnCancel.removeEventListener('click', onCancel);
      btnClose.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeyDown);
      resolve(result);
    }

    function onProceed() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onKeyDown(e) {
      if (e.key === 'Escape') cleanup(false);
    }

    btnProceed.addEventListener('click', onProceed);
    btnCancel.addEventListener('click', onCancel);
    btnClose.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
  });
}
window.confirmParameterChanges = confirmParameterChanges;
window.PARAMETER_METADATA = PARAMETER_METADATA;

// Live apply button click with confirmation & parameter warnings
const btnApply = $('btn-apply');
if (btnApply) {
  btnApply.onclick = () => {
  if (!currentIsOperator) {
    showError(new Error('Operator mode required to apply live tuning.'));
    return;
  }
  const draft = getDraftSettings();
  const changes = [];
  ['yaw', 'pitch', 'bias', 'frequency', 'lag', 'offset', 'speed'].forEach(k => {
    let appVal = appliedSettings ? appliedSettings[k] : undefined;
    if (appVal !== undefined && Math.abs(Number(draft[k]) - Number(appVal)) > 0.001) {
      const meta = PARAMETER_METADATA[k] || { label: k, unit: '', warning: '' };
      changes.push({
        key: k,
        label: meta.label,
        unit: meta.unit,
        oldVal: appVal,
        newVal: draft[k],
        warning: meta.warning
      });
    }
  });

  if (changes.length === 0) return;

  action(async () => {
    const confirmed = await confirmParameterChanges(changes, 'Confirm Live Parameter Update');
    if (!confirmed) return;

    const state = await api('status', undefined, 'GET');
    if (state.execution === 'simulation') throw Error('Use the Simulation workspace for simulation settings.');
    const res = await api('apply', {
      settings: draft,
      expected_revision: state.settings_revision,
      run_id: currentRunId,
      request_id: crypto.randomUUID()
    });
    $('pending-readout').textContent = `Pending: Revision ${res.revision} transitioning (${res.transition_duration}s)…`;
    $('pending-readout').hidden = false;
  });
  };
}

// Two modes: Viewer and Operator
let currentIsOperator = false;
let lastKnownOperator = undefined;

function setViewerMode(isViewer) {
  const mutatingButtons = [
    $('start'),
    $('btn-start'),
    $('btn-gen3-sim-start'),
    $('btn-apply'),
    $('jog-forward'),
    $('jog-reverse'),
    $('center'),
    $('read-all'),
    $('btn-pose-capture'),
    $('btn-pose-save'),
    $('btn-pose-recalibrate'),
    $('align-all'),
    $('btn-save-map'),
    $('run-diagnostics'),
    $('btn-save-preset'),
    $('btn-build-fw'),
    $('btn-upload-fw')
  ].filter(Boolean);

  document.querySelectorAll('.btn-del, .btn-save-ann').forEach(b => {
    b.disabled = isViewer || !statusOnline || pendingAction;
    mutatingButtons.push(b);
  });

  for (const btn of mutatingButtons) {
    if (isViewer) {
      btn.disabled = true;
      btn.dataset.operatorRequired = 'true';
      btn.setAttribute('aria-disabled', 'true');
      btn.title = 'Log in as Operator to start';
    } else {
      btn.dataset.operatorRequired = 'false';
      btn.removeAttribute('aria-disabled');
      if (btn.title === 'Log in as Operator to start' || btn.title === 'Operator mode required') {
        btn.title = '';
      }
    }
  }

  $('btn-save-preset').disabled = isViewer || !statusOnline || pendingAction;
  $('btn-pose-save').disabled = isViewer || !statusOnline || pendingAction || !capturedPose;
  document.querySelectorAll('.motion-permission-hint').forEach(hint => {
    hint.hidden = !isViewer;
  });
}

async function initSession() {
  const data = await api('session', undefined, 'GET');
  if (data.current_user) {
    session = data.current_user;
  }
  updateOperatorUI(data);
}

function updateOperatorUI(data) {
  currentIsOperator = Boolean(data.is_current_operator);

  if (data.current_user) session = data.current_user;

  setViewerMode(!currentIsOperator);
  if (typeof checkDraftDifferences === 'function') checkDraftDifferences();
}

window.addEventListener('surge-session', event => updateOperatorUI(event.detail));

// Serial Ports
async function loadPorts() {
  const fields = [$('port'), $('fw-port')];
  const previous = fields.map(field => field.value);
  fields.forEach(field => {
    field.disabled = true;
    field.setAttribute('aria-busy', 'true');
    field.replaceChildren(new Option('Finding ports…', ''));
  });
  try {
    const data = await api('ports', undefined, 'GET');
    const label = p => `${p.device} · ${p.description}${p.device === data.recommended ? ' · transmitter' : ''}`;
    fields.forEach((field, index) => {
      field.replaceChildren(new Option(data.ports.length ? 'Select serial port' : 'No ports found · refresh to retry', ''));
      data.ports.forEach(p => field.add(new Option(label(p), p.device)));
      if (data.ports.some(p => p.device === previous[index])) field.value = previous[index];
      // Preselect the lone ESP32 board for the host link; firmware upload stays a manual choice.
      else if (field.id === 'port' && data.recommended) field.value = data.recommended;
    });
    const hero = $('hero-port');
    if (hero) {
      hero.replaceChildren(new Option(data.ports.length ? 'Select serial port' : 'No ports found', ''));
      data.ports.forEach(p => hero.add(new Option(label(p), p.device)));
      if ($('port') && $('port').value) hero.value = $('port').value;
    }
  } catch (error) {
    fields.forEach(field => field.replaceChildren(new Option('Could not load ports · refresh to retry', '')));
    throw error;
  } finally {
    fields.forEach(field => {
      field.disabled = false;
      field.setAttribute('aria-busy', 'false');
    });
  }
}
$('refresh-ports')?.addEventListener('click', () => action(loadPorts));

const heroPort = $('hero-port');
if (heroPort) {
  heroPort.onchange = () => { if ($('port')) $('port').value = heroPort.value; };
  if ($('port')) $('port').addEventListener('change', () => { heroPort.value = $('port').value; });
}

const loginPasswordEl = $('login-password');
if (loginPasswordEl) {
  loginPasswordEl.addEventListener('input', () => {
    const errEl = $('login-error');
    if (errEl) errEl.style.display = 'none';
  });
}

// Calibration Map
async function loadMap() {
  const data = await api('map', undefined, 'GET');
  currentConfig = data;
  mapRevision = data.revision;
  $('map-revision-token').textContent = mapRevision || '—';
  $('cal-speed').value = data.speed;
  $('tracking-error').value = data.tracking_error;
  $('tracking-timeout').value = data.tracking_timeout;
  $('calibrated-checkbox').checked = data.calibrated;
  renderJointControls(data);
  $('calibration-state').textContent = data.calibrated
    ? 'Saved map: CALIBRATED. Hardware gait trials permitted.'
    : 'Saved map: NOT CALIBRATED. Hardware gait trials are blocked.';

  const tbody = $('joint-map-body');
  tbody.replaceChildren();
  data.joints.forEach((joint, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <th scope="row"><strong>${joint.id}</strong></th>
      <td>
        <select data-field="axis" aria-label="Joint ${joint.id} axis">
          <option value="yaw" ${joint.axis === 'yaw' ? 'selected' : ''}>yaw</option>
          <option value="pitch" ${joint.axis === 'pitch' ? 'selected' : ''}>pitch</option>
        </select>
      </td>
      <td>
        <select data-field="sign" aria-label="Joint ${joint.id} sign">
          <option value="1" ${joint.sign === 1 ? 'selected' : ''}>+1</option>
          <option value="-1" ${joint.sign === -1 ? 'selected' : ''}>-1</option>
        </select>
      </td>
      <td><input type="number" data-field="zero" aria-label="Joint ${joint.id} zero offset" value="${joint.zero}" min="1252" max="2844" required></td>
      <td><input type="number" data-field="min" aria-label="Joint ${joint.id} minimum encoder count" value="${joint.min}" min="1252" max="2844" required></td>
      <td><input type="number" data-field="max" aria-label="Joint ${joint.id} maximum encoder count" value="${joint.max}" min="1252" max="2844" required></td>
    `;
    tbody.append(tr);
  });
}

$('map-form')?.addEventListener('input', e => {
  if (e.target.id !== 'calibrated-checkbox') {
    const cb = $('calibrated-checkbox');
    if (cb) cb.checked = false;
  }
});

$('map-form').onsubmit = e => {
  e.preventDefault();
  if (!currentIsOperator) {
    showError(new Error('Operator mode required to save calibration map.'));
    return;
  }
  action(async () => {
    const joints = [...$('joint-map-body').rows].map(row => {
      const obj = { id: Number(row.cells[1].textContent.trim()) };
      row.querySelectorAll('[data-field]').forEach(inp => {
        const field = inp.dataset.field;
        obj[field] = field === 'axis' ? inp.value : Number(inp.value);
      });
      return obj;
    });
    const updated = {
      joints,
      speed: number('cal-speed'),
      tracking_error: number('tracking-error'),
      tracking_timeout: number('tracking-timeout'),
      calibrated: $('calibrated-checkbox').checked
    };

    const changes = [];
    if (currentConfig) {
      if (currentConfig.speed !== updated.speed) {
        changes.push({
          key: 'cal-speed',
          label: PARAMETER_METADATA['cal-speed'].label,
          unit: PARAMETER_METADATA['cal-speed'].unit,
          oldVal: currentConfig.speed,
          newVal: updated.speed,
          warning: PARAMETER_METADATA['cal-speed'].warning
        });
      }
      if (currentConfig.tracking_error !== updated.tracking_error) {
        changes.push({
          key: 'tracking-error',
          label: PARAMETER_METADATA['tracking-error'].label,
          unit: PARAMETER_METADATA['tracking-error'].unit,
          oldVal: currentConfig.tracking_error,
          newVal: updated.tracking_error,
          warning: PARAMETER_METADATA['tracking-error'].warning
        });
      }
      if (currentConfig.tracking_timeout !== updated.tracking_timeout) {
        changes.push({
          key: 'tracking-timeout',
          label: PARAMETER_METADATA['tracking-timeout'].label,
          unit: PARAMETER_METADATA['tracking-timeout'].unit,
          oldVal: currentConfig.tracking_timeout,
          newVal: updated.tracking_timeout,
          warning: PARAMETER_METADATA['tracking-timeout'].warning
        });
      }
      if (currentConfig.calibrated !== updated.calibrated) {
        changes.push({
          key: 'calibrated',
          label: PARAMETER_METADATA['calibrated'].label,
          unit: '',
          oldVal: currentConfig.calibrated ? 'true' : 'false',
          newVal: updated.calibrated ? 'true' : 'false',
          warning: PARAMETER_METADATA['calibrated'].warning
        });
      }
      // Check joint alterations
      if (Array.isArray(currentConfig.joints)) {
        updated.joints.forEach((nj, idx) => {
          const oj = currentConfig.joints[idx];
          if (oj) {
            ['zero', 'min', 'max', 'sign', 'axis'].forEach(jf => {
              if (nj[jf] !== oj[jf]) {
                changes.push({
                  key: `joint-${nj.id}-${jf}`,
                  label: `Joint ID ${nj.id} ${jf.toUpperCase()}`,
                  unit: '',
                  oldVal: oj[jf],
                  newVal: nj[jf],
                  warning: `Alters servo physical ${jf} configuration. Verify linkage mechanical clearances to prevent binding or motor stall.`
                });
              }
            });
          }
        });
      }
    }

    if (changes.length > 0) {
      const confirmed = await confirmParameterChanges(changes, 'Confirm Calibration Map Update');
      if (!confirmed) return;
    }

    await api('map', { config: updated, expected_revision: mapRevision });
    await loadMap();
    $('status').textContent = 'Calibration map saved; backup stored in runs/';
  });
};

// Per-Joint Control: pose sliders and per-joint gait settings.
const COUNTS_PER_DEGREE = 4096 / 360;

function jointDegreeRange(joint) {
  const ends = [joint.min - joint.zero, joint.max - joint.zero].map(c => joint.sign * c / COUNTS_PER_DEGREE);
  return [Math.min(...ends), Math.max(...ends)];
}

function renderJointControls(config) {
  const tbody = $('joint-control-body');
  if (!tbody || !config?.joints) return;
  const fresh = tbody.children.length !== config.joints.length;
  if (fresh) tbody.replaceChildren();
  config.joints.forEach((joint, idx) => {
    const [low, high] = jointDegreeRange(joint);
    let tr = tbody.children[idx];
    if (fresh) {
      tr = document.createElement('tr');
      tr.dataset.id = joint.id;
      tr.innerHTML = `
        <td><strong>${joint.id}</strong></td>
        <td>${joint.axis}</td>
        <td class="pose-cell">
          <input type="range" class="pose-slider" step="any" value="0" aria-label="Joint ${joint.id} pose angle">
          <output class="pose-value">0°</output>
        </td>
        <td><input type="checkbox" class="ov-enabled" checked aria-label="Joint ${joint.id} follows gait"></td>
        <td><input type="number" class="ov-gain" min="0" max="2" step="0.1" value="1" aria-label="Joint ${joint.id} gait gain"></td>
        <td><input type="number" class="ov-phase" min="-180" max="180" step="5" value="0" aria-label="Joint ${joint.id} phase shift in degrees"></td>
        <td><input type="number" class="ov-bias" min="-70" max="70" step="1" value="0" aria-label="Joint ${joint.id} gait bias in degrees"></td>`;
      const slider = tr.querySelector('.pose-slider');
      slider.addEventListener('input', () => { tr.querySelector('.pose-value').textContent = `${slider.value}°`; });
      tr.querySelectorAll('.ov-enabled, .ov-gain, .ov-phase, .ov-bias').forEach(el =>
        el.addEventListener('input', updateJointSummary));
      tbody.append(tr);
    }
    const slider = tr.querySelector('.pose-slider');
    slider.min = low;
    slider.max = high;
    slider.value = Math.max(low, Math.min(high, Number(slider.value)));
    tr.querySelector('.pose-value').textContent = `${slider.value}°`;
  });
  updateJointSummary();
}

// Shape presets, tuned in the PyBullet bench with placeholder 0.1 m links (CAD lengths pending).
// Sign convention there: +pitch at IDs 3/5 raises the head end, -pitch at ID 1 levels the head,
// +yaw curls left. Coiling starts at ID 8: a yaw joint behind a raised pitch joint tilts out of plane.
const POSE_PRESETS = {
  straight: { name: 'Straight (all zero)', pose: {},
    desc: 'Every joint at its calibrated zero.' },
  head_raised: { name: 'Head raised', pose: { 3: 30, 1: -30 },
    desc: 'Lifts the first three links; head about 12 cm up in simulation.' },
  cobra: { name: 'Cobra stand', pose: { 5: 30, 3: 30, 1: -30, 8: 65, 10: 65 },
    desc: 'Front raised and level, tail hooked left as a support base; stable for 8 s in simulation.' },
  cobra_tall: { name: 'Cobra stand (tall)', pose: { 5: 40, 3: 35, 1: -40, 8: 65, 10: 65 },
    desc: 'Higher front lift (about 13 cm in simulation); more load on IDs 3 and 5.' },
  ring: { name: 'Ring (near-closed, left)', pose: { 2: 69, 4: 69, 6: 69, 8: 69, 10: 69 },
    desc: 'All yaw joints at 69°. Closing fully needs 72° each, past the ±69° limit; head–tail gap about 9 cm with placeholder links.' },
  s_rest: { name: 'S-curve rest', pose: { 2: 40, 4: -40, 6: 40, 8: -40, 10: 40 },
    desc: 'Alternating yaw curve lying flat; a compact resting shape.' }
};

let savedPosePresets = [];
let capturedPose = null;
let recalibratingPose = null;

function loadPosePreset(key) {
  $('btn-pose-recalibrate').disabled = $('btn-pose-capture').disabled || !key.startsWith('saved:');
  const preset = key.startsWith('saved:') ? savedPosePresets[Number(key.slice(6))] : POSE_PRESETS[key];
  if (!preset) return;
  if (preset.joints && !preset.joints.every(joint => {
    const current = currentConfig?.joints.find(j => j.id === joint.id);
    return current && ['axis', 'sign', 'zero', 'min', 'max'].every(field => current[field] === joint[field]);
  })) {
    showError(new Error('This pose uses a different joint calibration. Capture it again.'));
    return;
  }
  for (const tr of $('joint-control-body').children) {
    const slider = tr.querySelector('.pose-slider');
    const target = preset.pose[tr.dataset.id] ?? 0;
    slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), target));
    tr.querySelector('.pose-value').textContent = `${Number(slider.value).toFixed(2)}°`;
  }
  $('pose-preset-desc').textContent = `${preset.desc || 'Saved hand-positioned shape.'} Loaded into the sliders; nothing moves until Move to Pose.`;
}

async function loadSavedPosePresets() {
  const data = await api('pose/presets', undefined, 'GET');
  savedPosePresets = data.presets;
  const select = $('pose-preset');
  for (const option of [...select.options]) if (option.value.startsWith('saved:')) option.remove();
  savedPosePresets.forEach((preset, index) => select.add(new Option(`Saved: ${preset.name}`, `saved:${index}`)));
}

function captureTaughtPose(preset = null) {
  return action(async () => {
    capturedPose = null;
    recalibratingPose = null;
    $('btn-pose-save').disabled = true;
    $('btn-pose-save').textContent = preset ? 'Update selected pose' : 'Save captured pose';
    $('pose-save-name').readOnly = Boolean(preset);
    if (preset) $('pose-save-name').value = preset.name;
    $('pose-capture-status').textContent = 'Reading all ten joints; keep the supported snake still…';
    try {
      capturedPose = await api('pose/capture', {port: $('port').value});
      recalibratingPose = preset;
      $('btn-pose-save').disabled = false;
      $('pose-capture-status').textContent = preset
        ? `Captured replacement for “${preset.name}”. Click Update selected pose to save it. No motion was commanded.`
        : 'Captured all ten joints. Enter a name and save. No motion was commanded.';
    } catch (err) {
      $('pose-capture-status').textContent = 'Capture failed. No pose saved; check the connection and capture again.';
      throw err;
    }
  });
}

$('btn-pose-capture').onclick = () => captureTaughtPose();
$('btn-pose-recalibrate').onclick = () => {
  const key = $('pose-preset').value;
  const preset = key.startsWith('saved:') && savedPosePresets[Number(key.slice(6))];
  if (preset) return captureTaughtPose(preset);
};

$('btn-pose-save').onclick = () => action(async () => {
  if (!capturedPose) throw new Error('Capture the robot pose first.');
  const name = recalibratingPose?.name || $('pose-save-name').value;
  await api('pose/presets', {...capturedPose, name, ...(recalibratingPose ? {expected: recalibratingPose} : {})});
  await loadSavedPosePresets();
  $('pose-preset').value = `saved:${savedPosePresets.findIndex(preset => preset.name === name.trim())}`;
  loadPosePreset($('pose-preset').value);
  $('pose-capture-status').textContent = recalibratingPose
    ? `Updated “${name}” and loaded its new angles into the sliders. No motion was commanded.`
    : 'Pose saved. Choose it from Shape preset to load it, then use Move to Pose when ready.';
  capturedPose = null;
  recalibratingPose = null;
  $('pose-save-name').readOnly = false;
  $('btn-pose-save').textContent = 'Save captured pose';
  $('btn-pose-save').disabled = true;
});

{
  const select = $('pose-preset');
  for (const [key, preset] of Object.entries(POSE_PRESETS)) select.add(new Option(preset.name, key));
  select.addEventListener('change', () => loadPosePreset(select.value));
}

function readPose() {
  const pose = {};
  for (const tr of $('joint-control-body').children) pose[tr.dataset.id] = Number(tr.querySelector('.pose-slider').value);
  return pose;
}

// Only non-default fields are sent; an empty result means the shared waveform.
function readJointOverrides() {
  const overrides = {};
  for (const tr of $('joint-control-body')?.children || []) {
    const row = {};
    if (!tr.querySelector('.ov-enabled').checked) row.enabled = false;
    for (const [key, cls, fallback] of [['gain', '.ov-gain', 1], ['phase', '.ov-phase', 0], ['bias', '.ov-bias', 0]]) {
      const value = Number(tr.querySelector(cls).value);
      if (!Number.isFinite(value)) throw new Error(`Joint ${tr.dataset.id} ${key} must be a number`);
      if (value !== fallback) row[key] = value;
    }
    if (Object.keys(row).length) overrides[tr.dataset.id] = row;
  }
  return overrides;
}

function updateJointSummary() {
  const summary = $('joint-control-summary');
  if (!summary) return;
  let overrides;
  try { overrides = readJointOverrides(); } catch (err) { summary.textContent = err.message; return; }
  const ids = Object.keys(overrides);
  summary.textContent = ids.length
    ? `Gait: custom settings on joint${ids.length > 1 ? 's' : ''} ${ids.join(', ')}; checked against limits at Start.`
    : 'Gait: all joints follow the shared waveform.';
}

$('btn-pose-zero').onclick = () => {
  for (const tr of $('joint-control-body').children) {
    tr.querySelector('.pose-slider').value = 0;
    tr.querySelector('.pose-value').textContent = '0°';
  }
};

$('btn-overrides-reset').onclick = () => {
  for (const tr of $('joint-control-body').children) {
    tr.querySelector('.ov-enabled').checked = true;
    tr.querySelector('.ov-gain').value = 1;
    tr.querySelector('.ov-phase').value = 0;
    tr.querySelector('.ov-bias').value = 0;
  }
  updateJointSummary();
};

$('pose-form').onsubmit = e => {
  e.preventDefault();
  const execution = hardwareExecution();
  if (execution === 'hardware' && !currentIsOperator) {
    showError(new Error('Operator mode required to start hardware motion trials.'));
    return;
  }
  action(async () => {
    const pose = readPose();
    if (execution === 'hardware') {
      const moved = Object.entries(pose).filter(([, deg]) => deg !== 0).map(([id, deg]) => ({
        key: `pose-${id}`, label: `Joint ${id} pose`, unit: '°', oldVal: 0, newVal: deg,
        warning: 'The joint moves to this angle, holds, then returns to neutral. Check clearance and cable slack first.'
      }));
      if (!(await confirmParameterChanges(moved, 'Confirm Pose'))) return;
    }
        await api('start', {
      request_id: crypto.randomUUID(),
      mode: 'pose',
      execution,
      port: $('port').value,
      pose,
      duration: number('pose-duration'),
      speed: number('pose-speed')
    });
  });
};

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
  $('grid-metric-servos').textContent = live ? `${feedback.length} / 10`
    : data ? `${servos.filter(s => Number.isFinite(s.reg8) && s.reg8 >= 0).length} / 10` : 'Unavailable';
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

  for (let id = 1; id <= 10; id++) {
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

// Start Gait Form with operator confirmation on custom factors
const gaitForm = $('gait-form');
if (gaitForm) {
  gaitForm.onsubmit = e => {
  e.preventDefault();
  if (hardwareExecution() === 'hardware' && !currentIsOperator) {
    showError(new Error('Operator mode required to start hardware motion trials.'));
    return;
  }
  action(async () => {
    const draft = getDraftSettings();
    const changes = [];
    if (draft.speed !== 100) {
      changes.push({
        key: 'speed',
        label: PARAMETER_METADATA.speed.label,
        unit: PARAMETER_METADATA.speed.unit,
        oldVal: 100,
        newVal: draft.speed,
        warning: PARAMETER_METADATA.speed.warning
      });
    }
    if (draft.yaw !== 5) {
      changes.push({
        key: 'yaw',
        label: PARAMETER_METADATA.yaw.label,
        unit: PARAMETER_METADATA.yaw.unit,
        oldVal: 5,
        newVal: draft.yaw,
        warning: PARAMETER_METADATA.yaw.warning
      });
    }
    if (draft.pitch !== 5) {
      changes.push({
        key: 'pitch',
        label: PARAMETER_METADATA.pitch.label,
        unit: PARAMETER_METADATA.pitch.unit,
        oldVal: 5,
        newVal: draft.pitch,
        warning: PARAMETER_METADATA.pitch.warning
      });
    }

    const joints = readJointOverrides();
    const customJoints = Object.keys(joints);
    if (customJoints.length) {
      changes.push({
        key: 'joints',
        label: 'Per-joint gait settings',
        unit: '',
        oldVal: 'shared',
        newVal: `custom on ${customJoints.join(', ')}`,
        warning: 'Disabled joints hold at zero; gain, phase shift and bias change only the listed joints.'
      });
    }

    if (currentIsOperator && changes.length > 0) {
      const confirmed = await confirmParameterChanges(changes, 'Confirm Motion Trial Parameters');
      if (!confirmed) return;
    }

    const execution = hardwareExecution();
        await api('start', {
      request_id: crypto.randomUUID(),
      mode: 'gait',
      execution,
      port: $('port').value,
      ...draft,
      ...(customJoints.length ? {joints} : {}),
    });
  });
  };
}

// Stop Button (Emergency & Normal Torque Release)
$('floating-stop-btn').onclick = async () => {
  try {
    await api('stop', {});
    await poll();
  } catch (err) {
    $('floating-stop-state').textContent = 'Stop unconfirmed';
    showError(err);
  }
};

// Presets Management
async function loadPresets() {
  const select = $('operate-preset');
  select.disabled = true;
  select.setAttribute('aria-busy', 'true');
  try {
    const data = await api('presets', undefined, 'GET');
    presets = data.presets || [];
    renderPresets();
  } finally {
    select.disabled = false;
    select.setAttribute('aria-busy', 'false');
  }
}

function renderPresets() {
  const list = $('presets-list');
  list.replaceChildren();
  const select = $('operate-preset');
  select.replaceChildren(new Option(presets.length ? 'Choose a preset for the draft' : 'No presets yet · save a draft below', ''));
  if (!presets.some(p => p.name === selectedPresetName)) selectedPresetName = null;

  presets.forEach(p => {
    select.add(new Option(p.name, p.name));
    const card = document.createElement('div');
    card.className = 'preset-card compact-preset-card';
    card.innerHTML = `
      <label class="preset-choice">
        <input type="radio" name="gait-preset-choice">
        <span class="preset-choice-content">
          <strong class="preset-name">${escapeHTML(p.name)}</strong>
          <span class="preset-specs-compact">Yaw ${escapeHTML(p.yaw)}° · Pitch ${escapeHTML(p.pitch)}° · ${escapeHTML(p.frequency)} Hz · ${escapeHTML(p.speed)} cnt/s</span>
          <span class="preset-description">${escapeHTML(p.description || '')}</span>
        </span>
      </label>
      <div class="preset-actions">
        <button class="btn-sm btn-danger btn-del" type="button">Delete</button>
      </div>
    `;
    const radio = card.querySelector('input');
    radio.value = p.name;
    radio.checked = p.name === selectedPresetName;
    radio.onchange = () => {
      selectedPresetName = p.name;
      updatePresetSelection();
    };
    card.querySelector('.btn-del').setAttribute('aria-label', `Delete preset ${p.name}`);
    card.querySelector('.btn-del').disabled = !currentIsOperator;
    card.querySelector('.btn-del').onclick = () => action(async () => {
      await api(`presets/${encodeURIComponent(p.name)}`, undefined, 'DELETE');
      await loadPresets();
    });
    list.append(card);
  });
  initAnimatedBackground(list, { itemSelector: '.preset-card', enableHover: true });
  wireRunsSimulationGaitControls();
  updatePresetSelection();
}

function wireRunsSimulationGaitControls() {
  const runsYaw = $('runs-sim-yaw');
  const runsPitch = $('runs-sim-pitch');
  const runsFreq = $('runs-sim-freq');
  const runsLag = $('runs-sim-lag');
  const simYaw = $('sim-param-yaw-amp');
  const simPitch = $('sim-param-pitch-amp');
  const simFreq = $('sim-param-freq');
  const simLag = $('sim-param-lag');

  if (runsYaw && simYaw && !runsYaw._wired) {
    runsYaw._wired = true;
    const syncFromSim = () => {
      runsYaw.value = simYaw.value;
      if (runsPitch && simPitch) runsPitch.value = simPitch.value;
      if (runsFreq && simFreq) runsFreq.value = simFreq.value;
      if (runsLag && simLag) runsLag.value = simLag.value;
    };
    simYaw.addEventListener('input', syncFromSim);
    if (simPitch) simPitch.addEventListener('input', syncFromSim);
    if (simFreq) simFreq.addEventListener('input', syncFromSim);
    if (simLag) simLag.addEventListener('input', syncFromSim);
    syncFromSim();

    $('btn-runs-apply-sim')?.addEventListener('click', () => {
      simYaw.value = runsYaw.value;
      if (simPitch && runsPitch) simPitch.value = runsPitch.value;
      if (simFreq && runsFreq) simFreq.value = runsFreq.value;
      if (simLag && runsLag) simLag.value = runsLag.value;
      $('btn-sim-apply-physics')?.click();
      const pill = $('runs-sim-applied-pill');
      if (pill) {
        pill.style.display = 'block';
        setTimeout(() => { pill.style.display = 'none'; }, 2000);
      }
    });

    $('btn-runs-reset-sim')?.addEventListener('click', () => {
      $('btn-sim-reset-physics')?.click();
      syncFromSim();
    });
  }
}

function updatePresetSelection() {
  const selected = presets.find(p => p.name === selectedPresetName);
  $('load-selected-preset').disabled = !selected;
  $('load-preset-simulation').disabled = !selected;
  $('preset-selection-status').textContent = selected
    ? `${selected.name} selected. Choose a workspace to load the draft.`
    : presets.length ? 'Select a preset to compare its settings.' : 'No saved presets. Save the current draft to create one.';
}

const loadPresetBtn = $('load-selected-preset');
if (loadPresetBtn) {
  loadPresetBtn.onclick = () => {
    const selected = presets.find(p => p.name === selectedPresetName);
    if (selected) loadPresetToDraft(selected);
  };
}

function loadPresetToDraft(p) {
  selectedPresetName = presets.some(saved => saved.name === p.name) ? p.name : null;
  document.querySelectorAll('input[name="gait-preset-choice"]').forEach(radio => {
    radio.checked = radio.value === p.name;
  });
  $('operate-preset').value = selectedPresetName || '';
  updatePresetSelection();
  if (p.yaw !== undefined) $('yaw').value = p.yaw;
  if (p.pitch !== undefined) $('pitch').value = p.pitch;
  if (p.bias !== undefined) $('bias').value = p.bias;
  if (p.frequency !== undefined) {
    $('frequency').value = Math.abs(p.frequency);
    $('direction').value = p.frequency < 0 ? '-1' : '1';
  }
  if (p.lag !== undefined) $('lag').value = p.lag;
  if (p.offset !== undefined) $('offset').value = p.offset;
  if (p.speed !== undefined) $('speed').value = p.speed;
  if (p.ramp !== undefined) $('ramp').value = p.ramp;
  if (p.duration !== undefined) $('duration').value = p.duration;

  if (p.yaw > 0 && p.pitch === 0) $('btn-mode-yaw').click();
  else if (p.pitch > 0 && p.yaw === 0) $('btn-mode-pitch').click();
  else $('btn-mode-combined').click();

  updateSpeedDemand();
  document.getElementById('tab-operate').click();
  $('yaw').focus({ preventScroll: true });
}

$('operate-preset').onchange = () => {
  const p = presets.find(x => x.name === $('operate-preset').value);
  if (p) loadPresetToDraft(p);
};

const savePresetForm = $('save-preset-form');
if (savePresetForm) {
  savePresetForm.onsubmit = e => {
    e.preventDefault();
    $('preset-save-status').textContent = '';
    if (!statusOnline) { $('preset-save-status').textContent = 'Dashboard offline; reconnect before saving.'; return; }
    action(async () => {
      const draft = getDraftSettings();
      const pattern = $('save-preset-pattern').value;
      const selected = window.SurgeSimulationPresets?.[pattern];
      if (pattern !== 'custom') {
        if (!selected) throw new Error('Gait patterns are unavailable; reload this page');
        Object.assign(draft, {yaw: selected.yaw, pitch: selected.pitch, bias: selected.bias,
          frequency: selected.freq, lag: selected.lag, offset: selected.offset});
      }
      const newPreset = {
        name: $('preset-name').value.trim(),
        description: $('preset-desc').value.trim(),
        ...draft
      };
      const previous = presets.find(p => p.name === newPreset.name) || null;
      if (previous && !window.confirm(`Replace the saved preset “${newPreset.name}”?`)) return;
      try {
        await api('presets', {preset: newPreset, expected: previous});
      } catch (error) {
        $('preset-save-status').textContent = error.message;
        throw error;
      }
      $('preset-name').value = '';
      $('preset-desc').value = '';
      $('preset-save-status').textContent = `Saved ${newPreset.name}.`;
      await loadPresets();
    });
  };
}

// Runs Journal
let visibleRunCount = 3;
function updateRunVisibility() {
  const rows = Array.from($('runs-table-body').children);
  rows.forEach((row, index) => { row.hidden = index >= visibleRunCount; });
  const shown = Math.min(visibleRunCount, rows.length);
  $('runs-visible-count').textContent = rows.length ? `${shown} of ${rows.length} runs` : 'No runs in this workspace.';
  $('runs-show-more').hidden = shown >= rows.length;
  $('runs-show-more').textContent = `Show ${Math.min(3, rows.length - shown)} more`;
}
async function loadRuns() {
  const data = await api('runs', undefined, 'GET');
  const tbody = $('runs-table-body');
  tbody.replaceChildren();

  const runsList = data.runs || [];
  const totalTrials = runsList.length;
  const totalDisp = runsList.reduce((acc, r) => acc + (Number(r.annotations?.displacement_cm) || 0), 0);
  const totalDur = runsList.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);
  const avgDur = totalTrials > 0 ? (totalDur / totalTrials) : 0;

  if (typeof updateRollingNumber === 'function') {
    if ($('runs-count-val')) updateRollingNumber($('runs-count-val'), totalTrials, { precision: 0 });
    if ($('runs-disp-val')) updateRollingNumber($('runs-disp-val'), totalDisp, { precision: 1 });
    if ($('runs-dur-val')) updateRollingNumber($('runs-dur-val'), avgDur, { precision: 1 });
  }

  (data.runs || []).filter(r => $('runs-workspace-filter').value === 'all' || r.execution === $('runs-workspace-filter').value).forEach(r => {
    const tr = document.createElement('tr');
    const dateStr = new Date(r.timestamp * 1000).toLocaleString();
    const ann = r.annotations || {};
    tr.innerHTML = `
      <td><code>${r.run_id}</code></td>
      <td>${dateStr}</td>
      <td>${r.mode}</td>
      <td><span class="status-chip">${escapeHTML(r.execution === 'simulation' ? 'Simulation' : r.execution === 'hardware' ? 'Hardware' : 'Dry run')}</span></td>
      <td>${r.duration ?? '—'}s</td>
      <td>${r.speed ?? '—'}</td>
      <td>
        ${r.has_csv ? `<a href="/api/gen3/log/${r.run_id}.csv" class="btn-sm">CSV</a>` : ''}
        <a href="/api/gen3/log/${r.run_id}.json" class="btn-sm">JSON</a>
      </td>
      <td>
        <details class="run-annotations"><summary>Annotations</summary>
        <div class="annotation-box" style="display:flex; align-items:flex-end; gap:6px; flex-wrap:wrap;">
          <label class="ann-field" style="display:inline-flex; flex-direction:column; font-size:11px; font-weight:600; color:var(--color-muted, #64748b);">
            <span class="ann-label">Disp cm</span>
            <input type="number" class="ann-disp" placeholder="Disp cm" aria-label="Run ${escapeHTML(r.run_id)} displacement in cm" value="${escapeHTML(ann.displacement_cm ?? '')}" style="width:70px">
          </label>
          <label class="ann-field" style="display:inline-flex; flex-direction:column; font-size:11px; font-weight:600; color:var(--color-muted, #64748b);">
            <span class="ann-label">Surface</span>
            <input type="text" class="ann-surf" placeholder="Surface" aria-label="Run ${escapeHTML(r.run_id)} surface" value="${escapeHTML(ann.surface ?? '')}" style="width:70px">
          </label>
          <label class="ann-field" style="display:inline-flex; flex-direction:column; font-size:11px; font-weight:600; color:var(--color-muted, #64748b); flex:1; min-width:120px;">
            <span class="ann-label">Notes</span>
            <input type="text" class="ann-notes" placeholder="Notes" aria-label="Run ${escapeHTML(r.run_id)} notes" value="${escapeHTML(ann.notes ?? '')}" style="width:100px">
          </label>
          <button type="button" class="btn-sm btn-save-ann">Save</button>
        </div></details>
      </td>
      <td><details class="run-draft-actions"><summary>Load draft</summary><button type="button" class="btn-sm btn-repeat-simulation">Load into Simulation</button><button type="button" class="btn-sm btn-repeat">Load into Hardware</button></details></td>
    `;

    tr.querySelector('.btn-save-ann').disabled = !currentIsOperator;
    tr.querySelector('.btn-save-ann').onclick = () => action(async () => {
      const disp = tr.querySelector('.ann-disp').value;
      const surf = tr.querySelector('.ann-surf').value;
      const notes = tr.querySelector('.ann-notes').value;
      await api(`runs/${r.run_id}/annotate`, {
        displacement_cm: disp ? Number(disp) : undefined,
        surface: surf || undefined,
        notes: notes || undefined
      });
      await loadRuns();
    });

    async function loadRunDraft(workspace) {
      const response = await fetch(`/api/gen3/log/${r.run_id}.json`);
      if (!response.ok) throw Error('Could not load the run; try again.');
      const full = await response.json();
      if (!full.values) throw Error('This run has no gait draft.');
      const degrees = value => value * 180 / Math.PI;
      const draft = {yaw: degrees(full.values[0]), pitch: degrees(full.values[1]), bias: degrees(full.values[2]),
        frequency: full.values[3], lag: degrees(full.values[4]), offset: degrees(full.values[5]),
        ...(full.joint_map?.speed ? {speed: full.joint_map.speed} : {}),
        ...(full.duration ? {duration: full.duration} : {}), ...(full.ramp ? {ramp: full.ramp} : {})};
      if (workspace === 'simulation') {
        window.SurgeSimulation.loadDraft(draft); $('tab-simulation').click();
      } else loadPresetToDraft(draft);
    }
    tr.querySelector('.btn-repeat').onclick = () => loadRunDraft('hardware').catch(showError);
    tr.querySelector('.btn-repeat-simulation').onclick = () => loadRunDraft('simulation').catch(showError);

    tbody.append(tr);
  });
  updateRunVisibility();
}

// Firmware Build and Mock Upload
const btnBuildFw = $('btn-build-fw');
if (btnBuildFw) {
  btnBuildFw.onclick = () => action(async () => {
    const env = $('fw-env').value;
    await api('firmware/build', { env });
    pollFirmwareLog();
  });
}

$('btn-upload-fw').onclick = () => action(async () => {
  if (!$('check-board').checked || !$('check-power').checked || !$('check-risk').checked) {
    showError(new Error('All 3 safety checklist items must be physically verified before upload.'));
    return;
  }
  const env = $('fw-env').value;
  const port = $('fw-port').value;
  await api('firmware/upload', {
    env,
    port,
    confirm_board: true,
    confirm_power: true,
    confirm_risk: true
  });
  pollFirmwareLog();
});

async function pollFirmwareLog() {
  const data = await api('firmware/status', undefined, 'GET');
  const term = $('fw-log');
  if (data.log && data.log.length > 0) {
    term.textContent = data.log.join('\n');
    term.scrollTop = term.scrollHeight;
  }
  if (data.is_busy) {
    setTimeout(() => pollFirmwareLog().catch(showError), 500);
  }
}

// Core State Polling Loop
function formatRunTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

// ST3215: 4096 counts per revolution.
function countsToDegrees(counts) {
  return (counts * 360 / 4096).toFixed(1);
}

function trackingErrorHtml(err, limit) {
  const text = `${err} <small>(${countsToDegrees(err)}°)</small>`;
  if (typeof limit !== 'number') return text;
  if (err > limit) return `<span class="text-danger font-bold">${text}</span>`;
  if (err >= 0.5 * limit) return `<span class="text-warn">${text}</span>`;
  return text;
}

function errorSparkline(history, limit) {
  if (!Array.isArray(history) || history.length < 2) return '—';
  const w = 80, h = 20;
  const top = Math.max(typeof limit === 'number' ? limit : 0, ...history, 1);
  const y = v => (h - 1 - (v / top) * (h - 2)).toFixed(1);
  const points = history.map((v, i) => `${(i * (w / (history.length - 1))).toFixed(1)},${y(v)}`).join(' ');
  const limitLine = typeof limit === 'number' ? `<line class="spark-limit" x1="0" x2="${w}" y1="${y(limit)}" y2="${y(limit)}"/>` : '';
  return `<svg class="error-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Last ${history.length} tracking errors, latest ${history[history.length - 1]} counts">${limitLine}<polyline points="${points}"/></svg>`;
}

async function poll() {
  try {
    const state = await api('status', undefined, 'GET');
    renderBusMetrics(state.diagnostic, state);
    if (!statusOnline) showError(null);
    statusOnline = true;
    void refreshHardwareMetrics(state);
    window.SurgeGamepad?.observe(state);
    $('btn-save-preset').disabled = !currentIsOperator || pendingAction;
    $('status').textContent = state.status;
    $('hardware-workspace-status').textContent = state.busy && state.execution === 'simulation'
      ? 'Simulation run active; hardware start disabled. Stop the current job first.'
      : `Hardware · ${$('port').value || 'select a port'} · ${currentIsOperator ? 'operator lease active' : 'viewer'} · ${state.busy ? 'busy' : 'stopped'}`;
    $('stage').textContent = state.stage ? `[${state.stage}]` : '';
    if ($('conn-status')) $('conn-status').textContent = state.status;
    if ($('status-dot')) $('status-dot').className = 'dot' + (state.status === 'running' || state.busy ? ' active' : '');
    const elapsedFormatted = formatRunTime(state.elapsed_seconds ?? 0);
    if (typeof updateRollingNumber === 'function' && $('run-elapsed')) {
      updateRollingNumber($('run-elapsed'), elapsedFormatted);
    } else {
      $('run-elapsed').textContent = elapsedFormatted;
    }
    const durationFormatted = formatRunTime(state.motion_duration);
    if (typeof updateRollingNumber === 'function' && $('run-duration')) {
      updateRollingNumber($('run-duration'), durationFormatted);
    } else {
      $('run-duration').textContent = durationFormatted;
    }
    $('run-timer-state').textContent = state.busy ? 'Active' : state.run_id ? 'Ended' : 'Idle';
    const gaitRunning = Boolean(state.busy && state.active_settings);
    for (const id of ['btn-start']) {
      $(id).textContent = gaitRunning ? (state.status === 'Starting' ? 'Starting…' : 'Running') : id === 'btn-start' ? 'Start Finite Motion Trial' : 'Start motion';
      $(id).classList.toggle('motion-active', gaitRunning);
    }
    document.querySelector('.run-timers').classList.toggle('is-running', Boolean(state.busy));
    if (typeof MotionState !== 'undefined') {
      $('floating-stop-state').textContent = MotionState.label(MotionState.classify(state.status, Boolean(state.busy)));
      MotionState.render(['btn-start'], MotionState.classify(state.status, Boolean(state.busy)));
    }

    currentRunId = state.run_id;
    appliedSettings = state.busy && state.execution !== 'simulation' ? state.active_settings : null;

    if (appliedSettings) {
      $('applied-readout').innerHTML = `Applied: <strong>Yaw ${appliedSettings.yaw ?? 0}° | Pitch ${appliedSettings.pitch ?? 0}° | Freq ${appliedSettings.frequency ?? 0}Hz | Speed ${appliedSettings.speed ?? 100}</strong> (Rev ${state.settings_revision})`;
    } else {
      $('applied-readout').innerHTML = 'Applied: <em>No active motion</em>';
    }

    if (state.pending_settings) {
      $('pending-readout').innerHTML = `Pending (${state.transition_state}): <strong>Yaw ${state.pending_settings.yaw ?? 0}° | Freq ${state.pending_settings.frequency ?? 0}Hz</strong>`;
      $('pending-readout').hidden = false;
    } else {
      $('pending-readout').hidden = true;
    }

    $('exec-badge').textContent = state.execution ? state.execution.toUpperCase() : 'PREVIEW';
    const dot = $('conn-dot');
    dot.className = state.busy ? 'status-indicator-dot running' : 'status-indicator-dot idle';

    if (state.log && !state.busy) {
      $('log').hidden = false;
      $('log').href = `/api/gen3/log/${encodeURIComponent(state.log)}`;
    } else {
      $('log').hidden = true;
    }

    document.querySelectorAll('.job').forEach(btn => {
      btn.disabled = !currentIsOperator || state.busy || pendingAction;
    });

    $('btn-start').disabled = !currentIsOperator || state.busy || pendingAction;
    $('btn-pose-save').disabled = !currentIsOperator || state.busy || pendingAction || !capturedPose;
    $('btn-pose-recalibrate').disabled = $('btn-pose-capture').disabled || !$('pose-preset').value.startsWith('saved:');
    checkDraftDifferences();

    // Render Telemetry Table with in-place row reuse
    const tbody = $('telemetry-body');
    let hasFeedback = false;
    const existingRows = tbody.children;

    // Colour against the limit the running job enforces, else the saved map's.
    const limit = state.tracking?.error ?? currentConfig?.tracking_error ?? null;
    const timeout = state.tracking?.timeout ?? currentConfig?.tracking_timeout ?? null;
    let worst = null;

    for (let id = 1; id <= 10; id++) {
      const data = state.telemetry[id];
      const axis = (currentConfig && currentConfig.joints && currentConfig.joints[id - 1]) ? currentConfig.joints[id - 1].axis : (id % 2 === 1 ? 'pitch' : 'yaw');
      const target = data?.target ?? '—';
      const pos = data?.position ?? '—';
      let errStr = '—';
      if (typeof target === 'number' && typeof pos === 'number') {
        errStr = trackingErrorHtml(Math.abs(pos - target), limit);
      }
      const peak = data?.peak_error;
      const peakStr = typeof peak === 'number' ? trackingErrorHtml(peak, limit) : '—';
      if (typeof peak === 'number' && (!worst || peak > worst.peak)) worst = { id, peak };
      if (data?.valid) hasFeedback = true;

      const rowHtml = `
        <td><strong>${id}</strong></td>
        <td>${axis}</td>
        <td>${!data ? 'Not sampled' : data.valid ? '<span class="text-success">Valid</span>' : '<span class="text-danger font-bold">Missing/Invalid</span>'}</td>
        <td>${target}</td>
        <td>${pos}</td>
        <td>${errStr}</td>
        <td>${peakStr}</td>
        <td>${errorSparkline(data?.error_history, limit)}</td>
        <td>${data?.velocity ?? '—'}</td>
        <td>${data?.load ?? '—'}</td>
      `;

      if (existingRows[id - 1]) {
        existingRows[id - 1].innerHTML = rowHtml;
      } else {
        const tr = document.createElement('tr');
        tr.innerHTML = rowHtml;
        tbody.append(tr);
      }
    }

    $('telemetry-limit').textContent = typeof limit === 'number'
      ? `Tracking limit: ${limit} counts (${countsToDegrees(limit)}°) sustained ${timeout ?? '—'} s stops the run` +
        (worst ? ` · worst peak: ID ${worst.id} at ${worst.peak} counts (${Math.round(100 * worst.peak / limit)}% of limit)` : '')
      : 'Tracking limit: not loaded';

    $('feedback-age').textContent = hasFeedback ? `Feedback: ${state.busy ? 'running' : 'snapshot'} · ${Math.max(0, (Date.now()/1000 - (state.feedback_at || 0))).toFixed(1)}s old` : 'Feedback: not sampled';

    if (state.operator) {
      const opName = typeof state.operator === 'object' ? state.operator.active_operator : state.operator;
      if (opName !== lastKnownOperator) {
        lastKnownOperator = opName;
        const ownState = await api('session', undefined, 'GET');
        updateOperatorUI(ownState);
      }
    }
  } catch (err) {
    statusOnline = false;
    $('btn-save-preset').disabled = true;
    $('status').textContent = 'Dashboard offline · robot status unknown';
    $('stage').textContent = '';
    $('conn-status').textContent = 'Status unknown';
    $('status-dot').className = 'dot';
    $('conn-dot').className = 'status-indicator-dot';
    $('exec-badge').textContent = 'UNKNOWN';
    $('feedback-age').textContent = 'Feedback: stale · dashboard offline';
    for (const row of $('telemetry-body').children) row.cells[2].textContent = 'Stale';
    $('applied-readout').textContent = 'Applied: unknown · dashboard offline';
    $('pending-readout').hidden = true;
    document.querySelectorAll('.job').forEach(btn => btn.disabled = true);
    $('btn-apply').disabled = true;
    $('btn-start').disabled = true;
    $('btn-start').textContent = 'Start Finite Motion Trial';
    $('floating-stop-state').textContent = 'Status unknown';
    $('btn-start').classList.remove('motion-active');
    $('run-timer-state').textContent = 'Offline · frozen';
    document.querySelector('.run-timers').classList.remove('is-running');
    if (typeof MotionState !== 'undefined') {
      MotionState.render(['btn-start'], 'unknown');
    }
    showError(new Error('Dashboard connection lost: ' + err.message));
  }
}

async function pollSystemStats() {
  try {
    const res = await fetch('/api/system_stats', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const cpuEl = $('sys-cpu');
      const ramEl = $('sys-ram');
      const tempEl = $('sys-temp');
      const formatPercent = v => (v === null || v === undefined || v === 'N/A' || !Number.isFinite(Number(v))) ? 'N/A' : `${Number(v).toFixed(1)}%`;
      if (cpuEl) cpuEl.textContent = formatPercent(data.cpu);
      if (ramEl) ramEl.textContent = formatPercent(data.ram);
      if (tempEl) {
        tempEl.textContent = formatUnit(data.temp, '°C');
        // Host temperature is often unsampled on Windows; hide the pill rather than show N/A.
        tempEl.closest('.stat-pill').hidden = !Number.isFinite(Number(data.temp));
      }
      window.SurgeBattery?.render(data.battery);
    } else {
      window.SurgeBattery?.render(null);
    }
  } catch (_) { window.SurgeBattery?.render(null); }
}

// Bootstrap
(async () => {
  try {
    tabNavAnimated = initAnimatedBackground(document.querySelector('.tab-nav'), { trackActive: true });
    modeTogglesAnimated = initAnimatedBackground(document.querySelector('.mode-toggles'), { trackActive: true });
    await initSession();
    await loadMap();
    await loadPorts();
    await loadPresets();
    await loadRuns();
    await loadSavedPosePresets();
    syncHashTab();
    updateSpeedDemand();
    if (tabNavAnimated) tabNavAnimated.sync();
    if (modeTogglesAnimated) modeTogglesAnimated.sync();
    window.SurgeGenerationTransition?.ready();
    await poll();
    await pollSystemStats();
  } catch (err) {
    showError(err);
    window.SurgeGenerationTransition?.fail();
  }
  // Polls pause while hidden; visible stopped Hardware also schedules its guarded bus refresh.
  let statsTick = 0;
  async function updateLoop() {
    if (!document.hidden) {
      await poll();
      if (statsTick++ % 5 === 0) await pollSystemStats();
    }
    setTimeout(updateLoop, 400);
  }
  setTimeout(updateLoop, 400);
})();


// --- Marquee Banner Pause / Play Toggle (WCAG 2.2.2 & Session Memory) ---
function initMarqueeToggle() {
  const banner = document.querySelector('.marquee-banner');
  const toggleBtn = document.getElementById('marquee-toggle');
  if (!banner || !toggleBtn) return;

  const sessionPref = sessionStorage.getItem('marquee-paused');
  let isPaused = sessionPref !== null ? sessionPref === 'true' : true; // still by default while operating; Play opts in

  function applyState(paused) {
    banner.classList.toggle('is-paused', paused);
    toggleBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    toggleBtn.setAttribute('aria-label', paused ? 'Play announcement ticker' : 'Pause announcement ticker');
    const icon = toggleBtn.querySelector('.marquee-toggle-icon');
    const label = toggleBtn.querySelector('.marquee-toggle-label');
    if (icon) icon.dataset.icon = paused ? 'play' : 'pause';
    if (label) label.textContent = paused ? 'Play' : 'Pause';
  }

  applyState(isPaused);

  toggleBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    sessionStorage.setItem('marquee-paused', isPaused ? 'true' : 'false');
    applyState(isPaused);
  });
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMarqueeToggle);
  } else {
    initMarqueeToggle();
  }
}
/* endasset: gen3.js */

;
/* asset: gen3-search.js */
'use strict';

function rankConsoleResults(items, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return items.map(item => {
    const title = item.title.toLocaleLowerCase();
    const text = `${item.title} ${item.description}`.toLocaleLowerCase();
    return { ...item, score: terms.every(term => text.includes(term))
      ? 1 + terms.filter(term => title.includes(term)).length : 0 };
  }).filter(item => item.score).sort((a, b) => b.score - a.score).slice(0, 8);
}

if (typeof module !== 'undefined') module.exports = { rankConsoleResults };

if (typeof document !== 'undefined') (() => {
  const input = document.getElementById('console-search-input');
  const form = document.getElementById('console-search-form');
  const clear = document.getElementById('console-search-clear');
  const results = document.getElementById('console-search-results');
  const list = document.getElementById('console-search-list');
  const status = document.getElementById('console-search-status');
  const clean = text => text.replace(/\s+/g, ' ').trim();
  let timer;

  function indexConsole() {
    const items = [];
    document.querySelectorAll('.tab-panel section').forEach(section => {
      const heading = section.querySelector('h2');
      const panel = section.closest('.tab-panel');
      if (!heading || !panel) return;
      items.push({ title: clean(heading.textContent),
        description: clean(section.textContent), target: heading, panel });
      section.querySelectorAll('label, button[id], .preset-card').forEach(element => {
        const target = element.tagName === 'LABEL'
          ? document.getElementById(element.htmlFor) || element.querySelector('input, select')
          : element;
        if (!target) return;
        const title = clean(element.textContent);
        if (!title) return;
        items.push({ title, description: clean(heading.textContent), target, panel });
      });
    });
    return items;
  }

  function closeResults() {
    clearTimeout(timer);
    results.hidden = true;
  }

  function search() {
    clearTimeout(timer);
    clear.hidden = !input.value;
    const query = input.value.trim();
    list.replaceChildren();
    if (!query) { closeResults(); return; }
    const matches = rankConsoleResults(indexConsole(), query);
    results.hidden = false;
    status.textContent = matches.length
      ? `${matches.length} matching destinations · select one to open`
      : 'No matches. Try yaw, speed, preset, calibration, or firmware.';
    for (const match of matches) {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      const title = document.createElement('strong');
      title.textContent = match.title;
      const detail = document.createElement('span');
      detail.textContent = match.description.slice(0, 140);
      button.append(title, detail);
      button.onclick = () => {
        const tab = document.getElementById(match.panel.getAttribute('aria-labelledby'));
        tab.click();
        closeResults();
        // Navigation only: never click or submit the matched robot control.
        const target = match.target.disabled ? match.target.closest('section').querySelector('h2') : match.target;
        for (let details = target.closest('details'); details; details = details.parentElement.closest('details')) details.open = true;
        if (!target.matches('input, select, button, a[href]')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'center', behavior: 'instant' });
      };
      row.append(button);
      list.append(row);
    }
  }

  form.onsubmit = event => { event.preventDefault(); search(); };
  input.addEventListener('input', () => {
    clear.hidden = !input.value;
    clearTimeout(timer);
    timer = setTimeout(search, 120);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      search();
      list.querySelector('button')?.focus();
    }
  });
  results.addEventListener('keydown', event => {
    const buttons = [...list.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = index + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) input.focus();
      else buttons[Math.min(next, buttons.length - 1)]?.focus();
    }
  });
  input.closest('.console-search').addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeResults(); input.focus(); }
  });
  clear.onclick = () => { input.value = ''; search(); input.focus(); };
  window.addEventListener('pagehide', () => clearTimeout(timer));
})();
/* endasset: gen3-search.js */

/* asset: browser-gamepad.js */
window.SurgeGamepad.mount($('hardware-controller'), {
  generation: '3',
  accepts: state => state.execution !== 'simulation',
  visible: () => $('tab-operate').getAttribute('aria-selected') === 'true',
  start: async (controller, freshInput) => {
    if (!currentIsOperator || !statusOnline || pendingAction) throw Error('Operator connection required');
    if (Object.keys(readJointOverrides()).length) throw Error('Reset per-joint overrides before controller mode');
    const execution = hardwareExecution();
    const draft = getDraftSettings();
    if (execution === 'hardware' && !(await confirmParameterChanges([{
      key: 'controller', label: 'Hold-to-run controller', oldVal: 'Stopped', newVal: controller.inspection ? 'Head inspection' : 'Live gait', unit: '',
      warning: `Hold LB throughout motion. Speed limit ${draft.speed} counts/s; duration ${draft.duration}s. Verify clearance and all ten servo replies. Release or B stops.`
    }], 'Confirm Controller Motion'))) throw Error('Start cancelled');
    const input = freshInput();
    return api('start', {request_id: crypto.randomUUID(), mode: 'gait', execution,
      port: $('port').value, ...draft, controller, input});
  }
});
/* endasset: browser-gamepad.js */

function hardwareExecution() {
  return $('hardware-dry-run').checked ? 'preview' : 'hardware';
}
function copySimulationDraft() {
  loadPresetToDraft(window.SurgeSimulation.draft());
}
$('copy-to-hardware').onclick = copySimulationDraft;
$('copy-from-simulation').onclick = copySimulationDraft;
$('load-preset-simulation').onclick = () => {
  const selected = presets.find(p => p.name === selectedPresetName);
  if (!selected) return;
  window.SurgeSimulation.loadDraft(selected);
  $('tab-simulation').click();
};
$('runs-workspace-filter').onchange = () => { visibleRunCount = 3; loadRuns().catch(showError); };
$('runs-show-more').onclick = () => { visibleRunCount += 3; updateRunVisibility(); };
window.SurgeGamepad.mount($('simulation-controller'), {
  generation: '3',
  accepts: state => state.execution === 'simulation',
  visible: () => $('tab-simulation').getAttribute('aria-selected') === 'true',
  start: async (controller, freshInput) => {
    const {simulation_path, ...payload} = window.SurgeSimulation.startPayload();
    if (controller.assist === 'route' && !controller.path) controller.path = simulation_path;
    // Hold-to-run already bounds a controller run; use the longest run the server allows.
    return api('start', {...payload, duration: 300, controller, input: freshInput()});
  }
});

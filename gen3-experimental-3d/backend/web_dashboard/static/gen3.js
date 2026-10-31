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

    changes.forEach(c => {
      const card = document.createElement('div');
      card.className = 'factor-confirm-item';
      card.style.cssText = 'background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; text-align: left;';
      
      const isSpeed = c.key === 'speed' || c.key === 'cal-speed';
      const borderAccent = isSpeed ? '#f59e0b' : '#3b82f6';
      const badgeBg = isSpeed ? '#fef3c7' : '#eff6ff';
      const badgeColor = isSpeed ? '#92400e' : '#1d4ed8';

      card.style.borderLeft = `5px solid ${borderAccent}`;

      const header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
      header.innerHTML = `
        <span style="font-weight: 700; font-size: 14px; color: #0f172a;">${escapeHTML(c.label || c.key)}</span>
        <span style="font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">${isSpeed ? '⚡ Motor Dynamics' : 'Kinematics'}</span>
      `;

      const valuesRow = document.createElement('div');
      valuesRow.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 13px; font-family: monospace; background: rgba(0,0,0,0.04); padding: 4px 8px; border-radius: 4px;';
      const unit = c.unit ? ` ${c.unit}` : '';
      valuesRow.innerHTML = `
        <span style="color: #64748b;">Previous: <strong style="color: #334155;">${escapeHTML(String(c.oldVal))}${unit}</strong></span>
        <span style="color: #94a3b8;">&rarr;</span>
        <span style="color: #0f172a; font-weight: 700;">New: <strong style="color: #059669;">${escapeHTML(String(c.newVal))}${unit}</strong></span>
      `;

      const warnBox = document.createElement('div');
      warnBox.style.cssText = `background: ${isSpeed ? '#fffbeb' : '#f8fafc'}; border: 1px solid ${isSpeed ? '#fde68a' : '#e2e8f0'}; border-radius: 6px; padding: 8px 10px; font-size: 12px; line-height: 1.4; color: ${isSpeed ? '#78350f' : '#334155'}; margin-top: 2px;`;
      warnBox.innerHTML = `<strong>⚠️ Warning:</strong> ${escapeHTML(c.warning || 'Changing this factor alters robot movement dynamics. Ensure clear mechanical workspace.')}`;

      card.appendChild(header);
      card.appendChild(valuesRow);
      card.appendChild(warnBox);
      listEl.appendChild(card);
    });

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
    fields.forEach((field, index) => {
      field.replaceChildren(new Option(data.ports.length ? 'Select serial port' : 'No ports found · refresh to retry', ''));
      data.ports.forEach(p => field.add(new Option(`${p.device} · ${p.description}`, p.device)));
      if (data.ports.some(p => p.device === previous[index])) field.value = previous[index];
    });
    const hero = $('hero-port');
    if (hero) {
      hero.replaceChildren(new Option(data.ports.length ? 'Select serial port' : 'No ports found', ''));
      data.ports.forEach(p => hero.add(new Option(`${p.device} · ${p.description}`, p.device)));
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

function renderDiagnostics(data) {
  if (!data || !data.servos) return;
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
    if (s.reg8 !== undefined || s.status !== undefined) {
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
  if ($('execution').value === 'hardware' && !currentIsOperator) {
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

    if (currentIsOperator && changes.length > 0) {
      const confirmed = await confirmParameterChanges(changes, 'Confirm Motion Trial Parameters');
      if (!confirmed) return;
    }

    const execution = $('execution').value;
    const simulationTracking = execution === 'simulation' ? window.getSimulationTracking() : undefined;
    await api('start', {
      request_id: crypto.randomUUID(),
      mode: 'gait',
      execution,
      ...(simulationTracking ? {simulation_tracking: simulationTracking} : {}),
      port: $('port').value,
      ...draft,
      ...(execution === 'simulation' ? {speed: window.getSimulationSpeed()} : {})
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
  $('preset-selection-status').textContent = selected
    ? `${selected.name} selected. Load to review in Operate.`
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
  selectedPresetName = p.name;
  document.querySelectorAll('input[name="gait-preset-choice"]').forEach(radio => {
    radio.checked = radio.value === p.name;
  });
  $('operate-preset').value = p.name;
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

  (data.runs || []).forEach(r => {
    const tr = document.createElement('tr');
    const dateStr = new Date(r.timestamp * 1000).toLocaleString();
    const ann = r.annotations || {};
    tr.innerHTML = `
      <td><code>${r.run_id}</code></td>
      <td>${dateStr}</td>
      <td>${r.mode}</td>
      <td>${r.execution}</td>
      <td>${r.duration ?? '—'}s</td>
      <td>${r.speed ?? '—'}</td>
      <td>
        ${r.has_csv ? `<a href="/api/gen3/log/${r.run_id}.csv" class="btn-sm">CSV</a>` : ''}
        <a href="/api/gen3/log/${r.run_id}.json" class="btn-sm">JSON</a>
      </td>
      <td>
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
        </div>
      </td>
      <td><button type="button" class="btn-sm btn-repeat">Repeat to Draft</button></td>
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

    tr.querySelector('.btn-repeat').onclick = async () => {
      const full = await fetch(`/api/gen3/log/${r.run_id}.json`).then(res => res.json());
      if (full) {
        if (full.joint_map?.speed) $('speed').value = full.joint_map.speed;
        if (full.duration) $('duration').value = full.duration;
        if (full.ramp) $('ramp').value = full.ramp;
        if (full.values) {
          $('yaw').value = ((full.values[0] * 180) / Math.PI).toFixed(1);
          $('pitch').value = ((full.values[1] * 180) / Math.PI).toFixed(1);
          $('bias').value = ((full.values[2] * 180) / Math.PI).toFixed(1);
          $('frequency').value = Math.abs(full.values[3]);
          $('direction').value = full.values[3] < 0 ? '-1' : '1';
          $('lag').value = Math.round((full.values[4] * 180) / Math.PI);
          $('offset').value = Math.round((full.values[5] * 180) / Math.PI);
        }
        updateSpeedDemand();
        document.getElementById('tab-operate').click();
      }
    };

    tbody.append(tr);
  });
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

async function poll() {
  try {
    const state = await api('status', undefined, 'GET');
    if (!statusOnline) showError(null);
    statusOnline = true;
    $('btn-save-preset').disabled = !currentIsOperator || pendingAction;
    $('status').textContent = state.status;
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
    appliedSettings = state.busy ? state.active_settings : null;

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
    checkDraftDifferences();

    // Render Telemetry Table with in-place row reuse
    const tbody = $('telemetry-body');
    let hasFeedback = false;
    const existingRows = tbody.children;

    for (let id = 1; id <= 10; id++) {
      const data = state.telemetry[id];
      const axis = (currentConfig && currentConfig.joints && currentConfig.joints[id - 1]) ? currentConfig.joints[id - 1].axis : (id % 2 === 1 ? 'pitch' : 'yaw');
      const target = data?.target ?? '—';
      const pos = data?.position ?? '—';
      let errStr = '—';
      if (typeof target === 'number' && typeof pos === 'number') {
        const err = Math.abs(pos - target);
        errStr = err > 25 ? `<span class="text-danger font-bold">${err}</span>` : String(err);
      }
      if (data?.valid) hasFeedback = true;

      const rowHtml = `
        <td><strong>${id}</strong></td>
        <td>${axis}</td>
        <td>${!data ? 'Not sampled' : data.valid ? '<span class="text-success">Valid</span>' : '<span class="text-danger font-bold">Missing/Invalid</span>'}</td>
        <td>${target}</td>
        <td>${pos}</td>
        <td>${errStr}</td>
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
    const res = await fetch('/api/system_stats');
    if (res.ok) {
      const data = await res.json();
      const cpuEl = $('sys-cpu');
      const ramEl = $('sys-ram');
      const tempEl = $('sys-temp');
      const formatPercent = v => (v === null || v === undefined || v === 'N/A' || !Number.isFinite(Number(v))) ? 'N/A' : `${Number(v).toFixed(1)}%`;
      if (cpuEl) cpuEl.textContent = formatPercent(data.cpu);
      if (ramEl) ramEl.textContent = formatPercent(data.ram);
      if (tempEl) tempEl.textContent = formatUnit(data.temp, '°C');
    }
  } catch (_) {}
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
  async function updateLoop() {
    await poll();
    await pollSystemStats();
    setTimeout(updateLoop, 400);
  }
  setTimeout(updateLoop, 400);
})();


// --- Marquee Banner Pause / Play Toggle (WCAG 2.2.2 & Session Memory) ---
function initMarqueeToggle() {
  const banner = document.querySelector('.marquee-banner');
  const toggleBtn = document.getElementById('marquee-toggle');
  if (!banner || !toggleBtn) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sessionPref = sessionStorage.getItem('marquee-paused');
  let isPaused = sessionPref !== null ? sessionPref === 'true' : prefersReducedMotion;

  function applyState(paused) {
    banner.classList.toggle('is-paused', paused);
    toggleBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    toggleBtn.setAttribute('aria-label', paused ? 'Play announcement ticker' : 'Pause announcement ticker');
    const icon = toggleBtn.querySelector('.marquee-toggle-icon');
    const label = toggleBtn.querySelector('.marquee-toggle-label');
    if (icon) icon.textContent = paused ? '▶' : '❚❚';
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

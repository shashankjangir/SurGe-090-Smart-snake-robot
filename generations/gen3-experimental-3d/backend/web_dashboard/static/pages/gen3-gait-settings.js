'use strict';

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
    badge.textContent = 'EXCEEDS LIMIT';
    badge.hidden = !exceeds;
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

'use strict';

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
      : `${$('port').value || 'No port selected'} · ${currentIsOperator ? 'operator lease active' : 'viewer'} · ${state.busy ? 'busy' : 'stopped'}`;
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
      $('applied-readout').textContent = 'Applied: No active motion';
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

    for (let id = 1; id <= JOINT_COUNT; id++) {
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
    await loadPresets().catch(error => { $('preset-save-status').textContent = error.message; });
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMarqueeToggle);
} else {
  initMarqueeToggle();
}

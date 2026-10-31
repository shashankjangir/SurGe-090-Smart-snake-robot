/**
 * SURGE 090 — Gen 3 3D Simulation Frontend Controller
 * Alternating-axis spatial kinematics (5 pitch + 5 yaw joints, 11 links)
 * Interactive 3D perspective viewport, presets, physics tuning & telemetry
 */
(() => {
  'use strict';

  // Confirmed Gen 3 Hardware Calibration (joint_map.json / docs/GEN3_HANDOFF.md)
  // Pitch ID 1 = 1; Pitch IDs 3, 5, 7, 9 = -1; all Yaw IDs = 1. Neutral = 2048 counts.
  const JOINT_SPECS = [
    { id: 1, axis: 'pitch', sign: 1, zero: 2048, label: 'Pitch 1' },
    { id: 2, axis: 'yaw',   sign: 1, zero: 2048, label: 'Yaw 2' },
    { id: 3, axis: 'pitch', sign: -1, zero: 2048, label: 'Pitch 3' },
    { id: 4, axis: 'yaw',   sign: 1, zero: 2048, label: 'Yaw 4' },
    { id: 5, axis: 'pitch', sign: -1, zero: 2048, label: 'Pitch 5' },
    { id: 6, axis: 'yaw',   sign: 1, zero: 2048, label: 'Yaw 6' },
    { id: 7, axis: 'pitch', sign: -1, zero: 2048, label: 'Pitch 7' },
    { id: 8, axis: 'yaw',   sign: 1, zero: 2048, label: 'Yaw 8' },
    { id: 9, axis: 'pitch', sign: -1, zero: 2048, label: 'Pitch 9' },
    { id: 10, axis: 'yaw',  sign: 1, zero: 2048, label: 'Yaw 10' }
  ];

  const COUNTS_PER_DEGREE = 4096.0 / 360.0; // 11.377 counts/deg

  // 3D Spatial Gait Presets
  const PRESETS = {
    sidewinding: {
      name: 'Sidewinding Gait (Lateral Shift)',
      yaw: 30, pitch: 25, freq: 0.50, lag: 90, offset: 90, bias: 0, fric: 20.0, torque: 2.00,
      summary: 'Yaw 30° · Pitch 25° · Offset 90° · Freq 0.50Hz · Lag 90°',
      desc: 'Orthogonal yaw and pitch waves with a 90° phase offset.'
    },
    rolling: {
      name: 'Helical Rolling Gait (Pipe / Obstacle Roll)',
      yaw: 25, pitch: 25, freq: 0.60, lag: 90, offset: 90, bias: 0, fric: 15.0, torque: 2.00,
      summary: 'Yaw 25° · Pitch 25° · Offset 90° · Freq 0.60Hz · Lag 90°',
      desc: 'Yaw and pitch waves with equal amplitudes and a 90° offset.'
    },
    lateral_undulation: {
      name: 'Lateral Undulation (Planar Baseline)',
      yaw: 30, pitch: 0, freq: 0.30, lag: 90, offset: 0, bias: 0, fric: 25.0, torque: 2.00,
      summary: 'Yaw 30° · Pitch 0° · Freq 0.30 Hz · Lag 90°',
      desc: 'Flat-ground simulation route baseline. Only yaw joints oscillate; physical travel is unmeasured.'
    },
    sinus_lifting: {
      name: 'Sinus-Lifting Step (Ground Clearance)',
      yaw: 25, pitch: 30, freq: 0.40, lag: 90, offset: 0, bias: 0, fric: 20.0, torque: 2.20,
      summary: 'Yaw 25° · Pitch 30° · Offset 0° · Freq 0.40Hz · Lag 90°',
      desc: 'Yaw and pitch waves with no phase offset.'
    },
    corkscrew: {
      name: '3D Corkscrew Wave (Spatial Helix)',
      yaw: 30, pitch: 30, freq: 0.50, lag: 90, offset: 45, bias: 0, fric: 20.0, torque: 2.00,
      summary: 'Yaw 30° · Pitch 30° · Offset 45° · Freq 0.50Hz · Lag 90°',
      desc: 'Yaw and pitch waves with a 45° phase offset.'
    },
    custom: {
      name: 'Custom Spatial Parameterization',
      summary: 'User-specified 3D wave kinematics',
      desc: 'Direct parameter sliders tuning dual orthogonal spatial waves.'
    }
  };

  window.SurgeSimulationPresets = PRESETS;

  const DEFAULT_PARAMS = {
    fric: 20.0,
    yaw: 5,
    pitch: 5,
    freq: 0.10,
    lag: 90,
    offset: 90,
    bias: 0,
    torque: 2.00,
    lowpower: false
  };

  // State
  let simRunning = false;
  let simulationState = 'unknown';
  let simulationBusy = false;
  let simOperator = false;
  let connectionPending = false;
  let simulationSettingsDirty = false;
  let simulationLinks = null;
  let simulationPoses = null;
  let simulationHead = null;
  let routeDraft = [];
  let routeSnapshot = null;
  let routeDirty = false;
  let routeDrawing = false;
  let routeRun = null;
  let cameraMode = 'follow';
  let cadView = null;
  let ownedRun = null;
  let snapshotAvailable = false;
  let measuredSamples = Array(10).fill(null);
  let simTime = 0.0;
  let lastFrameTime = performance.now();
  let currentAngles = new Array(10).fill(0); // degrees
  let targetAngles = new Array(10).fill(0);  // degrees
  let robotOrigin = { x: 0, y: 0, z: 0.04 };
  let robotHeading = 0; // degrees

  // Physics parameters
  let activeParams = { ...DEFAULT_PARAMS };

  // Loop control flags and visibility guards (Finding 20)
  let simPollTimeout = null;
  let isSimPolling = false;
  let simPollGeneration = 0;
  let animFrameId = null;
  let isRenderRunning = false;
  let wasSimVisible = false;
  let isResumingSimulation = false;

  function isSimulationVisible() {
    if (typeof document === 'undefined') return true;
    if (document.hidden) return false;
    const panel = typeof $ === 'function' ? $('panel-simulation') : null;
    if (!panel) return true;
    return panel.classList && panel.classList.contains ? panel.classList.contains('active') : true;
  }

  // Camera Orbit Controls
  const camera = {
    yaw: 45 * Math.PI / 180,       // radians around Z
    pitch: -25 * Math.PI / 180,    // radians down from horizontal
    distance: 1.6,                 // distance from target (meters)
    target: { x: -0.5, y: 0, z: 0.1 },
    pan: { x: 0, y: 0 },
    isDragging: false,
    dragButton: 0,
    lastMouseX: 0,
    lastMouseY: 0
  };

  // Helper DOM selectors
  const $ = id => document.getElementById(id);

  // Initialize UI & Event Handlers
  function init() {
    initTelemetryGrid();
    fetch('/api/gen3/map').then(response => response.ok ? response.json() : Promise.reject()).then(data => {
      const joints = (data.config || data).joints;
      if (!Array.isArray(joints) || joints.length !== 10) return;
      joints.forEach((joint, i) => Object.assign(JOINT_SPECS[i], joint));
      const config = data.config || data;
      $('sim-speed-limit').value = config.speed;
      $('sim-position-limits').textContent = joints.map(joint => `ID ${joint.id}: ${joint.min}–${joint.max}`).join(' · ');
      $('sim-tracking-error').value = config.tracking_error;
      $('sim-tracking-timeout').value = config.tracking_timeout;
      for (const id of ['sim-speed-limit', 'sim-tracking-error', 'sim-tracking-timeout', 'sim-tracking-verified']) $(id).disabled = false;
      $('sim-tracking-status').textContent = 'Review and verify the simulation limits before starting.';
      initTelemetryGrid();
    }).catch(() => { $('hud-sim-state').textContent = 'Could not load joint map'; $('sim-tracking-status').textContent = 'Could not load map settings; reload before starting.'; });
    for (const id of ['sim-speed-limit', 'sim-tracking-error', 'sim-tracking-timeout']) {
      $(id).addEventListener('input', () => { $('sim-tracking-verified').checked = false; });
    }
    window.addEventListener('surge-session', event => {
      simOperator = Boolean(event.detail.is_current_operator);
      updateSimulationControls();
    });
    initSliders();
    initPresets();
    initActionButtons();
    initCanvas();
    initRouteControls();
    loadCadVisuals();
    syncUIWithParams();
    syncSimulationActivity();
  }

  // 1. Telemetry Grid Initialization
  function initTelemetryGrid() {
    const grid = $('sim-telemetry-grid');
    if (!grid) return;
    grid.innerHTML = '';

    JOINT_SPECS.forEach(joint => {
      const card = document.createElement('div');
      card.className = 'telem-box';
      card.id = `sim-telem-${joint.id}`;

      const isPitch = joint.axis === 'pitch';
      const headerBg = isPitch ? 'var(--color-mint-pop, #55db9c)' : 'var(--color-electric-blue, #4da2ff)';
      const headerColor = '#000000';

      card.innerHTML = `
        <div class="motor-header" style="background-color: ${headerBg}; color: ${headerColor}; font-weight: 700; display: flex; justify-content: space-between; align-items: center; min-width: 0; overflow: hidden;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">ID ${joint.id} · ${joint.axis.toUpperCase()}</span>
          <span style="font-size: 10px; opacity: 0.9; flex-shrink: 0;">Sign: ${joint.sign > 0 ? '+1' : '-1'}</span>
        </div>
        <div class="data-row">
          <span>Angle</span>
          <span id="sim-ang-${joint.id}" style="font-weight: 700;" title="Simulated angle">Neutral (not measured)</span>
        </div>
        <div class="data-row">
          <span>Counts</span>
          <span id="sim-cnt-${joint.id}" title="Simulated counts">-- (unsampled)</span>
        </div>
        <div class="data-row" id="sim-sample-${joint.id}">Not sampled</div>
        <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 4px;">
          <div id="sim-bar-${joint.id}" style="width: 50%; height: 100%; background: ${isPitch ? '#10b981' : '#06b6d4'}; transition: width 0.05s linear;"></div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // 2. Physics Tuning Sliders
  function initSliders() {
    const sliderBindings = [
      { id: 'sim-param-fric',      valId: 'val-sim-fric',      key: 'fric',      format: v => Number(v).toFixed(1) },
      { id: 'sim-param-yaw-amp',  valId: 'val-sim-yaw-amp',  key: 'yaw',       format: v => Math.round(v) },
      { id: 'sim-param-pitch-amp',valId: 'val-sim-pitch-amp',key: 'pitch',     format: v => Math.round(v) },
      { id: 'sim-param-freq',     valId: 'val-sim-freq',     key: 'freq',      format: v => Number(v).toFixed(2) },
      { id: 'sim-param-lag',      valId: 'val-sim-lag',      key: 'lag',       format: v => Math.round(v) },
      { id: 'sim-param-offset',   valId: 'val-sim-offset',   key: 'offset',    format: v => Math.round(v) },
      { id: 'sim-param-bias',     valId: 'val-sim-bias',     key: 'bias',      format: v => Math.round(v) },
      { id: 'sim-param-torque',   valId: 'val-sim-torque',   key: 'torque',    format: v => Number(v).toFixed(2) }
    ];

    sliderBindings.forEach(binding => {
      const slider = $(binding.id);
      const valSpan = $(binding.valId);
      if (!slider || !valSpan) return;

      slider.addEventListener('input', () => {
        valSpan.textContent = binding.format(slider.value);
        simulationSettingsDirty = true;
      });
    });

    const lowpower = $('sim-param-lowpower');
    if (lowpower) {
      lowpower.addEventListener('change', () => { simulationSettingsDirty = true; });
    }

    const btnApply = $('btn-sim-apply-physics');
    if (btnApply) {
      btnApply.addEventListener('click', async () => {
        const changes = [];
        sliderBindings.forEach(b => {
          const s = $(b.id);
          if (s && Number(s.value) !== activeParams[b.key]) {
            const meta = (window.PARAMETER_METADATA && window.PARAMETER_METADATA[b.key]) || {};
            changes.push({
              key: b.key,
              label: meta.label || b.key,
              unit: meta.unit || '',
              oldVal: activeParams[b.key],
              newVal: Number(s.value),
              warning: meta.warning || 'Alters simulation gait kinematic parameters.'
            });
          }
        });

        if (typeof window.confirmParameterChanges === 'function' && changes.length > 0) {
          const ok = await window.confirmParameterChanges(changes, 'Confirm Simulation Parameters Update');
          if (!ok) return;
        }

        sliderBindings.forEach(b => {
          const s = $(b.id);
          if (s) activeParams[b.key] = Number(s.value);
        });
        if (lowpower) activeParams.lowpower = lowpower.checked;
        simulationSettingsDirty = false;

        const pill = $('sim-physics-applied-pill');
        if (pill) {
          pill.style.display = 'block';
          clearTimeout(pill._timer);
          pill._timer = setTimeout(() => { pill.style.display = 'none'; }, 2200);
        }
      });
    }

    const btnReset = $('btn-sim-reset-physics');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        syncUIWithParams(DEFAULT_PARAMS);
        simulationSettingsDirty = true;

        const pill = $('sim-physics-applied-pill');
        if (pill) {
          pill.textContent = 'Defaults loaded; confirm settings before starting';
          pill.style.display = 'block';
          clearTimeout(pill._timer);
          pill._timer = setTimeout(() => {
            pill.style.display = 'none';
            pill.textContent = '✓ Settings ready for next run';
          }, 2200);
        }
      });
    }
  }

  function syncUIWithParams(params = activeParams) {
    const map = {
      'sim-param-fric': [params.fric, 'val-sim-fric', v => Number(v).toFixed(1)],
      'sim-param-yaw-amp': [params.yaw, 'val-sim-yaw-amp', v => Math.round(v)],
      'sim-param-pitch-amp': [params.pitch, 'val-sim-pitch-amp', v => Math.round(v)],
      'sim-param-freq': [params.freq, 'val-sim-freq', v => Number(v).toFixed(2)],
      'sim-param-lag': [params.lag, 'val-sim-lag', v => Math.round(v)],
      'sim-param-offset': [params.offset, 'val-sim-offset', v => Math.round(v)],
      'sim-param-bias': [params.bias, 'val-sim-bias', v => Math.round(v)],
      'sim-param-torque': [params.torque, 'val-sim-torque', v => Number(v).toFixed(2)]
    };

    Object.entries(map).forEach(([sliderId, [val, spanId, format]]) => {
      const s = $(sliderId);
      const span = $(spanId);
      if (s) s.value = val;
      if (span) span.textContent = format(val);
    });

    const lowpower = $('sim-param-lowpower');
    if (lowpower) lowpower.checked = Boolean(params.lowpower);
  }

  // 3. Preset Selector
  function initPresets() {
    const sel = $('sim-3d-preset');
    const btn = $('btn-load-3d-preset');
    const summary = $('sim-preset-summary');
    const desc = $('sim-preset-description');

    if (!sel) return;

    function updatePresetInfo(key) {
      const p = PRESETS[key] || PRESETS.custom;
      if (summary) summary.textContent = p.summary || '';
      if (desc) desc.textContent = p.desc || '';
    }

    sel.addEventListener('change', () => {
      updatePresetInfo(sel.value);
    });

    if (btn) {
      btn.addEventListener('click', () => {
        const p = PRESETS[sel.value];
        if (p && sel.value !== 'custom') {
          syncUIWithParams({...activeParams, ...p});
          simulationSettingsDirty = true;

          const pill = $('sim-physics-applied-pill');
          if (pill) {
            pill.textContent = `Loaded ${p.name}; confirm settings before starting`;
            pill.style.display = 'block';
            clearTimeout(pill._timer);
            pill._timer = setTimeout(() => {
              pill.style.display = 'none';
              pill.textContent = '✓ Settings ready for next run';
            }, 2200);
          }
        }
      });
    }

    const saveSelect = $('save-preset-pattern');
    const saveDetails = $('save-preset-pattern-details');
    if (saveSelect && saveDetails) {
      for (const [key, preset] of Object.entries(PRESETS)) {
        if (key !== 'custom') saveSelect.add(new Option(preset.name, key));
      }
      saveSelect.addEventListener('change', () => {
        const preset = PRESETS[saveSelect.value];
        saveDetails.textContent = saveSelect.value === 'custom'
          ? 'Uses the current Operate draft.' : `${preset.summary} · ${preset.desc}`;
      });
    }

    updatePresetInfo(sel.value || 'sidewinding');
  }

  function updateSimulationControls() {
    const connect = $('btn-gen3-sim-connect');
    const start = $('btn-gen3-sim-start');
    if (!connect || !start) return;
    connect.textContent = simulationState === 'connected' || simulationState === 'running'
      ? 'Disconnect simulation engine' : simulationState === 'connecting' ? 'Connecting…'
      : simulationState === 'disconnecting' ? 'Disconnecting…' : 'Connect simulation engine';
    connect.disabled = !simOperator || connectionPending || simulationState === 'unknown' ||
      simulationState === 'connecting' || simulationState === 'disconnecting' || (simulationBusy && simulationState !== 'running');
    start.disabled = !simOperator || connectionPending || simulationBusy || simulationState !== 'connected';
    for (const id of ['sim-route-line', 'sim-route-curve', 'sim-route-draw', 'sim-route-clear', 'sim-route-apply', 'sim-route-points']) if ($(id)) $(id).disabled = simulationBusy;
  }

  window.getSimulationSpeed = () => {
    const speed = $('sim-speed-limit');
    if (!speed || speed.disabled || !speed.checkValidity()) throw new Error('Review the simulation speed limit before starting');
    return speed.valueAsNumber;
  };

  window.getSimulationTracking = () => {
    const error = $('sim-tracking-error'), timeout = $('sim-tracking-timeout');
    if (!error || error.disabled || !error.checkValidity() || !timeout.checkValidity() || !$('sim-tracking-verified').checked) {
      throw new Error('Review and verify simulation tracking limits on the 3D Simulation tab first');
    }
    return {tracking_error: error.valueAsNumber, tracking_timeout: timeout.valueAsNumber, verified: true};
  };

  // Start only a finite simulation; hardware remains in the commissioning controls.
  function initActionButtons() {
    const state = $('hud-sim-state');
    async function command(path, body) {
      const response = await fetch('/api/gen3/' + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Request failed');
      return data;
    }
    $('btn-gen3-sim-connect').addEventListener('click', async () => {
      connectionPending = true;
      updateSimulationControls();
      try {
        const disconnect = simulationState === 'connected' || simulationState === 'running';
        const result = await command(`simulation/${disconnect ? 'disconnect' : 'connect'}`, {});
        simulationState = result.state;
        $('sim-connection-status').textContent = `Simulation ${simulationState}`;
      } catch (error) {
        $('sim-connection-status').textContent = `Simulation connection: ${error.message}`;
      } finally {
        connectionPending = false;
        updateSimulationControls();
      }
    });
    $('btn-gen3-sim-start').addEventListener('click', async () => {
      const button = $('btn-gen3-sim-start');
      button.disabled = true;
      try {
        if (simulationSettingsDirty) throw new Error('Confirm gait settings before starting');
        if (routeDraft.length === 1) throw new Error('Add a second route point or clear the route.');
        const tracking = window.getSimulationTracking();
        $('sim-tracking-status').textContent = 'Simulation tracking limits verified for this run.';
        await command('start', { request_id: crypto.randomUUID(), mode: 'gait', execution: 'simulation',
          simulation_tracking: tracking,
          ...(routeDraft.length >= 2 ? { simulation_path: routeDraft } : {}),
          yaw: activeParams.yaw, pitch: activeParams.pitch, frequency: activeParams.freq,
          lag: activeParams.lag, offset: activeParams.offset, bias: activeParams.bias,
          duration: routeDraft.length >= 2 ? 120 : 30, ramp: 2, speed: window.getSimulationSpeed() });
        const response = await fetch('/api/gen3/status');
        if (!response.ok) throw new Error('Could not read simulation status');
        const status = await response.json();
        ownedRun = status.execution === 'simulation' ? status.run_id : null;
        routeDirty = false;
        routeDrawing = false;
        $('sim-route-draw').setAttribute('aria-pressed', 'false');
        state.textContent = 'Starting PyBullet simulation';
      } catch (error) {
        state.textContent = `Start failed: ${error.message}`;
        $('sim-tracking-status').textContent = `Start failed: ${error.message}`;
      } finally { updateSimulationControls(); }
    });
    $('btn-gen3-sim-reset').addEventListener('click', () => {
      resetCamera();
    });
  }

    async function pollSimulation() {
      if (typeof isSimulationVisible === 'function' && !isSimulationVisible()) {
        isSimPolling = false;
        simPollTimeout = null;
        return;
      }
      isSimPolling = true;
      const generation = simPollGeneration;
      const state = $('hud-sim-state');
      try {
        const response = await fetch('/api/gen3/status');
        if (!response.ok) throw new Error('Status unavailable');
        const status = await response.json();
        if (generation !== simPollGeneration) return;
        isResumingSimulation = false;
        simulationState = status.simulation_state || 'unknown';
        simulationBusy = Boolean(status.busy);
        $('sim-connection-status').textContent = status.simulation_error
          ? `Simulation connection failed: ${status.simulation_error}` : `Simulation ${simulationState}`;
        updateSimulationControls();
        if (status.execution === 'simulation') syncRouteStatus(status);
        if (status.execution === 'simulation' && ['connected', 'running'].includes(simulationState) && (status.busy || status.simulation_links)) {
          simRunning = status.busy;
          if (status.simulation_links) simulationLinks = status.simulation_links;
          simulationPoses = status.simulation_poses || null;
          simulationHead = status.simulation_head || null;
          state.textContent = status.status;
          if (status.telemetry) {
            snapshotAvailable = true;
            for (let i = 0; i < 10; i++) {
              const joint = JOINT_SPECS[i];
              const row = status.telemetry[joint.id];
              if (row && Number.isFinite(row.position)) {
                measuredSamples[i] = { position: row.position, at: Date.now() / 1000.0, valid: row.valid !== false };
                currentAngles[joint.id - 1] = (row.position - joint.zero) / (joint.sign * COUNTS_PER_DEGREE);
              }
            }
          }
        } else {
          simRunning = false;
          simulationLinks = null;
          simulationPoses = null;
          simulationHead = null;
          snapshotAvailable = false;
          if (state) state.textContent = simulationState === 'error' ? status.simulation_error || status.status : 'No active simulation';
        }
        if (typeof MotionState !== 'undefined') {
          MotionState.render(['btn-gen3-sim-start'], MotionState.classify(status.status, Boolean(status.busy)));
        }
      } catch (_) {
        if (generation !== simPollGeneration) return;
        isResumingSimulation = false;
        simulationState = 'unknown';
        updateSimulationControls();
        $('sim-connection-status').textContent = 'Simulation status unavailable';
        snapshotAvailable = false;
        simulationLinks = null; simulationPoses = null; simulationHead = null;
        if (state) state.textContent = 'Simulation status unavailable';
        if (typeof MotionState !== 'undefined') {
          MotionState.render(['btn-gen3-sim-start'], 'unknown');
        }
      }
      if (generation !== simPollGeneration) return;
      if (typeof isSimulationVisible === 'function' && isSimulationVisible()) {
        simPollTimeout = setTimeout(pollSimulation, 100);
      } else {
        isSimPolling = false;
        simPollTimeout = null;
      }
    }
  function resetCamera() {
    camera.yaw = Math.PI / 4;
    camera.pitch = -25 * Math.PI / 180;
    camera.distance = 1.6;
    camera.target = { x: -0.5, y: 0, z: 0.1 };
    cameraMode = 'follow';
    $('sim-camera-mode').value = cameraMode;
    updateCameraHUD();
  }

  function setRouteDraft(points) {
    routeDraft = points; routeDirty = true; routeSnapshot = null;
    $('sim-route-points').value = points.map(p => p.map(v => v.toFixed(3)).join(', ')).join('\n');
    $('sim-route-status').textContent = points.length ? `Draft · ${points.length} points · simulation only` : 'No route · free gait run';
  }

  function overview() {
    const points = [...routeDraft, ...(simulationLinks || [[-.05, 0], [-1.05, 0]])];
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    camera.target = {x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, z: 0};
    camera.pitch = -1.4; camera.yaw = 0;
    const canvas = $('gen3SimCanvas');
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 2);
    camera.distance = Math.min(150, Math.max(3, 1.4 * span * 480 / Math.max(160, Math.min(canvas.clientWidth, canvas.clientHeight))));
    updateCameraHUD();
  }

  function initRouteControls() {
    $('sim-camera-mode').addEventListener('change', e => {
      cameraMode = e.target.value;
      if (cameraMode === 'overview') overview();
      updateCameraHUD();
    });
    $('sim-fullscreen-stop').addEventListener('click', () => $('floating-stop-btn').click());
    $('sim-fullscreen').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await $('sim-canvas-hub').requestFullscreen();
      } catch (_) { $('sim-route-status').textContent = 'Fullscreen unavailable in this browser.'; }
    });
    document.addEventListener('fullscreenchange', () => {
      $('sim-fullscreen').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
    });
    for (const shape of ['line', 'curve']) {
      $(`sim-route-${shape}`).addEventListener('click', () => {
        if (simulationBusy) return;
        const start = simulationHead?.position || [-.05, 0, .04], yaw = simulationHead?.yaw || 0;
        setRouteDraft(Array.from({length: 41}, (_, i) => {
          const x = i * .04, y = shape === 'curve' ? .1 * Math.sin(2 * Math.PI * i / 40) : 0;
          return [start[0] + x * Math.cos(yaw) - y * Math.sin(yaw), start[1] + x * Math.sin(yaw) + y * Math.cos(yaw)];
        }));
        overview();
      });
    }
    $('sim-route-clear').addEventListener('click', () => { if (!simulationBusy) setRouteDraft([]); });
    $('sim-route-draw').addEventListener('click', () => {
      if (simulationBusy) return;
      routeDrawing = !routeDrawing;
      $('sim-route-draw').setAttribute('aria-pressed', String(routeDrawing));
      if (routeDrawing) {
        setRouteDraft([]); overview();
        cameraMode = 'free'; $('sim-camera-mode').value = cameraMode; updateCameraHUD();
        $('sim-route-status').textContent = 'Draw: click points or drag on the ground. Select Draw route again to finish.';
      }
    });
    $('sim-route-apply').addEventListener('click', () => {
      if (simulationBusy) return;
      try {
        const points = $('sim-route-points').value.trim().split(/\n/).filter(line => line.trim()).map(line => {
          const fields = line.trim().split(/[,\s]+/);
          if (fields.length !== 2 || fields.some(v => !Number.isFinite(Number(v)) || Math.abs(Number(v)) > 50)) throw new Error('Use x, y pairs within ±50 m.');
          return fields.map(Number);
        });
        if (points.length < 2 || points.length > 500) throw new Error('Enter 2–500 points.');
        setRouteDraft(points); overview();
      } catch (error) { $('sim-route-status').textContent = error.message; }
    });
  }

  function groundPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = (event.clientX - rect.left - rect.width / 2) / 480;
    const sy = -(event.clientY - rect.top - rect.height / 2) / 480;
    const cp = Math.cos(-camera.pitch), sp = Math.sin(-camera.pitch);
    const depth = (-camera.target.z - sp * camera.distance) / (-sp + cp * sy);
    if (!Number.isFinite(depth) || depth < .1) return null;
    const x = sx * depth, y = cp * (depth - camera.distance) + sp * sy * depth;
    const point = [camera.target.x + x * Math.cos(camera.yaw) - y * Math.sin(camera.yaw), camera.target.y + x * Math.sin(camera.yaw) + y * Math.cos(camera.yaw)];
    return point.every(v => Number.isFinite(v) && Math.abs(v) <= 50) ? point : null;
  }

  function syncRouteStatus(status) {
    if (routeRun !== status.run_id && !status.simulation_route && status.busy) {
      routeSnapshot = null; routeDraft = []; routeRun = status.run_id; routeDirty = false;
      $('sim-route-status').textContent = 'No route · free gait run';
    }
    for (const id of ['sim-route-line', 'sim-route-curve', 'sim-route-draw', 'sim-route-clear', 'sim-route-apply', 'sim-route-points']) $(id).disabled = Boolean(status.busy);
    if (status.simulation_route && (!routeDirty || status.busy)) {
      routeSnapshot = status.simulation_route;
      if (routeRun !== status.run_id) {
        routeRun = status.run_id; routeDirty = false; routeDraft = routeSnapshot.target_path;
        $('sim-route-points').value = routeDraft.map(p => p.join(', ')).join('\n');
      }
      const rejected = routeSnapshot.rejected_samples ? ` · ${routeSnapshot.rejected_samples} pose jumps rejected` : '';
      const gap = Number.isFinite(routeSnapshot.error_m) ? ` · deviation ${routeSnapshot.error_m.toFixed(2)} m` : '';
      $('sim-route-status').textContent = `${routeSnapshot.state} · ${(routeSnapshot.progress * 100).toFixed(0)}% ordered progress${gap}${rejected}`;
    }
  }

  function drawRouteOverlay(ctx, width, height) {
    function line(points, color, dashed) {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash(dashed ? [8, 5] : []);
      ctx.beginPath(); let previous = false;
      for (const point of points) {
        const p = project3D(point[0], point[1], point[2] ?? .008, width, height);
        if (p) { if (previous) ctx.lineTo(p.u, p.v); else ctx.moveTo(p.u, p.v); }
        previous = Boolean(p);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    line(routeDraft, '#4da2ff', true);
    if (routeSnapshot) line(routeSnapshot.actual_path, '#fb4903', false);
    for (const [point, color] of [[routeDraft.at(-1), '#4da2ff'], [routeSnapshot?.target, '#ffd731']]) {
      if (!point) continue;
      const p = project3D(point[0], point[1], .015, width, height);
      if (p) { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.arc(p.u, p.v, 7, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  async function loadCadVisuals() {
    try {
      if (!window.THREE) throw new Error('3D library unavailable');
      const response = await fetch('/static/models/gen3-cad.json');
      if (!response.ok) throw new Error('CAD asset unavailable');
      const model = await response.json(), T = window.THREE;
      const renderer = new T.WebGLRenderer({antialias: true});
      renderer.setClearColor(0x0f172a);
      renderer.domElement.className = 'sim-cad-layer';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      $('gen3SimCanvas').before(renderer.domElement);
      const scene = new T.Scene();
      const grid = new T.GridHelper(10, 20, 0x50647e, 0x334155);
      grid.rotation.x = Math.PI / 2; scene.add(grid);
      scene.add(new T.HemisphereLight(0xffffff, 0x36465b, 1.4));
      const light = new T.DirectionalLight(0xffffff, 1.1);
      light.position.set(2, -3, 5); scene.add(light);
      const meshes = model.meshes.map(part => {
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(part.vertices.flat(), 3));
        geometry.setIndex(part.faces.flat()); geometry.computeVertexNormals();
        const material = new T.MeshStandardMaterial({color: part.color, roughness: .7, metalness: .15, side: T.DoubleSide});
        return {...part, geometry, material};
      });
      const bodies = Array.from({length: 11}, (_, i) => {
        const body = new T.Group(), parts = new T.Group();
        for (const part of meshes) {
          if (part.kind === 'motor' && i >= 10) continue;
          parts.add(new T.Mesh(part.geometry, part.material));
        }
        if (i < 10 && JOINT_SPECS[i].axis === 'yaw') parts.rotation.x = Math.PI / 2;
        body.add(parts); scene.add(body); return body;
      });
      // shortcut: board dimensions are illustrative until the driver assembly is measured.
      const driverResources = [
        {geometry: new T.BoxGeometry(.055, .026, .003), material: new T.MeshStandardMaterial({color: 0x227a52, roughness: .8})},
        {geometry: new T.BoxGeometry(.018, .014, .004), material: new T.MeshStandardMaterial({color: 0xa3acb8, metalness: .5, roughness: .5})}
      ];
      driverResources.forEach((part, i) => {
        const mesh = new T.Mesh(part.geometry, part.material);
        mesh.position.z = .025 + i * .004;
        bodies[10].add(mesh);
      });
      cadView = {renderer, scene, bodies, meshes, driverResources, grid, camera: new T.PerspectiveCamera(50, 1, .05, 300)};
      renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault(); disposeCad();
        $('sim-model-status').textContent = '3D context lost · simplified view available. Reload to restore CAD.';
      });
      $('sim-model-status').textContent = '10 motors · 11 connectors · ID 10: Waveshare bus servo driver + ESP32 (board proxy). Connector STEP revision, mounting and 0.1 m spacing unverified; physics illustrative. Battery section excluded.';
    } catch (_) {
      disposeCad();
      $('sim-model-status').textContent = 'CAD view unavailable · simplified model shown. Assembly, mass and contact remain illustrative.';
    }
  }

  function disposeCad() {
    if (!cadView) return;
    const view = cadView; cadView = null;
    for (const part of [...view.meshes, ...view.driverResources]) { part.geometry.dispose(); part.material.dispose(); }
    view.grid.geometry.dispose(); view.grid.material.dispose();
    view.renderer.dispose(); view.renderer.domElement.remove();
  }

  function renderCad(width, height, dpr) {
    const {renderer, scene, camera: view, bodies} = cadView;
    if (cadView.width !== width || cadView.height !== height || cadView.dpr !== dpr) {
      renderer.setPixelRatio(Math.min(2, dpr)); renderer.setSize(width, height, false);
      cadView.width = width; cadView.height = height; cadView.dpr = dpr;
      view.fov = 2 * Math.atan(height / 960) * 180 / Math.PI;
      view.aspect = width / height; view.updateProjectionMatrix();
    }
    cadView.grid.position.set(Math.round(camera.target.x * 2) / 2, Math.round(camera.target.y * 2) / 2, 0);
    const cp = Math.cos(-camera.pitch), sp = Math.sin(-camera.pitch), cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
    view.position.set(camera.target.x + sy * cp * camera.distance, camera.target.y - cy * cp * camera.distance, camera.target.z + sp * camera.distance);
    view.up.set(-sy * sp, cy * sp, cp); view.lookAt(camera.target.x, camera.target.y, camera.target.z);
    bodies.forEach((body, i) => {
      const pose = simulationPoses?.[i];
      body.position.set(...(pose?.position || simulationLinks?.[i] || [-.05 - i * .1, 0, .04]));
      body.quaternion.set(...(pose?.quaternion || [0, 0, 0, 1]));
    });
    renderer.render(scene, view);
  }

  // 6. Interactive 3D Perspective Canvas Engine
  function initCanvas() {
    const canvas = $('gen3SimCanvas');
    if (!canvas) return;

    const activePointers = new Map();
    let initialPointersDist = 0;
    let drawingPointer = null;
    let initialCameraDist = 2.2;

    // Keyboard controls for 3D Camera
    canvas.addEventListener('keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', '+', '=', '-'].includes(e.key)) e.preventDefault();
      if (e.shiftKey && ['ArrowUp', 'ArrowDown'].includes(e.key)) {
        cameraMode = 'free'; $('sim-camera-mode').value = cameraMode;
      }
      if (['+', '='].includes(e.key)) camera.distance = Math.max(.8, camera.distance * .9);
      if (e.key === '-') camera.distance = Math.min(150, camera.distance * 1.1);
      if (e.key === 'ArrowLeft') {
        camera.yaw -= 0.05;
        updateCameraHUD();
      } else if (e.key === 'ArrowRight') {
        camera.yaw += 0.05;
        updateCameraHUD();
      } else if (e.key === 'ArrowUp') {
        if (e.shiftKey) {
          camera.target.x += 0.05;
        } else {
          camera.pitch = Math.min(0.2, camera.pitch + 0.05);
        }
        updateCameraHUD();
      } else if (e.key === 'ArrowDown') {
        if (e.shiftKey) {
          camera.target.x -= 0.05;
        } else {
          camera.pitch = Math.max(-1.4, camera.pitch - 0.05);
        }
        updateCameraHUD();
      } else if (e.key === 'Home') {
        resetCamera();
      }
      updateCameraHUD();
    });

    // Camera action buttons
    document.querySelectorAll('[data-camera]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.camera;
        if (action === 'zoom-in') {
          camera.distance = Math.max(0.8, camera.distance * 0.9);
        } else if (action === 'zoom-out') {
          camera.distance = Math.min(150, camera.distance * 1.1);
        } else if (action === 'reset') {
          resetCamera();
        }
        updateCameraHUD();
      });
    });

    // Pointer events (unifies mouse and touch with pointer capture)
    canvas.addEventListener('pointerdown', e => {
      if (routeDrawing && e.button === 0) {
        e.preventDefault();
        drawingPointer = e.pointerId;
        canvas.setPointerCapture?.(e.pointerId);
        const point = groundPoint(e, canvas);
        if (point && routeDraft.length < 500) setRouteDraft([...routeDraft, point]);
        return;
      }
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (typeof canvas.setPointerCapture === 'function') {
        canvas.setPointerCapture(e.pointerId);
      }
      if (activePointers.size === 1) {
        camera.isDragging = true;
        camera.dragButton = e.button;
        camera.lastMouseX = e.clientX;
        camera.lastMouseY = e.clientY;
        if (canvas.style) canvas.style.cursor = 'grabbing';
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        initialPointersDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        initialCameraDist = camera.distance;
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (routeDrawing && drawingPointer === e.pointerId) {
        const point = groundPoint(e, canvas), last = routeDraft.at(-1);
        if (point && routeDraft.length < 500 && (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) > .03)) setRouteDraft([...routeDraft, point]);
        return;
      }
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (initialPointersDist > 0 && currentDist > 0) {
          camera.distance = Math.max(0.8, Math.min(150, initialCameraDist * (initialPointersDist / currentDist)));
          updateCameraHUD();
        }
        return;
      }
      if (!camera.isDragging || activePointers.size === 0) return;
      const dx = e.clientX - camera.lastMouseX;
      const dy = e.clientY - camera.lastMouseY;
      camera.lastMouseX = e.clientX;
      camera.lastMouseY = e.clientY;

      if (camera.dragButton === 0 && !e.shiftKey) {
        camera.yaw -= dx * 0.008;
        camera.pitch = Math.max(-1.4, Math.min(0.2, camera.pitch + dy * 0.008));
      } else {
        cameraMode = 'free'; $('sim-camera-mode').value = cameraMode;
        const cosY = Math.cos(camera.yaw);
        const sinY = Math.sin(camera.yaw);
        camera.target.x += (-sinY * dx + cosY * dy) * 0.002 * (camera.distance / 2);
        camera.target.y += (cosY * dx + sinY * dy) * 0.002 * (camera.distance / 2);
      }
      updateCameraHUD();
    });

    canvas.addEventListener('pointerup', e => {
      if (drawingPointer === e.pointerId) drawingPointer = null;
      if (typeof canvas.releasePointerCapture === 'function' && canvas.hasPointerCapture?.(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      activePointers.delete(e.pointerId);
      if (activePointers.size === 1) {
        camera.isDragging = true;
        const remaining = Array.from(activePointers.values())[0];
        camera.lastMouseX = remaining.x;
        camera.lastMouseY = remaining.y;
      } else if (activePointers.size === 0) {
        camera.isDragging = false;
        if (canvas.style) canvas.style.cursor = 'grab';
      }
    });

    function cancelCameraDrag(e) {
      drawingPointer = null;
      if (e && e.pointerId != null) {
        activePointers.delete(e.pointerId);
      } else {
        activePointers.clear();
      }
      if (activePointers.size === 1) {
        camera.isDragging = true;
        const remaining = Array.from(activePointers.values())[0];
        camera.lastMouseX = remaining.x;
        camera.lastMouseY = remaining.y;
      } else if (activePointers.size === 0) {
        camera.isDragging = false;
        if (canvas.style) canvas.style.cursor = 'grab';
      }
    }

    canvas.addEventListener('pointercancel', cancelCameraDrag);
    canvas.addEventListener('lostpointercapture', cancelCameraDrag);
    window.addEventListener('blur', () => {
      camera.isDragging = false;
      activePointers.clear();
      if (canvas.style) canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      camera.distance = Math.max(0.8, Math.min(150, camera.distance * zoomFactor));
      updateCameraHUD();
    }, { passive: false });

    updateCameraHUD();
  }

  function updateCameraHUD() {
    const viewEl = $('hud-cam-view');
    if (viewEl) viewEl.textContent = cameraMode === 'follow' ? 'Follow ID 1 head' : cameraMode === 'overview' ? 'Route overview' : 'Free camera';
    const anglesEl = $('hud-cam-angles');
    if (anglesEl) {
      const yawDeg = Math.round(camera.yaw * 180 / Math.PI) % 360;
      const pitchDeg = Math.round(camera.pitch * 180 / Math.PI);
      const zoom = (1.6 / camera.distance).toFixed(1);
      anglesEl.textContent = `Yaw ${yawDeg}° | Pitch ${pitchDeg}° | Zoom ${zoom}x`;
    }
  }

  // 3D Math & Projection
  function project3D(x, y, z, width, height) {
    // Translate relative to camera target
    const tx = x - camera.target.x;
    const ty = y - camera.target.y;
    const tz = z - camera.target.z;

    // Rotate by camera yaw around Z
    const cosY = Math.cos(-camera.yaw);
    const sinY = Math.sin(-camera.yaw);
    const x1 = tx * cosY - ty * sinY;
    const y1 = tx * sinY + ty * cosY;
    const z1 = tz;

    // Rotate by camera pitch around X
    const cosP = Math.cos(-camera.pitch);
    const sinP = Math.sin(-camera.pitch);
    const x2 = x1;
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;

    // Camera offset along depth (Y2 is depth in standard OpenGL-ish view)
    const depth = y2 + camera.distance;
    if (depth < 0.1) return null; // behind camera

    // Perspective projection
    const fov = 480; // focal length in pixels
    const u = (x2 / depth) * fov + width / 2;
    const v = (-z2 / depth) * fov + height / 2;

    return { u, v, depth, scale: fov / depth };
  }

  function samplePresentation(sample, nowMs) {
    const isAvail = typeof snapshotAvailable !== 'undefined' ? snapshotAvailable : false;
    const nowSec = (nowMs != null ? nowMs : Date.now()) / 1000.0;
    if (!isAvail || !sample || sample.valid === false) {
      return { label: 'Stale (no valid sample)', stale: true };
    }
    const sampleTime = sample.at != null ? sample.at : nowSec;
    const age = Math.max(0, nowSec - sampleTime);
    if (age > 1.0) {
      return { label: `Stale (${age.toFixed(1)} s old)`, stale: true };
    }
    return { label: `Sampled · ${age.toFixed(1)} s old`, stale: false };
  }

  // Main Render Loop
  function renderLoop(now) {
    if (typeof isSimulationVisible === 'function' && !isSimulationVisible()) {
      if (typeof isRenderRunning !== 'undefined') isRenderRunning = false;
      animFrameId = null;
      return;
    }
    if (typeof isRenderRunning !== 'undefined') isRenderRunning = true;
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000.0);
    lastFrameTime = now;

    const samples = typeof measuredSamples !== 'undefined' ? measuredSamples : [];
    const nowMs = Date.now();

    // Update Telemetry Grid Readouts
    for (let i = 0; i < 10; i++) {
      const joint = JOINT_SPECS[i];
      const ang = currentAngles[i];
      const sample = samples[i];
      const angEl = $(`sim-ang-${joint.id}`);
      const cntEl = $(`sim-cnt-${joint.id}`);
      const barEl = $(`sim-bar-${joint.id}`);
      const sampleEl = $(`sim-sample-${joint.id}`);

      if (angEl) {
        if (!sample) {
          angEl.textContent = 'Neutral (not measured)';
        } else {
          angEl.textContent = `${ang >= 0 ? '+' : ''}${ang.toFixed(1)}°`;
        }
      }
      if (cntEl) {
        if (!sample) {
          cntEl.textContent = '-- (unsampled)';
        } else {
          cntEl.textContent = sample.position != null ? sample.position : Math.round(joint.zero + joint.sign * ang * COUNTS_PER_DEGREE);
        }
      }
      if (barEl) {
        // Percentage from -70° to +70°
        const pct = Math.max(0, Math.min(100, ((ang + 70) / 140) * 100));
        barEl.style.width = `${pct}%`;
      }
      if (sampleEl) {
        sampleEl.textContent = samplePresentation(sample, nowMs).label;
      }
    }

    if (cameraMode === 'follow' && !routeDrawing && !camera.isDragging && simulationHead) {
      const p = simulationHead.position, alpha = 1 - Math.exp(-8 * Math.max(0, dt));
      camera.target.x += (p[0] - camera.target.x) * alpha;
      camera.target.y += (p[1] - camera.target.y) * alpha;
      camera.target.z += (Math.max(.08, p[2]) - camera.target.z) * alpha;
    }
    draw3DScene();

    if (typeof animFrameId !== 'undefined') {
      animFrameId = requestAnimationFrame(renderLoop);
    } else {
      requestAnimationFrame(renderLoop);
    }
  }

  // Draw Scene on Canvas
  function draw3DScene() {
    const canvas = $('gen3SimCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas sizing (respect High-DPI)
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    if (!cadView) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Subtle vignette
    const grad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width * 0.7);
    grad.addColorStop(0, 'rgba(30, 41, 59, 0.6)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    }
    if (cadView) renderCad(width, height, dpr);
    // 1. Draw 3D Ground Grid at Z = 0
    if (!cadView) drawGroundGrid(ctx, width, height);

    // PyBullet publishes actual world-space link centers; neutral is shown before the first run.
    const positions = simulationLinks || Array.from({ length: 11 }, (_, i) => [-0.05 - i * 0.1, 0, 0.04]);
    const segments = positions.map((position, i) => ({
      index: i, isHead: i === 0, isDriver: i === positions.length - 1, joint: i ? JOINT_SPECS[i - 1] : null,
      x: position[0], y: position[1], z: position[2]
    }));

    drawRouteOverlay(ctx, width, height);
    // 3. Draw Ground Shadows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (let i = 0; !cadView && i < segments.length - 1; i++) {
      const p1 = project3D(segments[i].x, segments[i].y, 0.002, width, height);
      const p2 = project3D(segments[i + 1].x, segments[i + 1].y, 0.002, width, height);
      if (p1 && p2) {
        ctx.beginPath();
        ctx.lineWidth = Math.max(2, 10 * p1.scale / 480);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineCap = 'round';
        ctx.moveTo(p1.u, p1.v);
        ctx.lineTo(p2.u, p2.v);
        ctx.stroke();
      }
    }

    // 4. Sort and Draw Robot Links & Joints in 3D Perspective (Painter's Algorithm)
    const drawElements = [];

    for (let i = 0; i < segments.length - 1; i++) {
      const s1 = segments[i];
      const s2 = segments[i + 1];
      const midX = (s1.x + s2.x) / 2;
      const midY = (s1.y + s2.y) / 2;
      const midZ = (s1.z + s2.z) / 2;
      const projMid = project3D(midX, midY, midZ, width, height);

      if (projMid) {
        drawElements.push({
          type: 'link',
          depth: projMid.depth,
          from: s1,
          to: s2,
          joint: s2.joint,
          index: i
        });
      }
    }

    // Also add joint markers
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const proj = project3D(s.x, s.y, s.z, width, height);
      if (proj) {
        drawElements.push({
          type: 'joint',
          depth: proj.depth,
          segment: s
        });
      }
    }

    // Sort by depth descending (furthest first)
    drawElements.sort((a, b) => b.depth - a.depth);

    // Draw elements
    drawElements.forEach(el => {
      if (el.type === 'link' && !cadView) {
        drawLinkSegment(ctx, el.from, el.to, el.joint, width, height);
      } else if (el.type === 'joint' && (!cadView || el.segment.isHead || el.segment.isDriver)) {
        drawJointNode(ctx, el.segment, width, height);
      }
    });

    ctx.restore();
  }

  // Draw 3D Perspective Ground Grid
  function drawGroundGrid(ctx, width, height) {
    const gridRange = 5;
    const step = 0.5;
    const originX = Math.round(camera.target.x / step) * step;
    const originY = Math.round(camera.target.y / step) * step;

    ctx.lineWidth = 1;

    for (let a = -gridRange; a <= gridRange; a += step) {
      for (let b = -gridRange; b < gridRange; b += step) {
        for (const horizontal of [false, true]) {
          const p1 = project3D(originX + (horizontal ? b : a), originY + (horizontal ? a : b), 0, width, height);
          const p2 = project3D(originX + (horizontal ? b + step : a), originY + (horizontal ? a : b + step), 0, width, height);
          if (!p1 || !p2) continue;
          ctx.strokeStyle = 'rgba(148,163,184,0.18)';
          ctx.beginPath(); ctx.moveTo(p1.u, p1.v); ctx.lineTo(p2.u, p2.v); ctx.stroke();
        }
      }
    }
  }

  // Draw Link Segment Capsule
  function drawLinkSegment(ctx, s1, s2, joint, width, height) {
    const p1 = project3D(s1.x, s1.y, s1.z, width, height);
    const p2 = project3D(s2.x, s2.y, s2.z, width, height);
    if (!p1 || !p2) return;

    const isPitch = joint && joint.axis === 'pitch';
    const strokeColor = isPitch ? '#10b981' : '#06b6d4';
    const glowColor = isPitch ? 'rgba(16, 185, 129, 0.25)' : 'rgba(6, 182, 212, 0.25)';

    const avgScale = (p1.scale + p2.scale) / 2;
    const linkWidth = Math.max(4, 18 * avgScale / 480);

    // Glow outline
    ctx.beginPath();
    ctx.lineWidth = linkWidth + 4;
    ctx.strokeStyle = glowColor;
    ctx.lineCap = 'round';
    ctx.moveTo(p1.u, p1.v);
    ctx.lineTo(p2.u, p2.v);
    ctx.stroke();

    // Solid body
    ctx.beginPath();
    ctx.lineWidth = linkWidth;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.moveTo(p1.u, p1.v);
    ctx.lineTo(p2.u, p2.v);
    ctx.stroke();

    // Central core highlight
    ctx.beginPath();
    ctx.lineWidth = Math.max(1, linkWidth * 0.35);
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.moveTo(p1.u, p1.v);
    ctx.lineTo(p2.u, p2.v);
    ctx.stroke();
  }

  // Draw Joint Articulation Node
  function drawJointNode(ctx, s, width, height) {
    const p = project3D(s.x, s.y, s.z, width, height);
    if (!p) return;

    const radius = Math.max(3, (s.isHead ? 11 : 8) * p.scale / 480);

    ctx.beginPath();
    ctx.arc(p.u, p.v, radius, 0, Math.PI * 2);

    if (s.isHead) {
      ctx.fillStyle = '#fbbf24'; // amber/gold head
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      ctx.fillStyle = '#fff'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('ID 1 · HEAD', p.u, p.v - radius - 8);
    } else if (s.isDriver) {
      ctx.fillStyle = '#55db9c'; ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center';
      const labelX = Math.max(80, Math.min(width - 80, p.u));
      ctx.fillText('ID 10 · DRIVER', labelX, p.v + radius + 16);
      ctx.fillText('Waveshare + ESP32', labelX, p.v + radius + 31);
    } else {
      const isPitch = s.joint && s.joint.axis === 'pitch';
      ctx.fillStyle = isPitch ? '#059669' : '#0284c7';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // ID label if zoomed close
      if (p.scale > 380 && s.joint) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.joint.id, p.u, p.v);
      }
    }
  }

  function syncSimulationActivity() {
    const visible = isSimulationVisible();
    if (visible) {
      if (!wasSimVisible) {
        currentAngles.fill(0);
        isResumingSimulation = true;
        const stateEl = $('hud-sim-state');
        if (stateEl) stateEl.textContent = 'Updating…';
      }
      if (!isRenderRunning) {
        isRenderRunning = true;
        animFrameId = requestAnimationFrame(renderLoop);
      }
      if (!isSimPolling) {
        if (simPollTimeout) clearTimeout(simPollTimeout);
        pollSimulation();
      }
    } else {
      if (wasSimVisible) simPollGeneration++;
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      isRenderRunning = false;
      if (simPollTimeout) {
        clearTimeout(simPollTimeout);
        simPollTimeout = null;
      }
      isSimPolling = false;
    }
    wasSimVisible = visible;
  }

  if (typeof document !== 'undefined') {
    window.addEventListener('pagehide', disposeCad);
    window.addEventListener('pageshow', event => { if (event.persisted && !cadView) loadCadVisuals(); });
    document.addEventListener('visibilitychange', syncSimulationActivity);
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => setTimeout(syncSimulationActivity, 0));
    }
    const simPanelEl = typeof $ === 'function' ? $('panel-simulation') : null;
    if (simPanelEl && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => syncSimulationActivity());
      observer.observe(simPanelEl, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => setTimeout(syncSimulationActivity, 0));
    });
  }

  // Self-initialization when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();

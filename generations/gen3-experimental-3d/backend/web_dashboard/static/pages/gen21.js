document.addEventListener('DOMContentLoaded', () => {
    // Gen 2.1 has no hardware: the dashboard drives the SIM engine only.
    let workspaceState = null, workspaceObservedAt = 0, workspacePending = false;
    function requireSimulationEngine() {
      if (workspacePending || !workspaceState || Date.now() - workspaceObservedAt > 1500 ||
          !workspaceState.is_running || workspaceState.engine !== 'SIM') {
        throw Error('Connect the SIM engine before starting.');
      }
    }
    window.SurgeGamepad?.mount(document.getElementById('gen21-simulation-controller'), {
      generation: '2.1', visible: () => true,
      accepts: state => state.is_running && state.engine === 'SIM',
      start: async (options, freshInput) => {
        requireSimulationEngine();
        return post('/api/controller', {...freshInput(), btn_start: true, options});
      }
    });
    const canvas = document.getElementById('pathCanvas');
    const ctx = canvas.getContext('2d');
    const CANVAS_CX = canvas.width / 2;
    const CANVAS_CY = canvas.height / 2;

    let pixelsPerMeter = 50.0;
    let panX = 0;
    let panY = 0;

    let targetPath = [];
    let actualPath = [];
    let robotPose = {x: 0, y: 0, yaw: 0};
    let segments = [];
    let currentController = null;
    let isReversed = false;

    let isDrawing = false;
    let isPanning = false;
    let isRunning = false;
    let lastStatus = '';
    let currentPathRevision = null;
    let reportRequest = 0;
    let lastAnnouncedMotionState = '';
    function announceStateTransition(newState) {
        if (!newState || newState === lastAnnouncedMotionState) return;
        lastAnnouncedMotionState = newState;
        const announcer = document.getElementById('state-announcer');
        if (announcer) {
            announcer.textContent = 'Robot state: ' + newState;
        }
    }
    async function post(url, body = {}) {
        let response;
        try {
            const request = fetch(url, {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)});
            response = await (globalThis.SurgeBusy ? globalThis.SurgeBusy.track(request) : request);
        } catch (err) {
            throw new Error('Cannot reach the dashboard server. Check that it is running.');
        }
        const data = await response.json();
        if (!response.ok || data.success === false) throw new Error(data.error || data.status || 'Request failed');
        return data;
    }
    let stopUnconfirmed = false;
    let stopAwaitingConfirmation = false;
    function setStopUnconfirmedWarning(show) {
        stopUnconfirmed = show;
        const banner = document.getElementById('stop-unconfirmed-banner');
        if (banner) {
            banner.hidden = !show;
            if (banner.style) banner.style.display = show ? 'block' : 'none';
            if (show) banner.textContent = 'Stop not confirmed — use the physical emergency stop';
        }
    }

    let lastRunResult = null;
    let resultExpiryTimestamp = null;
    let resultTimerInterval = null;

    function clearSavedResult() {
        lastRunResult = null;
        resultExpiryTimestamp = null;
        if (resultTimerInterval) {
            clearInterval(resultTimerInterval);
            resultTimerInterval = null;
        }
        const reopenBtn = document.getElementById('btn-reopen-result');
        if (reopenBtn) reopenBtn.style.display = 'none';
    }

    function storeSavedResult(report) {
        lastRunResult = report;
        resultExpiryTimestamp = Date.now() + 60000;
        const reopenBtn = document.getElementById('btn-reopen-result');
        const timerSpan = document.getElementById('reopen-result-timer');
        if (reopenBtn) reopenBtn.style.display = 'inline-block';
        if (timerSpan) timerSpan.textContent = '60';

        if (resultTimerInterval) clearInterval(resultTimerInterval);
        resultTimerInterval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((resultExpiryTimestamp - Date.now()) / 1000));
            if (timerSpan) timerSpan.textContent = remaining;
            if (remaining <= 0) {
                clearSavedResult();
            }
        }, 1000);
    }

    document.getElementById('btn-reopen-result')?.addEventListener('click', () => {
        if (lastRunResult) {
            showReport(lastRunResult);
        }
    });

    async function sendMotion(endpoint) {
        const stopping = endpoint === '/api/stop';
        if (!stopping) {
            clearSavedResult();
            reportRequest++;
            const report = document.getElementById('accuracy-modal');
            if (report) report.style.display = 'none';
        }
        if (stopping) {
            stopAwaitingConfirmation = true;
            for (const id of ['btn-stop', 'btn-hero-stop', 'btn-canvas-stop']) {
                const btn = document.getElementById(id);
                if (btn) btn.textContent = 'Stop requested';
            }
            const floatState = document.getElementById('floating-stop-state');
            if (floatState) floatState.textContent = 'Stop requested';
        }
        try {
            if (!stopping) requireSimulationEngine();
            const data = await post(endpoint);
            if (stopping) {
                if (data && data.report) {
                    storeSavedResult(data.report);
                    showReport(data.report);
                } else {
                    const modal = document.getElementById('accuracy-modal');
                    if (modal) modal.style.display = 'none';
                }
            }
            updateStatus();
            return data;
        } catch (error) {
            if (stopping) {
                setStopUnconfirmedWarning(true);
                for (const id of ['btn-stop', 'btn-hero-stop', 'btn-canvas-stop']) {
                    const btn = document.getElementById(id);
                    if (btn) {
                        btn.textContent = 'Stop requested';
                        btn.removeAttribute('disabled');
                    }
                }
                const floatState = document.getElementById('floating-stop-state');
                if (floatState) floatState.textContent = 'Stop unconfirmed';
            }
            alert(error.message);
        }
    }

    for (const [id, endpoint] of [['btn-start', '/api/start'], ['btn-stop', '/api/stop']]) {
        document.getElementById(id)?.addEventListener('click', () => sendMotion(endpoint));
    }
    for (const id of ['btn-hero-start']) {
        document.getElementById(id)?.addEventListener('click', () => sendMotion('/api/start'));
    }
    for (const id of ['btn-hero-stop', 'tab-stop-btn', 'floating-stop-btn']) {
        document.getElementById(id)?.addEventListener('click', () => sendMotion('/api/stop'));
    }
    document.getElementById('btn-canvas-start')?.addEventListener('click', () => sendMotion('/api/start'));
    document.getElementById('btn-canvas-stop')?.addEventListener('click', () => sendMotion('/api/stop'));

    // --- System Stats Polling ---
    let systemStatsPending = false;
    async function updateSystemStats() {
        if (systemStatsPending) return;
        systemStatsPending = true;
        try {
            const res = await fetch('/api/system_stats', { signal: AbortSignal.timeout(3000) });
            if (!res.ok) throw new Error('System stats unavailable');
            const data = await res.json();
            const cpuEl = document.getElementById('sys-cpu');
            const ramEl = document.getElementById('sys-ram');
            const tempEl = document.getElementById('sys-temp');
            if (cpuEl) cpuEl.textContent = `${data.cpu.toFixed(1)}%`;
            if (ramEl) ramEl.textContent = `${data.ram.toFixed(1)}%`;
            if (tempEl) {
                tempEl.textContent = typeof data.temp === 'number' ? `${data.temp.toFixed(1)}°C` : data.temp;
                // Host temperature is often unsampled on Windows; hide the pill rather than show N/A.
                tempEl.closest('.stat-pill').hidden = typeof data.temp !== 'number';
            }
            window.SurgeBattery?.render(data.battery);
        } catch (e) {
            window.SurgeBattery?.render(null);
            console.error('Stats error:', e);
        } finally {
            systemStatsPending = false;
        }
    }
    setInterval(() => { if (!document.hidden) updateSystemStats(); }, 2000);
    updateSystemStats();

    // --- Status & Telemetry Polling (no overlapping fetches) ---
    const statusSampleTimes = [];
    function updateDashboardRate(sampleReceived) {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (sampleReceived) {
            statusSampleTimes.push(now);
            while (statusSampleTimes.length > 10) statusSampleTimes.shift();
        }
        const rateEl = document.getElementById('dashboard-update-rate');
        if (!rateEl) return;
        if (statusSampleTimes.length === 0) {
            rateEl.textContent = 'awaiting samples';
            return;
        }
        const lastSample = statusSampleTimes[statusSampleTimes.length - 1];
        const elapsed = now - lastSample;
        if (elapsed > 5000) {
            rateEl.textContent = 'offline';
            return;
        }
        if (elapsed > 1000) {
            rateEl.textContent = 'no recent samples';
            return;
        }
        if (statusSampleTimes.length <= 1) {
            rateEl.textContent = 'awaiting samples';
            return;
        }
        const firstSample = statusSampleTimes[0];
        const span = (lastSample - firstSample) / 1000;
        if (span <= 0) {
            rateEl.textContent = 'awaiting samples';
            return;
        }
        const hz = (statusSampleTimes.length - 1) / span;
        rateEl.textContent = `${hz.toFixed(1)} Hz`;
    }
    let statusInFlight = false;
    let statusEpoch = 0;
    let statusFailures = 0;
    let statusPollTimer = null;
    function scheduleStatusPoll(delay = 100) {
        if (statusPollTimer) clearTimeout(statusPollTimer);
        statusPollTimer = setTimeout(updateStatus, delay);
    }
    async function updateStatus() {
        // Display-only poll: idle while the tab is hidden (the operator heartbeat is separate).
        if (document.hidden) { scheduleStatusPoll(500); return; }
        if (statusInFlight) return;
        statusInFlight = true;
        const epoch = statusEpoch;
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            if (res.ok) window.SurgeGamepad?.observe(data);
            if (epoch !== statusEpoch) return;

            if (!res.ok) throw Error(data.error || 'Status unavailable');
            workspaceState = data; workspaceObservedAt = Date.now();
            document.getElementById('gen21-workspace-status').textContent = `Simulation · ${data.is_running ? (data.engine === 'SIM' ? '' : data.engine + ' · ') + (data.is_paused ? 'stopped' : 'running') : 'disconnected'}`;
            document.getElementById('telemetry-source').textContent = data.is_running && data.engine === 'SIM' ? 'Simulation' : 'No connected engine';
            if (!data.is_running || data.engine !== 'SIM') {
                data.telemetry = {}; data.controller = null; data.sensor_age_s = null;
                data.robot_pose = null; data.actual_path = []; data.segments = []; data.path_progress = 0;
            }
            isRunning = Boolean(data.is_running && !data.is_paused);
            if (isRunning) {
                const report = document.getElementById('accuracy-modal');
                if (report) report.style.display = 'none';
            } else if (data.status === 'Path Complete' && (!lastRunResult || lastRunResult.path_revision !== data.path_revision)) {
                if (typeof fetch === 'function' && typeof showReport === 'function') {
                    fetch('/api/report').then(res => res.ok ? res.json() : null).then(repData => {
                        if (repData) {
                            storeSavedResult(repData);
                            showReport(repData);
                        }
                    }).catch(() => {});
                }
            }

            const connStatusEl = document.getElementById('conn-status');
            const statusDotEl = document.getElementById('status-dot');
            const btnConnectEl = document.getElementById('btn-connect');

            const expectedState = !data.is_running ? 'Disconnected' : data.is_paused ? 'Stopped' : 'Running';
            if (connStatusEl) connStatusEl.textContent = /stalled/i.test(data.status || '') ? data.status : expectedState;
            if (statusDotEl) statusDotEl.className = isRunning ? 'dot active' : 'dot';
            if (btnConnectEl) btnConnectEl.textContent = data.is_running ? 'Disconnect Engine' : 'Connect Engine';

            for (const id of ['btn-start', 'btn-hero-start', 'btn-canvas-start']) {
                const btn = document.getElementById(id);
                if (btn) btn.textContent = isRunning ? 'Running' : 'Start Motion';
            }
            for (const id of ['btn-stop', 'btn-hero-stop', 'btn-canvas-stop']) {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.textContent = (typeof stopAwaitingConfirmation !== 'undefined' && (stopAwaitingConfirmation || stopUnconfirmed)) ? 'Stop requested' : (isRunning ? 'STOP / TORQUE OFF' : 'Stopped');
                    if (btn.classList && typeof btn.classList.toggle === 'function') {
                        btn.classList.toggle('motion-stopped', !isRunning);
                    }
                }
            }

            if (currentPathRevision !== data.path_revision) {
                currentPathRevision = data.path_revision;
                const modal = document.getElementById('accuracy-modal');
                if (modal) modal.style.display = 'none';
            }

            if (typeof MotionState !== 'undefined') {
                const motionState = MotionState.classify(data.status || expectedState, isRunning);
                MotionState.render(['btn-start', 'btn-hero-start', 'btn-canvas-start', 'btn-stop', 'btn-hero-stop', 'btn-canvas-stop'], motionState);
                const floatState = document.getElementById('floating-stop-state');
                if (floatState) floatState.textContent = (stopAwaitingConfirmation || stopUnconfirmed) ? 'Stop requested' : MotionState.label(motionState);
            }
            announceStateTransition(/stalled/i.test(data.status || '') ? data.status : expectedState);

            lastStatus = data.status;
            const progress = document.getElementById('path-progress');
            if (progress) progress.textContent = `Path: ${Math.round((data.path_progress || 0) * 100)}%`;
            const sensorBox = document.getElementById('sensor-status');
            if (sensorBox) sensorBox.textContent = data.sensor_age_s == null ? 'No sensor data' : `Age: ${data.sensor_age_s.toFixed(1)} s\n${JSON.stringify(data.sensors, null, 2)}`;
            robotPose = data.robot_pose || {x: 0, y: 0, yaw: 0};
            actualPath = data.actual_path || [];
            segments = data.segments || [];
            currentController = data.controller;
            isReversed = data.is_reversed;
            if (Array.isArray(data.target_path)) {
                targetPath = data.target_path;
            }

            if (!currentController) {
                const dot = document.getElementById('stick-dot');
                if (dot) dot.style.transform = 'translate(-50%, -50%)';
                const fill = document.getElementById('rt-fill');
                if (fill) fill.style.height = '0%';
                for (const id of ['btn-vis-start', 'btn-vis-stop', 'btn-vis-reverse', 'btn-vis-preset']) document.getElementById(id)?.classList.remove('active');
            }
            // Update Gamepad HUD
            if (currentController) {
                const stickDot = document.getElementById('stick-dot');
                if (stickDot) {
                    stickDot.style.transform = `translate(calc(-50% + ${currentController.x * 32}px), calc(-50% + ${-currentController.y * 32}px))`;
                }

                const rtFill = document.getElementById('rt-fill');
                if (rtFill) rtFill.style.height = `${(currentController.trigger_rt || 0) * 100}%`;

                const btnStart = document.getElementById('btn-vis-start');
                if (btnStart) btnStart.className = (currentController.raw_buttons && currentController.raw_buttons['btn_0']) ? 'gamepad-btn active' : 'gamepad-btn';

                const btnStop = document.getElementById('btn-vis-stop');
                if (btnStop) btnStop.className = (currentController.raw_buttons && currentController.raw_buttons['btn_1']) ? 'gamepad-btn active' : 'gamepad-btn';

                const btnRev = document.getElementById('btn-vis-reverse');
                if (btnRev) btnRev.className = isReversed ? 'gamepad-btn active' : 'gamepad-btn';

                const btnPreset = document.getElementById('btn-vis-preset');
                if (btnPreset) btnPreset.className = (currentController.raw_buttons && currentController.raw_buttons['btn_3']) ? 'gamepad-btn active' : 'gamepad-btn';
            }

            // Update Telemetry UI — Slush sticker cards with 1px black outline & rotating header colors
            const grid = document.getElementById('telemetry-grid');
            if (grid) {
                grid.innerHTML = '';
                if (!data.is_running || data.engine !== 'SIM') {
                    const empty = document.createElement('p'); empty.className = 'workspace-empty';
                    empty.textContent = 'No simulation feedback. Connect the SIM engine to see joint measurements.';
                    grid.appendChild(empty);
                }
                const dxlIds = Object.keys(data.telemetry || {}).map(Number).sort((a,b) => a - b);

                const simulatedTorque = Boolean(data.engine === 'SIM' || data.is_simulated || (data.telemetry && Object.values(data.telemetry).some(v => v?.torque_nm != null)));
                for (const id of dxlIds) {
                    const m = data.telemetry[id] || {};
                    const valid = m.valid !== false && m.position != null;
                    const deg = valid ? ((m.position - 2048) * (360.0 / 4096.0)).toFixed(1) : '--';
                    const speed = (m.velocity == null) ? '--' : m.velocity;
                    const torque = simulatedTorque ? (m?.torque_nm != null ? `${Number(m.torque_nm).toFixed(3)} Nm (sim)` : '-- (unsampled)') : (m?.load != null ? `${m.load} raw` : '--');

                    const box = document.createElement('div');
                    box.className = valid ? 'telem-box' : 'telem-box telem-invalid';
                    box.innerHTML = `
                        <div class="motor-header" title="MOTOR ${id}">MOTOR ${id}</div>
                        <div class="data-row"><span>Angle</span> <span title="${deg}${valid ? '°' : ''}">${deg}${valid ? '°' : ''}</span></div>
                        <div class="data-row"><span>Speed</span> <span title="${speed}">${speed}</span></div>
                        <div class="data-row"><span>Load</span> <span title="${torque}">${torque}</span></div>
                    `;
                    grid.appendChild(box);
                }
            }

            statusFailures = 0;
            for (const id of ['telemetry-grid', 'sensor-status']) document.getElementById(id)?.classList.remove('status-stale');
            if (!isRunning && (!data.is_running || data.status === 'Stopped' || data.status === 'Path Complete' || /stopped/i.test(data.status))) {
                stopAwaitingConfirmation = false;
                setStopUnconfirmedWarning(false);
            }
            for (const id of ['btn-stop', 'btn-hero-stop', 'btn-canvas-stop']) {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.textContent = (stopAwaitingConfirmation || stopUnconfirmed) ? 'Stop requested' : 'STOP / torque off';
                    btn.removeAttribute('disabled');
                }
            }

            updateDashboardRate(true);
            renderCanvas();
        } catch (e) {
            updateDashboardRate(false);
            console.error('Status error:', e);
            statusFailures++;
            for (const id of ['telemetry-grid', 'sensor-status']) document.getElementById(id)?.classList.add('status-stale');
            if (statusFailures >= 2) {
                const connStatusEl = document.getElementById('conn-status');
                if (connStatusEl) connStatusEl.textContent = 'Status unknown';
                const statusDotEl = document.getElementById('status-dot');
                if (statusDotEl) statusDotEl.className = 'dot';
                if (typeof MotionState !== 'undefined') {
                    MotionState.render(['btn-start', 'btn-hero-start', 'btn-canvas-start', 'btn-stop', 'btn-hero-stop', 'btn-canvas-stop'], 'unknown');
                }
                const floatState = document.getElementById('floating-stop-state');
                if (floatState) floatState.textContent = 'Status unknown';
                announceStateTransition('Status unknown');
            }
        } finally {
            statusInFlight = false;
            const backoffSchedule = [100, 250, 500, 1000, 2000];
            const delay = backoffSchedule[Math.min(statusFailures, backoffSchedule.length - 1)];
            scheduleStatusPoll(delay);
        }
    }
    scheduleStatusPoll(100);

    // --- Controls ---
    const btnConnect = document.getElementById('btn-connect');
    if (btnConnect) {
        btnConnect.addEventListener('click', async () => {
            const engine = 'SIM';
            const headlessCheckbox = document.getElementById('sim-headless');
            const headless = headlessCheckbox ? headlessCheckbox.checked : true;

            if (workspacePending) return;
            workspacePending = true;
            try {
                if (!workspaceState || Date.now() - workspaceObservedAt > 1500) throw Error('Wait for fresh engine status before connecting.');
                await post('/api/connect', {engine, headless, port: null});
                await updateStatus();
            } catch(e) { alert(e.message); }
            finally { workspacePending = false; }

        });
    }

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
        btnClear.addEventListener('click', async () => {
            try {
                const report = document.getElementById('accuracy-modal');
                if (report) report.style.display = 'none';
                const request = ++reportRequest;
                statusEpoch++;
                const result = await post('/api/set_path', {path: [], include_report: true, snapshot: true});
                currentPathRevision = result.path_revision;
                targetPath = [];
                actualPath = [];
                robotPose = { x: 0, y: 0, yaw: 0 };
                document.getElementById('tracker-3d')?.contentWindow?.postMessage({type: 'reset-view'}, location.origin);
                await updateStatus();
                if (result.report && request === reportRequest) {
                    storeSavedResult(result.report);
                    showReport(result.report);
                }
            } catch (e) { alert(e.message); }
        });
    }

    // --- Simulation Controls ---
    const paramInputs = document.querySelectorAll('.sim-param');
    paramInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const id = e.target.id;
            const val = e.target.value;
            const labelSpan = document.getElementById(`val-${id.split('-')[1]}`);
            if (labelSpan) labelSpan.textContent = val;
        });
    });

    async function sendParams() {
        const fricEl = document.getElementById('param-fric');
        const ampEl = document.getElementById('param-amp');
        const freqEl = document.getElementById('param-freq');
        const phaseEl = document.getElementById('param-phase');
        const forceEl = document.getElementById('param-force');
        const speedEl = document.getElementById('param-speed');
        const lowPowerEl = document.getElementById('param-lowpower');

        const params = {
            fric: fricEl ? parseFloat(fricEl.value) : 20.0,
            amp: ampEl ? parseFloat(ampEl.value) : 0.8,
            freq: freqEl ? parseFloat(freqEl.value) : 2.0,
            phase: phaseEl ? parseFloat(phaseEl.value) : 1.0,
            force: forceEl ? parseFloat(forceEl.value) : 2.0,
            speed: speedEl ? parseFloat(speedEl.value) : 1.0,
            low_power: lowPowerEl ? lowPowerEl.checked : false
        };
        await post('/api/params', params);
    }

    const btnApplyPhysics = document.getElementById('btn-apply-physics');
    if (btnApplyPhysics) {
        btnApplyPhysics.addEventListener('click', async () => {
            const pill = document.getElementById('physics-applied-pill');
            if (pill) pill.style.display = 'none';
            try {
                await sendParams();
                if (pill) {
                    pill.style.display = 'block';
                    setTimeout(() => { pill.style.display = 'none'; }, 2500);
                }
            } catch (error) { alert(error.message); }
        });
    }

    const btnResetPhysics = document.getElementById('btn-reset-physics');
    if (btnResetPhysics) {
        btnResetPhysics.addEventListener('click', () => {
            const defaults = {
                'param-fric': 20.0,
                'param-amp': 0.8,
                'param-freq': 2.0,
                'param-phase': 1.0,
                'param-force': 2.0,
                'param-speed': 1.0
            };
            for (const [id, val] of Object.entries(defaults)) {
                const el = document.getElementById(id);
                if (el) {
                    el.value = val;
                    const span = document.getElementById(`val-${id.split('-')[1]}`);
                    if (span) span.textContent = val;
                }
            }
            const lp = document.getElementById('param-lowpower');
            if (lp) lp.checked = false;
        });
    }

    for (const id of ['btn-open-3d', 'btn-hero-3d']) {
        document.getElementById(id)?.addEventListener('click', () => {
            document.getElementById('planar-tab-cockpit')?.click();
            document.getElementById('canvas-hub')?.scrollIntoView({behavior: 'smooth'});
        });
    }

    wireRunReport();

    const mathPreset = document.getElementById('math-preset');
    if (mathPreset) {
        mathPreset.addEventListener('change', () => {
            const val = mathPreset.value;
            const customGroup = document.getElementById('custom-formula-group');
            const funcInput = document.getElementById('math-func');
            const aInput = document.getElementById('math-a');
            const bInput = document.getElementById('math-b');
            if (customGroup) customGroup.style.display = (val === 'custom') ? 'flex' : 'none';

            if (val === 'sine') {
                if (funcInput) funcInput.value = 'sin(x)';
                if (aInput) aInput.value = 0;
                if (bInput) bInput.value = 10;
            } else if (val === 'lemniscate') {
                if (funcInput) funcInput.value = 'lemniscate(t, 2.5)';
                if (aInput) aInput.value = 0;
                if (bInput) bInput.value = 6.28;
            } else if (val === 'spiral') {
                if (funcInput) funcInput.value = 'spiral(t, 0.1, 0.4)';
                if (aInput) aInput.value = 0;
                if (bInput) bInput.value = 12.56;
            } else if (val === 'circle') {
                if (funcInput) funcInput.value = 'circle(t, 2.0)';
                if (aInput) aInput.value = 0;
                if (bInput) bInput.value = 6.28;
            } else if (['cosine', 'two-wave', 'parabola'].includes(val)) {
                if (funcInput) funcInput.value = {cosine: 'cos(x)', 'two-wave': 'sin(x)+0.3*sin(3*x)', parabola: '0.05*x^2'}[val];
                if (aInput) aInput.value = 0;
                if (bInput) bInput.value = 10;
            } else if (val === 'damped') {
                if (funcInput) funcInput.value = 'exp(-0.2*x)*sin(x)';
                if (aInput) aInput.value = 0;
                if (bInput) bInput.value = 12;
            }
        });
    }

    // Operator-only actions. The server refuses these for viewers (connection_owner in
    // web_app.py), so viewers see them locked; hovering one flips it to say why (components.css).
    // Stop buttons are never locked.
    const OPERATOR_ONLY = ['btn-start', 'btn-hero-start', 'btn-canvas-start', 'btn-connect',
        'btn-clear', 'btn-apply-physics', 'btn-use-generated'];
    let viewerLocked = true;
    function applyOperatorLock() {
        for (const id of OPERATOR_ONLY) {
            const btn = document.getElementById(id);
            if (!btn) continue;
            btn.dataset.operatorRequired = String(viewerLocked);
            if (viewerLocked) {
                btn.disabled = true;
                btn.setAttribute('aria-description', 'Operator mode required');
            } else {
                btn.removeAttribute('aria-description');
                btn.disabled = id === 'btn-use-generated' ? !generatedPath : false;
            }
        }
    }
    window.addEventListener('surge-session', event => {
        viewerLocked = !event.detail?.is_current_operator;
        applyOperatorLock();
    });

    const btnGenerate = document.getElementById('btn-generate');
    const useGenerated = document.getElementById('btn-use-generated');
    const cancelGenerated = document.getElementById('btn-cancel-generated');
    let generatedPath = null;
    function clearGeneratedPreview() {
        generatedPath = null;
        if (useGenerated) useGenerated.disabled = true;
        if (cancelGenerated) cancelGenerated.disabled = true;
        document.getElementById('tracker-3d')?.contentWindow?.postMessage({type: 'preview-path', path: []}, location.origin);
    }
    for (const id of ['math-preset', 'math-func', 'math-a', 'math-b', 'math-scale']) {
        document.getElementById(id)?.addEventListener('input', clearGeneratedPreview);
        document.getElementById(id)?.addEventListener('change', clearGeneratedPreview);
    }
    btnGenerate?.addEventListener('click', () => {
        try {
            generatedPath = SurgeMathPath.generate(mathPreset.value, document.getElementById('math-func').value,
                document.getElementById('math-a').valueAsNumber, document.getElementById('math-b').valueAsNumber,
                document.getElementById('math-scale').valueAsNumber);
            document.getElementById('tracker-3d')?.contentWindow?.postMessage({type: 'preview-path', path: generatedPath}, location.origin);
            useGenerated.disabled = viewerLocked;
            cancelGenerated.disabled = false;
        } catch (e) {
            clearGeneratedPreview();
            alert(e.message || 'Invalid math path');
        }
    });
    cancelGenerated?.addEventListener('click', clearGeneratedPreview);
    useGenerated?.addEventListener('click', async () => {
        if (!generatedPath) return;
        try {
            await post('/api/set_path', {path: generatedPath});
            clearGeneratedPreview();
        } catch (e) { alert(e.message); }
    });

    async function sendPath() {
        if (!Array.isArray(targetPath) || targetPath.length === 0 || targetPath.length > 5000) {
            return;
        }
        for (const pt of targetPath) {
            if (!Array.isArray(pt) || pt.length < 2) return;
            const [x, y] = pt;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            if (Math.abs(x) > 100 || Math.abs(y) > 100) return;
        }
        try {
            await post('/api/set_path', {path: targetPath});
        } catch(e) {
            if (typeof alert === 'function') alert(e.message);
        }
    }


    // Captured pointers
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    let activePointerId = null;
    let panStartX = 0;
    let panStartY = 0;

    canvas.addEventListener('pointerdown', (e) => {
        activePointerId = e.pointerId;
        if (typeof canvas.setPointerCapture === 'function') {
            canvas.setPointerCapture(e.pointerId);
        }
        if (e.button === 2 || e.button === 1) {
            isPanning = true;
            panStartX = e.clientX - panX;
            panStartY = e.clientY - panY;
            return;
        }
        isDrawing = true;
        addPoint(e);
    });

    canvas.addEventListener('pointermove', (e) => {
        if (isPanning) {
            panX = e.clientX - panStartX;
            panY = e.clientY - panStartY;
            renderCanvas();
            return;
        }
        if (isDrawing) {
            addPoint(e);
        }
    });

    canvas.addEventListener('pointerup', async (e) => {
        const wasDrawing = isDrawing;
        isDrawing = false;
        isPanning = false;
        activePointerId = null;
        if (typeof canvas.releasePointerCapture === 'function' && canvas.hasPointerCapture?.(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
        }
        if (wasDrawing) {
            await sendPath();
        }
    });

    function cancelCanvasGesture() {
        isDrawing = false;
        isPanning = false;
        activePointerId = null;
    }

    canvas.addEventListener('pointercancel', cancelCanvasGesture);
    canvas.addEventListener('lostpointercapture', cancelCanvasGesture);
    window.addEventListener('blur', cancelCanvasGesture);

    canvas.addEventListener('wheel', (e) => {
        if (!isRunning && !e.ctrlKey) return;
        e.preventDefault();
        const zoomSpeed = 1.1;
        if (e.deltaY < 0) {
            pixelsPerMeter *= zoomSpeed;
        } else {
            pixelsPerMeter /= zoomSpeed;
        }
        pixelsPerMeter = Math.max(5, Math.min(pixelsPerMeter, 200));
        renderCanvas();
    });

    canvas.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            canvas.blur();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey ||
            e.target?.matches?.('input, textarea, select') || e.target?.isContentEditable) return;
        if (e.target?.id === 'pathCanvas' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
        if (e.key === 'Escape' && typeof document !== 'undefined' && (e.target === canvas || document.activeElement === canvas)) {
            if (typeof canvas?.blur === 'function') canvas.blur();
            return;
        }
        const step = 40;
        if (e.key === 'ArrowLeft') { panX += step; renderCanvas(); }
        if (e.key === 'ArrowRight') { panX -= step; renderCanvas(); }
        if (e.key === 'ArrowUp') { panY += step; renderCanvas(); }
        if (e.key === 'ArrowDown') { panY -= step; renderCanvas(); }
    });

    function addPoint(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - CANVAS_CX - panX) / pixelsPerMeter;
        const worldY = (CANVAS_CY + panY - mouseY) / pixelsPerMeter;

        targetPath.push([worldX, worldY]);
        renderCanvas();
    }

    // --- Slush Light Theme Canvas Renderer ---
    function renderCanvas() {
        if (isRunning && robotPose) {
            const targetPanX = -robotPose.x * pixelsPerMeter;
            const targetPanY = -robotPose.y * pixelsPerMeter;
            panX += (targetPanX - panX) * 0.12;
            panY += (targetPanY - panY) * 0.12;
        }

        drawPlanarPath(ctx, {panX, panY, pixelsPerMeter, targetPath, actualPath, segments, robotPose, currentController});
    }

    // Initial Render
    renderCanvas();

    initMarqueeToggle();
    window.SurgeGenerationTransition?.ready();
});

document.addEventListener('DOMContentLoaded', () => {
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
            response = await fetch(url, {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)});
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

    async function sendMotion(endpoint) {
        const stopping = endpoint === '/api/stop';
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
            const data = await post(endpoint);
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
    async function updateSystemStats() {
        try {
            const res = await fetch('/api/system_stats');
            const data = await res.json();
            const cpuEl = document.getElementById('sys-cpu');
            const ramEl = document.getElementById('sys-ram');
            const tempEl = document.getElementById('sys-temp');
            if (cpuEl) cpuEl.textContent = `${data.cpu.toFixed(1)}%`;
            if (ramEl) ramEl.textContent = `${data.ram.toFixed(1)}%`;
            if (tempEl) tempEl.textContent = typeof data.temp === 'number' ? `${data.temp.toFixed(1)}°C` : data.temp;
        } catch (e) {
            console.error('Stats error:', e);
        }
    }
    setInterval(updateSystemStats, 2000);
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
    let statusFailures = 0;
    let statusPollTimer = null;
    function scheduleStatusPoll(delay = 100) {
        if (statusPollTimer) clearTimeout(statusPollTimer);
        statusPollTimer = setTimeout(updateStatus, delay);
    }
    async function updateStatus() {
        if (statusInFlight) return;
        statusInFlight = true;
        try {
            const res = await fetch('/api/status');
            const data = await res.json();

            const wasRunning = isRunning;
            isRunning = Boolean(data.is_running && !data.is_paused);

            const connStatusEl = document.getElementById('conn-status');
            const statusDotEl = document.getElementById('status-dot');
            const btnConnectEl = document.getElementById('btn-connect');

            const expectedState = !data.is_running ? 'Disconnected' : data.is_paused ? 'Stopped' : 'Running';
            if (connStatusEl) connStatusEl.textContent = expectedState;
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

            if (lastStatus !== 'Path Complete' && data.status === 'Path Complete') {
                setTimeout(fetchAndShowReport, 300);
            }

            if (typeof MotionState !== 'undefined') {
                const motionState = MotionState.classify(data.status || expectedState, isRunning);
                MotionState.render(['btn-start', 'btn-hero-start', 'btn-canvas-start', 'btn-stop', 'btn-hero-stop', 'btn-canvas-stop'], motionState);
                const floatState = document.getElementById('floating-stop-state');
                if (floatState) floatState.textContent = (stopAwaitingConfirmation || stopUnconfirmed) ? 'Stop requested' : MotionState.label(motionState);
            }
            announceStateTransition(expectedState);

            lastStatus = data.status;
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
                        <div class="motor-header">MOTOR ${id}</div>
                        <div class="data-row"><span>Angle</span> <span>${deg}${valid ? '°' : ''}</span></div>
                        <div class="data-row"><span>Speed</span> <span>${speed}</span></div>
                        <div class="data-row"><span>Load</span> <span>${torque}</span></div>
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
            const engineRadio = document.querySelector('input[name="engine"]:checked');
            const engine = engineRadio ? engineRadio.value : 'SIM';
            const headlessCheckbox = document.getElementById('sim-headless');
            const headless = headlessCheckbox ? headlessCheckbox.checked : true;
            const wasRunning = isRunning;

            try { await post('/api/connect', {engine, headless, port: document.getElementById('serial-port')?.value || null}); } catch(e) { alert(e.message); }

            if (wasRunning) {
                setTimeout(fetchAndShowReport, 300);
            }
        });
    }

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
        btnClear.addEventListener('click', async () => {
            targetPath = [];
            actualPath = [];
            robotPose = { x: 0, y: 0, yaw: 0 };
            await sendPath();
            renderCanvas();
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
            sendParams();
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
        try {
            await post('/api/params', params);
        } catch(e){ console.error(e.message); }
    }

    const btnApplyPhysics = document.getElementById('btn-apply-physics');
    if (btnApplyPhysics) {
        btnApplyPhysics.addEventListener('click', async () => {
            await sendParams();
            const pill = document.getElementById('physics-applied-pill');
            if (pill) {
                pill.style.display = 'block';
                setTimeout(() => { pill.style.display = 'none'; }, 2500);
            }
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
            sendParams();
        });
    }

    // --- Serial Port Management ---
    async function loadSerialPorts() {
        const select = document.getElementById('serial-port');
        if (!select || select.tagName !== 'SELECT') return;
        try {
            const res = await fetch('/api/ports');
            const data = await res.json();
            const current = select.value;
            select.innerHTML = '';
            if (data.ports && data.ports.length > 0) {
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = 'Select serial port';
                select.appendChild(placeholder);
                data.ports.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.device;
                    opt.textContent = p.description ? `${p.device} — ${p.description}` : p.device;
                    select.appendChild(opt);
                });
                if (current && Array.from(select.options).some(o => o.value === current)) {
                    select.value = current;
                }
            } else {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'No serial ports detected';
                select.appendChild(opt);
            }
        } catch (e) {
            console.warn('Could not scan serial ports:', e);
        }
    }
    document.getElementById('refresh-ports')?.addEventListener('click', loadSerialPorts);
    loadSerialPorts();

    const btnOpen3d = document.getElementById('btn-open-3d');
    if (btnOpen3d) {
        btnOpen3d.addEventListener('click', () => {
            window.open('/3d', 'Snake 3D Viewer', 'width=960,height=720');
        });
    }

    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            document.getElementById('accuracy-modal').style.display = 'none';
        });
    }

    async function fetchAndShowReport() {
        try {
            const res = await fetch('/api/report');
            const data = await res.json();
            if (data.error) return;

            const accuracyEl = document.getElementById('report-accuracy');
            if (accuracyEl) {
                accuracyEl.textContent = `${data.accuracy_percent.toFixed(1)}%`;
                accuracyEl.className = data.accuracy_percent > 80 ? 'value good' : 'value bad';
            }

            const deviationEl = document.getElementById('report-deviation');
            if (deviationEl) {
                deviationEl.textContent = `${data.avg_error.toFixed(4)} m`;
            }

            const rCanvas = document.getElementById('reportCanvas');
            if (rCanvas) {
                const rCtx = rCanvas.getContext('2d');
                rCtx.fillStyle = '#fafbfc';
                rCtx.fillRect(0, 0, rCanvas.width, rCanvas.height);

                const cx = rCanvas.width / 2;
                const cy = rCanvas.height / 2;
                const rPpm = 30.0;

                // Draw target path in Electric Blue (#4da2ff)
                if (data.target_path && data.target_path.length > 0) {
                    rCtx.strokeStyle = '#4da2ff';
                    rCtx.lineWidth = 4;
                    rCtx.lineCap = 'round';
                    rCtx.beginPath();
                    for (let i = 0; i < data.target_path.length; i++) {
                        const px = cx + (data.target_path[i][0] * rPpm);
                        const py = cy - (data.target_path[i][1] * rPpm);
                        if (i === 0) rCtx.moveTo(px, py); else rCtx.lineTo(px, py);
                    }
                    rCtx.stroke();
                }

                // Draw actual path in Ember (#fb4903)
                if (data.actual_path && data.actual_path.length > 0) {
                    rCtx.strokeStyle = '#fb4903';
                    rCtx.lineWidth = 2.5;
                    rCtx.lineCap = 'round';
                    rCtx.beginPath();
                    for (let i = 0; i < data.actual_path.length; i++) {
                        const px = cx + (data.actual_path[i][0] * rPpm);
                        const py = cy - (data.actual_path[i][1] * rPpm);
                        if (i === 0) rCtx.moveTo(px, py); else rCtx.lineTo(px, py);
                    }
                    rCtx.stroke();
                }
            }

            document.getElementById('accuracy-modal').style.display = 'flex';
        } catch (e) {
            console.error('Report error:', e);
        }
    }

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
            } else if (val === 'damped') {
                if (funcInput) funcInput.value = 'exp(-0.2*x)*sin(x)';
                if (aInput) aInput.value = 0;
                if (bInput) bInput.value = 12;
            }
        });
    }

    const btnGenerate = document.getElementById('btn-generate');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
            const funcStr = document.getElementById('math-func').value;
            const a = parseFloat(document.getElementById('math-a').value);
            const b = parseFloat(document.getElementById('math-b').value);

            targetPath = [];
            try {
                if (funcStr.startsWith('lemniscate')) {
                    const scale = 2.5;
                    const step = 0.05;
                    for (let t = a; t <= b; t += step) {
                        const denom = 1 + Math.sin(t) * Math.sin(t);
                        const px = (scale * Math.cos(t)) / denom;
                        const py = (scale * Math.sin(t) * Math.cos(t)) / denom;
                        targetPath.push([px, py]);
                    }
                } else if (funcStr.startsWith('spiral')) {
                    const a0 = 0.1, b0 = 0.15;
                    const step = 0.05;
                    for (let t = a; t <= b; t += step) {
                        const r = a0 + b0 * t;
                        const px = r * Math.cos(t);
                        const py = r * Math.sin(t);
                        targetPath.push([px, py]);
                    }
                } else if (funcStr.startsWith('circle')) {
                    const radius = 2.0;
                    const step = 0.05;
                    for (let t = a; t <= b; t += step) {
                        const px = radius * Math.cos(t);
                        const py = radius * Math.sin(t);
                        targetPath.push([px, py]);
                    }
                } else {
                    const safeFunc = funcStr
                        .replace(/sin/g, 'Math.sin')
                        .replace(/cos/g, 'Math.cos')
                        .replace(/tan/g, 'Math.tan')
                        .replace(/abs/g, 'Math.abs')
                        .replace(/exp/g, 'Math.exp')
                        .replace(/sqrt/g, 'Math.sqrt');

                    for (let x = a; x <= b; x += 0.1) {
                        let y = eval(safeFunc.replace(/x/g, `(${x})`));
                        targetPath.push([x, y]);
                    }
                }
                await sendPath();
                renderCanvas();
            } catch (e) {
                alert('Invalid math function expression');
            }
        });
    }

    function readPathPoints() {
        const body = document.getElementById('path-points-body');
        if (!body || !body.rows) return [];
        const pts = [];
        for (const row of body.rows) {
            const inputs = row.querySelectorAll ? row.querySelectorAll('input') : [];
            if (inputs.length >= 2) {
                const x = Number(inputs[0].valueAsNumber != null ? inputs[0].valueAsNumber : inputs[0].value);
                const y = Number(inputs[1].valueAsNumber != null ? inputs[1].valueAsNumber : inputs[1].value);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    pts.push([x, y]);
                }
            }
        }
        return pts;
    }

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
            if (typeof pathDirty !== 'undefined') pathDirty = false;
        } catch(e) {
            if (typeof alert === 'function') alert(e.message);
        }
    }

    const pathEditor = document.getElementById('path-edit-points');

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

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Clean paper background fill
        ctx.fillStyle = '#fafbfc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate grid size to guarantee at least 64 blocks visible
        const totalArea = (canvas.width / pixelsPerMeter) * (canvas.height / pixelsPerMeter);
        const minGridBlocks = 64.0;
        const gridStepMeters = Math.max(0.2, Math.sqrt(totalArea / 64.0));
        const gridStepPixels = gridStepMeters * pixelsPerMeter;

        // Draw light pastel grid lines
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        let startX = (panX + CANVAS_CX) % gridStepPixels;
        if (startX < 0) startX += gridStepPixels;
        for (let x = startX; x <= canvas.width; x += gridStepPixels) {
            ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        let startY = (panY + CANVAS_CY) % gridStepPixels;
        if (startY < 0) startY += gridStepPixels;
        for (let y = startY; y <= canvas.height; y += gridStepPixels) {
            ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();

        // Draw Axes in clean carbon outline with dashed styling
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(CANVAS_CX + panX, 0); ctx.lineTo(CANVAS_CX + panX, canvas.height);
        ctx.moveTo(0, CANVAS_CY + panY); ctx.lineTo(canvas.width, CANVAS_CY + panY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Target Path (Electric Blue #4da2ff with solid 1px black backing for sticker sticker feel)
        if (targetPath.length > 1) {
            // Outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 0; i < targetPath.length; i++) {
                const px = CANVAS_CX + panX + (targetPath[i][0] * pixelsPerMeter);
                const py = CANVAS_CY + panY - (targetPath[i][1] * pixelsPerMeter);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Inner Electric Blue
            ctx.strokeStyle = '#4da2ff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            for (let i = 0; i < targetPath.length; i++) {
                const px = CANVAS_CX + panX + (targetPath[i][0] * pixelsPerMeter);
                const py = CANVAS_CY + panY - (targetPath[i][1] * pixelsPerMeter);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Draw Actual Path (Ember #fb4903)
        if (actualPath.length > 1) {
            ctx.strokeStyle = '#fb4903';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 0; i < actualPath.length; i++) {
                const px = CANVAS_CX + panX + (actualPath[i][0] * pixelsPerMeter);
                const py = CANVAS_CY + panY - (actualPath[i][1] * pixelsPerMeter);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Draw Snake 10 Segments (if available from simulation or hardware)
        if (segments && segments.length > 1) {
            // Black outline backing
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 0; i < segments.length; i++) {
                const px = CANVAS_CX + panX + (segments[i][0] * pixelsPerMeter);
                const py = CANVAS_CY + panY - (segments[i][1] * pixelsPerMeter);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Inner inflatable tube in Electric Blue (#4da2ff)
            ctx.strokeStyle = '#4da2ff';
            ctx.lineWidth = 10;
            ctx.beginPath();
            for (let i = 0; i < segments.length; i++) {
                const px = CANVAS_CX + panX + (segments[i][0] * pixelsPerMeter);
                const py = CANVAS_CY + panY - (segments[i][1] * pixelsPerMeter);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Highlight head segment in Ember (#fb4903)
            const headX = CANVAS_CX + panX + (segments[0][0] * pixelsPerMeter);
            const headY = CANVAS_CY + panY - (segments[0][1] * pixelsPerMeter);
            ctx.fillStyle = '#fb4903';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(headX, headY, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Draw Robot Position (Head Badge in Sunburst #ffd731 with 1px black outline)
        const rx = CANVAS_CX + panX + (robotPose.x * pixelsPerMeter);
        const ry = CANVAS_CY + panY - (robotPose.y * pixelsPerMeter);

        ctx.fillStyle = '#ffd731';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rx, ry, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw Controller Arrow (Voltage Violet #5c4ade)
        if (currentController && currentController.active) {
            const cx = currentController.x;
            const cy = currentController.y;
            if (Math.abs(cx) > 0.15 || Math.abs(cy) > 0.15) {
                const stickAngle = Math.atan2(cy, cx) - (Math.PI / 2.0);
                const worldAngle = robotPose.yaw - stickAngle;
                const arrowLen = 42;
                const ax = rx + Math.cos(worldAngle) * arrowLen;
                const ay = ry - Math.sin(worldAngle) * arrowLen;

                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(ax, ay);
                ctx.stroke();

                ctx.strokeStyle = '#5c4ade';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(ax, ay);
                ctx.stroke();

                ctx.fillStyle = '#5c4ade';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(ax, ay, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
    }

    // Initial Render
    renderCanvas();

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
    initMarqueeToggle();
});

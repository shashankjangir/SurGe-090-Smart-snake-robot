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
    async function post(url, body = {}) {
        const response = await fetch(url, {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)});
        const data = await response.json();
        if (!response.ok || data.success === false) throw new Error(data.error || data.status || 'Request failed');
        return data;
    }
    for (const [id, endpoint] of [['btn-start','/api/start'], ['btn-stop','/api/stop']]) {
        document.getElementById(id)?.addEventListener('click', () => post(endpoint).catch(e => alert(e.message)));
    }

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
    let statusInFlight = false;
    async function updateStatus() {
        if (statusInFlight) return;
        statusInFlight = true;
        try {
            const res = await fetch('/api/status');
            const data = await res.json();

            const wasRunning = isRunning;
            isRunning = data.is_running;

            const connStatusEl = document.getElementById('conn-status');
            const statusDotEl = document.getElementById('status-dot');
            const btnConnectEl = document.getElementById('btn-connect');

            if (connStatusEl) connStatusEl.textContent = data.status || (isRunning ? 'Engine Running' : 'Disconnected');
            if (statusDotEl) statusDotEl.className = isRunning ? 'dot active' : 'dot';
            if (btnConnectEl) btnConnectEl.textContent = isRunning ? 'Disconnect Engine' : 'Connect Engine';

            if (lastStatus !== 'Path Complete' && data.status === 'Path Complete') {
                setTimeout(fetchAndShowReport, 300);
            }

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

                for (const id of dxlIds) {
                    const m = data.telemetry[id] || {};
                    const valid = m.valid !== false && m.position != null;
                    const deg = valid ? ((m.position - 2048) * (360.0 / 4096.0)).toFixed(1) : '--';
                    const speed = (m.velocity == null) ? '--' : m.velocity;
                    const torque = m.torque_nm != null ? `${m.torque_nm.toFixed(3)} Nm (sim)` : (m.load == null ? '--' : `${m.load} raw`);

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

            renderCanvas();
        } catch (e) {
            console.error('Status error:', e);
        } finally {
            statusInFlight = false;
        }
    }
    setInterval(updateStatus, 100);

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

    const btnGenerate = document.getElementById('btn-generate');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
            const funcStr = document.getElementById('math-func').value;
            const a = parseFloat(document.getElementById('math-a').value);
            const b = parseFloat(document.getElementById('math-b').value);

            targetPath = [];
            try {
                const safeFunc = funcStr
                    .replace(/sin/g, 'Math.sin')
                    .replace(/cos/g, 'Math.cos')
                    .replace(/tan/g, 'Math.tan')
                    .replace(/abs/g, 'Math.abs')
                    .replace(/sqrt/g, 'Math.sqrt');

                for (let x = a; x <= b; x += 0.1) {
                    let y = eval(safeFunc.replace(/x/g, `(${x})`));
                    targetPath.push([x, y]);
                }
                await sendPath();
                renderCanvas();
            } catch (e) {
                alert('Invalid math function expression');
            }
        });
    }

    async function sendPath() {
        try { await post('/api/set_path', {path: targetPath}); } catch(e) { alert(e.message); }
    }

    // --- Canvas Drawing & Pan/Zoom ---
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 2 || e.button === 1) { // Right or Middle click for pan
            isPanning = true;
            return;
        }
        isDrawing = true;
        addPoint(e);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            panX += e.movementX;
            panY += e.movementY;
            renderCanvas();
            return;
        }
        if (isDrawing) addPoint(e);
    });

    canvas.addEventListener('mouseup', async (e) => {
        if (e.button === 2 || e.button === 1) {
            isPanning = false;
            return;
        }
        isDrawing = false;
        await sendPath();
    });

    canvas.addEventListener('wheel', (e) => {
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

    document.addEventListener('keydown', (e) => {
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Clean paper background fill
        ctx.fillStyle = '#fafbfc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw light pastel grid lines
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        let startX = (panX + CANVAS_CX) % pixelsPerMeter;
        if (startX < 0) startX += pixelsPerMeter;
        for (let x = startX; x <= canvas.width; x += pixelsPerMeter) {
            ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        let startY = (panY + CANVAS_CY) % pixelsPerMeter;
        if (startY < 0) startY += pixelsPerMeter;
        for (let y = startY; y <= canvas.height; y += pixelsPerMeter) {
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
});

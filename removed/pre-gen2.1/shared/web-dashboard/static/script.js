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
    
    let isDrawing = false;
    let isPanning = false;
    let isRunning = false;

    // --- System Stats Polling ---
    async function updateSystemStats() {
        try {
            const res = await fetch('/api/system_stats');
            const data = await res.json();
            document.getElementById('sys-cpu').textContent = `${data.cpu.toFixed(1)}%`;
            document.getElementById('sys-ram').textContent = `${data.ram.toFixed(1)}%`;
            document.getElementById('sys-temp').textContent = typeof data.temp === 'number' ? `${data.temp.toFixed(1)}°C` : data.temp;
        } catch (e) {
            console.error('Stats error:', e);
        }
    }
    setInterval(updateSystemStats, 2000);
    updateSystemStats();

    // --- Status & Telemetry Polling ---
    async function updateStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            
            const wasRunning = isRunning;
            isRunning = data.is_running;
            document.getElementById('conn-status').textContent = data.status;
            document.getElementById('status-dot').className = isRunning ? 'dot active' : 'dot';
            document.getElementById('btn-connect').textContent = isRunning ? 'Disconnect Engine' : 'Connect Engine';

            if (wasRunning && !isRunning && data.status === 'Path Complete') {
                setTimeout(fetchAndShowReport, 300);
            }

            robotPose = data.robot_pose;
            actualPath = data.actual_path;
            segments = data.segments || [];
            
            // Update Telemetry UI
            const grid = document.getElementById('telemetry-grid');
            grid.innerHTML = '';
            
            const dxlIds = Object.keys(data.telemetry).map(Number).sort((a,b) => a - b);
            
            for (const id of dxlIds) {
                const m = data.telemetry[id];
                const deg = ((m.position - 2048) * (360.0 / 4096.0)).toFixed(1);
                // raw load 0-1000 maps to 0-30 kg.cm for ST3215
                const torque = (m.load * 0.03).toFixed(2);
                
                const box = document.createElement('div');
                box.className = 'telem-box';
                box.innerHTML = `
                    <div class="motor-id">MOTOR ${id}</div>
                    <div class="data-row"><span>Angle:</span> <span>${deg}°</span></div>
                    <div class="data-row"><span>Speed:</span> <span>${m.velocity}</span></div>
                    <div class="data-row"><span>Torque:</span> <span>${torque} kg.cm</span></div>
                `;
                grid.appendChild(box);
            }
            
            renderCanvas();
        } catch (e) {
            console.error('Status error:', e);
        }
    }
    setInterval(updateStatus, 100);

    // --- Controls ---
    document.getElementById('btn-connect').addEventListener('click', async () => {
        const engine = document.querySelector('input[name="engine"]:checked').value;
        const headless = document.getElementById('sim-headless').checked;
        const wasRunning = isRunning;
        
        await fetch('/api/connect', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({engine: engine, headless: headless})
        });

        if (wasRunning) {
            setTimeout(fetchAndShowReport, 300);
        }
    });

    document.getElementById('btn-clear').addEventListener('click', async () => {
        targetPath = [];
        actualPath = [];
        await sendPath();
        renderCanvas();
    });

    // --- Simulation Controls ---
    const paramInputs = document.querySelectorAll('.sim-param');
    paramInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const id = e.target.id;
            const val = e.target.value;
            document.getElementById(`val-${id.split('-')[1]}`).textContent = val;
            sendParams();
        });
    });
    
    async function sendParams() {
        const params = {
            fric: parseFloat(document.getElementById('param-fric').value),
            amp: parseFloat(document.getElementById('param-amp').value),
            freq: parseFloat(document.getElementById('param-freq').value),
            phase: parseFloat(document.getElementById('param-phase').value),
            force: parseFloat(document.getElementById('param-force').value),
            speed: parseFloat(document.getElementById('param-speed').value)
        };
        try {
            await fetch('/api/params', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(params)
            });
        } catch(e){}
    }

    document.getElementById('btn-open-3d').addEventListener('click', () => {
        window.open('/3d', 'Snake 3D Viewer', 'width=900,height=700');
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
        document.getElementById('accuracy-modal').style.display = 'none';
    });

    async function fetchAndShowReport() {
        try {
            const res = await fetch('/api/report');
            const data = await res.json();
            if (data.error) return;

            document.getElementById('report-accuracy').textContent = `${data.accuracy_percent.toFixed(1)}%`;
            document.getElementById('report-accuracy').className = data.accuracy_percent > 80 ? 'value good' : 'value bad';
            document.getElementById('report-deviation').textContent = `${data.avg_error.toFixed(4)} m`;

            const rCanvas = document.getElementById('reportCanvas');
            const rCtx = rCanvas.getContext('2d');
            rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
            
            const cx = rCanvas.width / 2;
            const cy = rCanvas.height / 2;
            const rPpm = 30.0; // Fixed scale for report
            
            rCtx.strokeStyle = '#00f0ff';
            rCtx.lineWidth = 3;
            rCtx.beginPath();
            for (let i = 0; i < data.target_path.length; i++) {
                const px = cx + (data.target_path[i][0] * rPpm);
                const py = cy - (data.target_path[i][1] * rPpm);
                if (i === 0) rCtx.moveTo(px, py); else rCtx.lineTo(px, py);
            }
            rCtx.stroke();

            rCtx.strokeStyle = '#ff007f';
            rCtx.lineWidth = 2;
            rCtx.beginPath();
            for (let i = 0; i < data.actual_path.length; i++) {
                const px = cx + (data.actual_path[i][0] * rPpm);
                const py = cy - (data.actual_path[i][1] * rPpm);
                if (i === 0) rCtx.moveTo(px, py); else rCtx.lineTo(px, py);
            }
            rCtx.stroke();

            document.getElementById('accuracy-modal').style.display = 'flex';
        } catch (e) {
            console.error('Report error:', e);
        }
    }

    document.getElementById('btn-generate').addEventListener('click', async () => {
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
            alert('Invalid math function');
        }
    });

    async function sendPath() {
        await fetch('/api/set_path', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({path: targetPath})
        });
    }

    // --- Canvas Drawing & Pan/Zoom ---
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 2 || e.button === 1) { // Right or Middle click
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
        const step = 40; // pan speed
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

    function renderCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#333';
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

        // Draw axes
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(CANVAS_CX + panX, 0); ctx.lineTo(CANVAS_CX + panX, canvas.height);
        ctx.moveTo(0, CANVAS_CY + panY); ctx.lineTo(canvas.width, CANVAS_CY + panY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Target Path (Blue)
        if (targetPath.length > 1) {
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < targetPath.length; i++) {
                const px = CANVAS_CX + panX + (targetPath[i][0] * pixelsPerMeter);
                const py = CANVAS_CY + panY - (targetPath[i][1] * pixelsPerMeter);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Draw Actual Path (Pink)
        if (actualPath.length > 1) {
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < actualPath.length; i++) {
                const px = CANVAS_CX + panX + (actualPath[i][0] * pixelsPerMeter);
                const py = CANVAS_CY + panY - (actualPath[i][1] * pixelsPerMeter);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Draw Snake Segments (if available from SIM)
        if (segments && segments.length > 1) {
            ctx.strokeStyle = '#cc0000';
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 0; i < segments.length; i++) {
                const px = CANVAS_CX + panX + (segments[i][0] * pixelsPerMeter);
                const py = CANVAS_CY + panY - (segments[i][1] * pixelsPerMeter);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.lineCap = 'butt'; // reset
        }

        // Draw Robot Position (Red Dot)
        const rx = CANVAS_CX + panX + (robotPose.x * pixelsPerMeter);
        const ry = CANVAS_CY + panY - (robotPose.y * pixelsPerMeter);
        ctx.fillStyle = '#ff4040';
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Initial Render
    renderCanvas();
});

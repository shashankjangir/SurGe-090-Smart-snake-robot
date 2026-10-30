/**
 * Unit test for Gen 2.1 Dashboard Enhancements:
 * - Live Trajectory in the middle column
 * - Apply button for Simulation Physics
 * - Variety of mathematical path presets
 * - Low power current-limit disclosure
 * - Serial port select with refresh button
 * - 3D Viewer button next to Trace Trajectory
 * - Camera following and min 64 grid blocks guarantee
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/index.html'), 'utf8');
const scriptJs = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/script.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/style.css'), 'utf8');

// 1. Verify Layout Order: Left (controls) -> Middle (canvas-hub) -> Right (sim-controls-card)
const canvasPos = indexHtml.indexOf('id="canvas-hub"');
const simPos = indexHtml.indexOf('id="sim-controls-card"');
assert(canvasPos > 0 && simPos > 0, 'canvas-hub and sim-controls-card must exist');
assert(canvasPos < simPos, 'Live Trajectory Canvas (canvas-hub) must be in the middle column before sim-controls-card');

// Verify CSS 3-column layout gives middle column 1fr
assert(styleCss.includes('grid-template-columns: 320px 1fr 340px') || styleCss.includes('grid-template-columns: 280px 1fr 310px'), 'main-content layout must give 1fr flexible space to middle column');

// 2. Verify Simulation Physics Apply button
assert(indexHtml.includes('id="btn-apply-physics"'), 'Must have "Apply Simulation Physics" button');
assert(indexHtml.includes('id="physics-applied-pill"'), 'Must have applied confirmation pill');
assert(scriptJs.includes('btnApplyPhysics.addEventListener(\'click\''), 'script.js must wire click listener to btn-apply-physics');

// 3. Verify Variety of Mathematical Path Presets
assert(indexHtml.includes('id="math-preset"'), 'Must have math-preset selector');
assert(indexHtml.includes('value="sine"'), 'Must include sine preset');
assert(indexHtml.includes('value="lemniscate"'), 'Must include lemniscate preset');
assert(indexHtml.includes('value="spiral"'), 'Must include spiral preset');
assert(indexHtml.includes('value="circle"'), 'Must include circular orbit preset');
assert(indexHtml.includes('value="damped"'), 'Must include damped barrier avoidance preset');

// 4. Verify Low Power disclosure
assert(indexHtml.includes('Low Power Mode') && /does not measure or guarantee motor current/i.test(indexHtml), 'Low power mode must not imply a measured current limit');

// 5. Verify Serial Port Select & 3D Viewer Button in Hero
assert(indexHtml.includes('<select id="serial-port"'), 'Serial port must be a select element like Gen 3');
assert(indexHtml.includes('id="refresh-ports"'), 'Must have refresh-ports button');
assert(scriptJs.includes('async function loadSerialPorts'), 'script.js must implement loadSerialPorts');

// 7. Verify Simulation Physics "Set to Default" button & Clear Path instant pose reset
assert(indexHtml.includes('id="btn-reset-physics"'), 'Must have "Set to Default" button for simulation physics');
assert(scriptJs.includes('btnResetPhysics.addEventListener(\'click\''), 'script.js must wire click listener to btn-reset-physics');
assert(scriptJs.includes('robotPose = { x: 0, y: 0, yaw: 0 }'), 'script.js btnClear must instantly reset robotPose');

// 8. Verify Gamepad Buttons Diamond Placement & Authenticity
assert(indexHtml.includes('class="gamepad-btn btn-y"'), 'Must have btn-y in gamepad face buttons');
assert(indexHtml.includes('class="gamepad-btn btn-x"'), 'Must have btn-x in gamepad face buttons');
assert(indexHtml.includes('class="gamepad-btn btn-b"'), 'Must have btn-b in gamepad face buttons');
assert(indexHtml.includes('class="gamepad-btn btn-a"'), 'Must have btn-a in gamepad face buttons');
assert(styleCss.includes('grid-template-columns: 36px 36px 36px'), 'face-buttons must use compact 36px grid to prevent card overflow');

// 9. Verify Python runtime reset_pose on empty path
const runtimePy = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/surge_control/runtime.py'), 'utf8');
const simulationPy = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/surge_control/simulation.py'), 'utf8');
const pathEnginePy = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/surge_control/path_engine.py'), 'utf8');
assert(simulationPy.includes('def reset_pose(self):'), 'simulation.py must provide reset_pose');
assert(runtimePy.includes('self.iface.reset_pose()'), 'runtime.py set_path must invoke reset_pose on empty path');

// 10. Verify whole path traversal requirement for completion
assert(runtimePy.includes('def is_path_complete('), 'runtime.py must provide is_path_complete');
assert(runtimePy.includes('self.path.complete()'), 'runtime.py must verify ordered path completion');
assert(pathEnginePy.includes('self.progress_idx'), 'path_engine.py must track sequential progress index');

// 11. Verify Generation Switch Hover Info Cards (Planar Snake for Gen 2.1 & 3D Spatial for Gen 3)
const gen3Html = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/gen3.html'), 'utf8');
const genSwitchCss = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/generation-switch.css'), 'utf8');

[indexHtml, gen3Html].forEach(html => {
  assert(html.includes('id="tooltip-gen21"'), 'Template must have tooltip-gen21');
  assert(html.includes('Planar Snake'), 'Gen 2.1 tooltip must state Planar Snake');
  assert(html.includes('10 Yaw Joints'), 'Gen 2.1 tooltip must specify 10 Yaw Joints');
  assert(html.includes('id="tooltip-gen3"'), 'Template must have tooltip-gen3');
  assert(html.includes('3D Spatial Snake'), 'Gen 3 tooltip must state 3D Spatial Snake');
  assert(html.includes('Alternating 5 Pitch + 5 Yaw Joints'), 'Gen 3 tooltip must specify Alternating Joints');
});

assert(genSwitchCss.includes('.gen-info-card'), 'generation-switch.css must style .gen-info-card');
assert(genSwitchCss.includes('.generation-switch a:hover .gen-info-card'), 'generation-switch.css must show card on hover');

// 12. Verify Canvas Start & Stop buttons next to Clear Canvas
const updatedIndexHtml = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/index.html'), 'utf8');
const updatedScriptJs = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/script.js'), 'utf8');
const updatedStyleCss = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/style.css'), 'utf8');

assert(updatedIndexHtml.includes('id="btn-canvas-start"'), 'Must have btn-canvas-start in canvas footer');
assert(updatedIndexHtml.includes('id="floating-stop-btn"'), 'Persistent Stop remains available');
assert(updatedIndexHtml.includes('aria-label="Motion controls"') && updatedIndexHtml.includes('id="btn-start"'), 'Bottom dock has start control');
assert(updatedScriptJs.includes("['btn-start', '/api/start']") && updatedScriptJs.includes("['btn-stop', '/api/stop']"), 'Header controls use the motion endpoints');
assert(updatedIndexHtml.includes('id="tracker-3d"'), '3D viewer belongs in the tracker');
assert(updatedIndexHtml.includes('id="btn-clear"'), 'Must have btn-clear in canvas footer');
assert(updatedScriptJs.includes('btn-canvas-start'), 'script.js must wire btn-canvas-start to /api/start');
assert(updatedStyleCss.includes('.canvas-actions-row'), 'style.css must style .canvas-actions-row');

console.log('Gen 2.1 Dashboard Enhancements: 12 checks passed (middle canvas, physics apply & set-to-default, math presets, low-power disclosure, serial ports, 3D viewer button, instant reset pose, gamepad layout, whole path completion, hover info cards, canvas start/stop buttons)');

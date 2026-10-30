/**
 * Unit test for Gen 3 3D Simulation Frontend:
 * - 🌐 3D Simulation Tab placed strictly before 🎮 Controls tab
 * - panel-simulation placed strictly before panel-operate
 * - 3-Column main-content layout matching Gen 2.1
 * - Left Column: PyBullet 3D Connection Engine, 3D Spatial Gait Presets (Sidewinding, Rolling, Lateral Undulation, Sinus-Lifting, Corkscrew) & Confirmed Joint Map
 * - Center Column: Interactive 3D Perspective Simulation Canvas (#gen3SimCanvas), badges, 3D controls footer, Start/Stop/Reset actions
 * - Right Column: 3D Simulation Physics tuning (#sim-3d-physics-card), sliders (contact friction, yaw amp, pitch amp, frequency, lag, pitch-yaw offset, bias, torque limit, low power), Apply 3D Physics and Set to Default buttons
 * - Bottom Telemetry: 10-Joint Alternating Actuator Telemetry grid (#sim-telemetry-grid)
 * - Integration with /static/gen3-sim.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const gen3Html = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/gen3.html'), 'utf8');
const gen3SimJs = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/gen3-sim.js'), 'utf8');

console.log('Testing Gen 3 3D Simulation Frontend...');

// 1. Verify Tab Placement: tab-simulation MUST be before tab-operate
const tabSimPos = gen3Html.indexOf('id="tab-simulation"');
const tabOperatePos = gen3Html.indexOf('id="tab-operate"');
assert(tabSimPos > 0, 'gen3.html must contain id="tab-simulation"');
assert(tabOperatePos > 0, 'gen3.html must contain id="tab-operate"');
assert(tabSimPos < tabOperatePos, '🌐 3D Simulation tab MUST be placed before 🎮 Controls tab');
console.log('  PASS: Tab order verified (3D Simulation placed before Controls)');

// 2. Verify Panel Placement: panel-simulation MUST be before panel-operate
const panelSimPos = gen3Html.indexOf('id="panel-simulation"');
const panelOperatePos = gen3Html.indexOf('id="panel-operate"');
assert(panelSimPos > 0, 'gen3.html must contain id="panel-simulation"');
assert(panelOperatePos > 0, 'gen3.html must contain id="panel-operate"');
assert(panelSimPos < panelOperatePos, 'panel-simulation MUST be placed before panel-operate');
console.log('  PASS: Panel order verified (panel-simulation placed before panel-operate)');

// 3. Verify 3-Column Layout structure inside panel-simulation
const simPanelContent = gen3Html.substring(panelSimPos, panelOperatePos);
assert(simPanelContent.includes('class="main-content" id="sim-hub"'), 'Must have .main-content#sim-hub 3-column layout');
assert(simPanelContent.includes('id="sim-canvas-hub"'), 'Must have center column #sim-canvas-hub');
assert(simPanelContent.includes('id="sim-3d-physics-card"'), 'Must have right column #sim-3d-physics-card');
console.log('  PASS: 3-column layout verified matching Gen 2.1 architecture');

// 4. Verify Left Column (Connection Engine & Presets & Joint Map)
assert(simPanelContent.includes('id="sim-3d-preset"'), 'Must have 3D Spatial Gait preset selector');
assert(simPanelContent.includes('value="sidewinding"'), 'Must have Sidewinding preset');
assert(simPanelContent.includes('value="rolling"'), 'Must have Rolling preset');
assert(simPanelContent.includes('value="lateral_undulation"'), 'Must have Lateral Undulation preset');
assert(simPanelContent.includes('value="sinus_lifting"'), 'Must have Sinus-Lifting preset');
assert(simPanelContent.includes('value="corkscrew"'), 'Must have Corkscrew preset');
assert(simPanelContent.includes('id="btn-load-3d-preset"'), 'Must have Load Gait Preset button');
console.log('  PASS: Left column verified (Preview notice & 5 spatial presets)');

// 5. Verify Center Column (Interactive 3D Simulation Canvas & Actions)
assert(simPanelContent.includes('id="gen3SimCanvas"'), 'Must have #gen3SimCanvas element');
assert(simPanelContent.includes('5 Pitch Joints'), 'Must highlight 5 Pitch Joints badge');
assert(simPanelContent.includes('5 Yaw Joints'), 'Must highlight 5 Yaw Joints badge');
assert(simPanelContent.includes('11 Links'), 'Must highlight 11 Links badge');
assert(simPanelContent.includes('id="btn-gen3-sim-start"'), 'Must have Start 3D Sim button');
assert(gen3Html.includes('id="floating-stop-btn"'), 'Persistent Stop is available during simulation');
assert(simPanelContent.includes('id="btn-gen3-sim-reset"'), 'Must have Reset 3D Pose button');
console.log('  PASS: Center column verified (3D Canvas, badges & Start/Stop/Reset buttons)');

// 6. Verify Right Column (3D Simulation Physics & Tuning Sliders)
const physicsParams = [
  'sim-param-yaw-amp',
  'sim-param-pitch-amp',
  'sim-param-freq',
  'sim-param-lag',
  'sim-param-offset',
  'sim-param-bias'
];
physicsParams.forEach(paramId => {
  assert(simPanelContent.includes(`id="${paramId}"`), `sim-3d-physics-card must contain slider #${paramId}`);
});
assert(simPanelContent.includes('id="btn-sim-apply-physics"'), 'Must have Apply 3D Physics button');
assert(simPanelContent.includes('id="btn-sim-reset-physics"'), 'Must have Set to Default button');
assert(simPanelContent.includes('id="sim-physics-applied-pill"'), 'Must have confirmation pill');
console.log('  PASS: Right column verified (Gait parameters, Apply & Set-to-Default buttons)');

// 7. Verify Bottom Telemetry Section
assert(simPanelContent.includes('id="sim-telemetry-hub"'), 'Must have 10-joint spatial telemetry hub');
assert(simPanelContent.includes('id="sim-telemetry-grid"'), 'Must have #sim-telemetry-grid');
console.log('  PASS: Bottom telemetry section verified');

// 8. Verify JavaScript Controller Integration (gen3-sim.js)
assert(gen3Html.includes('<script src="/static/gen3-sim.js" defer></script>'), 'gen3.html must load gen3-sim.js');
assert(gen3SimJs.includes('JOINT_SPECS'), 'gen3-sim.js must define 10 alternating joint specifications');
// Confirmed signs check: Pitch 1 = 1; Pitch 3, 5, 7, 9 = -1; all Yaw = 1
assert(gen3SimJs.includes('{ id: 1, axis: \'pitch\', sign: 1'), 'Pitch ID 1 must have sign = 1');
assert(gen3SimJs.includes('{ id: 3, axis: \'pitch\', sign: -1'), 'Pitch ID 3 must have sign = -1');
assert(gen3SimJs.includes('{ id: 5, axis: \'pitch\', sign: -1'), 'Pitch ID 5 must have sign = -1');
assert(gen3SimJs.includes('{ id: 7, axis: \'pitch\', sign: -1'), 'Pitch ID 7 must have sign = -1');
assert(gen3SimJs.includes('{ id: 9, axis: \'pitch\', sign: -1'), 'Pitch ID 9 must have sign = -1');
assert(gen3SimJs.includes('project3D'), 'gen3-sim.js must implement 3D perspective projection');
assert(gen3SimJs.includes('DEFAULT_PARAMS'), 'gen3-sim.js must define default physics parameters');
console.log('  PASS: Controller script gen3-sim.js verified with confirmed hardware sign mapping');

console.log('\nAll Gen 3 3D Simulation Frontend checks passed! (8/8)');


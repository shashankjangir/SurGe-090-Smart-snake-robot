const {readAsset} = require('./asset-source.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');

const source = readAsset(path.join(__dirname, '../backend/web_dashboard/static/gen3-sim.js'), 'utf8');

// Verify that gen3-sim.js handles operator session change to disconnect simulation
assert(source.includes('const wasOperator = simOperator;'), 'gen3-sim.js must track wasOperator');
assert(source.includes("simulationState = 'disconnected';"), 'gen3-sim.js must reset simulationState on operator close');
assert(source.includes('renderSimulationStatus({ simulation_state: \'disconnected\' });'), 'gen3-sim.js must update status HUD on operator close');

console.log('PASS: gen3-sim.js auto-disconnects on operator mode close');

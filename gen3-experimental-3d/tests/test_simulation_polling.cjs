const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/static/gen3-sim.js'), 'utf8');
const polling = source.slice(source.indexOf('    async function pollSimulation()'), source.indexOf('  function resetCamera()'));
const activity = source.slice(source.indexOf('  function syncSimulationActivity()'), source.indexOf("  if (typeof document !== 'undefined')", source.indexOf('  function syncSimulationActivity()')));
let requests = 0;
let timers = 0;
const state = { textContent: '' };
const connection = { textContent: '' };
const context = { $: id => id === 'sim-connection-status' ? connection : state, updateSimulationControls() {}, simulationState: 'unknown', simulationBusy: false, visible: true, isSimulationVisible() { return context.visible; },
  isSimPolling: false, simPollGeneration: 0, simPollTimeout: null, isRenderRunning: false,
  wasSimVisible: false, currentAngles: Array(10).fill(0), isResumingSimulation: false,
  requestAnimationFrame: () => 1, cancelAnimationFrame() {}, clearTimeout() {}, renderLoop() {},
  setTimeout() { timers++; return timers; }, fetch: async () => { requests++; return {ok:true, json:async()=>({execution:null,busy:false})}; } };
vm.createContext(context);
vm.runInContext(polling + activity, context);
(async () => {
  context.syncSimulationActivity();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests, 1);
  assert.equal(timers, 1);
  assert.equal(state.textContent, 'No active simulation');
  context.visible = false;
  context.syncSimulationActivity();
  context.visible = true;
  context.syncSimulationActivity();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests, 2);
  assert.equal(timers, 2);
  context.visible = false;
  context.syncSimulationActivity();
  context.fetch = async () => { throw new Error('offline'); };
  context.visible = true;
  context.syncSimulationActivity();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.textContent, 'Simulation status unavailable');
  console.log('Simulation polling starts once and resumes after the panel is hidden');
})().catch(error => { console.error(error); process.exitCode = 1; });

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const {readAsset} = require('./asset-source.cjs');
const dir = path.resolve(__dirname, '../backend/web_dashboard/static');
const simulation = readAsset(path.join(dir, 'gen3-sim.js'));

test('simulation button and controller share a fixed, serial-free payload and reject busy/disconnected states', () => {
  const source = simulation.slice(simulation.indexOf('window.SurgeSimulation = {'), simulation.indexOf('// Start only a finite simulation'));
  const elements = {
    'sim-param-yaw-amp': {value: '7'}, 'sim-param-pitch-amp': {value: '8'},
    'sim-param-freq': {value: '.12'}, 'sim-param-lag': {value: '90'},
    'sim-param-offset': {value: '45'}, 'sim-param-bias': {value: '2'}
  };
  const context = vm.createContext({window: {getSimulationTracking: () => ({verified: true}), getSimulationSpeed: () => 1500},
    $: id => elements[id], crypto: {randomUUID: () => 'request'}, simOperator: true, simulationBusy: false,
    simulationState: 'connected', simulationSettingsDirty: false, routeDraft: [[0, 0], [1, 0]],
    activeParams: {yaw: 7, pitch: 8, freq: .12, lag: 90, offset: 45, bias: 2}, syncUIWithParams() {}});
  vm.runInContext(source, context);
  const api = context.window.SurgeSimulation;
  const payload = api.startPayload();
  assert.equal(payload.execution, 'simulation');
  assert.equal(payload.port, undefined);
  assert.equal(payload.yaw, 7);
  assert.equal(payload.speed, 1500);
  assert.equal(payload.duration, 120);
  assert.equal(payload.simulation_path.length, 2);
  assert.equal(api.draft().frequency, .12);
  context.simulationBusy = true;
  assert.throws(() => api.startPayload(), /idle simulation/);
  context.simulationBusy = false; context.simulationState = 'disconnected';
  assert.throws(() => api.startPayload(), /idle simulation/);
});

test('hardware execution is confined to hardware or explicit dry run', () => {
  const source = require('node:fs').readFileSync(path.join(dir, 'gen3.js'), 'utf8');
  const block = source.match(/function hardwareExecution\(\) \{[^}]+\}/)[0];
  const toggle = {checked: true};
  const context = vm.createContext({$: () => toggle});
  vm.runInContext(block, context);
  assert.equal(context.hardwareExecution(), 'preview');
  toggle.checked = false;
  assert.equal(context.hardwareExecution(), 'hardware');
  assert(!source.includes("$('execution')"));
});

test('Gen 2.1 is simulation-only and requires a fresh connected SIM engine to start', () => {
  const source = readAsset(path.join(dir, 'script.js'));
  assert(!/ST3215|serial-port|workspace-hardware/.test(source), 'Gen 2.1 must not expose hardware');
  const begin = source.indexOf('    let workspaceState = null');
  const end = source.indexOf("    window.SurgeGamepad?.mount(document.getElementById('gen21-simulation-controller')", begin);
  const context = vm.createContext({Date: {now: () => 10000}});
  vm.runInContext(source.slice(begin, end), context);
  const set = code => vm.runInContext(code, context);
  set("workspaceState = {is_running:true, engine:'SIM'}; workspaceObservedAt = 10000");
  assert.doesNotThrow(() => context.requireSimulationEngine());
  set("workspaceState.engine='ST3215'");
  assert.throws(() => context.requireSimulationEngine(), /Connect the SIM engine/);
  set("workspaceState.engine='SIM'; workspacePending=true");
  assert.throws(() => context.requireSimulationEngine(), /Connect the SIM engine/);
  set('workspacePending=false; workspaceObservedAt=8000');
  assert.throws(() => context.requireSimulationEngine(), /Connect the SIM engine/);
});

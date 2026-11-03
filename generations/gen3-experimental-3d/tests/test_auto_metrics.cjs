const assert = require('node:assert/strict');
const vm = require('node:vm');
const {readAsset} = require('./asset-source.cjs');
const source = readAsset('generations/gen3-experimental-3d/backend/web_dashboard/static/gen3.js');
let now = 10000, calls = 0, finish;
const elements = {port: {value: 'FAKE'}, 'tab-operate': {getAttribute: () => 'true'}, 'bus-refresh-status': {}};
const context = {$: id => elements[id], Date: {now: () => now}, document: {hidden: false},
  currentIsOperator: true, pendingAction: false,
  api: async () => {calls++; await new Promise(resolve => {finish = resolve;});}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('let metricsRefreshAt ='), source.indexOf('function renderBusMetrics(')), context);
(async () => {
  const idle = {busy: false, firmware: {is_busy: false}};
  const first = context.refreshHardwareMetrics(idle);
  await context.refreshHardwareMetrics(idle);
  assert.equal(calls, 1, 'No overlapping serial requests');
  finish(); await first;
  now += 1000; await context.refreshHardwareMetrics(idle);
  assert.equal(calls, 1, 'Refresh is throttled');
  now += 3000;
  for (const key of ['busy', 'firmware']) {
    await context.refreshHardwareMetrics({...idle, [key]: key === 'busy' ? true : {is_busy: true}});
  }
  context.currentIsOperator = false; await context.refreshHardwareMetrics(idle);
  context.currentIsOperator = true;
  elements['tab-operate'].getAttribute = () => 'false'; await context.refreshHardwareMetrics(idle);
  assert.equal(calls, 1, 'No reads during motion, firmware, Viewer or Simulation');
  elements['tab-operate'].getAttribute = () => 'true';
  const second = context.refreshHardwareMetrics(idle);
  assert.equal(calls, 2, 'Idle metrics refresh again without a click');
  finish(); await second;
  now += 3000;
  context.api = async () => {calls++; throw new Error('unplugged');};
  await context.refreshHardwareMetrics(idle);
  assert.match(elements['bus-refresh-status'].textContent, /failed: unplugged/);
  now += 3000; await context.refreshHardwareMetrics(idle);
  assert.equal(calls, 3, 'A failed connection backs off instead of immediately retrying');
  now += 12000; await context.refreshHardwareMetrics(idle);
  assert.equal(calls, 4);
  console.log('Idle bus metrics refresh automatically, with throttling and ownership guards');
})().catch(err => {console.error(err); process.exitCode = 1;});

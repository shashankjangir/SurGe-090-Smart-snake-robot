const {readAsset} = require('./asset-source.cjs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const source = readAsset('generations/gen3-experimental-3d/backend/web_dashboard/static/data/gen3-api.js', 'utf8');
const calls = [];
let sequence = 0;
const context = {session: null, crypto: {randomUUID: () => `request-${++sequence}`},
  fetch: async (path, options) => {calls.push({path, body: JSON.parse(options.body)});
    return {ok: true, json: async () => ({success: true})};}};
vm.createContext(context);
vm.runInContext(source, context);
(async () => {
  for (const mode of ['read', 'align', 'jog']) await context.api('start', {mode});
  await context.api('center', {id: 1});
  assert.equal(new Set(calls.map(c => c.body.request_id)).size, 4);
  assert(calls.every(c => c.body.request_id));
  await context.api('start', {mode: 'gait', request_id: 'retry-id'});
  assert.equal(calls.at(-1).body.request_id, 'retry-id');
  await context.api('stop', {});
  assert.equal(calls.at(-1).body.request_id, undefined);
  const panels = {'panel-runs': {classList: {add() {}, remove() {}}}, 'panel-calibration': {classList: {add() {}, remove() {}}}};
  const refreshes = [];
  const tabs = Object.keys(panels).map(id => ({setAttribute() {}, getAttribute: () => id,
    classList: {add() {}, remove() {}}, addEventListener() {}}));
  const tabContext = {document: {querySelectorAll: () => tabs}, $: id => panels[id],
    window: {location: {}}, tabNavAnimated: null, showError: error => {throw error;},
    loadRuns: async () => refreshes.push('runs')};
  vm.createContext(tabContext);
  const page = readAsset('generations/gen3-experimental-3d/backend/web_dashboard/static/pages/gen3.js');
  vm.runInContext(page.slice(page.indexOf('const consoleTabs'), page.indexOf('function syncHashTab()')), tabContext);
  tabContext.selectTab(0, false);
  tabContext.selectTab(1, false);
  assert.deepEqual(refreshes, ['runs']);
  const labels = {window: {}};
  vm.runInNewContext(readAsset('generations/gen3-experimental-3d/backend/web_dashboard/static/components/motion-state.js', 'utf8'), labels);
  assert.equal(labels.window.MotionState.classify('Planar simulation: 11 links / 10 joints', false), 'idle');
  console.log('All commissioning starts get unique request IDs; retries and Stop are preserved');
})().catch(error => {console.error(error); process.exitCode = 1;});

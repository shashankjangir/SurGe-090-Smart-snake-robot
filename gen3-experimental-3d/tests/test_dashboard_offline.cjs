const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/gen3.js'), 'utf8');
const pollSource = source.slice(source.indexOf('async function poll()'), source.indexOf('async function pollSystemStats()'));
const elements = {};
function element(id) {
  return elements[id] ||= { textContent: '', innerHTML: '', hidden: false, disabled: false, className: '', dataset: {}, classList: { add() {}, toggle() {}, remove() {} } };
}
const rows = Array.from({ length: 10 }, () => ({ cells: [{}, {}, { textContent: 'Valid' }] }));
element('telemetry-body').children = rows;
const jobs = [{ disabled: false }];
let fail = true;
let state = { status: 'idle', busy: false, telemetry: {}, elapsed_seconds: 0 };
const context = {
  $: element,
  api: async () => {
    if (fail) throw new Error('network failure');
    return state;
  },
  document: { getElementById: element, querySelector: () => element('timers'), querySelectorAll: () => jobs },
  showError: error => { element('error').textContent = error ? error.message : ''; },
  formatRunTime: () => '00:00', checkDraftDifferences() {}, currentIsOperator: true,
  pendingAction: false, currentConfig: null, currentRunId: null, appliedSettings: null,
  lastKnownOperator: undefined, statusOnline: true, Date, Math, Boolean, Error,
};
vm.createContext(context);
context.window = {};
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/motion-state.js'), 'utf8'), context);
context.MotionState = context.window.MotionState;
vm.runInContext(pollSource, context);
(async () => {
  await context.poll();
  assert.match(element('status').textContent, /unknown/);
  assert.equal(element('floating-stop-state').textContent, 'Status unknown');
  assert.match(element('feedback-age').textContent, /stale/);
  assert(rows.every(row => row.cells[2].textContent === 'Stale'));
  assert(jobs[0].disabled && element('btn-start').disabled && element('btn-apply').disabled);
  assert(!element('floating-stop-btn').disabled);
  fail = false;
  await context.poll();
  assert.equal(element('status').textContent, 'idle');
  assert.equal(element('feedback-age').textContent, 'Feedback: not sampled');
  assert(!jobs[0].disabled && !element('btn-start').disabled);
  context.currentIsOperator = false;
  await context.poll();
  assert(jobs[0].disabled && element('btn-start').disabled, 'polling must not re-enable viewer jobs');
  assert(!element('floating-stop-btn').disabled);
  context.currentIsOperator = true;
  assert.equal(element('error').textContent, '');
  state = { ...state, busy: true, status: 'Starting', active_settings: {} };
  await context.poll();
  assert.equal(element('btn-start').textContent, 'Starting…');
  state.status = 'Running';
  await context.poll();
  assert.equal(element('btn-start').textContent, 'Running');
  state.status = 'Stop requested; waiting for torque-off cleanup';
  await context.poll();
  assert.equal(element('floating-stop-state').textContent, 'Stopping');
  state = { ...state, busy: false, status: 'Stopped: Stop requested' };
  await context.poll();
  assert.equal(element('floating-stop-state').textContent, 'Stopped');
  state.status += '; torque-off acknowledgement failed';
  await context.poll();
  assert.match(element('floating-stop-state').textContent, /Unknown/);
  console.log('Dashboard offline and recovery checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

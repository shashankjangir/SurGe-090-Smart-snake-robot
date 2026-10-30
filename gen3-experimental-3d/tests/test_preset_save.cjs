const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/static/gen3.js', 'utf8');
const save = source.slice(source.indexOf('const savePresetForm ='), source.indexOf('// Runs Journal'));
const elements = Object.fromEntries(['save-preset-form', 'preset-save-status', 'save-preset-pattern', 'preset-name', 'preset-desc'].map(id => [id, {value: '', textContent: ''}]));
elements['save-preset-pattern'].value = 'sidewinding';
elements['preset-name'].value = 'test';
const draft = {yaw: 1, pitch: 2, bias: 0, frequency: .1, lag: 90, offset: 90, speed: 1500, ramp: 2, duration: 10};
let request;
const context = { $: id => elements[id], statusOnline: true, presets: [], getDraftSettings: () => ({...draft}),
  window: {confirm: () => true, SurgeSimulationPresets: {sidewinding: {yaw:30, pitch:25, bias:0, freq:.5, lag:90, offset:90}}},
  action: fn => fn(), api: async (path, body) => {request = {path, body};}, loadPresets: async () => {} };
vm.runInNewContext(save, context);
(async () => {
  elements['save-preset-form'].onsubmit({preventDefault(){}});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(request.path, 'presets');
  assert.equal(request.body.preset.yaw, 30);
  assert.equal(request.body.preset.frequency, .5);
  assert.equal(request.body.preset.speed, 1500);
  assert.equal(request.body.preset.duration, 10);
  assert.equal(request.body.expected, null);
  assert.match(elements['preset-save-status'].textContent, /Saved/);
  console.log('Preset form uses the selected gait and retains draft speed and duration');
})().catch(error => {console.error(error); process.exitCode = 1;});

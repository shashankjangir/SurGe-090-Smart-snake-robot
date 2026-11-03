const {readAsset} = require('./asset-source.cjs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const source = readAsset('generations/gen3-experimental-3d/backend/web_dashboard/static/gen3-sim.js', 'utf8');
const select = {options: [], add(option) { this.options.push(option); }, addEventListener(_, fn) { this.change = fn; }};
const loaded = [];
const context = {window: {}, $: id => id === 'operate-spatial-preset' ? select : null,
  Option: function(label, value) { this.label = label; this.value = value; },
  loadPresetToDraft: p => loaded.push(p)};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  const gait ='), source.indexOf('  const DEFAULT_PARAMS =')), context);
vm.runInContext(source.slice(source.indexOf('  function initPresets() {'), source.indexOf("    const sel = $('sim-3d-preset');")) + '}', context);
context.initPresets();
const waveforms = Object.keys(context.window.SurgeSimulationPresets).filter(key => key !== 'custom');
assert(waveforms.includes('caterpillar'));
assert.equal(select.options.length, waveforms.length);
for (const option of select.options) {
  select.value = option.value;
  select.change();
  const draft = loaded.at(-1);
  const preset = context.window.SurgeSimulationPresets[option.value];
  for (const field of ['yaw', 'pitch', 'bias', 'lag', 'offset']) assert.equal(draft[field], preset[field]);
  assert.equal(draft.frequency, preset.freq);
  for (const field of ['speed', 'ramp', 'duration', 'torque', 'fric']) assert.equal(draft[field], undefined);
}
select.value = '';
select.change();
assert.equal(loaded.length, waveforms.length);
console.log('Control presets reuse every spatial waveform without overriding run limits');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/gen3.js'), 'utf8');
const start = source.indexOf('function updatePresetSelection()');
const end = source.indexOf('function loadPresetToDraft(p)', start);
const elements = {
  'load-selected-preset': {},
  'preset-selection-status': {},
};
let loaded = null;
const context = vm.createContext({
  presets: [{name: 'Pitch 5'}, {name: '<b>Yaw</b>'}],
  selectedPresetName: null,
  $: id => elements[id],
  loadPresetToDraft: preset => { loaded = preset; },
});
vm.runInContext(source.slice(start, end), context);
vm.runInContext('updatePresetSelection()', context);
assert.equal(elements['load-selected-preset'].disabled, true);
context.selectedPresetName = '<b>Yaw</b>';
vm.runInContext('updatePresetSelection()', context);
assert.equal(elements['load-selected-preset'].disabled, false);
assert.equal(loaded, null, 'Selecting must not load or execute a preset');
assert.match(elements['preset-selection-status'].textContent, /^<b>Yaw<\/b> selected/);
elements['load-selected-preset'].onclick();
assert.equal(loaded.name, '<b>Yaw</b>');
loaded = null;
context.presets = [];
vm.runInContext('updatePresetSelection()', context);
assert.equal(elements['load-selected-preset'].disabled, true);
assert.match(elements['preset-selection-status'].textContent, /No saved presets/);
elements['load-selected-preset'].onclick();
assert.equal(loaded, null, 'Removed selection must not load');
console.log('Gen 3 preset selection: 8 checks passed');

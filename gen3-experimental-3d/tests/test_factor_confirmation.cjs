const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Operator Factor Confirmation & Warnings...');

const htmlPath = path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/gen3.html');
const jsPath = path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/gen3.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

// 1. Verify confirmation modal elements in gen3.html
const requiredIds = [
  'factor-confirm-modal',
  'factor-confirm-title',
  'factor-confirm-operator',
  'factor-confirm-list',
  'factor-confirm-proceed',
  'factor-confirm-cancel',
  'factor-confirm-close'
];

requiredIds.forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing modal element: id="${id}" in gen3.html`);
});
console.log('  PASS: All modal DOM elements verified in gen3.html');

// 2. Verify PARAMETER_METADATA exists in gen3.js with explicit warnings
assert(js.includes('const PARAMETER_METADATA = {'), 'PARAMETER_METADATA missing from gen3.js');
assert(js.includes('Run Speed of Counts'), 'Run Speed of Counts missing from metadata');
assert(js.includes('Default Map Speed of Counts'), 'Default Map Speed of Counts missing from metadata');
assert(js.includes('encoder counts/sec'), 'Speed of counts explanation missing');
assert(js.includes('mechanical stress'), 'Mechanical stress warning missing');
assert(js.includes('current draw'), 'Current draw warning missing');
console.log('  PASS: PARAMETER_METADATA with explicit speed of counts and stress warnings verified');

// 3. Verify confirmParameterChanges function exists and validates operator
assert(js.includes('function confirmParameterChanges('), 'confirmParameterChanges function missing');
assert(js.includes('Operator mode required'), 'Operator mode check missing from confirmParameterChanges');
console.log('  PASS: confirmParameterChanges with operator guard verified');

// 4. Verify live apply, map-form, and gait-form integrate confirmParameterChanges
assert(js.includes('confirmParameterChanges(changes, \'Confirm Live Parameter Update\')'), 'Live apply confirmation missing');
assert(js.includes('confirmParameterChanges(changes, \'Confirm Calibration Map Update\')'), 'Calibration map confirmation missing');
assert(js.includes('confirmParameterChanges(changes, \'Confirm Motion Trial Parameters\')'), 'Motion trial confirmation missing');
console.log('  PASS: Live Apply, Calibration Map, and Motion Trial confirmation integrations verified');

console.log('\nAll Factor Confirmation & Warnings checks passed successfully!');

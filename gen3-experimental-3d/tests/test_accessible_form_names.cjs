const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/static/gen3.js', 'utf8');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const map = JSON.parse(fs.readFileSync('gen3-experimental-3d/joint_map.json', 'utf8'));
const rows = [];
const context = {
  data: {joints: [...map.joints].reverse()},
  tbody: {append: row => rows.push(row)},
  document: {createElement: () => ({innerHTML: ''})}, escapeHTML
};
const start = source.indexOf('  data.joints.forEach(');
vm.runInNewContext(source.slice(start, source.indexOf("\n$('map-form')", start)).trim().replace(/}\s*$/, ''), context);
assert.equal(rows.length, 10);
rows.forEach((row, index) => {
  const joint = context.data.joints[index];
  const controls = [...row.innerHTML.matchAll(/<(?:input|select)\b[^>]*>/g)].map(match => match[0]);
  assert.equal(controls.length, 5);
  for (const [field, property] of Object.entries({axis: 'axis', sign: 'sign', zero: 'zero offset', min: 'minimum encoder count', max: 'maximum encoder count'})) {
    const control = controls.find(tag => tag.includes(`data-field="${field}"`));
    assert(control.includes(`aria-label="Joint ${joint.id} ${property}"`));
    if (['zero', 'min', 'max'].includes(field)) assert(control.includes(`value="${joint[field]}"`));
  }
  assert(row.innerHTML.includes(`<th scope="row"><strong>${joint.id}</strong></th>`));
  assert(row.innerHTML.includes(`value="${joint.axis}" selected`));
  assert(row.innerHTML.includes(`value="${joint.sign}" selected`));
});
const runsStart = source.indexOf('async function loadRuns()');
const templateStart = source.indexOf('    tr.innerHTML = `', runsStart);
const templateEnd = source.indexOf("    tr.querySelector('.btn-save-ann')", templateStart);
for (const runID of ['12', 'run-42', 'run-"quoted"']) {
  const tr = {};
  vm.runInNewContext(source.slice(templateStart, templateEnd), {tr, r: {run_id: runID}, ann: {}, dateStr: '', escapeHTML});
  for (const [field, hint, name] of [['disp','Disp cm','displacement in cm'],['surf','Surface','surface'],['notes','Notes','notes']]) {
    const control = tr.innerHTML.match(new RegExp(`<input[^>]*class="ann-${field}"[^>]*>`))[0];
    assert(control.includes(`aria-label="Run ${escapeHTML(runID)} ${name}"`));
    assert(control.includes(`placeholder="${hint}"`));
  }
}
const html = fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/templates/gen3.html', 'utf8');
const table = html.slice(html.indexOf('<form id="map-form">'), html.indexOf('</table>', html.indexOf('<form id="map-form">')));
assert(table.includes('<caption class="sr-only">Joint calibration map</caption>'));
assert.equal((table.match(/<th scope="col">/g) || []).length, 7);
console.log('Accessible names: all 50 joint controls, run-specific annotations, and table semantics passed');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/gen3.js'), 'utf8');
const start = source.indexOf('async function loadPorts()');
const end = source.indexOf("$('refresh-ports')", start);
function field(value) {
  return {value, disabled: false, attrs: {}, options: [],
    setAttribute(k, v) { this.attrs[k] = v; },
    replaceChildren(option) { this.options = [option]; this.value = option.value; },
    add(option) { this.options.push(option); }};
}
const fields = {port: field('COM6'), 'fw-port': field('COM7')};
let finish;
const context = vm.createContext({$: id => fields[id],
  Option: function(text, value) { this.text = text; this.value = value; },
  api: () => new Promise(resolve => { finish = resolve; })});
vm.runInContext(source.slice(start, end), context);
(async () => {
  const loading = context.loadPorts();
  assert.equal(fields.port.disabled, true);
  assert.equal(fields.port.attrs['aria-busy'], 'true');
  finish({ports: [{device:'COM6', description:'Transmitter'}, {device:'COM7', description:'Board'}]});
  await loading;
  assert.equal(fields.port.value, 'COM6');
  assert.equal(fields['fw-port'].value, 'COM7');
  assert.equal(fields.port.disabled, false);
  context.api = async () => ({ports: []});
  await context.loadPorts();
  assert.match(fields.port.options[0].text, /No ports/);
  assert.equal(fields.port.value, '');
  context.api = async () => { throw Error('offline'); };
  await assert.rejects(context.loadPorts(), /offline/);
  assert.match(fields.port.options[0].text, /Could not load/);
  assert.equal(fields.port.attrs['aria-busy'], 'false');
  assert.equal(fields.port.disabled, false);
  console.log('Port select loading, independent selection, empty and failure checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

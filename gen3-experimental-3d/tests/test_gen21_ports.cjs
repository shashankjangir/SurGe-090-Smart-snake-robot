const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/static/script.js'), 'utf8');
const start = source.indexOf('    async function loadSerialPorts()');
const end = source.indexOf("    document.getElementById('refresh-ports')", start);
const select = { tagName: 'SELECT', value: '', options: [], set innerHTML(value) { this.options = []; }, appendChild(option) { this.options.push(option); } };
const context = { document: { getElementById: () => select, createElement: () => ({}) }, fetch: async () => ({ json: async () => ({ ports: [{ device: 'COM6', description: 'Transmitter' }] }) }), console };
vm.runInNewContext(source.slice(start, end), context);
context.loadSerialPorts().then(() => {
  assert.equal(select.options[0].value, '');
  assert.equal(select.options[0].textContent, 'Select serial port');
  assert.equal(select.options[1].value, 'COM6');
  assert.equal(select.options[1].textContent, 'COM6 — Transmitter');
  console.log('Gen 2.1 serial port options use the API device and description');
}).catch(error => { console.error(error); process.exitCode = 1; });

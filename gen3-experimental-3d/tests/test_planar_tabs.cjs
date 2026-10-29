const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const handlers = () => ({ events: {}, addEventListener(name, fn) { this.events[name] = fn; } });
const panels = { 'control-hub': {}, 'telemetry-hub': {} };
const tabs = ['control-hub', 'telemetry-hub'].map(id => ({
  ...handlers(), attributes: {}, getAttribute() { return id; },
  setAttribute(name, value) { this.attributes[name] = value; },
  focus() { this.focused = true; }
}));
const context = {
  document: { querySelectorAll: selector => selector.startsWith('.cockpit-tabs') ? tabs : [], getElementById: id => panels[id] },
  window: handlers(), location: { hash: '' }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/static/planar-tabs.js'), 'utf8'), context);
tabs[1].events.click();
assert.equal(panels['control-hub'].hidden, true);
assert.equal(panels['telemetry-hub'].hidden, false);
assert.equal(tabs[1].attributes['aria-selected'], 'true');
tabs[1].events.keydown({ key: 'ArrowRight', preventDefault() {} });
assert.equal(panels['control-hub'].hidden, false);
assert.equal(tabs[0].focused, true);
console.log('Planar cockpit tabs switch panels and support keyboard navigation');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = name => fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/' + name, 'utf8');
const panels = Array.from({length: 5}, () => ({classList: {add() {}, remove() {}}}));
let focused = null;
const tabs = panels.map((panel, index) => ({
  tabIndex: index === 0 ? 0 : -1,
  attributes: {'aria-controls': 'panel-' + index, 'aria-selected': String(index === 0)},
  classList: {add() {}, remove() {}},
  setAttribute(key, value) {this.attributes[key] = value;},
  getAttribute(key) {return this.attributes[key];},
  addEventListener(type, callback) {this[type] = callback;},
  focus() {focused = index;}, click() {focused = null; this.onclick();}
}));
const source = read('static/gen3.js');
vm.runInNewContext(source.slice(source.indexOf('const consoleTabs'), source.indexOf('function syncHashTab()')), {
  document: {querySelectorAll: selector => selector === '.tab-btn' ? tabs : panels},
  $: id => panels[Number(id.split('-')[1])], window: {location: {}}, tabNavAnimated: null
});
function key(index, name, expected) {
  const event = {key: name, preventDefault() {this.prevented = true;}};
  tabs[index].keydown(event);
  assert.equal(focused, expected);
  assert.equal(event.prevented, true);
  tabs.forEach((tab, i) => {
    assert.equal(tab.tabIndex, i === expected ? 0 : -1);
    assert.equal(tab.attributes['aria-selected'], String(i === expected));
  });
}
key(0, 'ArrowLeft', 4);
key(4, 'ArrowRight', 0);
key(0, 'End', 4);
key(4, 'Home', 0);
tabs[2].click();
assert.equal(tabs[2].tabIndex, 0);
assert.equal(tabs[0].tabIndex, -1);
const script = read('static/script.js');
const start = script.indexOf("    document.addEventListener('keydown', (e) => {");
const pan = {panX: 0, panY: 0, renders: 0};
pan.renderCanvas = () => pan.renders++;
pan.document = {addEventListener: (_, callback) => pan.keydown = callback};
vm.createContext(pan);
vm.runInContext(script.slice(start, script.indexOf('\n    });', start) + 8), pan);
for (const tag of ['input', 'textarea', 'select']) {
  pan.keydown({key: 'ArrowLeft', target: {matches: selector => selector.split(', ').includes(tag)}});
}
pan.keydown({key: 'ArrowLeft', target: {isContentEditable: true}});
for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) pan.keydown({key: 'ArrowLeft', [modifier]: true});
assert.equal(pan.renders, 0);
for (const target of [null, {matches: () => false, isContentEditable: false}]) pan.keydown({key: 'ArrowLeft', target});
assert.equal(pan.panX, 80);
assert.equal(pan.renders, 2);
const html = read('templates/gen3.html');
assert(html.includes('<section class="canvas-container" id="sim-canvas-hub" aria-label="Simulation viewport">'));
assert.equal((html.match(/<main[\s>]/g) || []).length, 1);
assert.equal((html.match(/role="tab" tabindex="0"/g) || []).length, 1);
assert.equal((html.match(/role="tab" tabindex="-1"/g) || []).length, 4);
for (const template of ['index', 'gen3']) {
  const markup = read('templates/' + template + '.html');
  assert(markup.includes('id="login-password" tabindex="-1"'));
  assert.match(markup, /id="btn-toggle-password"[^>]*tabindex="-1"/);
}
console.log('Keyboard navigation: tab wrap/Home/End/click, editable/modifier guards, collapsed focus and one main landmark passed');

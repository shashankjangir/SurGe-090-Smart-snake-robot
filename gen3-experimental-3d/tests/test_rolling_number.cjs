const assert = require('node:assert/strict');
const { updateRollingNumber } = require('../../gen3-experimental-3d/backend/web_dashboard/static/rolling-number.js');

function mockElement(tag = 'div') {
  const set = new Set();
  const classList = {
    add: cls => set.add(cls),
    contains: cls => set.has(cls),
    remove: cls => set.delete(cls)
  };
  return {
    tagName: tag,
    children: [],
    dataset: {},
    attributes: {},
    classList,
    set className(val) {
      set.clear();
      if (val) val.split(/\s+/).forEach(c => set.add(c));
    },
    get className() {
      return Array.from(set).join(' ');
    },
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    appendChild(child) { this.children.push(child); child.parentElement = this; },
    replaceChildren() { this.children = []; },
    get firstElementChild() { return this.children[0] || null; },
    style: {}
  };
}

// Minimal DOM mock for Node environment
global.document = {
  createElement: tag => mockElement(tag)
};

// 1. Basic number precision
const el1 = mockElement('span');
updateRollingNumber(el1, 14.5678, { precision: 2 });
assert.equal(el1.attributes['aria-label'], '14.57');
assert.equal(el1.attributes['role'], 'text');
assert.equal(el1.classList.contains('rolling-number'), true);
assert.equal(el1.children.length, 5); // '1', '4', '.', '5', '7'
assert.equal(el1.children[0].classList.contains('rolling-digit'), true);
assert.equal(el1.children[2].classList.contains('rolling-char'), true);
assert.equal(el1.children[0].firstElementChild.style.transform, 'translateY(-10%)'); // digit 1
assert.equal(el1.children[1].firstElementChild.style.transform, 'translateY(-40%)'); // digit 4
assert.equal(el1.children[4].firstElementChild.style.transform, 'translateY(-70%)'); // digit 7

// 2. Custom format function
const el2 = mockElement('span');
updateRollingNumber(el2, 10, { format: n => `$${n.toFixed(2)}` });
assert.equal(el2.attributes['aria-label'], '$10.00');
assert.equal(el2.children[0].classList.contains('rolling-char'), true);
assert.equal(el2.children[0].textContent, '$');

// 3. String values (e.g. clock "01:23")
const el3 = mockElement('span');
updateRollingNumber(el3, '01:23');
assert.equal(el3.attributes['aria-label'], '01:23');
assert.equal(el3.children.length, 5);
assert.equal(el3.children[2].textContent, ':');

// 4. Update transitions to new digit without rebuilding identical layout
const col0 = el1.children[0];
updateRollingNumber(el1, 28.95, { precision: 2 });
assert.equal(el1.attributes['aria-label'], '28.95');
assert.equal(el1.children[0], col0); // Reused column element
assert.equal(el1.children[0].firstElementChild.style.transform, 'translateY(-20%)'); // rolled to 2

console.log('RollingNumber component: 4 checks passed');

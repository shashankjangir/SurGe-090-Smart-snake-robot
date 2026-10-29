/**
 * Unit tests for MorphingButton (Operator Password Login Component)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser DOM environment
class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
  contains(c) { return this.classes.has(c); }
  has(c) { return this.classes.has(c); }
}

class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.classList = new MockClassList();
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.value = '';
    this.type = 'password';
    this.textContent = '';
    this.focused = false;
    this.selected = false;
    this.children = [];
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
  dispatchEvent(evt) {
    const handlers = this.listeners[evt.type] || [];
    for (const h of handlers) h(evt);
    return !evt.defaultPrevented;
  }
  contains(child) {
    return child === this || (child && child.parent === this);
  }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  appendChild(child) {
    child.parent = this;
    this.children.push(child);
  }
  querySelector(sel) {
    for (const child of this.children) {
      if (sel.startsWith('.') && child.classList.contains(sel.slice(1))) return child;
      if (sel.startsWith('#') && child.id === sel.slice(1)) return child;
    }
    return null;
  }
}

class MockEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.cancelable = init.cancelable || false;
    this.bubbles = init.bubbles || false;
    this.key = init.key || '';
    this.target = init.target || null;
    this.defaultPrevented = false;
    this.propagationStopped = false;
  }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.propagationStopped = true; }
}

// Setup DOM elements
const container = new MockElement('morphing-password-container');
const input = new MockElement('login-password', 'input');
input.parent = container;
const actionBtn = new MockElement('btn-login', 'button');
actionBtn.setAttribute('aria-expanded', 'false');
actionBtn.parent = container;
const label = new MockElement('morphing-btn-label', 'span');
label.textContent = 'Password';
const form = new MockElement('operator-login-form', 'form');

const toggleBtn = new MockElement('btn-toggle-password', 'button');
toggleBtn.parent = container;
const eyeShow = new MockElement('eye-show', 'svg');
eyeShow.classList.add('eye-show');
const eyeHide = new MockElement('eye-hide', 'svg');
eyeHide.classList.add('eye-hide');
toggleBtn.appendChild(eyeShow);
toggleBtn.appendChild(eyeHide);

const loginError = new MockElement('login-error', 'span');
loginError.style.display = 'none';

let formSubmitted = false;
form.requestSubmit = () => { formSubmitted = true; };

const elements = {
  'morphing-password-container': container,
  'login-password': input,
  'btn-login': actionBtn,
  'morphing-btn-label': label,
  'operator-login-form': form,
  'btn-toggle-password': toggleBtn,
  'login-error': loginError,
};

const docListeners = {};
global.document = {
  readyState: 'complete',
  getElementById: (id) => elements[id] || null,
  addEventListener: (evt, fn) => {
    if (!docListeners[evt]) docListeners[evt] = [];
    docListeners[evt].push(fn);
  },
  dispatchEvent: (evt) => {
    const handlers = docListeners[evt.type] || [];
    for (const h of handlers) h(evt);
  }
};
global.window = {};

// Load component code
const code = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/morphing-button.js'), 'utf8');
eval(code);

const morphingBtn = global.window.morphingPasswordButton;
assert(morphingBtn, 'morphingPasswordButton should be initialized on window');

// Test 1: Initial state is collapsed
assert.strictEqual(morphingBtn.isExpanded(), false, 'Should initially be collapsed');
assert.strictEqual(container.classList.contains('is-expanded'), false, 'Container should not have is-expanded class');
assert.strictEqual(actionBtn.getAttribute('aria-expanded'), 'false', 'Initial aria-expanded is false');

// Test 2: Click to expand
const clickEvt1 = new MockEvent('click');
actionBtn.dispatchEvent(clickEvt1);
assert.strictEqual(morphingBtn.isExpanded(), true, 'Should be expanded after click');
assert.strictEqual(container.classList.contains('is-expanded'), true, 'Container should have is-expanded class');
assert.strictEqual(actionBtn.getAttribute('aria-expanded'), 'true', 'aria-expanded should be true');
assert.strictEqual(label.textContent, 'Login →', 'Label should change to Login →');
assert.strictEqual(clickEvt1.defaultPrevented, true, 'Default click should be prevented');
assert.strictEqual(clickEvt1.propagationStopped, true, 'Propagation should be stopped');
assert.strictEqual(input.focused, true, 'Input must receive immediate focus when password button is clicked');

// Test 3: Click outside to collapse
const outsideEl = new MockElement('outside-element');
const mousedownEvt = new MockEvent('mousedown', { target: outsideEl });
const mousedownHandlers = docListeners['mousedown'] || [];
for (const h of mousedownHandlers) h(mousedownEvt);

assert.strictEqual(morphingBtn.isExpanded(), false, 'Should collapse on outside click');
assert.strictEqual(container.classList.contains('is-expanded'), false, 'Container should no longer have is-expanded class');
assert.strictEqual(actionBtn.getAttribute('aria-expanded'), 'false', 'aria-expanded should be false');
assert.strictEqual(label.textContent, 'Password', 'Label should reset to Password');

// Test 4: Escape key inside expanded input collapses
morphingBtn.expand();
assert.strictEqual(morphingBtn.isExpanded(), true, 'Expanded via API');
const escEvt = new MockEvent('keydown', { key: 'Escape' });
input.dispatchEvent(escEvt);
assert.strictEqual(morphingBtn.isExpanded(), false, 'Escape should collapse input');
assert.strictEqual(escEvt.defaultPrevented, true, 'Escape default should be prevented');

// Test 5: Empty input enter triggers shake
morphingBtn.expand();
input.value = '';
const enterEmptyEvt = new MockEvent('keydown', { key: 'Enter' });
input.dispatchEvent(enterEmptyEvt);
assert.strictEqual(container.classList.contains('has-error'), true, 'Empty enter should add has-error shake class');

// Test 6: Valid password enter submits form
input.value = 'secret_pass';
formSubmitted = false;
const enterValEvt = new MockEvent('keydown', { key: 'Enter' });
input.dispatchEvent(enterValEvt);
assert.strictEqual(formSubmitted, true, 'Valid password Enter should submit form');

// Test 7: Action button click while expanded submits form
input.value = 'secret_pass';
formSubmitted = false;
const clickEvtSubmit = new MockEvent('click');
actionBtn.dispatchEvent(clickEvtSubmit);
assert.strictEqual(formSubmitted, true, 'Action button click while expanded should submit form');

// Test 8: Password show/hide toggle button toggles input.type and eye icons
assert.strictEqual(input.type, 'password', 'Initially input.type is password');
const toggleClick1 = new MockEvent('click');
toggleBtn.dispatchEvent(toggleClick1);
assert.strictEqual(input.type, 'text', 'Clicking toggle switches input.type to text');
assert.strictEqual(eyeShow.style.display, 'none', 'eyeShow should be hidden');
assert.strictEqual(eyeHide.style.display, 'block', 'eyeHide should be shown');
assert.strictEqual(toggleBtn.getAttribute('title'), 'Hide password');

const toggleClick2 = new MockEvent('click');
toggleBtn.dispatchEvent(toggleClick2);
assert.strictEqual(input.type, 'password', 'Second click switches input.type back to password');
assert.strictEqual(eyeShow.style.display, 'block', 'eyeShow should be shown again');
assert.strictEqual(eyeHide.style.display, 'none', 'eyeHide should be hidden again');

// Test 9: Live typing input event clears error state immediately
container.classList.add('has-error');
loginError.style.display = 'inline';
const inputTypingEvt = new MockEvent('input');
input.dispatchEvent(inputTypingEvt);
assert.strictEqual(container.classList.contains('has-error'), false, 'Typing should clear has-error class');
assert.strictEqual(loginError.style.display, 'none', 'Typing should hide login-error message');

console.log('MorphingButton component: 9 checks passed (initial collapsed, click expand, outside collapse, escape collapse, shake validation, enter submit, action submit, toggle show/hide, live input update)');

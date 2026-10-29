/**
 * Unit tests for ShaderLensBlur (WebGL SDF Lens Blur Component & Custom Popover)
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
  toggle(c, force) {
    if (force === undefined) {
      if (this.classes.has(c)) { this.classes.delete(c); return false; }
      else { this.classes.add(c); return true; }
    }
    if (force) { this.classes.add(c); return true; }
    else { this.classes.delete(c); return false; }
  }
}

class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.classList = new MockClassList();
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.dataset = {};
    this.value = '82';
    this.textContent = '';
    this.children = [];
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return this.attributes[k] !== undefined; }
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
    return child === this || this.children.includes(child);
  }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
  }
  closest(sel) {
    return this.parentElement || this;
  }
  querySelectorAll() {
    return [];
  }
  querySelector() {
    return null;
  }
}

class MockEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.target = init.target || null;
    this.defaultPrevented = false;
    this.propagationStopped = false;
  }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.propagationStopped = true; }
}

// Setup Canvas and Hero DOM
const heroSection = new MockElement('hero-section');
const canvas = new MockElement('shader-lens-blur-canvas', 'canvas');
canvas.parentElement = heroSection;

const pillBtn = new MockElement('shader-blur-toggle-btn', 'button');
const popover = new MockElement('shader-blur-popover', 'div');
popover.setAttribute('hidden', '');
const pillLabel = new MockElement('shader-blur-pill-label', 'span');
const closeBtn = new MockElement('shader-popover-close', 'button');

// Mock WebGL context
const mockGl = {
  createShader: () => ({}),
  shaderSource: () => {},
  compileShader: () => {},
  getShaderParameter: () => true,
  createProgram: () => ({}),
  attachShader: () => {},
  linkProgram: () => {},
  getProgramParameter: () => true,
  useProgram: () => {},
  createBuffer: () => ({}),
  bindBuffer: () => {},
  bufferData: () => {},
  getAttribLocation: () => 0,
  enableVertexAttribArray: () => {},
  vertexAttribPointer: () => {},
  getUniformLocation: (prog, name) => ({ name }),
  uniform2f: () => {},
  uniform1f: () => {},
  uniform1i: () => {},
  uniform3f: () => {},
  viewport: () => {},
  drawArrays: () => {},
  TRIANGLES: 4,
};

canvas.getContext = (type) => (type === 'webgl' ? mockGl : null);

const elements = {
  'shader-lens-blur-canvas': canvas,
  'shader-blur-toggle-btn': pillBtn,
  'shader-blur-popover': popover,
  'shader-blur-pill-label': pillLabel,
  'shader-popover-close': closeBtn,
};

const docListeners = {};
global.document = {
  readyState: 'complete',
  getElementById: (id) => elements[id] || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: (evt, fn) => {
    if (!docListeners[evt]) docListeners[evt] = [];
    docListeners[evt].push(fn);
  },
  removeEventListener: (evt, fn) => {
    if (docListeners[evt]) {
      docListeners[evt] = docListeners[evt].filter(f => f !== fn);
    }
  },
  dispatchEvent: (evt) => {
    const handlers = docListeners[evt.type] || [];
    for (const h of handlers) h(evt);
  }
};
global.window = {
  devicePixelRatio: 1,
  innerWidth: 1024,
  innerHeight: 768,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Load component code once via require
const { hexToRgb, PALETTES, VARIATION_NAMES } = require('../../gen3-experimental-3d/backend/web_dashboard/static/shader-lens-blur.js');

// Test 1: Color converter
const rgbWhite = hexToRgb('#ffffff');
assert.deepStrictEqual(rgbWhite, [1, 1, 1], 'White hex converts to [1,1,1]');
const rgbBlack = hexToRgb('#000000');
assert.deepStrictEqual(rgbBlack, [0, 0, 0], 'Black hex converts to [0,0,0]');

// Test 2: Palettes structure
assert(PALETTES.slush, 'slush palette defined');
assert(PALETTES.cyber, 'cyber palette defined');
assert(PALETTES.ember, 'ember palette defined');
assert(PALETTES.mint, 'mint palette defined');
assert.strictEqual(PALETTES.slush.length, 4, 'slush has 4 color stops');

// Test 3: Variation names
assert.strictEqual(VARIATION_NAMES.length, 4, '4 shape variations');
assert.strictEqual(VARIATION_NAMES[0], 'Square');
assert.strictEqual(VARIATION_NAMES[1], 'Solid Circle');
assert.strictEqual(VARIATION_NAMES[2], 'Hollow Circle');
assert.strictEqual(VARIATION_NAMES[3], 'Triangle');

const shaderApi = global.window.ShaderLensBlur;
assert(shaderApi, 'ShaderLensBlur should be initialized on window');

// Test 4: Default variation is Ring (2)
assert.strictEqual(shaderApi.config.variation, 2, 'Default variation is 2 (Hollow Circle / Ring)');
assert.strictEqual(shaderApi.config.palette, 'slush');
assert.strictEqual(shaderApi.config.enableHover, true);
assert.strictEqual(shaderApi.config.invertMouse, true);
assert.strictEqual(shaderApi.config.opacity, 0.82);
assert.ok(pillLabel.textContent.includes('Hollow Circle'), 'Label reflects Hollow Circle');

// Test 5: Popover toggle button opens and closes
assert.strictEqual(popover.hasAttribute('hidden'), true, 'Popover initially hidden');
pillBtn.dispatchEvent(new MockEvent('click'));
assert.strictEqual(popover.hasAttribute('hidden'), false, 'Popover opened on pill click');
assert.strictEqual(pillBtn.getAttribute('aria-expanded'), 'true', 'aria-expanded is true');

pillBtn.dispatchEvent(new MockEvent('click'));
assert.strictEqual(popover.hasAttribute('hidden'), true, 'Popover closed on second click');
assert.strictEqual(pillBtn.getAttribute('aria-expanded'), 'false', 'aria-expanded is false');

// Test 6: Variation switching
shaderApi.setVariation(3);
assert.strictEqual(shaderApi.config.variation, 3, 'Variation set to 3 (Triangle)');
assert.ok(pillLabel.textContent.includes('Triangle'), 'Label updated to Triangle');

// Test 7: Outside click dismisses popover
popover.removeAttribute('hidden');
pillBtn.setAttribute('aria-expanded', 'true');
const outsideEl = new MockElement('outside-click');
const mousedownHandlers = docListeners['mousedown'] || [];
for (const h of mousedownHandlers) h(new MockEvent('mousedown', { target: outsideEl }));

assert.strictEqual(popover.hasAttribute('hidden'), true, 'Outside click closed popover');
assert.strictEqual(pillBtn.getAttribute('aria-expanded'), 'false', 'aria-expanded reset to false');

shaderApi.destroy();

console.log('ShaderLensBlur component: 7 checks passed (hexToRgb, 4-stop palettes, 4 variations, default Ring, popover toggle, variation switch, outside click close)');

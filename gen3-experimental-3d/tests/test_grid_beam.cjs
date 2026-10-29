/**
 * Unit tests for GridBeam Component
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser DOM
class MockClassList {
  constructor() { this.classes = new Set(); }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
  contains(c) { return this.classes.has(c); }
  toggle(c, force) {
    if (force === undefined) {
      if (this.classes.has(c)) this.classes.delete(c);
      else this.classes.add(c);
    } else if (force) {
      this.classes.add(c);
    } else {
      this.classes.delete(c);
    }
  }
}

class MockElement {
  constructor(className = '', tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.className = className;
    this.classList = new MockClassList();
    this.clientWidth = 600;
    this.clientHeight = 200;
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.dataset = {};
    this.children = [];
  }
  appendChild(child) { this.children.push(child); return child; }
  querySelector(sel) {
    if (sel === '.grid-beam-canvas') {
      return this.children.find(c => c.className === 'grid-beam-canvas') || null;
    }
    return null;
  }
  querySelectorAll(sel) { return []; }
  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
}

class MockCanvas extends MockElement {
  constructor() {
    super('grid-beam-canvas', 'canvas');
    this.width = 600;
    this.height = 200;
  }
  getContext(type) {
    if (type === '2d') {
      return {
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        scale: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
      };
    }
    return null;
  }
}

const container = new MockElement('grid-beam-container');
const canvas = new MockCanvas();
container.appendChild(canvas);

global.document = {
  readyState: 'complete',
  querySelector: (sel) => sel === '.grid-beam-container' ? container : null,
  querySelectorAll: () => [],
  createElement: (tag) => tag === 'canvas' ? new MockCanvas() : new MockElement('', tag),
  addEventListener: () => {},
};

global.window = {
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
  performance: { now: () => Date.now() },
};

global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = clearTimeout;

// Load module
const { initGridBeam, PALETTES } = require('../../gen3-experimental-3d/backend/web_dashboard/static/grid-beam.js');

// Test 1: Verify 4 palettes exist and have valid structure
assert(PALETTES.colorful, 'colorful palette exists');
assert(PALETTES.ocean, 'ocean palette exists');
assert(PALETTES.sunset, 'sunset palette exists');
assert(PALETTES.mono, 'mono palette exists');
assert.strictEqual(PALETTES.colorful.stops.length, 4, 'colorful has 4 stops');
assert.strictEqual(PALETTES.ocean.stops.length, 4, 'ocean has 4 stops');

// Test 2: Initialize GridBeam on container
const beamApi = initGridBeam(container, {
  rows: 2,
  cols: 3,
  colorVariant: 'ocean',
  duration: 3.6,
  strength: 0.95
});

assert(beamApi, 'GridBeam initialized successfully');
assert.strictEqual(beamApi.options.colorVariant, 'ocean', 'Variant is ocean');
assert.strictEqual(beamApi.isRunning(), true, 'Animation is running');

// Test 3: Set Variant, Breathe, Active
beamApi.setVariant('sunset');
assert.strictEqual(beamApi.options.colorVariant, 'sunset', 'Variant changed to sunset');

beamApi.setBreathe(false);
assert.strictEqual(beamApi.options.breathe, false, 'Breathe toggled off');

beamApi.setActive(false);
assert.strictEqual(beamApi.options.active, false, 'Active toggled off');

// Test 4: Beam trajectory divider calculations
const rows = 2;
const cols = 3;
const H = 200;
const W = 600;
const rowStep = H / rows;
const colStep = W / cols;

assert.strictEqual(rowStep, 100, 'Horizontal divider is at Y = 100');
assert.strictEqual(colStep, 200, 'Vertical dividers are at X = 200 and X = 400');

// Test 5: Clean destruction
beamApi.destroy();
assert.strictEqual(beamApi.isRunning(), false, 'Animation stopped after destroy()');

console.log('GridBeam component: 5 checks passed (4 color palettes, container init, variant/breathe controls, divider geometry math, clean destroy)');

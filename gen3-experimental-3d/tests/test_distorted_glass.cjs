'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 1. Verify CSS rules exist and are well-formed
const cssPath = path.resolve(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/distorted-glass.css');
assert(fs.existsSync(cssPath), 'distorted-glass.css must exist');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.distorted-glass'), 'Must define .distorted-glass base class');
assert(cssContent.includes('.distorted-glass-headline'), 'Must define .distorted-glass-headline for display headlines');
assert(cssContent.includes('.distorted-glass-header'), 'Must define .distorted-glass-header for top nav');
assert(cssContent.includes('.headlight-glass'), 'Must define .headlight-glass for headlight/status lights');
assert(cssContent.includes('backdrop-filter'), 'Must use backdrop-filter');
assert(cssContent.includes('#distorted-glass-filter'), 'Must reference distorted-glass-filter SVG');
assert(cssContent.includes('#headlight-glass-filter'), 'Must reference headlight-glass-filter SVG');

// 2. Verify JS component logic and SVG filter generation
const { createDistortedGlassDefs, initDistortedGlass, DISTORTED_GLASS_SVG_ID } = require('../../gen3-experimental-3d/backend/web_dashboard/static/distorted-glass.js');

// Mock a lightweight DOM environment for testing
class MockElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this._classes = new Set();
    this.classList = {
      add: (c) => this._classes.add(c),
      contains: (c) => this._classes.has(c),
      has: (c) => this._classes.has(c),
      remove: (c) => this._classes.delete(c)
    };
    this.attributes = {};
    this.innerHTML = '';
    this.children = [];
    this._listeners = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(evt, fn) { this._listeners[evt] = fn; }
}

global.document = {
  createElementNS(ns, tag) { return new MockElement(tag); },
  getElementById(id) { return this._elements?.[id] || null; },
  querySelector(sel) { return this._queries?.[sel] || null; },
  querySelectorAll(sel) { return this._multiQueries?.[sel] || []; },
  body: {
    prepend(el) {
      if (!global.document._elements) global.document._elements = {};
      global.document._elements[el.id] = el;
    }
  }
};

const defs = createDistortedGlassDefs();
assert.strictEqual(defs.id, DISTORTED_GLASS_SVG_ID, 'SVG defs must have correct ID');
assert(defs.innerHTML.includes('id="distorted-glass-filter"'), 'Must include distorted-glass-filter');
assert(defs.innerHTML.includes('id="headlight-glass-filter"'), 'Must include headlight-glass-filter');
assert(defs.innerHTML.includes('feTurbulence'), 'Must use feTurbulence');
assert(defs.innerHTML.includes('feDisplacementMap'), 'Must use feDisplacementMap');
assert(defs.innerHTML.includes('feSpecularLighting'), 'Must use feSpecularLighting for headlights');

// 3. Test class injection on elements
const mockTopNav = new MockElement('header');
const mockHeadline = new MockElement('h1');
const mockDot = new MockElement('span');

document._queries = {
  '.top-nav': mockTopNav,
  '.logo-badge': new MockElement('div'),
  '.hero-section': new MockElement('section')
};
document._multiQueries = {
  '.display-headline': [mockHeadline],
  '.status-indicator .dot, #status-dot': [mockDot]
};

initDistortedGlass();

assert(mockTopNav.classList.has('distorted-glass-header'), 'Top nav must receive distorted-glass-header class');
assert(mockHeadline.classList.has('distorted-glass-headline'), 'Headline must receive distorted-glass-headline class');
assert(mockDot.classList.has('headlight-glass'), 'Status dot must receive headlight-glass class');

console.log('DistortedGlass component: 5 checks passed (SVG filter, headlights specular lighting, CSS classes, DOM injection, headline refraction)');

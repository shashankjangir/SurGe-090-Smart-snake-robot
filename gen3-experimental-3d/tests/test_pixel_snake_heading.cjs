/**
 * Unit tests for PixelSnakeHeading Component
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser DOM environment
class MockClassList {
  constructor() { this.classes = new Set(); }
  add(...args) { args.forEach(c => this.classes.add(c)); }
  remove(...args) { args.forEach(c => this.classes.delete(c)); }
  contains(c) { return this.classes.has(c); }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.className = '';
    this.classList = new MockClassList();
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.dataset = {};
    this.children = [];
    this.textContent = '';
    this._innerHTML = '';
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
  }
  get innerHTML() {
    return this._innerHTML;
  }

  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }

  removeEventListener(evt, fn) {
    if (this.listeners[evt]) {
      this.listeners[evt] = this.listeners[evt].filter(f => f !== fn);
    }
  }

  getBoundingClientRect() {
    return {
      left: 100,
      top: 100,
      width: 400,
      height: 80,
      right: 500,
      bottom: 180,
    };
  }
}

global.document = {
  createElement: (tag) => new MockElement(tag),
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
};

global.window = {
  addEventListener: (evt, fn) => {
    if (!global.window.listeners) global.window.listeners = {};
    if (!global.window.listeners[evt]) global.window.listeners[evt] = [];
    global.window.listeners[evt].push(fn);
  },
  removeEventListener: (evt, fn) => {
    if (global.window.listeners && global.window.listeners[evt]) {
      global.window.listeners[evt] = global.window.listeners[evt].filter(f => f !== fn);
    }
  },
  listeners: {},
};

const PixelSnakeHeading = require('../../gen3-experimental-3d/backend/web_dashboard/static/pixel-snake-heading.js');

async function runTests() {
  console.log('--- Testing PixelSnakeHeading Component ---');

  // Test 1: Instantiation & Character Wrapping
  {
    console.log('Test 1: Instantiation and wrapping "SURGE 090"...');
    const headline = new MockElement('h1');
    headline.textContent = 'SURGE 090';

    const snake = new PixelSnakeHeading(headline);

    assert.strictEqual(headline.getAttribute('aria-label'), 'SURGE 090', 'Should preserve accessible aria-label');
    assert.strictEqual(headline.classList.contains('pixel-snake-active'), true, 'Should mark headline as active');

    // 'SURGE 090' has 8 non-space chars ('S','U','R','G','E','0','9','0') + 1 space
    assert.strictEqual(snake.chars.length, 8, 'Should extract 8 vertebra characters');
    assert.strictEqual(headline.children.length, 9, 'Should have 8 char spans + 1 space span');

    // Verify first char 'S'
    const char0 = snake.chars[0];
    assert.strictEqual(char0.originalChar, 'S');
    assert.strictEqual(char0.element.dataset.char, 'S');
    assert.strictEqual(char0.element.dataset.index, '0');
    assert.strictEqual(char0.element.getAttribute('aria-hidden'), 'true');

    // Verify space element
    const spaceEl = headline.children[5];
    assert.strictEqual(spaceEl.className, 'pixel-snake-space');

    snake.destroy();
    console.log('  PASS: Character wrapping and accessibility verified');
  }

  // Test 2: Kinematic Serpentine Wave Undulation
  {
    console.log('Test 2: Serpentine wave motion calculation...');
    const headline = new MockElement('h1');
    headline.textContent = 'SURGE 090';
    const snake = new PixelSnakeHeading(headline, { idleSpeed: 2.0, idleAmpY: 5.0 });

    // Manually drive ticks
    snake._tick(1000);
    snake._tick(1050);

    // Each character should have received a 3D transform
    const t0 = snake.chars[0].element.style.transform;
    const t7 = snake.chars[7].element.style.transform;

    assert(t0 && t0.includes('translate3d'), 'Link 0 should have translate3d');
    assert(t7 && t7.includes('translate3d'), 'Link 7 should have translate3d');
    // Due to staggerDelay, link 0 and link 7 should have different positions
    assert.notStrictEqual(t0, t7, 'Links along the snake body should undulate with phase stagger');

    snake.destroy();
    console.log('  PASS: Serpentine wave kinematics verified');
  }

  // Test 3: Cursor Proximity Tracking
  {
    console.log('Test 3: Cursor proximity tracking...');
    const headline = new MockElement('h1');
    headline.textContent = 'SURGE 090';
    const snake = new PixelSnakeHeading(headline, { interactionRadius: 300 });

    // Simulate pointer move far away (e.g. at 2000, 2000)
    snake._handlePointerMove({ clientX: 2000, clientY: 2000 });
    assert.strictEqual(snake.targetIntensity, 0.0, 'Far away cursor should result in 0 targetIntensity');

    // Simulate pointer move directly at headline center (rect is 100..500 x, 100..180 y -> center is 300, 140)
    snake._handlePointerMove({ clientX: 300, clientY: 140 });
    assert(snake.targetIntensity > 0.9, `Target intensity should be high near center: got ${snake.targetIntensity}`);

    // Simulate pointer leaving
    snake._handlePointerLeave();
    assert.strictEqual(snake.targetIntensity, 0.0, 'Leaving should reset targetIntensity to 0');

    snake.destroy();
    console.log('  PASS: Cursor proximity tracking verified');
  }

  // Test 4: Pixel Glyph Blinking & Glitch Scrambling
  {
    console.log('Test 4: Pixel glyph blinking and scramble cycle...');
    const headline = new MockElement('h1');
    headline.textContent = 'SURGE 090';
    const snake = new PixelSnakeHeading(headline, { blinkDuration: 60 });

    const char0 = snake.chars[0]; // 'S'
    assert.strictEqual(char0.blinking, false);

    // Trigger blink on 'S'
    snake.triggerBlink(0);
    assert.strictEqual(char0.blinking, true, 'Char should enter blinking state');
    assert.strictEqual(char0.element.classList.contains('blinking'), true, 'Element should have blinking class');
    assert.strictEqual(char0.element.classList.contains('pixel-mode'), true, 'Element should have pixel-mode class');

    // Wait for blink duration to expire
    await new Promise((resolve) => setTimeout(resolve, 120));

    assert.strictEqual(char0.blinking, false, 'Char should exit blinking state after duration');
    assert.strictEqual(char0.currentChar, 'S', 'Char should settle back to original letter S');
    assert.strictEqual(char0.element.classList.contains('blinking'), false, 'Blinking class should be removed');

    snake.destroy();
    console.log('  PASS: Pixel glyph blinking cycle verified');
  }

  // Test 5: Destruction and DOM Restoration
  {
    console.log('Test 5: Destroy cleanup...');
    const headline = new MockElement('h1');
    headline.textContent = 'SURGE 090';
    const snake = new PixelSnakeHeading(headline);

    assert.strictEqual(snake.isRunning, true);
    snake.destroy();

    assert.strictEqual(snake.isRunning, false, 'Should stop animation loop');
    assert.strictEqual(headline.classList.contains('pixel-snake-active'), false, 'Should remove active class');
    assert.strictEqual(headline.textContent, 'SURGE 090', 'Should restore original textContent');
    assert.strictEqual(snake.chars.length, 0, 'Chars array should be cleared');

    console.log('  PASS: Cleanup and destruction verified');
  }

  // Test 6: Template Integration Check
  {
    console.log('Test 6: Template links check (gen3.html & index.html)...');
    const gen3Path = path.resolve(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/gen3.html');
    const indexPath = path.resolve(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/index.html');

    const gen3Html = fs.readFileSync(gen3Path, 'utf8');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    assert(gen3Html.includes('pixel-snake-heading.css'), 'gen3.html must include pixel-snake-heading.css');
    assert(gen3Html.includes('pixel-snake-heading.js'), 'gen3.html must include pixel-snake-heading.js');
    assert(indexHtml.includes('pixel-snake-heading.css'), 'index.html must include pixel-snake-heading.css');
    assert(indexHtml.includes('pixel-snake-heading.js'), 'index.html must include pixel-snake-heading.js');

    console.log('  PASS: Template integration verified for both Gen 3 and Gen 2.1');
  }

  console.log('\nAll PixelSnakeHeading tests passed! (6/6)');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

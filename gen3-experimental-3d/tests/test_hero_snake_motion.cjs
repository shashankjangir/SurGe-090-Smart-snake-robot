/**
 * Unit tests for SurGe 090 Hero Snake Motion
 * Verifies 11 segments, 10 joints, ±70° hardware joint limit clamp,
 * and strict boundary containment within .hero-section.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock 2D Canvas & Context
class MockCanvasContext {
  constructor() {
    this.ops = [];
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
  }
  save() { this.ops.push('save'); }
  restore() { this.ops.push('restore'); }
  setTransform() { this.ops.push('setTransform'); }
  clearRect() { this.ops.push('clearRect'); }
  beginPath() { this.ops.push('beginPath'); }
  closePath() { this.ops.push('closePath'); }
  moveTo() { this.ops.push('moveTo'); }
  lineTo() { this.ops.push('lineTo'); }
  arc() { this.ops.push('arc'); }
  ellipse() { this.ops.push('ellipse'); }
  rect() { this.ops.push('rect'); }
  roundRect() { this.ops.push('roundRect'); }
  stroke() { this.ops.push('stroke'); }
  fill() { this.ops.push('fill'); }
  translate() { this.ops.push('translate'); }
  rotate() { this.ops.push('rotate'); }
  createLinearGradient() {
    return { addColorStop: () => {} };
  }
  createRadialGradient() {
    return { addColorStop: () => {} };
  }
}

class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.style = {};
    this.listeners = {};
    this.width = 800;
    this.height = 220;
    this.clientWidth = 800;
    this.clientHeight = 220;
    this._ctx = new MockCanvasContext();
  }
  getContext(type) {
    return type === '2d' ? this._ctx : null;
  }
  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: this.width,
      height: this.height,
      right: this.width,
      bottom: this.height
    };
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
  querySelector() {
    return null;
  }
}

// Global browser environment setup
const mockCanvas = new MockElement('hero-snake-canvas', 'canvas');
const mockContainer = new MockElement('hero-section-container', 'section');

global.document = {
  readyState: 'complete',
  hidden: false,
  getElementById: (id) => (id === 'hero-snake-canvas' ? mockCanvas : null),
  querySelector: (sel) => (sel === '.hero-section' ? mockContainer : null),
  addEventListener: () => {},
  removeEventListener: () => {},
};

global.window = {
  devicePixelRatio: 2,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
};

global.self = global.window;
global.performance = { now: () => Date.now() };

// Load hero-snake-motion.js
const code = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/hero-snake-motion.js'), 'utf8');
const factory = new Function('module', 'exports', `${code}; return module.exports || root.heroSnakeMotion;`);
const mockModule = { exports: {} };
const heroSnakeLib = factory(mockModule, mockModule.exports) || mockModule.exports;

assert(heroSnakeLib, 'heroSnakeMotion module should export properly');
assert.strictEqual(heroSnakeLib.NUM_SEGMENTS, 11, 'Must have exactly 11 segments (1 head, 9 body, 1 tail)');
assert.strictEqual(heroSnakeLib.NUM_JOINTS, 10, 'Must have exactly 10 revolute joints');
const expectedLimitRad = 70 * (Math.PI / 180);
assert(Math.abs(heroSnakeLib.MAX_JOINT_LIMIT - expectedLimitRad) < 1e-4, 'Hardware joint limit must be ±70°');

// Instantiate simulator
const sim = new heroSnakeLib.HeroSnakeMotion('hero-snake-canvas', '.hero-section');
const initialState = sim.getState();

// Check 1: Initial topology
assert.strictEqual(initialState.numSegments, 11, 'Initial state must report 11 segments');
assert.strictEqual(initialState.numJoints, 10, 'Initial state must report 10 joints');
assert.strictEqual(initialState.isRunning, true, 'Should auto-start simulation');
assert(initialState.allSegmentsInsideBounds, 'All initial segments must be inside .hero-section bounds');

// Check 2: Kinematic step simulation across 1000 physics frames
let maxObservedJointAngle = 0;
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;

for (let frame = 0; frame < 1000; frame++) {
  // Advance by 33ms (~30 FPS simulation frame)
  sim.update(0.033);
  const state = sim.getState();

  // Check boundary containment: all segments must remain inside hero section
  assert(state.allSegmentsInsideBounds, `Frame ${frame}: Snake left hero-section bounds! Head at (${state.headPosition.x}, ${state.headPosition.y})`);

  for (const angle of state.jointAngles) {
    const absAngle = Math.abs(angle);
    if (absAngle > maxObservedJointAngle) maxObservedJointAngle = absAngle;
    assert(absAngle <= heroSnakeLib.MAX_JOINT_LIMIT + 1e-3,
      `Frame ${frame}: Joint limit exceeded! Angle ${angle} rad > ${heroSnakeLib.MAX_JOINT_LIMIT} rad`);
  }

  // Track bounding envelope of snake
  for (const s of sim.segments) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
  }
}

// Check 3: Snake explored the space within the hero bounds
assert(maxX - minX > 100, `Snake must actively explore along X (span: ${maxX - minX}px)`);
assert(maxY - minY > 30, `Snake must actively explore along Y (span: ${maxY - minY}px)`);
assert(minX >= sim.padding - 15, `Snake never breaches left boundary (minX: ${minX})`);
assert(maxX <= sim.width - sim.padding + 15, `Snake never breaches right boundary (maxX: ${maxX})`);
assert(minY >= sim.padding - 15, `Snake never breaches top boundary (minY: ${minY})`);
assert(maxY <= sim.height - sim.padding + 15, `Snake never breaches bottom boundary (maxY: ${maxY})`);

// Check 4: Render pass test
sim.render();
assert(mockCanvas._ctx.ops.length > 50, 'Render pass should draw segments, joints, and shadows to 2D canvas');

// Check 5: Speed adjustment API & Cursor Following State
sim.setSpeed(120);
assert.strictEqual(sim.speed, 120, 'setSpeed should update motion velocity');

// Check 5b: Cursor Tracking and Random Motion Transition
sim.mouseTarget = { x: 500, y: 150 };
for (let f = 0; f < 30; f++) sim.update(0.033);
const trackingState = sim.getState();
assert(trackingState.allSegmentsInsideBounds, 'Snake stays inside bounds while following cursor');
// Clear cursor target (cursor left dashboard)
sim.mouseTarget = null;
for (let f = 0; f < 30; f++) sim.update(0.033);
const wanderState = sim.getState();
assert(wanderState.allSegmentsInsideBounds, 'Snake stays inside bounds after returning to random wander');

// Check 6: Teardown and lifecycle
sim.stop();
assert.strictEqual(sim.getState().isRunning, false, 'stop() should halt animation');
sim.destroy();
assert.strictEqual(sim.isRunning, false, 'destroy() should clean up resources');

console.log('HeroSnakeMotion component: 6 checks passed (11 segments, 10 joints, ±70° hardware limits clamped, strict .hero-section boundary containment, render pipeline, lifecycle control)');

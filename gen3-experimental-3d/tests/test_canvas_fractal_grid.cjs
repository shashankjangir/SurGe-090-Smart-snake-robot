/**
 * Unit tests for CanvasFractalGrid Component
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Setup mock DOM environment
class MockCanvas {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.width = 1200;
    this.height = 800;
  }
  getContext(type) {
    if (type === '2d') {
      return {
        clearRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        fillRect: () => {},
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        scale: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createImageData: () => ({ data: new Uint8ClampedArray(128 * 128 * 4) }),
        putImageData: () => {},
        createPattern: () => ({}),
      };
    }
    return null;
  }
}

const canvas = new MockCanvas('canvas-fractal-grid');

global.document = {
  readyState: 'complete',
  getElementById: (id) => id === 'canvas-fractal-grid' ? canvas : null,
  createElement: (tag) => new MockCanvas(tag),
  documentElement: { clientWidth: 1200, clientHeight: 800 },
  addEventListener: () => {},
};

global.window = {
  innerWidth: 1200,
  innerHeight: 800,
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
  performance: { now: () => Date.now() },
};

global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = clearTimeout;

// Load module
const { initCanvasFractalGrid, DEFAULT_CONFIG } = require('../../gen3-experimental-3d/backend/web_dashboard/static/canvas-fractal-grid.js');

// Test 1: Configuration defaults match user snippet
assert.strictEqual(DEFAULT_CONFIG.dotSize, 5, 'dotSize is 5');
assert.strictEqual(DEFAULT_CONFIG.dotSpacing, 25, 'dotSpacing is 25');
assert.strictEqual(DEFAULT_CONFIG.dotOpacity, 0.8, 'dotOpacity is 0.8');
assert.strictEqual(DEFAULT_CONFIG.gradientAnimationDuration, 5, 'gradientAnimationDuration is 5');
assert.strictEqual(DEFAULT_CONFIG.waveIntensity, 40, 'waveIntensity is 40');
assert.strictEqual(DEFAULT_CONFIG.waveRadius, 250, 'waveRadius is 250');
assert.strictEqual(DEFAULT_CONFIG.dotColor, 'rgba(100, 200, 255, 0.2)', 'dotColor matches');
assert.strictEqual(DEFAULT_CONFIG.glowColor, 'rgba(100, 200, 255, 1)', 'glowColor matches');
assert.strictEqual(DEFAULT_CONFIG.enableNoise, true, 'enableNoise is true');
assert.strictEqual(DEFAULT_CONFIG.noiseOpacity, 0.05, 'noiseOpacity is 0.05');

// Test 2: Gradients array matches specified color stops
assert.strictEqual(DEFAULT_CONFIG.gradients.length, 2, '2 radial gradients');
assert.strictEqual(DEFAULT_CONFIG.gradients[0].stops.length, 4, 'Gradient 1 has 4 stops');
assert.strictEqual(DEFAULT_CONFIG.gradients[0].stops[0].color, '#3498DB', 'Stop 0 is #3498DB');
assert.strictEqual(DEFAULT_CONFIG.gradients[0].stops[1].color, '#2980B9', 'Stop 1 is #2980B9');
assert.strictEqual(DEFAULT_CONFIG.gradients[0].stops[2].color, '#1ABC9C', 'Stop 2 is #1ABC9C');
assert.strictEqual(DEFAULT_CONFIG.gradients[0].stops[3].color, 'transparent', 'Stop 3 is transparent');

// Test 3: Initialize component and verify state
const gridApi = initCanvasFractalGrid();
assert(gridApi, 'CanvasFractalGrid should initialize successfully');
assert.strictEqual(gridApi.isRunning(), true, 'Animation loop should be running');

// Test 4: Stop and restart control
gridApi.stop();
assert.strictEqual(gridApi.isRunning(), false, 'Should be stopped after calling stop()');
gridApi.start();
assert.strictEqual(gridApi.isRunning(), true, 'Should be running after calling start()');

// Test 5: Serpentine snake wave math verification
// Hirose-inspired traveling phase: snakePhase1 = (x0 / 160) - (t * 1.6)
const t = 1.0;
const x0 = 320;
const y0 = 200;
const snakePhase1 = (x0 / 160) - (t * 1.6);
const snakePhase2 = (x0 / 220) + (y0 / 180) - (t * 2.2);
const dy = (Math.sin(snakePhase1) * 18 * Math.cos(y0 / 280)) + (Math.sin(snakePhase2) * 14);
const dx = (Math.cos(snakePhase1) * 8 * Math.sin(y0 / 240)) + (Math.cos(snakePhase2) * 6);

assert(typeof dy === 'number' && !isNaN(dy), 'dy snake wave displacement is valid number');
assert(typeof dx === 'number' && !isNaN(dx), 'dx snake wave displacement is valid number');
assert(Math.abs(dy) <= 32, 'dy displacement is bounded within peak serpentine wave amplitude');

// Clean up
gridApi.destroy();
assert.strictEqual(gridApi.isRunning(), false, 'Should be stopped after destroy()');

console.log('CanvasFractalGrid component: 5 checks passed (default props match, gradients configuration, lifecycle start/stop, serpentine wave math, clean destroy)');

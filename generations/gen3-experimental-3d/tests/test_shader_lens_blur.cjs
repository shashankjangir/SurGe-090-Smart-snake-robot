const {requireAsset} = require('./asset-source.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');

const hero = {classList: {contains: () => false}, addEventListener() {}, clientWidth: 800, clientHeight: 300};
const canvas = {closest: () => hero, clientWidth: 800, clientHeight: 300, width: 0, height: 0};
let drawCount = 0;
const gl = {
  createShader: () => ({}), shaderSource() {}, compileShader() {}, getShaderParameter: () => true,
  createProgram: () => ({}), attachShader() {}, linkProgram() {}, getProgramParameter: () => true,
  useProgram() {}, createBuffer: () => ({}), bindBuffer() {}, bufferData() {},
  getAttribLocation: () => 0, enableVertexAttribArray() {}, vertexAttribPointer() {},
  getUniformLocation: () => ({}), uniform2f() {}, uniform1f() {}, uniform1i() {}, uniform3f() {},
  viewport() {}, drawArrays() {drawCount++;}
};
canvas.getContext = () => gl;

global.document = {readyState: 'complete', getElementById: id => id === 'shader-lens-blur-canvas' ? canvas : null};
global.window = {devicePixelRatio: 1, matchMedia: () => ({matches: false}), addEventListener() {}};
const frames = new Map();
let sequence = 0;
global.requestAnimationFrame = callback => {frames.set(++sequence, callback); return sequence;};
global.cancelAnimationFrame = id => frames.delete(id);

const {hexToRgb, PALETTES, VARIATION_NAMES, initShaderLensBlur} = requireAsset(
  path.resolve(__dirname, '../backend/web_dashboard/static/components/shader-lens-blur.js'));
assert.deepEqual(hexToRgb('#ffffff'), [1, 1, 1]);
assert.deepEqual(hexToRgb('#000000'), [0, 0, 0]);
for (const name of ['slush', 'cyber', 'ember', 'mint']) assert.equal(PALETTES[name].length, 4);
assert.deepEqual(VARIATION_NAMES, ['Square', 'Solid Circle', 'Hollow Circle', 'Triangle']);
const shader = window.ShaderLensBlur;
assert.equal(shader.config.variation, 2);
assert.equal(shader.config.palette, 'slush');
assert.equal(shader.config.enableHover, true);
assert.equal(shader.config.invertMouse, true);
assert.equal(shader.config.opacity, .82);
const [id, frame] = frames.entries().next().value;
frames.delete(id);
frame();
assert.equal(drawCount, 1, 'the full-poster shader still renders');
shader.setVariation(3);
assert.equal(shader.config.variation, 3);
shader.setPalette('cyber');
assert.equal(shader.config.palette, 'cyber');
assert.equal(shader.config.color1, PALETTES.cyber[0]);
shader.setPalette('unknown');
assert.equal(shader.config.palette, 'cyber');
shader.destroy();
assert.equal(frames.size, 0, 'destroy cancels the pending frame');
hero.classList.contains = name => name === 'hero-compact';
assert.equal(initShaderLensBlur(), null, 'compact operator heroes remain still');
assert.equal(frames.size, 0);
console.log('Shader rendering, defaults, public palette/variation methods and compact-hero guard passed');

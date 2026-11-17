const {requireAsset} = require('./asset-source.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');

const documentListeners = new Map();
const windowListeners = new Map();
const motionListeners = new Map();
const frames = new Map();
let nextFrame = 0, drawnFrames = 0, visible = true;
let resizeObserver, intersectionObserver;
const motion = {matches: false,
  addEventListener: (type, callback) => motionListeners.set(type, callback),
  removeEventListener: type => motionListeners.delete(type)};
const context = {
  clearRect() {drawnFrames++;}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
  save() {}, restore() {}, setTransform() {}, scale() {},
  createLinearGradient: () => ({addColorStop() {}})
};
const canvas = {style: {}, getContext: () => context};
const container = {
  clientWidth: 600, clientHeight: 200,
  querySelector: () => canvas,
  getClientRects: () => visible ? [{}] : []
};
global.ResizeObserver = class {
  constructor(callback) {this.callback = callback; resizeObserver = this;}
  observe(element) {assert.equal(element, container);}
  disconnect() {this.disconnected = true;}
};
global.IntersectionObserver = class {
  constructor(callback) {this.callback = callback; intersectionObserver = this;}
  observe(element) {assert.equal(element, container);}
  disconnect() {this.disconnected = true;}
};
global.document = {
  hidden: false,
  addEventListener: (type, callback) => documentListeners.set(type, callback),
  removeEventListener: type => documentListeners.delete(type)
};
global.window = {
  devicePixelRatio: 1, ResizeObserver, IntersectionObserver, matchMedia: () => motion,
  addEventListener: (type, callback) => windowListeners.set(type, callback),
  removeEventListener: type => windowListeners.delete(type)
};
global.requestAnimationFrame = callback => {frames.set(++nextFrame, callback); return nextFrame;};
global.cancelAnimationFrame = id => frames.delete(id);
const {initGridBeam, PALETTES} = requireAsset(path.resolve(__dirname, '../backend/web_dashboard/static/components/grid-beam.js'));
for (const name of ['colorful', 'ocean', 'sunset', 'mono']) assert.equal(PALETTES[name].stops.length, 4);
const beam = initGridBeam(container, {colorVariant: 'ocean'});
assert.equal(beam.options.colorVariant, 'ocean');
assert.equal(beam.isRunning(), false, 'wait for visibility before scheduling frames');
assert.equal(frames.size, 0);

function intersect(isIntersecting) {
  intersectionObserver.callback([{isIntersecting}]);
}
function frame() {
  assert.equal(frames.size, 1, 'only one frame is pending');
  const [id, callback] = frames.entries().next().value;
  frames.delete(id);
  callback(performance.now());
}
intersect(true);
assert.equal(beam.isRunning(), true);
frame();
assert.equal(drawnFrames, 1);
assert.equal(frames.size, 1);

intersect(false);
assert.equal(beam.isRunning(), false);
assert.equal(frames.size, 0, 'offscreen canvas stops rendering');
intersect(true);
assert.equal(frames.size, 1, 'entering the viewport restarts once');
intersect(true);
assert.equal(frames.size, 1);

visible = false;
resizeObserver.callback();
assert.equal(beam.isRunning(), false, 'hidden workspace stops before intersection observer updates');
assert.equal(frames.size, 0);
visible = true;
resizeObserver.callback();
assert.equal(beam.isRunning(), true);

document.hidden = true;
documentListeners.get('visibilitychange')();
assert.equal(frames.size, 0, 'background tab cancels pending frames');
document.hidden = false;
documentListeners.get('visibilitychange')();
assert.equal(frames.size, 1);
motion.matches = true;
motionListeners.get('change')();
assert.equal(frames.size, 0, 'reduced motion cancels frames');
motion.matches = false;
motionListeners.get('change')();
assert.equal(frames.size, 1);

beam.setActive(false);
assert.equal(frames.size, 0);
beam.setActive(true);
assert.equal(frames.size, 1);
beam.stop();
intersect(false);
intersect(true);
assert.equal(frames.size, 0, 'an explicit stop persists across visibility updates');
beam.start();
assert.equal(frames.size, 1);
beam.setVariant('sunset');
assert.equal(beam.options.colorVariant, 'sunset');
beam.setBreathe(false);
assert.equal(beam.options.breathe, false);
beam.destroy();
assert.equal(beam.isRunning(), false);
assert.equal(frames.size, 0);
assert(resizeObserver.disconnected);
assert(intersectionObserver.disconnected);
assert.equal(documentListeners.size, 0);
assert.equal(motionListeners.size, 0);

window.ResizeObserver = null;
window.IntersectionObserver = null;
const fallback = initGridBeam(container);
assert.equal(fallback.isRunning(), true, 'visible fallback works without observers');
visible = false;
windowListeners.get('resize')();
assert.equal(frames.size, 0);
fallback.destroy();
assert.equal(windowListeners.size, 0);
console.log('GridBeam keeps its effect and palette controls; hidden panels/tabs, reduced motion and destruction release frames and observers');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = name => fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/' + name, 'utf8');
function target() {
  const handlers = {}, captures = new Set();
  return {
    handlers, style: {}, dataset: {}, textContent: '',
    addEventListener(type, callback) {handlers[type] = callback;},
    fire(type, event = {}) {handlers[type]?.({preventDefault() {}, ...event});},
    focus() {}, setPointerCapture(id) {captures.add(id);},
    hasPointerCapture(id) {return captures.has(id);},
    releasePointerCapture(id) {captures.delete(id); this.fire('lostpointercapture', {pointerId: id});},
    getBoundingClientRect: () => ({width: 700, height: 500}), width: 700, height: 500
  };
}
const sim = read('static/gen3-sim.js');
const canvas = target(), windowTarget = target(), button = target();
button.dataset.camera = 'zoom-in';
const elements = {gen3SimCanvas: canvas, 'hud-cam-angles': target(), 'sim-camera-summary': target(), 'sim-camera-mode': target()};
const camera = {yaw: 0, pitch: 0, distance: 2.2, target: {x: 0, y: 0, z: .1}};
const context = {routeDrawing: false, cameraMode: 'follow', camera, $: id => elements[id], window: windowTarget, document: {querySelectorAll: () => [button]}};
vm.createContext(context);
vm.runInContext(sim.slice(sim.indexOf('  function resetCamera()'), sim.indexOf('  // 3D Math & Projection')), context);
context.initCanvas();
canvas.fire('keydown', {key: 'ArrowLeft'});
assert.notEqual(camera.yaw, 0);
const yaw = camera.yaw;
canvas.fire('keydown', {key: 'ArrowUp', shiftKey: true});
assert.equal(camera.yaw, yaw);
assert.notEqual(camera.target.x, 0);
button.fire('click'); assert(camera.distance < 2.2);
canvas.fire('keydown', {key: 'Home'}); assert.equal(camera.distance, 1.6);
const pointer = (id, x, y) => ({pointerId: id, clientX: x, clientY: y, button: 0, pointerType: 'touch'});
canvas.fire('pointerdown', pointer(1, 0, 0));
canvas.fire('pointerdown', pointer(2, 100, 0));
canvas.fire('pointermove', pointer(2, 200, 0));
assert.equal(camera.distance, .8, 'pinch zoom survives the migration');
canvas.fire('pointerup', pointer(2, 200, 0));
assert.equal(camera.isDragging, true, 'remaining pointer can orbit');
for (const ending of ['pointercancel', 'lostpointercapture', 'blur']) {
  if (!camera.isDragging) canvas.fire('pointerdown', pointer(1, 0, 0));
  if (ending === 'blur') windowTarget.fire('blur');
  else canvas.fire(ending, pointer(1, 0, 0));
  const saved = camera.yaw;
  canvas.fire('pointermove', pointer(1, 400, 400));
  assert.equal(camera.yaw, saved);
  assert.equal(camera.isDragging, false);
}
const script = read('static/script.js');
const pathCanvas = target(), pathWindow = target();
let sent = 0, added = 0;
const pathContext = {canvas: pathCanvas, window: pathWindow, isDrawing: false, isPanning: false,
  pathDirty: false, panX: 0, panY: 0, document: {getElementById: () => null},
  renderCanvas() {}, renderPathPoints() {}, sendPath() {sent++;}, addPoint() {added++;}};
vm.createContext(pathContext);
vm.runInContext(script.slice(script.indexOf('    // Captured pointers'), script.indexOf("    canvas.addEventListener('wheel'")), pathContext);
pathCanvas.fire('pointerdown', pointer(1, 0, 0));
pathCanvas.fire('pointerup', pointer(1, 20, 20));
assert.equal(sent, 1, 'normal completion sends once despite lost capture');
for (const ending of ['pointercancel', 'lostpointercapture', 'blur']) {
  pathCanvas.fire('pointerdown', pointer(1, 0, 0));
  if (ending === 'blur') pathWindow.fire('blur');
  else pathCanvas.fire(ending, pointer(1, 0, 0));
  const previous = added;
  pathCanvas.fire('pointermove', pointer(1, 400, 400));
  assert.equal(added, previous);
  assert.equal(sent, 1, 'interrupted drawings remain unapplied drafts');
}
pathCanvas.fire('pointerdown', {...pointer(1, 0, 0), button: 2});
pathCanvas.fire('pointermove', pointer(1, 40, 20));
assert.equal(pathContext.panX, 40);
pathWindow.fire('blur'); assert.equal(pathContext.isPanning, false);
const form = target(); form.reportValidity = () => true;
const tbody = {rows: [{querySelectorAll: () => [{valueAsNumber: 1.25}, {valueAsNumber: -2}]}]};
const editorElements = {'path-edit-points': form, 'path-points-body': tbody, 'path-points-status': target()};
const posts = [];
const editor = {document: {getElementById: id => editorElements[id]}, targetPath: [], pathDirty: false,
  pathSending: 0, pathRevision: 0, renderPathPoints() {}, alert() {},
  post: async (url, body) => posts.push({url, body})};
vm.createContext(editor);
vm.runInContext(script.slice(script.indexOf('    function readPathPoints()'), script.indexOf('    const pathEditor =')), editor);
(async () => {
  editor.targetPath = editor.readPathPoints();
  await editor.sendPath();
  assert.equal(posts[0].url, '/api/set_path');
  assert.equal(JSON.stringify(posts[0].body), '{"path":[[1.25,-2]]}');
  assert.equal(editor.pathDirty, false);
  for (const invalid of [[[NaN, 0]], [[101, 0]], Array(5001).fill([0, 0])]) {
    editor.targetPath = invalid; await editor.sendPath();
  }
  assert.equal(posts.length, 1, 'invalid coordinates never reach the endpoint');
  for (const source of [script.slice(script.indexOf('    // Captured pointers')), sim.slice(sim.indexOf('  function initCanvas()'), sim.indexOf('  function updateCameraHUD()'))]) {
    assert(!/addEventListener\('(mousedown|mousemove|mouseup|touchstart|touchmove|touchend)'/.test(source));
  }
  assert(read('static/style.css').includes('#pathCanvas, #gen3SimCanvas { touch-action: none; }'));
  console.log('Canvas accessibility: camera keys/buttons/pinch, cancellation/blur/capture, path edits and validation passed');
})().catch(error => {console.error(error); process.exitCode = 1;});

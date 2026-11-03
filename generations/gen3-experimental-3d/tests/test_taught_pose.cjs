const assert = require('node:assert/strict');
const vm = require('node:vm');
const {readAsset} = require('./asset-source.cjs');
const source = readAsset('generations/gen3-experimental-3d/backend/web_dashboard/static/gen3.js');
const joints = JSON.parse(readAsset('generations/gen3-experimental-3d/joint_map.json')).joints;
const elements = Object.fromEntries(['btn-pose-capture', 'btn-pose-save', 'btn-pose-recalibrate', 'pose-capture-status',
  'pose-save-name', 'pose-preset-desc', 'port'].map(id => [id, {value: '', disabled: true}]));
elements['pose-save-name'].value = 'Hand shape';
elements.port.value = 'FAKE';
const rows = joints.map(joint => {
  const slider = {min: (joint.min - joint.zero) * 360 / 4096, max: (joint.max - joint.zero) * 360 / 4096};
  const output = {};
  return {dataset: {id: String(joint.id)}, slider,
    querySelector: selector => selector === '.pose-slider' ? slider : output};
});
elements['joint-control-body'] = {children: rows};
elements['pose-preset'] = {value: '', options: [], add(option) {this.options.push(option);}};
const snapshot = {joints, pose: Object.fromEntries(joints.map(j => [j.id, j.sign * (j.min - j.zero) * 360 / 4096]))};
let saved = [], failCapture = false, error, lastSave;
const requests = [];
const context = {$: id => elements[id], currentConfig: {joints}, POSE_PRESETS: {},
  showError: err => {error = err;}, action: fn => fn(),
  Option: function(text, value) {this.text = text; this.value = value; this.remove = () => {};},
  api: async (path, body) => {
    requests.push(path);
    if (path === 'pose/capture') {
      if (failCapture) throw new Error('missing feedback');
      return snapshot;
    }
    if (body) {
      lastSave = body;
      saved = [{name: body.name, pose: body.pose, joints: body.joints}];
    }
    return {presets: saved};
  }};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('let savedPosePresets ='),
  source.indexOf("\n{\n  const select = $('pose-preset');")), context);
(async () => {
  await elements['btn-pose-capture'].onclick();
  assert.equal(elements['btn-pose-save'].disabled, false);
  await elements['btn-pose-save'].onclick();
  assert.deepEqual(saved[0].pose, snapshot.pose);
  assert.equal(saved[0].name, 'Hand shape');
  assert.equal(elements['btn-pose-save'].disabled, true);
  const previous = saved[0];
  snapshot.pose = Object.fromEntries(joints.map(j => [j.id, 0]));
  elements['pose-preset'].value = 'saved:0';
  await elements['btn-pose-recalibrate'].onclick();
  assert.equal(elements['btn-pose-save'].textContent, 'Update selected pose');
  assert.equal(elements['pose-save-name'].readOnly, true);
  assert.strictEqual(saved[0], previous, 'Re-capture alone must not overwrite the preset');
  await elements['btn-pose-save'].onclick();
  assert.deepEqual(lastSave.expected, previous);
  assert.equal(saved[0].name, 'Hand shape');
  assert.deepEqual(saved[0].pose, snapshot.pose);
  assert.match(elements['pose-capture-status'].textContent, /Updated/);
  vm.runInContext("loadPosePreset('saved:0')", context);
  for (const row of rows) assert.equal(row.slider.value, snapshot.pose[row.dataset.id]);
  context.currentConfig = {joints: joints.map(j => ({...j, sign: -j.sign}))};
  vm.runInContext("loadPosePreset('saved:0')", context);
  assert.match(error.message, /calibration/);
  failCapture = true;
  await assert.rejects(elements['btn-pose-capture'].onclick(), /missing feedback/);
  assert.equal(elements['btn-pose-save'].disabled, true);
  await assert.rejects(elements['btn-pose-save'].onclick(), /Capture the robot pose first/);
  assert(!requests.includes('start'), 'Capture, save and load must never start motion');
  console.log('Taught poses capture, save and re-calibrate without motion; updates retain names and expected snapshots');
})().catch(err => {console.error(err); process.exitCode = 1;});

const {readAsset} = require('./asset-source.cjs');
// Shape presets must load into the sliders and stay inside every joint's calibrated limits.
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = readAsset(path.join(root, 'backend/web_dashboard/static/gen3.js'), 'utf8');
const config = JSON.parse(readAsset(path.join(root, 'joint_map.json'), 'utf8'));
const context = {};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const POSE_PRESETS'), source.indexOf('function loadPosePreset(')) + ';this.P=POSE_PRESETS;', context);
const presets = context.P;
const COUNTS_PER_DEGREE = 4096 / 360;
const joints = Object.fromEntries(config.joints.map(j => [j.id, j]));

assert(Object.keys(presets).length >= 5);
for (const [key, preset] of Object.entries(presets)) {
  assert(preset.name && preset.desc, `${key} needs a name and description`);
  for (const [id, deg] of Object.entries(preset.pose)) {
    const joint = joints[id];
    assert(joint, `${key}: unknown joint ${id}`);
    assert(Number.isInteger(deg), `${key}: joint ${id} must be whole degrees for the slider`);
    const target = Math.round(joint.zero + joint.sign * deg * COUNTS_PER_DEGREE);
    assert(target >= joint.min && target <= joint.max, `${key}: joint ${id} ${deg}° outside calibrated limits`);
  }
}
// Pitch-only shapes stay pitch-only; the ring uses only yaw joints.
assert(Object.keys(presets.ring.pose).every(id => joints[id].axis === 'yaw'));
assert(Object.keys(presets.head_raised.pose).every(id => joints[id].axis === 'pitch'));
console.log('Pose presets stay within calibrated limits');

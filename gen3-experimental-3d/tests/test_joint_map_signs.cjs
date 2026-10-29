/**
 * Test: Sign mapping verification between gen3-sim.js JOINT_SPECS and gen3-experimental-3d/joint_map.json
 * Confirms hardware settings: Pitch ID 1 = 1; Pitch IDs 3, 5, 7, 9 = -1; all Yaw IDs = 1.
 * Fails if any sign differs between the simulation frontend and the hardware calibration map.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

console.log('Testing joint sign parity: gen3-sim.js vs joint_map.json...');

const jointMapPath = path.join(__dirname, '../joint_map.json');
const gen3SimPath = path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/gen3-sim.js');

assert(fs.existsSync(jointMapPath), 'joint_map.json must exist');
assert(fs.existsSync(gen3SimPath), 'gen3-sim.js must exist');

const jointMap = JSON.parse(fs.readFileSync(jointMapPath, 'utf8'));
const simSource = fs.readFileSync(gen3SimPath, 'utf8');

// Extract JOINT_SPECS array from gen3-sim.js
const start = simSource.indexOf('const JOINT_SPECS = [');
assert(start !== -1, 'gen3-sim.js must define JOINT_SPECS');
const end = simSource.indexOf('];', start);
assert(end !== -1, 'End of JOINT_SPECS not found');
const specsCode = simSource.slice(start, end + 2);

const context = {};
vm.runInNewContext(specsCode + '\nthis.JOINT_SPECS = JOINT_SPECS;', context);
const jointSpecs = context.JOINT_SPECS;

assert(Array.isArray(jointSpecs), 'JOINT_SPECS must be an array');
assert(Array.isArray(jointMap.joints), 'joint_map.json must contain joints array');
assert.strictEqual(jointSpecs.length, 10, 'gen3-sim.js must specify 10 joints');
assert.strictEqual(jointMap.joints.length, 10, 'joint_map.json must specify 10 joints');

for (const spec of jointSpecs) {
  const mapJoint = jointMap.joints.find(j => j.id === spec.id);
  assert(mapJoint, `Joint ID ${spec.id} in gen3-sim.js must exist in joint_map.json`);

  assert.strictEqual(
    spec.sign,
    mapJoint.sign,
    `Sign mismatch for Joint ID ${spec.id} (${spec.axis}): gen3-sim.js has ${spec.sign}, joint_map.json has ${mapJoint.sign}`
  );

  assert.strictEqual(
    spec.axis,
    mapJoint.axis,
    `Axis mismatch for Joint ID ${spec.id}: gen3-sim.js has ${spec.axis}, joint_map.json has ${mapJoint.axis}`
  );
}

// Confirmed rule checks:
// Pitch 1 = 1, Pitch 3, 5, 7, 9 = -1, all Yaw = 1
for (const joint of jointSpecs) {
  if (joint.axis === 'pitch') {
    const expected = joint.id === 1 ? 1 : -1;
    assert.strictEqual(
      joint.sign,
      expected,
      `Pitch joint ID ${joint.id} sign must be ${expected}`
    );
  } else if (joint.axis === 'yaw') {
    assert.strictEqual(
      joint.sign,
      1,
      `Yaw joint ID ${joint.id} sign must be 1`
    );
  }
}

console.log('  PASS: All 10 joint sign values in gen3-sim.js match joint_map.json exactly.');

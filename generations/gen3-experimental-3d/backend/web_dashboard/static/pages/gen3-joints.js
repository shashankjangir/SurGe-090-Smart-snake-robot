'use strict';

// Per-Joint Control: pose sliders and per-joint gait settings.
const COUNTS_PER_DEGREE = 4096 / 360;

function jointDegreeRange(joint) {
  const ends = [joint.min - joint.zero, joint.max - joint.zero].map(c => joint.sign * c / COUNTS_PER_DEGREE);
  return [Math.min(...ends), Math.max(...ends)];
}

function renderJointControls(config) {
  const tbody = $('joint-control-body');
  if (!tbody || !config?.joints) return;
  const fresh = tbody.children.length !== config.joints.length;
  if (fresh) tbody.replaceChildren();
  config.joints.forEach((joint, idx) => {
    const [low, high] = jointDegreeRange(joint);
    let tr = tbody.children[idx];
    if (fresh) {
      tr = document.createElement('tr');
      tr.dataset.id = joint.id;
      tr.innerHTML = `
        <td><strong>${joint.id}</strong></td>
        <td>${joint.axis}</td>
        <td class="pose-cell">
          <input type="range" class="pose-slider" step="any" value="0" aria-label="Joint ${joint.id} pose angle">
          <output class="pose-value">0°</output>
        </td>
        <td><input type="checkbox" class="ov-enabled" checked aria-label="Joint ${joint.id} follows gait"></td>
        <td><input type="number" class="ov-gain" min="0" max="2" step="0.1" value="1" aria-label="Joint ${joint.id} gait gain"></td>
        <td><input type="number" class="ov-phase" min="-180" max="180" step="5" value="0" aria-label="Joint ${joint.id} phase shift in degrees"></td>
        <td><input type="number" class="ov-bias" min="-110" max="110" step="1" value="0" aria-label="Joint ${joint.id} gait bias in degrees"></td>`;
      const slider = tr.querySelector('.pose-slider');
      slider.addEventListener('input', () => { tr.querySelector('.pose-value').textContent = `${slider.value}°`; });
      tr.querySelectorAll('.ov-enabled, .ov-gain, .ov-phase, .ov-bias').forEach(el =>
        el.addEventListener('input', updateJointSummary));
      tbody.append(tr);
    }
    const slider = tr.querySelector('.pose-slider');
    slider.min = low;
    slider.max = high;
    slider.value = Math.max(low, Math.min(high, Number(slider.value)));
    tr.querySelector('.pose-value').textContent = `${slider.value}°`;
  });
  updateJointSummary();
}

// Shape presets, tuned in the PyBullet bench with placeholder 0.1 m links (CAD lengths pending).
// Sign convention there: +pitch at IDs 3/5 raises the head end, -pitch at ID 1 levels the head,
// +yaw curls left. Coiling starts at ID 8: a yaw joint behind a raised pitch joint tilts out of plane.
const POSE_PRESETS = {
  straight: { name: 'Straight (all zero)', pose: {},
    desc: 'Every joint at its calibrated zero.' },
  head_raised: { name: 'Head raised', pose: { 3: 30, 1: -30 },
    desc: 'Lifts the first three links; head about 12 cm up in simulation.' },
  cobra: { name: 'Cobra stand', pose: { 5: 30, 3: 30, 1: -30, 8: 65, 10: 65 },
    desc: 'Front raised and level, tail hooked left as a support base; stable for 8 s in simulation.' },
  cobra_tall: { name: 'Cobra stand (tall)', pose: { 5: 40, 3: 35, 1: -40, 8: 65, 10: 65 },
    desc: 'Higher front lift (about 13 cm in simulation); more load on IDs 3 and 5.' },
  ring: { name: 'Ring (near-closed, left)', pose: { 2: 69, 4: 69, 6: 69, 8: 69, 10: 69, 12: 69 },
    desc: 'All yaw joints at 69°. Closing fully needs 72° each, past the ±69° limit; head–tail gap about 9 cm with placeholder links.' },
  s_rest: { name: 'S-curve rest', pose: { 2: 40, 4: -40, 6: 40, 8: -40, 10: 40, 12: -40 },
    desc: 'Alternating yaw curve lying flat; a compact resting shape.' }
};

let savedPosePresets = [];
let capturedPose = null;
let recalibratingPose = null;

function loadPosePreset(key) {
  $('btn-pose-recalibrate').disabled = $('btn-pose-capture').disabled || !key.startsWith('saved:');
  const preset = key.startsWith('saved:') ? savedPosePresets[Number(key.slice(6))] : POSE_PRESETS[key];
  if (!preset) return;
  if (preset.joints && !preset.joints.every(joint => {
    const current = currentConfig?.joints.find(j => j.id === joint.id);
    return current && ['axis', 'sign', 'zero', 'min', 'max'].every(field => current[field] === joint[field]);
  })) {
    showError(new Error('This pose uses a different joint calibration. Capture it again.'));
    return;
  }
  for (const tr of $('joint-control-body').children) {
    const slider = tr.querySelector('.pose-slider');
    const target = preset.pose[tr.dataset.id] ?? 0;
    slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), target));
    tr.querySelector('.pose-value').textContent = `${Number(slider.value).toFixed(2)}°`;
  }
  $('pose-preset-desc').textContent = `${preset.desc || 'Saved hand-positioned shape.'} Loaded into the sliders; nothing moves until Move to Pose.`;
}

async function loadSavedPosePresets() {
  const data = await Gen3Records.loadPosePresets();
  savedPosePresets = data.presets;
  const select = $('pose-preset');
  for (const option of [...select.options]) if (option.value.startsWith('saved:')) option.remove();
  savedPosePresets.forEach((preset, index) => select.add(new Option(`Saved: ${preset.name}`, `saved:${index}`)));
}

function captureTaughtPose(preset = null) {
  return action(async () => {
    capturedPose = null;
    recalibratingPose = null;
    $('btn-pose-save').disabled = true;
    $('btn-pose-save').textContent = preset ? 'Update selected pose' : 'Save captured pose';
    $('pose-save-name').readOnly = Boolean(preset);
    if (preset) $('pose-save-name').value = preset.name;
    $('pose-capture-status').textContent = 'Reading all twelve joints; keep the supported snake still…';
    try {
      capturedPose = await api('pose/capture', {port: $('port').value});
      recalibratingPose = preset;
      $('btn-pose-save').disabled = false;
      $('pose-capture-status').textContent = preset
        ? `Captured replacement for “${preset.name}”. Click Update selected pose to save it. No motion was commanded.`
        : 'Captured all twelve joints. Enter a name and save. No motion was commanded.';
    } catch (err) {
      $('pose-capture-status').textContent = 'Capture failed. No pose saved; check the connection and capture again.';
      throw err;
    }
  });
}

$('btn-pose-capture').onclick = () => captureTaughtPose();
$('btn-pose-recalibrate').onclick = () => {
  const key = $('pose-preset').value;
  const preset = key.startsWith('saved:') && savedPosePresets[Number(key.slice(6))];
  if (preset) return captureTaughtPose(preset);
};

$('btn-pose-save').onclick = () => action(async () => {
  if (!capturedPose) throw new Error('Capture the robot pose first.');
  const name = recalibratingPose?.name || $('pose-save-name').value;
  await Gen3Records.savePosePreset({...capturedPose, name, ...(recalibratingPose ? {expected: recalibratingPose} : {})});
  await loadSavedPosePresets();
  $('pose-preset').value = `saved:${savedPosePresets.findIndex(preset => preset.name === name.trim())}`;
  loadPosePreset($('pose-preset').value);
  $('pose-capture-status').textContent = recalibratingPose
    ? `Updated “${name}” and loaded its new angles into the sliders. No motion was commanded.`
    : 'Pose saved. Choose it from Shape preset to load it, then use Move to Pose when ready.';
  capturedPose = null;
  recalibratingPose = null;
  $('pose-save-name').readOnly = false;
  $('btn-pose-save').textContent = 'Save captured pose';
  $('btn-pose-save').disabled = true;
});

{
  const select = $('pose-preset');
  for (const [key, preset] of Object.entries(POSE_PRESETS)) select.add(new Option(preset.name, key));
  select.addEventListener('change', () => loadPosePreset(select.value));
}

function readPose() {
  const pose = {};
  for (const tr of $('joint-control-body').children) pose[tr.dataset.id] = Number(tr.querySelector('.pose-slider').value);
  return pose;
}

// Only non-default fields are sent; an empty result means the shared waveform.
function readJointOverrides() {
  const overrides = {};
  for (const tr of $('joint-control-body')?.children || []) {
    const row = {};
    if (!tr.querySelector('.ov-enabled').checked) row.enabled = false;
    for (const [key, cls, fallback] of [['gain', '.ov-gain', 1], ['phase', '.ov-phase', 0], ['bias', '.ov-bias', 0]]) {
      const value = Number(tr.querySelector(cls).value);
      if (!Number.isFinite(value)) throw new Error(`Joint ${tr.dataset.id} ${key} must be a number`);
      if (value !== fallback) row[key] = value;
    }
    if (Object.keys(row).length) overrides[tr.dataset.id] = row;
  }
  return overrides;
}

function updateJointSummary() {
  const summary = $('joint-control-summary');
  if (!summary) return;
  let overrides;
  try { overrides = readJointOverrides(); } catch (err) { summary.textContent = err.message; return; }
  const ids = Object.keys(overrides);
  summary.textContent = ids.length
    ? `Gait: custom settings on joint${ids.length > 1 ? 's' : ''} ${ids.join(', ')}; checked against limits at Start.`
    : 'Gait: all joints follow the shared waveform.';
}

$('btn-pose-zero').onclick = () => {
  for (const tr of $('joint-control-body').children) {
    tr.querySelector('.pose-slider').value = 0;
    tr.querySelector('.pose-value').textContent = '0°';
  }
};

$('btn-overrides-reset').onclick = () => {
  for (const tr of $('joint-control-body').children) {
    tr.querySelector('.ov-enabled').checked = true;
    tr.querySelector('.ov-gain').value = 1;
    tr.querySelector('.ov-phase').value = 0;
    tr.querySelector('.ov-bias').value = 0;
  }
  updateJointSummary();
};

$('pose-form').onsubmit = e => {
  e.preventDefault();
  const execution = hardwareExecution();
  if (execution === 'hardware' && !currentIsOperator) {
    showError(new Error('Operator mode required to start hardware motion trials.'));
    return;
  }
  action(async () => {
    const pose = readPose();
    if (execution === 'hardware') {
      const moved = Object.entries(pose).filter(([, deg]) => deg !== 0).map(([id, deg]) => ({
        key: `pose-${id}`, label: `Joint ${id} pose`, unit: '°', oldVal: 0, newVal: deg,
        warning: 'The joint moves to this angle, holds, then returns to neutral. Check clearance and cable slack first.'
      }));
      if (!(await confirmParameterChanges(moved, 'Confirm Pose'))) return;
    }
        await api('start', {
      request_id: crypto.randomUUID(),
      mode: 'pose',
      execution,
      port: $('port').value,
      pose,
      duration: number('pose-duration'),
      speed: number('pose-speed')
    });
  });
};

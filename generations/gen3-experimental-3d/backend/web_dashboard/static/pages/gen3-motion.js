'use strict';

// Start Gait Form with operator confirmation on custom factors
const gaitForm = $('gait-form');
if (gaitForm) {
  gaitForm.onsubmit = e => {
  e.preventDefault();
  if (hardwareExecution() === 'hardware' && !currentIsOperator) {
    showError(new Error('Operator mode required to start hardware motion trials.'));
    return;
  }
  action(async () => {
    const draft = getDraftSettings();
    const changes = [];
    if (draft.speed !== 100) {
      changes.push({
        key: 'speed',
        label: PARAMETER_METADATA.speed.label,
        unit: PARAMETER_METADATA.speed.unit,
        oldVal: 100,
        newVal: draft.speed,
        warning: PARAMETER_METADATA.speed.warning
      });
    }
    if (draft.yaw !== 5) {
      changes.push({
        key: 'yaw',
        label: PARAMETER_METADATA.yaw.label,
        unit: PARAMETER_METADATA.yaw.unit,
        oldVal: 5,
        newVal: draft.yaw,
        warning: PARAMETER_METADATA.yaw.warning
      });
    }
    if (draft.pitch !== 5) {
      changes.push({
        key: 'pitch',
        label: PARAMETER_METADATA.pitch.label,
        unit: PARAMETER_METADATA.pitch.unit,
        oldVal: 5,
        newVal: draft.pitch,
        warning: PARAMETER_METADATA.pitch.warning
      });
    }

    const joints = readJointOverrides();
    const customJoints = Object.keys(joints);
    if (customJoints.length) {
      changes.push({
        key: 'joints',
        label: 'Per-joint gait settings',
        unit: '',
        oldVal: 'shared',
        newVal: `custom on ${customJoints.join(', ')}`,
        warning: 'Disabled joints hold at zero; gain, phase shift and bias change only the listed joints.'
      });
    }

    if (currentIsOperator && changes.length > 0) {
      const confirmed = await confirmParameterChanges(changes, 'Confirm Motion Trial Parameters');
      if (!confirmed) return;
    }

    const execution = hardwareExecution();
        await api('start', {
      request_id: crypto.randomUUID(),
      mode: 'gait',
      execution,
      port: $('port').value,
      ...draft,
      ...(customJoints.length ? {joints} : {}),
    });
  });
  };
}

// Stop Button (Emergency & Normal Torque Release)
$('floating-stop-btn').onclick = async () => {
  try {
    await api('stop', {});
    await poll();
  } catch (err) {
    $('floating-stop-state').textContent = 'Stop unconfirmed';
    showError(err);
  }
};

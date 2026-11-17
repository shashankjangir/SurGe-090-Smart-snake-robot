'use strict';

let currentConfig = null;
let mapRevision = null;

// Calibration Map
async function loadMap() {
  const data = await Gen3Records.loadCalibration();
  currentConfig = data;
  mapRevision = data.revision;
  $('map-revision-token').textContent = mapRevision || '—';
  $('cal-speed').value = data.speed;
  $('tracking-error').value = data.tracking_error;
  $('tracking-timeout').value = data.tracking_timeout;
  $('calibrated-checkbox').checked = data.calibrated;
  renderJointControls(data);
  $('calibration-state').textContent = data.calibrated
    ? 'Saved map: CALIBRATED. Hardware gait trials permitted.'
    : 'Saved map: NOT CALIBRATED. Hardware gait trials are blocked.';

  const tbody = $('joint-map-body');
  tbody.replaceChildren();
  data.joints.forEach((joint, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <th scope="row"><strong>${joint.id}</strong></th>
      <td>
        <select data-field="axis" aria-label="Joint ${joint.id} axis">
          <option value="yaw" ${joint.axis === 'yaw' ? 'selected' : ''}>yaw</option>
          <option value="pitch" ${joint.axis === 'pitch' ? 'selected' : ''}>pitch</option>
        </select>
      </td>
      <td>
        <select data-field="sign" aria-label="Joint ${joint.id} sign">
          <option value="1" ${joint.sign === 1 ? 'selected' : ''}>+1</option>
          <option value="-1" ${joint.sign === -1 ? 'selected' : ''}>-1</option>
        </select>
      </td>
      <td><input type="number" data-field="zero" aria-label="Joint ${joint.id} zero offset" value="${joint.zero}" min="796" max="3300" required></td>
      <td><input type="number" data-field="min" aria-label="Joint ${joint.id} minimum encoder count" value="${joint.min}" min="796" max="3300" required></td>
      <td><input type="number" data-field="max" aria-label="Joint ${joint.id} maximum encoder count" value="${joint.max}" min="796" max="3300" required></td>
    `;
    tbody.append(tr);
  });
}

$('map-form')?.addEventListener('input', e => {
  if (e.target.id !== 'calibrated-checkbox') {
    const cb = $('calibrated-checkbox');
    if (cb) cb.checked = false;
  }
});

$('map-form').onsubmit = e => {
  e.preventDefault();
  if (!currentIsOperator) {
    showError(new Error('Operator mode required to save calibration map.'));
    return;
  }
  action(async () => {
    const joints = [...$('joint-map-body').rows].map(row => {
      const obj = { id: Number(row.cells[1].textContent.trim()) };
      row.querySelectorAll('[data-field]').forEach(inp => {
        const field = inp.dataset.field;
        obj[field] = field === 'axis' ? inp.value : Number(inp.value);
      });
      return obj;
    });
    const updated = {
      joints,
      speed: number('cal-speed'),
      tracking_error: number('tracking-error'),
      tracking_timeout: number('tracking-timeout'),
      calibrated: $('calibrated-checkbox').checked
    };

    const changes = [];
    if (currentConfig) {
      if (currentConfig.speed !== updated.speed) {
        changes.push({
          key: 'cal-speed',
          label: PARAMETER_METADATA['cal-speed'].label,
          unit: PARAMETER_METADATA['cal-speed'].unit,
          oldVal: currentConfig.speed,
          newVal: updated.speed,
          warning: PARAMETER_METADATA['cal-speed'].warning
        });
      }
      if (currentConfig.tracking_error !== updated.tracking_error) {
        changes.push({
          key: 'tracking-error',
          label: PARAMETER_METADATA['tracking-error'].label,
          unit: PARAMETER_METADATA['tracking-error'].unit,
          oldVal: currentConfig.tracking_error,
          newVal: updated.tracking_error,
          warning: PARAMETER_METADATA['tracking-error'].warning
        });
      }
      if (currentConfig.tracking_timeout !== updated.tracking_timeout) {
        changes.push({
          key: 'tracking-timeout',
          label: PARAMETER_METADATA['tracking-timeout'].label,
          unit: PARAMETER_METADATA['tracking-timeout'].unit,
          oldVal: currentConfig.tracking_timeout,
          newVal: updated.tracking_timeout,
          warning: PARAMETER_METADATA['tracking-timeout'].warning
        });
      }
      if (currentConfig.calibrated !== updated.calibrated) {
        changes.push({
          key: 'calibrated',
          label: PARAMETER_METADATA['calibrated'].label,
          unit: '',
          oldVal: currentConfig.calibrated ? 'true' : 'false',
          newVal: updated.calibrated ? 'true' : 'false',
          warning: PARAMETER_METADATA['calibrated'].warning
        });
      }
      // Check joint alterations
      if (Array.isArray(currentConfig.joints)) {
        updated.joints.forEach((nj, idx) => {
          const oj = currentConfig.joints[idx];
          if (oj) {
            ['zero', 'min', 'max', 'sign', 'axis'].forEach(jf => {
              if (nj[jf] !== oj[jf]) {
                changes.push({
                  key: `joint-${nj.id}-${jf}`,
                  label: `Joint ID ${nj.id} ${jf.toUpperCase()}`,
                  unit: '',
                  oldVal: oj[jf],
                  newVal: nj[jf],
                  warning: `Alters servo physical ${jf} configuration. Verify linkage mechanical clearances to prevent binding or motor stall.`
                });
              }
            });
          }
        });
      }
    }

    if (changes.length > 0) {
      const confirmed = await confirmParameterChanges(changes, 'Confirm Calibration Map Update');
      if (!confirmed) return;
    }

    await Gen3Records.saveCalibration(updated, mapRevision);
    await loadMap();
    $('status').textContent = 'Calibration map saved; backup stored in runs/';
  });
};

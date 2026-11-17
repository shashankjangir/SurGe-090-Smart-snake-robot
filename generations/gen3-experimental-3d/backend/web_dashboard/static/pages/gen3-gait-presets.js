'use strict';

let presets = [];
let selectedPresetName = null;

// Presets Management
async function loadPresets() {
  const select = $('operate-preset');
  select.disabled = true;
  select.setAttribute('aria-busy', 'true');
  try {
    const data = await Gen3Records.loadGaitPresets();
    presets = data.presets || [];
    renderPresets();
  } finally {
    select.disabled = false;
    select.setAttribute('aria-busy', 'false');
  }
}

function renderPresets() {
  const list = $('presets-list');
  list.replaceChildren();
  const select = $('operate-preset');
  select.replaceChildren(new Option(presets.length ? 'Choose a preset for the draft' : 'No presets yet · save a draft below', ''));
  if (!presets.some(p => p.name === selectedPresetName)) selectedPresetName = null;

  presets.forEach(p => {
    select.add(new Option(p.name, p.name));
    const card = document.createElement('div');
    card.className = 'preset-card compact-preset-card';
    card.innerHTML = `
      <label class="preset-choice">
        <input type="radio" name="gait-preset-choice">
        <span class="preset-choice-content">
          <strong class="preset-name">${escapeHTML(p.name)}</strong>
          <span class="preset-specs-compact">Yaw ${escapeHTML(p.yaw)}° · Pitch ${escapeHTML(p.pitch)}° · ${escapeHTML(p.frequency)} Hz · ${escapeHTML(p.speed)} cnt/s</span>
          <span class="preset-description">${escapeHTML(p.description || '')}</span>
        </span>
      </label>
      <div class="preset-actions">
        <button class="btn-sm btn-danger btn-del" type="button">Delete</button>
      </div>
    `;
    const radio = card.querySelector('input');
    radio.value = p.name;
    radio.checked = p.name === selectedPresetName;
    radio.onchange = () => {
      selectedPresetName = p.name;
      updatePresetSelection();
    };
    card.querySelector('.btn-del').setAttribute('aria-label', `Delete preset ${p.name}`);
    card.querySelector('.btn-del').disabled = !currentIsOperator;
    card.querySelector('.btn-del').onclick = () => action(async () => {
      await Gen3Records.deleteGaitPreset(p.name);
      await loadPresets();
    });
    list.append(card);
  });
  initAnimatedBackground(list, { itemSelector: '.preset-card', enableHover: true });
  wireRunsSimulationGaitControls();
  updatePresetSelection();
  sizePresetList();
}

// Show three presets at a time; the rest scroll inside the list instead of lengthening the page.
const PRESETS_VISIBLE = 3;
function sizePresetList() {
  const list = $('presets-list');
  if (!list) return;
  const cards = [...list.querySelectorAll(':scope > .preset-card')];
  const scrolls = cards.length > PRESETS_VISIBLE;
  list.classList.toggle('is-scroll-list', scrolls);
  if (!scrolls) { list.style.maxHeight = ''; return; }
  const last = cards[PRESETS_VISIBLE - 1];
  if (!last.offsetHeight) return; // Runs tab hidden; the observer below sizes it when shown.
  const top = cards[0].getBoundingClientRect().top;
  list.style.maxHeight = `${Math.ceil(last.getBoundingClientRect().bottom - top)}px`;
  updatePresetListEnds();
}
// Fade the bottom edge while more presets sit below, and the top edge once scrolled.
function updatePresetListEnds() {
  const list = $('presets-list');
  if (!list) return;
  list.classList.toggle('has-more-below', list.scrollTop + list.clientHeight < list.scrollHeight - 2);
  list.classList.toggle('has-more-above', list.scrollTop > 2);
}
document.addEventListener('DOMContentLoaded', () => {
  const list = $('presets-list');
  if (!list) return;
  list.addEventListener('scroll', updatePresetListEnds, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(() => sizePresetList()).observe(list.parentElement);
});

function wireRunsSimulationGaitControls() {
  const runsYaw = $('runs-sim-yaw');
  const runsPitch = $('runs-sim-pitch');
  const runsFreq = $('runs-sim-freq');
  const runsLag = $('runs-sim-lag');
  const simYaw = $('sim-param-yaw-amp');
  const simPitch = $('sim-param-pitch-amp');
  const simFreq = $('sim-param-freq');
  const simLag = $('sim-param-lag');

  if (runsYaw && simYaw && !runsYaw._wired) {
    runsYaw._wired = true;
    const syncFromSim = () => {
      runsYaw.value = simYaw.value;
      if (runsPitch && simPitch) runsPitch.value = simPitch.value;
      if (runsFreq && simFreq) runsFreq.value = simFreq.value;
      if (runsLag && simLag) runsLag.value = simLag.value;
    };
    simYaw.addEventListener('input', syncFromSim);
    if (simPitch) simPitch.addEventListener('input', syncFromSim);
    if (simFreq) simFreq.addEventListener('input', syncFromSim);
    if (simLag) simLag.addEventListener('input', syncFromSim);
    syncFromSim();

    $('btn-runs-apply-sim')?.addEventListener('click', () => {
      simYaw.value = runsYaw.value;
      if (simPitch && runsPitch) simPitch.value = runsPitch.value;
      if (simFreq && runsFreq) simFreq.value = runsFreq.value;
      if (simLag && runsLag) simLag.value = runsLag.value;
      $('btn-sim-apply-physics')?.click();
      const pill = $('runs-sim-applied-pill');
      if (pill) {
        pill.style.display = 'block';
        setTimeout(() => { pill.style.display = 'none'; }, 2000);
      }
    });

    $('btn-runs-reset-sim')?.addEventListener('click', () => {
      $('btn-sim-reset-physics')?.click();
      syncFromSim();
    });
  }
}

function updatePresetSelection() {
  const selected = presets.find(p => p.name === selectedPresetName);
  $('load-selected-preset').disabled = !selected;
  $('load-preset-simulation').disabled = !selected;
  $('preset-selection-status').textContent = selected
    ? `${selected.name} selected. Choose a workspace to load the draft.`
    : presets.length ? 'Select a preset to compare its settings.' : 'No saved presets. Save the current draft to create one.';
}

const loadPresetBtn = $('load-selected-preset');
if (loadPresetBtn) {
  loadPresetBtn.onclick = () => {
    const selected = presets.find(p => p.name === selectedPresetName);
    if (selected) loadPresetToDraft(selected);
  };
}

function loadPresetToDraft(p) {
  selectedPresetName = presets.some(saved => saved.name === p.name) ? p.name : null;
  document.querySelectorAll('input[name="gait-preset-choice"]').forEach(radio => {
    radio.checked = radio.value === p.name;
  });
  $('operate-preset').value = selectedPresetName || '';
  updatePresetSelection();
  if (p.yaw !== undefined) $('yaw').value = p.yaw;
  if (p.pitch !== undefined) $('pitch').value = p.pitch;
  if (p.bias !== undefined) $('bias').value = p.bias;
  if (p.frequency !== undefined) {
    $('frequency').value = Math.abs(p.frequency);
    $('direction').value = p.frequency < 0 ? '-1' : '1';
  }
  if (p.lag !== undefined) $('lag').value = p.lag;
  if (p.offset !== undefined) $('offset').value = p.offset;
  if (p.speed !== undefined) $('speed').value = p.speed;
  if (p.ramp !== undefined) $('ramp').value = p.ramp;
  if (p.duration !== undefined) $('duration').value = p.duration;

  if (p.yaw > 0 && p.pitch === 0) $('btn-mode-yaw').click();
  else if (p.pitch > 0 && p.yaw === 0) $('btn-mode-pitch').click();
  else $('btn-mode-combined').click();

  updateSpeedDemand();
  document.getElementById('tab-operate').click();
  $('yaw').focus({ preventScroll: true });
}

$('operate-preset').onchange = () => {
  const p = presets.find(x => x.name === $('operate-preset').value);
  if (p) loadPresetToDraft(p);
};

const savePresetForm = $('save-preset-form');
if (savePresetForm) {
  savePresetForm.onsubmit = e => {
    e.preventDefault();
    $('preset-save-status').textContent = '';
    if (!statusOnline) { $('preset-save-status').textContent = 'Dashboard offline; reconnect before saving.'; return; }
    action(async () => {
      const draft = getDraftSettings();
      const pattern = $('save-preset-pattern').value;
      const selected = window.SurgeSimulationPresets?.[pattern];
      if (pattern !== 'custom') {
        if (!selected) throw new Error('Gait patterns are unavailable; reload this page');
        Object.assign(draft, {yaw: selected.yaw, pitch: selected.pitch, bias: selected.bias,
          frequency: selected.freq, lag: selected.lag, offset: selected.offset});
      }
      const newPreset = {
        name: $('preset-name').value.trim(),
        description: $('preset-desc').value.trim(),
        ...draft
      };
      const previous = presets.find(p => p.name === newPreset.name) || null;
      if (previous && !window.confirm(`Replace the saved preset “${newPreset.name}”?`)) return;
      try {
        await Gen3Records.saveGaitPreset(newPreset, previous);
      } catch (error) {
        $('preset-save-status').textContent = error.message;
        throw error;
      }
      $('preset-name').value = '';
      $('preset-desc').value = '';
      $('preset-save-status').textContent = `Saved ${newPreset.name}.`;
      await loadPresets();
    });
  };
}

function copySimulationDraft() {
  loadPresetToDraft(window.SurgeSimulation.draft());
}
$('copy-to-hardware').onclick = copySimulationDraft;
$('copy-from-simulation').onclick = copySimulationDraft;
$('load-preset-simulation').onclick = () => {
  const selected = presets.find(p => p.name === selectedPresetName);
  if (!selected) return;
  window.SurgeSimulation.loadDraft(selected);
  $('tab-simulation').click();
};

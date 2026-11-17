'use strict';

// Runs Journal: every run stays in the table; its box shows three rows and scrolls the rest.
const RUNS_VISIBLE = 3;
const annotationDrafts = new Map();
let runsLoadVersion = 0;
function updateRunVisibility() {
  const rows = Array.from($('runs-table-body').children);
  rows.forEach(row => { row.hidden = false; });
  const n = rows.length;
  $('runs-visible-count').textContent = !n ? 'No runs in this workspace.'
    : n > RUNS_VISIBLE ? `${n} runs · scroll the table for older runs` : `${n} ${n === 1 ? 'run' : 'runs'}`;
  if (typeof sizeRunsTable === 'function') sizeRunsTable();
}
function sizeRunsTable() {
  const body = $('runs-table-body');
  const box = body?.closest?.('.table-scroll');
  if (!box) return;
  const rows = Array.from(body.children);
  const scrolls = rows.length > RUNS_VISIBLE;
  box.classList.toggle('is-scroll-list', scrolls);
  if (!scrolls) { box.style.maxHeight = ''; updateRunsTableEnds(); return; }
  const last = rows[RUNS_VISIBLE - 1];
  if (!last.offsetHeight) return; // Runs tab hidden; the observer below sizes it when shown.
  const scrolled = box.scrollTop;
  box.scrollTop = 0;
  box.style.maxHeight = `${Math.ceil(last.getBoundingClientRect().bottom - box.getBoundingClientRect().top)}px`;
  box.scrollTop = scrolled;
  updateRunsTableEnds();
}
// Fade the bottom edge while older runs sit below the visible three.
function updateRunsTableEnds() {
  const box = $('runs-table-body')?.closest?.('.table-scroll');
  if (box) box.classList.toggle('has-more-below', box.scrollTop + box.clientHeight < box.scrollHeight - 2);
}
document.addEventListener('DOMContentLoaded', () => {
  const box = $('runs-table-body')?.closest?.('.table-scroll');
  if (!box) return;
  box.addEventListener('scroll', updateRunsTableEnds, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(() => sizeRunsTable()).observe(box.parentElement);
});
async function loadRuns() {
  const version = ++runsLoadVersion;
  const data = await Gen3Records.loadRuns();
  if (version !== runsLoadVersion) return;
  const tbody = $('runs-table-body');
  const openAnnotations = new Set(Array.from(tbody.children)
    .filter(row => row.querySelector('.run-annotations').open)
    .map(row => row.dataset.runId));
  tbody.replaceChildren();

  const runsList = data.runs || [];
  const totalTrials = runsList.length;
  const totalDisp = runsList.reduce((acc, r) => acc + (Number(r.annotations?.displacement_cm) || 0), 0);
  const totalDur = runsList.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);
  const avgDur = totalTrials > 0 ? (totalDur / totalTrials) : 0;

  if (typeof updateRollingNumber === 'function') {
    if ($('runs-count-val')) updateRollingNumber($('runs-count-val'), totalTrials, { precision: 0 });
    if ($('runs-disp-val')) updateRollingNumber($('runs-disp-val'), totalDisp, { precision: 1 });
    if ($('runs-dur-val')) updateRollingNumber($('runs-dur-val'), avgDur, { precision: 1 });
  }

  (data.runs || []).filter(r => $('runs-workspace-filter').value === 'all' || r.execution === $('runs-workspace-filter').value).forEach(r => {
    const tr = document.createElement('tr');
    tr.dataset.runId = r.run_id;
    const dateStr = new Date(r.timestamp * 1000).toLocaleString();
    const ann = annotationDrafts.get(r.run_id) || r.annotations || {};
    tr.innerHTML = `
      <td><code>${r.run_id}</code></td>
      <td>${dateStr}</td>
      <td>${r.mode}</td>
      <td><span class="status-chip">${escapeHTML(r.execution === 'simulation' ? 'Simulation' : r.execution === 'hardware' ? 'Hardware' : 'Dry run')}</span></td>
      <td>${r.duration ?? '—'}s</td>
      <td>${r.speed ?? '—'}</td>
      <td>
        ${r.has_csv ? `<a href="/api/gen3/log/${r.run_id}.csv" class="btn-sm">CSV</a>` : ''}
        <a href="/api/gen3/log/${r.run_id}.json" class="btn-sm">JSON</a>
      </td>
      <td>
        <details class="run-annotations"><summary>Annotations</summary>
        <div class="annotation-box" style="display:flex; align-items:flex-end; gap:6px; flex-wrap:wrap;">
          <label class="ann-field" style="display:inline-flex; flex-direction:column; font-size:11px; font-weight:600; color:var(--color-muted, #64748b);">
            <span class="ann-label">Disp cm</span>
            <input type="number" class="ann-disp" placeholder="Disp cm" aria-label="Run ${escapeHTML(r.run_id)} displacement in cm" value="${escapeHTML(ann.displacement_cm ?? '')}" style="width:70px">
          </label>
          <label class="ann-field" style="display:inline-flex; flex-direction:column; font-size:11px; font-weight:600; color:var(--color-muted, #64748b);">
            <span class="ann-label">Surface</span>
            <input type="text" class="ann-surf" placeholder="Surface" aria-label="Run ${escapeHTML(r.run_id)} surface" value="${escapeHTML(ann.surface ?? '')}" style="width:70px">
          </label>
          <label class="ann-field" style="display:inline-flex; flex-direction:column; font-size:11px; font-weight:600; color:var(--color-muted, #64748b); flex:1; min-width:120px;">
            <span class="ann-label">Notes</span>
            <input type="text" class="ann-notes" placeholder="Notes" aria-label="Run ${escapeHTML(r.run_id)} notes" value="${escapeHTML(ann.notes ?? '')}" style="width:100px">
          </label>
          <button type="button" class="btn-sm btn-save-ann">Save</button>
        </div></details>
      </td>
      <td><details class="run-draft-actions"><summary>Load draft</summary><button type="button" class="btn-sm btn-repeat-simulation">Load into Simulation</button><button type="button" class="btn-sm btn-repeat">Load into Hardware</button></details></td>
    `;

    tr.querySelector('.run-annotations').open = openAnnotations.has(r.run_id);
    tr.oninput = () => {
      annotationDrafts.set(r.run_id, {
        displacement_cm: tr.querySelector('.ann-disp').value,
        surface: tr.querySelector('.ann-surf').value,
        notes: tr.querySelector('.ann-notes').value
      });
    };
    tr.querySelector('.btn-save-ann').disabled = !currentIsOperator;
    tr.querySelector('.btn-save-ann').onclick = () => action(async () => {
      const savedDraft = annotationDrafts.get(r.run_id);
      const disp = tr.querySelector('.ann-disp').value;
      const surf = tr.querySelector('.ann-surf').value;
      const notes = tr.querySelector('.ann-notes').value;
      await Gen3Records.annotateRun(r.run_id, {
        displacement_cm: disp ? Number(disp) : undefined,
        surface: surf,
        notes: notes
      });
      if (annotationDrafts.get(r.run_id) === savedDraft) annotationDrafts.delete(r.run_id);
      await loadRuns();
    });

    async function loadRunDraft(workspace) {
      const full = await Gen3Records.loadRun(r.run_id);
      if (!full.values) throw Error('This run has no gait draft.');
      const degrees = value => value * 180 / Math.PI;
      const draft = {yaw: degrees(full.values[0]), pitch: degrees(full.values[1]), bias: degrees(full.values[2]),
        frequency: full.values[3], lag: degrees(full.values[4]), offset: degrees(full.values[5]),
        ...(full.joint_map?.speed ? {speed: full.joint_map.speed} : {}),
        ...(full.duration ? {duration: full.duration} : {}), ...(full.ramp ? {ramp: full.ramp} : {})};
      if (workspace === 'simulation') {
        window.SurgeSimulation.loadDraft(draft); $('tab-simulation').click();
      } else loadPresetToDraft(draft);
    }
    tr.querySelector('.btn-repeat').onclick = () => loadRunDraft('hardware').catch(showError);
    tr.querySelector('.btn-repeat-simulation').onclick = () => loadRunDraft('simulation').catch(showError);

    tbody.append(tr);
  });
  updateRunVisibility();
}

$('runs-workspace-filter').onchange = () => { loadRuns().catch(showError); };

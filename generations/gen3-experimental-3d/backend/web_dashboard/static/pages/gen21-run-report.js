'use strict';

function wireRunReport() {
  document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    document.getElementById('accuracy-modal').style.display = 'none';
  });
}

function showReport(data) {
  const outcomeBadge = document.getElementById('report-outcome-badge');
  if (outcomeBadge) {
    const outcome = (data.outcome || 'completed').toUpperCase();
    outcomeBadge.textContent = `Outcome: ${outcome}`;
    outcomeBadge.style.background = outcome === 'COMPLETED' ? 'var(--color-mint-pop)' : (outcome.includes('STOP') ? 'var(--color-sunburst)' : 'var(--color-ember)');
  }
  const durStr = data.duration_s != null ? ` · ${data.duration_s}s elapsed` : '';
  document.getElementById('report-coverage').textContent = `${data.metric} · ${data.sample_count} of ${data.trace_sample_count} retained trace samples · ${(data.path_progress * 100).toFixed(1)}% verified path${durStr}`;

  const accuracyEl = document.getElementById('report-accuracy');
  if (accuracyEl) {
    accuracyEl.textContent = `${(data.accuracy_percent || 0).toFixed(1)}%`;
    accuracyEl.className = data.accuracy_percent > 80 ? 'value good' : 'value bad';
  }

  const deviationEl = document.getElementById('report-deviation');
  if (deviationEl) {
    deviationEl.textContent = `${(data.avg_error || 0).toFixed(4)} m`;
  }

  const rCanvas = document.getElementById('reportCanvas');
  if (rCanvas) {
    const rCtx = rCanvas.getContext('2d');
    rCtx.fillStyle = '#fafbfc';
    rCtx.fillRect(0, 0, rCanvas.width, rCanvas.height);

    const cx = rCanvas.width / 2;
    const cy = rCanvas.height / 2;
    const rPpm = 30.0;

    // Draw target path in Electric Blue (#4da2ff)
    if (data.target_path && data.target_path.length > 0) {
      rCtx.strokeStyle = '#4da2ff';
      rCtx.lineWidth = 4;
      rCtx.lineCap = 'round';
      rCtx.beginPath();
      for (let i = 0; i < data.target_path.length; i++) {
        const px = cx + (data.target_path[i][0] * rPpm);
        const py = cy - (data.target_path[i][1] * rPpm);
        if (i === 0) rCtx.moveTo(px, py); else rCtx.lineTo(px, py);
      }
      rCtx.stroke();
    }

    // Draw actual path in Ember (#fb4903)
    if (data.actual_path && data.actual_path.length > 0) {
      rCtx.strokeStyle = '#fb4903';
      rCtx.lineWidth = 2.5;
      rCtx.lineCap = 'round';
      rCtx.beginPath();
      for (let i = 0; i < data.actual_path.length; i++) {
        const px = cx + (data.actual_path[i][0] * rPpm);
        const py = cy - (data.actual_path[i][1] * rPpm);
        if (i === 0) rCtx.moveTo(px, py); else rCtx.lineTo(px, py);
      }
      rCtx.stroke();
    }
  }

  document.getElementById('accuracy-modal').style.display = 'block';
}

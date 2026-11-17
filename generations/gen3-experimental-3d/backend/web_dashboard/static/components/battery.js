/* Display-only: shares the existing system-stats request; never polls hardware. */
window.SurgeBattery = (() => {
  let previous = '';
  function render(sample) {
    const pill = document.getElementById('battery-indicator');
    if (!pill) return;
    const valid = Number.isFinite(sample?.percent) && Number.isFinite(sample?.voltage);
    const fresh = valid && sample.state === 'fresh';
    const percent = valid ? Math.max(0, Math.min(100, Math.round(sample.percent))) : 0;
    const level = fresh ? (percent <= 20 ? 'low' : percent <= 50 ? 'medium' : 'high') : 'unavailable';
    const text = fresh ? `${percent}%` : valid && sample.state === 'stale' ? 'Stale' : 'N/A';
    const details = valid
      ? `${sample.voltage.toFixed(2)} V average · ${sample.sample_count} servos · sampled ${Math.round(sample.age_s)}s ago.`
      : 'No valid voltage feedback.';
    const hint = fresh ? (percent <= 20 ? 'Recharge soon.' : 'Voltage-based reserve estimate; not measured remaining mAh.')
      : 'Open Gen 3 Hardware as Operator for automatic stopped diagnostics. Voltage sampling pauses during motion.';
    const description = `${text} battery reserve. 2200 mAh 3S LiPo. ${details} ${hint} 12.6 V = 100%; 11.1 V = recharge.`;
    const key = `${level}|${description}`;
    if (key === previous) return;
    previous = key;
    pill.dataset.level = level;
    pill.title = description;
    pill.setAttribute('aria-label', description);
    document.getElementById('battery-value').textContent = text;
    document.getElementById('battery-fill').style.transform = `scaleX(${fresh ? percent / 100 : 0})`;
  }
  return { render };
})();

/* Presentation only: status comes from the existing server polls. */
window.MotionState = {
  classify(status, running) {
    if (/failed|unconfirmed|error|fault/i.test(status)) return 'unknown';
    if (/^Stop requested/i.test(status)) return 'stopping';
    if (running) return 'running';
    if (/^(Stopped|Completed)\b|^Path Complete$/i.test(status)) return 'stopped';
    if (/^(Idle|Disconnected|Connected|Ready|Planar simulation)\b/i.test(status)) return 'idle';
    return 'unknown';
  },
  label(state) {
    return {idle: 'Idle', running: 'Running', stopping: 'Stopping', stopped: 'Stopped', unknown: 'Unknown · stale'}[state];
  },
  render(ids, state) {
    for (const id of ids) {
      const element = document.getElementById(id);
      if (!element) continue;
      element.classList.add('motion-state');
      element.dataset.motionState = state;
      element.classList.toggle('motion-active', state === 'running');
      element.classList.toggle('motion-stopped', state === 'stopped');
      element.dataset.motionLabel = this.label(state);
    }
  }
};

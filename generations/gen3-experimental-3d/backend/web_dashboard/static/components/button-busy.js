// Marks the button that started a request as busy until the request settles. The spinner
// appears only after 150 ms, so fast local requests do not flicker. When the request settles
// the button plays one short cue: a green ring if the server accepted it, a shake if not.
// The cue reports the request only; the live status still reports what the robot does.
(() => {
  let pressed = null;
  const pending = new WeakMap();
  const ackTimers = new WeakMap();
  function acknowledge(button, accepted) {
    clearTimeout(ackTimers.get(button));
    button.removeAttribute('data-ack');
    void button.offsetWidth; // restart the cue when the same button acknowledges twice
    button.setAttribute('data-ack', accepted ? 'ok' : 'fail');
    ackTimers.set(button, setTimeout(() => button.removeAttribute('data-ack'), 700));
  }
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    pressed = button ? { button, at: performance.now() } : null;
  }, true);
  window.SurgeBusy = {
    async track(promise) {
      const button = pressed && performance.now() - pressed.at < 400 ? pressed.button : null;
      if (!button) return promise;
      pending.set(button, (pending.get(button) || 0) + 1);
      const timer = setTimeout(() => { if (pending.get(button)) button.setAttribute('aria-busy', 'true'); }, 150);
      let accepted = false;
      try {
        const result = await promise;
        accepted = !(result instanceof Response) || result.ok;
        return result;
      } finally {
        clearTimeout(timer);
        const left = pending.get(button) - 1;
        pending.set(button, left);
        if (!left) {
          button.removeAttribute('aria-busy');
          acknowledge(button, accepted);
        }
      }
    }
  };
})();

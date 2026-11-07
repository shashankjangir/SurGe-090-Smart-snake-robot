'use strict';

// Transport acknowledgement is separate from the robot's live motion status.
(() => {
  const feedback = document.getElementById('refined-request-status');
  if (!feedback) return;
  const request = window.fetch.bind(window);
  let latest = 0;
  const commands = /\/api\/(?:gen3\/(?:start|stop|center|apply|map|presets|pose\/(?:capture|presets)|simulation\/(?:connect|disconnect)|session\/(?:login|logout))|connect|start|stop|params|set_path)$/;
  const motion = window.gsap?.matchMedia();
  let animate = false;
  motion?.add('(prefers-reduced-motion: no-preference)', () => {
    animate = true;
    return () => { animate = false; window.gsap.killTweensOf(feedback); };
  });
  window.fetch = async (input, options = {}) => {
    const path = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href).pathname;
    const method = options.method || input.method || 'GET';
    if (method.toUpperCase() !== 'POST' || !commands.test(path)) return request(input, options);
    const sequence = ++latest;
    feedback.dataset.state = 'pending';
    feedback.setAttribute('aria-busy', 'true');
    feedback.textContent = 'Sending command. Waiting for the server…';
    let accepted = false;
    try {
      const response = await request(input, options);
      accepted = response.ok;
      return response;
    } finally {
      if (sequence === latest) {
        feedback.setAttribute('aria-busy', 'false');
        feedback.dataset.state = accepted ? 'accepted' : 'error';
        feedback.textContent = accepted
          ? 'Command accepted. Check the live status for the result.'
          : 'Command failed. Check the console message before trying again.';
        if (animate) window.gsap.fromTo(feedback, { y: 3, opacity: 0.6 }, {
          y: 0, opacity: 1, duration: 0.15, ease: 'power1.out', overwrite: true,
          clearProps: 'transform,opacity',
        });
      }
    }
  };
})();

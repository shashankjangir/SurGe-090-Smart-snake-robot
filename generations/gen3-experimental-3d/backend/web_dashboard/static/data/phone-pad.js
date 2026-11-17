// Presents the /phone controller page as one more standard gamepad on the laptop dashboard.
window.SurgePhonePad = (() => {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  let pad = null, link = null;
  const waiting = [];
  async function poll() {
    try {
      const response = await fetch('/api/phone/pad', {cache: 'no-store', signal: AbortSignal.timeout(500)});
      const data = await response.json();
      pad = data.pad ? {id: 'SURGE phone controller', index: 99, connected: true, mapping: 'standard',
        axes: data.pad.axes, buttons: data.pad.buttons.map(value => ({pressed: value > .5, value}))} : null;
    } catch (_) { pad = null; }
    setTimeout(poll, pad ? 50 : 500);
  }
  if (local) {
    void poll();
    fetch('/api/phone/link').then(r => r.json()).then(data => { link = data; waiting.splice(0).forEach(fn => fn(data)); }).catch(() => {});
  }
  return {pad: () => pad, onLink: fn => { if (link) fn(link); else waiting.push(fn); }};
})();

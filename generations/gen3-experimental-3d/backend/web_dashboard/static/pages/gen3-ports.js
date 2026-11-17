'use strict';

// Serial Ports
async function loadPorts() {
  const fields = [$('port')];
  const previous = fields.map(field => field.value);
  fields.forEach(field => {
    field.disabled = true;
    field.setAttribute('aria-busy', 'true');
    field.replaceChildren(new Option('Finding ports…', ''));
  });
  try {
    const data = await api('ports', undefined, 'GET');
    const label = p => `${p.device} · ${p.description}${p.device === data.recommended ? ' · transmitter' : ''}`;
    fields.forEach((field, index) => {
      field.replaceChildren(new Option(data.ports.length ? 'Select serial port' : 'No ports found · refresh to retry', ''));
      data.ports.forEach(p => field.add(new Option(label(p), p.device)));
      if (data.ports.some(p => p.device === previous[index])) field.value = previous[index];
      // Preselect the recommended ESP32 board for the host link.
      else if (field.id === 'port' && data.recommended) field.value = data.recommended;
    });
    const hero = $('hero-port');
    if (hero) {
      hero.replaceChildren(new Option(data.ports.length ? 'Select serial port' : 'No ports found', ''));
      data.ports.forEach(p => hero.add(new Option(label(p), p.device)));
      if ($('port') && $('port').value) hero.value = $('port').value;
    }
  } catch (error) {
    fields.forEach(field => field.replaceChildren(new Option('Could not load ports · refresh to retry', '')));
    throw error;
  } finally {
    fields.forEach(field => {
      field.disabled = false;
      field.setAttribute('aria-busy', 'false');
    });
  }
}
$('refresh-ports')?.addEventListener('click', () => action(loadPorts));

const heroPort = $('hero-port');
if (heroPort) {
  heroPort.onchange = () => { if ($('port')) $('port').value = heroPort.value; };
  if ($('port')) $('port').addEventListener('change', () => { heroPort.value = $('port').value; });
}

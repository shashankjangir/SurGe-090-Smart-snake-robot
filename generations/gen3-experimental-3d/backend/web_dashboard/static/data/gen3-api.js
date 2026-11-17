'use strict';

// Session-aware API fetch.
async function api(path, body, method = 'POST') {
  if (method === 'POST' && (path === 'start' || path === 'center')) {
    body = { ...body, request_id: body?.request_id || crypto.randomUUID() };
  }
  if (path === 'start' && body?.execution === 'hardware' && !body.port) throw new Error('Select the transmitter port before starting hardware.');
  const headers = {};
  if (session && session.session_id) {
    headers['X-Session-ID'] = session.session_id;
  }
  const options = { method, headers };
  if (body !== undefined && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const request = fetch('/api/gen3/' + path, options);
  const res = await (method !== 'GET' && globalThis.SurgeBusy ? globalThis.SurgeBusy.track(request) : request);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

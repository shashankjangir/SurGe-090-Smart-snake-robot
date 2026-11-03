const {readAsset} = require('./asset-source.cjs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const elements = {};
for (const id of ['battery-indicator', 'battery-value', 'battery-fill']) {
  elements[id] = { dataset: {}, style: {}, setAttribute(key, value) { this[key] = value; } };
}
const context = { window: {}, document: { getElementById: id => elements[id] } };
vm.runInNewContext(readAsset('generations/gen3-experimental-3d/backend/web_dashboard/static/battery.js', 'utf8'), context);
const render = context.window.SurgeBattery.render;
for (const [percent, level] of [[100, 'high'], [51, 'high'], [50, 'medium'], [21, 'medium'], [20, 'low'], [0, 'low']]) {
  render({ percent, voltage: 11.1 + 1.5 * percent / 100, age_s: 2, sample_count: 10, state: 'fresh' });
  assert.equal(elements['battery-value'].textContent, `${percent}%`);
  assert.equal(elements['battery-indicator'].dataset.level, level);
  assert.equal(elements['battery-fill'].style.transform, `scaleX(${percent / 100})`);
}
assert.match(elements['battery-indicator']['aria-label'], /Recharge soon/);
render({ percent: 60, voltage: 12, age_s: 31, sample_count: 10, state: 'stale' });
assert.equal(elements['battery-value'].textContent, 'Stale');
assert.equal(elements['battery-indicator'].dataset.level, 'unavailable');
render(null);
assert.equal(elements['battery-value'].textContent, 'N/A');
assert.equal(elements['battery-fill'].style.transform, 'scaleX(0)');
assert.match(elements['battery-indicator']['aria-label'], /No valid voltage feedback/);
console.log('Battery colors, thresholds, accessible descriptions, stale and unavailable states passed');

(async () => {
  let finish, calls = 0;
  const script = readAsset('generations/gen3-experimental-3d/backend/web_dashboard/static/script.js', 'utf8');
  const polling = {
    window: { SurgeBattery: { render } },
    document: { getElementById: () => null },
    AbortSignal, console,
    fetch: () => { calls++; return new Promise(resolve => { finish = resolve; }); }
  };
  vm.createContext(polling);
  vm.runInContext(script.slice(script.indexOf('    let systemStatsPending'),
    script.indexOf('    setInterval(() => { if (!document.hidden) updateSystemStats();')), polling);
  const first = polling.updateSystemStats();
  await polling.updateSystemStats();
  assert.equal(calls, 1, 'Slow stats requests must not overlap');
  finish({ ok: true, json: async () => ({ cpu: 0, ram: 0, temp: 'N/A' }) });
  await first;
  const next = polling.updateSystemStats();
  assert.equal(calls, 2, 'Polling must resume after a completed request');
  finish({ ok: true, json: async () => ({ cpu: 0, ram: 0, temp: 'N/A' }) });
  await next;
  console.log('Slow system-stats requests do not overlap and polling resumes');
})().catch(error => { console.error(error); process.exitCode = 1; });

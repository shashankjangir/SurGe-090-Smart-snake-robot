const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const {readAsset} = require('./asset-source.cjs');
const source = readAsset(path.resolve(__dirname, '../backend/web_dashboard/static/controller-input.js'));

function setup(generation = '3') {
  const defaults = {deadzone: [.15, .05, .4], sensitivity: [1, .2, 1]};
  const elements = {};
  const events = {}, docEvents = {}, calls = [], starts = [], storage = new Map();
  const ids = ['enable', 'status', 'preset', 'assist', 'inspection', 'steering-sign', 'localization', 'path', 'invert', 'calibrate', ...Object.keys(defaults)];
  for (const id of ids) elements[`gamepad-${id}`] = {
    value: defaults[id]?.[0] ?? (id === 'assist' ? 'manual' : ''), min: defaults[id]?.[1], max: defaults[id]?.[2], checked: false,
    setAttribute(name, value) { this[name] = value; }, getAttribute(name) { return this[name]; }
  };
  elements['controller-panel'] = {addEventListener(name, fn) { docEvents[`panel-${name}`] = fn; }};
  const pad = {id: 'Xbox test', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
    buttons: Array.from({length: 17}, () => ({pressed: false, value: 0}))};
  let tick, now = Date.now(), visible = true, focus = true;
  const context = {
    Date: {now: () => now}, AbortSignal: {timeout: () => undefined}, Blob,
    window: {isSecureContext: true, addEventListener: (name, fn) => { events[name] = fn; }},
    navigator: {getGamepads: () => [null, pad], sendBeacon() {}},
    document: {hidden: false, hasFocus: () => focus, getElementById: id => elements[id], addEventListener: (name, fn) => { docEvents[name] = fn; }},
    localStorage: {getItem: key => storage.get(key), setItem: (key, val) => storage.set(key, val)},
    setInterval: fn => { tick = fn; return 1; }, clearInterval() {},
    fetch: async (url, options) => { calls.push({url, body: JSON.parse(options.body)}); return {ok: true, json: async () => ({success: true})}; }
  };
  vm.runInNewContext(source, context);
  elements['controller-panel'].querySelector = selector => elements[`gamepad-${selector.match(/"(.*?)"/)[1]}`];
  context.window.SurgeGamepad.mount(elements['controller-panel'], {generation, visible: () => visible,
    start: async (options, fresh) => { starts.push({options, input: fresh()}); return {run_id: 'run-1'}; }});
  const state = generation === '3' ? {busy: false} : {is_running: true, is_paused: true};
  context.window.SurgeGamepad.observe(state);
  events['surge-session']({detail: {is_current_operator: true}});
  async function enable() { elements['gamepad-enable'].onclick(); await tick(); }
  async function press(...indexes) { pad.buttons.forEach((b, i) => { b.pressed = indexes.includes(i); b.value = b.pressed ? 1 : 0; }); await tick(); }
  return {context, elements, calls, starts, events, docEvents, pad, tick, enable, press, storage, state,
    age: () => { now += 1600; }, hideTab: () => { visible = false; }, blur: () => { focus = false; }};
}

for (const generation of ['2.1', '3']) {
  test(`${generation}: hold required, streamed inputs sequenced, throttle separate, release stops`, async () => {
    const h = setup(generation); await h.enable();
    await h.press(0); assert.equal(h.starts.length, 0);
    await h.press(); await h.press(0, 4); assert.equal(h.starts.length, 1);
    h.pad.axes[0] = 1;
    await h.press(4, 7); await h.press(4, 7);
    assert.equal(h.calls[0].url, generation === '3' ? '/api/gen3/controller' : '/api/controller');
    assert.equal(h.calls[0].body.throttle, 1);
    assert.equal(h.calls[0].body.stick_x, 1);
    assert(h.calls[1].body.sequence > h.calls[0].body.sequence);
    await h.press();
    assert.equal(h.calls.at(-1).url, '/api/stop');
    assert.equal(h.elements['gamepad-enable']['aria-pressed'], 'false');
  });
}

test('buttons initially held cannot start; B overrides simultaneous A', async () => {
  const h = setup(); h.pad.buttons[0].pressed = true; await h.enable();
  await h.press(0, 4); assert.equal(h.starts.length, 0);
  await h.press(); await h.press(0, 1, 4);
  assert.equal(h.starts.length, 0); assert.equal(h.calls.at(-1).url, '/api/stop');
});

for (const reason of ['viewer', 'offline', 'hidden', 'tab', 'blur', 'disconnect', 'mapping']) {
  test(`active controller stops on ${reason} and needs explicit enable`, async () => {
    const h = setup(); await h.enable(); await h.press(0, 4);
    if (reason === 'viewer') h.events['surge-session']({detail: {is_current_operator: false}});
    if (reason === 'offline') h.age();
    if (reason === 'hidden') h.context.document.hidden = true;
    if (reason === 'tab') h.hideTab();
    if (reason === 'blur') h.events.blur();
    if (reason === 'disconnect') h.pad.connected = false;
    if (reason === 'mapping') h.pad.mapping = '';
    await h.tick(); await h.press(0, 4);
    assert.equal(h.starts.length, 1); assert.equal(h.calls.at(-1).url, '/api/stop');
    assert.equal(h.elements['gamepad-enable']['aria-pressed'], 'false');
  });
}

test('centring persists per controller and setup changes invalidate enable', async () => {
  const h = setup(); h.pad.axes[0] = .1;
  h.elements['gamepad-calibrate'].onclick();
  assert.equal(h.storage.size, 1);
  await h.enable(); await h.press(0, 4);
  assert.equal(h.starts[0].input.stick_x, 0);
  h.docEvents['panel-change']({target: {matches: () => true}});
  assert.equal(h.elements['gamepad-enable']['aria-pressed'], 'false');
  assert.equal(h.calls.at(-1).url, '/api/stop');
});

test('route options are passed explicitly; out-of-range setup rejected', async () => {
  const h = setup();
  h.elements['gamepad-assist'].value = 'route'; h.elements['gamepad-path'].value = '[[0,0],[1,0]]';
  await h.enable(); await h.press(0, 4);
  assert.equal(h.starts[0].options.path.length, 2);
  const bad = setup(); await bad.enable(); bad.elements['gamepad-deadzone'].value = .9;
  await bad.tick(); assert.equal(bad.elements['gamepad-enable']['aria-pressed'], 'false');
});

test('slow input requests never overlap and bumper release still sends Stop', async () => {
  const h = setup(); await h.enable(); await h.press(0, 4);
  const resolvers = [];
  h.context.fetch = (url) => { h.calls.push({url}); return new Promise(r => { resolvers.push(() => r({ok: true, json: async () => ({})})); }); };
  const pending = h.press(4); await h.press(4);
  assert.equal(h.calls.length, 1);
  const release = h.press(); assert.equal(h.calls.at(-1).url, '/api/stop');
  resolvers.forEach(resolve => resolve()); await pending; await release;
});

test('standard mapping is fixed: D-pad adjusts gains, right stick drives head', async () => {
  const h = setup(); await h.enable(); await h.press(0, 4);
  h.pad.axes[2] = 1; h.pad.axes[3] = -1;
  await h.press(4, 15); await h.press(4, 12);
  assert.equal(h.calls[0].body.yaw_up, true); assert.equal(h.calls[0].body.pitch_up, false);
  assert.equal(h.calls[1].body.pitch_up, true);
  assert.equal(h.calls[1].body.head_x, 1); assert.equal(h.calls[1].body.head_y, 1);
});

test('two roots retain independent status and enforce one enabled controller', async () => {
  const h = setup();
  const second = {};
  for (const [key, value] of Object.entries(h.elements)) if (key.startsWith('gamepad-')) second[key] = {...value};
  const root = {querySelector: selector => second[`gamepad-${selector.match(/"(.*?)"/)[1]}`], addEventListener() {}};
  h.context.window.SurgeGamepad.mount(root, {generation: '3', accepts: state => state.execution === 'hardware', visible: () => true, start: async () => ({run_id: 'second'})});
  h.context.window.SurgeGamepad.observe({busy: true, execution: 'simulation', controller: {preset: 0, yaw_gain: 1, pitch_gain: 1, rate: .1, feedback_reason: 'Tracking normally'}});
  assert.match(h.elements['gamepad-preset'].textContent, /Tracking normally/);
  assert.equal(second['gamepad-preset'].textContent, 'Controller stopped');
  h.context.window.SurgeGamepad.observe({busy: false});
  assert.equal(h.elements['gamepad-preset'].textContent, 'Controller stopped');
  h.events['surge-session']({detail: {is_current_operator: true}});
  await h.enable();
  second['gamepad-enable'].onclick();
  assert.match(second['gamepad-status'].textContent, /other workspace/);
  assert.equal(h.elements['gamepad-enable']['aria-pressed'], 'true');
  h.elements['gamepad-enable'].onclick();
  second['gamepad-enable'].onclick();
  assert.equal(second['gamepad-enable']['aria-pressed'], 'true');
  h.elements['gamepad-enable'].onclick();
  assert.match(h.elements['gamepad-status'].textContent, /other workspace/);
  assert.equal(second['gamepad-enable']['aria-pressed'], 'true');
});

const {strict: assert} = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

async function check(reducedMotion) {
  const feedback = {dataset: {}, setAttribute(key, value) { this[key] = value; }};
  const requests = [];
  const animations = [];
  const window = {
    fetch(input, options) { return new Promise((resolve, reject) => requests.push({input, options, resolve, reject})); },
    gsap: {
      matchMedia: () => ({add(query, setup) { if (!reducedMotion) setup(); }}),
      fromTo: (...args) => animations.push(args), killTweensOf() {},
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/static/refined.js'), 'utf8'), {
    window, document: {getElementById: () => feedback}, URL, location: {href: 'http://127.0.0.1:5001/gen3'},
  });
  const pending = window.fetch('/api/gen3/start', {method: 'POST'});
  assert.equal(feedback.dataset.state, 'pending');
  assert.equal(feedback['aria-busy'], 'true');
  requests.shift().resolve({ok: true});
  await pending;
  assert.equal(feedback.dataset.state, 'accepted');
  assert.match(feedback.textContent, /Check the live status/);
  assert.equal(feedback['aria-busy'], 'false');
  assert.equal(animations.length, reducedMotion ? 0 : 1);

  const failure = window.fetch('/api/gen3/apply', {method: 'POST'});
  requests.shift().resolve({ok: false});
  await failure;
  assert.equal(feedback.dataset.state, 'error');
  const offline = window.fetch('/api/gen3/start', {method: 'POST'});
  requests.shift().reject(new Error('Offline'));
  await assert.rejects(offline, /Offline/);
  assert.equal(feedback.dataset.state, 'error');

  const old = window.fetch('/api/gen3/apply', {method: 'POST'});
  const newest = window.fetch('/api/gen3/stop', {method: 'POST'});
  const oldRequest = requests.shift(), newestRequest = requests.shift();
  newestRequest.resolve({ok: false}); await newest;
  oldRequest.resolve({ok: true}); await old;
  assert.equal(feedback.dataset.state, 'error', 'Late responses must not overwrite the newer command');
  const poll = window.fetch('/api/gen3/status');
  requests.shift().resolve({ok: true}); await poll;
  assert.equal(feedback.dataset.state, 'error', 'Telemetry polling must not announce command acceptance');
}
Promise.all([check(false), check(true)]).then(() => console.log('Refined feedback: pending, accepted, rejected, offline, ordering, polling, reduced motion passed.'));

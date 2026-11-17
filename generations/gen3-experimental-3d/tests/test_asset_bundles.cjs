const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const web = path.resolve(__dirname, '../backend/web_dashboard');

const shared = fs.readFileSync(path.join(web, 'templates/components/dashboard-scripts.html'), 'utf8');
for (const name of ['index.html', 'gen3.html', 'phone.html', '3d_viewer.html']) {
  const html = fs.readFileSync(path.join(web, 'templates/pages', name), 'utf8')
    .replace("{% include 'components/dashboard-scripts.html' %}", shared);
  const assets = [...html.matchAll(/(?:src|href)="\/static\/([^"?]+\.(?:js|css))(?:\?[^\"]*)?"/g)].map(m => m[1]);
  assert.equal(new Set(assets).size, assets.length, `${name} loads each asset once`);
  for (const asset of assets) assert(fs.existsSync(path.join(web, 'static', asset)), `${name}: missing ${asset}`);
  const scripts = [...html.matchAll(/<script src="\/static\/([^"?]+)\?[^\"]*"([^>]*)><\/script>/g)];
  for (const [, asset] of scripts) {
    if (!asset.startsWith('vendor/')) new vm.Script(fs.readFileSync(path.join(web, 'static', asset), 'utf8'), {filename: asset});
  }
  function before(dependency, consumer) {
    assert(assets.includes(dependency) && assets.includes(consumer) &&
      assets.indexOf(dependency) < assets.indexOf(consumer), `${name}: ${dependency} must load before ${consumer}`);
  }
  if (name === '3d_viewer.html') {
    before('vendor/three-r128.min.js', 'vendor/OrbitControls-r128.js');
    before('vendor/OrbitControls-r128.js', 'pages/3d-viewer.js');
    continue;
  }
  if (name === 'phone.html') {
    before('data/browser-preferences.js', 'pages/phone.js');
    assert(scripts.every(m => m[2].includes('defer')));
    continue;
  }
  assert.equal(scripts[0][1], 'components/generation-transition.js');
  assert(!scripts[0][2].includes('defer'), 'Navigation bootstrap runs before parsing the body');
  assert(scripts.slice(1).every(m => m[2].includes('defer')), 'Dashboard scripts run after parsing, in order');
  before('data/browser-preferences.js', 'components/announcement-ticker.js');
  before('data/operator-session.js', 'components/operator-login.js');
  if (name === 'index.html') {
    before('pages/gen21-math-path.js', 'pages/gen21.js');
    before('pages/gen21-run-report.js', 'pages/gen21.js');
    before('pages/gen21-path-canvas.js', 'pages/gen21.js');
  }
  if (name === 'gen3.html') {
    before('gen3.css', 'components.css');
    before('data/gen3-api.js', 'data/gen3-records.js');
    before('data/gen3-records.js', 'pages/gen3-calibration.js');
    before('pages/gen3.js', 'pages/gen3-gait-settings.js');
    before('pages/gen3-operator.js', 'pages/gen3-status.js');
    before('pages/gen3-ports.js', 'pages/gen3-status.js');
    before('pages/gen3-joints.js', 'pages/gen3-status.js');
    before('pages/gen3-gait-presets.js', 'pages/gen3-status.js');
    before('pages/gen3-run-journal.js', 'pages/gen3-status.js');
    before('components/controller-input.js', 'pages/gen3-gamepad.js');
    before('vendor/three-r128.min.js', 'pages/gen3-sim.js');
  }
}
console.log('Dashboard scripts parse and templates load each asset once in dependency order');

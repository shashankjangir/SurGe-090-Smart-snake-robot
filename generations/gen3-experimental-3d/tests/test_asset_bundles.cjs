const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const web = path.resolve(__dirname, '../backend/web_dashboard');

for (const name of ['common.js', 'gen21.js', 'gen3.js', 'gen3-sim.js', 'generation-transition.js']) {
  new vm.Script(fs.readFileSync(path.join(web, 'static', name), 'utf8'), {filename: name});
}
for (const name of ['index.html', 'gen3.html', '3d_viewer.html']) {
  const html = fs.readFileSync(path.join(web, 'templates', name), 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="\/static\/([^"?]+\.(?:js|css))(?:\?[^\"]*)?"/g)].map(m => m[1]);
  assert.equal(new Set(assets).size, assets.length, `${name} loads each asset once`);
  for (const asset of assets) assert(fs.existsSync(path.join(web, 'static', asset)), `${name}: missing ${asset}`);
  if (name === '3d_viewer.html') continue;
  const scripts = [...html.matchAll(/<script src="\/static\/([^"?]+)\?[^\"]*"([^>]*)><\/script>/g)];
  assert.equal(scripts[0][1], 'generation-transition.js');
  assert(!scripts[0][2].includes('defer'), 'Navigation bootstrap runs before parsing the body');
  assert(scripts.slice(1).every(m => m[2].includes('defer')), 'Application bundles run after parsing, in order');
  assert.equal(scripts[1][1], 'common.js');
  assert.equal(scripts[2][1], name === 'index.html' ? 'gen21.js' : 'gen3.js');
  if (name === 'gen3.html') {
    assert(assets.indexOf('gen3.css') < assets.indexOf('components.css'));
    assert(assets.indexOf('vendor/three-r128.min.js') < assets.indexOf('gen3-sim.js'));
  }
}
console.log('Whole bundles parse; templates load existing assets once in dependency order');

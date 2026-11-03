const fs = require('node:fs');
const path = require('node:path');

// Component tests exercise the original sections; browser checks exercise whole bundles.
const directory = path.resolve(__dirname, '../backend/web_dashboard/static');
const sections = new Map();
for (const name of ['common.js', 'gen21.js', 'gen3.js', 'components.css']) {
  const source = fs.readFileSync(path.join(directory, name), 'utf8');
  for (const match of source.matchAll(/\/\* asset: ([\w.-]+) \*\/\r?\n([\s\S]*?)\/\* endasset: \1 \*\//g)) {
    if (sections.has(match[1])) throw new Error(`Duplicate asset section: ${match[1]}`);
    sections.set(match[1], match[2]);
  }
}

function readAsset(filename, encoding = 'utf8') {
  const resolved = path.resolve(filename);
  if (path.dirname(resolved) === directory && sections.has(path.basename(resolved))) {
    const source = sections.get(path.basename(resolved));
    return encoding === 'utf8' || encoding === 'utf-8' ? source : Buffer.from(source);
  }
  return fs.readFileSync(filename, encoding);
}

function requireAsset(filename) {
  const component = {exports: {}};
  new Function('module', 'exports', 'require', readAsset(filename))(component, component.exports, require);
  return component.exports;
}

module.exports = {readAsset, requireAsset};

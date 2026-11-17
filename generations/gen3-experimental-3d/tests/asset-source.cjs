const fs = require('node:fs');
const path = require('node:path');

// Some stylesheet tests read named sections of components.css.
const directory = path.resolve(__dirname, '../backend/web_dashboard/static');
const sections = new Map();
const styles = fs.readFileSync(path.join(directory, 'components.css'), 'utf8');
for (const match of styles.matchAll(/\/\* asset: ([\w.-]+) \*\/\r?\n([\s\S]*?)\/\* endasset: \1 \*\//g)) {
  if (sections.has(match[1])) throw new Error(`Duplicate asset section: ${match[1]}`);
  sections.set(match[1], match[2]);
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

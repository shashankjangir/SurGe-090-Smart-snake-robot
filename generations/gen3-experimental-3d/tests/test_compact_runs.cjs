const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const {readAsset} = require('./asset-source.cjs');
const source = readAsset(path.join(__dirname, '../backend/web_dashboard/static/gen3.js'));
test('journal reveals three at a time without discarding rows or annotation drafts', () => {
  const rows = Array.from({length: 7}, () => ({hidden: false, draft: 'unsaved observation'}));
  const elements = {'runs-table-body': {children: rows}, 'runs-visible-count': {}, 'runs-show-more': {}};
  const context = vm.createContext({$: id => elements[id]});
  const start = source.indexOf('let visibleRunCount = 3;');
  vm.runInContext(source.slice(start, source.indexOf('async function loadRuns()', start)), context);
  const check = (count, text) => {
    context.updateRunVisibility();
    assert.equal(rows.filter(row => !row.hidden).length, count);
    assert.equal(elements['runs-visible-count'].textContent, text);
    assert(rows.every(row => row.draft === 'unsaved observation'));
  };
  check(3, '3 of 7 runs');
  vm.runInContext('visibleRunCount += 3', context); check(6, '6 of 7 runs');
  assert.equal(elements['runs-show-more'].textContent, 'Show 1 more');
  vm.runInContext('visibleRunCount += 3', context); check(7, '7 of 7 runs');
  assert.equal(elements['runs-show-more'].hidden, true);
  elements['runs-table-body'].children = [];
  context.updateRunVisibility();
  assert.equal(elements['runs-visible-count'].textContent, 'No runs in this workspace.');
  assert.equal(elements['runs-show-more'].hidden, true);
});

const assert = require('node:assert/strict');
const { rankConsoleResults } = require('../../gen3-experimental-3d/backend/web_dashboard/static/gen3-search.js');
const items = [
  {title: 'Waveform', description: 'Yaw frequency and speed'},
  {title: 'Speed counts/s', description: 'Waveform settings'},
  {title: '<img onerror=alert(1)>', description: 'Saved preset'},
];
assert.deepEqual(rankConsoleResults(items, '  '), []);
assert.equal(rankConsoleResults(items, ' SPEED ')[0].title, 'Speed counts/s');
assert.equal(rankConsoleResults(items, 'yaw frequency').length, 1);
assert.equal(rankConsoleResults(items, 'yaw missing').length, 0);
assert.equal(rankConsoleResults(items, 'unmatched').length, 0);
assert.equal(rankConsoleResults(items, '<img')[0].title, '<img onerror=alert(1)>');
assert.equal(rankConsoleResults(Array(20).fill(items[0]), 'yaw').length, 8);
console.log('Gen 3 search: 7 ranking checks passed');

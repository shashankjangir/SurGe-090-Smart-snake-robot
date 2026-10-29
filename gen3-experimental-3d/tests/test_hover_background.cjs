const assert = require('node:assert/strict');
const {highlightBounds} = require('../../gen3-experimental-3d/backend/web_dashboard/static/hover-background.js');
assert.deepEqual(highlightBounds({left:10, top:20}, {left:40, top:80, width:100, height:44}),
  {x:30, y:60, width:100, height:44});
assert.deepEqual(highlightBounds({left:10, top:20}, {left:40, top:80, width:100, height:44}, 12, 30),
  {x:42, y:90, width:100, height:44});
assert.deepEqual(highlightBounds({left:0, top:0}, {left:0, top:0, width:0, height:0}),
  {x:0, y:0, width:0, height:0});
console.log('Moving background geometry: 3 checks passed');

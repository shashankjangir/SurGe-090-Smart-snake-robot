const assert = require('node:assert/strict');
require('../backend/web_dashboard/static/math-path.js');
const {compile, generate} = globalThis.SurgeMathPath;
assert.ok(Math.abs(compile('sin(x) + 0.5*cos(2*x)')(0) - .5) < 1e-12);
for (const expression of ['alert(1)', 'constructor(1)', 'x;1', 'Math.sin(x)', '1/0', 'sqrt(-1)']) {
  assert.throws(() => generate('custom', expression, 0, 1));
}
for (const [preset, expression, end] of [['sine','sin(x)',10],['damped','exp(-0.2*x)*sin(x)',10],['cosine','cos(x)',10],['two-wave','sin(x)+0.3*sin(3*x)',10],['parabola','0.05*x^2',10],['circle','',6.28],['spiral','',12.56],['lemniscate','',6.28]]) {
  const points = generate(preset, expression, 0, end);
  assert(points.length > 1 && points.length <= 5000);
  assert(points.every(p => p.every(n => Number.isFinite(n) && Math.abs(n) <= 100)));
}
assert.throws(() => generate('circle', '', 0, 1, Infinity));
assert.throws(() => generate('circle', '', 0, 1, 0));
assert.ok(Math.abs(generate('circle', '', 0, 1, 2)[0][0] - 4) < 1e-12);
for (const bounds of [[1, 0], [0, Infinity], [-101, 1], [0, 0]]) assert.throws(() => generate('custom','x',...bounds));
console.log('Math paths: safe expressions, bounds and presets passed');

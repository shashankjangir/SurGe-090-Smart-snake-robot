const {readAsset} = require('./asset-source.cjs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const source = readAsset('generations/gen3-experimental-3d/backend/web_dashboard/static/gen3.js', 'utf8');
const elements = {};
const context = { $: id => elements[id] ||= {}, Date };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function renderBusMetrics('), source.indexOf('function renderDiagnostics(')), context);
context.renderBusMetrics({port: 'COM7', timestamp: Date.now() / 1000 - 5, servos: {
  1: {reg8: 1, voltage: 114, temperature: 30},
  2: {reg8: 1, voltage: 112, temperature: 34},
  3: {reg8: -1, voltage: -1, temperature: -1},
  4: {reg8: null, voltage: null, temperature: null}
}});
assert.equal(elements['grid-metric-voltage'].textContent, '11.2 V');
assert.equal(elements['grid-metric-temp'].textContent, '34 °C');
assert.equal(elements['grid-metric-servos'].textContent, '2 / 10');
assert.match(elements['bus-metrics-status'].textContent, /Snapshot · COM7 · \d+s old/);
context.renderBusMetrics(null);
assert.equal(elements['grid-metric-voltage'].textContent, 'Unavailable');
assert.equal(elements['grid-metric-servos'].textContent, 'Unavailable');
context.renderBusMetrics({port: 'COM7', timestamp: Date.now()/1000, servos: {1: {reg8: -1, voltage: -1, temperature: -1}}});
assert.equal(elements['grid-metric-temp'].textContent, 'Unavailable');
assert.equal(elements['grid-metric-servos'].textContent, '0 / 10');
const now = Date.now() / 1000;
const snapshot = {port: 'COM7', timestamp: now - 60, servos: {1: {reg8: 1, voltage: 117, temperature: 32}}};
const telemetry = {1: {valid: true, target: 2048, position: 2037}, 2: {valid: true, target: 2100, position: 2100},
                   3: {valid: false}, 4: {valid: true, target: '', position: 2048}};
context.renderBusMetrics(snapshot, {server_time: now, telemetry, bus: {port: 'COM7', at: now - .3, latency_ms: 18.4, interval_s: .05}});
assert.equal(elements['grid-metric-latency'].textContent, '18 ms');
assert.equal(elements['grid-metric-rate'].textContent, '20.0 Hz');
assert.equal(elements['grid-metric-sync'].textContent, '±1.0°');
assert.equal(elements['grid-metric-servos'].textContent, '3 / 10');
assert.equal(elements['grid-metric-voltage'].textContent, '11.7 V');
assert.match(elements['bus-metrics-status'].textContent, /Live · COM7 · voltage\/temp snapshot \d+s old/);
// Stale feedback (run ended) falls back to the snapshot.
context.renderBusMetrics(snapshot, {server_time: now, telemetry, bus: {port: 'COM7', at: now - 5, latency_ms: 18, interval_s: .05}});
assert.equal(elements['grid-metric-latency'].textContent, 'Unavailable');
assert.equal(elements['grid-metric-servos'].textContent, '1 / 10');
assert.match(elements['bus-metrics-status'].textContent, /Snapshot · COM7/);
context.renderBusMetrics(snapshot, {server_time: now, telemetry: {1: {valid: true, position: 2048}},
  bus: {kind: 'idle', port: 'COM8', at: now - 3, latency_ms: 19, interval_s: 3}});
assert.equal(elements['grid-metric-latency'].textContent, '19 ms');
assert.equal(elements['grid-metric-rate'].textContent, '0.3 Hz');
assert.equal(elements['grid-metric-sync'].textContent, 'Idle · torque off');
assert.match(elements['bus-metrics-status'].textContent, /Auto refresh · COM8/);
console.log('Bus diagnostic snapshot, automatic idle refresh and live metrics passed');

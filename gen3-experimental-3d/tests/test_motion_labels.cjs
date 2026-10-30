const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/static/script.js', 'utf8');
const block = source.slice(source.indexOf('            isRunning = Boolean(data.is_running'), source.indexOf("            if (currentPathRevision !=="));
for (const [connected, paused, expected] of [[true, false, 'Running'], [true, true, 'Stopped'], [false, true, 'Disconnected']]) {
    const elements = {};
    const document = {getElementById: id => elements[id] ||= {style: {}, classList: {toggle(name, value) { this[name] = value; }}}};
    vm.runInNewContext(block, {document, isRunning: false, data: {is_running: connected, is_paused: paused, status: connected ? 'Stopped; torque off' : 'Disconnected'}});
    assert.equal(elements['conn-status'].textContent, expected);
    for (const id of ['btn-start', 'btn-hero-start', 'btn-canvas-start']) {
        assert.equal(elements[id].textContent, expected === 'Running' ? 'Running' : 'Start Motion');
    }
    for (const id of ['btn-stop', 'btn-hero-stop', 'btn-canvas-stop']) {
        assert.equal(elements[id].textContent, expected === 'Running' ? 'STOP / TORQUE OFF' : 'Stopped');
        assert.equal(elements[id].classList['motion-stopped'], expected !== 'Running');
    }
    assert.equal(elements['btn-connect'].textContent, connected ? 'Disconnect Engine' : 'Connect Engine');
    if (expected === 'Running') assert.equal(elements['accuracy-modal'].style.display, 'none');
}
console.log('Motion labels: running, stopped while connected, and disconnected passed across all controls');

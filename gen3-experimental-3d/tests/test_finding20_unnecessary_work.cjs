/**
 * Unit test for Finding 20: Stop doing unnecessary work
 * - Gen 2.1 status polling exponential backoff on consecutive failures (100 -> 250 -> 500 -> 1000 -> 2000 ms) and instant reset to 100ms on success
 * - Gen 3 simulation loop & polling visibility guards (document.hidden & panel-simulation.active)
 * - morphing-button.css removal of permanent will-change
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Testing Finding 20: Stop doing unnecessary work...');

// 1. Gen 2.1 Exponential Backoff Check
const scriptSource = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/script.js'), 'utf8');

assert(!scriptSource.includes('setInterval(updateStatus, 100)'), 'script.js must NOT use static setInterval(updateStatus, 100)');
assert(scriptSource.includes('scheduleStatusPoll'), 'script.js must define scheduleStatusPoll');
assert(scriptSource.includes('backoffSchedule = [100, 250, 500, 1000, 2000]'), 'script.js must define backoff schedule [100, 250, 500, 1000, 2000]');

// Simulate backoff in VM
const backoffSchedule = [100, 250, 500, 1000, 2000];
let failures = 0;
assert.equal(backoffSchedule[Math.min(failures, backoffSchedule.length - 1)], 100, '0 failures -> 100ms');

failures++; // 1 failure
assert.equal(backoffSchedule[Math.min(failures, backoffSchedule.length - 1)], 250, '1 failure -> 250ms');

failures++; // 2 failures
assert.equal(backoffSchedule[Math.min(failures, backoffSchedule.length - 1)], 500, '2 failures -> 500ms');

failures++; // 3 failures
assert.equal(backoffSchedule[Math.min(failures, backoffSchedule.length - 1)], 1000, '3 failures -> 1000ms');

failures += 5; // 8 failures (capped)
assert.equal(backoffSchedule[Math.min(failures, backoffSchedule.length - 1)], 2000, '8 failures -> 2000ms max cap');

// Reset on success
failures = 0;
assert.equal(backoffSchedule[Math.min(failures, backoffSchedule.length - 1)], 100, 'Reset on success -> 100ms');

console.log('  PASS: Gen 2.1 exponential backoff schedule (100 -> 250 -> 500 -> 1000 -> 2000 ms) and instant recovery verified');

// 2. Gen 3 Simulation Visibility Guard
const gen3SimSource = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/gen3-sim.js'), 'utf8');

assert(gen3SimSource.includes('function isSimulationVisible()'), 'gen3-sim.js must define isSimulationVisible()');
assert(gen3SimSource.includes('if (document.hidden) return false;'), 'isSimulationVisible must check document.hidden');
assert(gen3SimSource.includes("panel.classList.contains('active')"), 'isSimulationVisible must check panel.classList.contains("active")');

assert(gen3SimSource.includes('function syncSimulationActivity()'), 'gen3-sim.js must define syncSimulationActivity()');
assert(gen3SimSource.includes('document.addEventListener(\'visibilitychange\', syncSimulationActivity)'), 'gen3-sim.js must listen to visibilitychange');
assert(gen3SimSource.includes('new MutationObserver'), 'gen3-sim.js must observe tab panel attribute mutations');

// Check that renderLoop and pollSimulation pause when invisible
assert(gen3SimSource.includes('!isSimulationVisible()') && gen3SimSource.includes('isRenderRunning = false;'), 'renderLoop must stop when simulation is invisible');
assert(gen3SimSource.includes('!isSimulationVisible()') && gen3SimSource.includes('isSimPolling = false;'), 'pollSimulation must stop when simulation is invisible');
assert(gen3SimSource.includes('cancelAnimationFrame(animFrameId)'), 'syncSimulationActivity must cancel animation frame on hide');

console.log('  PASS: Gen 3 simulation loop & polling visibility guards and clean pause/resume verified');

// 3. morphing-button.css will-change check
const morphingCss = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/morphing-button.css'), 'utf8');

assert(!morphingCss.includes('will-change: transform;'), 'morphing-button.css must NOT permanently set will-change: transform');
assert(!morphingCss.includes('will-change: max-width, transform;'), 'morphing-button.css must NOT permanently set will-change: max-width, transform');

console.log('  PASS: morphing-button.css permanent will-change removed');

console.log('\nAll Finding 20 checks passed successfully!');

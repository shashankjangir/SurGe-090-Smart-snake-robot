const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = name => fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/static/' + name, 'utf8');
const elements = {};
const $ = id => elements[id] ||= {textContent: '',style:{}};
let now = 0;
const rate = {document:{getElementById:$}, performance:{now:()=>now}};
vm.createContext(rate);
const script = read('script.js');
vm.runInContext(script.slice(script.indexOf('    const statusSampleTimes'),script.indexOf('    let statusInFlight')),rate);
rate.updateDashboardRate(true);
assert.match($('dashboard-update-rate').textContent,/awaiting/);
now=100;rate.updateDashboardRate(true);
assert.match($('dashboard-update-rate').textContent,/10.0 Hz/);
now=300;rate.updateDashboardRate(true);
assert.match($('dashboard-update-rate').textContent,/6.7 Hz/);
now=1500;rate.updateDashboardRate();
assert.match($('dashboard-update-rate').textContent,/no recent/);
now=6000;rate.updateDashboardRate();
assert.doesNotMatch($('dashboard-update-rate').textContent,/Hz/);
const sim = read('gen3-sim.js');
const initialCards = [];
const initialGrid = { set innerHTML(value) { initialCards.length = 0; }, appendChild(card) { initialCards.push(card); } };
const initialContext = { $: id => id === 'sim-telemetry-grid' ? initialGrid : null,
 document: { createElement: () => ({}) }, JOINT_SPECS: [{ id: 1, axis: 'pitch', sign: 1 }] };
vm.createContext(initialContext);
vm.runInContext(sim.slice(sim.indexOf('  function initTelemetryGrid()'), sim.indexOf('  // 2. Physics')), initialContext);
initialContext.initTelemetryGrid();
assert.match(initialCards[0].innerHTML, /Neutral \(not measured\)/);
assert.match(initialCards[0].innerHTML, /-- \(unsampled\)/);
assert.doesNotMatch(initialCards[0].innerHTML, /Measured Angle/);
const sampleContext = {$,snapshotAvailable:true, measuredSamples:Array(10).fill(null),
 JOINT_SPECS:Array.from({length:10},(_,i)=>({id:i+1})),currentAngles:Array(10).fill(0),
 lastFrameTime:0,draw3DScene(){},requestAnimationFrame(){},Date:{now:()=>100000},Math};
vm.createContext(sampleContext);
vm.runInContext(sim.slice(sim.indexOf('  function samplePresentation('),sim.indexOf('  // Draw Scene on Canvas')),sampleContext);
sampleContext.renderLoop(0);
for(let id=1;id<=10;id++) {
 assert.equal($('sim-ang-'+id).textContent,'Neutral (not measured)');
 assert.match($('sim-cnt-'+id).textContent,/unsampled/);
}
sampleContext.measuredSamples[0]={position:2050,at:99.8};
sampleContext.currentAngles[0]=0.2;
sampleContext.renderLoop(1);
assert.match($('sim-sample-1').textContent,/Sampled.*0.2 s old/);
assert.equal($('sim-cnt-1').textContent,2050);
assert.match(sampleContext.samplePresentation({at:98},100000).label,/Stale/);
sampleContext.snapshotAvailable=false;
assert.match(sampleContext.samplePresentation({at:99.9},100000).label,/Stale/);
sampleContext.snapshotAvailable=true;
assert.match(sampleContext.samplePresentation({at:99.9,valid:false},100000).label,/Stale/);
const gen3=read('gen3.js');
const stats = {$, fetch:async()=>({ok:true,json:async()=>stats.data})};
vm.createContext(stats);
vm.runInContext(gen3.slice(gen3.indexOf('function formatUnit('),gen3.indexOf('function number(')),stats);
vm.runInContext(gen3.slice(gen3.indexOf('async function pollSystemStats()'),gen3.indexOf('// Bootstrap')),stats);
(async()=>{
 for(const invalid of ['N/A',null,undefined,NaN,Infinity]) {
  stats.data={cpu:invalid,ram:invalid,temp:invalid};await stats.pollSystemStats();
  for(const id of ['sys-cpu','sys-ram','sys-temp']) assert.equal($(id).textContent,'N/A');
  assert.equal(stats.formatUnit(invalid,' Hz'),'N/A');
 }
 stats.data={cpu:0,ram:25,temp:0};await stats.pollSystemStats();
 assert.equal($('sys-temp').textContent,'0°C');assert.equal($('sys-cpu').textContent,'0.0%');
 const expression=script.match(/const torque = (.*);/)[1];
 for(const [simulatedTorque,m,expected] of [[true,{torque_nm:1.25,load:5},'1.250 Nm (sim)'],[false,{load:5},'5 raw'],[true,{load:5},'-- (unsampled)']]) {
  assert.equal(vm.runInNewContext(expression,{simulatedTorque,m,Number}),expected);
 }
 console.log('Truthful telemetry: source units, neutral/valid/stale snapshots, measured rate and finite unit formatting passed');
})().catch(error=>{console.error(error);process.exitCode=1;});

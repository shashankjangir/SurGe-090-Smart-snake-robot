const {readAsset} = require('./asset-source.cjs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const gen21 = readAsset(process.env.SURGE_GEN21_SOURCE || 'generations/gen3-experimental-3d/backend/web_dashboard/static/script.js', 'utf8');
const gen3 = readAsset(process.env.SURGE_GEN3_SOURCE || 'generations/gen3-experimental-3d/backend/web_dashboard/static/gen3-sim.js', 'utf8');
function element(value = '') { return {value, checked:false, style:{display:'none'}, events:{}, addEventListener(type,fn){this.events[type]=fn;}}; }
(async () => {
  const ids = ['param-fric','param-amp','param-freq','param-phase','param-force','param-speed','param-lowpower','btn-apply-physics','btn-reset-physics','physics-applied-pill'];
  const e = Object.fromEntries(ids.map(id => [id,element('1')]));
  let calls = 0, fail = true, message = '';
  const ctx = {document:{querySelectorAll:()=>[e['param-amp']],getElementById:id=>e[id]}, post:async()=>{calls++;if(fail)throw Error('offline');}, alert:s=>{message=s;},setTimeout:()=>{}};
  vm.runInNewContext(gen21.slice(gen21.indexOf('    const paramInputs ='),gen21.indexOf("    for (const id of ['btn-open-3d'")),ctx);
  e['param-amp'].events.input({target:{id:'param-amp',value:'0.5'}});
  assert.equal(calls,0,'slider edits must not apply before confirmation');
  await e['btn-apply-physics'].events.click();
  assert.equal(e['physics-applied-pill'].style.display,'none','failed request must not show success');
  assert.equal(message,'offline');
  fail=false;
  await e['btn-apply-physics'].events.click();
  assert.equal(e['physics-applied-pill'].style.display,'block');

  const slider = element('5'), val = element(), apply = element(), reset = element(), pill = element();
  const items = {'sim-param-yaw-amp':slider,'val-sim-yaw-amp':val,'btn-sim-apply-physics':apply,'btn-sim-reset-physics':reset,'sim-physics-applied-pill':pill};
  let prompts = 0;
  const c = { $:id=>items[id] || null, window:{confirmParameterChanges:async()=>{prompts++;return true;}},
    activeParams:{yaw:5}, DEFAULT_PARAMS:{yaw:5}, simulationSettingsDirty:false, clearTimeout(){},setTimeout(){} };
  vm.createContext(c);
  vm.runInContext(gen3.slice(gen3.indexOf('  function initSliders()'),gen3.indexOf('  // 3. Preset Selector')) + '\ninitSliders();',c);
  slider.value = '12'; slider.events.input();
  assert.equal(c.activeParams.yaw,5,'slider must not change effective settings before confirmation');
  // Simulation settings apply directly: no confirmation pop-up (hardware keeps its confirmation).
  await apply.events.click();
  assert.equal(prompts,0,'simulation settings must not open a confirmation');
  assert.equal(c.activeParams.yaw,12); assert.equal(c.simulationSettingsDirty,false);
  console.log('Simulation settings: draft, failed request and direct-apply states passed');
})().catch(error=>{console.error(error);process.exitCode=1;});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/static/gen3-sim.js', 'utf8');
const elements = {};
const $ = id => elements[id] ||= {value: '', textContent: '', disabled: false, handlers: {}, style: {},
  clientWidth: 700, clientHeight: 500, addEventListener(type, fn) {this.handlers[type] = fn;},
  setAttribute(name, value) {this[name] = value;},
  getBoundingClientRect() {return {left: 10, top: 20, width: 700, height: 500};}};
const context = {$, camera: {target:{x:0,y:0,z:.1},yaw:.7,pitch:-.7,distance:3},
  cameraMode:'follow', routeDraft:[], routeDirty:false, routeSnapshot:null, routeDrawing:false,
  routeRun:null, simulationBusy:false, simulationHead:null, simulationLinks:null,
  updateCameraHUD(){}, document:{addEventListener(){}}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  function setRouteDraft('), source.indexOf('  async function loadCadVisuals(')), context);
vm.runInContext(source.slice(source.indexOf('  function project3D('), source.indexOf('  function samplePresentation(')), context);
context.initRouteControls();
$('sim-route-line').handlers.click();
assert.equal(context.routeDraft.length,41);
assert.equal(context.routeDraft[0][0],-.05);
assert.equal(context.routeDraft.at(-1)[0],1.55);
$('sim-route-curve').handlers.click();
assert(Math.abs(Math.max(...context.routeDraft.map(p=>p[1]))-.1)<1e-9);
context.simulationBusy = true;
$('sim-route-clear').handlers.click(); assert.equal(context.routeDraft.length,41);
context.simulationBusy = false;
$('sim-route-points').value='0, 0\n1, .2'; $('sim-route-apply').handlers.click();
assert.equal(context.routeDraft.length,2);
$('sim-route-points').value='0, 0\nInfinity, 2'; $('sim-route-apply').handlers.click();
assert.match($('sim-route-status').textContent,/within/);
assert.equal(context.routeDraft.length,2,'invalid input preserves the valid draft');
context.camera={target:{x:.3,y:-.2,z:.1},yaw:.7,pitch:-.7,distance:3};
for (const point of [[0,0,0],[.4,-.3,0],[-.2,.7,0]]) {
  const screen=context.project3D(...point,700,500);
  const recovered=context.groundPoint({clientX:screen.u+10,clientY:screen.v+20},$('gen3SimCanvas'));
  assert(Math.hypot(recovered[0]-point[0],recovered[1]-point[1])<1e-9,'drawing matches the displayed world coordinates');
}
const telemetry={cameraMode:'follow',routeDrawing:false,camera:{target:{x:0,y:0,z:.1},yaw:.7,pitch:-.7,distance:3},
 simulationHead:{position:[1,2,.2]}, $, snapshotAvailable:false, measuredSamples:[],JOINT_SPECS:Array.from({length:10},(_,i)=>({id:i+1})),
 currentAngles:[], lastFrameTime:0,draw3DScene(){},requestAnimationFrame(){},Date:{now:()=>1000},Math};
vm.createContext(telemetry);
vm.runInContext(source.slice(source.indexOf('  function samplePresentation('),source.indexOf('  // Draw Scene on Canvas')),telemetry);
telemetry.renderLoop(100);
assert(telemetry.camera.target.x>0 && telemetry.camera.target.y>0);
assert.equal(telemetry.camera.yaw,.7); assert.equal(telemetry.camera.distance,3);
console.log('Gen 3 route editing, projection roundtrip, active-run guard and head-follow offset passed');

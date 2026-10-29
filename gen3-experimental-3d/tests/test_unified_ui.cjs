/**
 * Verification test for SURGE 090 Unified Playful Dashboard
 * Tests all gates from docs/SURGE_090_UNIFIED_UI_EXECUTION_PLAN.md
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/templates/index.html'), 'utf8');
const gen3Html = fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/templates/gen3.html'), 'utf8');
const unifiedCss = fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/static/unified-cockpit.css'), 'utf8');
const scriptJs = fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/static/script.js'), 'utf8');
const gen3Js = fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/static/gen3.js'), 'utf8');
const searchJs = fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/static/gen3-search.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../backend/web_dashboard/static/style.css'), 'utf8');

console.log('Testing SURGE 090 Unified UI Acceptance Gates...');

// Gate 1: Shared Header, Brand, and Morphing Login
[indexHtml, gen3Html].forEach((html, idx) => {
  const route = idx === 0 ? 'Gen 2.1 (/)' : 'Gen 3 (/gen3)';
  assert(html.includes('top-nav distorted-glass-header'), `${route} must include top-nav distorted-glass-header`);
  assert(html.includes('logo-badge distorted-glass-logo'), `${route} must include logo-badge distorted-glass-logo`);
  assert(html.includes('SURGE 090') && html.includes('Smart Snake System'), `${route} must include brand header`);
  assert(html.includes('id="sys-cpu"') && html.includes('id="sys-ram"') && html.includes('id="sys-temp"'), `${route} must include system stats`);
  assert(html.includes('id="mode-badge"') && html.includes('id="operator-login-form"'), `${route} must include operator login controls`);
  assert(html.includes('id="active-operator-badge"') && html.includes('id="lease-badge"'), `${route} must include lease badges`);
  assert(html.includes('class="morphing-button-container"'), `${route} must include morphing password button`);
});
console.log('  PASS: Gate 1 — Shared header, brand, and operator login morphing controls verified');

// Gate 2: Shared Hero & Generation Switch with Rich Info Cards
[indexHtml, gen3Html].forEach((html, idx) => {
  const route = idx === 0 ? 'Gen 2.1 (/)' : 'Gen 3 (/gen3)';
  assert(html.includes('hero-snake-canvas'), `${route} must include hero-snake-canvas`);
  assert(html.includes('shader-lens-blur-canvas'), `${route} must include shader-lens-blur-canvas`);
  assert(html.includes('distorted-glass-ribbon'), `${route} must include distorted-glass-ribbon`);
  assert(html.includes('class="modular-control-wrapper"'), `${route} must include modular-control-wrapper`);
  assert(html.includes('class="modular-control-badge"'), `${route} must include modular-control-badge`);
  assert(html.includes('id="tooltip-gen21"') && html.includes('id="tooltip-gen3"'), `${route} must include generation info tooltips`);
  assert(html.includes('Planar Snake') && html.includes('10 Yaw Joints'), `${route} must describe Gen 2.1 planar kinematics`);
  assert(html.includes('3D Spatial Snake') && html.includes('Alternating 5 Pitch + 5 Yaw Joints'), `${route} must describe Gen 3 spatial kinematics`);
});
console.log('  PASS: Gate 2 — Shared hero, shaders, and generation switch with rich hover cards verified');

// Gate 3: Task Navigation Tabs & Tab Stop Action
assert(indexHtml.includes('class="nav-pills cockpit-tabs"'), 'Gen 2.1 must have task navigation bar');
assert(gen3Html.includes('class="nav-pills tab-nav"'), 'Gen 3 must have task navigation bar');
[indexHtml, gen3Html].forEach((html, idx) => {
  const route = idx === 0 ? 'Gen 2.1 (/)' : 'Gen 3 (/gen3)';
  assert(html.includes('id="tab-stop-btn"'), `${route} must have tab-stop-btn in task tab strip`);
});
assert(unifiedCss.includes('.tab-stop-action-btn'), 'unified-cockpit.css must style tab-stop-action-btn');
console.log('  PASS: Gate 3 — Task tab strip and tab Stop action verified across both routes');

// Gate 4: Always-Visible Persistent Stop Button
[indexHtml, gen3Html].forEach((html, idx) => {
  const route = idx === 0 ? 'Gen 2.1 (/)' : 'Gen 3 (/gen3)';
  assert(html.includes('class="floating-action-dock"'), `${route} must have floating-action-dock`);
  assert(html.includes('id="floating-stop-btn"'), `${route} must have floating-stop-btn`);
  assert(html.includes('id="floating-stop-state"'), `${route} must have floating-stop-state`);
});
assert(unifiedCss.includes('#floating-stop-btn'), 'unified-cockpit.css must style #floating-stop-btn');
assert(scriptJs.includes("id of ['btn-hero-stop', 'tab-stop-btn', 'floating-stop-btn']"), 'script.js must wire floating-stop-btn to safe stop');
assert(gen3Js.includes("$('floating-stop-btn')"), 'gen3.js must wire stop handlers');
console.log('  PASS: Gate 4 — Always-visible persistent Stop button and safe handlers verified');

// Gate 5: Telemetry Hover Vibration & Reduced Motion Guard
assert(styleCss.includes('.telem-box:hover'), 'style.css must style .telem-box:hover');
assert(styleCss.includes('animation: telemetry-wiggle'), 'style.css must animate telemetry-wiggle');
assert(styleCss.includes('@media (prefers-reduced-motion: reduce)') && styleCss.includes('.telem-box:hover { animation: none;'),
  'style.css must disable telemetry hover vibration under prefers-reduced-motion');
console.log('  PASS: Gate 5 — Telemetry hover vibration and reduced-motion alternative verified');

// Gate 6: Search Safety on Gen 3 Only
assert(!indexHtml.includes('console-search'), 'Gen 2.1 must not include search');
assert(gen3Html.includes('console-search'), 'Gen 3 must include search');
assert(searchJs.includes('Navigation only: never click or submit the matched robot control'),
  'Gen 3 search must be navigation only and never actuate controls');
console.log('  PASS: Gate 6 — Gen 3 search navigation-only guard verified');

// Gate 7: Workspaces Integrity
assert(indexHtml.includes('id="pathCanvas"'), 'Gen 2.1 must preserve planar path canvas');
assert(indexHtml.includes('id="math-preset"'), 'Gen 2.1 must preserve mathematical presets');
assert(indexHtml.includes('id="gamepad-card"'), 'Gen 2.1 must preserve gamepad card');
assert(gen3Html.includes('id="gen3SimCanvas"'), 'Gen 3 must preserve 3D simulation canvas');
assert(gen3Html.includes('id="panel-calibration"'), 'Gen 3 must preserve calibration panel');
assert(gen3Html.includes('id="panel-firmware"'), 'Gen 3 must preserve firmware panel');
console.log('  PASS: Gate 7 — Generation-specific workspaces integrity verified');

console.log('\nAll Unified UI Acceptance Gates passed successfully! (7/7)');

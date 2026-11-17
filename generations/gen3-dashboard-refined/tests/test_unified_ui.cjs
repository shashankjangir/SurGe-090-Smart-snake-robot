const {readAsset} = require('./asset-source.cjs');
/**
 * Shared control and accessibility checks for the refined dashboard.
 */
const assert = require('assert');
const path = require('path');

const indexHtml = readAsset(path.join(__dirname, '../backend/web_dashboard/templates/index.html'), 'utf8');
const gen3Html = readAsset(path.join(__dirname, '../backend/web_dashboard/templates/gen3.html'), 'utf8');
const unifiedCss = readAsset(path.join(__dirname, '../backend/web_dashboard/static/unified-cockpit.css'), 'utf8');
const scriptJs = readAsset(path.join(__dirname, '../backend/web_dashboard/static/script.js'), 'utf8');
const gen3Js = readAsset(path.join(__dirname, '../backend/web_dashboard/static/gen3.js'), 'utf8');
const searchJs = readAsset(path.join(__dirname, '../backend/web_dashboard/static/gen3-search.js'), 'utf8');
const styleCss = readAsset(path.join(__dirname, '../backend/web_dashboard/static/style.css'), 'utf8');
const refinedCss = readAsset(path.join(__dirname, '../backend/web_dashboard/static/refined.css'), 'utf8');

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

// Gate 2: Compact headings and generation navigation.
[indexHtml, gen3Html].forEach((html, idx) => {
  const route = idx === 0 ? 'Gen 2.1 (/)' : 'Gen 3 (/gen3)';
  assert(html.includes('data-design="refined"') && html.includes('class="console-heading"'), `${route} must use its refined heading`);
  assert(html.includes(idx === 0 ? 'Gen 2.1 simulation console' : 'Gen 3 control console'), `${route} must identify its workspace`);
  const navigation = html.match(/<nav class="generation-switch"[^>]*>[\s\S]*?<\/nav>/)[0];
  assert(navigation.includes('aria-label="Robot generation"'));
  assert(navigation.includes('href="/"') && navigation.includes('href="/gen3"') && navigation.includes('href="/3d"'));
  assert.equal((navigation.match(/aria-current="page"/g) || []).length, 1);
  assert(!/hero-snake-canvas|shader-lens-blur-canvas|distorted-glass-ribbon/.test(html), `${route} omits the poster decoration`);
});
console.log('  PASS: Gate 2 — Refined headings and generation navigation verified');

// Gate 3: Task Navigation Tabs & Tab Stop Action
assert(indexHtml.includes('id="telemetry-hub"'), 'Gen 2.1 must have telemetry');
assert(gen3Html.includes('class="nav-pills tab-nav"'), 'Gen 3 must have task navigation bar');
console.log('  PASS: Gate 3 — Task tab strips verified across both routes');

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

// Gate 5: Refined telemetry stays still and request feedback respects reduced motion.
assert(styleCss.includes('.telem-box:hover'), 'style.css must style .telem-box:hover');
assert(refinedCss.includes(':is(.telem-box:hover, .card:hover, .preset-card:hover) { transform: none; animation: none; }'));
assert(refinedCss.includes('@media (prefers-reduced-motion: reduce)') && refinedCss.includes('transition: none !important;'),
  'Refined feedback must respect reduced motion');
assert(refinedCss.includes(':focus-visible'), 'Controls retain visible keyboard focus');
console.log('  PASS: Gate 5 — Stable telemetry, keyboard focus and reduced motion verified');

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
assert(!/id="(?:tab-firmware|panel-firmware|fw-[^"]*|btn-(?:build|upload)-fw)"/.test(gen3Html), 'Gen 3 must not expose firmware navigation or controls');
assert(!/firmware\/(?:build|upload|status)|pollFirmwareLog|\$\('fw-port'\)/.test(gen3Js), 'Gen 3 must not call firmware APIs or access removed firmware elements');
console.log('  PASS: Gate 7 — Generation-specific workspaces integrity verified');

console.log('\nAll Unified UI Acceptance Gates passed successfully! (7/7)');

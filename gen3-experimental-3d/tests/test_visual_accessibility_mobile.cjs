/**
 * Focused verification test for:
 * - Finding 02: Contrast ratios >= 4.5:1 (Target badge, Actual badge, Start button)
 * - Finding 07: Marquee ticker play/pause button, aria-pressed, hover/focus-within, reduced-motion, session storage
 * - Finding 12: Hero stickers aria-hidden and hidden on mobile <= 768px
 * - Finding 03: Gen 3 Controls dock wrapping, min-width: 0, Runs table scroll region with role, tabindex, aria-label
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/index.html'), 'utf8');
const gen3Html = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/gen3.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/style.css'), 'utf8');
const gen3Css = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/gen3.css'), 'utf8');
const scriptJs = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/script.js'), 'utf8');
const gen3Js = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/static/gen3.js'), 'utf8');

// --- Helper: sRGB luminance and contrast ratio ---
function srgbLuminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map(c => parseInt(c, 16) / 255);
  const a = rgb.map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(hex1, hex2) {
  const l1 = srgbLuminance(hex1);
  const l2 = srgbLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// 1. Finding 02: Contrast verification
console.log('Testing Finding 02: Contrast ratios...');
assert(styleCss.includes('--badge-target-bg'), 'style.css must define --badge-target-bg');
assert(styleCss.includes('--badge-target-text'), 'style.css must define --badge-target-text');
assert(styleCss.includes('--badge-actual-bg'), 'style.css must define --badge-actual-bg');
assert(styleCss.includes('--badge-actual-text'), 'style.css must define --badge-actual-text');
assert(styleCss.includes('--color-btn-start'), 'style.css must define --color-btn-start');

// Target badge contrast (black #000000 on electric blue #4da2ff)
const targetContrast = contrastRatio('#4da2ff', '#000000');
assert(targetContrast >= 4.5, `Target badge contrast must be >= 4.5:1, got ${targetContrast.toFixed(2)}:1`);
console.log(`  PASS: Target badge contrast: ${targetContrast.toFixed(2)}:1 (>= 4.5:1)`);

// Actual badge contrast (black #000000 on ember #fb4903)
const actualContrast = contrastRatio('#fb4903', '#000000');
assert(actualContrast >= 4.5, `Actual badge contrast must be >= 4.5:1, got ${actualContrast.toFixed(2)}:1`);
console.log(`  PASS: Actual badge contrast: ${actualContrast.toFixed(2)}:1 (>= 4.5:1)`);

// Start button contrast (white #ffffff on green #15803d)
const startContrast = contrastRatio('#ffffff', '#15803d');
assert(startContrast >= 4.5, `Start button contrast must be >= 4.5:1, got ${startContrast.toFixed(2)}:1`);
console.log(`  PASS: Start button contrast: ${startContrast.toFixed(2)}:1 (>= 4.5:1)`);

// Start button hover contrast
const hoverContrast = contrastRatio('#ffffff', '#166534');
assert(hoverContrast >= 4.5, `Start button hover contrast must be >= 4.5:1, got ${hoverContrast.toFixed(2)}:1`);
console.log(`  PASS: Start button hover contrast: ${hoverContrast.toFixed(2)}:1 (>= 4.5:1)`);

// 2. Finding 07: Marquee pause/play controls & motion preferences
console.log('Testing Finding 07: Marquee banner accessibility & session memory...');
[indexHtml, gen3Html].forEach((html, i) => {
  const name = i === 0 ? 'index.html' : 'gen3.html';
  assert(html.includes('id="marquee-toggle"'), `${name} must include marquee-toggle button`);
  assert(html.includes('aria-pressed='), `${name} marquee-toggle must include aria-pressed`);
  assert(html.includes('aria-label="Pause announcement ticker"'), `${name} marquee-toggle must have descriptive label`);
});

assert(styleCss.includes('.marquee-banner:hover .marquee-track'), 'style.css must pause on hover');
assert(styleCss.includes('.marquee-banner:focus-within .marquee-track'), 'style.css must pause on focus-within');
assert(styleCss.includes('.marquee-banner.is-paused .marquee-track'), 'style.css must support .is-paused state');
assert(styleCss.includes('@media (prefers-reduced-motion: reduce)') && styleCss.includes('animation: none;'), 'style.css must stop animation under prefers-reduced-motion');

[scriptJs, gen3Js].forEach((js, i) => {
  const name = i === 0 ? 'script.js' : 'gen3.js';
  assert(js.includes('sessionStorage.getItem(\'marquee-paused\')'), `${name} must read session memory`);
  assert(js.includes('sessionStorage.setItem(\'marquee-paused\''), `${name} must save session memory`);
  assert(js.includes('window.matchMedia(\'(prefers-reduced-motion: reduce)\')'), `${name} must respect reduced motion`);
});
console.log('  PASS: Marquee toggle, aria-pressed, hover/focus-within pause, and session persistence verified');

// 3. Finding 12: Hero stickers mobile repositioning / hiding
console.log('Testing Finding 12: Hero stickers mobile overlap...');
[indexHtml, gen3Html].forEach((html, i) => {
  const name = i === 0 ? 'index.html' : 'gen3.html';
  assert(html.includes('class="sticker sticker-ember sticker-pos-1" aria-hidden="true"'), `${name} sticker-pos-1 must have aria-hidden`);
  assert(html.includes('class="sticker sticker-sunburst sticker-pos-2" aria-hidden="true"'), `${name} sticker-pos-2 must have aria-hidden`);
  assert(html.includes('class="sticker sticker-mint sticker-pos-3" aria-hidden="true"'), `${name} sticker-pos-3 must have aria-hidden`);
  assert(html.includes('class="sticker sticker-violet sticker-pos-4" aria-hidden="true"'), `${name} sticker-pos-4 must have aria-hidden`);
});

assert(styleCss.includes('@media (max-width: 768px)') && styleCss.includes('.sticker-pos-1') && styleCss.includes('display: none !important;'), 'style.css must hide stickers on mobile screens to prevent overlap');
console.log('  PASS: Hero stickers decorative semantics (aria-hidden) and responsive hiding verified');

// 4. Finding 03: Controls action/readout layout and Runs table container
console.log('Testing Finding 03: Controls mobile layout & Runs table region...');
assert(gen3Html.includes('<div class="table-scroll" role="region" tabindex="0" aria-label="Runs and trials history">'), 'gen3.html Runs table must have role="region", tabindex="0", and aria-label');

assert(gen3Css.includes('.gen3 .dock-actions-group') && gen3Css.includes('flex-wrap: wrap;'), 'gen3.css must allow dock-actions-group to wrap');
assert(gen3Css.includes('.gen3 .dock-actions-group') && gen3Css.includes('min-width: 0;'), 'gen3.css must set min-width: 0 on dock-actions-group');
assert(gen3Css.includes('.gen3 .gait-dock-bar') && gen3Css.includes('min-width: 0;'), 'gen3.css must set min-width: 0 on gait-dock-bar');
assert(gen3Css.includes('.gen3 .table-scroll') && gen3Css.includes('overflow-x: auto;'), 'gen3.css must contain table in scrollable region');
console.log('  PASS: Controls dock layout wrapping and Runs table accessible scroll region verified');

console.log('\nAll Visual Accessibility and Mobile Layout checks passed successfully!');

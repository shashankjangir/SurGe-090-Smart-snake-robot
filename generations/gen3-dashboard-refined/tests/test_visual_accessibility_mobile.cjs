const {readAsset} = require('./asset-source.cjs');
/**
 * Focused verification test for:
 * - Refined action, Stop and text contrast >= 4.5:1
 * - Static compact headings, visible focus and reduced motion
 * - Finding 03: Gen 3 Controls dock wrapping, min-width: 0, Runs table scroll region with role, tabindex, aria-label
 */
const assert = require('assert');
const path = require('path');

const indexHtml = readAsset(path.join(__dirname, '../../gen3-dashboard-refined/backend/web_dashboard/templates/index.html'), 'utf8');
const gen3Html = readAsset(path.join(__dirname, '../../gen3-dashboard-refined/backend/web_dashboard/templates/gen3.html'), 'utf8');
const gen3Css = readAsset(path.join(__dirname, '../../gen3-dashboard-refined/backend/web_dashboard/static/gen3.css'), 'utf8');
const refinedCss = readAsset(path.join(__dirname, '../backend/web_dashboard/static/refined.css'), 'utf8');
const tokens = readAsset(path.join(__dirname, '../backend/web_dashboard/static/tokens.css'), 'utf8');

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

// Read the actual refined theme values instead of the older poster palette.
const color = name => tokens.match(new RegExp(`--${name}: (#[0-9a-f]{6});`, 'i'))[1];
for (const [foreground, background] of [
  ['color-accent-ink', 'color-accent'], ['color-accent-ink', 'color-accent-hover'],
  ['color-paper-2', 'color-stop'], ['color-ink-2', 'color-paper-2']
]) {
  const ratio = contrastRatio(color(foreground), color(background));
  assert(ratio >= 4.5, `${foreground} on ${background} must meet 4.5:1, got ${ratio.toFixed(2)}:1`);
}
assert(refinedCss.includes('background: var(--color-accent); color: var(--color-accent-ink);'));
assert(refinedCss.includes('background: var(--color-stop); color: var(--color-paper-2);'));
console.log('  PASS: Refined action, hover, Stop and secondary text contrast verified');

// Compact headings replace the old ticker and poster stickers.
[indexHtml, gen3Html].forEach((html, i) => {
  const name = i === 0 ? 'index.html' : 'gen3.html';
  assert(html.includes('class="console-heading"'), `${name} must have a compact heading`);
  assert(html.includes('aria-label="Robot generation"'), `${name} must label its navigation`);
  assert(!/marquee-toggle|marquee-banner|class="sticker /.test(html), `${name} omits the ticker and poster stickers`);
});
assert(refinedCss.includes(':focus-visible') && refinedCss.includes('outline: 3px solid var(--color-selected)'));
assert(refinedCss.includes('@media (prefers-reduced-motion: reduce)') && refinedCss.includes('transition: none !important;'));
assert(refinedCss.includes('@media (max-width: 768px)') && refinedCss.includes('min-height: 44px;'));
console.log('  PASS: Compact headings, keyboard focus, reduced motion and mobile control sizes verified');

// 4. Finding 03: Controls action/readout layout and Runs table container
console.log('Testing Finding 03: Controls mobile layout & Runs table region...');
assert(gen3Html.includes('<div class="table-scroll" role="region" tabindex="0" aria-label="Runs and trials history">'), 'gen3.html Runs table must have role="region", tabindex="0", and aria-label');

assert(gen3Css.includes('.gen3 .dock-actions-group') && gen3Css.includes('flex-wrap: wrap;'), 'gen3.css must allow dock-actions-group to wrap');
assert(gen3Css.includes('.gen3 .dock-actions-group') && gen3Css.includes('min-width: 0;'), 'gen3.css must set min-width: 0 on dock-actions-group');
assert(gen3Css.includes('.gen3 .gait-dock-bar') && gen3Css.includes('min-width: 0;'), 'gen3.css must set min-width: 0 on gait-dock-bar');
assert(gen3Css.includes('.gen3 .table-scroll') && gen3Css.includes('overflow-x: auto;'), 'gen3.css must contain table in scrollable region');
console.log('  PASS: Controls dock layout wrapping and Runs table accessible scroll region verified');

console.log('\nAll Visual Accessibility and Mobile Layout checks passed successfully!');

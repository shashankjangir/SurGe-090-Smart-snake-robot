/**
 * Unit test for Live Gait Motion & Tuning Card layout optimization.
 * Verifies all 22 required interactive and telemetry elements exist
 * and conform to the compact, zero-scroll engineering structure.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../../gen3-experimental-3d/backend/web_dashboard/templates/gen3.html'), 'utf8');

// Required DOM IDs referenced by gen3.js
const REQUIRED_IDS = [
  'live-heading',
  'gait-form',
  'execution',
  'port',
  'refresh-ports',
  'operate-preset',
  'btn-mode-yaw',
  'btn-mode-pitch',
  'btn-mode-combined',
  'yaw',
  'pitch',
  'bias',
  'frequency',
  'direction',
  'lag',
  'offset',
  'speed',
  'speed-deg-equiv',
  'ramp',
  'duration',
  'demand-value',
  'demand-limit-badge',
  'demand-readout',
  'applied-readout',
  'pending-readout',
  'btn-apply',
  'btn-start',
];

for (const id of REQUIRED_IDS) {
  const hasId = html.includes(`id="${id}"`);
  assert(hasId, `gen3.html must contain id="${id}" for gen3.js controller wiring`);
}

// Structural assertions for the compact zero-scroll architecture
assert(html.includes('class="card gait-tuning-card"'), 'Gait tuning card must have class "gait-tuning-card"');
assert(html.includes('class="gait-card-header"'), 'Must have unified compact header "gait-card-header"');
assert(html.includes('class="gait-toolbar"'), 'Must have horizontal setup toolbar "gait-toolbar"');
assert(html.includes('class="gait-params-grid"'), 'Must have dense 5x2 parameters grid "gait-params-grid"');
assert(html.includes('class="gait-dock-bar"'), 'Must have unified bottom telemetry & action dock "gait-dock-bar"');

// Ensure mode-toggles is inside gait-card-header
const headerStart = html.indexOf('<div class="gait-card-header">');
const headerEnd = html.indexOf('<form id="gait-form"', headerStart);
const headerContent = html.substring(headerStart, headerEnd);
assert(headerContent.includes('class="mode-toggles"'), 'mode-toggles must be in gait-card-header for optimal vertical space');

console.log('Gait tuning card: 6 checks passed (all 27 IDs verified, header mode-toggles integration, toolbar, 5x2 param grid, dock bar)');

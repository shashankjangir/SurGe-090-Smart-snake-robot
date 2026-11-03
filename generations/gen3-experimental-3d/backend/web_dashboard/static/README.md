# Dashboard assets

Edit these files directly; no build step or new dependency is required.

| File | Contents |
| --- | --- |
| `generation-transition.js` | Early generation-navigation bootstrap; deliberately not deferred |
| `common.js` | Shared UI components, operator session, browser controller input, motion labels and battery rendering |
| `gen21.js` | Mathematical paths and the Gen 2.1 dashboard |
| `gen3.js` | Gen 3 commissioning, controls, telemetry and console search |
| `gen3-sim.js` | Gen 3 simulation viewer and route editor |
| `vendor/three-r128.min.js`, `vendor/OrbitControls-r128.js` | Bundled third-party 3D libraries |
| `fonts/fonts.css` | Local fonts; keep here so relative font URLs resolve |
| `style.css` | Base dashboard styles |
| `gen3.css` | Gen 3 layout and controls |
| `components.css` | Shared component styles and operator-console overrides |

JavaScript bundles keep `asset` / `endasset` section comments so component tests
can exercise each section independently. Keep those pairs when editing. The same
comments identify component styles in `components.css`. Tests read the sections
through `tests/asset-source.cjs`; whole-bundle parsing and template dependency
order are checked by `tests/test_asset_bundles.cjs`.

Both dashboards load the navigation bootstrap early, then deferred shared and
generation-specific JavaScript. Gen 3 loads Three.js before its simulation
controller. Shared component CSS follows base and Gen 3 CSS; operator-console
overrides remain last. The standalone 3D viewer keeps its two vendor scripts.

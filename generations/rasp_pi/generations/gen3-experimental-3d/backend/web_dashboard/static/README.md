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
comments identify component styles in `components.css`. This distribution omits the repository test harness. Keep these section markers when carrying fixes between the package and its source.

Both dashboards load the navigation bootstrap early, then deferred shared and
generation-specific JavaScript. Gen 3 loads Three.js before its simulation
controller. Shared component CSS follows base and Gen 3 CSS; operator-console
overrides remain last. The standalone 3D viewer keeps its two vendor scripts.

This is the flat bundled frontend for the separate 10-joint [Pi package](../../../../../README.md). Keep it with that package's code and map. The current 12-joint main generation uses separate `pages/`, `components/` and `data/` script directories.

# Dashboard assets

Edit these files directly; no build step or new dependency is required.

| File | Contents |
| --- | --- |
| `common.js` | Shared controls, operator session, browser controller input, motion labels and battery rendering |
| `refined.js` | Request feedback with GSAP and reduced-motion support |
| `gen21.js` | Mathematical paths and the Gen 2.1 dashboard |
| `gen3.js` | Gen 3 commissioning, controls, telemetry and console search |
| `gen3-sim.js` | Gen 3 simulation viewer and route editor |
| `vendor/three-r128.min.js`, `vendor/OrbitControls-r128.js` | Bundled third-party 3D libraries |
| `fonts/fonts.css` | Local fonts; keep here so relative font URLs resolve |
| `tokens.css` | Refined design tokens, imported by `refined.css` |
| `refined.css` | Refined page and control styling |
| `style.css` | Base dashboard styles |
| `gen3.css` | Gen 3 layout and controls |
| `components.css` | Shared component styles and operator-console overrides |

JavaScript bundles keep `asset` / `endasset` section comments so component tests
can exercise each section independently. Keep those pairs when editing. The same
comments identify component styles in `components.css`. Tests read the sections
through `tests/asset-source.cjs`; whole-bundle parsing and template dependency
order are checked by `tests/test_asset_bundles.cjs`.

Both dashboards load deferred shared and generation-specific JavaScript.
The compact refined headings omit the poster shader, liquid grid, pixel heading,
hero fluid and hero snake implementations. The retained shared bundle contains the gamepad, operator login, battery, motion-state and feedback helpers. Gen 3 loads Three.js before its simulation
controller. Shared component CSS follows base and Gen 3 CSS; operator-console
overrides remain last. The standalone 3D viewer keeps its two vendor scripts.

This copy keeps its flat bundled layout. The main generation's `pages/`, `components/` and `data/` script directories belong to its separate frontend. Keep each copy's template paths and matching scripts together.

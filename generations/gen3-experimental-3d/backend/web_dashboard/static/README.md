# Dashboard files

Flask serves Jinja templates, JavaScript, and CSS directly.

| If you need to change… | Start here |
| --- | --- |
| A screen | [`templates/pages/`](../templates/pages/) contains Gen 2.1, Gen 3, the phone controller, and the 3D viewer. `static/pages/` holds their scripts. |
| A shared piece | [`templates/components/`](../templates/components/) contains shared markup. `static/components/` holds shared behavior such as the battery indicator, gamepad controls, and announcement ticker. |
| What the browser loads or saves | `static/data/` holds requests for Gen 3 records and operator sessions, and reads and writes browser preferences. |
| How the server saves a record | [`surge_control/data/`](../../surge_control/data/) holds the file operations for calibration, gait presets, taught poses, and the run journal. `Gen3Control` checks calibration and control rules and holds the lock during a save. |

Keep one job per file. Search for the screen, component, or endpoint before adding code. For example, change how a gait preset is shown in [`pages/gen3-gait-presets.js`](pages/gen3-gait-presets.js). Change its request in [`data/gen3-records.js`](data/gen3-records.js) or its server storage in [`gait_presets.py`](../../surge_control/data/gait_presets.py).

`tokens.css` loads before the base and page styles. `components.css` contains shared component styles and the dashboard overrides. Keep fonts and their stylesheet together so relative URLs resolve.

The two dashboards load `components/generation-transition.js` early. Shared scripts are listed in [`dashboard-scripts.html`](../templates/components/dashboard-scripts.html). Keep the deferred scripts in dependency order, with Three.js before the Gen 3 simulation and both vendor scripts before the standalone viewer. [`test_asset_bundles.cjs`](../../../tests/test_asset_bundles.cjs) checks these paths and script order.

The main generation retains its effect implementations, including the shader's public palette and variation methods. Compact heroes skip their poster canvases. GridBeam pauses while its panel or tab is hidden, outside the viewport, or under reduced motion. The unused customization popover and its storage keys were removed.

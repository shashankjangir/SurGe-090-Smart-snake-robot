# Vendored browser libraries

- three-r128.min.js: Three.js 0.128.0, used by templates/gen3.html and templates/3d_viewer.html; MIT license in THREE-LICENSE.txt.
- OrbitControls-r128.js: `examples/js/controls/OrbitControls.js` from three@0.128.0 (same MIT license), used by templates/3d_viewer.html.

These files came from the version-pinned npm distribution and are served locally to `/gen3` and `/3d`. Keep [THREE-LICENSE.txt](THREE-LICENSE.txt) with them when exporting this package. Its generation transition uses browser animation APIs.

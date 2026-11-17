# Vendored browser libraries

- three-r128.min.js: Three.js 0.128.0, used by templates/gen3.html and templates/3d_viewer.html; MIT license in THREE-LICENSE.txt.
- OrbitControls-r128.js: `examples/js/controls/OrbitControls.js` from three@0.128.0 (same MIT license), used by templates/3d_viewer.html.

- gsap-3.13.0.min.js: GSAP 3.13.0, used by `static/refined.js` for request feedback. Its upstream license header remains in the file.

The files are served locally. Keep [THREE-LICENSE.txt](THREE-LICENSE.txt) and the vendor headers with them when exporting the app. This refined copy uses GSAP for request feedback and omits the main generation's transition overlay.

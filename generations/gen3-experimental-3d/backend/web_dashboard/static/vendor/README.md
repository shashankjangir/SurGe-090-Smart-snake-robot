# Vendored animation runtime

- three-r128.min.js: Three.js 0.128.0, used by templates/gen3.html and templates/3d_viewer.html; MIT license in THREE-LICENSE.txt.
- OrbitControls-r128.js: `examples/js/controls/OrbitControls.js` from three@0.128.0 (same MIT license), used by templates/3d_viewer.html.

Fetched from the version-pinned public npm distribution at cdn.jsdelivr.net/npm/. Served locally to /gen3 and /3d; no CDN is required at runtime.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

GSAP was removed; the generation transition no longer needs it.

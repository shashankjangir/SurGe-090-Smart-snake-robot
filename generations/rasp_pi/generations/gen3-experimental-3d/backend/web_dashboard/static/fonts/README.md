# Self-hosted fonts

Antonio, Bowlby One and Inter, downloaded 2026-10-31 from Google Fonts (`fonts.googleapis.com/css2`, woff2).
All three are licensed under the SIL Open Font License 1.1. `fonts.css` is Google's stylesheet with
URLs rewritten to these local files, so the dashboard needs no internet for its type.

Keep [fonts.css](fonts.css) and the WOFF2 files together when exporting the package. The stylesheet uses relative URLs. The dashboard, phone controller and standalone viewer load the local stylesheet.

# Repository tools

Run these checks from the repository root.

~~~powershell
python tools/verify_layout.py
python tools/verify_docs.py
~~~

[The layout checker](verify_layout.py) validates generation paths, PlatformIO source configuration, historical move-record containment and uniqueness, and required runtime and dashboard asset paths. It accepts the root Gen 3 CAD-only folder. Private settings and caches mentioned in historical move records are allowed to be absent.

[The documentation checker](verify_docs.py) validates portable local Markdown links. In a Git checkout, it uses the tracked and visible unignored file list. In an export, it scans Markdown while excluding local environments, scratch work and generated build folders.

The 17 November publication-only export passed checks for 1,289 move records, 52 asset paths and 164 Markdown files with zero local-link errors. The root Python suite includes regression tests for both checkers.

The [offline CI workflow](../.github/workflows/python-package.yml) runs these checkers and the Python and Node suites with Python 3.11 and Node 22. The recorded local runs used the existing Windows Conda environment. A GitHub-hosted run and fresh dependency installation remain pending.

Generation-specific tools stay beside their code. Use the [repository guide](../docs/REPOSITORY_LAYOUT.md) to find bench, replay and CAD work. Read [the handoff](../docs/GEN3_HANDOFF.md) before selecting a tool that can connect serial hardware or upload firmware.

The [move manifest](../docs/reorganization/moves.csv) records earlier file moves. The saved Graphify output under `artifacts/graphify-out/` predates the current layout, so confirm its paths against the source.

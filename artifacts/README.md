# Generated artifacts

`graphify-out/` preserves the existing knowledge-graph output from before the
repository reorganization. Its source paths are historical; rebuild the graph
before treating it as a current source index. It is not required by the robot
runtime or dashboard.

Report screenshots live with their reports under `docs/reports/assets/`.
Experiment runs remain in `generations/gen3-experimental-3d/runs/` so existing
logging, journal and replay tools continue using their own generation directory.
PlatformIO keeps its tool-managed `.pio/` build directory at the repository root.

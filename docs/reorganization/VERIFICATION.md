# Reorganization verification — 2 November 2026

The folder move is implemented and ready for owner review. No commit or staging
change was made. The running offline replay was allowed to finish before moving
Gen 3; it was not interrupted.

## Preservation

- The [move manifest](moves.csv) contains 1,293 file moves.
- 1,228 moved files retain identical SHA-256 hashes. The remaining 65 moved
  files have backed-up text and path/documentation edits.
- Native CAD, images, firmware sources, model/config JSON and experiment run
  records retain identical bytes. Calibration, operator credentials and the
  transmitter hint passed dedicated before/after hash checks.
- Existing staged changes match the saved pre-task staged diff exactly.
- Private credentials and machine-specific state remain ignored by Git at their
  new locations. No new dependency or duplicate runtime source tree was added.

## Checks

| Check | Result |
| --- | --- |
| Layout verifier | 1,293 destinations and 12 template asset paths pass |
| Python syntax | 86 source files compile without execution |
| Shared Python suite | 60 run; 58 pass, 2 pre-existing historical-archive skips |
| Gen 2 offline suite | 21 pass |
| Gen 3 Python suite | 127 pass; one existing browser-module import error because the surge environment lacks Playwright |
| Current Node suites | All 38 pass |
| Receiver/transmitter firmware | Both PlatformIO builds pass; no upload |
| Flask routes/assets | `/`, `/gen3`, `/3d` and 13 referenced asset URLs return 200 |
| Browser | Both dashboards load; mathematical preview, generation switch, console tabs/search and viewer restrictions work |
| Markdown links | No new broken local links; 15 historical missing references remain |

The merged-asset test reader now accepts CRLF as well as LF section boundaries,
so Windows line endings do not hide components from the existing tests.

## Review limits

No motor motion, serial diagnostics, firmware upload, CAD regeneration, mechanical
fit test or physical locomotion trial was performed. The pre-existing browser
MutationObserver error observed in earlier reviews remains outside this path
migration. The preserved graph snapshot contains historical source paths.

Restart old dashboard processes and update external shortcuts to the new
`generations/` paths. The authoritative launch command is in the root
[README](../../README.md).

Local backups and hashes are under `.scratch/reorganization/`. A rollback
readiness check is available with
`python .scratch/reorganization/rollback.py`; it refuses to overwrite registered
files changed since the review snapshot. Its `--apply` mode is intentionally not
run during verification and requires stopping processes using these folders.

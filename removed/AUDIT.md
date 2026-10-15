# Archive audit — 16 October 2026

- Both Git bundles pass `git bundle verify` and contain complete histories.
- Original source snapshot: **66/66** files match the recorded SHA-256 hashes.
  Restored from `b15efef`, retaining the exact original working-tree line endings.
- Pre-integration selected files: **46/46** match the original hash manifest.
- Gen 1: **348/348** local baseline files match; includes one generated cache file.
  The separate tracked-only baseline covers 347 files. Gen 1 was not edited.
- Additional preserved motor-reference CAD: **40 files**, each byte-identical
  to its original content at project commit `f64e79b`.
- [Archive inventory](archive-inventory.json): **166 files**, with sizes and
  SHA-256 digests; covers snapshots and top-level baseline files. The generated
  inventory and archive guidance are excluded from their own content record.
- Largest individual file: project Git bundle, **44.89 MiB**. The control bundle
  is **11.56 MiB**. Both are included in the GitHub update.
- Raw `control-checkout-git/` metadata is intentionally local-only and ignored;
  its history is backed up by the portable control-software bundle.
- Snapshot line-ending conversion is disabled in `.gitattributes` so future
  checkouts preserve the byte-exact integrity records. Historical cache/lock files
  are retained only within the complete original snapshot.

Only targeted archive checks were run. No full test suite, dependency installation,
firmware build, firmware upload or physical robot operation was performed.
The earlier missing-archive reports describe the state before this restoration.

## Gen 1 overview update

The original Gen 1 README is now preserved under `pre-gen1-docs-2026-10-16/`.
The active overview has been rewritten; all other original Gen 1 files remain
in place. The inventory includes this additional preserved file.

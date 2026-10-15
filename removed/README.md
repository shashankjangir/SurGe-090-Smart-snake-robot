# Preserved project archive

Rechecked 16 October 2026. This folder preserves superseded files, intermediate
integration copies and the original Git history. Use the [active project](../README.md)
for normal operation. Gen 1 is unchanged; Gen 2.0 and Gen 2.1 are working in
project trials; Gen 3.0 is in development.

See the [archive index](INDEX.md), [requirements](REQUIREMENTS.md) and
[integrity record](AUDIT.md).

## Contents

| Folder | Purpose |
|---|---|
| `baselines/` | Two portable Git bundles and original hash manifests |
| `pre-gen2.1/` | Selected pre-integration files, plus 40 preserved motor-reference CAD parts |
| `pre-recheck-2026-10-15/` | Intermediate integration files before the final fixes |
| `gen2.1-source-snapshot/Snake_SURGE/` | Complete 66-file original source snapshot, recovered and hash-verified |

These are historical snapshots, not four independently runnable projects.
Archived bugs, obsolete instructions and setup credentials remain unchanged for
traceability. Use the current configuration for live equipment. Cached Python
bytecode and CAD lock files in the complete snapshot are retained only to match
its original inventory; they are not installation requirements.

## Restore into a separate folder

From the repository root, choose a destination that does not already exist:

```powershell
git bundle verify removed/baselines/project-pre-gen2.1.bundle
git bundle verify removed/baselines/control-software-pre-gen2.1.bundle
git clone --branch main removed/baselines/project-pre-gen2.1.bundle ../surge-project-baseline
git clone --branch main removed/baselines/control-software-pre-gen2.1.bundle ../surge-control-baseline
```

The bundles restore committed history. The complete source snapshot additionally
retains the original working-tree files and line endings. Do not copy an old
snapshot over the active project. Raw checkout metadata remains local and ignored;
the portable bundles are the GitHub backup.

# Project archive

This folder keeps the older designs, software snapshots and Git history behind
the current robot. It lets us trace how an implementation changed without mixing
superseded code into the working setup.

The [project overview](../README.md) tells the development history. For individual
files, see the [archive index](INDEX.md); [requirements](REQUIREMENTS.md) covers
the tools needed to inspect or restore them. Checksums and recovery details are
recorded in the [archive audit](AUDIT.md).

## Contents

| Folder | Purpose |
|---|---|
| `baselines/` | Two portable Git bundles and original hash manifests |
| `pre-gen2.1/` | Selected pre-integration files, plus 40 preserved motor-reference CAD parts |
| `pre-recheck-2026-10-15/` | Intermediate integration files before the final fixes |
| `gen2.1-source-snapshot/Snake_SURGE/` | Complete 66-file original source snapshot, recovered and hash-verified |

The snapshots have different scopes; some contain only selected files rather
than a complete runnable project.
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

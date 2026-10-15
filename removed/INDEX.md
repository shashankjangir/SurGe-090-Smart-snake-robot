# Removed / preserved material index

Rechecked 16 October 2026 after the archive folders were restored locally.
The earlier missing-archive notices are superseded by this inventory.

| Location | Label | Contents / reason |
|---|---|---|
| `baselines/project-pre-gen2.1.bundle` | Baseline | Complete project history at `f64e79b`, including the pre-integration tag |
| `baselines/control-software-pre-gen2.1.bundle` | Baseline | Complete control-software history; main at `b15efef` |
| `baselines/gen1-sha256.json` | Original manifest | 348 original Gen 1 files, including a local cache file |
| `baselines/incoming-sha256.json` | Original manifest | 66 original source-snapshot files |
| `baselines/preserved-active-sha256.json` | Original manifest | 46 selected pre-integration files |
| `baselines/working-tree-pre-finalize-sha256.json` | Historical manifest | Mid-integration working-tree inventory; not the current active tree |
| `pre-gen2.1/` | Superseded | 46 manifest-listed files plus 40 motor-reference CAD parts recovered from project Git history |
| `pre-recheck-2026-10-15/` | Intermediate | Files saved before final integration corrections; original relative paths retained |
| `gen2.1-source-snapshot/Snake_SURGE/` | Original source snapshot | 66 files reconstructed from preserved Git objects and matched to the original SHA-256 manifest |
| `baselines/control-checkout-git/` | Local metadata only | Raw Git metadata; ignored and not uploaded, portable history is in the bundle |

Active replacements are mapped in [integration-map.json](../docs/versions/integration-map.json)
and the [version guide](../docs/versions/VERSIONS.md). Historical paths and names
are retained for traceability. No archived source file was discarded during this audit.

[Restore guide](README.md) · [Requirements](REQUIREMENTS.md) · [Audit](AUDIT.md)

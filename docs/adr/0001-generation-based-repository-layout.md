# Generation-based repository layout

Date: 2 November 2026

Status: accepted for implementation; owner review pending.

## Decision

Keep each robot generation's code, CAD, firmware, media, local configuration and
tests together under `generations/`. Group shared documentation by purpose under
`docs/`, cross-generation checks under `tests/`, repository utilities under
`tools/`, and generated graph output under `artifacts/`.

Keep repository-wide entry files and tool-required configuration at the root.
Keep `docs/GEN3_HANDOFF.md` as the continuation entry point. Preserve Gen 3's
measured map, credentials and run history beside the existing runtime.

## Reason

The robot generations use different actuators, firmware and mechanical
assumptions. Flattening them into one source folder would hide those boundaries
and collide with existing `src` imports. Moving each generation intact gives a
clear root without a package rewrite or duplicate compatibility copies.

## Consequences

Commands run from the repository root gain a `generations/` prefix. Imports and
relative assets inside a generation mostly retain their structure. Shared tests,
firmware build roots, ignore rules and documentation links need migration.
Existing external shortcuts and running dashboard processes must be restarted
with the new path. Historical run manifests and generated graph snapshots keep
their original contents; their recorded paths describe the pre-migration state.

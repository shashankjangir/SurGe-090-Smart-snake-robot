# Repository layout and reorganization review

Implemented 2 November 2026; owner review pending.

```text
SURGE-090/
├── README.md                 Project entry point and supported commands
├── AGENTS.md                 Continuation and working conventions
├── DESIGN.md                 Existing visual design reference
├── platformio.ini            Firmware build entry point
├── generations/
│   ├── gen1-dynamixel/       Original Dynamixel prototype
│   ├── gen2-st3215/          ST3215 robot, firmware, CAD and bench tools
│   └── gen3-experimental-3d/ Current control, dashboard, simulation, CAD and runs
├── docs/                     Documentation grouped by purpose
│   ├── GEN3_HANDOFF.md       Stable continuation entry point
│   ├── operations/          User and deployment guides
│   ├── hardware/            Wiring, parts and power notes
│   ├── architecture/        API, component diagram and generation comparison
│   ├── gen3/                Simulation guide and progress
│   ├── development/         Verification, repairs and checklist
│   ├── research/            Research, calculations and work logs
│   ├── reports/assets/      Review screenshots with their reports
│   ├── presentations/       Presentation sources and outputs
│   ├── ideas/               Proposed work
│   ├── archive/             Historical documents
│   ├── versions/            Earlier preservation records
│   ├── agents/              Agent conventions
│   ├── adr/                 Architecture decisions
│   └── reorganization/      Per-file move manifest
├── tests/                    Cross-generation offline tests
├── tools/                    Repository checks
└── artifacts/graphify-out/   Preserved generated graph snapshot
```

## Decisions

Each generation retains its own internal structure. This avoids mixing actuator
protocols, firmware variants and mechanical assumptions. Gen 3's backend serves
both dashboard generations; it is not a second copy of the Gen 2 bench code.
See [ADR 0001](adr/0001-generation-based-repository-layout.md).

Measured calibration, operator credentials, transmitter hint and run history
remain beside the Gen 3 runtime. Their bytes were preserved during the move.
Existing Python, HTML, CSS and JavaScript boundaries are retained. This task
adds no dependency, package rewrite or duplicate compatibility source tree.

Tool-owned `.git/`, `.pio/`, `.venv/`, `.vs/`, `.vscode/`, `.claude/`,
`.impeccable/` and `.scratch/` remain at their expected locations. Firmware
build configuration stays at the root. CAD and binary files were moved without
editing them. No hardware was actuated or flashed.

## Main path changes

| Previous | Current |
| --- | --- |
| `gen1-dynamixel/` | `generations/gen1-dynamixel/` |
| `gen2-st3215/` | `generations/gen2-st3215/` |
| `gen3-experimental-3d/` | `generations/gen3-experimental-3d/` |
| `report-assets/` | `docs/reports/assets/` |
| `graphify-out/` | `artifacts/graphify-out/` |
| `audit/FIX_CHECKLIST.md` | `docs/development/FIX_CHECKLIST.md` |
| `CHANGES_FROM_BASE_REPO.md` | `docs/reports/CHANGES_FROM_BASE_REPO.md` |
| Loose manuals and research in `docs/` | Purpose-specific documentation folders |

The [CSV move manifest](reorganization/moves.csv) lists every moved file.
The [verification report](reorganization/VERIFICATION.md) records preservation
checks, test results and review limits.
Imports, root-relative test paths, firmware build working directory, PlatformIO
source directory, ignore rules, IDE workspace paths and Markdown links were
updated. Existing staged changes were not reset or restaged.

## Review

Run `python tools/verify_layout.py` from the root. The root
[README](../README.md) lists launch and test commands. Restart any pre-existing
dashboard process or external shortcut using its new path; running processes
can retain old imported paths until restarted.

The graph in `artifacts/` is a historical generated snapshot and must be rebuilt
before using its source paths as a current code index. Recorded run manifests
also keep their historical paths and values rather than being rewritten.

Local pre-move status, staged/unstaged diffs, file hashes and changed-text backups
are under `.scratch/reorganization/`. These preserve the starting working tree,
including changes that existed before this task. No commit has been made.

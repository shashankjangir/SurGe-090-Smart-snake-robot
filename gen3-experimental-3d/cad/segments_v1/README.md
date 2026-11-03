# Gen 3 segments v1: parametric prototype

**PROTOTYPE: fit and load validation required.** This is Phase 1 of
`docs/research/GEN3_WAVESHARE_HARDWARE_RESEARCH.md`. Start with `reports/checklist.md`.

Run everything from the repository root with the CAD interpreter:

```bash
C:/Users/gannu/.venv-cad/Scripts/python.exe gen3-experimental-3d/cad/segments_v1/export.py
```

```bash
C:/Users/gannu/.venv-cad/Scripts/python.exe gen3-experimental-3d/cad/segments_v1/checks/solids.py
```

```bash
C:/Users/gannu/.venv-cad/Scripts/python.exe gen3-experimental-3d/cad/segments_v1/checks/sweep.py
```

```bash
C:/Users/gannu/.venv-cad/Scripts/python.exe gen3-experimental-3d/cad/segments_v1/checks/mass.py
```

```bash
C:/Users/gannu/.venv-cad/Scripts/python.exe gen3-experimental-3d/cad/segments_v1/checks/cables.py
```

```bash
C:/Users/gannu/.venv-cad/Scripts/python.exe gen3-experimental-3d/cad/segments_v1/checks/symmetry.py
```

`sweep.py --quick` runs a 10° grid in about 6 minutes. The full 5°/1° run takes longer than the 10-minute tool limit, so start it as a detached process.

## Files

| File | Contents |
|---|---|
| `params.py` | Every value used in the geometry, by parameter name, tagged VENDOR, STEP, PROV, ASSUMED, DERIVED or MAP, with "BLOCKS RELEASE" where it applies |
| `servo_ref.py` | Official ST3215 STEP placed in the servo frame. Raises if the drawing checks fail. Computes the crossbar radius |
| `board_ref.py` | Official driver-board STEP placed in the tail, provisional plug envelopes and the antenna keep-out |
| `features.py` | Shared round shell, cradle, clevis and cable grooves |
| `head.py` `mid.py` `tail.py` | One function per part, each returning one solid |
| `assembly.py` | B0–B10 transforms for any joint angles, using the joint_map signs, and the neutral STEP |
| `export.py` | Writes `out/` |
| `checks/` | `solids.py`, `symmetry.py`, `sweep.py`, `mass.py`, `cables.py` |
| `reports/` | Markdown reports, plus the CSV and JSON the checks write |

`out/_cache/` holds regenerated meshes; delete it after changing the geometry. The official STEP files
are read from `.scratch/waveshare-research/`, which exists only in this checkout.

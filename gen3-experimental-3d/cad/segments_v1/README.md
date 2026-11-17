# Gen 3 segments v1: parametric prototype

**PROTOTYPE: fit and load validation required.** This is Phase 1 of
[hardware research](../../../docs/research/GEN3_WAVESHARE_HARDWARE_RESEARCH.md). Start with the [saved checklist](reports/checklist.md).

This generator still describes the original ten-joint prototype, while the maintained robot map contains twelve joints. It uses the first ten joint signs. Fit and clearance for the expanded robot require a new assembly review.

Use a Python environment with build123d, trimesh, and numpy installed. From the repository root, run:

```bash
python gen3-experimental-3d/cad/segments_v1/export.py
```

## Files

| File | Contents |
|---|---|
| `params.py` | Every value used in the geometry, by parameter name, tagged VENDOR, STEP, PROV, ASSUMED, DERIVED or MAP, with "BLOCKS RELEASE" where it applies |
| `servo_ref.py` | Official ST3215 STEP placed in the servo frame. Raises if the drawing checks fail. Computes the crossbar radius |
| `board_ref.py` | Official driver-board STEP and connector datums placed in the tail |
| `features.py` | Shared round shell, cradle, clevis and cable grooves |
| `head.py` `mid.py` `tail.py` | One function per part, each returning one solid |
| `assembly.py` | B0–B10 transforms for any joint angles, using the joint_map signs, and the neutral STEP |
| `export.py` | Writes `out/` |
| `reports/` | Saved prototype reports, CSV and JSON |

`out/_cache/` holds regenerated meshes; delete it after changing the geometry. The official STEP files
are read from `generations/gen3-experimental-3d/cad/`: `ST3215.step` and
`Servo Driver with ESP32.step`. Include both files when exporting the generator.
The joint signs come from `generations/gen3-experimental-3d/joint_map.json`.

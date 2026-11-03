# Cross-generation tests

This folder checks shared control behavior, request validation and preservation
contracts across robot generations. These tests use doubles and Flask clients;
they do not connect to a serial port or upload firmware.

From the repository root:

```powershell
conda run --no-capture-output -n surge python -B -m unittest discover -s tests
```

Gen 2's offline protocol tests remain in
`generations/gen2-st3215/tests/test_offline.py`. Gen 3's Python and JavaScript
checks remain in `generations/gen3-experimental-3d/tests/`. Historical physical
motor tests are intentionally separate from the offline commands.

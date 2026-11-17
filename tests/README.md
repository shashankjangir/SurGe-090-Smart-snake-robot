# Cross-generation tests

These checks cover shared control behavior, request validation and compatibility across robot generations. They use doubles, Flask clients and optional headless simulation.

From the repository root, run the shared suite.

~~~powershell
conda run --no-capture-output -n surge python -B -m unittest discover -s tests
~~~

| Checks | Location |
| --- | --- |
| Gen 2 protocol and driver tests | [Gen 2 tests](../generations/gen2-st3215/tests/README.md) |
| Maintained Gen 3 Python and Node tests | [Gen 3 tests](../generations/gen3-experimental-3d/tests/) |
| Refined copy | [Refined dashboard](../generations/gen3-dashboard-refined/README.md) |

The [repository guide](../docs/REPOSITORY_LAYOUT.md) lists commands for each suite. Browser scripts may need Playwright and an installed browser. Keep live serial tests and firmware upload procedures separate from offline verification.

On 17 November 2026, the publication-only export passed 66 root Python tests with two skips, 179 maintained Gen 3 tests, 175 refined tests and 21 Gen 2 offline tests. All 43 maintained and 41 refined Node scripts passed. The [current status](../docs/CURRENT_STATUS.md) records the environment and remaining physical checks.

The root suite includes regression checks for [local Markdown links](../tools/verify_docs.py) and [repository layout](../tools/verify_layout.py). The [offline CI workflow](../.github/workflows/python-package.yml) selects Python 3.11 and Node 22. Its first GitHub run remains pending.

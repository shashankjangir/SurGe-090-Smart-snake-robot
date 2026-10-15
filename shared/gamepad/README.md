# Gamepad control

The gamepad sends manual input to the running Gen 2.1 web dashboard. It works
with either the simulation or the hardware engine selected there.

Connect the engine in the dashboard, then run from the repository root:

```powershell
.venv/Scripts/python.exe shared/gamepad/controller_node.py
```

Dependencies are included in [shared/requirements.txt](../requirements.txt).
The controller needs at least two axes and four buttons.

| Control | Action |
|---|---|
| Left stick | Steering and motion scaling |
| A | Start |
| B | Stop |
| X | Reverse |
| Y | Change amplitude preset |

Button labels assume a conventional A/B/X/Y mapping. Use `--url` to connect to
a dashboard on another host. The client requests STOP on exit; the runtime and
receiver also have timeouts for interrupted control input.

See the [dashboard guide](../web-dashboard/README.md) for the host setup.

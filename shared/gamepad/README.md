# Gen 2.1 gamepad

Gen 2.1 is working in project trials, confirmed on 16 October 2026. See the
[Gen 2 prototype photos](../../gen2-st3215/media/README.md) and
[version map](../../docs/versions/VERSIONS.md). Gen 3.0 is in development.

Install `requirements.txt`, launch the web dashboard, connect its engine, then run
`python shared/gamepad/controller_node.py` from the repository root.
Two stick axes and four buttons are required. A starts, B stops, X reverses,
Y changes amplitude. The left stick sets steering and motion scaling.
Use `--url` to address a different dashboard host. No controller is opened on import.
The application requests STOP on exit; runtime/receiver timeouts cover a lost stream.

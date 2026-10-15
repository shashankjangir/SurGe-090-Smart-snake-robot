# Gen 2.1 gamepad

Install `requirements.txt`, launch the web dashboard, connect its engine, then run
`python shared/gamepad/controller_node.py` from the repository root.
Two stick axes and four buttons are required. A starts, B stops, X reverses,
Y changes amplitude. The left stick sets steering and motion scaling.
Use `--url` to address a different dashboard host. No controller is opened on import.
The application requests STOP on exit; runtime/receiver timeouts cover a lost stream.

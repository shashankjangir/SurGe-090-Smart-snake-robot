# Repository tools

Run `python tools/verify_layout.py` from any working directory using the script's
absolute path, or from the repository root with the relative command shown here.
It checks generation boundaries, firmware source configuration, the move manifest
and dashboard asset references. It does not import the robot runtime or connect
to hardware, and needs only the Python standard library.

Generation-specific bench, CAD export and replay tools remain under their own
`generations/<generation>/tools/` folders. See their generation README before
running tools that can access a serial port or modify CAD.

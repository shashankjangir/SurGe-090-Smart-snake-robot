> **Project status — 16 October 2026:** Gen 3.0 is in active development. Gen 2.0 and Gen 2.1 are working in project trials.

# Gen 3.0 — Experimental 3D motion

This is a separate experiment, not the planar Gen 2 build. It retains the
alternating connector, plate-chain, electronics-holder and segment CAD candidates
under `cad/`, together with the alternating yaw/pitch waveform.

`test_3d_snake.py` defaults to a **dry run**:

```sh
python gen3-experimental-3d/test_3d_snake.py
```

The waveform has 900-count yaw / 700-count pitch amplitudes, 0.6 Hz temporal
frequency, pi/2 segment phase, and alternating mounting signs. The transport
clamps targets to ±70 degrees. These are experimental parameters, not verified
clearances or demonstrated locomotion performance.

Physical execution requires `--hardware --port <port>` and an appropriately
assembled alternating yaw/pitch chain. It uses the Gen 2.1 target transport,
not the all-yaw controller or simulator. Check joint mapping and physical
clearances before any trial; there is no matching validated 3D simulation yet.
Alignment checks encoders; cleanup requests torque-off instead of commanding an
unverified recentering movement. CAD files have been retained but not modified
or geometrically verified during this integration.

## Current reference build

The working Gen 2.0 / Gen 2.1 planar prototype is shown in the
[Gen 2 gallery](../gen2-st3215/media/README.md), updated with cropped photos on
16 October 2026. Those images document Gen 2; they do not depict a completed
Gen 3.0 build. See the [project overview](../README.md) for the generation map.

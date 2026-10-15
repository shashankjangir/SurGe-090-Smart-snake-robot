# Gen 3.0 — 3D motion experiments

This is our current development work. Gen 2.0 and Gen 2.1 provide a working
planar robot; Gen 3 explores what changes when the chain alternates yaw and
pitch joints.

The mechanical work includes an alternating connector, plate-chain components,
electronics holders and segment candidates in `cad/`. The motion script explores
the corresponding alternating-joint waveform. Clearances, mounting signs and
body support need to be considered together before applying it to an assembled chain.

## Motion experiment

`test_3d_snake.py` prints a dry run by default:

```powershell
python gen3-experimental-3d/test_3d_snake.py
```

The current waveform uses 900-count yaw and 700-count pitch amplitudes, a 0.6 Hz
frequency and a pi/2 phase shift between segments. Mounting signs alternate;
the transport clamps targets to approximately ±70 degrees. These are experiment
settings, not a measured operating envelope.

Hardware execution requires `--hardware --port <port>` and the correct joint
mapping. The script uses the Gen 2.1 target transport, checks alignment through
encoder feedback and requests torque-off when it exits.

## What remains open

The CAD candidates and waveform are the starting point. The joint arrangement,
physical clearances and resulting locomotion still need to be established as a
complete Gen 3 build. The existing PyBullet model is planar and does not model
this mechanism.

The [Gen 2 photos](../gen2-st3215/media/README.md) show the current reference robot.
The [project README](../README.md) explains the progression from the original
Dynamixel prototype to this stage.

# Gen 2 and Gen 2.1 ST3215 robot

This is my planar ST3215 generation. I keep its CAD, bus tools and firmware together. The ten joints bend in yaw; the alternating-axis experiment is [Gen 3](../gen3-experimental-3d/README.md).

There are two control arrangements. Gen 2.0 uses the direct-bus bench stack or an onboard gait firmware. Gen 2.1 computes targets on the host and applies them through receiver_gen2_1, optionally using transmitter_gen2_1 over ESP-NOW. These use different protocols.

For the maintained host system, start with [software setup](../../docs/START_HERE.md), [hardware](../../docs/hardware/README.md) and [operation](../../docs/operations/1_APP_USAGE_MANUAL.md). Both dashboard pages run from the backend under Gen 3.

The planar bench command is:

```powershell
python generations/gen2-st3215/tools/bench_gen2_1.py align --port COM7
```

Replace align with sine or spiral for a finite waveform trial. These commands move real motors. They retain measured alignment and torque-off cleanup. They are not the Gen 3 gait runner.

The [firmware guide](firmware/README.md) lists targets and fault handling. The [test notes](tests/README.md) describe offline and native C++ checks. CAD development remains under [cad](cad/). The [former overview](../../docs/archive/2026-11-03/generations/gen2-st3215/README.md) retains historical setup details.

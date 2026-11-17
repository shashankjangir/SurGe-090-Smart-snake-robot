# Gen 3 alternating pitch/yaw robot

This is the current 3D motion experiment in my snake robot project. It uses twelve ST3215 servos since the [12-motor upgrade](../../docs/hardware/12_MOTOR_UPGRADE.md) (IDs 11 and 12, 7 November 2026), with odd IDs in pitch and even IDs in yaw. The [project story](../../docs/PROJECT.md) explains how we reached this arrangement.

I read [the handoff](../../docs/GEN3_HANDOFF.md) and [joint_map.json](joint_map.json) before hardware work. The current map saves speed 2144, tracking error 492 and timeout 0.5 seconds. All zeros are 2048. Pitch ID 1 and all yaw signs are +1. Pitch IDs 3/5/7/9/11 are -1. IDs 11 and 12 were marked calibrated on 10 November 2026, so the map is saved calibrated. Joint travel is 796–3300 counts (±110°). Shared gait amplitudes use a separate 90° cap.

## Start

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

Open [Gen 3](http://127.0.0.1:5000/gen3). Use Simulation for PyBullet. Hardware has an initially checked Dry run option for mathematical preview. Stop before switching workspaces.

The [setup guide](../../docs/START_HERE.md), [operating guide](../../docs/operations/1_APP_USAGE_MANUAL.md), [simulation guide](../../docs/gen3/GEN3_SIMULATION.md) and [controller guide](../../docs/operations/CONTROLLER_UPGRADES.md) cover the actual steps.

## What belongs here

- gait.py and test_3d_snake.py calculate and run finite mapped motion.
- backend/ contains the shared dashboard and control package. The [dashboard file guide](backend/web_dashboard/static/README.md) describes screens, shared pieces and saved-data code.
- simulation.py and the simulation assets support PyBullet.
- cad/ contains prototype parts and assemblies.
- runs/ contains recorded trials and calibration/run snapshots.
- tools/ contains CAD export and replay utilities.
- tests/ contains offline, browser and simulation checks.

The last confirmed transmitter USB port is COM8. COM6 was identified as the receiver on 3 November 2026. Verify the current ports before connecting. The battery is external, the last report says no fuses are installed, and the large-amplitude trial needs a logged recheck after a reported wiring repair.

The [status record](../../docs/CURRENT_STATUS.md) separates small physical trials from software validation. Simulated travel is not measured physical travel. Our [older overview](../../docs/archive/2026-11-03/generations/gen3-experimental-3d/README.md) is archived with its original examples.

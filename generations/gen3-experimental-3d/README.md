# Gen 3 alternating pitch/yaw robot

This is the current 3D motion experiment in my snake robot project. It uses ten ST3215 servos, with odd IDs in pitch and even IDs in yaw. The [project story](../../docs/PROJECT.md) explains how we reached this arrangement.

I read [the handoff](../../docs/GEN3_HANDOFF.md) and [joint_map.json](joint_map.json) before hardware work. The current map saves speed 1500, tracking error 216 and timeout 0.5 seconds. All zeros are 2048. Pitch ID 1 and all yaw signs are +1; pitch IDs 3/5/7/9 are -1.

## Start

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

Open http://127.0.0.1:5000/gen3. Use Simulation for PyBullet. Hardware has an initially checked Dry run option for mathematical preview. Stop before switching workspaces. There is no execution-mode dropdown in the current workflow.

The [setup guide](../../docs/START_HERE.md), [operating guide](../../docs/operations/1_APP_USAGE_MANUAL.md), [simulation guide](../../docs/gen3/GEN3_SIMULATION.md) and [controller guide](../../docs/operations/CONTROLLER_UPGRADES.md) cover the actual steps.

## What belongs here

- gait.py and test_3d_snake.py calculate and run finite mapped motion.
- backend/ contains the shared dashboard and control package.
- simulation.py and the simulation assets support PyBullet.
- cad/ contains prototype parts and assemblies.
- runs/ contains recorded trials and calibration/run snapshots.
- tools/ contains CAD export and replay utilities.
- tests/ contains offline, browser and simulation checks.

The last confirmed wireless host port is COM7. COM6 was identified as the receiver. The battery is external, the last report says no fuses are installed, and the large-amplitude trial needs a logged recheck after a reported wiring repair.

The [status record](../../docs/CURRENT_STATUS.md) separates small physical trials from software validation. Simulated travel is not measured physical travel. Our [older overview](../../docs/archive/2026-11-03/generations/gen3-experimental-3d/README.md) is archived with its original examples.

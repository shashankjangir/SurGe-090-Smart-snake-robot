# What we have done and what remains

This is my working summary on 3 November 2026. I separate reported physical trials, software checks and planned work because they answer different questions.

## Development record

| Period | Work recorded |
| --- | --- |
| Earlier prototypes | Dynamixel XL330 work, then planar ST3215 segments and servo-bus control. |
| September 2026 | Power-distribution proposals progressed through centre-fed, split v2 and split v3 layouts. Their fuse drawings do not prove installation. |
| 26 October | Individual centering and pitch-only trials at 2, 5 and 10 degrees were recorded. A 10-degree run used an eight-second ramp. |
| 31 October | Gen 2.1 dashboard layout, continuous simulated route traversal and console changes were recorded in commit fc24e4e. |
| 31 October, radio work | Plain-text transport was adapted from Snake_SURGE commit 7d80490344b03c3298418b8cce878349a96ad4d6. USB identity and HELLO exchanges were verified with servo power disconnected, including after a transmitter reset. |
| Later high-amplitude trial | At yaw 30 degrees, pitch 25 degrees, 0.5 Hz and speed 1500, a write fault and missing IDs 7/8 were reported. Wiring was subsequently reported repaired. A logged recheck remains open. |
| 1â€“2 November | Telemetry/tracking work, pose tools, gait overrides, presets, CAD-derived simulation and folder/asset consolidation. |
| 3 November | Controller upgrades, independent Simulation/Hardware workspaces, OTA maintenance implementation and bench launcher consolidation. |
| 3 November, simulation | Controller remapping removed, simulation limits fixed at the server maximums, simulation layout compacted, simulation default gait raised to 40°/25°/0.5 Hz, and researched gait presets added for simulation (12) and hardware (6 new). Software and PyBullet only. |
| 3 November, documentation | Thirty-one earlier project guides were archived and the current explanation was rewritten. |

This table is a work record, not a claim that all rows were committed or physically validated. The previous handoff is preserved in [the dated archive](archive/2026-11-03/docs/GEN3_HANDOFF.md).

## Current settings

The measured configuration remains in [joint_map.json](../generations/gen3-experimental-3d/joint_map.json). It saves speed 1500, tracking error 216 and timeout 0.5 seconds. All neutral values are 2048, with bounds 1252â€“2844. Odd joints are pitch and even joints are yaw. Pitch ID 1 has sign +1; pitch IDs 3/5/7/9 have sign -1; all yaw joints have sign +1.

COM6 was last identified as receiver and COM7 as transmitter. The normal dashboard wireless connection uses COM7. The robot battery is external on long wires, and the last report says no fuses are installed.

## Verification already recorded

The OTA work built the maintained receiver/transmitter and both retained PlatformIO aliases. Four native C++ programs passed receiver, transmitter, credential and legacy checks. Its targeted Python checks passed, with four environment-related skips in the Gen 2.1 suite.

After the bench merge, that suite ran 47 tests: 43 passed and four skipped. The launcher help also worked from another directory. These counts belong to those runs; they are not a fresh whole-project certificate.

Earlier controller and workspace records include browser checks and actual simulated motion, alongside tests using mocked input or intercepted hardware requests. The archived handoff retains the details. A mock hardware connection is not a physical connection.

## What still needs physical work

- Re-query all ten motors after the wiring repair and keep the diagnostics.
- Record minimum supply voltage during a supervised trial.
- Repeat small finite trials before retrying the failed high-amplitude case.
- Measure travel on the ground rather than inferring it from servo movement.
- Verify printed fit, load capacity, cable routing and the actual power-protection installation.
- Install and test the new OTA firmware, including authentication, retry and reboot.
- Measure radio delivery and stop behaviour on the assembled system.
- Install and calibrate a real localization source before physical route-following claims.

Simulation mass, inertia and friction are still illustrative. Route completion in PyBullet does not establish real-world navigation accuracy.

## What I want next

My next milestone is a repeatable trial record: the assembly and map used, waveform and speed, voltage, feedback faults, surface, duration and measured travel. The [travel-trial worksheet](../generations/gen3-experimental-3d/TRAVEL_TRIALS.md) is where those physical observations belong.

The repository also contains research and ideas for later work. I keep them visible without treating them as implemented features. Before a GitHub update, I review the working tree and rerun the relevant checks in [the folder guide](REPOSITORY_LAYOUT.md).

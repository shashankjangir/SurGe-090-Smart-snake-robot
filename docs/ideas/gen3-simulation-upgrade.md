# Gen 3 simulation upgrade

This page preserves a dated research, planning, or verification record. Its trial values and results describe that session. Use the [current handoff](../GEN3_HANDOFF.md) and [setup guide](../START_HERE.md) for the maintained application.

Proposal, 7 November 2026. Nothing is installed or migrated yet. Physical observations, simulation
results and proposals are kept separate below.

## Problem

The physical robot tips onto its side during caterpillar crawling (owner report; onset versus
amplitude and speed not measured). The current PyBullet model cannot tell us why, because its mass,
contact, friction and actuator values are illustrative. The later goals (sensor-based balance,
obstacle avoidance, SLAM, waypoint navigation, learned gaits, many floor types) all need a model we
trust first.

## Direction

1. **Keep PyBullet as the baseline.** It already drives the dashboard Simulation workspace.
2. **Build a separate MuJoCo model on the laptop** (Core Ultra 7 256V, Arc 140V, 16 GB; not
   benchmarked) in its own window, for articulated dynamics, contact and balance.
3. **Add Gazebo + ROS 2** only when testing the real SLAM/Nav2 pipeline becomes the priority.
4. **Defer Isaac Sim / Isaac Lab.** Published requirements exceed this laptop; revisit if a Jetson
   or a workstation becomes available.
5. **Validate against the robot** in every engine: record real runs and replay them.

## First model scope

- 12 alternating pitch/yaw joints, 13 bodies, signs and zeros from `joint_map.json`.
- **Joint limits from the parts, not only software:** the current V2 parts collide at about ±92°
  (CAD mesh sweep). Model ±92° until the ±120° redesign is printed and checked.
- Adjustable per-body mass and centre of mass, belly pads/shoes and their friction.
- Bounded servo response: torque, speed, delay and deadband, fitted to logged runs.
- Contact and force visualisation; per-segment support shown over time.
- Simulated accelerometer/gyro on selected or every body, with noise, delay and finite rate;
  compare one, three (head/middle/tail) and distributed IMUs.
- Controllers read simulated sensor values, never perfect simulator state.
- Repeatable metrics: roll, travel, slip, tracking error, joint-contact events.

## Order of work

1. Reproduce the real tipping. Test both candidate causes: rolling on the rounded shell, and
   joints pressing past their collision angle.
2. Test passive fixes: belly pads, ballast, smaller pitch amplitude.
3. Tilt/contact logging and a tested stop response.
4. Measure how small shape changes affect tilt; only then add bounded automatic corrections.
5. Ranging and SLAM integration (crawl, stop, settle, scan first).
6. Automated gait-parameter search; reinforcement learning as a later experiment.

## Done when (first stage)

The MuJoCo model reproduces the observed tipping on recorded settings, and a change that fixes it in
simulation also reduces it on the robot.

## Not decided / not checked

- MuJoCo version and performance on this laptop.
- Real part masses, centres of mass and floor friction (needs weighing and trials).
- Which sensors are fitted; see [the sensor plan](gen3-sensor-plan.md).
- Provenance of the map's speed 2144 / tracking error 492 versus 1500 / 216 in older docs.

Background: [sensing and autonomy research](../research/snake-autonomy-sensing.md) (written for 10
joints), [12-motor upgrade](../hardware/12_MOTOR_UPGRADE.md),
[workspace ADR](../adr/0002-simulation-hardware-workspaces.md).

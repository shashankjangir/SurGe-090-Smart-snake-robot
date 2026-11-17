# Sensing and autonomy for the Gen 3 snake

This page preserves a dated research, planning, or verification record. Its trial values and results describe that session. Use the [current handoff](../GEN3_HANDOFF.md) and [setup guide](../START_HERE.md) for the maintained application.

Researched 7 November 2026 from primary sources. Recommendations below are engineering
inferences for this robot, not validated hardware settings. No hardware commands or settings
changes were made. Read with [the current handoff](../GEN3_HANDOFF.md) and
[joint map](../../generations/gen3-experimental-3d/joint_map.json).

The maintained map contains twelve alternating pitch/yaw joints. Pitch ID 1 has sign +1,
pitch IDs 3/5/7/9/11 have sign -1, and all yaw signs are +1. Neutral is 2048 and bounds are
796–3300. Saved speed is 2144, tracking error is 492, and timeout is 0.5 s. The latest receiver
source allows ±110° travel but its installation is unverified. Shared gait amplitudes and bias
use a separate 90° cap.

## 1. Establish stable locomotion before autonomous navigation

SLAM estimates pose and a map; it does not provide a stabilizing contact force or prevent
a snake from tipping. An IMU can reveal roll, but sensing alone cannot create missing support.
The owner's report of a caterpillar gait rolling onto its side therefore needs mechanical
and contact diagnosis before a navigation stack.

Fu and Li's alternating pitch/yaw robot lost roll stability when lifted body sections
reduced support. Lateral body spread widened support; passive compliance improved contact
and reduced rolling. Their robot had 19 joints and one-way wheels, so its numerical gait
settings are not transferable to this twelve-joint robot. This supports examining contact
geometry, not a claim that one sensor or published gait will fix this assembly.
([Fu & Li, 2020, original research](https://pmc.ncbi.nlm.nih.gov/articles/PMC7062058/)).

**Proposed first experiment:** film front and side views during a supervised, conservative
existing gait and synchronize actual joint feedback. Distinguish whole-body roll from
heading drift; identify which segments lose contact first. Check whether yaw joints
actually remain neutral, whether the rounded shells rock laterally, and whether the
external battery cable pulls the body. Check mass distribution and physical clearances.
Test lower lift and a repeatable support surface before changing software architecture.
If rounded contact is the cause, compare removable wider belly shoes or compliant contact
pads; measure whether they impede sliding or steering. These are diagnostic hypotheses,
not confirmed causes or CAD prescriptions.

Sidewinding intentionally coordinates horizontal and vertical waves to form moving ground
contacts. It is a separate gait candidate, not simply a pitch-only caterpillar with more
amplitude. Research demonstrates contact-length control on sandy slopes, not universal
stability on every floor. ([CMU sidewinding explanation](https://www.ri.cmu.edu/project/sidewinding/),
[Marvi et al., 2014](https://arxiv.org/abs/1410.2945)).

## 2. What each sensor would contribute

| Measurement | Useful role | Limit / first implementation |
|---|---|---|
| One rigidly mounted accelerometer + gyroscope | Module tilt, angular rate, onset of roll; logging and a tested stop condition | Start on a representative body module. One module is not the orientation of every segment. Joint feedback plus kinematics is needed to relate frames. |
| Contact switches or force-sensitive pads at selected belly/side locations | Show when intended support lifts and which side touches down | Start with a few diagnostic locations; calibrate on the actual shell and surface. Contact/no contact does not directly give friction or slip. |
| Existing servo position feedback | Actual articulated shape, tracking and sensor transforms | Joint angle is not ground distance. Sliding makes commanded gait phase an unreliable odometer. |
| External visual tracking during development | Independent travel, heading, slip and roll evidence | Useful ground truth before choosing onboard odometry; it need not become the final product. |

An accelerometer senses gravity-related specific force **and dynamic acceleration**.
Gravity-based tilt is reliable under quasi-static conditions; sustained translation,
centripetal acceleration and vibration can corrupt it. Filtering also adds delay.
([Analog Devices AN-1057](https://www.analog.com/en/resources/app-notes/an-1057.html)).
Fuse gyroscope rate with accelerometer information instead of interpreting every acceleration
sample as tilt. Gyro integration drifts; gravity does not fix yaw about vertical. A
magnetometer may add heading but must be evaluated near motors, wires and indoor metal.
([Analog Devices, gyro drift and magnetic reference](https://www.analog.com/en/resources/analog-dialogue/raqs/raq-issue-139.html)).
An IMU alone is not a dependable long-term XY position source; do not promise navigation
from double-integrated consumer acceleration. This is an engineering inference from those
measurement and drift limits.

Distributed contact sensing has direct snake-robot precedent: SenSnake used compliant
shells and piezoresistive sheets to measure terrain contact. That demonstrates feasibility,
not a need to copy its entire sensor count or a guarantee of calibrated force from cheap
pads. ([Ramesh, Fu & Li, SenSnake](https://arxiv.org/abs/2112.09078)).

## 3. A tilting snake is a difficult platform for 2D LiDAR SLAM

ROS `LaserScan` describes a **planar** range scan, timestamped at its first ray, with a
per-ray time increment. ([Official message source](https://raw.githubusercontent.com/ros2/common_interfaces/rolling/sensor_msgs/msg/LaserScan.msg)).
**Geometric inference:** pitching/rolling the sensor changes the observed slice through the
world: some rays hit floor, ceiling or different heights. Merely rotating coordinates with
an IMU cannot recover walls the tilted sensor never sampled. Motion during one scan also
distorts it unless the acquisition and processing account for that motion.

For a first flat-floor mapping trial, use a mount/gait combination that keeps the scanner
approximately level and minimally moving, or stop and settle for each scan. Verify mounting
mass does not worsen rolling. Do not assume that a head module stays level. Stop-and-scan
still needs pose/odometry between scan locations. Persistent substantial tilt or genuine
3D terrain points toward 3D perception/SLAM with appropriate motion compensation, after
compute, payload and task constraints are known.

`slam_toolbox` accepts `/scan`, requires an odometry-frame-to-base-frame TF, and publishes
map information and `map → odom`. It gets odometry through TF; publishing an `/odom` topic
alone does not satisfy that input. ([Maintainer API and parameters](https://github.com/SteveMacenski/slam_toolbox)).

## 4. ROS 2 / Nav2 integration, when locomotion is ready

Use a defined navigation reference and a timestamped chain such as
`map → odom → base_link → articulated modules → laser_link / imu_link`.
`map → odom` comes from localization/SLAM; `odom → base_link` from the local estimator;
module transforms come from actual joint feedback and calibrated geometry. Only mounts
rigid to one module have static module-to-sensor transforms. Do not replace the moving
base-to-head transform with a static one.
([Nav2 transform contract](https://docs.nav2.org/rolling/configuration_and_development/first_time_robot_setup_guide/transformation/setup_transforms/)).

Choose and validate odometry from external tracking first, then an appropriate visual or
LiDAR odometry source plus IMU as constraints allow. Encoders describe internal shape, not
world displacement. `robot_localization` can fuse measured variables, but requires correct
frames, signs and realistic covariance; it cannot invent unobserved translation.
([Maintainer sensor preparation](https://github.com/cra-ros-pkg/robot_localization/blob/rolling-devel/doc/preparing_sensor_data.rst)).

Nav2 velocity requests need a **snake locomotion adapter** mapping feasible forward speed
and turning rate to tested gait parameters, preserving watchdogs, freshness, operator stop,
roll/contact limits and tracking checks. Measure speed/turn response and delay for each
surface; configure planners/controllers to those limits. Do not assume differential-drive
kinematics or in-place rotation. Match the chosen ROS distribution: Kilted and newer use
`TwistStamped` by default. ([Nav2 migration documentation](https://docs.nav2.org/rolling/configuration_and_development/migration_guides/jazzy/Jazzy/)).

Collision checking must cover the **whole moving body**, not the scanner or head alone.
Nav2 supports an updated footprint through `~/footprint`, but a changing polygon by itself
does not make its trajectory model understand articulated shape changes. Start with a
conservative envelope for the tested gait and generous clearance; tight spaces need
shape-aware planning and validation.
([Nav2 footprint documentation](https://docs.nav2.org/rolling/configuration_and_development/first_time_robot_setup_guide/footprint/setup_footprint/)).

## Recommended order and evidence gates

1. Reproduce and diagnose the rolling with video, actual joint feedback and unchanged calibration.
2. Establish repeatable supported crawling; then log one IMU and selected contacts to test
   whether they detect the observed failure before loss of control. Derive thresholds from
   measurements rather than copying example angles or rates.
3. Demonstrate measured steering and stopping on the target surface using independent
   position tracking. Verify stale input, sensor loss and localization loss stop behavior.
4. Validate sensor frames, timestamps, scan quality and local odometry in recorded data;
   then map a simple flat environment without autonomous motion.
5. Add short supervised waypoint following and full-body collision clearance only after
   those measurements pass. Select hardware after terrain, payload, power, compute and
   budget constraints are supplied.

Not checked: physical contact geometry, installed sensors, payload/compute budget, firmware
reflash state or hardware behavior. No product purchases or new operating values are proposed.

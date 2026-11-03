# How I use the Gen 3 simulation

I use the simulator to see whether the control calculation produces the intended shape, to test route logic and to inspect logs before a physical trial. I do not use it as a measurement of the real robot's speed or traction.

## Start a run

Start the dashboard using [the setup guide](../START_HERE.md), open /gen3 and log in. Select Simulation, choose a gait preset or set the gait sliders, and connect PyBullet. Simulation runs use the widest limits the server accepts (speed 3000 counts/s, tracking error 796 counts, tracking timeout 2 s); there is no limits card to verify. Joint position limits still come from the joint map. Hardware is a separate workspace with its own Dry run setting.

Choose a short waveform first. The simulation panel also supports straight, broad-S and drawn routes. Stop before editing a route. Its controller can use the selected workspace route; it does not create a second route follower.

## Gait presets

The simulation defaults are yaw 40°, pitch 25°, 0.5 Hz, lag 90°, offset 90°. Each preset below was run headless in PyBullet for 20 s with a 2 s ramp on 3 November 2026. Forward means toward the head. Flat-ground simulation is not physical proof; lateral undulation in particular depends on floor friction. Sources and the mapping from published gait equations are in [the gait preset research](../research/snake-gait-presets.md).

| Preset | Yaw / pitch | Hz | Lag | Offset | Bias | Simulated travel in 20 s |
|---|---|---|---|---|---|---|
| Lateral undulation · forward | 45° / 0° | 0.5 | 90° | 0° | 0° | 214 cm forward |
| Lateral undulation · reverse | 45° / 0° | −0.5 | 90° | 0° | 0° | 225 cm backward |
| Lateral undulation · curve | 45° / 0° | 0.5 | 90° | 0° | 5° | 157 cm on a ~55° curve |
| Pivot turn | 40° / 0° | 0.5 | 90° | 0° | 15° | ~160° turn, little travel |
| Sidewinding · right | 40° / 20° | 0.5 | 96° | 90° | 0° | 135 cm sideways |
| Sidewinding · left | 40° / 20° | 0.5 | 96° | −90° | 0° | 139 cm sideways |
| Lateral rolling · right | 25° / 25° | 0.4 | 0° | 90° | 0° | 148 cm sideways |
| Lateral rolling · left | 25° / 25° | 0.4 | 0° | −90° | 0° | 97 cm, less straight |
| Caterpillar crawl · forward | 0° / 25° | 0.4 | 72° | 0° | 0° | 110 cm forward |
| Caterpillar crawl · reverse | 0° / 25° | 0.4 | −72° | 0° | 0° | 124 cm backward |
| Helix / corkscrew | 30° / 30° | 0.4 | 108° | 90° | 0° | 63 cm sideways (meant for a pole or pipe) |
| Lifted undulation | 25° / 30° | 0.4 | 90° | 0° | 0° | 100 cm, mostly sideways |

Lifted undulation only approximates sinus lifting: true sinus lifting needs the pitch wave at twice the yaw frequency, which the generator cannot produce. Concertina and two-half turning in place need per-joint overrides or scripting and are not presets.

The same list fills the Hardware tab's 3D Gait Preset menu, which copies only the waveform; hardware speed, ramp and duration stay in the Hardware draft. Hardware Quick Presets are separate, hardware-sized versions (speed limit 900 counts/s, ramp 2.5–3 s, 30 s, peak demand 417–643 counts/s): lateral undulation 30° forward and reverse, sidewinding 30°/10° right and left, lateral rolling 25°, and caterpillar crawl 20° forward. They pass the map's speed and joint-limit checks but have not run on the robot.

The browser shows the intended ground route in blue, the head trail in orange and the next checkpoint in yellow. Follow-head, route-overview and free-camera choices change the view, not the simulated motion. The fullscreen view keeps a Stop control.

## What is moving

PyBullet integrates articulated bodies with gravity, joint motors and ground contact. The route controller changes joint targets. The robot's base is not teleported along the drawn route to make it look successful.

The V2 assembly export supplies the head, nine middle bodies, tail and motor geometry. In the recorded CAD export, the first joint is about 20.61 mm from the head reference, with subsequent pivots about 58.37 mm apart. All neutral servo counts are 2048. The head reference is the rigid body upstream of servo 1, not the last link.

The browser uses Three.js meshes. Collision geometry and inertia are simplified for PyBullet. Mass, friction and contact parameters remain illustrative; they have not been fitted to measured motion of the assembled robot.

## How I interpret progress

Route completion uses ordered checkpoint visits and an endpoint check. Crossing a later portion of a route does not count as visiting the earlier points. A stalled run, timed-out run, completed run and manually stopped run remain different outcomes.

The route implementation is in [spatial_route.py](../../generations/gen3-experimental-3d/backend/surge_control/spatial_route.py). The simulation runner and CAD handling are in the [Gen 3 source folder](../../generations/gen3-experimental-3d/). I read the source limits before extending route size, speed or duration.

Mathematical previews have no measured feedback. Simulation feedback comes from the model. Hardware feedback comes from the servo bus. The workspace separation keeps these from being shown as the same result.

## CAD regeneration and replay

The [export tools](../../generations/gen3-experimental-3d/tools/) contain native assembly export, simulation asset export and recorded-run replay. Native export depends on the matching SolidWorks installation. I keep the source assembly and calibration intact and review export provenance before replacing generated meshes.

The [previous simulation guide](../archive/2026-11-03/docs/gen3/GEN3_SIMULATION.md) retains the detailed V1/V2 export history and regeneration notes. Some browser checks there used mocked motion; other checks ran real PyBullet. They are labelled separately and should stay that way.

Recorded CSVs contain joint targets and feedback. Replaying them helps inspect servo tracking; it cannot reconstruct unmeasured physical travel. The next comparison needs measured body mass, floor contact and a real travel record in [TRAVEL_TRIALS.md](../../generations/gen3-experimental-3d/TRAVEL_TRIALS.md).

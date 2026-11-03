# Start the project

I start with simulation so I can check the software before connecting the robot. Run these commands from the repository root.

## Install the software

Our development environment is called surge and uses Python 3.11. With Conda installed:

```powershell
conda create -n surge python=3.11
conda run -n surge python -m pip install -r generations/gen3-experimental-3d/backend/web_dashboard/requirements.txt
```

Skip the create command if the environment already exists. The requirements install Flask, PySerial, psutil and PyBullet. PlatformIO is needed for firmware work, and the SolidWorks setup is needed only for regenerating native CAD exports.

## Set up operator access

The dashboard opens as a Viewer. Starting motion needs operator login. Supported names are Shashank, Bhavesh and Mahima.

For a fresh checkout, create generations/gen3-experimental-3d/operators.json locally with the following structure and your own private password:

```json
{
  "operators": ["Shashank", "Bhavesh", "Mahima"],
  "password": "replace-with-a-private-password"
}
```

Do not overwrite an existing local file. Git ignores it. SURGE_OPERATOR_PASSWORD is also supported when no file password is supplied. Missing credentials disable operator login; there is no default password to copy from an old chat.

## Open the dashboard

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

Open [the planar page](http://127.0.0.1:5000/) or [the Gen 3 page](http://127.0.0.1:5000/gen3). Starting the server does not connect serial hardware or move motors. If port 5000 is busy, add --port 5001 and open that port.

I keep the dashboard on a trusted local computer. Operator login is not a reason to expose this development server publicly.

## Run a first simulation

1. Log in from the header.
2. Open Gen 3 and select Simulation.
3. Review the gait and simulation limits, then connect PyBullet.
4. Start a short run. Watch the body, joint telemetry and head trail.
5. Stop before editing the route or switching workspaces.

The [simulation guide](gen3/GEN3_SIMULATION.md) explains what is measured inside the model. Gen 2.1 has a separate planar Simulation workspace.

## Preview the mathematics

```powershell
conda run -n surge python generations/gen3-experimental-3d/test_3d_snake.py --help
conda run -n surge python generations/gen3-experimental-3d/test_3d_snake.py --yaw 0 --pitch 5 --frequency 0.1 --ramp 8 --duration 20
```

Without --hardware, this CLI prints a mathematical dry run. That is different from PyBullet motion and from a physical measurement.

## Before physical operation

Read [hardware](hardware/README.md), [the handoff](GEN3_HANDOFF.md) and [the operating guide](operations/1_APP_USAGE_MANUAL.md). Identify the USB boards and close other serial monitors.

Use [the folder guide](REPOSITORY_LAYOUT.md) for checks. Browser checks can need extra dependencies. The older desktop instructions referred to a removed shared/desktop-app folder; the maintained web dashboard is the supported entry point described here.

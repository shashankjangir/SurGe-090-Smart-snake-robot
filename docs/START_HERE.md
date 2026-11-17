# Run the dashboard

Run the following commands from the repository root. The maintained app serves both Gen 2.1 and Gen 3.

## Install dependencies

The development environment uses Python 3.11 and Conda.

~~~powershell
conda create -n surge python=3.11
conda run -n surge python -m pip install -r generations/gen3-experimental-3d/backend/web_dashboard/requirements.txt
~~~

If the environment already exists, run only the installation command. The requirements install Flask, PySerial, psutil and PyBullet.

## Set up operator access

Create `generations/gen3-experimental-3d/operators.json` locally with your own password if the file is absent.

~~~json
{
  "operators": ["Shashank", "Bhavesh", "Mahima"],
  "password": "replace-with-a-private-password"
}
~~~

The file is ignored by Git. Preserve existing credentials on your own machine. For a shared export, create fresh credentials on the destination. `SURGE_OPERATOR_PASSWORD` is supported when the file does not supply a password. The app opens as a Viewer until an operator logs in.

## Start the app

~~~powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
~~~

Open [Gen 3](http://127.0.0.1:5000/gen3) or [Gen 2.1](http://127.0.0.1:5000/). Add `--port 5002` to use another port. Server startup leaves serial hardware disconnected.

For a first simulation, log in, open Gen 3 **Simulation**, connect PyBullet, and run a short finite gait. Watch joint feedback and the head trail, then press Stop. Read the [simulation guide](gen3/GEN3_SIMULATION.md) for the model's assumptions.

A mathematical preview is also available.

~~~powershell
conda run -n surge python generations/gen3-experimental-3d/test_3d_snake.py --help
conda run -n surge python generations/gen3-experimental-3d/test_3d_snake.py --yaw 0 --pitch 5 --frequency 0.1 --ramp 8 --duration 20
~~~

Without `--hardware`, this CLI prints calculated targets.

The [refined edition](../generations/gen3-dashboard-refined/README.md) defaults to port 5001 and has independent state. The [Pi package](../generations/rasp_pi/README.md) is the older 10-joint distribution. Keep code and maps together when copying either edition.

For physical operation, read [hardware](hardware/README.md), [the handoff](GEN3_HANDOFF.md) and [the operating guide](operations/1_APP_USAGE_MANUAL.md). The last confirmed setup used COM6 for the receiver and COM8 for the transmitter on 3 November 2026. Identify the boards again when the USB setup changes. Use one server for physical control at a time.

Verification commands and runtime export files are listed in [the repository guide](REPOSITORY_LAYOUT.md).

# How I run the robot

I run the commands below from the repository root. The [setup guide](../START_HERE.md) covers installation and login. The [hardware page](../hardware/README.md) records the real setup and saved calibration.

## Start with simulation

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

Open / for Gen 2.1 or /gen3 for Gen 3 on localhost port 5000. Log in, choose Simulation, review its settings and connect its engine. Gen 2.1 uses SIM. Gen 3 uses PyBullet and its own route controls. Stop and disconnect before switching workspaces.

For Gen 3, Hardware initially selects Dry run. Leaving it selected gives a mathematical preview. It does not provide real encoder readings. Clearing it makes the physical trial path available with its existing confirmation.

## Connect the physical system

1. Support the robot and keep a physical power-disconnection path accessible. Check wiring and clearance before supplying servo power.
2. Identify the boards. The last mapping is COM6 receiver and COM7 transmitter.
3. Close serial monitors and other CLI programs. They do not share the dashboard's connection lock.
4. Choose Hardware and the correct serial port. COM7 is the normal wireless host port.
5. Connect and require the Gen 2.1 handshake and confirmed torque-off state. Check measured feedback for all ten motors.
6. Review amplitude, frequency, bias, ramp, duration and speed. Use the current map, not an old command copied from an archived report.
7. Start only a supervised finite trial. Use Stop to end it, then disconnect.

A missing Stop acknowledgement or torque-off-unconfirmed error is not a successful stop. Keep the robot supported and use physical power disconnection if torque release cannot be confirmed. The 750 ms receiver watchdog is a fallback, not a measured emergency-stop latency.

## Read without commanding a gait

After checking the hardware setup, this command explicitly selects the physical receiver path:

```powershell
conda run -n surge python generations/gen3-experimental-3d/test_3d_snake.py --hardware --port COM7 --mode read
```

The port is an example based on the last identification. Read mode still opens the real connection and uses its handshake/Stop behaviour. It is not an offline command.

For stopped bus diagnostics, the receiver's D command reports register, torque, voltage, temperature and status information. It refuses diagnostics while armed. Do not fabricate a reading for a missing motor.

## Commissioning after changing assembly

I first inspect all measured positions with torque off. I then jog one selected joint with mechanical support and clearance. A small example is:

```powershell
conda run -n surge python generations/gen3-experimental-3d/test_3d_snake.py --hardware --port COM7 --mode jog --id 1 --ticks 20 --duration 4
```

The CLI bounds jogs to 57 counts in either direction and uses its commissioning speed limit. It cannot know if a cable or bracket is about to collide. The other joints remain torque-off.

Centering requires the selected output to be mechanically free and uses the CLI's --free-shaft confirmation. I check --help before that operation. Aligning the full chain can also move it. None of these commands should be used as a substitute for checking physical clearance.

The saved map has neutral 2048, bounds 1252–2844, speed 1500, tracking error 216 and timeout 0.5 seconds. Pitch ID 1 is positive; pitch IDs 3/5/7/9 are negative; yaw signs are positive. Changing a map field requires a real calibration decision.

## Planar Gen 2.1 bench launcher

The three older launchers have been replaced by one:

```powershell
python generations/gen2-st3215/tools/bench_gen2_1.py align --port COM7
python generations/gen2-st3215/tools/bench_gen2_1.py sine --port COM7 --duration 10
python generations/gen2-st3215/tools/bench_gen2_1.py spiral --port COM7 --duration 10
```

These commands physically move the planar robot. They are not the alternating-axis Gen 3 gait runner. All three first require two consecutive encoder samples with every motor within 30 counts of centre. Alignment timeout raises a fault. The sine waveform uses speed 1500 and the spiral uses 300; disconnect cleanup requests torque-off.

## Gamepad and firmware

Use [the controller guide](CONTROLLER_UPGRADES.md) for LB + A start, RT throttle and focus-loss stopping. Firmware updates are described in [the OTA guide](FIRMWARE_OTA.md). Initial OTA installation requires USB. The receiver and transmitter need their own matching firmware images.

The older standalone desktop commands are archived because their shared/desktop-app path is absent from this checkout. Gen 2.0 direct-bus and onboard firmware also use different interfaces. I do not mix their commands with the maintained text receiver.

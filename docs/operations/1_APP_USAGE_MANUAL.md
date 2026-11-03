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

## Automatic bus metrics and battery

Gen 3 Hardware refreshes stopped telemetry and diagnostics automatically every three seconds while the tab is visible, an Operator is logged in and a transmitter port is selected. Requests use the existing handshake and Stop/torque-off connection, never RUN or position targets. Failed requests retry after 15 seconds. Viewer, hidden tabs, Simulation, motion jobs and firmware jobs do not initiate these reads.

Latency measures the telemetry round trip; idle telemetry rate measures the interval between samples, so its first value arrives after the second sample. Tracking reads **Idle · torque off** while stopped because no target is commanded. During hardware motion these three values use the active run's feedback. Voltage, temperature and battery stay on the last stopped diagnostic sample during motion: the installed receiver refuses armed diagnostics. Sample ages remain visible and battery becomes stale after 30 seconds.

The owner-reported battery is a **2200 mAh 3S LiPo**. Its reserve percentage uses the existing conservative voltage scale (12.6 V = 100%, 11.1 V = recharge), not measured remaining mAh or runtime. Changing capacity does not change this voltage scale.

## Save a hand-positioned shape

In Gen 3 Hardware, open Per-Joint Control and log in as Operator. Select the transmitter port (COM8 in the 3 November two-board USB setup; verify the current port).

1. Press **STOP / torque off** and confirm release before handling the joints. Support the body so it cannot fall when torque is off.
2. With servo power connected, gently arrange the snake by hand within its calibrated limits. Do not force a joint.
3. Keep the body still and click **Capture hand-positioned pose**. This opens the real connection, requests Stop and reads all ten joint positions, even if Dry run is selected. Missing feedback or an out-of-range joint rejects the capture.
4. Enter a name and click **Save captured pose**. The snapshot is stored on the dashboard computer in `generations/gen3-experimental-3d/runs/pose_presets.json`. New captures require a unique name; use Re-calibrate to update an existing saved pose.
5. Choose **Saved: your name** in **Shape preset** to load the angles. Loading does not move the robot. **Move to Pose** uses the existing Hardware / Dry run choice and confirmation; it moves, holds for the selected duration, then returns to neutral.

To update a saved pose, select its **Saved:** entry, press **STOP / torque off**, support and reposition the snake, then click **Re-calibrate selected preset**. After capture, click **Update selected pose** to replace its readings under the same name. Re-capture alone does not overwrite the preset. Updates reject a preset changed by another browser after it was loaded. Built-in shapes are not editable through this button. Re-calibration of a pose does not change robot joint zero, signs or limits.

Captures retain encoder precision and the joint calibration used to interpret them. Re-calibrate the saved pose after changing joint calibration. Save records the captured snapshot, even if you subsequently adjust the sliders; capture again to record a different physical shape. This feature records one static shape at a time, not a motion sequence.

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

## Phone controller over Wi-Fi

Added 3 November 2026; tested in a browser only, not yet with a real phone or with the robot moving.

1. Put the laptop and phone on the same Wi-Fi. Start the dashboard so it listens on that network: `python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py --host 0.0.0.0 --port 5000` (or the `dashboard-phone` launch entry). Windows may ask to allow Python through the firewall; allow it on private networks.
2. On the laptop, open `http://localhost:5000/gen3`, log in as operator and find the controller card. It shows a `Phone controller:` link with a pairing key. The key changes on every server restart.
3. Open that link on the phone. Turning the phone sideways gives the gamepad layout; the corner button switches to full screen.
4. Click **Enable Controller** on the laptop and keep that page focused. The phone acts as a standard gamepad, so all the usual rules apply. **HOLD** is LB: keep a thumb on it. Sliding up from where you touched sets RT throttle. **A** starts, **B/Stop** stops, **X** reverses, **Y** changes shape, the D-pad sets yaw/pitch amplitude, and the small stick moves the head in inspection mode.
5. Letting go of HOLD stops the robot. So do Stop, locking the phone or switching apps, and losing Wi-Fi for more than 0.3 s. Hardware starts still need the confirmation on the laptop while HOLD is held.

The link uses plain HTTP on the local network. Anyone with the key can send controller input, but input only matters while the laptop operator has Enable Controller on. Operator login stays laptop-only.

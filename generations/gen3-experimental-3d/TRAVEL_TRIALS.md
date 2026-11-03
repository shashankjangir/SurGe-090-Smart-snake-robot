# Gen 3 measured travel trials

Start from the owner's successful 10° pitch trial. Calibration and controller
settings remain unchanged. Read `../docs/GEN3_HANDOFF.md` for current hardware
limits. These are owner-operated experiments, not completed measurements.

## Baseline: three repeats

Use the same clear, level surface, starting orientation and external battery
wire arrangement. Keep wires equally slack and away from the moving body.
Record surface, battery condition and any contact changes. Support raised links
as needed; keep access to power disconnection. Do not repeat centering unless
the assembly has changed.

Place a ruler or floor scale beside the robot and record from a fixed overhead
camera. Mark two identifiable body points, one near each end. Define forward
along the starting straight body toward ID 1. Record both points before motion
and after the robot has returned straight and stopped. Measure their signed
displacements along that same floor axis, plus sideways drift. Use the average
of the two forward displacements as a body-travel estimate; record heading
change separately so turning or end bending is not mistaken for forward travel.

From the repository root, preview the existing settings without serial access:

```powershell
python generations/gen3-experimental-3d/test_3d_snake.py --yaw 0 --pitch 10 --frequency 0.1 --lag 90 --ramp 8 --duration 30
```

When ready, the owner runs this hardware command once per repeat:

```powershell
python generations/gen3-experimental-3d/test_3d_snake.py --hardware --port COM6 --yaw 0 --pitch 10 --frequency 0.1 --lag 90 --ramp 8 --duration 30
```

Confirm COM6 is the transmitter. Each invocation creates its own CSV and JSON
parameter snapshot in `runs/`; record the printed filename below. The 30-second
motion includes an 8-second ramp at each end. Alignment and final settling add
wall-clock time. Compare travel per trial first; if reporting speed, state
whether the denominator is the 30-second motion or measured total elapsed time.

Ctrl+C requests STOP. A fault ends the trial: retain its exact message and log,
and investigate before repeating. Confirm physical power off if torque release
cannot be verified. Never raise speed or tracking limits to force a trial through.

Date / surface / battery condition / wire arrangement / measurement resolution:

| Run | CSV filename | Head-end forward (cm) | Driver-end forward (cm) | Mean forward (cm) | Sideways drift (cm) | Heading change (°) | Fault/contact observations |
|---|---|---|---|---|---|---|---|
| Baseline 1 | | | | | | | |
| Baseline 2 | | | | | | | |
| Baseline 3 | | | | | | | |

## Decide the next change from the measurements

Report all three values and their range, including zero or backward travel.
If displacement is comparable to measurement resolution, report it as unresolved
rather than claiming improvement. Note lifting, sideways slip, heading drift,
wire tension and any electrical or thermal observations.

Keep amplitude, frequency, ramp and limits fixed while establishing this baseline.
Select the next single parameter only after reviewing the results and contact
video. Spatial lag or wave direction can be investigated without increasing
amplitude and frequency together; any candidate still requires preview validation
and a supported hardware trial. Repeat a candidate three times under the same
conditions. Yaw coordination is a separate small supported experiment, not an
automatic next run. Do not infer a realistic contact model from the box simulator.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**Hardware status (as of 2 Nov).**
- **No fuses are installed** (owner, 1 Nov). Fuses in the split-bus v3 drawing are design intent only.
- Power: external 3S 1800 mAh LiPo on long wires; the central battery section is removed.
- 31 Oct trial: 30° yaw / 25° pitch, 0.5 Hz, speed 1500. ID 1 had a WRITE failure and IDs 7/8 stopped
  replying. Owner then reported a wiring fault and fixed it.
  Still pending: a logged all-ten diagnostics query, and a repeat of the trial with minimum voltage recorded.
- Both dashboard headers show a BATTERY estimate from cached diagnostic voltages
  (`clamp((V − 11.1) / 1.5 × 100)`). It is a sampled recharge hint, not live state of charge.

No new floor-travel trials were recorded after the 31 Oct high-amplitude fault. Repeat the baseline after the
all-ten diagnostics query, and log minimum voltage.

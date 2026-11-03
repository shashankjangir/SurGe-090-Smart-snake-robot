# ST3215 speed and power limits

Research checked 1 November 2026. Read against `docs/GEN3_HANDOFF.md`, current
`generations/gen3-experimental-3d/joint_map.json`, and the newer wiring issue resolution.
No hardware opened, motion commanded, firmware changed or calibration edited.

## What 1500 → 3000 means

The project treats speed as encoder counts per second; 4096 counts = 360°.
Thus 1500 counts/s = 131.84°/s = 21.97 RPM; 3000 = 263.67°/s = 43.95 RPM.
Waveshare's ST3215 web tutorial explicitly describes steps/second and an
approximately 3073 maximum setting. This closely matches the standard motor's
45 RPM no-load speed, rather than establishing a universal packet limit.
[Official tutorial](https://docs.waveshare.com/ST3215_Servo/Web-Use).

The generic ST memory map describes a two-byte running-speed register at
address 46 with magnitude up to 32767 and a direction bit. Its unit depends on
the phase configuration: 0.732 RPM or approximately 0.0146 RPM (one count/s).
That representable range is not a mechanical capability. Exact installed
variant/configuration remains unverified; retain the project's existing unit
assumption and do not change phase/EEPROM to obtain a larger number.
[Official ST memory map](https://docs.waveshare.com/Memory_Map_Explanation/ST_Servo_Memory_Map_Explanation).

| Variant | Manufacturer no-load specification | Approximate counts/s | Stall current |
| --- | --- | ---: | ---: |
| Standard ST3215 | 45 RPM / 0.222 s per 60° at 12 V | 3072 (3075 from rounded transit time) | 2.7 A |
| ST3215-7.4V | 52 RPM / 0.192 s per 60° at 7.4 V | 3550 | 2.5 A |
| ST3215-HS | 106 RPM / 0.094 s per 60° at 12 V | 7236 | 2.4 A |

Sources: [standard and 7.4 V specifications](https://docs.waveshare.com/ST3215_Servo),
[HS specifications](https://www.waveshare.com/wiki/ST3215-HS_Servo_Motor).
Counts/s above are calculated from the rounded RPM ratings. The 7.4 V variant
is specified only for 4–7.4 V; do not extrapolate its performance to 12 V.
Standard ST3215 is specified for 6–12.6 V. Confirm labels before applying these
specifications to the actual robot.

For the standard model, 3000 is about **98% of its advertised no-load speed**.
That leaves little speed headroom at 12 V, before linkage load, acceleration,
friction, supply sag or battery discharge. Neither the datasheet nor the packet
range yields a safe loaded maximum for this snake. Raising the speed setting
changes a cap; it does not double a gait's commanded frequency or amplitude.
The owner's goal is faster whole-body gait, so the useful outcome is increased
achieved waveform speed with acceptable tracking under load, not a larger field.

The current map is speed 1500, tracking error 216 counts, timeout 0.5 s.
The project's conservative sinusoidal envelope is
`4096/360 * amplitude_degrees * (2*pi*frequency_hz + pi/(2*ramp_seconds))`.
At 30°, 0.5 Hz and a 2 s ramp it is about 1340.4 counts/s, already below 1500.
This mathematical check does not establish loaded tracking or explain the
earlier write fault. The owner reports the wiring fixed on 1 November; a logged
all-ten diagnostic and repeat trial are still pending in
`.scratch/esp-connection/issues/03-high-amplitude-servo-loss.md`.

## Driver and split power

The relevant compact **Servo Driver with ESP32**, SKU 21593, is documented as
6–12 V input, with input voltage matching servo voltage. Its ST3215 tutorial
instead permits 6–12.6 V through the DC jack: this is a documentation difference,
not permission to apply the unrelated HAT (A)'s 9–25 V rating to this board.
[Board overview](https://docs.waveshare.com/Servo_Driver_with_ESP32),
[ST3215 connection instructions](https://docs.waveshare.com/ST3215_Servo/Web-Use).

Waveshare specifies **5 A maximum for the board** and recommends powering many
servos in separate groups. Both servo sockets are equivalent, so using both
does not provide two independent 5 A supplies.
[Official board FAQ](https://docs.waveshare.com/Servo_Driver_with_ESP32/FAQ).
For ten standard servos, summing stall ratings gives 27 A; that is a sizing
stress case, not measured gait current or an acceptable continuous stall state.

Owner correction, 1 November 2026: **no fuses are installed**. The fuse
symbols in the split-bus diagram describe the intended design, not installed
protection. Earlier confirmation of fused pairs was superseded by this correction. Split-power interpretation (engineering inference): external servo power can
bypass the board's high-current path only if the servo positive rail is actually
separated from the board rail and servo load/return current is routed through
adequately rated distribution. Keep a shared signal-ground reference and data
connection; do not route the whole servo return through a thin board ground
lead. Simply adding a battery feed while retaining the full three-wire power
connection does not prove bypass. The official schematic shows shared power
and data nets, but it does not verify the owner's current wiring, connectors,
wire gauge, fuse selection or board revision. The confirmed split arrangement
therefore prevents assuming the board carries all ten motors' current; the
actual bypass/return paths and branch ratings determine that conclusion.
[Official schematic](https://files.waveshare.com/wiki/Servo-Driver-with-ESP32/Servo_Driver_with_ESP32.pdf).

## Battery and remaining measurements

3S ordinary LiPo is 11.1 V nominal and 12.6 V fully charged (three 4.2 V cells).
1800 mAh is **1.8 Ah capacity**, not a 1.8 A current ceiling. Label-rated
continuous current is `1.8 * discharge_C_rating` amperes; burst ratings have a
separate allowed duration. Pack C rating, condition, leads and connectors remain
unknown; the battery make/model is unavailable, so its C rating cannot be
established online. Capacity alone cannot establish enough current or acceptable voltage
under load. [Manufacturer battery terminology](https://www.horizonhobby.com/on/demandware.static/Sites-horizon-us-Site/Sites-horizon-master/default/Manuals/HRC44170-Manual.pdf),
[manufacturer cell voltage table](https://www.horizonhobby.com/on/demandware.static/Sites-horizon-us-Site/Sites-horizon-master/default/Manuals/EFLC3025-Manual_EN.pdf).

Before adopting a higher cap, confirm the motor variant, power/return routing
and branch ratings, then measure actual tracking, minimum voltage and current
under the intended mechanical load. A fuse protects according to its time/current
curve; it is not an instantaneous current regulator. No loaded speed limit,
continuous torque capability, thermal endurance or battery runtime was measured
in this research.

## Software ceiling update — 1 November 2026

Gen 3 validation and dashboard inputs now accept 1–3000 counts/s. The saved
map remains at 1500; this software change establishes no loaded hardware rating.

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

**Status.** Software accepts 1–3000 counts/s; the saved map stays at 1500. No speed trials have run above 1500.
Fuses are still not installed, so fit them before trying higher speeds.

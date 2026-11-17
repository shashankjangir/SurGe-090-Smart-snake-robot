# Gen 3 sensor integration plan and parts list

This page preserves a dated research, planning, or verification record. Its trial values and results describe that session. Use the [current handoff](../GEN3_HANDOFF.md) and [setup guide](../START_HERE.md) for the maintained application.

Revised 7 November 2026. This is a proposal for ordering. Nothing is bought, mounted or wired yet.
The ±120° part redesign is built around this plan: every board gets a pocket, every cable gets a
channel, and nothing is visible except the nose window and the belly pads.

Prices are rough Indian-market estimates for budgeting only. Get real quotes before ordering.

## 1. What the robot will sense

| What | Sensor | Where | Count | Why |
| --- | --- | --- | --- | --- |
| Orientation and motion of every body | 6-axis IMU (accelerometer + gyroscope), **LSM6DSV16X** | Every body: head, 11 mid, tail | 13 | Roll and tilt of each segment; shows where tipping starts; the chip also does orientation fusion itself, so each segment can send a ready-made orientation |
| Floor contact | Thin-film force sensor (FSR), left and right of the belly, under a rubber pad | Every body | 26 | Which segments carry weight, and on which side: the clearest early sign of rolling |
| Obstacles ahead | **VL53L5CX** 8×8 multizone distance sensor | Head nose, behind a window | 1 | Depth grid ahead up to about 4 m, small and light |
| Drop / edge ahead (recommended) | VL53L4CD single-zone distance sensor, pointing down and forward | Head chin | 1 | Stops before an edge or step |
| Battery current, voltage, power, charge | **INA228** with shunt resistor | Tail, on the main power lead | 1 | Real pack current and voltage sag; brown-out stop; true battery percentage |
| Battery temperature | 10 kΩ NTC thermistor on the pack | Battery | 1 | Over-temperature stop while charging or under load |
| Servo current, load, temperature, voltage | Built into each ST3215 (the SCServo library has `ReadCurrent`) | Every joint | 12 | Already available; no extra parts. Confirm the units on one servo before relying on it |
| Ground-truth position (development) | USB webcam above the floor + AprilTag on the head and tail | Off the robot | 1 | Measures real travel, heading and slip to check everything else |

**Optional:** a head camera (ESP32-S3 camera board) for live view and visual tests. It needs Wi-Fi,
draws more power and adds weight to the head, so leave room for it but don't buy it in the first order.

**Not on the robot:** 2D LiDAR (the head tilts and swings, and the unit is too big for a 57 mm body),
barometer, magnetometer (unreliable next to 12 motors).

## 2. How it is wired: one sensor bus through the whole body

Thirteen sensor sets can't each have their own wires back to the tail; that would put dozens of
wires through every joint. Instead, every body has one small **segment board**, and all boards share
one **CAN bus**: two twisted signal wires that run through the body like the servo cable. CAN is the
standard robot and car bus. It tolerates motor noise and adds no wires as segments are added.

```
 HEAD                MID 1 … MID 11                       TAIL
[segment board]──CAN──[segment board]──CAN── … ──CAN──[tail hub board]──STOP line──[Waveshare servo driver]
 + VL53L5CX           + IMU, 2 belly FSRs                 + IMU, INA228, fuses       (unchanged servo bus)
 + VL53L4CD (down)                                         + ESP-NOW / Wi-Fi to the PC
 + IMU, 2 belly FSRs
```

**Segment board (custom PCB, about 22 × 30 mm, same board in every body):**
- ESP32-C3 module (it has a built-in CAN controller; Wi-Fi stays off)
- LSM6DSV16X IMU, placed at the board centre; the board screws to a flat face in the shell near
  the spine, so the IMU can't wobble
- 3.3 V CAN transceiver (SN65HVD230 or TCAN330), plus a solder jumper for the 120 Ω end termination
- Small switching regulator: 12 V supply line in, 3.3 V out, with its own small fuse
- 2 inputs for the belly force sensors
- I2C connector, used only on the head board for the two distance sensors
- USB pads for flashing; the board number is set in firmware
- **Power-injection section**, fitted on 6 of the boards: the 3 A fuse and 470 µF capacitor for each
  servo pair (IDs 1/2 … 11/12). This replaces the 5–6 separate perfboards from the split-bus v3 plan.

**Tail hub board (custom PCB):**
- ESP32-S3 module: CAN master that collects all segments and sends the data to the PC over ESP-NOW
  (two packets per cycle, under the 250-byte limit) or Wi-Fi
- Its own LSM6DSV16X (the tail is the 13th body)
- INA228 with a 1 mΩ shunt on the battery lead; NTC thermistor input
- XT60 battery input, main fuse holder, loop-key connector
- 7.5 V regulator for the Waveshare driver (already part of the v3 plan)
- **STOP line to the Waveshare receiver:** one wire that the hub pulls to stop the servos at once on
  roll-over, brown-out or over-temperature, without waiting for the PC. Needs a small receiver
  firmware change. A sensor or bus fault must never block the existing STOP.

**Conductors through each joint:** servo cable (3) + 12 V supply line (2, 18 AWG) + CAN pair (2) = 7,
bundled into one flexible harness with a service loop sized for ±120°.

**Data rates (estimate):** 13 orientations + contacts at 50 Hz is about 6 kB/s, and the 8×8
distance grid at 15 Hz adds about 2 kB/s. That uses roughly a quarter of a 1 Mbit/s CAN bus.

## 3. Power and protection (split bus v3, extended to 12 servos)

```
3S LiPo ─XT60─ [loop key] ─ [15 A main fuse] ─ [INA228 shunt] ─┬─ 12 V supply line along the body
                                                                │    └ 6 × (3 A fuse + 470 µF) → servo pairs 1/2 … 11/12
                                                                ├─ 7.5 V regulator → Waveshare driver
                                                                └─ segment boards: each regulates its own 3.3 V
```

- Grounds are shared; only the servo positive feed is split into pairs, as in v3.
- Soft-start the servos in groups so six 3 A fuses don't blow at power-on (as the v2 firmware did).
- **Battery placement (decision needed):** the external battery on long leads is the main source of
  visible wiring. A 3S 2200 mAh pack (about 105 × 34 × 24 mm, about 180 g) fits inside a 57 mm round
  body but is longer than one segment. Options: a longer tail body that holds it low (extra weight
  low down may help with rolling), or a single clean tether cable with XT60 for bench work.

## 4. Keeping it clean

- Every board sits inside its shell on screw bosses (M2 heat-set inserts). No exposed boards.
- **Only visible parts:** the VL53L5CX window in the nose, the down-facing sensor's opening and the
  rubber belly pads. Follow ST's cover-window guidance for the VL53L5CX: a plain hole works, a cover
  needs the right material and gap.
- The force sensors sit under removable rubber belly pads in a recessed groove, so the pad is both the
  grip surface and the sensor cover.
- One harness per joint, routed close to the joint axis with a clip on each side, and covered by a
  snap-on cable cover on the shell.
- JST-GH locking connectors for CAN, XT30 for the 12 V line, the stock 3-pin servo plugs. Nothing
  hand-soldered inside the robot except the force sensor tails.

## 5. Parts list

### A. Custom PCBs (order from JLCPCB/PCBWay with assembly)

| Item | Qty | Est. ₹ |
| --- | --- | --- |
| Segment board, assembled (12 needed + 4 spares) | 16 | 20,000–32,000 |
| Tail hub board, assembled (1 + 1 spare) | 2 | 6,000–10,000 |
| Shipping and customs | — | 3,000–6,000 |

### B. Sensors

| Item | Qty | Est. ₹ |
| --- | --- | --- |
| VL53L5CX breakout (SparkFun / Pimoroni or equivalent), 1 + 1 spare | 2 | 4,000–7,000 |
| VL53L4CD breakout (down-facing), 1 + 1 spare | 2 | 1,600–3,000 |
| Thin-film force sensors, about 12–18 mm round, 26 + spares | 30 | 4,500–9,000 |
| 10 kΩ NTC thermistor with lead | 2 | 100 |
| 1080p USB webcam for ground truth | 1 | 2,000–4,000 |

### C. Power and protection

| Item | Qty | Est. ₹ |
| --- | --- | --- |
| XT60 pairs (male + female) | 4 | 300 |
| XT60 loop key | 1 | 200 |
| 15 A mini blade fuses + spares (holder is on the hub board) | 5 | 200 |
| 3 A fuses for the servo pairs + spares (SMD on the segment boards, or nano blade) | 12 | 300 |
| LiPo checker/alarm | 1 | 300 |
| LiPo safety bag (if not owned) | 1 | 500 |

### D. Wiring and mechanical

| Item | Qty | Est. ₹ |
| --- | --- | --- |
| 18 AWG silicone wire, red + black | 5 m each | 600 |
| 26 AWG twisted-pair silicone or flexible wire (CAN) | 5 m | 400 |
| JST-GH 4-pin pre-crimped cables, 10–15 cm | 20 | 1,500 |
| XT30 pairs for the 12 V line through the joints | 15 | 1,200 |
| ST3215 3-pin servo extension leads (for longer service loops) | 12 | 1,000 |
| Heat shrink, braided sleeve, cable clips | set | 800 |
| M2 / M2.5 heat-set inserts and screws | set | 800 |
| Rubber sheet for belly pads (1–2 mm, neoprene or silicone) | 1 | 500 |

### E. Bench prototype kit (order now; test before the PCBs arrive)

| Item | Qty | Est. ₹ |
| --- | --- | --- |
| XIAO ESP32-C3 | 3 | 1,800 |
| SN65HVD230 CAN transceiver module | 4 | 600 |
| LSM6DSV16X breakout | 3 | 4,500–7,500 |
| INA228 breakout | 1 | 1,500–2,000 |
| ESP32-S3 dev board (hub prototype) | 1 | 900 |

**Rough total: ₹60,000–1,00,000** (about ₹45,000–75,000 without the bench kit and spares).

**If we don't make custom PCBs:** each segment would get a stack of three breakouts (XIAO ESP32-C3 +
CAN module + IMU breakout). It works and needs no PCB design, but it's bulkier, has more hand wiring
and is harder to keep tidy. I'd only use it for the bench kit.

## 6. Software work

1. **Segment firmware:** read the IMU and its on-chip orientation, the two force sensors and, on the
   head, both distance sensors; send compact CAN frames at a fixed rate with a sequence number and
   error flags.
2. **Hub firmware:** collect and time-stamp the frames, read INA228 and NTC, flag missing segments,
   drive the STOP line, and send to the PC.
3. **Receiver firmware:** STOP-line input that triggers the existing stop (torque off).
4. **Backend:** sensor stream into `gen3.py` state, logged with joint feedback; stale data is shown as
   stale, never as zero.
5. **Dashboard:** a body view showing per-segment tilt, belly contact, the 8×8 distance grid and
   battery power; replaces the estimated battery percentage with measured charge.
6. **Simulation:** the same sensors simulated in MuJoCo (see
   [the simulation plan](gen3-simulation-upgrade.md)), so controllers use the same inputs in
   simulation and on the robot.
7. **First safety rule:** stop on sustained roll beyond a limit measured from logged trials, not a
   guessed number.

## 7. Order of work (about 4 weeks)

| Week | Hardware | Software / CAD |
| --- | --- | --- |
| 1 | Order the bench kit and power parts; design the segment and hub PCBs | Bench CAN chain of 3 nodes; IMU + force sensor reading; give the CAD team the board outlines |
| 2 | Order PCBs (about 1–2 weeks to arrive) | Hub firmware, STOP line, logging; redesign parts for ±120° with board pockets and cable channels |
| 3 | Boards arrive: flash and test each on the bench | Print the new parts; build the harness; dashboard sensor view |
| 4 | Assemble, verify all 13 nodes, calibrate IMU mounting | Supported crawl trials with logging; set the roll stop from the measured data |

## 8. Decisions needed before ordering

1. **Custom PCBs** (recommended, clean) or **breakout stacks** (no PCB design, bulkier)?
2. **Battery** inside a longer tail body, or a tether cable?
3. **Head camera now** or later?
4. Who designs the PCBs? I can draft the schematic, the pin plan and the board outline for the CAD team.

Background: [sensing research](../research/snake-autonomy-sensing.md),
[Waveshare hardware research](../research/GEN3_WAVESHARE_HARDWARE_RESEARCH.md),
[12-motor upgrade](../hardware/12_MOTOR_UPGRADE.md),
[archived split-bus v3 power design](../archive/2026-11-03/docs/hardware/power_split_bus_v3.md).

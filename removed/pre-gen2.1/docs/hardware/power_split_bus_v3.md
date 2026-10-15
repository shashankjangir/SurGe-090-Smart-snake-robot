# SURGE-090 — Split power bus v3 (2+2+2+2+2), 2026-09-23
Replaces v2 (4+3+3). Diagram: `wiring_split_bus_v3.svg`.

## Decision
One controller (Servo Driver with ESP32) drives ONE continuous DATA wire to all 10 ST3215 servos on a single UART.
Power is injected into **5 groups of 2 servos**, each fed from the main 12 V line through its own fuse.
No extra bus-servo driver per group. A group only needs power, not another driver.

## Groups
| Group | Servos | Inject board sits before |
|---|---|---|
| G1 | ID1–ID2 | ID1 (next to the controller) |
| G2 | ID3–ID4 | ID3 |
| G3 | ID5–ID6 | ID5 |
| G4 | ID7–ID8 | ID7 |
| G5 | ID9–ID10 | ID9 |

## Wiring
- **Main power line:** +12 V / GND, 16–18 AWG silicone. Battery (3S LiPo) → 15 A fuse → XT60 loop key → along the whole body, with ~30 mm slack at every joint.
- **Controller:** a small buck set to 7.5 V, fed from the main line, goes to the DC jack. Servo Port 1 lead: GND + DATA only, **+V wire cut and taped**. Port 2 stays empty.
- **Each inject board** (small perfboard, 5 in total):
  - IN from previous servo/controller: GND → through, DATA → through, **+V → cut ✕**
  - IN from main line: +12 V via **3 A fuse** → +V out; GND → GND out
  - OUT (3-pin plug) to the group's first servo: +12 V · GND · DATA
  - 470 µF 25 V capacitor across +12 V / GND
- Tap wires from the main line to each inject board: 20–22 AWG, short.
- DATA and GND are continuous from the controller to ID10. +12 V is broken before every inject board.

## Numbers (per group of 2 servos)
| Condition | Current | Note |
|---|---|---|
| Walking | ~0.6–1.0 A | well under ~3 A plug-pin rating |
| Heavy load | ≤ 1.8 A | OK |
| Both servos stalled | 5.4 A | the 3 A fuse blows, which protects the plugs |
| Voltage drop to the 2nd servo | < 0.1 V | negligible |
Total from the battery while walking is ~3–5 A; the 15 A main fuse and 16–18 AWG main line cover it.

## Parts (in addition to the v2 list)
- 5 × small perfboard inject boards
- 5 × 3 A fuses (mini blade + inline holder), or 5 × 3 A PTC resettable fuses (smaller, self-resetting)
- 5 × 470 µF 25 V capacitors
- 5 × 3-pin 5264-style plug pairs, 20–22 AWG silicone for the taps

If fuses trip when every servo moves at once at power-up, ramp the servos to their start pose slowly (or use 4 A fuses).

## Trade-offs vs 4+3+3
- Better: each plug carries only 2 servos' current; a jam takes out only 2 joints; almost no voltage drop.
- Costs: 5 inject boards instead of 3, which means more solder joints and connectors that can fail, and a fuse to fit at every second joint. Check the Ø8 cable tunnel fits 2 main-line wires + the servo lead.

## Build order
1. Battery → fuse → key → main line: meter reads 12.x V.
2. Set buck to 7.5 V, then connect the controller.
3. Group 1 only (ID1–2) → test each servo by ID.
4. Add groups 2 → 5 one at a time, checking 12 V at each inject board.
5. Slow sine gait; every servo reads ≥ 11.7 V (read Present Voltage from each servo).

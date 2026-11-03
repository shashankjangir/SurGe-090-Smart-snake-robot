# SURGE-090 — Split power bus, single data line (v2, 2026-09-23)
Replaces the centre-fed option (power_centre_fed_v1.md).

## Decision
One controller (ESP32 + one bus-servo interface) drives ONE continuous DATA wire to all 10 servos.
Power is injected separately into 3 groups from a main 12 V trunk, each group with its own fuse.
Don't add a second bus-servo driver/adapter per group. The DATA wire is one shared line, so a group only needs power, not another driver.
If several adapters must share one UART: fan out ESP32 TX to all adapter RX-in pins. Never tie the adapters' TX-out pins together (their outputs fight). Merge them through Schottky diodes (diode-AND with a 10k pull-up to 3.3 V on ESP32 RX), or give each adapter its own UART.

## Groups
- G1: ID1–ID4 (head end, next to controller)
- G2: ID5–ID7
- G3: ID8–ID10

## Wiring
- Trunk: +12 V / GND, 16–18 AWG silicone, battery → 15 A fuse → loop key → along the body (with slack at every joint).
- Each group: an injection board (3-pin in, 3-pin out, 2-wire power tap) at the group's first servo.
  - +12 V from trunk via a 5 A fuse → +V pin of the group's first servo.
  - GND from trunk → GND pin (GND also continuous from the previous group).
  - DATA passes straight through from the previous group.
  - +V pin from the previous group is NOT connected (cut), so groups don't share or back-feed.
- Controller servo-port lead: GND + DATA only, +V cut.
- 470–1000 µF 25 V capacitor at each injection board.

## Numbers
Per group ≤4 servos: walking ~1.2–2 A, heavy ~3.6 A (≤ the ~3 A pin rating at walking load; brief peaks OK), drop to last servo in group < 0.3 V.

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

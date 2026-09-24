# SURGE-090 — Centre-fed servo power (cheaper option), v1 (2026-09-23)

Controller: Waveshare Servo Driver with ESP32 (6–12 V in, 2 servo ports on one UART).
Load: 10 × ST3215 (0.2 A no-load, ~0.9 A rated, 2.7 A stall). Pack: 3S LiPo (12.6 V full).

## Rule
The board handles data only. Servo current goes battery → centre power tee → two half-chains,
never through the board's barrel jack or its traces.

## Topology
- Board + power tee sit on a deck over the middle joint (between servo 5 and 6), with the battery there too so the mass is centred.
- Chain A: tee → ID5 → ID4 → ID3 → ID2 → ID1 (toward the head)
- Chain B: tee → ID6 → ID7 → ID8 → ID9 → ID10 (toward the tail)
- Both ports share the same UART, so IDs 1–10 and the firmware stay unchanged.

## Power tee (small perfboard)
Inputs: +12 V/GND from loop key (16–18 AWG); DATA + GND from ONE board servo port (+V pin of that lead cut/insulated).
Outputs: two 5264-style 3-pin headers (GND / +12 V / DATA), each +12 V via its own 5 A blade fuse.
Also: 1000 µF 25 V electrolytic across +12/GND on the tee.
Board VIN: small adjustable buck set to 7.5 V (board max 12 V; 3S reaches 12.6 V). Board VIN no longer
needs to match the servo voltage because the board's +V no longer reaches the servos.
All grounds are common.

## Cables
- Tee → first servo each side: custom 22 AWG silicone lead, ~15 cm (30 mm slack for ±80°).
- All other links: stock 15 cm leads (assumed 24–26 AWG).

## Numbers (26 AWG stock leads, 22 AWG first link, ~10 mΩ per contact)
| per-servo avg | current per side | drop to tail servo | first-link loss |
|---|---|---|---|
| 0.3 A | 1.5 A | 0.32 V | 0.13 W |
| 0.5 A | 2.5 A | 0.54 V | 0.35 W |
| 0.9 A (heavy) | 4.5 A | 0.97 V | 1.13 W |
The 5264 contact is rated about 3 A. Sustained current above ~0.6 A per servo overloads the first plug on each side, so limit torque in firmware.

## Firmware guards
- Torque limit ~70 % (RAM torque-limit register) during gait development.
- Poll present current + voltage of every servo; stop the gait if a side's sum is > 3 A for > 2 s or any servo is < 10 V.
- Use phase-offset serpentine (travelling wave) so joints don't peak at the same moment.

## Bring-up tests
1. Tee alone: 12.x V on both headers, fuses intact; buck = 7.5 V before board.
2. One servo per side, then full chains; slow sine.
3. Under gait: meter at ID1 and ID10 ≥ 11 V on a full pack.
4. After 5 min of gait: first-link plugs only warm to touch (< ~50 °C).
If step 3/4 fails, add one +12 V injection at ID2/ID9 (upgrade to full split bus).

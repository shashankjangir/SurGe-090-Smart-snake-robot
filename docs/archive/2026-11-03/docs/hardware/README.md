# Gen 2 power and wiring

The current design is [split power bus v3](power_split_bus_v3.md): five fused
pairs of servos, with a separate supply to the controller. The
[wiring drawing](wiring_split_bus_v3.svg) and [build guide](4_WIRING_DIAGRAM.md)
show the connections. The [inventory](Updated_Hardware_Inventory.md) records the
parts and budget at the date it was written.

Power distribution changed as the servo hardware and body layout developed.
The sequence below explains why we moved from a single supply chain to smaller
fused groups. Voltage-drop and load figures in these notes are design estimates;
actual behavior depends on wiring, connectors and operating conditions.

## Design history

| # | Date | Design | Files | Status | What changed / why we moved on |
|:---:|---|---|---|---|---|
| 0 | 16–19 Aug 2026 | 2× 3S 1500 mAh in parallel (Y-harness, 2 × 15 A fuses) → separate Bus Servo Adapter (Waveshare 25514) → **one daisy chain**, all servo current through the adapter; Mini560 5 V buck for a separate ESP32 (UART on GPIO 17/16) | [`wiring_diagram_v1.svg`](wiring_diagram_v1.svg), [`system_architecture.svg`](system_architecture.svg) | Superseded | Hardware changed to **one** 3S 1800 mAh pack and the **Servo Driver with ESP32** (integrated, UART GPIO 18/19). The diagram itself noted that a single chain at up to 27 A stall needs mid-chain 12 V injection. |
| 1 | 23 Sep 2026 | **Centre-fed:** driver + power tee mid-body, two half-chains of 5, 5 A fuse each; driver fed by 7.5 V buck, its servo +V cut | [`power_centre_fed_v1.md`](power_centre_fed_v1.md), [`wiring_centre_fed_v1.svg`](wiring_centre_fed_v1.svg) | Superseded | Cheapest, but ~0.5–1 V drop to the end servos and the first plug on each side overloads above ~0.6 A per servo. |
| 2 | 23 Sep 2026 | **Split bus v2 (4+3+3):** one DATA line, 12 V trunk injected into 3 groups, 5 A fuse each | [`power_split_bus_v2.md`](power_split_bus_v2.md), [`wiring_split_bus_v2.svg`](wiring_split_bus_v2.svg) | Superseded | A 4-servo group can reach ~3.6 A under heavy load, above the ~3 A plug-pin rating. |
| 3 | 23 Sep 2026 | **Split bus v3 (2+2+2+2+2):** 15 A main fuse → loop key → main line → 5 inject boards, 3 A fuse + 470 µF each | [`power_split_bus_v3.md`](power_split_bus_v3.md), [`wiring_split_bus_v3.svg`](wiring_split_bus_v3.svg) | **Current** | Each plug carries only 2 servos' current, a jam takes out only 2 joints, voltage drop < 0.1 V. Cost: 5 inject boards. Firmware `robot_esp32_v2` soft-starts one group at a time so the 3 A fuses don't trip. |

## Files

| File | What it is |
|---|---|
| `Updated_Hardware_Inventory.md` | Parts on hand, parts to buy, budget, power paths |
| `power_split_bus_v3.md` / `wiring_split_bus_v3.svg` | **Current** power design and drawing |
| `power_split_bus_v2.md` / `wiring_split_bus_v2.svg` | Superseded — 3 groups (4+3+3) |
| `power_centre_fed_v1.md` / `wiring_centre_fed_v1.svg` | Superseded — centre-fed, two half-chains |
| `wiring_diagram_v1.svg` / `system_architecture.svg` | Superseded — first Gen 2 concept (dual LiPo, separate adapter + ESP32) |

The CAD spec for the body segment lives with the model: [`../../gen2-st3215/cad/segments/v6/README.md`](../../generations/gen2-st3215/cad/segments/v6/README.md).

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

**Gen 2.1 radio firmware (31 Oct).**
- Fixed `surge_sign_text_command`: it returned `bool` but its caller used the value as the packet
  length, so only one byte was sent. It now returns the full length.
- At the owner's request, all wireless commands now use **plain text**. Transport was adapted from partner
  repo `Snake_SURGE` commit `7d80490`. The receiver accepts known commands without HMAC, sequence or MAC
  allowlist; use only in a controlled environment.
- Kept: watchdog Stop, torque-off read-back, joint limits, queue-overflow Stop, packet bounds/printable
  checks and EEPROM maintenance lock.
- Both boards were uploaded with servo power disconnected. **COM6 = receiver** (`28:05:a5:4f:e5:ac`),
  **COM7 = PC transmitter** (`68:09:47:5c:10:ec`). HELLO → `SURGE,2.1` exchanges passed, including after
  a transmitter-only reset. Use COM7 for the dashboard.
- `platformio.ini` transmitter monitor: `send_on_enter`, LF line endings.
- New `tests/test_text_auth.cpp` compiles for ESP32. It was not run on the host because no host compiler is installed.

**CAD (to 2 Nov).**
- Gen 3 prototype head/mid/tail parts and neutral assembly are in `generations/gen3-experimental-3d/cad/3D_motion_parts/`
  (V1) and `.../V2/` (round revision, now used by the simulation). All are named
  *PROTOTYPE fit and load validation required*.
- Holders and plates are in `cad/plate chains/`.
- Design brief: `docs/research/GEN3_WAVESHARE_HARDWARE_RESEARCH.md`.
- `generations/gen2-st3215/cad/assembly/Assem3.SLDASM` was deleted from the working tree.

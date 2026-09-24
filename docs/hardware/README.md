# docs/hardware — power & wiring design (Gen 2, ST3215)

**Current design: split power bus v3** → [`power_split_bus_v3.md`](power_split_bus_v3.md) ·
[`wiring_split_bus_v3.svg`](wiring_split_bus_v3.svg) · build guide [`../4_WIRING_DIAGRAM.md`](../4_WIRING_DIAGRAM.md) ·
parts & budget [`Updated_Hardware_Inventory.md`](Updated_Hardware_Inventory.md).

Older designs are kept here on purpose, so the reasoning behind each change stays visible.

## Design history — what we did before and what we do now

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

The CAD spec for the body segment lives with the model: [`../../gen2-st3215/cad/segments/v6/README.md`](../../gen2-st3215/cad/segments/v6/README.md).

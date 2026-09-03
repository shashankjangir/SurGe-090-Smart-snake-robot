# Waveshare Servo Driver with ESP32 — Research Notes

**Researched:** 31 August 2026
**Board:** Waveshare "Servo Driver with ESP32" (SKU 21593)
**Why:** Item 1 in [`additional_parts_spreadsheet.md`](additional_parts_spreadsheet.md) has carried a ⚠ since
2026-08-24 — input voltage range, onboard 5 V regulation and current-monitor availability were all
recorded from memory rather than a datasheet. The onboard OLED and RGB LEDs also stopped working
after the first PlatformIO upload, and I wanted the pin map before writing any code against them.

Pin numbers below are taken from **Waveshare's own firmware source**, not from a product page, so
they are authoritative. Anything I could not confirm from source is marked ⚠ and left open.

---

## 1. Pin Map — Confirmed

All values come from `#define` lines in `ServoDriver/ServoDriver.ino` in Waveshare's repo.

| Signal | GPIO | Source | Notes |
| :--- | :-: | :--- | :--- |
| Servo bus **RX** (`S_RXD`) | **18** | `ServoDriver.ino` | 1 Mbps, `SERIAL_8N1` |
| Servo bus **TX** (`S_TXD`) | **19** | `ServoDriver.ino` | half-duplex TTL |
| I²C **SDA** (`S_SDA`) | **21** | `ServoDriver.ino` | OLED bus |
| I²C **SCL** (`S_SCL`) | **22** | `ServoDriver.ino` | OLED bus |
| **RGB LED data** (`RGB_LED`) | **23** | `ServoDriver.ino` | WS2812, `NEO_GRB + NEO_KHZ800` |

Other constants worth recording:

| Constant | Value | Source |
| :--- | :-: | :--- |
| `NUMPIXELS` | 10 | `ServoDriver.ino` |
| `BRIGHTNESS` | 255 | `RGB_CTRL.h` |
| `SCREEN_WIDTH` | 128 | `BOARD_DEV.h` |
| `SCREEN_HEIGHT` | **32** | `BOARD_DEV.h` |
| `SCREEN_ADDRESS` | **0x3C** | `BOARD_DEV.h` |
| `OLED_RESET` | -1 (none) | `BOARD_DEV.h` |

**GPIO 18/19 is confirmed correct.** Our firmware README has carried a hedge — *"if ping is silent,
swap those pins"* — since the sketches were written. That hedge can be deleted; Waveshare's own
firmware uses RX 18 / TX 19, exactly as our sketches do.

**The OLED is 128×32, not 128×64.** Easy to get wrong; half the display would be missing.

**`NUMPIXELS 10` is the driver array size, not the onboard LED count.** The product description says
**two** RGB LEDs are physically on the board; the board also brings out a 5 V WS2812 expansion header,
and Waveshare sizes the array to 10 to cover strips plugged into it. Writing pixels 2–9 with nothing
attached is harmless.

---

## 2. Power

| Parameter | Value | Source |
| :--- | :--- | :--- |
| Input voltage VIN | **6–12 V DC** | Waveshare docs platform + product page |
| Power connector | 5.5 × 2.1 mm DC jack | Waveshare docs platform |
| Board dimensions | 65 × 30 mm | Waveshare docs platform |
| Mounting holes | 2.75 mm dia, 58 × 23 mm spacing | Waveshare docs platform |
| Programming | USB Type-C, onboard auto-download circuit | Waveshare docs platform |
| Buttons | BOOT (manual download), RESET | Waveshare docs platform |

Waveshare's note on VIN: input voltage and servo voltage must match — the servo bus is fed straight
from VIN, there is no separate servo rail.

### ⚠ Our documented VIN range is wrong

Every place in this repo says **"VIN 6–12.6 V"** — `firmware/README.md`, the header comment in
`assign_ids.cpp`, `PORTING_STATUS.md`, `Updated_Hardware_Inventory.md`. Waveshare says **6–12 V**.

That 12.6 figure is the **ST3215 servo** range, not the board's. The two got conflated at some point.
It matters because our stated robot power source is a 3S LiPo, and a **fully charged 3S pack sits at
12.6 V — 0.6 V above this board's rated maximum.**

Not necessarily fatal (the regulator likely has margin, and the pack drops below 12 V quickly under
load), but it is being run out of spec at the top of every charge cycle, and nothing in our docs
acknowledges that. Needs a decision before field power — see §5.

---

## 3. The board ships with the wrong servo firmware for us

Waveshare preloads **SC-series** firmware. Our ST3215 are **ST series**. Confirmed by
[issue #4](https://github.com/waveshare/Servo-Driver-with-ESP32/issues/4) on Waveshare's repo.

Consequences reported there when SC firmware meets ST servos:

- Servos come up in motor mode rather than servo mode
- **EEPROM writes fail silently** — servo IDs do not survive a power cycle
- The fix is flashing `ServoDriverST_ALL.ino.bin` (the ST build) instead

The protocol difference is visible in `STSCTRL.h`, which under the SC configuration sets
`ServoDigitalRange = 1023.0` and `ServoDigitalMiddle = 511.0`. **ST3215 is 0–4095, centre 2048** —
a 4x scale difference. Our `robot_config.py` already uses 4095/2048 correctly.

**How much this affects us: not much, but worth knowing.** We overwrite Waveshare's firmware entirely
with our own sketches, so the SC/ST demo distinction does not apply to our code path. Our
`assign_ids` writes the STS unlock, ID, lock sequence directly. But two things follow:

1. This is why the **OLED and RGB stopped working** after our first upload. They were driven by the
   factory SC demo firmware. Nothing in our firmware tree touches GPIO 21/22/23 — the peripherals
   are fine, nothing is addressing them.
2. If we ever reflash Waveshare's demo to get the web UI back, it must be the **ST** build.

---

## 4. What this resolves in our existing docs

| Open ⚠ | Status |
| :--- | :--- |
| Servo UART pins uncertain, "swap if silent" | ✅ **Resolved** — RX 18 / TX 19 confirmed from source |
| Input voltage range unverified | ✅ **Resolved** — 6–12 V, and our 12.6 V figure is wrong |
| OLED / RGB pin map unknown | ✅ **Resolved** — I²C 21/22 @ 0x3C, WS2812 on 23 |
| Onboard 5 V logic regulation | ⚠ **Still open** — not stated in any source I found |
| Current-monitor availability | ⚠ **Still open** — see below |

### The I²C bus is shared, and that is good news

`robot_config.py` puts the MPU6050 on **GPIO 21 SDA / 22 SCL** — the same pins as the OLED. This is
**not a conflict**. I²C is a bus, and the two devices sit at different addresses:

| Device | Address |
| :--- | :-: |
| OLED (SSD1306) | 0x3C |
| MPU6050 | 0x68 |

So the IMU and the display can coexist on one bus with no rewiring. Our existing pin choice was right
by luck rather than by research, but it was right.

---

## 5. Still unresolved

**⚠ INA219 — cannot confirm.** Search results for this board mention an INA219 current/voltage
monitor, but **no INA219 code appears anywhere in Waveshare's own firmware**, and the product spec
page I could reach does not list one. I suspect the search result conflated this board with the
*General Driver for Robots*, which is a different Waveshare product that does carry one. Treat as
**not present until proven otherwise** — an I²C scan (expect 0x40–0x4F if present) settles it in
thirty seconds and is worth running before we design around onboard current sensing.

This matters: `OBSTACLE_CURRENT_THRESHOLD_MA` is still at a placeholder 1200 mA, and if there is no
INA219 we calibrate it from the servos' own `PRESENT_CURRENT` register (addr 69) instead.

**⚠ Onboard 5 V regulation.** Still not stated anywhere I could find. A multimeter check on the 5 V
pin with 12 V on VIN answers it, and it gates whether the MPU6050 and any future peripheral can be
powered from the board.

**⚠ The 12.6 V question.** Options, cheapest first: accept the 0.6 V overshoot and run the pack from
~12.3 V rather than full; or add a small series drop; or confirm with Waveshare support what the
absolute maximum actually is. Needs deciding before the LiPo goes on the robot.

**Sources not reachable.** `waveshare.com/wiki` returned 403 and the user-manual PDF would not parse.
The GPIO data above comes from the GitHub source, which is better evidence anyway. The wiki is worth
a manual browser visit for the schematic and the regulator question.

---

## 6. Sources

- [Servo Driver with ESP32 — Waveshare docs platform](https://docs.waveshare.com/Servo_Driver_with_ESP32) — voltage, dimensions, connectors, onboard components
- [waveshare/Servo-Driver-with-ESP32 — `ServoDriver.ino`](https://github.com/waveshare/Servo-Driver-with-ESP32) — **all GPIO defines**
- [Issue #4 — SC vs ST firmware](https://github.com/waveshare/Servo-Driver-with-ESP32/issues/4) — factory firmware series mismatch
- [Servo Driver with ESP32 — Waveshare Wiki](https://www.waveshare.com/wiki/Servo_Driver_with_ESP32) — 403 to automated fetch; visit manually
- [User manual PDF](https://files.waveshare.com/upload/d/d4/Servo_Driver_with_ESP32_User_Manual.pdf) — would not parse; open manually for the schematic

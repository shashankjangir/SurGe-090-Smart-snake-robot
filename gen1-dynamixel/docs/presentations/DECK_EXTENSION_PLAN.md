# SURGE-090 Progress Review Deck — Extension Plan

**Source deck:** `Smart_Snake_Robot_SURGE090_Progress_Review  -  Repaired.pptx` (15 slides)
**Output deck:** `Smart_Snake_Robot_SURGE090_Progress_Review_v2.pptx` (29 slides)
**Plan date:** 30 August 2026 · **Revised:** 3 September 2026
**Decisions taken:** **append-only** · existing 15 slides sealed · 14 slides of new work · candid pivot framing

> **Revision note (3 Sep 2026).** The original plan edited nine existing slides. That is no longer the
> approach. **Slides 1–15 are not to be modified — not their content, not their order, not their
> numbering.** Every correction is concentrated onto one new slide (16), and the deck grows purely by
> appending. §3 records what was dropped and what that costs.

---

## 0. What the deck currently says vs. what the project currently is

The deck is a **25% progress review** written entirely around Dynamixel XL330. Since it was built, the
project changed actuator families. Four slides state things that are false as of today:

| Slide | Current claim | Reality (`Updated_Hardware_Inventory.md`, 30 Aug 2026) |
|---|---|---|
| 10 | XL330 · U2D2 · Power Hub "ORDERED — AWAITING DELIVERY" | Order dead. XL330 unobtainable in India. **10× ST3215 in hand** |
| 12 | "Eight Phases · Currently at 25%" | Phase 3 (Fabrication & Assembly) |
| 13 | "Prototype fabrication started" | Gen 1 segments printed; Gen 2 v6 not yet printed |
| 15 | Roadmap step 1 = "Receive Dynamixel XL330 motors" | Motors received — different motors. Roadmap is obsolete |

Everything else in slides 1–14 remains true, because it is either general (the smart-bus-servo argument
on slides 2–3), Gen-1 historical fact (slides 7–9, 11), or actuator-independent (slides 4, 14).

### The framing this plan now adopts

**Those four slides stay exactly as they are.** They are not errors to be scrubbed — they are an
accurate record of what the project believed on the day of the 25% review. The deck becomes a
*time capsule plus an update*, not a revised history.

That is defensible for a progress review, and arguably stronger than silent correction: a reviewer who
saw the original deck can see precisely what changed and why, instead of wondering whether the earlier
claims were ever made. It also removes any risk of the deck appearing to quietly erase a failed
procurement.

**But it only works if the corrections are stated somewhere explicit.** A deck that leaves
"ORDERED — AWAITING DELIVERY" standing on slide 10 and never says otherwise is simply wrong, and a
reviewer who reads only the first half is misled. So slide 16 carries a **corrections register** — an
on-slide table naming each superseded claim and its current status.

That makes slide 16 the load-bearing element of the entire deck. In the previous plan the corrections
were spread across nine slides and no single one had to carry much; now one slide does all of it. It
must be built first and reviewed hardest — see §4.

**One structural consequence, and it is favourable.** The obsolete Gen-1 roadmap is slide 15, the last
of the sealed slides. Slide 16 lands immediately after it. So the deck reads: *here was the plan …
here is what changed* — the correction arrives in the very next breath, with no stale claim left
hanging across an act break. The append-only constraint produces better adjacency here than the
original reorder did.

**This plan therefore does three things:** leave slides 1–15 untouched, insert one correction slide (16),
and append 13 further slides covering Generation 2, ending with a new roadmap at 29.

---

## 1. The deck's existing design system

Measured from the source file. Reproduce these numbers exactly — do not eyeball.

### 1.1 Canvas and grid

| Property | Value |
|---|---|
| Slide size | `12192000 × 6858000` EMU = **13.333″ × 7.5″** (16:9) |
| Left / right margin | **0.58″** → content right edge at 12.75″ |
| Content width | **12.17″** |
| Content top (new slides) | **1.33″** |
| Content bottom | **7.39″** (0.11″ float above slide edge) |
| Layout | one `DEFAULT` layout; every slide is absolutely-positioned shapes |

Column systems in use:

| System | Geometry |
|---|---|
| **6-up cards** | W `1.92`, gap `0.11`, pitch `2.03` → L = 0.58, 2.61, 4.64, 6.67, 8.69, 10.72 |
| **2-up cards** | W `5.97` → L = 0.58 and 6.78 (gap 0.23) |
| **Asymmetric split** | left panel W `6.94` @ 0.58 · `ColSep` hairline @ 7.67 · right rail W `4.97` @ 7.78 |

### 1.2 Palette

The deck is a **light deck** — pale cool-grey page, deep-navy type, teal accent. It is *not* a dark deck.

| Hex | Role | Where |
|---|---|---|
| `16223A` | Primary type / dark panel fill | body text, `ObjBar` fill, chevrons |
| `121A2E` | Dark slide background | slide 1 only |
| `0E96AC` | **Teal accent** | `TopBar`, `AccentLine`, eyebrow text, card strips |
| `0A7A8E` | Deep teal | badge fills, "KEY OUTCOME" label |
| `F6F8FB` | Page background | slides 4–13 |
| `F4F6F9` / `FFFFFF` | Page background | slide 14 / slide 15 |
| `FFFFFF` | Card fill | all cards |
| `F7F9FC` | Tinted card fill | `DelCard` |
| `EAF7FA` | Teal-tint callout fill | `OutcomeBox` |
| `E2E8F0` / `D0D7E5` | Rules, separators | `ColSep` |
| `6B7280` / `6B7890` | Muted caption type | image captions |
| `1F9D55` | **Green — complete** | status pills, legend |
| `1E6FD6` | **Blue — in progress** | status pills, legend |
| `E8821E` / `E08A1E` | **Amber — planned/future** | status pills, legend |
| `2BD4E8` | Bright cyan highlight | sparing |

The green/blue/amber triad is a **semantic status code** used consistently across slides 6, 12 and 15.
New slides must obey it: green = done, blue = in progress, amber = planned. Never decorative.

### 1.3 Type scale

**Calibri throughout** (789 runs). Arial appears 58 times, Wingdings 6 times (tick glyphs) — treat both
as legacy, use Calibri for all new text.

| Element | Size | Weight | Colour |
|---|---|---|---|
| Eyebrow (variant B) | **11 pt** | bold | `0E96AC` |
| Eyebrow (variant A) | 12 pt | bold | `16223A` |
| Main title (variant B) | **24 pt** | bold | `16223A` |
| Main title (variant A) | 30 pt | bold | `16223A` |
| Section bar label | 10.5 pt | bold | `FFFFFF` on `16223A` |
| Card heading | 12 pt | bold | `16223A` |
| Body paragraph | 10.5 pt | regular | `16223A` |
| List item | 10 pt | regular | `16223A` |
| Card list item | 9 pt | regular | `16223A` |
| Legend label | 9 pt | bold | `16223A` |
| Caption | 10.5 pt | regular | `6B7280` |
| Badge text | 11 pt | bold | `FFFFFF` |

### 1.4 Two header variants — and which to use

The deck contains two title treatments. Slides 14–15 are the newest and introduced a named,
systematised header. **All new slides use variant B.**

**Variant A** — slides 4–13:
```
Eyebrow   L 0.60  T 0.42  W 9.00   H 0.30   12pt bold
Title     L 0.58  T 0.70  W 10.40  H 0.70   30pt bold
(no top bar, no accent line)
```

**Variant B** — slides 14–15 · **the target pattern**:
```
TopBar      L 0.00  T 0.00  W 13.33  H 0.08   fill 0E96AC
Eyebrow     L 0.58  T 0.19  W 9.72   H 0.25   11pt bold 0E96AC
AccentLine  L 0.58  T 0.47  W 12.17  H 0.01   fill 0E96AC
MainTitle   L 0.58  T 0.56  W 12.17  H 0.56   24pt bold 16223A
```

Variant B buys 0.22″ more content height and reads more deliberately. Accept the mixed A/B state in
slides 4–13 — retrofitting 10 slides is out of scope and low value.

> **Note on house style:** general slide-design guidance says avoid accent rules under titles. This deck
> uses them as its structural motif, on every recent slide. Deck consistency wins. Keep the rule.

### 1.5 Reusable component anatomy

Copy these verbatim; they are the deck's vocabulary.

**Card** (2-up or 6-up):
```
Card    fill FFFFFF                       ← panel
Strip   same L/T/W, H 0.04, status colour ← top edge accent
Head    L+0.11  T+0.14  H 0.31  12pt bold
List    L+0.11  below head    9–10pt
```

**Numbered pill** (slide 15 process row):
```
Pill    W 1.92  H 0.64  fill = status colour
Num     circle Ø0.36 at Pill L+0.11, T+0.14, fill FFFFFF
NumT    same box, 13pt bold, colour = status colour
PillT   L+0.53  W 1.33  H 0.64  10pt bold FFFFFF
Chev    Ø0.25 at pill right edge −0.18, T+0.20, fill 16223A   (between pills only)
```

**Section bar** (right-rail label, slide 14):
```
Bar   W 4.97  H 0.28  fill 16223A  ·  10.5pt bold FFFFFF
Text  W 4.97  starting T = Bar.T + 0.30
```

**Legend row:**
```
Lg   Ø0.15 dot, status colour   ·   LgT  L+0.21, T−0.07, W 2.08, 9pt bold
pitch 2.08 between entries
```

**Callout box:**
```
Box   fill EAF7FA  H 0.44–0.56
      run 1: LABEL   9.5pt bold 0A7A8E
      run 2: prose   9.5pt regular 16223A
```

### 1.6 Speaker notes

Slides 1, 4–13 carry notes; 2, 3, 14, 15 do not. **Every new slide gets notes** — 2–3 sentences, the
argument the presenter makes out loud, not a re-read of the slide.

---

## 2. Final deck order

```
ACT I — SEALED (do not touch)             ACT II — Generation 2 (all new)
 1  Title                       ·          16  What Changed                 ★ dark
 2  Actuator selection study    ·          17  ST3215 actuator re-selection ★
 3  Daisy-chain & selection     ·          18  Gen 1 → Gen 2 architecture   ★
 4  Goals & outcomes            ·          19  Onboard firmware stack       ★
 5  Work completed              ·          20  Feetech bus & control table  ★
 6  System architecture         ·          21  CAD evolution v4→v5→v6       ★
 7  CAD design development      ·          22  v6 load path & retention     ★
 8  Prototype fabrication       ·          23  v6 friction & torque budget  ★
 9  Raspberry Pi platform       ·          24  Electrical & power           ★
10  Hardware procurement        ·          25  Safety architecture & gaps   ★
11  Repository & documentation  ·          26  Gait & evasion FSM           ★
12  Project timeline            ·          27  Verification & mock results  ★
13  Current achievements        ·          28  Inventory, budget & gaps     ★
14  Simulation & validation     ·          29  Roadmap to demonstration     ★
15  Roadmap (Gen 1, obsolete)   ·
```
`·` **untouched — content, order and numbering all frozen** · `★` new

**14 new slides, zero edits.** Every slide 1–15 keeps its existing number, so any cross-reference,
handout or print of the original deck stays valid.

Slide 16 is a **dark** slide (`121A2E`), mirroring slide 1. It marks the act break, and its darkness
does real work here: it is the visual signal that everything before it is historical and everything
after it is current.

**Slide 15 is deliberately left obsolete.** It is the Gen-1 roadmap whose first step is "Receive
Dynamixel XL330 motors". It stays because it is sealed — and because slide 16 immediately answers it.
Slide 29 is a *new* roadmap, not a rewrite of 15; the deck ends up carrying both, which is the honest
representation of a project that changed direction mid-flight.

---

## 3. Part A — no edits, and where the corrections went instead

**There is no Part A any more.** The nine slide edits the original plan specified are cancelled. This
section exists to record what they were, so nobody re-derives them later and wonders why they were
dropped.

### 3.1 The cancelled edits

| Slide | Edit that was planned | Now handled by |
|---|---|---|
| 1 | Subtitle → "Smart Serial Bus Servos"; add generation line; fix repo URL | Slide 16 title block carries the Gen-2 framing. **Repo URL stays stale — see 3.3** |
| 2 | Table head → "Smart Serial Bus Servo" | Slide 17 restates the trade study against ST3215 |
| 3 | Retitle to "Actuator Selected — Generation 1"; add key-learning line | Slide 16 station 1; slide 17 makes the vendor change explicit |
| 5 | Stat block → 24/2/10; completion 25% → ~55%; phase footer | Slide 16 corrections register (progress row) |
| 6 | "Superseded" ribbon over the architecture diagram | Slide 18 shows Gen 1 → Gen 2 side by side |
| 10 | Three-column procurement rewrite, cancelled/received | **Slide 16 corrections register (row 1) + slide 28 inventory** |
| 12 | Phase marker 2 → 3; Phase 4 retitled | Slide 16 corrections register (phase row) |
| 13 | Six achievement cards replaced | Slide 27 verification + slide 28 inventory |
| 15 | Roadmap full rewrite | **Slide 29 — a new roadmap. Slide 15 stays obsolete.** |

The full text of the cancelled edits is preserved in the git history of this file (revision of
3 Sep 2026) if it is ever needed again.

### 3.2 What this costs

Three things get worse under the append-only constraint. None is fatal, but they should be known
rather than discovered during the review.

**The deck is longer and partly self-contradicting by design.** 29 slides instead of 28, and slides 10,
12, 13 and 15 still assert things slide 16 contradicts. A reviewer skimming only the first half comes
away misinformed. Mitigation: slide 16 is dark and unmissable, and the corrections register names slide
numbers explicitly so the contradiction is deliberate and visible rather than accidental.

**Two roadmaps.** Slide 15 (Gen 1, obsolete) and slide 29 (current). Presented well this reads as
honesty about a changed plan; presented badly it reads as an editing failure. The speaker notes on
slide 29 must open by naming slide 15 and saying plainly that it is superseded.

**Slide 16 is now a single point of failure.** Every correction in the deck lives on it. If it is
cut for time, skipped, or overruns its text box, the deck reverts to being straightforwardly wrong.
It must be built first, and it must not be the slide that gets dropped when the talk runs long.

### 3.3 One correction that has nowhere to go

The repo URL on slide 1 is stale — it reads `surge090`, and the canonical remote is
`github.com/shashankjangir/SurGe-090-Smart-snake-robot`.

This is **not** a Gen-1-versus-Gen-2 fact, so it does not belong in a corrections register about the
actuator pivot. But it is a live error: anyone typing it in during the review lands nowhere.

Options, in order of preference:

1. Put the correct URL on slide 29 (the closing slide) — a reviewer copying a link takes it from the
   last slide anyway, and the deck ends on something that works.
2. Treat the URL as a factual defect rather than a design edit and fix slide 1 as a one-line exception
   to the freeze. **Needs an explicit decision — do not assume it.**
3. Leave it. Only acceptable if the deck is never distributed as a file.

Recommendation: option 1, with option 2 raised for a decision. Recorded as open question 4 in §6.

---

## 4. Page-wise procedure — Part B: the 14 new slides

Each entry gives eyebrow / title / layout / content / source / notes. All use header variant B (§1.4).

---

### Slide 16 — What Changed `★` **dark slide** — **build this one first**

This is the hinge of the deck and the only slide that corrects the record. Everything slides 1–15 get
wrong is answered here or nowhere. Build it before any other new slide, and do not let it be cut.

- **Background:** `121A2E` (mirrors slide 1 — marks the act break)
- **Eyebrow:** `WHAT CHANGED SINCE THIS REVIEW` · **Title:** `Generation 2 — Corrections & Cause` (white on dark)
- **Type inversion:** body `E2E8F0`, captions `6B7890`, cards `1A2440` fill with `2A3958` edges

**Layout — three bands, top to bottom:**

```
T 1.33   CORRECTIONS REGISTER   full width 12.17"   ~2.5"   ← upper half, the priority
T 4.00   3-station timeline     full width 12.17"   ~1.0"
T 5.15   2-up card pair         5.97" each          ~2.0"
```

If the slide overruns, **cut from the cards, never from the register.** The cards are argument; the
register is fact, and the register is why this slide exists.

#### Band 1 — Corrections register

A 4-column table, 9 pt card-list type. Column heads: `SLIDE` · `THAT DECK SAID` · `TODAY` · `WHY`.
Status dots use the semantic triad from §1.2 — amber for superseded, green for resolved.

| Slide | That deck said | Today | Why |
|---|---|---|---|
| **10** | XL330 · U2D2 · Power Hub — *"ORDERED — AWAITING DELIVERY"* | **Order cancelled.** 10× ST3215 + Waveshare ESP32 driver in hand | Part unobtainable in India |
| **12** | *"Eight Phases · Currently at 25%"* | **Phase 3 — Fabrication & Assembly** | 8 weeks of Gen-2 work since |
| **13** | *"Prototype fabrication started"* | Gen-1 segments printed; **Gen-2 v6 not yet printed** | Design of record changed |
| **15** | Roadmap step 1 — *"Receive Dynamixel XL330 motors"* | **Superseded — see slide 29** | Different motors received |

- **Header row:** `1A2440` fill, `0E96AC` label type, 9 pt bold.
- The `SLIDE` column must be visually strong (11 pt bold, `2BD4E8`) — the point is that a reviewer can
  navigate back to the exact slide being corrected.
- **Do not soften the wording.** "Order cancelled" not "procurement revised". The register earns its
  credibility by being blunt, and a reviewer who spots hedging here distrusts the rest of the deck.

#### Band 2 — Three-station timeline

| Station | Content |
|---|---|
| **Constraint** | 2 of 10 XL330 obtained. Part became unavailable in the Indian market. |
| **Six-week stall** | Control stack for 10 motors written against hardware that did not exist. |
| **Re-architecture** | `a32b675 · 2026-08-20 · "No dynamixel in the market. So switched to Servos"` |

#### Band 3 — Two cards

- Left card **`WHAT FORCED IT`** — component supply, not engineering preference. State it in those words.
- Right card **`WHAT IT BOUGHT`** — 5.7× joint torque (0.52 → 2.94 N·m) · 12 V rail supporting a larger
  robot · sourceable in India. Label these **consequences of the switch, not its reason**.

#### Closing callout

`1A2440` fill, teal label: *"A re-architecture under a procurement constraint is a legitimate
engineering result. The torque budget that justifies ST3215 now exists — see slide 23."*

- **Source:** `README.md` §"Why there are two generations"; commit `a32b675`;
  `Updated_Hardware_Inventory.md` (30 Aug 2026) for every "Today" cell
- **Notes:** Open by saying the deck up to this point is unchanged from the 25% review and is being
  left that way deliberately — the reviewer should know the earlier slides are a record, not a claim.
  Then walk the register top to bottom; it takes 40 seconds and it pre-empts every "but slide 10 says…"
  interruption in the second half. Say the honest version of the pivot out loud. The follow-up question
  is "where is your torque budget?" — answer that it is slide 23, and that it did not exist at the 25%
  review.
- **QA:** every "Today" cell must be traceable to `Updated_Hardware_Inventory.md`. If a cell cannot be
  sourced, cut the row rather than soften it.

---

### Slide 17 — ST3215 actuator re-selection `★`

- **Eyebrow:** `ACTUATOR RE-SELECTION` · **Title:** `From XL330 to Waveshare ST3215`
- **Layout:** asymmetric split — hero photo left (6.94″), comparison table right (4.97″)
- **Left:** `gen2-st3215/media/Screenshot 2026-08-17 100520.png` in `ImgFrame`, caption
  *"Waveshare ST3215 · 45.22 × 24.72 × 37.25 mm · metal-geared serial bus servo"*
- **Right rail:** section bar `SIDE-BY-SIDE`, then table

| | XL330-M288-T | **ST3215** |
|---|---|---|
| Stall torque | 0.52 N·m @ 5 V | **2.94 N·m @ 12 V** |
| Stall current | 1.5 A | 2.7 A |
| Free-run current | ~70 mA | ~200 mA |
| Mass | 18 g | ~60 g *(assumed — verify)* |
| Encoder | 12-bit, 0.088°/step | 12-bit, 0–4095 |
| Protocol | ROBOTIS 2.0 | Feetech SMS/STS |
| Baud | 57 600 | **1 000 000** |
| Rail | 5 V | 6.0–12.6 V |
| Availability (India) | ✗ | ✓ |

- Callout: *"The 60 g figure is assumed, not weighed, and it sets the whole torque budget.
  `probe_st3215.py` flags it as an open item."*
- **Source:** `Updated_Hardware_Inventory.md`; `Dynamixel_Selection.md`; `cad/segments/v6/README.md`
- **Notes:** The trade study on slides 2–3 is not invalidated — its criteria were about the servo
  *class*. ST3215 satisfies every one of them and adds torque.

---

### Slide 18 — Gen 1 → Gen 2 architecture `★`

- **Eyebrow:** `SYSTEM ARCHITECTURE` · **Title:** `Generation 1 vs Generation 2 Control Topology`
- **Layout:** two 5.97″ cards side by side, each a vertical block diagram
- **Left card** (grey strip, "SUPERSEDED"): Raspberry Pi → USB → U2D2 + PHB → X3P TTL 57 600 → XL330 ×10.
  Tethered, 5 V, Python master.
- **Right card** (teal strip, "CURRENT"): Pi 5 `base_station.py` → USB 115 200 → ESP32 #2 →
  **ESP-NOW 2.4 GHz broadcast** → ESP32 #1 (`robot_esp32`) → UART GPIO 18 RX / 19 TX @ 1 Mbps →
  Waveshare Bus Servo Driver → ST3215 ×10. Untethered, 3S LiPo direct to VIN.
- Bottom strip — the four changes that matter: **master moved onto the robot** (Pi → ESP32) ·
  **tether removed** (USB → ESP-NOW) · **bus 17× faster** (57.6 kbps → 1 Mbps) ·
  **rail raised** (5 V → 12 V).
- **Source:** `README.md` §System Architecture; `PORTING_STATUS.md`; `gen2_code_review.md` §1
- **Notes:** The key architectural move is that control left the Pi. The Pi is now a telemetry and
  vision host, not the gait master.

---

### Slide 19 — Onboard firmware stack `★`

- **Eyebrow:** `EMBEDDED FIRMWARE` · **Title:** `Four ESP32 Sketches, Two Operating Modes`
- **Layout:** 2-up mode cards on top (bench / field), 4-up sketch cards below
- **Top left `BENCH MODE`:** PC `main.py` @ 50 Hz → USB CDC 1 Mbps → ESP32 as transparent bridge → bus
- **Top right `FIELD MODE`:** ESP32 runs gait CPG + IMU + stall FSM onboard; ESP-NOW telemetry to base
- **Warning callout:** *"Mutually exclusive on the same board — flash either `usb_servo_bridge` or `robot_esp32`."*

| Sketch | Lines | Role |
|---|---|---|
| `assign_ids` | 52 | One-servo ID programming, EEPROM unlock reg 55 |
| `usb_servo_bridge` | 28 | Transparent USB CDC ↔ servo UART @ 1 Mbps |
| `robot_esp32` | **365** | Field master: gait, MPU6050, stall FSM, ESP-NOW |
| `base_esp32` | 69 | ESP-NOW receiver → USB serial 115 200 → Pi 5 |

- Footer: `Board: ESP32 Dev Module · Servo UART GPIO 18 RX / 19 TX · never Mean Well 5 V on driver VIN`
- **Source:** `firmware/README.md`; `PORTING_STATUS.md`; line counts from the repo
- **Notes:** ESP-NOW telemetry is **broadcast**, so the base needs no hardcoded robot MAC — that was a
  deliberate simplification.

---

### Slide 20 — Feetech bus protocol & control table `★`

- **Eyebrow:** `COMMUNICATION LAYER` · **Title:** `Feetech SMS/STS Protocol at 1 Mbps`
- **Layout:** packet-anatomy strip across the top, then 2-up: register table left, decoding notes right
- **Packet strip** — six labelled cells: `FF FF` │ `ID` │ `LEN` │ `INST` │ `PARAMS` │ `CHECKSUM`,
  with `checksum = ~(ID + LEN + INST + PARAMS) & 0xFF` beneath

| Item | Addr | Bytes |
|---|---|---|
| ID | 5 | 1 |
| EEPROM lock | 55 | 1 |
| TORQUE_ENABLE | 40 | 1 |
| ACC | 41 | 1 |
| GOAL_POSITION | 42 | 2 |
| PRESENT_POSITION | 56 | 2 |
| PRESENT_CURRENT | 69 | 2 |

- Right card `IMPLEMENTATION NOTES`: half-duplex, single wire · little-endian · sync-write packs
  position + time + speed · **current is sign-magnitude, bit 15 = direction, LSB = 6.5 mA** (Gen 1 was
  two's complement — a real porting trap) · EEPROM ships **locked**; ID writes are silently rejected
  without the register-55 unlock.
- Callout: *"Written from scratch as `feetech_protocol.py` (133 lines) — no vendor SDK. `servo_driver.py`
  (172 lines) is the HAL above it."*
- **Source:** `gen2-st3215/README.md` §Control table; `PORTING_STATUS.md`; `src/feetech_protocol.py`
- **Notes:** This is the single largest software deliverable of Generation 2 — the Dynamixel SDK did the
  equivalent job in Gen 1 and had to be replaced entirely.

---

### Slide 21 — CAD evolution v4 → v5 → v6 `★`

- **Eyebrow:** `MECHANICAL DESIGN` · **Title:** `Three Iterations to a Printable Segment`
- **Layout:** 3-up cards (W 3.85, L 0.58 / 4.74 / 8.90), each with a render thumbnail above text
- **Assets:** `cad/segments/v4/preview_v4.png` · `v5/preview_v5_final.png` · `cad/v6_views.png`
  *(all need cropping — see §5)*

| | Strip | Content |
|---|---|---|
| **v4** | green | Baseline CadQuery model. Established the double-shear yoke and 58 mm joint pitch. |
| **v5** | amber | Wider yoke. Sidewall thickness bug — `M_WID` set to the case *height* (37.80) instead of its width (24.72), collapsing cradle walls from 3.74 mm to 0.20 mm. Superseded. |
| **v6** | teal | **Design of record.** Fixes three defects that only appeared when the parts were *measured*. |

- Bottom callout `WHAT MEASURING FOUND` — the three v4/v5 defects, stated numerically:
  1. **Ground contact inverted** — bottom yoke plate at z = −3.45 sat 0.45 mm *below* the belly scales.
     1006 mm² of smooth plate vs 66 mm² of scale: **94% of ground contact was the wrong surface**, and
     the friction feature was inert.
  2. **Scales swept the wrong axis** — along Y, resisting fore-aft motion and sliding freely sideways.
     Lateral undulation needs the opposite, so the feature actively fought the gait.
  3. **No motor retention** — 0.4 mm slip-fit pocket, open at the top; the servo lifted straight out.
- **Source:** `cad/segments/v6/README.md` §"Why v6 exists"
- **Notes:** The lesson is that all three defects passed visual review and only surfaced under
  measurement. v6's self-check block now asserts ground contact by face count and area, so defect 1
  cannot be reintroduced silently.

---

### Slide 22 — v6 load path & motor retention `★`

- **Eyebrow:** `DESIGN OF RECORD` · **Title:** `Double-Shear Joint and Conformal Retention`
- **Layout:** asymmetric split — `cad/v6_chain.png` or `cad/assembly_45deg.png` left, two stacked cards right
- **Left caption:** *"Three v6 segments chained, joints at ±35° — zero interference through the full ±45° sweep"*
- **Right card 1 `LOAD PATH`:** A bus servo's case screws are for fixed mounting only, so in a chained
  module **only the horn and rear idler bolt circles transmit load**. Both yoke plates bolt to the
  neighbour's Ø19.2 discs on the same R7.00 circle, putting the joint in **double shear** instead of
  cantilevering off the horn. At stall: **105 N per bolt · 21.4 MPa in the screws · 9.7 / 11.1 MPa
  bearing in PLA — factor of 5 on the limiting material.**
- **Right card 2 `RETENTION`:** The case underside is **terraced, not flat** — the lowest face is only
  9.43 mm long. v6's first attempt drove screws up at x = 25.25 where the case is 3.40 mm above the
  seat plane: they crossed an air gap and clamped nothing, and both model and verifier passed. Fixed
  with two ribs rising to 4.05 mm, bonded to floor and rear wall. Fasteners are **M2, not M2.5** —
  the drawing's concentric Ø1.6/Ø2.0 hole pairs are the M2 tap-drill/nominal pattern.
- **Red-flag callout:** *"This scheme rests on one unverified physical assumption — that the rear idler
  disc rotates with the horn. If it is fixed to the case, bolting both plates locks the joint solid and
  the first command strips a gear. Five seconds to check by hand; item 1 on the probe checklist."*
- **Source:** `cad/segments/v6/README.md` §Load path, §"The terraced underside"
- **Notes:** The clamped-nothing screw story is worth telling — it is a concrete example of a model and
  its checker sharing a wrong assumption.

---

### Slide 23 — v6 friction, keels & torque budget `★`

- **Eyebrow:** `LOCOMOTION PHYSICS` · **Title:** `Anisotropic Friction and the Torque Budget`
- **Layout:** three stat callouts across the top, then 2-up: keel geometry left, torque budget right
- **Stat row** (large figures, deck's 30 pt+ treatment): **7** keels per segment · **2202 mm²**
  ground contact across 11 segments · **4.9 kPa** contact pressure
- **Left card `KEEL GEOMETRY`:** Seven keels run **along** the body at y = 0, ±3.20, ±6.40, ±14.75,
  tapering 2.20 → 1.10 mm over 1.60 mm height — a 19° flank, self-supporting in PLA. Running
  lengthwise they resist sideways slip and slide forward: the anisotropy lateral undulation needs.
  Outermost pair at ±14.75 of a 16.50 half-width gives roll stability inside the body envelope.
- **Right card `TORQUE BUDGET`** (at µ = 0.8, against 2.94 N·m stall):

| Manoeuvre | Torque | % of stall |
|---|---|---|
| Undulation (normal gait) | 0.207 N·m | **7 %** |
| Pivot grounded body about one joint | 2.78 N·m | **95 %** |

- **Amber warning callout:** *"Do not slew a stationary robot on the ground — lift it, or let it
  undulate into position. This is a constraint on how the robot is driven, not a defect in the part."*
- **Teal callout — the honest gap:** *"The friction ratio has never been measured. Print one v6 segment
  and measure fore/aft traction on the target surface before committing to ten. This single measurement
  decides whether the gait translates the robot or undulates it in place."*
- **Source:** `cad/segments/v6/README.md` §"Friction and gait"
- **Notes:** This slide is the answer to slide 16's implied question. Gen 1 had no torque budget; Gen 2
  does, and it says the gait is comfortable and one specific manoeuvre is not.

---

### Slide 24 — Electrical & power architecture `★`

- **Eyebrow:** `ELECTRICAL SYSTEM` · **Title:** `Three Power Paths, One Servo Rail`
- **Layout:** 3-up cards, one per path, plus a spec strip below
- **Card 1 `ROBOT — FIELD` (teal):** 3S LiPo 1800 mAh (11.1–12.6 V) → inline fuse → XT60 loop key →
  1000 µF 25 V bulk cap → Waveshare driver VIN → 10× ST3215 + onboard ESP32 + MPU6050.
  **No conversion — the pack sits inside the ST3215 6.0–12.6 V window.**
- **Card 2 `BENCH — ID PROGRAMMING` (blue):** Mean Well LRS-100-5 (5 V 20 A) → XL6009 boost → 12 V,
  **~1.5 A max** → driver VIN → **1 servo only**.
- **Card 3 `BASE STATION` (blue):** Mean Well 5 V → Pi 5 (needs 5 V 5 A USB-C) → Camera Module 3 via
  CSI-2 + ESP32 #2 on USB.

| Quantity | Value |
|---|---|
| Pack energy | 20.0 Wh (11.1 V × 1800 mAh) |
| Worst case, 10 servos stalled | **27 A** |
| Runtime @ 2 / 4 / 6 A | ~43 / ~22 / ~14 min (80% DoD) |

- **Two red callouts, both real traps:**
  - *"Mean Well 5 V is **below** the ST3215 6.0 V minimum. It can never feed the servo bus."*
  - *"The Mean Well + XL6009 bench path peaks near 18 W. A 10-servo stall is 324 W. Never attempt
    10-servo operation through the boost converter."*
- **Source:** `Updated_Hardware_Inventory.md` §Power Architecture; `README.md` §v2.0 power figures
- **Notes:** The single-pack design replaced a 2-pack parallel scheme. It loses 40% of the energy but
  removes the reverse-charge failure mode between packs entirely.

---

### Slide 25 — Safety architecture & critical gaps `★`

- **Eyebrow:** `SAFETY ENGINEERING` · **Title:** `Designed Protections and What Is Still Missing`
- **Layout:** 2-up — designed layers left (teal strip), gap register right (amber strip)
- **Left `PROTECTION LAYERS — DESIGNED`**, each with its stated reason:
  1. **Inline fuse upstream of the load** — bounds fault current at the pack.
  2. **XT60 loop key** — spark-safe master disconnect; the pack is never broken under load.
  3. **Low-voltage alarm at ≤ 3.4 V/cell** — LiPo cells are damaged below 3.0 V.
  4. **1000 µF 25 V low-ESR bulk cap** — absorbs servo-reversal transients on a 27 A-capable rail.
  5. **>10 MΩ rail-to-ground insulation check before first power-up**, with an explicit halt condition.
  6. **HC-SR04P only** — a standard HC-SR04 drives ECHO at 5 V and destroys the ESP32 input stage.
- **Right `GAP REGISTER — NOT YET ACQUIRED`** with severity chips:

| Item | Severity |
|---|---|
| Inline fuse + holder | CRITICAL |
| LiPo alarm / BMS | CRITICAL |
| XT60 loop key | CRITICAL |
| LiPo C-rating & connector unverified | HIGH |
| Balance charger + LiPo-safe bag | HIGH |
| Waveshare driver VIN range unverified | HIGH |
| 1000 µF bulk capacitor | MEDIUM |

- **Bottom callout:** *"Three CRITICAL items gate first power-up. Total cost ≈ ₹700. This is the
  cheapest and most urgent line in the project."*
- **Source:** `Updated_Hardware_Inventory.md` §"Risk & Gap Analysis", §BOM
- **Notes:** Present the gap register as deliberate disclosure, not oversight. The architecture is
  designed; the parts are ₹700 and not yet bought. That is a purchasing action, not an engineering one.

---

### Slide 26 — Gait generation & evasion FSM `★`

- **Eyebrow:** `CONTROL ALGORITHM` · **Title:** `Serpenoid Gait and Current-Stall Evasion`
- **Layout:** equation band across the top, then 2-up: parameter table left, FSM diagram right
- **Equation band** (`16223A` panel, monospace-styled):
  ```
  wave_phase = (wave_dir · frequency · t) − (i · phase_shift)
  pos        = center_pos + amplitude · sin(wave_phase) + bend
  ```

| Parameter | Value | Physical meaning |
|---|---|---|
| `GAIT_AMPLITUDE` | 400 ticks | **35.2°** peak joint deflection |
| `GAIT_FREQUENCY` | 3.0 rad/s | **0.477 Hz** cycle (period 2.09 s) |
| `GAIT_PHASE_SHIFT` | 1.2 rad | per joint index |
| `GAIT_TURN_OFFSET` | 300 ticks | **26.4°** uniform spine bias |
| `PLANAR_ALL_YAW` | `True` | **all 10 joints driven** — Gen 1 held the 5 pitch joints fixed |
| `GOAL_SPEED` / `GOAL_ACC` | 2400 / 50 | limits first-move slam |

- **FSM diagram** (right): `SLITHER` ──(|I| > 1200 mA)──▶ `SLITHER_REV` (2.5 s) ──▶ `SLITHER_TURN`
  (4.0 s) ──▶ `SLITHER`
- **Callout 1 — the contribution:** *"Collision detection is **sensorless**. Motor current is the tactile
  signal; no proximity or force sensor exists on the robot."*
- **Callout 2 — two honest limitations, amber:**
  - *"Detection is suppressed during the manoeuvre — the robot is blind for the full **6.5 s**."*
  - *"Turn direction uses the **sign** of present current, which reports torque direction, not which side
    the obstacle is on. Genuine side-awareness needs joint-index/phase correlation."*
- **Callout 3:** *"The 1200 mA threshold is a starting guess between ~200 mA free-run and 2700 mA stall,
  not a bench measurement. Calibration is step 2 of the roadmap."*
- **Source:** `gen2-st3215/README.md` §Gait; `src/robot_config.py`; `src/obstacle_avoidance.py`
- **Notes:** `PLANAR_ALL_YAW` is the real gain from the pivot — Gen 1 drove only 5 of 10 joints because
  the chain alternated pitch and yaw. The v6 all-yaw chain drives all ten.

---

### Slide 27 — Verification & mock-mode results `★`

- **Eyebrow:** `VERIFICATION` · **Title:** `What Has Been Checked, and What Has Not`
- **Layout:** 3-up cards on top, honest-gaps card full-width below
- **Card 1 `CAD — 49 CHECKS PASSING` (green):** Independent checker reproduces the geometry as per-band
  footprint masks and brute-forces the joint sweep −45° to +45° against both neighbours. Covers wall
  thickness, bridging, ground contact, load paths, chain arithmetic. **Fault injection** proves the
  collision detector, relief sizing and retention check actually fire when fed a defect. A
  parameter-drift guard diffs the **56 constants** shared between model and checker.
- **Card 2 `SOFTWARE` (green):** `python -m compileall` clean across `gen2-st3215`. `SURGE_MOCK=1
  python main.py` runs the full 50 Hz loop with no serial port — mock driver connects and the gait
  state machine iterates through all three states as designed.
- **Card 3 `SIMULATION` (green):** Wokwi ESP32: 5 servos, HC-SR04 (α = 0.4 smoothing, 20 cm trip /
  25 cm clear hysteresis), MPU6050 flip detection, SSD1306 OLED, non-blocking 50/10/5 Hz schedule,
  live serial console at 115200.
- **Full-width card `NOT YET EXERCISED` (amber strip)** — state these plainly:
  - **CadQuery itself has never run.** The v6 model's API calls are unexecuted; the dimensions are
    verified, a CadQuery-level error on first execution is possible.
  - **No ST3215 has been driven.** Ping, ID assignment and current calibration are all untested on hardware.
  - **`test_st3215_ping.py` and `test_motor_feedback.py` ignore `SURGE_MOCK`** — they instantiate
    `ServoDriver` without the mock flag and throw without hardware. Known, logged, unfixed.
  - **`kinematics.py` and `torque_controller.py` are unused** — live control is position-mode
    `SnakeKinematics`. Retained for compliant-control experiments.
  - **Wokwi and Python gaits were never reconciled** — 40° / 0.95 Hz / ≈0.51 wavelength in simulation
    vs 35.2° / 0.477 Hz / ≈1.53 wavelengths in the Python stack.
- **Source:** `cad/segments/v6/README.md` §"Verification status"; `gen2_code_review.md` §4–5;
  `simulation/wokwi/README.md`
- **Notes:** Volunteering this list is stronger than being asked for it. It also frames the roadmap:
  every item here is a task on slide 29.

---

### Slide 28 — Inventory, budget & procurement gaps `★`

- **Eyebrow:** `RESOURCES` · **Title:** `Inventory, Spend and Remaining Procurement`
- **Layout:** 3 stat callouts, then 2-up inventory / gaps
- **Stat row:** **9** component types in hand (~19 units) · **17** items outstanding ·
  **≈ ₹10,200** remaining spend
- **Left card `IN INVENTORY`:** Waveshare Bus Servo Driver w/ ESP32 · 10× ST3215 · ESP32 #2 ·
  Mean Well LRS-100-5 · XL6009 boost · 3S LiPo 1800 mAh · Pi 5 8 GB · Camera Module 3 · MPU6050
- **Right card `OUTSTANDING`** grouped by severity: CRITICAL — fuse, BMS/alarm, loop key ·
  HIGH — charger, LiPo bag, connectors, silicone wire, 12× bus cables, PLA+, 10× F623ZZ bearings,
  M2/M2.5 screws, friction pads · MEDIUM/LOW — 1000 µF cap, distance sensor, Pi 5 PSU, CSI extension, heat-shrink
- **Budget strip:**

| | Amount |
|---|---|
| SURGE grant | ₹1,00,000 |
| Generation 1 spend | ₹33,760 |
| Generation 2 remaining need | ≈ ₹10,200 |

- **Callout:** *"Gen 1's ₹33,760 bought two motors that are no longer in the design. The Gen 2
  completion cost is ≈ ₹10,200 — the actuators, driver, compute and sensing are already on hand."*
- **Source:** `Updated_Hardware_Inventory.md` §BOM; `README.md`
- **Notes:** Be direct about the sunk Gen 1 cost. The favourable point is that Gen 2 needs only
  consumables and safety parts, and the grant comfortably covers it.
- ⚠ **Verify the ST3215/driver purchase cost before presenting** — `Updated_Hardware_Inventory.md`
  lists these as in-inventory but records no price. See §6, open question 2.

---

### Slide 29 — Roadmap to demonstration `★` **closing slide**

A **new** slide, not a rewrite of slide 15. Slide 15 keeps its obsolete Gen-1 roadmap; this one
supersedes it and must say so on its face.

- **Eyebrow:** `ROADMAP` · **Title:** `Path to Demonstration — Generation 2`
- **Layout:** clone slide 15's geometry exactly — 6 numbered pills + 6 cards + legend + two 5.97″ cards
  + badge. Reusing the layout is deliberate: the visual rhyme with slide 15 makes the supersession
  legible without a word of explanation.
- **Supersession line**, directly under the title, 10 pt, `6B7890`:
  *"Replaces the Generation 1 roadmap on slide 15."*

| # | Phase | Card contents |
|---|---|---|
| 1 | **Power Verification** | Verify LiPo C-rating & connector · acquire fuse, loop key, BMS, charger · bench-test 12 V rail |
| 2 | **Servo Bring-Up** | Flash `assign_ids` · assign IDs 1–10 one at a time · `test_st3215_ping.py` · calibrate stall threshold |
| 3 | **Segment Fabrication** | Run `probe_st3215.py` · print one v6 · **measure fore/aft friction ratio** · print remaining 10 |
| 4 | **Mechanical Assembly** | F623ZZ bearings · M2 retention screws · 11-segment chain, 670 mm · route bus cabling |
| 5 | **Field Integration** | Flash `robot_esp32` + `base_esp32` · MPU6050 on I²C 21/22 · verify ESP-NOW · `base_station.py` on Pi 5 |
| 6 | **Testing & Demo** | Locomotion trials · measure actual gait speed · power & runtime characterisation · final showcase |

- Pills 1–2 blue `1E6FD6`; pills 3–6 amber `E8821E`.
- `EXPECTED DELIVERABLES`: assembled 11-segment / 10-DOF ST3215 robot · untethered ESP-NOW operation ·
  measured anisotropic friction ratio · calibrated current-stall collision detection · demonstration-ready prototype.
- `TARGET FOR NEXT REVIEW`: complete mechanical assembly · demonstrate translating locomotion ·
  validate stall-based obstacle detection on hardware · close the CRITICAL safety gaps.
- Badge: **`Goal: first translating locomotion on hardware`** — a verifiable milestone rather than a
  percentage.
- **Repo URL** belongs here if §3.3 option 1 is taken — the corrected
  `github.com/shashankjangir/SurGe-090-Smart-snake-robot`, 10 pt, footer position.

> **Step 3 is the load-bearing item.** Every gait claim in this deck assumes anisotropic belly friction
> that has never been measured. Card 3 must say so explicitly.

- **Source:** `Updated_Hardware_Inventory.md` §Next Steps (Phases 3A–3E)
- **Notes:** Open by naming slide 15 and saying plainly that it is superseded — do not let the audience
  find two roadmaps on their own. Then walk the six phases. Close on step 3 being the real unknown:
  the friction ratio is unmeasured, and every locomotion claim depends on it.

---

## 5. Asset preparation

The CAD renders are matplotlib output on white with very large empty margins. Dropped in raw they will
read as broken. Prepare them first, into `gen1-dynamixel/docs/presentations/assets/`:

| Source | Action |
|---|---|
| `cad/v6_views.png` | Crop to the 2×2 render block; drop the baked-in title text (the slide supplies it) |
| `cad/v6_chain.png` | Crop to the iso view only (left ~40%); the plan view is mostly whitespace |
| `cad/assembly_45deg.png` | Crop to iso; strip the overlapping title text at top |
| `cad/segments/v4/preview_v4.png` | Crop, downscale to ~1200 px wide |
| `cad/segments/v5/preview_v5_final.png` | Same |
| `media/Screenshot 2026-08-17 100520.png` | Already clean. Crop to the servo, keep the light background |
| `docs/wiring diagram 1.png` | 4.1 MB — downscale to ≤1600 px wide before embedding |
| `docs/snake_robot_wiring_diagram.svg` | Rasterise to PNG at ~2000 px; do not embed the SVG (renderer support is inconsistent) |

Cropping with Pillow (whitespace trim + margin) is sufficient; no manual editing required.
Keep the light backgrounds — they match the deck's `F6F8FB` page. Do **not** invert them; the only dark
slides are 1 and 15.

---

## 6. Open questions — resolve before these numbers go on a slide

1. **Which CAD version do you print — v4 or v6?** The repo contradicts itself, and slides 21, 22, 23 and
   28 all depend on the answer:
   - `Updated_Hardware_Inventory.md` §Phase 3E: *"Print body segments using v4 design (NOT v5 —
     dimensional errors, NOT v6 — unverified)"*, and its risk table and BOM both say "v4".
   - Root `README.md`, `gen2-st3215/README.md` and `cad/segments/v6/README.md` all name **v6 the design
     of record**, and v6's own README documents three defects that v4 *also* has — including the
     inverted ground contact that makes the friction feature inert.

   These cannot both go in the deck. The v6 case is stronger on the engineering (v4 has the same three
   defects), but v6 carries the real risk that **CadQuery has never been executed on it**. My
   recommendation: present v6 as the design of record, with slide 21 stating that v4 remains the
   fallback if v6 fails to generate. Confirm, and update `Updated_Hardware_Inventory.md` §Phase 3E
   either way — the deck should not be the only place this is resolved.

2. **Overall completion percentage.** ~~(slide 5)~~ — **still live under the freeze.** Slide 5 keeps its
   25% untouched, but slide 16's register must state where the project actually is. Phase 3 of 8 is
   ~31%, while design/software/CAD completeness argues higher. **Recommendation under the freeze: put
   no percentage on slide 16 at all** — use the phase marker ("Phase 3 — Fabrication & Assembly") and
   let slide 5's 25% stand as the historical figure. Two competing percentages in one deck invites an
   argument about arithmetic instead of engineering.
3. **ST3215 + driver purchase cost (slide 28).** `Updated_Hardware_Inventory.md` lists them as in hand
   with no price recorded. The ₹33,760 Gen 1 figure plus ≈₹10,200 remaining will not reconcile against
   the grant without it.
4. **Repository URL (slide 1) — needs a decision, see §3.3.** Slide 1 says
   `github.com/shashankjangir/surge090`; the git remote is `SurGe-090-Smart-snake-robot`. Under the
   freeze slide 1 cannot be edited, so this is the one factual error with nowhere natural to go.
   **Recommendation: print the correct URL on slide 29** and leave slide 1 alone. If you would rather
   fix slide 1 as a one-line exception to the freeze, say so explicitly — it will not be assumed.
5. ~~**Task count for slide 5's stat block.**~~ **Moot under the freeze** — slide 5 is not edited, and
   no stat block is rebuilt. Ignore unless a count is wanted for the slide 16 talk track.
6. ~~**Team roles (slide 1).**~~ **Moot under the freeze** — slide 1 is not edited. The differing role
   splits in `README.md` and `gen2-st3215/README.md` are still worth reconciling in the repo, but they
   no longer block the deck.
7. **Torque multiple — 5.6× or 5.7×?** `README.md` says 5.7×, `Updated_Hardware_Inventory.md` says 5.6×.
   2.94 / 0.52 = **5.65**, so either rounds defensibly. The plan uses 5.7× per `README.md`; make the two
   documents agree.

---

## 7. Build procedure

Structural work first, content second — `add_slide.py` copies slides verbatim, so duplicating after
editing clones edited content.

```bash
# 1. Work on a copy. Never edit the original in place.
cp "Smart_Snake_Robot_SURGE090_Progress_Review  -  Repaired.pptx" build/deck.pptx

# 2. Unpack twice — once to work in, once as an untouched reference for the
#    step-6a freeze guard.
python3 -c "import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall('unpacked')" build/deck.pptx
python3 -c "import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall('pristine')" build/deck.pptx

# 3. Prepare assets (crop/downscale) into unpacked/ppt/media as needed

# 4. STRUCTURAL: append 14 new slides by duplicating the closest-matching
#    existing slide, so the header system and theme references come along free.
#    APPEND ONLY — every new slide goes after slide15. Slides 1-15 are never
#    opened, never edited, never reordered.
#      slide16 (dark, register)   <- duplicate slide1    (only dark slide)
#      slides 17, 22              <- duplicate slide14   (asymmetric split)
#      slides 18, 21, 24, 25, 28  <- duplicate slide13   (card grid)
#      slides 19, 20, 23, 26, 27  <- duplicate slide15   (pills + 2-up cards)
#      slide29 (roadmap)          <- duplicate slide15   (pills + cards + badge)
python scripts/add_slide.py unpacked/ slide15.xml --after slide15.xml   # x14, per map above

# 5. NO REORDER STEP. Appending leaves <p:sldIdLst> in the right order already.
#    (The previous plan reordered here; that is exactly what the freeze removes,
#    and it eliminates the riskiest XML edit in the whole build.)

# 6. CONTENT: edit ppt/slides/slideN.xml for N >= 16 ONLY — one <a:p> per list
#    item, copy the sibling <a:pPr> to keep spacing, b="1" on labels,
#    xml:space="preserve" where text has leading/trailing spaces

# 6a. GUARD: confirm nothing touched slides 1-15 before repacking.
for n in $(seq 1 15); do
  cmp -s "unpacked/ppt/slides/slide$n.xml" "pristine/ppt/slides/slide$n.xml" \
    || echo "VIOLATION: slide$n.xml modified"
done

# 7. Add speaker notes to every new slide

# 8. Repack (from inside the directory; rm first so deletions don't survive)
(cd unpacked && rm -f ../out.pptx && zip -Xr ../out.pptx .)

# 9. Validate against the original as baseline
python scripts/office/validate.py out.pptx --original build/deck.pptx

# 10. Content QA — must return nothing
python -m markitdown out.pptx | grep -iE "\bx{3,}\b|lorem|ipsum|\bTODO|\[insert|Dynamixel XL330 motors"
```

**Parsing note:** if any XML transform is scripted, parse with `defusedxml.minidom`. Round-tripping
OOXML through `xml.etree.ElementTree` rewrites namespace prefixes and corrupts the deck.

**Visual QA:** LibreOffice is **not installed** on this machine, so the render-to-image QA pass cannot
run locally. Either install LibreOffice, or open the output in PowerPoint and check each new slide for
text overflow — the most likely defect, since several of these slides carry dense engineering figures
into 9–10 pt card lists.

---

## 8. Checklist

**Freeze — verify before anything else ships**
- [ ] Slides 1–15 byte-identical to the original (step 6a guard returns nothing)
- [ ] `<p:sldIdLst>` order for slides 1–15 unchanged
- [ ] No edits to `slide1.xml` … `slide15.xml` in the diff

**New slides** — build 16 first
- [ ] **16 What Changed (dark, corrections register) — PRIORITY**
- [ ] 17 ST3215 re-selection · [ ] 18 Architecture diff · [ ] 19 Firmware stack
- [ ] 20 Feetech protocol · [ ] 21 CAD evolution · [ ] 22 v6 load path
- [ ] 23 v6 friction & torque · [ ] 24 Electrical & power · [ ] 25 Safety & gaps
- [ ] 26 Gait & FSM · [ ] 27 Verification · [ ] 28 Inventory & budget
- [ ] 29 Roadmap to demonstration (closing)

**Correction integrity**
- [ ] Every register row on slide 16 traceable to `Updated_Hardware_Inventory.md`
- [ ] Register names slide numbers 10, 12, 13, 15 explicitly
- [ ] Slide 29 carries the "replaces slide 15" supersession line
- [ ] Repo-URL decision made (§3.3) — not left to chance

**Quality**
- [ ] Assets cropped and downscaled
- [ ] Speaker notes on all 14 new slides
- [ ] Status colours semantic everywhere (green/blue/amber)
- [ ] All seven §6 questions resolved
- [ ] `validate.py --original` clean
- [ ] Placeholder grep clean
- [ ] Every new slide checked for text overflow in PowerPoint

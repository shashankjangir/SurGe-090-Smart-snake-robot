# Acceptance checklist: segments v1, Phase 1 (revision 2)

**Status: PROTOTYPE: fit and load validation required.** All checks ran on nominal vendor geometry and provisional
parameters. They do not show that the printed assembly is strong, low-wobble or printable.

Revision 2 follows the owner review of 2 November 2026: symmetric outside, compact and covered tail, head sensor
provision, and a round body with rubber bands. See `feasibility.md`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Three part types; each one watertight, manifold solid, no floating bodies, in mm | **PASS** | `checks/solids.py` → `solids.json` |
| 1b | Outside mirror symmetry (owner requirement) | **PASS** for HEAD and MID; TAIL **PASS except the intended openings** | `checks/symmetry.py` → `symmetry.json`: slices every 2 mm, 0.2 mm tolerance. TAIL asymmetric only at the top service opening and the USB-C window |
| 2 | 1 HEAD + 9 MID + 1 TAIL, joint order, frames, straight at 2048 | **PASS** | `assembly.py` frame report; sign behaviour shown with the joint_map signs |
| 3 | Sweeps from section C, minimum gaps against `gap_moving`, forbidden poses | __SWEEP__ | `clearance.md` |
| 4 | Insertion paths and installation order | **PASS with one conflict** | `feasibility.md`: the 0.55 mm proud rear case boss blocks the radial clevis slide; two resolutions proposed |
| 5 | Cable routes, reach, slack at neutral and ±90° | **Shown** | `cables.md`: constant 16 mm crossing on the joint axis; 90° in-plane bend at the axis with 12.5 mm radius available against an unknown bend limit; about 101 mm bay to bay against unknown installed leads |
| 6 | Volume, mass, load table with assumptions | **Shown** | `loads.md` |
| 7 | BOM, existing hardware against proposed additions | **Shown** | Below |
| 8 | Remaining **blocks release** items | **Listed** | Below |

## Shape summary

- **Body Ø57 mm round** (body_r 28.5), mirror-symmetric outside. A **neck 30.0 mm wide** in each joint's plane of rotation,
  from 13.6 to 30.1 mm behind the axis, is the minimum that lets the previous body swing ±90°.
- **Rubber zones:** 0.8 mm recessed bands on every fully round section, for strips to be pasted on later:
  - MID: one band behind each tongue;
  - TAIL: one ahead of the bay and one round the bay;
  - HEAD: one on the nose.

  The fork arms are round outside too and can take rubber, but keep it off the flat hub discs, where the lead crosses.
- **Tail:** 109.7 mm behind J10 (−31 mm). The board is enclosed, and ports are reached through the top opening, the side
  USB window and the end-cap DC hole. Components sit at least 16 mm below the opening rim, and the servo plugs at least 6 mm below it.
- **Head:** a round sensor bay with pilot holes, and two wire passages to the J1 crossing.

## Print orientation (proposed)

The round parts have no flat bed face, which was a deliberate trade for the owner's round requirement.

| Part | Orientation | Supports | Weak layer direction |
|---|---|---|---|
| MID | lying on its side, servo axis (local Y) vertical | tree supports along the bottom line and under the upper arm; the cavities are open at the mouth for removal | local Y |
| TAIL | lying with the floor down (local +Y) | tree supports along the bottom line; the bay is open at the top | local Y (standoff pull-out) |
| HEAD | lying on its side like MID, J1 axis (local Z) vertical | tree supports along the bottom line; the bay is open for removal | local Z |

Layers contain the body axis for MID and TAIL, so body and arm bending runs along the layers. Do not split parts.

## Wobble test (unchanged)

1. Clamp the case.
2. Apply a reversing 0.25 N·m at a 100 mm lever about all three axes and read the play with a dial gauge.
3. Repeat with the horn clamped, to separate gear backlash (≤0.5° vendor) from horn slip, rear-support clearance, case-in-cradle movement and frame flex.
4. Baseline the existing joint first.

There is no zero-wobble claim.

## Validation stages

1. Coupons: cradle fit, flush boss slide, screw holes, layer tensile.
2. Unpowered fit print of one MID and the TAIL against the real servo and board. Weigh them.
3. A pitch/yaw pair, moved by hand with power off; check the lead bend at the axis; measure play.
4. The full robot. Any powered test stays within **1252–2844 counts**.

## BOM

**Existing hardware (unchanged):** 10 × ST3215 with metal horns, rear discs and centre screws; Servo Driver with ESP32
(21593, unconfirmed); all bus leads; the external battery lead; existing ties.

**Proposed additions (sizes TBD by measurement):**

| Item | Qty | Use |
|---|---|---|
| Horn screws | 80 | 4 per arm per joint; rear 40 omitted if the disc is fixed |
| Cradle screws | 20 | face-A rear holes through the bosses |
| Board screws | 4 | 2.75 mm board holes into the 2.2 mm standoff pilots |
| Cable ties | ~10 | DC lead strain relief at the end cap; optional |
| Rubber strip | to suit | owner, later; 0.8 mm recessed bands |

There is no bearing or bushing.

## Still blocking release

- Servo variant and label, mass, case envelope. Check the STEP-derived face heights (14.025 / −15.475 / 16.525).
- **Servo plug envelope.** The body diameter depends on it (provisional 9 mm protrusion).
- Horn thickness, thread, depth, clocking; horn centre screw head height against the 2.5 mm boss bore.
- **Rear disc: free idler or fixed, removable or not.**
- Face-A and face-B hole sizes, threads, depths.
- Lead lengths and bend limit (`cable_loop_r`), and the lead section (provisional Ø3).
- Board identity, PCB thickness, component heights, antenna end, plug envelopes, mass; whether the board has a spare
  header for future head sensors.
- Fit, gap, wall, boss, arm, crossbar, fork width, body radius: confirm by coupon and play test.
- Existing joint spacing against 58.37 mm; absolute horn directions; the encoder's counting sense.
- Printer, nozzle, material, measured fit capability; layer-oriented allowables.
- Intended lifted span (owner); gait current measurement (J2/J4 drag bound exceeds the allowable).
- RF check of the finished tail.

## Not changed

Firmware, `joint_map.json`, the dashboard and the software limits are untouched. Nothing outside `segments_v1/` was edited.

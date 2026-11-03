# Feasibility assessment: Gen 3 segments v1 (Phase 1, revision 2)

**PROTOTYPE: fit and load validation required.** Every dimension comes from section 1 of
`docs/research/GEN3_WAVESHARE_HARDWARE_RESEARCH.md`, as a value or a named parameter in
`params.py`. Nothing here is measured on the installed hardware.

## Revision 2: owner review, 2 November 2026

| Owner point | What changed |
|---|---|
| 1. Asymmetric outside is a mistake | Every part is now mirror-symmetric outside about its XY and XZ planes. Only the inside is asymmetric (servo, plugs). Checked by `checks/symmetry.py`, which slices each part every 2 mm and compares the outer extents on both sides: HEAD and MID 0 asymmetric slices. TAIL differs only at its intended service opening and USB window, see below. Hidden symmetric features: mirrored tunnels, channels and recesses on the +Y side |
| 2. Tail too long and board not covered | Tail is 109.7 mm behind the J10 axis (was 140.7 mm). The board sits 2 mm behind the servo end wall and the round end cap closes 1 mm behind the DC jack. The board is enclosed by the round shell on all sides, with openings only for use: a top service opening (board drops in, servo plugs and BOOT/RST), a USB-C window and a DC plug hole with tie slots |
| 3. How to connect future head sensors | Round front sensor bay (Ø36 mm, 4 pilot holes) and two wire passages to the J1 crossing. A separate sensor-lead route (drive side, +Y) runs through every MID to the tail board bay. See "Head sensors" |
| 4. Body should be round, rubber later | The outside is round, Ø57 mm. Recessed 0.8 mm bands on the round sections are for rubber strips to be pasted on |

## Architecture

There is one round body per servo: an open cradle inside a round shell, plus a clevis (fork) at the rear that
grips the next servo's horn and rear disc. All nine MIDs are the same part, rotated about the body axis in
90° steps to alternate pitch and yaw.

| Body | Part | Carries | Couples to |
|---|---|---|---|
| B0 | HEAD | sensor bay (empty for now) | clevis on servo ID 1 |
| B1–B9 | MID | servo *i* case in its cradle; plugs and lead inside | clevis on servo *i+1* |
| B10 | TAIL | servo ID 10 + controller board, enclosed | — |

**The neck at every joint is unavoidable.** Two round bodies hinged for ±90° can only be fully round where the
other body never reaches. Each body is therefore:

| Region (body X, mm) | Shape | Why |
|---|---|---|
| ahead of −13.6 | servo front, horns and the previous body's clevis arms | joint zone |
| −13.6 to −30.1 | *tongue*: round in one direction, 30.0 mm wide (±15.01) in the joint's plane of rotation | the previous clevis face at 16.61 mm from the axis sweeps here |
| −30.1 to −41.76 | fully round, Ø57 | the previous body cannot reach behind body_r + gap |
| behind −41.76 | clevis arms, round outside, flat hub discs at the next axis | next joint |

The joint pitch is unchanged at **58.37 mm**, and **20.61 mm** from the HEAD to J1. Overall length is **679.6 mm**
(was 708.6). The derivation of L_c = 16.61 mm (cradle wall + gap + 0.1 mm mesh margin) is as before.

### Same MID for pitch and yaw, and the sign mapping

The fork is symmetric: same boss, bore and four-hole pattern on both arms. Each MID's rotation is chosen in
`assembly.chain()` so the driving horns point:

- ID 1 +Y; IDs 3/5/7/9 −Y;
- all yaw IDs −Z, which puts their plugs on top, away from the ground.

`assembly.frame_report()` shows that with the joint_map signs, +10° gives the same world rotation at every pitch
joint, (0, −0.174, 0), and at every yaw joint, (0, 0, +0.174), and that all bodies are collinear at 2048. The
absolute horn directions and the encoder's counting sense on the real robot are **unverified (block release)**.

## Load path

```
metal horn ──4 screws──► boss ► arm (round outside) ──┐
rear disc ──4 screws──► boss ► arm ────────────────────┴► round section ► end wall + cradle ► servo case of B(i)
```

The rear disc turns on a fixed case boss in the official STEP, which suggests a passive idler and so a two-sided
support. **This is not established.** If the disc is fixed to the case, the rear screws are left out (no rigid
joint to a stationary feature) and the joint is single-sided until load-tested.

The cradle seats face A on two bosses (the datum) and pulls it up with two screws into the face-A rear holes. The
screws enter from the +Y outside through 5 mm counterbores. Blind recesses on −Y keep the outside symmetric. The
screws seat on bosses, never in the housing.

## Installation order (one joint, J*i*)

1. Plug both bus leads into servo *i* out of the cradle.
2. Slide servo *i* rear-first into B*i* from the open front. The plugs ride in the −Y cavity, which is open at the
   tongue mouth.
3. Fit the two face-A screws from outside.
4. Set encoder 2048 (torque on, unloaded) and check the horn clocking against the recessed notch on the hub disc.
5. Slide B*i−1*'s clevis radially over the servo. The boss faces are exactly 37.25 mm apart, so they run flush
   over the horn and disc faces.
6. Fit 4 + 4 horn screws (heads flush in the hub discs) and the horn centre screw through the Ø8 bore.
7. Lead: from the cavity, out through the mouth notch, over B*i−1*'s hub disc to the axis point, then along that
   arm's groove, the face ring groove and the tunnel into B*i−1*'s cavity (see `cables.md`).

**Feasibility conflict in step 5 (unchanged, reported, not solved).** The fixed case boss stands 0.55 mm proud of
the rear disc, so the rear boss strikes it during the radial slide. Spreading the arms is forbidden. Proposed:

- (a) a 7.2 × 0.8 mm lead-in groove in the rear boss face; or
- (b) bolting the disc to the arm first, if the disc is removable (unverified).

## Head sensors (owner question 3)

Nothing is wired now, and no connector or lead is added in this phase. What the geometry reserves:

- **Mounting:** a round front bay, Ø36 mm and 20.5 mm deep, with four blind Ø2.2 pilot holes on a 20 mm square for a
  sensor board (heat-set inserts or self-tapping screws, TBD with the sensor).
- **Head exit:** two wire passages, Ø6 and mirrored, from the bay floor to the clevis face ring groove, one per side
  of J1.
- **Along the body:** the bus lead uses the −Y side (servo rear-disc side). A separate drive-side (+Y) route exists
  in every MID: mouth notch → +Y channel → +Y tunnel → face ring groove. Arm grooves are 7 mm wide, enough for the
  bus lead plus one sensor lead. It ends in the tail's board bay.
- **Options when sensors arrive, to decide then:**
  - (a) a 4-wire I²C or UART lead along this route to a spare header on the controller board. Whether the
    Servo Driver with ESP32 exposes one is **not checked**, so read the board pinout first. This adds a lead and a connector, which is a
    wiring change needing owner approval;
  - (b) a self-contained wireless node in the head bay (small ESP32 with its own cell, reporting over ESP-NOW like the
    existing link). No lead along the body, but a battery and a charging point in the head.

## Unknowns that matter most (ranked)

1. **Rear disc: free idler or fixed, removable or not.** Decides the two-sided support and the step-5 conflict.
2. **Horn hole thread, horn thickness, screw engagement.**
3. **Face-A hole size, depth, thread.**
4. **Servo plug envelope.** The round Ø57 body is sized by it, with a provisional 9 mm protrusion below face B. A
   larger plug means a larger body radius.
5. **Servo variant and mass.** Load margins.
6. **Installed lead lengths.** About 101 mm needed bay to bay.
7. **Board identity, antenna end, plug envelopes.** Tail layout and RF.
8. **Existing joint spacing and clocking.**

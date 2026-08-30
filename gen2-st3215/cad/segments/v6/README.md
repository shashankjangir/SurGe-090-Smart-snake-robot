# segment_v6 — SURGE-090 snake robot segment

This is the ST3215 segment, rebuilt from v4's structure after v5 regressed. It is
a parametric CadQuery model rather than a SolidWorks part, so every dimension is
traceable to a named constant and the file refuses to export if its own
assumptions stop holding.

```
segment_v6.py      the model, with a self-check block that raises SystemExit
probe_st3215.py    run this against ST3215.step BEFORE printing
README.md          this file
```

## Why v6 exists

v4 and v5 are close relatives — v5 is essentially v4 with a wider yoke rectangle,
and the two share a bounding box. v5's early sidewall bug is fixed and should not
be re-reported. What neither of them fixes is a set of three defects that run
through both, and that only showed up when the parts were measured rather than
looked at.

The critical one is ground contact. The bottom yoke plate sits at z = −3.45 while
the belly scale tips sit at −3.00, so the plate hangs 0.45 mm **below** the
scales and the robot rests on two smooth discs. Measured downward-facing area is
1006 mm² of plate against 66 mm² of scale: about 94% of ground contact is the one
surface that was never meant to touch, and the friction feature is inert.

The second is that the scales point the wrong way. They are swept along Y, so
they resist fore-aft sliding and slide freely sideways. Lateral undulation needs
the opposite — grip across the body, slide along it — so the feature is not
merely inert but backwards, and it actively fights the reverse manoeuvre in the
gait state machine.

The third is that the motor has no positive retention at all. It sits in a 0.4 mm
slip-fit pocket, open at the top, and lifts straight out. The lightening windows
remove most of the cradle sidewall over the mid-height band, and the cable hole
leaves roughly a millimetre of rear wall beside it.

v6 addresses all three, and the self-check block now asserts the first rather
than trusting it: it enumerates every face lying at the model's minimum z and
requires that they are exactly the keel lands, by count and by area. That check
is what makes the ground-contact defect impossible to reintroduce silently.

## The datum frame

Everything in the file is expressed in one frame, and misreading it is the
easiest way to break the part.

The origin sits on **this** segment's rear joint axis, which is the axis of the
*previous* segment's output shaft. `+x` runs forward toward the head. `+z` is up.
The joint axes are therefore **vertical**, which is what makes the torque budget
comfortable: gravity contributes exactly zero joint torque, and the motors only
ever fight friction.

`PITCH = 58.0` is the axis-to-axis spacing, so this segment's own output axis is
at `x = 58.0`, and the next segment's origin coincides with it. `z = 0` is a
label, not a surface: it sits 0.25 mm below the tip of the motor's idler boss.
No geometry references `z = 0` directly — every feature is defined against
`SEAT_Z`, `HUB_Z` or `HORN_Z` — so the label costs nothing, but do not assume it
lies on a face.

## Motor datums, and where they came from

The vendor STEP file is an assembly whose sub-part frames are **untransformed**.
Sub-parts sit at their authoring origins, not their assembled positions, so
measuring a feature's *position* in that file gives a number that has nothing to
do with the real motor. `probe_st3215.py` matches the case by **shape** for
exactly this reason. This is a trap worth remembering: it produced several
confident, wrong numbers before it was spotted.

The authoritative source is instead `../../motor-ref/ST3215.dxf`, read as vector
data rather than measured off a rendering. Two cautions apply there too. First,
filter to the visible layer (`可见`): dimension extension lines otherwise read as
part edges, and one of them looks convincingly like a face. Second, dimension
arrowhead ticks are short line segments that cluster near real geometry — an
arrowhead pair 19.200 mm apart is not the Ø19.2 disc, and mistaking it moves the
shaft axis by 0.7 mm.

Read properly, the case silhouette is 45.223 mm long and the shaft axis falls
10.112 mm from the horn-end face and 35.112 mm from the rear. The topmost feature
is the Ø19.2 horn disc, centred on that axis; the bottommost is a Ø6.00 boss
standing 0.30 mm below the idler face. Both large faces carry a four-hole pattern
at exactly ±7.00 mm in both axes about the disc centre, and both carry a Ø19.2
disc — which is the geometric precondition for the double-shear load path below.

| quantity | value | source |
|---|---|---|
| case envelope | 45.22 × 24.72 × 37.25 | DXF, dimension definition points |
| shaft axis from horn-end face | 10.112 | DXF silhouette, corroborated by the 37.25 dimension |
| bolt circle radius, both faces | 7.00 | DXF, four Ø2.5 circles per face |
| horn / idler disc | Ø19.2 both faces | DXF |
| idler centre boss | Ø6.00, 0.30 proud | DXF silhouette |
| lowest case face | z = 0.70 over x 28.80..38.23 | DXF, agrees with v4 to 0.03 mm |
| mounting terrace | z = 4.10 over x 25.03..52.30 | DXF |
| stall torque | 2.94 N·m at 12 V | datasheet |

`HORN_Z = 37.80` looks wrong against the datasheet's 37.25 and is not. The 37.25
is measured idler-face-to-horn-face, and `37.80 − 0.55 = 37.25` exactly.

## The terraced underside, and the retention screws

The case underside is **not flat**. It steps down in three terraces, and the
lowest face is only 9.43 mm long. v6's first cut ignored this: it drove two
retention screws up through the floor at `x = 25.25`, where the case never comes
down to the seat plane at all — it is 3.40 mm above it. Those screws crossed an
air gap and clamped nothing, and both the model and its verifier passed, because
neither of them knew the underside profile.

The fix is two ribs that rise from the floor to 4.05, a hair under the 4.10
terrace, each bonded to both the floor and the rear pocket wall so it is a wall
rather than a free-standing post — strong in the exact direction the screw pulls,
and printable without support. The 0.70 pad still beds on the floor forward of
the ribs, which is what stops the motor pitching about the screw line. The two
contacts are conformal rather than over-constrained: the case meets plastic at
both heights simultaneously because the plastic was cut to the measured profile.

The front screw pair cannot be used at all. It lands at `x = 49.70`, which is
13.19 mm from the output axis, inside the crescent cleared for the neighbour's
yoke. There is no material there to put a hole in. The motor's front end is
already clamped by four screws into the next segment's yoke plates, so it cannot
lift out regardless.

The fasteners are **M2, not M2.5**. The drawing renders every case hole as a
concentric Ø1.6 / Ø2.0 pair, which is the tap-drill and nominal pair for M2;
M2.5 would be Ø2.05 / Ø2.5. This change also bought clearance: the Ø4.0
countersink leaves 0.75 mm to the nearest keel where the Ø5.0 head left 0.25.

One question is genuinely unresolved. The two case faces carry **different** hole
patterns — 24.45 mm pitch on one, 20.70 mm on the other — and the drawing labels
neither. The default assumes 24.45, because both of its holes then land on the
single 4.10 terrace, which is what a mounting interface looks like, whereas the
20.70 pattern splits its holes across two terraces and puts one 0.20 mm inside a
pad edge. If your motor measures 20.70, the ribs must be **deleted**, not moved:
at `x = 29.00` the case comes all the way down to the seat, so a rib there would
lift the motor off its pad. `verify_v6.py` checks precisely this and fails loudly
if one constant is changed without the other. `probe_st3215.py` item 4 turns this
into a single caliper reading.

## Load path

Both yoke plates bolt to the neighbour's motor: the top plate to the Ø19.2 horn
and the bottom plate to the Ø19.2 rear idler disc, on the same R7.00 circle. The
joint therefore runs in **double shear** rather than cantilevering off the horn
alone, which is what keeps a 670 mm chain from sagging at every joint. At stall
that is 105 N per bolt, 21.4 MPa in the screws and 9.7 / 11.1 MPa bearing in the
PLA — a factor of five on the plastic, which is the limiting material.

This entire scheme rests on one physical assumption: **that the rear idler disc
rotates with the horn.** If it is fixed to the case, bolting both plates locks
the joint solid and the first command will stall a motor or strip a gear. This is
item 1 on the probe checklist and it takes five seconds to check by hand.

## Friction and gait

Seven keels run **along** the body at y = 0, ±3.20, ±6.40, ±14.75, tapering from
2.20 mm at the base to 1.10 mm at the tip over 1.60 mm of height — a 19° flank,
comfortably self-supporting. Running lengthwise, they resist sideways slip and
slide forward, which is the anisotropy lateral undulation actually needs. The
outermost pair sits at ±14.75 of a 16.50 half-width, giving roll stability
without exceeding the body envelope. Contact is 200 mm² per segment, 2202 mm²
across eleven, about 4.9 kPa — low enough not to mark a floor.

The torque numbers say the gait is easy and one particular manoeuvre is not. At
µ = 0.8, undulation needs 0.207 N·m, 7% of stall. Pivoting the whole grounded
body about one joint needs 2.78 N·m, **95% of stall.** Do not slew a stationary
robot on the ground; lift it or let it undulate into position. `verify_v6.py`
captures this as an explicit warning rather than a failure, because it is a
constraint on how the robot is driven, not a defect in the part.

## Chain geometry

Eleven segments give ten joints: `10 × 58.0 = 580 mm` axis-to-axis, and 670 mm
overall from the rear yoke at −15.0 to the head nose at 654.5. Note that
`segment_v5.py` prints 638 mm for this, which is wrong; so was an earlier figure
in the v6 planning notes. 580 and 670 are the numbers.

## Printing

PLA, 0.4 mm nozzle, 0.42 mm extrusion width. Every wall in the part was checked
against three extrusions minimum, and the thinnest — the rib wall beside the
screw hole — comes out at 1.31 mm, or 3.1 passes.

Print Z-up as modelled. The keel lands form the first layer, and the floor then
bridges off them; the longest unsupported span is 6.15 mm, between the y = ±6.40
and y = ±14.75 keels, which PLA bridges without help. Support is needed **only**
under the two rear yoke plates, which cantilever past the body. The Ø8 centre
bores and the R7.00 bolt holes are modelled at nominal; ream them if your printer
runs tight, because a bolt forced into an undersized hole in PLA will split the
plate along the layer lines.

Sand the z = 37.80 face flat before assembly. It is the face the next segment's
bottom yoke lands on, and a print artifact there tilts the whole joint.

## Before you print

`probe_st3215.py` compares fourteen assumed motor dimensions against the vendor
STEP and exits non-zero if any is unconfirmed. It then prints five things the
geometry cannot settle: whether the idler disc rotates, whether the case takes
M2 and how deep, what a motor actually weighs (60 g is assumed, and it sets the
whole torque budget), which face carries which screw pattern, and whether the
underside really is terraced as measured.

Run it, then run `segment_v6.py`. The model exports `snake_segment_v6.step` and
`.stl` only if its own checks pass; on failure it raises `SystemExit` listing
what broke rather than writing a part that looks fine and is not.

## Verification status

The dimensional model is independently verified: a separate checker reproduces
the geometry as per-band footprint masks and brute-forces the joint sweep from
−45° to +45° against both neighbours, plus wall thicknesses, bridging, ground
contact, load paths and the chain arithmetic — 49 checks, all passing, with fault
injection proving the collision detector, the relief sizing and the new
retention check all actually fire when fed a defect. A parameter-drift guard
diffs the 56 constants shared between model and checker so the checker cannot
drift into validating a part that was never built.

What has **not** been exercised is CadQuery itself. The sandbox this was written
in could not install it, so the model's API calls have never run. The dimensions
are sound; the possibility of a CadQuery-level error on first execution is real.
Run it and read the self-check output.

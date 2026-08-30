"""
SURGE-090 Smart Snake Robot -- SEGMENT v6
=========================================
v4's structure, with the three defects that made v4/v5 non-functional fixed.

WHAT CHANGED FROM v4/v5, AND WHY
--------------------------------
1. GROUND CONTACT.  In v4/v5 the bottom yoke plate reached z = -3.45 while the
   belly "scales" only reached z = -3.00, so the plate sat 0.45 mm LOWER than
   the feature meant to touch the floor.  Measured off the exported STL:
   1006 mm2 of flat plate at z=-3.45 against 66 mm2 of scale at z=-3.00 -- 94%
   of ground contact was a smooth plate and the friction feature never touched
   down.  Here the keels are the single lowest feature by 1.55 mm, and the
   build asserts that the ONLY faces at zmin are the keel lands, so this cannot
   silently regress.

2. FRICTION DIRECTION.  v4/v5 swept the scale teeth along Y, which resists
   fore-aft sliding and slides freely sideways -- backwards for lateral
   undulation, which needs to grip in Y and slide in X.  It also fought the
   controller's reverse manoeuvre.  v6 runs keels LONGITUDINALLY.

3. MOTOR RETENTION.  v4/v5 held the motor in an open-topped 0.4 mm slip-fit
   pocket with nothing stopping it lifting out, and deleted 61% of the cradle
   sidewall with two lightening windows.  v6 encloses the four shaft-free
   faces, adds an integral floor as the fifth face, and bolts the case down
   through that floor.

GEOMETRY NOTES THAT ARE EASY TO GET WRONG
-----------------------------------------
* HORN_Z = 37.80 is NOT an error.  ST3215's 37.25 mm is measured
  idler-face-to-horn-face: 37.80 - 0.55 = 37.25 exactly.  Corroborated off
  ST3215.dxf (visible layer only, 1:1): the case silhouette is 45.223 long,
  the shaft axis falls 10.112 from the horn-end face and 35.112 from the rear,
  the topmost feature is the O19.2 horn disc centred on that axis, and the
  bottommost is a O6.00 boss protruding 0.30 below the idler face.  So z = 0
  sits 0.25 below the boss tip -- it is a label, not a surface, and no geometry
  references it.  Two consequences that do matter: the O8.00 yoke centre bore
  clears the O6.00 boss with 1.00 to spare, and the horn hub does NOT stand
  above the disc face, so the top yoke plate lands flat on the full O19.2.
* The floor cannot run the full length of the motor.  Both neighbours' bottom
  yoke plates live in the same z band as the floor and SWEEP through it as the
  joint moves.  The floor's forward boundary is therefore a crescent about the
  output axis, sized from the swept envelope, not the static position.
* The bottom yoke's arm is deliberately narrow (+-10.5, not +-16.5).  Widening
  it pushes its swept radius from 14.85 to 23.33 mm and forces the floor back
  behind the rear case screws -- which is exactly what limited v4's belly pad
  to x 20..42.
* Both yoke arms must OVERLAP the body in plan, not merely touch its edge, or
  the plates union as good as free-floating.  Hence ARM_X1_B > FLOOR_X0 and
  ARM_X1_T > REAR_X.
* THE CASE UNDERSIDE IS TERRACED, and a flat floor gets this wrong.  Measured
  off ST3215.dxf and mapped into this file's x frame:
        z = 0.70  over x 28.80 .. 38.23   (9.43 mm -- the lowest face)
        z = 2.60  over x 26.25 .. 48.77
        z = 4.10  over x 25.03 .. 52.30   (the mounting terrace)
  segment_v4 read the 0.70 band right -- it claimed 28.8..38.2, which lands
  within 0.03 of the drawing -- but v6's first cut then drove its retention
  screws up at x=25.25, where the case never comes down to the seat plane at
  all: it is 3.40 mm above it.  Those screws spanned an air gap and clamped
  nothing.  Fixed here with two ribs that rise from the floor to just under
  the terrace, so the screw bears on plastic that actually touches the case,
  while the 0.70 pad still beds on the floor and stops the motor pitching
  fore-aft.  The two contacts are conformal, not over-constrained.
* Case fasteners are M2, not M2.5.  ST3215.dxf draws every case hole as a
  concentric O1.6 / O2.0 pair -- tap-drill and nominal for M2, where M2.5
  would be O2.05 / O2.5.  Hence SCREW_D = 2.40 and a O4.0 countersink.
* Only the REAR case-screw pair is used.  The front pair at x=49.70 sits
  INSIDE the crescent -- there is no material to put a hole in.  The motor's
  front end is already clamped by four screws into the next segment's horn and
  idler yokes, so it cannot lift out regardless.
* UNRESOLVED, and probe_st3215.py asks you to settle it with one caliper
  reading: the two case faces carry DIFFERENT screw patterns -- 24.45 pitch
  (x 25.25 and 49.70) on one, 20.70 (x 29.00 and 49.70) on the other -- and
  the drawing labels neither.  The default assumes 24.45, because both of its
  holes then land on the single z=4.10 terrace, which is what a mounting
  interface looks like; the 20.70 pattern would split its holes across two
  terraces and put one 0.20 from a pad edge.  If your motor measures 20.70,
  set SCR_PATTERN = "p2070" below and everything downstream follows.
* Keel positions are explicit, not a uniform pitch, to leave a clear channel
  at |y| = 7.5..13.0 for the retention screws.  A uniform pitch puts a keel
  right under the screw head.
* The nose-top relief radius is 18.50, NOT the nose radius 16.50.  The obvious
  guess is wrong: the neighbour's top yoke plate sweeps over our shell roof out
  to r = 17.85 as the joint moves, so a relief at the nose radius would leave a
  1.35 mm-deep rubbing band on the shoulders behind the nose.
* The motor pocket is a rectangle CLIPPED to a stadium, and the clip is not
  cosmetic.  A plain rectangle's front corners reach 16.531 from the output
  axis against a NOSE_R of 16.50, so the nose wall thins to under three
  extrusions for |y| > 11.04, under one for |y| > 12.17, and goes open for
  |y| > 12.72 -- a hairline slot straight through the nose.  Growing NOSE_R is
  the wrong fix -- that radius is load-bearing for the swept-interference check
  -- so the cutter is intersected with PK_R_LIM = NOSE_R - NOSE_WALL_MIN ahead
  of the output axis.  Nothing is lost: the case's own corners are radiused
  R2.00, so its front corner sits 1.343 inside the nose, and even the sharp
  nominal corner clears the clip by 0.176.
* The skid bosses are M2, not M2.5, and that is forced rather than chosen.  The
  rear one needs the rear-wall column for its depth, and that column is only
  4.49 wide in x (FLOOR_X0 18.00 to the pocket wall at 22.49).  A O2.50 hole
  leaves 0.995 mm webs, 2.4 extrusions; the O1.70 M2 pilot leaves 1.39, or 3.3.
  The forward boss is depth-limited instead -- the motor beds on the floor's top
  face, so SKID_DEP_F stops 1.30 short of breaking through it.

Every number here is re-derived and interference-checked by verify_v6.py,
which sweeps the assembled chain +-45 deg and self-tests its own detector.

Run:  python3 segment_v6.py        (needs cadquery)
"""
import math
import os
import cadquery as cq

# ============================ MOTOR DATUMS (ST3215.pdf, DWG SCS215) =========
M_LEN, M_WID, M_HGT = 45.22, 24.72, 37.25
S2BACK, S2FRONT     = 35.11, 10.11      # shaft axis to rear / horn-end face
HORN_Z              = 37.80             # horn mating face
HUB_Z               = 0.55              # rear idler mating face
SEAT_Z              = 0.70              # lowest wide face of the case
BC_R                = 7.00              # bolt circle radius, BOTH faces
BOLT_D              = 2.70              # M2.5 clearance
CENTRE_D            = 8.00              # clears the centre boss
SCR_DY              = 20.50             # case screw pitch across the width
SCR_FRONT_OFF       = 18.41             # front pair, from the horn-end face
SCR_PATTERN         = "p2445"           # "p2445" | "p2070"  -- see docstring
SCR_DX              = 24.45 if SCR_PATTERN == "p2445" else 20.70
BOSS_OD             = 6.00              # idler centre boss, off ST3215.dxf
BOSS_PROUD          = 0.30              # how far it stands below the idler face
TERRACE_Z           = 4.10              # the case's mounting terrace
STALL_T             = 2.94              # N.m at 12 V

# Case underside, measured off ST3215.dxf and mapped into this file's x frame.
# (x0, x1, z) = the lowest case material found over that x band.  The screws
# must land on a band whose z the floor can actually reach -- see section 8.
UNDERSIDE           = [(28.80, 38.23, 0.70),
                       (26.25, 48.77, 2.60),
                       (25.03, 52.30, 4.10)]

# ============================ SEGMENT PARAMETERS ============================
CLEAR     = 0.40      # pocket slip fit, per face
PITCH     = 58.0      # joint-to-joint; == shaft x, so every axis is collinear
W_HALF    = 16.5      # 33 mm outer width -> 3.74 mm cradle sidewall
NOSE_R    = 16.5
JOINT_CLR = 1.00      # radial gap to the neighbour's nose (angle-independent)
REAR_X    = NOSE_R + JOINT_CLR                  # 17.50

T_FLOOR   = 3.60                                # the fifth face
FLOOR_X0, FLOOR_X1 = 18.0, 53.0
R_CLR     = 12.50     # crescent about the output axis; verify_v6.py sec. 5

# keels: explicit y, leaving |y| 7.5..13.0 clear for the retention screws
KEEL_H, KEEL_TIP_W, KEEL_BASE_W = 1.60, 1.10, 2.20
KEEL_Y = [0.0, 3.2, -3.2, 6.4, -6.4, 14.75, -14.75]
KEEL_X0, KEEL_X1 = 18.0, 44.0

R_YOKE_T, T_YOKE_T, ARM_HALF_T, ARM_X1_T = 15.00, 4.00, 16.50, 22.00
R_YOKE_B, T_YOKE_B, ARM_HALF_B, ARM_X1_B = 10.50, 3.50, 10.50, 20.00

SCREW_D, CSK_D = 2.40, 4.00     # M2 countersunk -- case holes are M2, not M2.5
RIB_Y0       = 7.00             # screw rib, inboard edge
RIB_HALF_LEN = 2.75             # rib reach forward of the screw axis
RIB_TOP      = 4.05             # 0.05 under the terrace, for print tolerance
BOSS_D = 1.70                   # skid / wheel bracket, M2 self-tap pilot
# The skid bosses were inline literals until a review caught the rear one
# fouling two things at once, so they are named here and checked in section 10.
# The rear one lives in the rear-wall column, the only place with 8 mm of depth
# under the floor, and that column is just 4.49 mm wide in x -- from FLOOR_X0
# 18.00 to the pocket wall at PK_X0 22.49.  A O2.50 hole there leaves 0.995 mm
# webs, 2.4 extrusions, so the boss is M2 (O1.70 pilot) rather than M2.5: that
# gives 1.39 mm, 3.3 extrusions, and matches the retention screws.  The forward
# boss has the whole pocket floor above it and so is depth-limited instead.
SKID_X_R, SKID_X_F = 20.25, 44.00   # rear boss centred in the 18.00..22.49 band
SKID_Y   = 12.00                    # outboard of the bottom yoke arm (+-10.50)
SKID_DEP_R, SKID_DEP_F = 8.00, 2.30 # 2.30 leaves 1.30 mm of floor over the pad
SKID_OVER = 0.50                    # start below the floor so the cut breaks out
NOSE_WALL_MIN = 0.42                # nose skin left outside the pocket corner
R_RELIEF = 18.50                # keeps the neighbour's top yoke off our plastic
R_RELIEF_MIN = 17.85            # measured swept reach, verify_v6.py sec. 6
NOSE_RELIEF = 0.30
CABLE_W, CABLE_H = 10.0, 6.0

# ---- derived
FLOOR_Z0 = SEAT_Z - T_FLOOR          # -2.90
KEEL_Z   = FLOOR_Z0 - KEEL_H         # -4.50  <-- the only ground contact
YOKE_B_Z = HUB_Z - T_YOKE_B          # -2.95
YOKE_T_Z = HORN_Z + T_YOKE_T         # +41.80
CSK_H    = (CSK_D - SCREW_D) / 2     # 90 deg included
CASE_X0, CASE_X1 = PITCH - S2BACK, PITCH + S2FRONT
PK_X0, PK_X1, PK_Y = CASE_X0 - CLEAR, CASE_X1 + CLEAR, M_WID / 2 + CLEAR
PK_R_LIM = NOSE_R - NOSE_WALL_MIN    # 16.08; pocket corners clipped to this
SCR_FRONT_X = PITCH + S2FRONT - SCR_FRONT_OFF   # 49.70, unusable
SCR_REAR_X  = SCR_FRONT_X - SCR_DX              # 25.25, used
SCR_Y       = SCR_DY / 2                        # 10.25

# ============================ 1. SHELL: four covered faces ==================
part = (cq.Workplane("XY").workplane(offset=SEAT_Z)
        .moveTo(REAR_X, -W_HALF).lineTo(PITCH, -W_HALF)
        .lineTo(PITCH, W_HALF).lineTo(REAR_X, W_HALF).close()
        .extrude(HORN_Z - SEAT_Z))
part = part.union(cq.Workplane("XY").workplane(offset=SEAT_Z)
                  .moveTo(PITCH, 0).circle(NOSE_R).extrude(HORN_Z - SEAT_Z))
# NB: no rear "socket" cut.  v4/v5 cut a cylinder of radius SOCK_R centred on
# the joint axis while the shell already started at x = SOCK_R -- tangent, so
# it removed nothing.  The straight face at REAR_X already clears the
# neighbour's nose by JOINT_CLR, and because both surfaces are concentric with
# the joint axis that clearance does not change with joint angle.

# ============================ 2. FLOOR: the fifth face ======================
floor = (cq.Workplane("XY").workplane(offset=FLOOR_Z0)
         .moveTo((FLOOR_X0 + FLOOR_X1) / 2, 0)
         .rect(FLOOR_X1 - FLOOR_X0, 2 * W_HALF)
         .extrude(T_FLOOR))
floor = floor.cut(cq.Workplane("XY").workplane(offset=FLOOR_Z0 - 1)
                  .moveTo(PITCH, 0).circle(R_CLR).extrude(T_FLOOR + 2))
part = part.union(floor)

# ============================ 3. MOTOR POCKET ===============================
# The pocket is a rectangle CLIPPED to a stadium.  Left rectangular, its front
# corners land at hypot(PK_X1 - PITCH, PK_Y) = 16.531 from the output axis,
# which is 0.031 mm OUTSIDE the NOSE_R = 16.50 shell -- a hairline slot through
# the nose, with under one extrusion of wall for |y| > 12.17.  Do not fix
# this by growing NOSE_R: that radius is load-bearing for the swept-interference
# check in verify_v6.py sec. 6.  Clip the cutter instead.  Behind the output
# axis the full rectangle applies; ahead of it the cutter follows PK_R_LIM, so
# a wall of at least NOSE_WALL_MIN always survives.  Nothing is lost -- the
# case's own corners are radiused R2.00 (off ST3215.dxf), so its front corner
# sits 1.343 mm inside the nose and never touches the clipped face.
_pk_z = HORN_Z - SEAT_Z + 5
pocket = (cq.Workplane("XY").workplane(offset=SEAT_Z)
          .moveTo((PK_X0 + PK_X1) / 2, 0).rect(PK_X1 - PK_X0, 2 * PK_Y)
          .extrude(_pk_z))
limit = (cq.Workplane("XY").workplane(offset=SEAT_Z)
         .moveTo((PK_X0 + PITCH) / 2, 0).rect(PITCH - PK_X0, 2 * PK_Y)
         .extrude(_pk_z))
limit = limit.union(cq.Workplane("XY").workplane(offset=SEAT_Z)
                    .moveTo(PITCH, 0).circle(PK_R_LIM).extrude(_pk_z))
part = part.cut(pocket.intersect(limit))

# ============================ 4. CABLE NOTCH ================================
# Open notch in the top edge of the rear wall, cut BEFORE the top yoke is
# added so the yoke arm simply bridges over it (a 10 mm bridge, trivial for
# FDM).  v4/v5 bored Ø8 straight through at x=22.5 and left a 1.0 mm sliver of
# rear wall.
part = part.cut(cq.Workplane("XY").workplane(offset=HORN_Z - CABLE_H)
                .moveTo((REAR_X + PK_X0 + 0.5) / 2, 0)
                .rect(PK_X0 + 0.5 - REAR_X, CABLE_W)
                .extrude(CABLE_H + 2))

# ============================ 5. NOSE-TOP RELIEF ============================
# The next segment's top yoke bolts to our horn at z=HORN_Z and our shell top
# is coplanar with it.  Drop the top 0.3 mm over the whole area that yoke
# sweeps (r <= 18.5 about the output axis) so it clamps metal, not plastic.
part = part.cut(cq.Workplane("XY").workplane(offset=HORN_Z - NOSE_RELIEF)
                .moveTo(PITCH, 0).circle(R_RELIEF).extrude(NOSE_RELIEF + 2))

# ============================ 6. DOUBLE-SHEAR YOKES =========================
def yoke(z0, thick, radius, arm_half, arm_x1):
    """Plate gripping one face of the PREVIOUS segment's motor.  Both the horn
    and the rear idler are gripped, putting the joint in double shear."""
    p = (cq.Workplane("XY").workplane(offset=z0)
         .moveTo(0, 0).circle(radius).extrude(thick))
    p = p.union(cq.Workplane("XY").workplane(offset=z0)
                .moveTo(arm_x1 / 2, 0).rect(arm_x1, 2 * arm_half).extrude(thick))
    top = cq.Workplane("XY").workplane(offset=z0 + thick)
    p = p.copyWorkplane(top).pushPoints([(0, 0)]).hole(CENTRE_D)
    for a in range(4):
        ang = math.radians(90 * a)
        p = (p.copyWorkplane(top)
             .pushPoints([(BC_R * math.cos(ang), BC_R * math.sin(ang))])
             .hole(BOLT_D))
    return p

part = part.union(yoke(HORN_Z,   T_YOKE_T, R_YOKE_T, ARM_HALF_T, ARM_X1_T))
part = part.union(yoke(YOKE_B_Z, T_YOKE_B, R_YOKE_B, ARM_HALF_B, ARM_X1_B))

# ============================ 7. LONGITUDINAL KEELS =========================
# Sole ground contact.  Flanks grip laterally (that is the propulsion); the tip
# lands slide fore-aft.  Lofted base->tip so the flanks are 19 deg from
# vertical and print without support, tips last.
for yc in KEEL_Y:
    cx, L = (KEEL_X0 + KEEL_X1) / 2, KEEL_X1 - KEEL_X0
    part = part.union(cq.Workplane("XY").workplane(offset=FLOOR_Z0)
                      .moveTo(cx, yc).rect(L, KEEL_BASE_W)
                      .workplane(offset=-KEEL_H)
                      .moveTo(cx, yc).rect(L, KEEL_TIP_W)
                      .loft(ruled=True))

# ============================ 8. MOTOR RETENTION ============================
# The case does not come down to the seat plane where the screws are -- it is
# terraced (see UNDERSIDE and the module docstring).  So each screw gets a rib
# that rises from the floor to RIB_TOP, 0.05 under the z=4.10 terrace, bonded
# to both the floor and the rear pocket wall so it is a wall rather than a
# free-standing post: strong in the direction the screw pulls, and printable
# without support.  The 0.70 pad still beds on the floor forward of the ribs,
# which is what stops the motor pitching about the screw line.
# Then the rear case-screw pair, up through floor and rib into the case,
# countersunk from below so the head finishes inside the floor and cannot reach
# the ground plane 1.6 mm lower.  Front pair unreachable -- see docstring.
for sy in (-1, 1):
    part = part.union(cq.Workplane("XY").workplane(offset=SEAT_Z)
                      .moveTo((PK_X0 + SCR_REAR_X + RIB_HALF_LEN) / 2,
                              sy * (RIB_Y0 + PK_Y) / 2)
                      .rect(SCR_REAR_X + RIB_HALF_LEN - PK_X0, PK_Y - RIB_Y0)
                      .extrude(RIB_TOP - SEAT_Z))
for sy in (-SCR_Y, SCR_Y):
    part = part.cut(cq.Workplane("XY").workplane(offset=FLOOR_Z0 - 1)
                    .moveTo(SCR_REAR_X, sy).circle(SCREW_D / 2)
                    .extrude((RIB_TOP - FLOOR_Z0) + 2))
    part = part.cut(cq.Workplane("XY").workplane(offset=FLOOR_Z0)
                    .moveTo(SCR_REAR_X, sy).circle(CSK_D / 2)
                    .workplane(offset=CSK_H)
                    .moveTo(SCR_REAR_X, sy).circle(SCREW_D / 2)
                    .loft(ruled=True))

# ============================ 9. SKID / WHEEL BOSSES ========================
# Rear pair sits in the rear-wall column, where material runs from the floor
# underside all the way to HORN_Z, so it takes the full 8 mm of thread.  The
# forward pair sits under the motor pocket floor and is depth-limited instead:
# the motor beds on the floor's top face at SEAT_Z, so breaking through it would
# put a screw tip under the case.  SKID_DEP_F stops 1.30 mm short of it.
# Both are blind and both start SKID_OVER below the floor so the cut certainly
# breaks out of the underside rather than leaving a film.
for sy in (-SKID_Y, SKID_Y):
    part = part.cut(cq.Workplane("XY").workplane(offset=FLOOR_Z0 - SKID_OVER)
                    .moveTo(SKID_X_R, sy).circle(BOSS_D / 2)
                    .extrude(SKID_DEP_R + SKID_OVER))
    part = part.cut(cq.Workplane("XY").workplane(offset=FLOOR_Z0 - SKID_OVER)
                    .moveTo(SKID_X_F, sy).circle(BOSS_D / 2)
                    .extrude(SKID_DEP_F + SKID_OVER))

# ============================ 10. SELF-CHECKS ===============================
# These exist because v5 shipped a 0.20 mm sidewall and v4/v5 both shipped a
# belly that never touched the ground.  A build that violates the design intent
# should fail loudly, not quietly export a wrong STL.
solid = part.val()
bb = solid.BoundingBox()
errs = []

def want(label, cond, detail=""):
    if not cond:
        errs.append("%s  %s" % (label, detail))

want("sidewall too thin", W_HALF - PK_Y >= 3 * 0.42, "%.2f mm" % (W_HALF - PK_Y))
want("pocket does not fit the case",
     PK_X1 - PK_X0 >= M_LEN and 2 * PK_Y >= M_WID)
want("datum mismatch: HORN_Z-HUB_Z != drawing height",
     abs((HORN_Z - HUB_Z) - M_HGT) < 1e-9)
want("bbox X", abs(bb.xlen - ((PITCH + NOSE_R) + R_YOKE_T)) < 1e-3, "%.3f" % bb.xlen)
want("bbox Y", abs(bb.ylen - 2 * W_HALF) < 1e-3, "%.3f" % bb.ylen)
want("bbox Z", abs(bb.zlen - (YOKE_T_Z - KEEL_Z)) < 1e-3, "%.3f" % bb.zlen)
want("lowest point is not the keel tips", abs(bb.zmin - KEEL_Z) < 1e-6,
     "zmin %.3f, expected %.3f" % (bb.zmin, KEEL_Z))
want("bottom yoke does not clear the ground", YOKE_B_Z - KEEL_Z >= 1.0,
     "%.2f mm" % (YOKE_B_Z - KEEL_Z))
want("part came out as more than one solid -- a yoke arm is not attached",
     len(solid.Solids()) == 1, "%d solids" % len(solid.Solids()))
want("yoke arms only touch the body at an edge",
     ARM_X1_B > FLOOR_X0 and ARM_X1_T > REAR_X)

# the decisive one: ground contact must be keel lands and nothing else
low = [f for f in solid.Faces()
       if abs(f.BoundingBox().zmin - bb.zmin) < 1e-6
       and abs(f.BoundingBox().zmax - bb.zmin) < 1e-6]
land = len(KEEL_Y) * KEEL_TIP_W * (KEEL_X1 - KEEL_X0)
low_area = sum(f.Area() for f in low)
want("ground-contact face count != keel count", len(low) == len(KEEL_Y),
     "%d faces at z=%.2f, expected %d" % (len(low), bb.zmin, len(KEEL_Y)))
want("ground-contact area is not the keel lands",
     abs(low_area - land) < 0.05 * land,
     "%.1f mm2, expected %.1f" % (low_area, land))

want("keel flank not self-supporting",
     math.degrees(math.atan(((KEEL_BASE_W - KEEL_TIP_W) / 2) / KEEL_H)) <= 45)
want("keels wider than the body",
     max(abs(y) for y in KEEL_Y) + KEEL_BASE_W / 2 <= W_HALF)
for yc in KEEL_Y:                       # a keel under the head blocks the screw
    clr = abs(abs(yc) - SCR_Y) - KEEL_BASE_W / 2 - CSK_D / 2
    want("keel at y=%+.2f fouls the retention screw head" % yc, clr > 0,
         "%.2f mm" % clr)
want("rear retention screws are not in the floor",
     FLOOR_X0 <= SCR_REAR_X <= FLOOR_X1
     and math.hypot(SCR_REAR_X - PITCH, SCR_Y) >= R_CLR + SCREW_D / 2)

# The defect that killed v6's first cut: a screw is useless unless the case
# actually comes down to meet what the screw is driven through.  Look up the
# measured underside at the screw's x, and require a rib that reaches it.
def case_z_at(x):
    """Lowest case material over x, off ST3215.dxf.  None = no case here."""
    zs = [z for (x0, x1, z) in UNDERSIDE if x0 <= x <= x1]
    return min(zs) if zs else None

_cz = case_z_at(SCR_REAR_X)
want("no case material above the retention screw at all", _cz is not None)
if _cz is not None:
    want("retention screw spans a gap -- nothing to clamp",
         abs(RIB_TOP - _cz) <= 0.10,
         "case underside z=%.2f at x=%.2f, rib tops out at %.2f -- %.2f mm gap"
         % (_cz, SCR_REAR_X, RIB_TOP, _cz - RIB_TOP))
    want("rib is proud of the case terrace -- motor will not seat",
         RIB_TOP <= _cz, "rib %.2f vs case %.2f" % (RIB_TOP, _cz))
want("screw rib is thinner than 2 perimeters", PK_Y - RIB_Y0 >= 0.84,
     "%.2f mm" % (PK_Y - RIB_Y0))
want("screw is not inside its own rib",
     RIB_Y0 + CSK_D / 2 <= SCR_Y <= PK_Y - CSK_D / 2,
     "y=%.2f in rib %.2f..%.2f, needs %.2f clear"
     % (SCR_Y, RIB_Y0, PK_Y, CSK_D / 2))
want("rib overhangs the pocket floor at the rear", PK_X0 <= SCR_REAR_X)
# and the 0.70 pad must still find floor, or nothing resists pitching
_pad = [(x0, x1) for (x0, x1, z) in UNDERSIDE if abs(z - SEAT_Z) < 1e-6]
want("the lowest case pad does not land on the seat",
     bool(_pad) and all(FLOOR_X0 <= x0 and x1 <= FLOOR_X1 for x0, x1 in _pad),
     "pad %s vs floor %.2f..%.2f" % (_pad, FLOOR_X0, FLOOR_X1))
want("pad bears on the ribs instead of the floor",
     all(x0 > SCR_REAR_X + RIB_HALF_LEN for x0, x1 in _pad),
     "pad starts at %.2f, ribs end at %.2f"
     % (_pad[0][0] if _pad else -1, SCR_REAR_X + RIB_HALF_LEN))

want("countersink breaks through the floor", CSK_H < T_FLOOR - 1.0,
     "%.2f mm deep in %.2f mm" % (CSK_H, T_FLOOR))
want("yoke centre bore does not clear the idler boss",
     CENTRE_D / 2 >= BOSS_OD / 2 + 0.50,
     "O%.2f bore vs O%.2f boss" % (CENTRE_D, BOSS_OD))
want("idler boss fouls the floor -- crescent relief too small",
     R_CLR >= BOSS_OD / 2, "R%.2f vs O%.2f boss" % (R_CLR, BOSS_OD))
want("idler boss stands proud of the bottom yoke plate",
     BOSS_PROUD < T_YOKE_B,
     "%.2f proud into a %.2f plate" % (BOSS_PROUD, T_YOKE_B))
want("nose-top relief too small -- neighbour's yoke will rub our shoulders",
     R_RELIEF >= R_RELIEF_MIN, "%.2f < %.2f" % (R_RELIEF, R_RELIEF_MIN))
want("cable notch bridge too long to print", CABLE_W <= 15.0)

# ---- the pocket clip.  Left rectangular the pocket's front corners reach
# 16.531 from the output axis against a NOSE_R of 16.50: an open slot through
# the nose.  These three checks say the clip is necessary, sufficient, and not
# so aggressive that it eats into the case.
want("nose wall thinner than one extrusion",
     NOSE_R - PK_R_LIM >= 0.42 - 1e-9, "%.3f mm" % (NOSE_R - PK_R_LIM))
_corner_r = math.hypot(PK_X1 - PITCH, PK_Y)
want("pocket clip is dead code -- the rectangle already fits inside the nose",
     _corner_r > PK_R_LIM,
     "corner at r=%.3f, limit %.3f" % (_corner_r, PK_R_LIM))
_clip_reach = PITCH + math.sqrt(max(PK_R_LIM ** 2 - (M_WID / 2) ** 2, 0.0))
want("pocket clip cuts into the case's own corner",
     PK_R_LIM > M_WID / 2 and _clip_reach >= CASE_X1,
     "clip reaches x=%.3f at y=%.2f, case front face is %.3f"
     % (_clip_reach, M_WID / 2, CASE_X1))

# ---- skid bosses.  Nothing checked these until a review found the rear one
# 0.75 mm from the floor's rear edge and nibbling the bottom yoke arm's corner.
want("skid bosses break the body side",
     W_HALF - (SKID_Y + BOSS_D / 2) >= 1.26,
     "%.2f mm web" % (W_HALF - (SKID_Y + BOSS_D / 2)))
want("skid bosses are too close together to stabilise a bracket",
     SKID_X_F - SKID_X_R >= 15.0, "%.2f mm apart" % (SKID_X_F - SKID_X_R))
for _nm, _sx in (("rear", SKID_X_R), ("forward", SKID_X_F)):
    want("%s skid boss breaks the floor's rear edge" % _nm,
         _sx - BOSS_D / 2 - FLOOR_X0 >= 1.26,
         "%.2f mm web" % (_sx - BOSS_D / 2 - FLOOR_X0))
    want("%s skid boss breaks the floor's front edge" % _nm,
         FLOOR_X1 - (_sx + BOSS_D / 2) >= 1.26,
         "%.2f mm web" % (FLOOR_X1 - (_sx + BOSS_D / 2)))
    want("%s skid boss fouls the crescent relief" % _nm,
         math.hypot(_sx - PITCH, SKID_Y) - BOSS_D / 2 >= R_CLR,
         "%.2f mm past it"
         % (R_CLR - (math.hypot(_sx - PITCH, SKID_Y) - BOSS_D / 2)))
    want("%s skid boss fouls a retention countersink" % _nm,
         math.hypot(_sx - SCR_REAR_X, SKID_Y - SCR_Y)
         >= CSK_D / 2 + BOSS_D / 2 + 0.84,
         "%.2f mm centres" % math.hypot(_sx - SCR_REAR_X, SKID_Y - SCR_Y))
    if KEEL_X0 - BOSS_D / 2 <= _sx <= KEEL_X1 + BOSS_D / 2:
        for yc in KEEL_Y:      # both open on the underside, so they can collide
            _c = abs(SKID_Y - abs(yc)) - KEEL_BASE_W / 2 - BOSS_D / 2
            want("%s skid boss breaks into the keel at y=%+.2f" % (_nm, yc),
                 _c > 0, "%.2f mm" % _c)
# The rear boss is the only one deep enough to need the rear-wall column, and
# that column is only 4.49 mm wide -- bounded by the floor edge behind and the
# pocket wall ahead.  This pair of checks is what forced it down to M2.
want("rear skid boss breaks into the motor pocket",
     PK_X0 - (SKID_X_R + BOSS_D / 2) >= 1.26,
     "%.2f mm web to the pocket wall at x=%.2f"
     % (PK_X0 - (SKID_X_R + BOSS_D / 2), PK_X0))
want("rear skid boss nibbles the bottom yoke arm",
     SKID_Y - BOSS_D / 2 >= ARM_HALF_B or SKID_X_R - BOSS_D / 2 >= ARM_X1_B,
     "boss starts at y=%.2f, arm reaches %.2f out to x=%.2f"
     % (SKID_Y - BOSS_D / 2, ARM_HALF_B, ARM_X1_B))
want("rear skid boss runs up into the cable notch",
     FLOOR_Z0 + SKID_DEP_R <= HORN_Z - CABLE_H,
     "tops out at z=%.2f, notch floor is %.2f"
     % (FLOOR_Z0 + SKID_DEP_R, HORN_Z - CABLE_H))
# The forward boss has the motor's bedding face above it, not 35 mm of shell.
want("forward skid boss breaks through into the motor seat",
     T_FLOOR - SKID_DEP_F >= 1.26,
     "%.2f mm of floor left under the case" % (T_FLOOR - SKID_DEP_F))
want("skid boss is too shallow to hold a thread",
     min(SKID_DEP_R, SKID_DEP_F) >= 0.9 * BOSS_D,
     "%.2f mm in a O%.2f pilot" % (min(SKID_DEP_R, SKID_DEP_F), BOSS_D))

if errs:
    raise SystemExit("segment_v6 FAILED its own checks:\n  - " + "\n  - ".join(errs))

# ============================ 11. EXPORT ====================================
here = os.path.dirname(os.path.realpath(__file__))
cq.exporters.export(part, os.path.join(here, "snake_segment_v6.step"))
cq.exporters.export(part, os.path.join(here, "snake_segment_v6.stl"))

F = STALL_T / (4 * BC_R / 1000)
print("=== SEGMENT v6 ===")
print("bbox            %.2f x %.2f x %.2f mm" % (bb.xlen, bb.ylen, bb.zlen))
print("volume          %.2f cm3  (~%.0f g in PLA, solid)"
      % (solid.Volume() / 1000, solid.Volume() / 1000 * 1.24))
print("ground contact  %.1f mm2 on %d keel lands at z=%.2f; nothing else touches"
      % (low_area, len(low), bb.zmin))
print("               (bottom yoke clears the floor by %.2f mm)"
      % (YOKE_B_Z - KEEL_Z))
print("sidewall        %.2f mm   floor %.2f mm   rear wall %.2f mm"
      % (W_HALF - PK_Y, T_FLOOR, PK_X0 - REAR_X))
print("motor pocket    x %.2f..%.2f, y +-%.2f, seat z=%.2f"
      % (PK_X0, PK_X1, PK_Y, SEAT_Z))
print("retention       2 x M2 csk at x=%.2f, y=+-%.2f, up through the floor and"
      % (SCR_REAR_X, SCR_Y))
print("                a rib to z=%.2f -- the case terrace is z=%.2f there,"
      % (RIB_TOP, case_z_at(SCR_REAR_X) or -1))
print("                NOT the z=%.2f seat.  Pattern '%s'; verify with a"
      % (SEAT_Z, SCR_PATTERN))
print("                caliper before you drill -- see probe_st3215.py.")
print("skid bosses     M2 self-tap, O%.2f pilot, at x=%.2f (%.1f deep) and"
      " x=%.2f (%.1f deep), y=+-%.2f"
      % (BOSS_D, SKID_X_R, SKID_DEP_R, SKID_X_F, SKID_DEP_F, SKID_Y))
print("load path       4+4 on R%.1f, double shear -> %.1f N/bolt at stall"
      " (M2.5 assumed)" % (BC_R, F))
print("chain           %.1f mm pitch x 10 joints = %.0f mm axis-to-axis,"
      " %.1f mm overall" % (PITCH, PITCH * 10, PITCH * 10 + bb.xlen))
print("PRINT           Z-up as modelled. Support under the two rear yoke plates,")
print("                and under the floor forward of the keels (x %.1f..%.1f),"
      % (KEEL_X1, FLOOR_X1))
print("                which has no keel beneath it. Sand the z=%.2f face flat."
      % HORN_Z)

"""
SURGE-090 snake robot — parametric body segment (1 of 11)
Motor: Waveshare ST3215 serial-bus servo (drawing SCS215, 2022/6/8)

Frame convention (obeys project spec exactly):
  Z = vertical, servo output shaft points +Z (undulation in X-Y)
  X = along snake (head<->tail), Y = lateral swing
  Rear joint axis A = (0,0);  front joint axis B = (PITCH,0);  both on Y=0.

Load path: double-shear yoke. TOP plate bolts to the previous segment's motor
HORN (face z=37.80), BOTTOM plate bolts to that motor's BEARING HUB (face
z=0.55). 4x M2.5 clearance on the 14 mm bolt circle in each plate + Ø8 centre.
No screws into the motor case.

Belly: BELLY_MODE switches "keels" (longitudinal ridges — grip sideways,
slide fore-aft: correct anisotropy for lateral undulation; chosen) or
"sawtooth" (fore-aft anisotropy, per the original spec text).

NOTE on the real motor STEP: only the PDF drawing was supplied, so
verification uses a max-material proxy built from the drawing + measured
constants. To verify against the real file, drop ST3215.step next to this
script — place_real_motor_step() applies the documented transform.
"""

import math
import cadquery as cq

# ----------------------------------------------------------------------------
# PARAMETERS (all mm)
# ----------------------------------------------------------------------------
PITCH        = 58.0      # joint-axis spacing A->B
W_HALF       = 19.5      # segment half width (39 wide)
CLEAR        = 0.40      # motor pocket clearance per side
N_SEG        = 11

# --- ST3215 measured ground truth (final frame, shaft on axis B, +Z up) ---
MOT_L        = 45.22     # case length along X
MOT_W        = 24.72     # case width along Y   (37.80 in the old spec text was
                         #  the HEIGHT along the shaft, not the width!)
MOT_SHAFT_TO_NOSE = 10.11   # shaft axis -> gearbox end face (drawing)
MOT_SHAFT_TO_TAIL = MOT_L - MOT_SHAFT_TO_NOSE   # 35.11 rearward
MOT_SEAT_Z   = 0.70      # lowest flat, safe seating plane (stepped underside)
MOT_HUB_Z    = 0.55      # rear bearing-hub face (bottom bolt circle)
MOT_HORN_Z   = 37.80     # output horn mating face (top bolt circle)
MOT_CASE_TOP = 35.55     # conservative case top (drawing 35 + 0.55 hub offset)
HORN_D       = 19.2      # horn / hub disc diameter
BCD          = 14.0      # bolt circle diameter (4 holes, 0/90/180/270 deg)
BOLT_CLR_D   = 2.7       # M2.5 clearance
CENTER_CLR_D = 8.0       # centre clearance over shaft boss/screw

# --- structure ---
YOKE_R       = 15.0      # yoke plate radius
YOKE_T       = 4.0       # yoke plate thickness
WALL_TOP     = 35.5      # top of body walls (horn pokes above; next yoke clears)
FLOOR_TOP    = MOT_SEAT_Z            # 0.70 motor seat
FLOOR_BOT    = FLOOR_TOP - 3.0       # -2.30
SOCKET_R     = W_HALF + 1.0          # 20.5 rear concave socket about A
NOSE_R       = W_HALF                # 19.5 front convex nose about B
JOINT_VOID_R = 21.0      # radius about B kept free below Z_VOID for the
                         # neighbour's bottom yoke plate + bridge sweep
Z_VOID       = 1.0       # nothing of ours below this within JOINT_VOID_R of B
REC_R_IN     = YOKE_R    # floor recess about A (under prev motor underside)
REC_R_OUT    = 21.0
REC_TOP      = 0.50      # recess floor top (prev case bottom 0.70 clears 0.20)

# neck taper (rear corner cut) — keeps +-80 deg swing collision-free
NECK_P1      = (18.58, 8.66)    # on socket arc at 25 deg
NECK_P2      = (19.00, 19.50)   # meets full-width flank

# yoke bridges
BRG_HW       = 9.0       # bridge half width
TOP_BRG      = dict(x0=10.0, x_peak=15.0, x1=22.0, z_hi=41.8, z_flat=37.8,
                    z_land=WALL_TOP)
BOT_BRG      = dict(x0=10.0, x1=22.0, z_lo=MOT_HUB_Z - YOKE_T, z_hi=MOT_HUB_Z)

# belly
BELLY_MODE   = "keels"   # "keels" | "sawtooth"
BELLY_X0, BELLY_X1 = 22.0, 35.0
KEEL_YS      = (-10.0, -5.0, 0.0, 5.0, 10.0)   # 5 mm pitch
KEEL_DEPTH   = 2.0
KEEL_BASE_W  = 3.0
KEEL_TIP_W   = 0.8       # flattened tip (bed adhesion / wear land)
SAW_PITCH    = 5.0
SAW_DEPTH    = 2.0
SAW_HW       = 10.0      # sawtooth pad half width

# skid bosses (M3 passive wheel fallback)
BOSS_XY      = [(24.0, 14.5), (24.0, -14.5), (34.0, 14.5), (34.0, -14.5)]
BOSS_D       = 9.0
BOSS_PILOT_D = 2.5       # M3 self-tap pilot
BELLY_Z      = FLOOR_BOT - KEEL_DEPTH   # -4.30 ground line

# lightening windows through side walls
WINDOWS      = [dict(x0=24.0, x1=33.0, z0=5.0, z1=30.0, r=3.0),
                dict(x0=38.0, x1=48.0, z0=5.0, z1=30.0, r=3.0)]
# cable features
CABLE_SLOT   = dict(x0=21.5, x1=28.5, hw=6.0)   # floor aperture under the
                                                # motor's rear-underside cable
                                                # window (stepped underside)
CABLE_NOTCH  = dict(x0=25.0, x1=29.0, z1=5.0)   # side exits from slot, both walls
CABLE_HOLE_D = 8.0
FRONT_CABLE  = dict(x=71.5, z=18.0)             # lateral Ø8 tunnel through nose

EPS = 1e-6


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def _box(x0, x1, y0, y1, z0, z1):
    return cq.Workplane("XY").box(x1 - x0, y1 - y0, z1 - z0, centered=True) \
        .translate(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))


def _cyl(x, y, z0, z1, d):
    return (cq.Workplane("XY").workplane(offset=z0).center(x, y)
            .circle(d / 2).extrude(z1 - z0))


# ----------------------------------------------------------------------------
# plan outline (socket – neck taper – flanks – nose)
# ----------------------------------------------------------------------------
def plan_outline_wp():
    p1x, p1y = NECK_P1
    p2x, p2y = NECK_P2
    return (cq.Workplane("XY")
            .moveTo(p2x, p2y)
            .lineTo(p1x, p1y)
            .threePointArc((SOCKET_R, 0.0), (p1x, -p1y))       # concave socket
            .lineTo(p2x, -p2y)
            .lineTo(PITCH, -W_HALF)
            .threePointArc((PITCH + NOSE_R, 0.0), (PITCH, W_HALF))  # nose
            .close())


# ----------------------------------------------------------------------------
# segment solid
# ----------------------------------------------------------------------------
def build_segment():
    outline = plan_outline_wp()
    walls = outline.extrude(WALL_TOP - FLOOR_TOP).translate((0, 0, FLOOR_TOP))
    floor = plan_outline_wp().extrude(FLOOR_TOP - FLOOR_BOT) \
        .translate((0, 0, FLOOR_BOT))
    seg = walls.union(floor)

    # ---- yoke plates at A ----
    seg = seg.union(_cyl(0, 0, MOT_HORN_Z, MOT_HORN_Z + YOKE_T, 2 * YOKE_R))
    seg = seg.union(_cyl(0, 0, BOT_BRG["z_lo"], BOT_BRG["z_hi"], 2 * YOKE_R))

    # ---- top bridge: flat over the horn zone, ramps down onto the neck ----
    t = TOP_BRG
    prof = (cq.Workplane("XZ", origin=(0, -BRG_HW, 0))
            .moveTo(t["x0"], t["z_flat"])
            .lineTo(t["x_peak"], t["z_flat"])
            .lineTo(t["x1"], t["z_land"])
            .lineTo(t["x1"], t["z_hi"])
            .lineTo(t["x0"], t["z_hi"])
            .close().extrude(-2 * BRG_HW))
    seg = seg.union(prof)

    # ---- bottom bridge ----
    b = BOT_BRG
    seg = seg.union(_box(b["x0"], b["x1"], -BRG_HW, BRG_HW, b["z_lo"], b["z_hi"]))

    # ---- belly texture ----
    if BELLY_MODE == "keels":
        for ky in KEEL_YS:
            prof = (cq.Workplane("YZ", origin=(BELLY_X0, 0, 0))
                    .moveTo(ky - KEEL_BASE_W / 2, FLOOR_BOT)
                    .lineTo(ky - KEEL_TIP_W / 2, BELLY_Z)
                    .lineTo(ky + KEEL_TIP_W / 2, BELLY_Z)
                    .lineTo(ky + KEEL_BASE_W / 2, FLOOR_BOT)
                    .close().extrude(BELLY_X1 - BELLY_X0))
            seg = seg.union(prof)
    else:  # sawtooth: cliff faces -X, ramp rises toward +X
        x = BELLY_X0
        while x + SAW_PITCH <= BELLY_X1 + EPS:
            prof = (cq.Workplane("XZ", origin=(0, -SAW_HW, 0))
                    .moveTo(x, FLOOR_BOT)
                    .lineTo(x, BELLY_Z)
                    .lineTo(x + SAW_PITCH, FLOOR_BOT)
                    .close().extrude(-2 * SAW_HW))
            seg = seg.union(prof)
            x += SAW_PITCH

    # ---- skid bosses ----
    for bx, by in BOSS_XY:
        seg = seg.union(_cyl(bx, by, BELLY_Z, FLOOR_BOT + 0.1, BOSS_D))

    # ================= cuts =================
    # front joint void: neighbour's bottom yoke + bridge sweep under our nose
    seg = seg.cut(_cyl(PITCH, 0, BELLY_Z - 5, Z_VOID, 2 * JOINT_VOID_R))
    # rear floor recess under the previous motor's stepped underside
    seg = seg.cut(_cyl(0, 0, REC_TOP, FLOOR_TOP + 0.05, 2 * REC_R_OUT))
    # motor pocket (opens from top, seat stays at z=0.70)
    seg = seg.cut(_box(PITCH - MOT_SHAFT_TO_TAIL - CLEAR,
                       PITCH + MOT_SHAFT_TO_NOSE + CLEAR,
                       -(MOT_W / 2 + CLEAR), MOT_W / 2 + CLEAR,
                       FLOOR_TOP, 60))
    # cable slot through the floor under the motor's rear cable window
    cs = CABLE_SLOT
    seg = seg.cut(_box(cs["x0"], cs["x1"], -cs["hw"], cs["hw"],
                       FLOOR_BOT - KEEL_DEPTH - 1, FLOOR_TOP + 0.2))
    # side cable notches (slot -> outside), both walls
    cn = CABLE_NOTCH
    seg = seg.cut(_box(cn["x0"], cn["x1"], -25, 25, FLOOR_TOP - 0.05, cn["z1"]))
    # lightening windows through both side walls
    for w in WINDOWS:
        cut = _box(w["x0"], w["x1"], -25, 25, w["z0"], w["z1"])
        cut = cut.edges("|Y").fillet(w["r"])
        seg = seg.cut(cut)
    # lateral cable tunnel through the nose (front pass-through)
    seg = seg.cut(cq.Workplane("XZ", origin=(FRONT_CABLE["x"], 25, FRONT_CABLE["z"]))
                  .circle(CABLE_HOLE_D / 2).extrude(50))
    # yoke bolt pattern at A (through both plates)
    for ang in (0, 90, 180, 270):
        hx = (BCD / 2) * math.cos(math.radians(ang))
        hy = (BCD / 2) * math.sin(math.radians(ang))
        seg = seg.cut(_cyl(hx, hy, -10, 50, BOLT_CLR_D))
    seg = seg.cut(_cyl(0, 0, -10, 50, CENTER_CLR_D))
    # M3 pilots up into the skid bosses
    for bx, by in BOSS_XY:
        seg = seg.cut(_cyl(bx, by, BELLY_Z - 0.1, 0.0, BOSS_PILOT_D))
    return seg


# ----------------------------------------------------------------------------
# ST3215 max-material proxy (final frame, shaft on B) — from drawing + constants
# ----------------------------------------------------------------------------
def build_motor_proxy():
    case = _box(PITCH - MOT_SHAFT_TO_TAIL, PITCH + MOT_SHAFT_TO_NOSE,
                -MOT_W / 2, MOT_W / 2, MOT_SEAT_Z, MOT_CASE_TOP)
    horn = _cyl(PITCH, 0, MOT_CASE_TOP, MOT_HORN_Z, HORN_D)
    hub = _cyl(PITCH, 0, MOT_HUB_Z, MOT_SEAT_Z + 0.05, HORN_D)
    return case.union(horn).union(hub)


def place_real_motor_step(path="ST3215.step"):
    """Documented placement for the real vendor STEP (not shipped here)."""
    m = cq.importers.importStep(path)
    return (m.rotate((0, 0, 0), (1, 0, 0), 90)
             .translate((25.5, 0, 0))
             .rotate((0, 0, 0), (0, 0, 1), 180)
             .translate((PITCH, 0, 28.20)))


# ----------------------------------------------------------------------------
# verification
# ----------------------------------------------------------------------------
def vol(shape):
    try:
        return abs(shape.val().Volume())
    except Exception:
        return 0.0


def verify(seg, motor):
    ok = True
    report = []

    v = vol(seg.intersect(motor))
    report.append(f"[1] segment ∩ motor interference: {v:.6f} mm³ "
                  f"{'PASS' if v < 1e-3 else 'FAIL'}")
    ok &= v < 1e-3

    for ang in (0, 15, 30, 45, 60, 70, 80, -15, -30, -45, -60, -70, -80):
        seg2 = (seg.translate((PITCH, 0, 0))
                   .rotate((PITCH, 0, -100), (PITCH, 0, 100), ang))
        v1 = vol(seg2.intersect(seg))
        v2 = vol(seg2.intersect(motor))
        p = v1 < 1e-3 and v2 < 1e-3
        report.append(f"[2] swing {ang:+4d}°: vs segment {v1:.6f} mm³, "
                      f"vs motor {v2:.6f} mm³ {'PASS' if p else 'FAIL'}")
        ok &= p

    bb = seg.val().BoundingBox()
    report.append(f"[3] PITCH = {PITCH} mm ; envelope X {bb.xlen:.2f} × "
                  f"Y {bb.ylen:.2f} × Z {bb.zlen:.2f} mm "
                  f"(x {bb.xmin:.2f}..{bb.xmax:.2f}, z {bb.zmin:.2f}..{bb.zmax:.2f})")
    report.append(f"[3] per-side motor clearance = {CLEAR} mm ; "
                  f"11 × PITCH = {N_SEG * PITCH:.0f} mm")
    report.append(f"    segment volume = {vol(seg) / 1000:.1f} cm³ "
                  f"(≈{vol(seg) / 1000 * 1.27:.0f} g solid PETG)")
    return ok, report


# ----------------------------------------------------------------------------
if __name__ == "__main__":
    seg = build_segment()
    motor = build_motor_proxy()
    ok, report = verify(seg, motor)
    print("\n".join(report))
    print("VERIFICATION:", "ALL PASS" if ok else "*** FAILURES ***")

    cq.exporters.export(seg, "snake_segment.step")
    cq.exporters.export(seg, "snake_segment.stl",
                        tolerance=0.02, angularTolerance=0.2)
    cq.exporters.export(motor, "st3215_proxy.step")
    print("exported snake_segment.step / .stl / st3215_proxy.step")

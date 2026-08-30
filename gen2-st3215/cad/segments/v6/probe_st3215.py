"""
SURGE-090 -- ST3215 REALITY PROBE.   RUN THIS BEFORE PRINTING segment_v6.
=========================================================================
segment_v6.py is built on eleven numbers read off ST3215.pdf (DWG SCS215).
Nine of them are self-consistent and safe.  Two are assumptions I could not
settle from the drawing, and both are load-bearing:

  * SEAT_Z = 0.70 -- the claim that the case's lowest WIDE face is 0.70 mm
    above the idler boss tip, so a floor whose top sits at z=0.70 actually
    beds the motor instead of rocking it on a boss or a moulding step.
  * the case underside step profile at the retention screws (x=25.25,
    y=+-10.25).  segment_v4.py claims the 0.70 face only spans x 28.8..38.2 --
    both screws are OUTSIDE that band, which is a strange place for the
    manufacturer to put mounting holes.  If the case steps UP there, the
    screws pull the case down onto a proud step and preload nothing.

This script measures those from gen2-st3215/cad/motor-ref/ST3215.step and
prints MATCH / DIFFERS against what segment_v6.py assumes.

CAVEAT, and it matters: ST3215.step is an assembly whose sub-part frames are
untransformed -- the raw point cloud spans 350 x 291 x 242 mm, which is
meaningless.  So this script never trusts the assembly bounding box.  It
measures each solid in its OWN frame and matches by shape, not by position.
If it cannot find the case, it falls back to a caliper checklist; do that
instead and do not guess.

Run:  python3 probe_st3215.py
"""
import os
import sys

try:
    import cadquery as cq
except ImportError:
    sys.exit("cadquery not installed:  pip install cadquery")

HERE = os.path.dirname(os.path.realpath(__file__))
STEP = os.path.normpath(os.path.join(HERE, "..", "..", "motor-ref", "ST3215.step"))

# ---- what segment_v6.py is built on -----------------------------------------
ASSUME = {
    "case length, X":                 45.22,
    "case width, Y":                  24.72,
    "idler face to horn face":        37.25,
    "shaft axis from horn-end face":  10.11,
    "horn mating face z":             37.80,
    "idler mating face z":            0.55,
    "lowest WIDE face (seat) z":       0.70,
    "bolt circle radius, both faces":  7.00,
    "horn / idler disc radius":        9.60,
    "case screw pitch X":             24.45,
    "case screw pitch Y":             20.50,
    "idler centre boss diameter":      6.00,
    "idler boss proud of face":        0.30,
    "mounting terrace z":              4.10,
}
TOL = 0.25          # mm; tighter than this is not meaningful off a vendor STEP
found = {}

def report():
    print("\n" + "=" * 74)
    print("%-34s %10s %10s   %s" % ("QUANTITY", "ASSUMED", "MEASURED", "VERDICT"))
    print("-" * 74)
    bad = 0
    for k, want in ASSUME.items():
        got = found.get(k)
        if got is None:
            print("%-34s %10.2f %10s   NOT FOUND -- use calipers" % (k, want, "--"))
            bad += 1
        elif abs(got - want) <= TOL:
            print("%-34s %10.2f %10.2f   MATCH" % (k, want, got))
        else:
            print("%-34s %10.2f %10.2f   DIFFERS by %+.2f  <<<"
                  % (k, want, got, got - want))
            bad += 1
    print("-" * 74)
    print("%d of %d quantities confirmed." % (len(ASSUME) - bad, len(ASSUME)))
    if bad:
        print("\nDo NOT print segment_v6 until the flagged rows are settled --")
        print("every one of them shifts the motor inside the pocket.")
    return bad

# ---- 1. load, and find the case in spite of the broken assembly frames ------
if not os.path.exists(STEP):
    print("no STEP at %s" % STEP)
    report()
    sys.exit(1)

print("loading %s ..." % STEP)
shape = cq.importers.importStep(STEP)
solids = [s for v in shape.vals() for s in v.Solids()]
print("%d solids in the assembly" % len(solids))

rows = []
for i, s in enumerate(solids):
    bb = s.BoundingBox()
    rows.append((s.Volume(), i, s, sorted([bb.xlen, bb.ylen, bb.zlen])))
rows.sort(reverse=True)

print("\nlargest solids, dimensions sorted so orientation does not matter:")
for vol, i, s, d in rows[:8]:
    print("   #%-3d vol %9.1f mm3   %6.2f x %6.2f x %6.2f" % (i, vol, *d))

# the case: two dims within TOL of 45.22 and 24.72, in any order/orientation
case = None
for vol, i, s, d in rows:
    if (abs(d[2] - 45.22) <= 1.0 and abs(d[1] - 24.72) <= 1.5) or \
       (abs(d[1] - 45.22) <= 1.0 and abs(d[0] - 24.72) <= 1.5):
        case, case_i, case_d = s, i, d
        break

if case is None:
    print("\nCould not identify the case by shape. The STEP is probably too")
    print("mangled to measure. Fall back to calipers.")
else:
    print("\ncase identified as solid #%d: %.2f x %.2f x %.2f"
          % (case_i, *case_d))
    found["case length, X"] = case_d[2]
    found["case width, Y"] = case_d[1]

    bb = case.BoundingBox()
    # work out which axis is the shaft axis: the case is longest along the
    # motor's length, and the shaft is perpendicular to it through the height
    ax = {"x": bb.xlen, "y": bb.ylen, "z": bb.zlen}
    long_axis = max(ax, key=ax.get)
    print("   long axis is %s; treating the perpendicular short axis as height"
          % long_axis)

    # ---- 2. horizontal faces: these give the datum planes ------------------
    # "horizontal" = normal parallel to the height axis of the case's own frame
    hgt_axis = min(ax, key=ax.get)
    idx = {"x": 0, "y": 1, "z": 2}[hgt_axis]
    lo = {"x": bb.xmin, "y": bb.ymin, "z": bb.zmin}[hgt_axis]

    up, down = [], []
    for f in case.Faces():
        if f.geomType() != "PLANE":
            continue
        try:
            n = f.normalAt()
        except Exception:
            continue
        comp = (n.x, n.y, n.z)[idx]
        if abs(comp) < 0.98:
            continue
        c = (f.Center().x, f.Center().y, f.Center().z)[idx]
        (up if comp > 0 else down).append((c - lo, f.Area(), f))

    print("\n   UPWARD-facing planar faces (height measured from the case's own"
          " lowest point):")
    for h, a, f in sorted(up)[:12]:
        fb = f.BoundingBox()
        print("      z=%7.2f  area %8.1f mm2   extent %.1f x %.1f"
              % (h, a, fb.xlen, fb.ylen))
    print("\n   DOWNWARD-facing planar faces  <-- this answers the seat question:")
    for h, a, f in sorted(down)[:12]:
        fb = f.BoundingBox()
        print("      z=%7.2f  area %8.1f mm2   extent %.1f x %.1f"
              % (h, a, fb.xlen, fb.ylen))

    # the seat is the lowest downward face with real area (not a boss)
    wide = [(h, a) for h, a, _ in down if a >= 100.0]
    if wide:
        found["lowest WIDE face (seat) z"] = min(wide)[0]
        print("\n   lowest downward face with area >= 100 mm2 is at z=%.2f"
              " (%.0f mm2)" % min(wide))
    tall = [h for h, a, _ in up if a >= 50.0]
    if tall:
        found["horn mating face z"] = max(tall)

    # ---- 3. cylinders: bolt circles, discs, screw holes --------------------
    cyls = []
    for f in case.Faces():
        if f.geomType() != "CYLINDER":
            continue
        fb = f.BoundingBox()
        dims = [fb.xlen, fb.ylen, fb.zlen]
        r = (sum(dims) - max(dims)) / 4.0      # two cross-axis spans / 4
        cyls.append((r, f.Center(), max(dims)))

    def cluster(rlo, rhi):
        return [(r, c, L) for r, c, L in cyls if rlo <= r <= rhi]

    screw = cluster(0.9, 1.8)
    print("\n   %d cylindrical faces r=0.9..1.8 mm (candidate M2 case holes):"
          % len(screw))
    for r, c, L in screw[:10]:
        print("      r=%.2f  centre (%7.2f, %7.2f, %7.2f)  length %.2f"
              % (r, c.x, c.y, c.z, L))
    if len(screw) >= 4:
        A = {"x": [c.x for _, c, _ in screw], "y": [c.y for _, c, _ in screw],
             "z": [c.z for _, c, _ in screw]}
        spans = sorted((max(v) - min(v), k) for k, v in A.items())
        print("      hole-pattern spans: " +
              ", ".join("%s %.2f" % (k, s) for s, k in reversed(spans)))
        print("      -> compare against 24.45 (X) and 20.50 (Y); a bolt circle"
              " of R7.0 shows up as 14.00 in BOTH")
        big, mid = spans[2][0], spans[1][0]
        if abs(big - 24.45) <= TOL:
            found["case screw pitch X"] = big
        elif abs(big - 20.70) <= TOL:
            print("      !! this face reads 20.70, not 24.45 -- see item 4"
                  " below before printing")
        if abs(mid - 20.50) <= TOL:
            found["case screw pitch Y"] = mid
        if abs(big - 14.00) <= TOL and abs(mid - 14.00) <= TOL:
            found["bolt circle radius, both faces"] = big / 2

    disc = cluster(9.0, 10.2)
    if disc:
        found["horn / idler disc radius"] = sum(r for r, _, _ in disc) / len(disc)
        print("\n   %d cylindrical faces r=9.0..10.2 (horn / idler discs), mean"
              " r=%.2f" % (len(disc), found["horn / idler disc radius"]))

bad = report()

print("""
WHAT THIS SCRIPT CANNOT TELL YOU -- 60 seconds with the motor in your hand
--------------------------------------------------------------------------
1. DOES THE REAR IDLER DISC ROTATE WITH THE HORN?  Turn the horn by hand and
   watch the rear disc.  segment_v6's whole load path assumes it rotates, so
   that both yoke plates can be bolted to it and the joint runs in double
   shear.  If that disc is FIXED to the case, bolting both plates locks the
   joint solid and you will stall or strip a gear on the first command.
   -> if fixed: leave the four bottom-plate bolts out and use the plate as a
      plain thrust washer, or open its Ø8 centre bore to clear the boss only.

2. CASE SCREW SIZE AND THREAD DEPTH.  ST3215.dxf draws every case hole as a
   concentric O1.6 / O2.0 pair, which is the tap-drill / nominal pair for M2
   (M2.5 would be O2.05 / O2.5), so segment_v6 now uses M2 with a O4.0
   countersink.  Try an M2 screw in the case before you print.  Then measure
   usable thread depth: the screw crosses a 3.60 mm floor plus a 3.35 mm rib,
   so an M2 x 12 wants >= 4 mm of thread beyond that.  Bottoming a screw out
   will crack the case before it clamps.

3. WEIGH ONE MOTOR.  verify_v6.py assumes 60 g and reports 1.11 kg for eleven
   segments.  That figure sets the whole torque budget, and the whole-body
   pivot case already runs at 95%% of stall at mu=0.8.

4. *** WHICH FACE CARRIES WHICH SCREW PATTERN? ***  This is the one open
   question in the design and it takes one caliper reading.  The drawing shows
   the two large faces with DIFFERENT patterns and labels neither:
        24.45 mm between hole centres  -> segment_v6's default, "p2445"
        20.70 mm between hole centres  -> "p2070"
   Put the motor horn-side UP, so the face that will sit on the floor is
   downward, and measure centre-to-centre between its two screw holes along
   the long axis of the case.
        24.45 -> nothing to do.  Both holes land on the z=4.10 terrace, the
                 ribs in section 8 are correct, and this is why it is the
                 default: a mounting interface on one flat plane.
        20.70 -> set SCR_PATTERN = "p2070" in BOTH segment_v6.py and
                 verify_v6.py, AND set RIB_TOP = SEAT_Z (0.70) to delete the
                 ribs -- at x=29.00 the case comes all the way down to the
                 seat, so a rib there would LIFT the motor off its pad.  Then
                 re-run verify_v6.py; it checks exactly this and will fail
                 loudly if you change one without the other.  Note that x=29.00
                 sits only 0.20 mm inside the pad's rear edge, so inspect
                 whether the hole actually breaks that edge on your part.

5. THE UNDERSIDE IS TERRACED, NOT FLAT -- confirm it.  Lay a straightedge
   across the case underside along the long axis.  Off ST3215.dxf, in
   segment_v6's x frame, the lowest material should step:
        z = 0.70  only over x 28.80 .. 38.23   (a 9.43 mm pad)
        z = 2.60  over x 26.25 .. 48.77
        z = 4.10  over x 25.03 .. 52.30
   segment_v6's floor is built to meet the 0.70 pad and its ribs to meet the
   4.10 terrace.  If your part disagrees, edit UNDERSIDE and re-run
   verify_v6.py rather than shimming it at assembly.
""")
sys.exit(1 if bad else 0)

"""
SURGE-090 Smart Snake Robot -- SEGMENT v4  (1 of 11)
Every dimension below was MEASURED from the supplied ST3215.step.

MEASURED FACTS
  bbox                45.22 x 37.80 x 24.72
  shaft axis          x=-25.5, z=0, along Y
  output horn face    z=37.80, 4 x R1.25 blind holes on r=7.0 (14 mm BC), centre R1.60
  rear bearing hub    z=0.55, 4 x R1.25 blind holes on r=7.0 (14 mm BC), centre boss to z=0
  -> BOTH ends carry the same 4-hole pattern = standard double-shear bracket interface
  underside is STEPPED: lowest wide face is z=0.70 over x 28.8..38.2  <- the only safe seat
  no other external mounting holes exist; the case is gripped by the cradle

ORIENTATION
  shaft vertical (Z) -> planar lateral undulation in X-Y.  X along snake, Y = swing.
  A=(0,0) rear joint (grips PREVIOUS motor).  B=(PITCH,0) this segment's own shaft.
  Identical parts chained -> every shaft axis lands on one straight line.
"""
import cadquery as cq
import math

# ---------------- measured ST3215 ----------------
M_LEN, M_WID   = 45.22, 24.72
SHAFT_TO_BACK  = 35.11
HORN_Z         = 37.80      # top mating face
HUB_Z          = 0.55       # bottom mating face
SEAT_Z         = 0.70       # lowest safe seat plane
BC_R           = 7.00       # 14 mm bolt circle  (MEASURED)
BOLT_D         = 2.70
CENTRE_D       = 8.00       # clears the centre boss on both ends

# ---------------- build parameters ----------------
CLEAR    = 0.40
PITCH    = 58.0
NOSE_R   = 16.5             # front cap, centred on B
SOCK_R   = 17.5             # rear socket, centred on A
PLATE_R  = 15.0
PLATE_T  = 4.0
LIP_X0, LIP_X1 = 20.0, 42.0 # belly pad extent (clears both neighbours' plates)
LIP_Z    = -3.0
SCALE_P, SCALE_D = 5.0, 2.0
W_HALF   = NOSE_R

# ================= 1. SHELL =================
shell = (
    cq.Workplane("XY").workplane(offset=SEAT_Z)
    .moveTo(SOCK_R, -W_HALF).lineTo(PITCH, -W_HALF)
    .lineTo(PITCH, W_HALF).lineTo(SOCK_R, W_HALF).close()
    .extrude(HORN_Z - SEAT_Z)
)
shell = shell.union(
    cq.Workplane("XY").workplane(offset=SEAT_Z).moveTo(PITCH, 0)
      .circle(NOSE_R).extrude(HORN_Z - SEAT_Z))
shell = shell.cut(
    cq.Workplane("XY").workplane(offset=LIP_Z - PLATE_T - 2).moveTo(0, 0)
      .circle(SOCK_R).extrude(HORN_Z + 20))

# ================= 2. BELLY PAD (the only safe seat plane) =================
lip = (cq.Workplane("XY").workplane(offset=LIP_Z)
         .moveTo((LIP_X0+LIP_X1)/2, 0).rect(LIP_X1-LIP_X0, 2*W_HALF)
         .extrude(SEAT_Z - LIP_Z))
shell = shell.union(lip)

# ================= 3. MOTOR POCKET (exact footprint + clearance) =================
pk_cx = PITCH - SHAFT_TO_BACK + M_LEN/2
shell = shell.cut(
    cq.Workplane("XY").workplane(offset=SEAT_Z)
      .moveTo(pk_cx, 0).rect(M_LEN + 2*CLEAR, M_WID + 2*CLEAR)
      .extrude(HORN_Z - SEAT_Z + 5))

# ================= 4. DOUBLE-SHEAR YOKE (real 4-hole pattern, both ends) =================
def yoke(z0):
    p = (cq.Workplane("XY").workplane(offset=z0).moveTo(0, 0)
           .circle(PLATE_R).extrude(PLATE_T))
    p = p.union(cq.Workplane("XY").workplane(offset=z0)
                  .moveTo(11, 0).rect(22, 22).extrude(PLATE_T))
    p = (p.copyWorkplane(cq.Workplane("XY").workplane(offset=z0+PLATE_T))
           .pushPoints([(0, 0)]).hole(CENTRE_D))
    for a in range(4):
        ang = math.radians(90*a)
        p = (p.copyWorkplane(cq.Workplane("XY").workplane(offset=z0+PLATE_T))
               .pushPoints([(BC_R*math.cos(ang), BC_R*math.sin(ang))]).hole(BOLT_D))
    return p

shell = shell.union(yoke(HORN_Z))              # bolts to previous HORN
shell = shell.union(yoke(HUB_Z - PLATE_T))     # bolts to previous BEARING HUB

# ================= 5. ANISOTROPIC BELLY SCALES =================
# ramp rises toward +X, vertical cliff faces -X  -> slides forward, bites backward
n = int((LIP_X1 - LIP_X0) / SCALE_P)
for i in range(n):
    x0 = LIP_X0 + i*SCALE_P
    tooth = (cq.Workplane("XZ")
               .moveTo(x0, LIP_Z).lineTo(x0 + SCALE_P, LIP_Z)
               .lineTo(x0 + SCALE_P, LIP_Z + SCALE_D).close()
               .extrude(-(W_HALF + 4), both=True))
    shell = shell.cut(tooth)

# caster / skid bosses (M3) as the alternative friction scheme
for fx in (0.25, 0.75):
    for sy in (-1, 1):
        shell = shell.cut(
            cq.Workplane("XY").workplane(offset=LIP_Z - 1)
              .moveTo(LIP_X0 + fx*(LIP_X1-LIP_X0), sy*(W_HALF - 4.5))
              .circle(1.6).extrude(SEAT_Z - LIP_Z + 2))

# ================= 6. cable pass-throughs + lightening windows =================
for cx in (SOCK_R + 6, PITCH - 26):
    shell = shell.cut(
        cq.Workplane("XZ").workplane(offset=W_HALF + 3)
          .moveTo(cx, HORN_Z - 7).circle(4.0).extrude(-(2*W_HALF + 6)))
for cx in (pk_cx - 13, pk_cx + 9):
    w = (cq.Workplane("XZ").workplane(offset=W_HALF + 3)
           .moveTo(cx, 19).rect(14, 18).extrude(-(2*W_HALF + 6)))
    try:
        w = w.edges("|Y").fillet(3)
    except Exception:
        pass
    shell = shell.cut(w)

import os
dir_path = os.path.dirname(os.path.realpath(__file__))
cq.exporters.export(shell, os.path.join(dir_path, "snake_segment_v4.step"))
cq.exporters.export(shell, os.path.join(dir_path, "snake_segment_v4.stl"))
bb = shell.val().BoundingBox()
print("PITCH %.1f  OUTER %.1f x %.1f x %.1f" % (PITCH, bb.xlen, bb.ylen, bb.zlen))
print("11 segments -> %.0f mm" % (11*PITCH))

"""Official ST3215 STEP placed in the servo frame S, with datum checks.

S: origin on the output axis midway between the horn faces, +Y towards the
driving horn, -X towards the far (connector) end, Z across the plan width.
The STEP's eight solids are checked for placement against the 2D drawing
before anything is measured from them; a failed check raises.
"""

import math
import numpy as np
import trimesh
from build123d import import_step, export_stl, Location, Axis, Compound

import params as P

# STEP solid labels -> groups. Horn and rear disc rotate with the body that
# owns the fork; the case parts stay with the body that owns the cradle.
GROUPS = {
    "case": ("ZK_122", "SG-ZIJI_15", "XG-ZIJI_16"),
    "horn_drive": ("金属舵盘（驱动）_v2",),
    "disc_rear": ("金属舵盘（从动）_v2",),
    "internal": ("MOTOR-1723_3", "PCB-CHAZUO_92", "GE_27"),
}
STEP_AXIS_X = -25.5
STEP_HORN_MID_Y = -9.025


def _to_servo_frame(shape):
    # (x, y, z) -> (-x - 25.5, y + 9.025, -z)
    return shape.rotate(Axis.Y, 180).translate((STEP_AXIS_X, -STEP_HORN_MID_Y, 0))


_cache = {}


def servo_solids():
    """dict group -> list of build123d Solids in frame S (cached per process)."""
    if "solids" in _cache:
        return _cache["solids"]
    asm = import_step(str(P.SERVO_STEP))
    by_label = {c.label: c for c in asm.children}
    out = {}
    for g, labels in GROUPS.items():
        out[g] = [_to_servo_frame(by_label[l]) for l in labels]
    _check_datums(out)
    _cache["solids"] = out
    return out


def _bb(shapes):
    return Compound(shapes).bounding_box()


def _check_datums(s):
    """Placement checks against the drawing (section 1a). Raise on mismatch."""
    tol = 0.05
    case = _bb(s["case"])
    hd = _bb(s["horn_drive"])
    hr = _bb(s["disc_rear"])
    checks = {
        "plan length 45.22": (case.size.X, P.servo_plan_l),
        "plan width 24.72": (case.size.Z, P.servo_plan_w),
        "axis from horn end 10.11": (case.max.X, P.servo_axis_from_end),
        "horn dia 19.2": (hd.size.X, P.horn_dia),
        "drive horn centred on axis X": (hd.center().X, 0.0),
        "rear disc centred on axis X": (hr.center().X, 0.0),
        "horn face to horn face 37.25": (hd.max.Y - hr.min.Y, 37.25),
        "drive horn face": (hd.max.Y, P.horn_face_y),
        "rear disc face": (hr.min.Y, -P.horn_face_y),
        "rear boss proud of disc": (case.min.Y, P.rear_boss_y),
        "top block (32 callout)": (case.max.Y - P.case_y_face_b, 32.0),
    }
    bad = {k: v for k, v in checks.items() if abs(v[0] - v[1]) > tol}
    if bad:
        raise RuntimeError(f"servo STEP placement check failed: {bad}")
    _cache["datum_report"] = checks


def datum_report():
    servo_solids()
    return _cache["datum_report"]


def servo_meshes(tol=0.08):
    """dict group -> trimesh.Trimesh in frame S, cached as STL."""
    if "meshes" in _cache:
        return _cache["meshes"]
    P.CACHE.mkdir(parents=True, exist_ok=True)
    out = {}
    for g in ("case", "horn_drive", "disc_rear"):
        f = P.CACHE / f"servo_{g}.stl"
        if not f.exists():
            export_stl(Compound(servo_solids()[g]), str(f), tolerance=tol)
        out[g] = trimesh.load(str(f), force="mesh")
    _cache["meshes"] = out
    return out


def crossbar_radius():
    """Smallest distance from the joint axis to the inside of a fork crossbar
    of width fork_h that clears this servo's case by gap_moving over +-90 deg,
    and also clears a cradle whose side walls sit at case_z_half+fit+wall.

    Returns (L_c, governing description)."""
    v = servo_meshes()["case"].vertices
    x, z = v[:, 0], v[:, 2]
    half = P.fork_h / 2 + P.gap_moving
    best, where = 0.0, None
    for th in np.radians(np.arange(-90.0, 90.01, 0.25)):
        u = x * math.cos(th) + z * math.sin(th)
        w = -x * math.sin(th) + z * math.cos(th)
        m = np.abs(w) <= half
        if m.any():
            k = np.argmax(np.where(m, u, -1e9))
            if u[k] > best:
                best, where = float(u[k]), (math.degrees(th), float(x[k]), float(z[k]))
    side_wall = P.case_z_half + P.fit_servo + P.wall
    lc_case = best + P.gap_moving + P.clearance_margin
    lc_wall = side_wall + P.gap_moving + P.clearance_margin
    if lc_case >= lc_wall:
        return lc_case, f"servo case point (x={where[1]:.2f}, z={where[2]:.2f}) at {where[0]:.1f} deg"
    return lc_wall, "cradle side wall"


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    for k, (got, want) in datum_report().items():
        print(f"{k:32s} STEP {got:8.3f}  drawing/param {want:8.3f}")
    print("crossbar radius L_c = %.3f (%s)" % crossbar_radius())

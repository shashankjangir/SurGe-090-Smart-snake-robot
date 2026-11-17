"""B0..B10 transforms for any set of joint angles, and the neutral assembly.

World: +X towards the head, +Z up, +Y left. Joint i sits between B(i-1) and
B(i); the case of servo i belongs to B(i) and its horn (and rear disc) are
bolted to B(i-1)'s fork.

Joint angles are given in the firmware convention (degrees from encoder 2048);
the physical servo rotation is q = sign_i * a_i using joint_map.json (read
only). Physical q is taken as a right-hand rotation of the horn relative to
the case about the drive-horn-outward axis (+Y of the servo frame). Whether
encoder counts increase in that sense is NOT verified (blocks release).

Every MID is the same part; it is rotated about its own X axis by a multiple
of 90 deg. The rotation sequence is chosen so the driving horns point the way
that reproduces the sign pattern in joint_map.json:
  ID 1 horn +Y, IDs 3/5/7/9 horn -Y (pitch); all yaw IDs horn -Z (down).
With these directions a positive firmware angle bends every pitch joint the
same way and every yaw joint the same way (shown by frame_report()). The
absolute direction (which side ID 1's horn faces on the real robot) must be
matched to the existing build before release.
"""

import json
import math
from functools import lru_cache

import numpy as np

import params as P
import features as F

N = P.n_joints
DESIRED_HORN = {1: (0, 1, 0)}
DESIRED_HORN.update({i: (0, -1, 0) for i in (3, 5, 7, 9)})
DESIRED_HORN.update({i: (0, 0, -1) for i in (2, 4, 6, 8, 10)})


def rx(deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return np.array([[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1.0]])


def ry(deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return np.array([[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1.0]])


def tx(x):
    m = np.eye(4)
    m[0, 3] = x
    return m


@lru_cache(maxsize=None)
def joint_map():
    with open(P.JOINT_MAP, encoding="utf-8") as f:
        jm = json.load(f)
    return {j["id"]: j for j in jm["joints"]}


def part_type(k):
    return "head" if k == 0 else ("tail" if k == N else "mid")


@lru_cache(maxsize=None)
def pitches():
    """Axis-to-axis offset from body k to the next joint axis, k = 0..9."""
    import head
    return [head.head_pitch()] + [F.geometry()["pitch"]] * (N - 1)


@lru_cache(maxsize=None)
def chain():
    """(R0, [s_0..s_9]) : head orientation and the +-90 deg step per body."""
    R = rx(-90)                     # head fork axis (local Z) -> world Y for J1 (pitch)
    s = []
    for i in range(1, N + 1):
        want = np.array(DESIRED_HORN[i], float)
        for sk in (1, -1):
            Rn = R @ rx(sk * 90)
            if np.allclose(Rn[:3, 1], want):
                s.append(sk)
                R = Rn
                break
        else:
            raise RuntimeError(f"no 90-degree step gives horn direction {want} for ID {i}")
    return rx(-90), tuple(s)


def offset(k):
    """Pose of B(k+1) relative to B(k) at q = 0."""
    return tx(-pitches()[k]) @ rx(chain()[1][k] * 90)


def poses(angles=None, physical=False):
    """World 4x4 for B0..B10. angles: dict id -> degrees (firmware sense unless physical)."""
    angles = angles or {}
    T = [chain()[0].copy()]
    for k in range(N):
        i = k + 1
        a = float(angles.get(i, 0.0))
        q = a if physical else joint_map()[i]["sign"] * a
        T.append(T[-1] @ offset(k) @ ry(-q))
    return T


def encoder_to_deg(enc):
    return (enc - P.encoder_neutral) * 360.0 / P.counts_per_rev


def frame_report():
    """Rows showing, rather than asserting, joint order, axes and sign behaviour."""
    T0 = poses()
    rows = []
    for i in range(1, N + 1):
        jm = joint_map()[i]
        axis_w = T0[i][:3, 1]
        Tp = poses({i: 10.0})
        # rotation of the downstream (tail-side) chain relative to the head side, in world
        Rrel = Tp[i][:3, :3] @ T0[i][:3, :3].T
        rv = np.array([Rrel[2, 1] - Rrel[1, 2], Rrel[0, 2] - Rrel[2, 0], Rrel[1, 0] - Rrel[0, 1]]) / 2
        rows.append(dict(
            id=i, axis=jm["axis"], sign=jm["sign"],
            axis_world=tuple(int(round(v)) for v in axis_w),
            horn_world=tuple(int(round(v)) for v in T0[i][:3, 1]),
            straight=bool(np.allclose(T0[i][:3, 0], [1, 0, 0]) and abs(T0[i][1, 3]) < 1e-9 and abs(T0[i][2, 3]) < 1e-9),
            x_world=round(float(T0[i][0, 3]), 2),
            plus10_rotvec_world=tuple(round(float(v), 4) for v in rv),
            mid_rotation_deg=round(math.degrees(math.atan2(T0[i][2, 1], T0[i][1, 1])), 1),
        ))
    return rows


# ------------------------------------------------------------------ geometry
@lru_cache(maxsize=None)
def part_solid(kind):
    import head, mid, tail
    return {"head": head.head, "mid": mid.mid, "tail": tail.tail}[kind]()


def export_neutral_step(path):
    """Assembly STEP at encoder 2048 on every joint (parts + nominal hardware)."""
    from build123d import Compound, export_step
    import servo_ref
    import board_ref as B
    T = poses()
    kids = []
    sv = servo_ref.servo_solids()
    for k in range(N + 1):
        loc = _loc(T[k])
        p = part_solid(part_type(k)).moved(loc)
        p.label = f"B{k}_{part_type(k).upper()}"
        kids.append(p)
        if k >= 1:
            c = Compound(sv["case"]).moved(loc)
            c.label = f"servo_ID{k}_case_nominal"
            kids.append(c)
        if k < N:
            hl = _loc(T[k] @ offset(k))
            h = Compound(sv["horn_drive"] + sv["disc_rear"]).moved(hl)
            h.label = f"servo_ID{k + 1}_horn_and_rear_disc"
            kids.append(h)
    b = B.board_shape().moved(_loc(T[N]))
    b.label = "controller_board_nominal"
    kids.append(b)
    asm = Compound(children=kids)
    asm.label = "SURGE_GEN3_segments_v1_neutral_" + P.PROTOTYPE_LABEL.split(":")[0]
    export_step(asm, str(path))


def _loc(M):
    from build123d import Location
    from OCP.gp import gp_Trsf
    t = gp_Trsf()
    t.SetValues(*[float(M[r, c]) for r in range(3) for c in range(4)])
    return Location(t)


if __name__ == "__main__":
    print("pitches (mm):", [round(p, 2) for p in pitches()])
    print("steps s_k:", chain()[1])
    for r in frame_report():
        print(r)

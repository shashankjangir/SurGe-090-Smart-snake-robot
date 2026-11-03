"""HEAD (x1, body B0): round nose + clevis on J1's horn, one solid.

Frame: the J1 servo axis is local Z at X = -head_pitch(); the clevis face is at
X = -crossbar_d. No electronics now; a round front bay with four pilot holes takes a future
sensor board, and a wire passage leads from the bay floor to the face ring
groove, so a sensor lead follows the bus lead across J1 and along the body."""

import params as P
import features as F


def head_pitch():
    return F.geometry()["L_c"] + P.crossbar_d


def head():
    g = F.geometry()
    xa = -head_pitch()
    xf = xa + g["L_c"]
    R, L = P.body_r, P.head_nose_len
    nose = F.cyl_x(R, xf, L)
    nose = F.try_fillet(nose, nose.edges().group_by(Axis.X)[-1], 14.0)
    s = F.trim_round(nose + F.clevis_arms(xa, xf), xa - P.fork_h, L + 1)
    s = F.clevis_cuts(s, xa, xf)
    s -= F.face_ring_groove(xf)
    # round sensor bay open to the front, four blind pilot holes in its floor, and a
    # wire passage from the floor to the face ring groove
    floor = xf + P.cable_groove_d + P.head_bay_floor_wall
    s -= F.cyl_x(P.head_bay_r, floor, L + 1)
    a = P.head_sensor_holes / 2
    for y in (-a, a):
        for z in (-a, a):
            s -= F.cyl_x(P.head_sensor_pilot_d / 2, floor - 3, floor + 0.1, y=y, z=z)
    for sy in (-1, 1):   # two passages (mirrored): one per side of J1
        s -= F.cyl_between(P.head_wire_d / 2, (floor + 0.5, sy * (P.head_bay_r - 4), 0.0),
                           (xf - 1.0, sy * (R - 3.5), 0.0))
    s -= F.rubber_band(floor + 2, L - 10)
    return s


from build123d import Axis  # noqa: E402

if __name__ == "__main__":
    s = head()
    print("valid", s.is_valid, "solids", len(s.solids()), "volume", round(s.volume, 1))

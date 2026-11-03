"""MID (x9, bodies B1..B9): servo cradle + clevis for the next servo, one solid.

Round and mirror-symmetric outside (see features.py); servo, plugs and the bus
lead are inside or recessed."""

import params as P
import features as F


def mid():
    g = F.geometry()
    xa = g["fork_x_axis"]
    xf = xa + g["L_c"]
    s = F.round_shell(xf, g["x_neck"]) + F.clevis_arms(xa, xf)
    s = F.trim_round(s, xa - P.fork_h, g["nose_r"] + 1)
    s = F.clevis_cuts(s, xa, xf)
    s = F.cradle_cuts(s, xf)
    s -= F.face_ring_groove(xf)
    s -= F.rubber_band(xf + P.cable_groove_d + P.rubber_band_inset, g["x_neck"] - P.rubber_band_inset)
    return s


if __name__ == "__main__":
    s = mid()
    print("valid", s.is_valid, "solids", len(s.solids()), "volume", round(s.volume, 1))

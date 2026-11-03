"""TAIL (x1, body B10): ID 10 servo cradle + covered controller bay, one solid.

Round and mirror-symmetric outside, as short as the board allows: the board
sits right behind the servo end wall and the round end cap closes just behind
the DC jack. Local -Y is up for the tail (J10 servo installed driving horn down,
see assembly.py). The round shell covers the board on all sides; it is open only
where the ports are used:
  * top service opening over the board (board drops in, servo plugs and
    BOOT/RST reached here; components sit well below the rim),
  * USB-C window in the side wall at the board's USB edge,
  * DC plug hole in the end cap, with tie slots for the external lead's
    strain relief.
No lid, the board is not trapped."""

from build123d import Axis

import params as P
import features as F
import board_ref as B


def tail():
    g = F.geometry()
    L = B.tail_layout()
    R, rin = P.body_r, g["r_in"]
    s = F.round_shell(L["x_end"], g["x_neck"])
    s = F.try_fillet(s, s.edges().group_by(Axis.X)[0], 10.0)        # round end cap
    s = F.cradle_cuts(s, g["out_x0"] - 1.0)                         # tunnel opens into the bay
    # board bay: hollow round interior behind the servo end wall
    bay = F.cyl_x(rin, L["x_end_in"], g["out_x0"] - 0.6)
    bay = F.try_fillet(bay, bay.edges().group_by(Axis.X)[0], 10.0 - P.wall)   # follows the end cap
    s -= bay
    # standoffs from the shell bottom (+Y) up to the PCB underside, pilot holes
    for hx, hy in B.HOLES:
        x, _, z = B.to_tail(hx, hy)
        post = F.cyl_y(3.5, L["y_bottom"], R - 0.5, x=x, z=z) & F.cyl_x(R - 0.5, L["x_end"], 0)
        s += post
        s -= F.cyl_y(1.1, L["y_bottom"] - 1, L["y_bottom"] + 6, x=x, z=z)
    # top service opening (local -Y = up)
    w = P.tail_top_open_half
    s -= F.box(L["x_b0"] - 1.0, L["x_front"] + 1.0, -R - 1, 0.0, -w, w)
    # USB-C window at the board's y = 0 edge (tail -Z side)
    ux0, ux1 = B.USB_X
    _, uy0, _ = B.to_tail(0, 0, 3.25 + 2.5)
    _, uy1, _ = B.to_tail(0, 0, -0.9 - 2.5)
    s -= F.box(L["x_b0"] + ux0 - 2, L["x_b0"] + ux1 + 2, uy0, uy1, -R - 1, -P.board_w / 2 - 1)
    # DC plug hole and tie slots in the end cap
    _, yc, zc = B.to_tail(0, sum(B.DC_Y) / 2, 3.65)
    s -= F.cyl_x(P.tail_dc_hole_r, L["x_end"] - 15, L["x_end_in"] + 0.5, y=yc, z=zc)
    for dz in (-1, 1):
        s -= F.box(L["x_end"] - 15, L["x_end_in"] + 0.5, yc - 2.0, yc + 2.0,
                   zc + dz * (P.tail_dc_hole_r + 3.0) - 1.0, zc + dz * (P.tail_dc_hole_r + 3.0) + 1.0)
    # rubber bands: one ahead of the bay, one round the bay (broken only by the openings)
    s -= F.rubber_band(L["x_front"] + 1.0, g["x_neck"] - P.rubber_band_inset)
    s -= F.rubber_band(L["x_b0"] + 6.0, L["x_b0"] + 30.0)
    return s


if __name__ == "__main__":
    s = tail()
    print("valid", s.is_valid, "solids", len(s.solids()), "volume", round(s.volume, 1))

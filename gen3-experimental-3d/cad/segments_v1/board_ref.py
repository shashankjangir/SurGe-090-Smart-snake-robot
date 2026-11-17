"""Official Servo Driver with ESP32 STEP, placed in the TAIL frame.

Board frame (STEP): PCB top copper at z=0, outline x 0..65, y 0..30.
DC jack CN1 at x~0 (rear), USB-C at the y=0 edge, BOOT/RST at x~62,
ESP32 module M1 on the underside (z to -3.9), antenna side assumed y=30 edge.
"""

from functools import lru_cache

from build123d import import_step, Pos, Rot

import params as P
import features as F

HOLES = [(3.5, 3.5), (61.5, 3.5), (3.5, 26.5), (61.5, 26.5)]   # [STEP] = 58 x 23 span
USB_X = (47.47, 57.05)        # [STEP] Type_C1 extent along the board
DC_Y = (10.34, 19.81)         # [STEP] CN1 across the board
DC_X0 = -0.89                 # [STEP] CN1 overhang beyond the board edge


@lru_cache(maxsize=None)
def tail_layout():
    """Where the board sits in the TAIL frame (local -Y is up for the tail).
    Board long axis along X, DC jack at the rear, as close behind the servo as
    the end wall allows; the round end cap closes just behind the DC jack."""
    g = F.geometry()
    y_top = P.tail_board_y                      # PCB top copper (board z = 0)
    y_bottom = y_top + P.pcb_t                  # PCB underside
    x_front = g["out_x0"] - P.tail_board_gap    # board x = 65 edge
    x_b0 = x_front - P.board_l                  # board x = 0 edge
    x_end_in = x_b0 + DC_X0 - 1.0               # inside face of the end cap
    x_end = x_end_in - P.tail_end_wall
    return dict(y_bottom=y_bottom, y_top=y_top, x_b0=x_b0, x_front=x_front,
                x_end_in=x_end_in, x_end=x_end)


def board_location():
    L = tail_layout()
    # board (x, y, z) -> tail (x_b0 + x, y_top - z, y - 15)
    return Pos(L["x_b0"], L["y_top"], -P.board_w / 2) * Rot(90, 0, 0)


def to_tail(bx, by, bz=0.0):
    L = tail_layout()
    return (L["x_b0"] + bx, L["y_top"] - bz, by - P.board_w / 2)


@lru_cache(maxsize=None)
def board_shape():
    return board_location() * import_step(str(P.BOARD_STEP))

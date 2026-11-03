"""Shared integral features: round body shell, servo cradle and horn fork.

Body frame B (all parts): origin on the axis of the servo the body carries
(for HEAD, on the J1 axis offset, see head.py), +X towards the head, servo
axis along local Y with the driving horn on +Y. The rear fork (clevis) grips
the next servo, whose axis is local Z at X = -pitch.

Outside shape (v2): every body is a round section of radius body_r about its
own X axis and is mirror-symmetric outside about its XY and XZ planes; the
servo, plugs and cables sit inside. The round shape is limited only where the
+-90 deg sweep needs it:
  * ahead of x_neck (= -(body_r + gap)) a body is a "tongue" no wider than the
    clevis crossbar clearance (|Z| <= L_c - gap) in its joint's rotation plane;
  * behind the clevis face (L_c from the next axis) the body is fully round.
Two round bodies hinged for +-90 deg can only be fully round that far apart:
the tongue is the necessary neck at each joint.
"""

import math
from functools import lru_cache

from build123d import (chamfer, Box, Cylinder, Pos, Rot, Axis, fillet, Solid, Plane, Vector)

import params as P
import servo_ref


def box(x0, x1, y0, y1, z0, z1):
    return Pos((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2) * Box(x1 - x0, y1 - y0, z1 - z0)


def cyl_x(r, x0, x1, y=0.0, z=0.0):
    """Cylinder along X from x0 to x1."""
    return Pos((x0 + x1) / 2, y, z) * Rot(0, 90, 0) * Cylinder(r, x1 - x0)


def cyl_y(r, y0, y1, x=0.0, z=0.0):
    """Cylinder along Y from y0 to y1."""
    return Pos(x, (y0 + y1) / 2, z) * Rot(90, 0, 0) * Cylinder(r, y1 - y0)


def cyl_z(r, z0, z1, x=0.0, y=0.0):
    return Pos(x, y, (z0 + z1) / 2) * Cylinder(r, z1 - z0)


def cyl_between(r, p0, p1):
    d = Vector(*p1) - Vector(*p0)
    return Solid.make_cylinder(r, d.length, Plane(origin=p0, z_dir=d))


def try_fillet(shape, edges, r):
    try:
        out = fillet(edges, r)
        return out if out.is_valid else shape
    except Exception:
        return shape


@lru_cache(maxsize=None)
def geometry():
    """Derived dimensions, computed once."""
    lc, why = servo_ref.crossbar_radius()
    m = P.gap_moving + P.clearance_margin
    g = {"L_c": lc, "L_c_why": why}
    f = P.fit_servo
    g["pocket_x0"] = P.case_x[0] - f                      # rear stop face
    g["pocket_y"] = (P.case_y_face_b - f, P.case_y_top_block + f)
    g["pocket_z"] = P.case_z_half + f
    g["out_x0"] = g["pocket_x0"] - P.wall                 # end wall outer face
    g["out_y"] = (-(g["pocket_y"][1] + P.wall), g["pocket_y"][1] + P.wall)  # symmetric front box
    g["out_z"] = g["pocket_z"] + P.wall                   # tongue half-width
    g["nose_r"] = lc - m                                  # own material ahead of the axis stays inside
    g["pitch"] = lc + P.crossbar_d - g["out_x0"]          # axis-to-axis spacing
    g["fork_x_axis"] = -g["pitch"]
    g["x_t"] = -(P.fork_h / 2 + m)                        # behind this the previous fork never reaches
    g["x_neck"] = -(P.body_r + m)                         # full round section starts here
    g["r_in"] = P.body_r - P.wall
    # plug cavity under the connector bay (rear-horn side, -Y), inside the shell
    g["hood_y_in"] = P.case_y_face_b - P.plug_servo_protrusion - 1.0
    g["hood_z_in"] = P.connector_bay_z_half + 1.2
    g["hood_x"] = (P.connector_bay_x[0] - 1.0, g["x_t"])
    plug_y = P.case_y_face_b - P.plug_servo_protrusion
    if plug_y ** 2 + (P.connector_bay_z_half - 1) ** 2 > (g["r_in"] - 0.3) ** 2:
        raise RuntimeError("plug envelope does not fit inside body_r - wall")
    return g


def round_shell(x_rear, x_front_round):
    """Outer solid of a cradle-carrying body: front box + tongue + round section."""
    g = geometry()
    R, oz, oy = P.body_r, g["out_z"], g["out_y"][1]
    front = box(g["x_t"] - 0.5, g["nose_r"], -oy, oy, -oz, oz)
    front = try_fillet(front, front.edges().filter_by(Axis.X), 3.0)
    keep = box(g["x_t"] - 2, 0, -oy - 1, oy + 1, -oz - 1, oz + 1) + cyl_y(g["nose_r"], -oy - 1, oy + 1)
    front = front & keep
    tongue = cyl_x(R, g["x_neck"] - 0.5, g["x_t"]) & box(g["x_neck"] - 1, g["x_t"] + 1, -R - 1, R + 1, -oz, oz)
    # no fillet on the tongue's long edges: the flats meet the round at ~148 deg, and
    # a fillet there leaves a step face the STL mesher cannot triangulate
    body = cyl_x(R, x_rear, x_front_round)
    return body + tongue + front


def rubber_band(x0, x1):
    """Shallow recessed ring on a round section for rubber to be pasted on later."""
    R = P.body_r
    return cyl_x(R + 1, x0, x1) - cyl_x(R - P.rubber_band_d, x0 - 1, x1 + 1)


def cradle_cuts(shell, x_tunnel_end):
    """Servo pocket, horn reliefs, plug cavity (open at the tongue mouth), tunnel
    from the cavity to x_tunnel_end, and face-A retention screws."""
    g = geometry()
    py0, py1 = g["pocket_y"]
    s = shell
    s -= box(g["pocket_x0"], g["nose_r"] + 5, py0, py1, -g["pocket_z"], g["pocket_z"])
    r = P.horn_relief_r
    s -= cyl_y(r, P.case_y_face_a - 0.6, P.body_r + 1)
    s -= cyl_y(r, -P.body_r - 1, P.case_y_face_b + 0.6)
    hz = g["hood_z_in"]
    cav = box(g["hood_x"][0], g["nose_r"] + 5, -P.body_r, py0 + 0.1, -hz, hz)
    cav = cav & cyl_x(g["r_in"], g["hood_x"][0] - 1, g["nose_r"] + 6)
    s -= cav
    # mirrored channel on +Y (drive side): lightens the body, keeps the inside
    # symmetric, and gives a separate route for a future sensor lead
    cav2 = box(P.face_a_hole_x[1] + 4.5, g["nose_r"] + 5, py1 + P.wall, P.body_r, -hz, hz)
    s -= cav2 & cyl_x(g["r_in"], P.face_a_hole_x[1], g["nose_r"] + 6)
    # cable notch through the tongue-mouth lip where the lead drops off the previous
    # body's hub disc into the cavity; mirrored on +Y (sensor-lead route)
    w = P.cable_groove_w
    for sy in (-1, 1):
        s -= box(g["x_t"] - 4.0, g["x_t"] + 1.0, *sorted((sy * (g["r_in"] - 1.0), sy * (P.body_r + 1))), -w / 2, w / 2)
    # mirror the open front lip of the -Y cavity on +Y (ahead of x_t only)
    s -= box(g["x_t"], g["nose_r"] + 5, py1 - 0.1, P.body_r, -hz, hz)
    # tunnels from the clevis-face ring groove: -Y to the plug cavity (bus lead),
    # mirrored +Y to the drive-side channel (future sensor lead)
    tw, th = P.cable_tunnel
    s -= box(x_tunnel_end - 1, g["hood_x"][0] + 1, -25.0, -25.0 + th, -tw / 2, tw / 2)
    s -= box(x_tunnel_end - 1, P.face_a_hole_x[1] + 5.0, 25.0 - th, 25.0, -tw / 2, tw / 2)
    # face-A retention: bosses seat on face A (Y datum); screws from the +Y outside,
    # matching blind recesses on -Y keep the outside symmetric
    for z in (-P.face_a_hole_z, P.face_a_hole_z):
        x = P.face_a_hole_x[1]
        s += cyl_y(3.0, P.case_y_face_a, py1 + 0.5, x=x, z=z)
        s -= cyl_y(P.cradle_screw_clear_d / 2, P.case_y_face_a - 1, P.body_r + 1, x=x, z=z)
        s -= cyl_y(P.cradle_screw_head_d / 2, py1 + P.wall, P.body_r + 1, x=x, z=z)
        s -= cyl_y(P.cradle_screw_head_d / 2, -P.body_r - 1, -(P.body_r - 1.2), x=x, z=z)
    return s


def clevis_arms(x_axis, x_face):
    """Raw arms + horn bosses of the rear fork (axis local Z at x_axis), running
    forward into the round section at x_face. Trim with trim_round() after fusing."""
    R, h2 = P.body_r, P.fork_h / 2
    zi = P.fork_inner_z
    arms = None
    for sgn in (1, -1):
        z0, z1 = (zi, R + 1) if sgn > 0 else (-R - 1, -zi)
        arm = box(x_axis, x_face + 1.0, -h2, h2, z0, z1) + cyl_z(h2, z0, z1, x=x_axis)
        bz0, bz1 = (P.horn_face_y, zi + 0.01) if sgn > 0 else (-zi - 0.01, -P.horn_face_y)
        arm += cyl_z(P.boss_r, bz0, bz1, x=x_axis)
        arms = arm if arms is None else arms + arm
    return arms


def trim_round(s, x0, x1):
    """Clip everything to the round envelope of radius body_r."""
    return s & cyl_x(P.body_r, x0, x1)


def clevis_cuts(s, x_axis, x_face):
    """Flat hub discs (horn screws flush; the lead rides over them near the axis),
    bores, horn screw holes, cable grooves along both arms, clocking notches."""
    R, h2 = P.body_r, P.fork_h / 2
    zi, zo = P.fork_inner_z, P.fork_outer_z
    root = [e for e in s.edges().filter_by(Axis.Y)
            if abs(e.center().X - x_face) < 1.2 and abs(abs(e.center().Z) - zi) < 0.05]
    if root:
        s = try_fillet(s, root, P.fillet_root * 0.75)
    for sgn in (1, -1):
        s -= cyl_z(h2 + 0.5, *sorted((sgn * zo, sgn * (R + 2))), x=x_axis)
    big = P.rear_boss_r + P.gap_moving + P.clearance_margin
    for sgn in (1, -1):
        s -= cyl_z(big, *sorted((sgn * (P.horn_face_y - 0.1), sgn * zi)), x=x_axis)
    s -= cyl_z(P.hub_bore_d / 2, -R - 2, R + 2, x=x_axis)
    for hx, hy in horn_screw_points(x_axis):
        s -= cyl_z(P.horn_screw_clear_d / 2, -R - 2, R + 2, x=hx, y=hy)
        s -= cyl_z(P.horn_screw_head_d / 2, zo - P.horn_screw_head_h, R + 2, x=hx, y=hy)
        s -= cyl_z(P.horn_screw_head_d / 2, -R - 2, -zo + P.horn_screw_head_h, x=hx, y=hy)
    w, d = P.cable_groove_w, P.cable_groove_d
    for sgn in (1, -1):
        s -= box(x_axis + h2 - 0.5, x_face + 2.0, -w / 2, w / 2, *sorted((sgn * (R - d), sgn * (R + 2))))
        s -= box(x_axis + h2 - 3.5, x_axis + h2 + 0.5, -0.6, 0.6, *sorted((sgn * zo, sgn * (zo - 0.6))))
    return s


def face_ring_groove(x_face):
    """Ring groove in the clevis face: carries the lead from the tunnel (-Y) round
    to either arm's groove. A full ring keeps the outside symmetric."""
    rc, w, d = P.body_r - 3.5, P.cable_groove_w, P.cable_groove_d
    return cyl_x(rc + w / 2, x_face - 1, x_face + d) - cyl_x(rc - w / 2, x_face - 2, x_face + d + 1)


def horn_screw_points(x_axis):
    rr = P.horn_hole_span / 2
    return [(x_axis + rr * math.cos(math.radians(45 + 90 * k)), rr * math.sin(math.radians(45 + 90 * k)))
            for k in range(4)]

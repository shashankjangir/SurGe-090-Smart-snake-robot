"""3D Motions steering: controller direction -> per-joint steering angles. No I/O.

The player's stick is a desired direction of travel. Left/right sets a desired world heading;
up/down sets a desired head elevation. Each update compares those with the snake's current
pose (measured in simulation, dead-reckoned otherwise) and recomputes every servo's steering
angle, which the gait generator adds to its propulsion wave.

Heading uses follow-the-leader steering: the commanded yaw curvature is written onto the
path at the leading end and each yaw joint bends by the curvature at its own arc-length
position, so a new turn travels down the body at the gait's wave speed instead of the whole
body snapping to a new bias. Reversing replays the path from the tail.

Elevation uses a neck: the front pitch joints lift the head section while the rest of the
body stays on the floor to push. A body that kept following a rising path would leave the
ground, so the climb is bounded by the neck reach and the servo torque, and down is limited
by the floor. With the head raised fewer links push, so turns are slower (in PyBullet about
4°/s against about 20°/s with the head down).

Angles are physical joint angles (the gait's `angle` before the calibrated sign is applied).
"""
import json
import math
from pathlib import Path

CAD = Path(__file__).resolve().parents[1] / 'web_dashboard/static/models/gen3-cad.json'
COUNTS_PER_RADIAN = 4096 / (2 * math.pi)

YAW_STEER_MAX = math.radians(25)   # largest added yaw bend per joint (pivot-turn preset uses 15°)
TURN_RATE = math.radians(45)       # full stick moves the desired heading this fast
TURN_LEAD = math.radians(60)       # desired heading never runs further ahead than this
RELEASE_LEAD = math.radians(10)    # on stick release, keep at most this much turn to finish
FULL_ERROR = math.radians(40)      # heading error that asks for full curvature
ELEVATION_UP = math.radians(30)
ELEVATION_DOWN = math.radians(15)
ELEVATION_RATE = math.radians(25)  # neck slew, rad/s
TRIM_LIMIT = math.radians(10)      # closed-loop neck correction for sag under gravity
# Neck shares, head first: ID 1 and ID 3 lift the front three links. A longer neck (to ID 5)
# was rolled over by the body's sideways swing in PyBullet. Sim masses (0.25 kg per link) need
# about 0.6 N·m at ID 3, well inside the 2.7 N·m stall; refit when segments are weighed.
NECK_WEIGHTS = (.4, .6)
GROUND_CLEARANCE = .01             # head counts as on the floor below this height above rest
CELL = .005                        # path curvature sample spacing, metres


def joint_offsets(joints, path=CAD):
    """Distance in metres from the head reference to each joint, from the CAD assembly."""
    bodies = json.loads(Path(path).read_text(encoding='utf-8'))['bodies']
    if len(bodies) != len(joints) + 1:
        raise ValueError('CAD assembly does not match the joint map')
    return {j['id']: -bodies[i + 1]['origin'][0] for i, j in enumerate(joints)}


def body_pose(poses):
    """Heading, head elevation and head height from the link poses (joints + 1) ordered head to tail.

    poses: [{'position': [x, y, z], 'quaternion': [x, y, z, w]}, ...] in the world frame.
    Heading is the horizontal direction from the rear-half centroid to the front-half
    centroid, which follows the body's travel rather than the head's side-to-side swing.
    Elevation is the pitch of the head link's forward (+X) axis."""
    if len(poses) < 3:
        raise ValueError('Body pose needs a link pose per body (joints + 1)')
    points = [p['position'] for p in poses]
    half = len(points) // 2
    front = [sum(p[i] for p in points[:half]) / half for i in range(3)]
    rear = [sum(p[i] for p in points[-half:]) / half for i in range(3)]
    x, y, z, w = poses[0]['quaternion']
    forward = (1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w))
    return dict(heading=math.atan2(front[1] - rear[1], front[0] - rear[0]),
                elevation=math.atan2(forward[2], math.hypot(forward[0], forward[1])),
                head_height=points[0][2] - min(p[2] for p in points[-half:]))


def wrap(angle):
    return math.atan2(math.sin(angle), math.cos(angle))


def approach(current, desired, step):
    return current + max(-step, min(step, desired - current))


class Steering3D:
    def __init__(self, joints, offsets):
        self.joints = list(joints)
        self.offsets = {sid: float(d) for sid, d in offsets.items()}
        if set(self.offsets) != {j['id'] for j in self.joints} or any(d <= 0 for d in self.offsets.values()):
            raise ValueError('Steering needs a positive head distance for every joint')
        yaw = [j for j in self.joints if j['axis'] == 'yaw']
        pitch = [j for j in self.joints if j['axis'] == 'pitch']
        distances = [self.offsets[j['id']] for j in yaw]
        self.spacing = (distances[-1] - distances[0]) / (len(distances) - 1)
        self.length = max(self.offsets.values()) + self.spacing / 2
        self.yaw_ids = [j['id'] for j in yaw]
        self.neck = {j['id']: w for j, w in zip(pitch, NECK_WEIGHTS)}
        # Yaw joints inside the lifted section (ahead of the last neck joint) hold the head steady
        # instead of swinging it: a raised head swinging ±40° rolls the body over.
        neck_base = max(self.offsets[sid] for sid in self.neck)
        self.neck_yaw = [sid for sid in self.yaw_ids if self.offsets[sid] < neck_base]
        self.range = {j['id']: min(j['max'] - j['zero'], j['zero'] - j['min']) / COUNTS_PER_RADIAN for j in self.joints}
        self.curvature = {}            # path cell -> yaw curvature (rad/m, + = turning left)
        self.s = 0.                    # head arc-length position on the path
        self.lead = None               # last written leading cell
        self.heading = None            # current body heading estimate, rad (world, + = left)
        self.target_heading = None
        self.elevation = 0.            # current head elevation estimate, rad
        self.target_elevation = 0.
        self.neck_angle = 0.           # commanded neck elevation, rad
        self.trim = 0.
        self.command = 0.              # curvature currently written at the leading end
        self.measured = False
        self.on_floor = None
        self.angles = {j['id']: 0. for j in self.joints}
        self.limited = []

    def _cell(self, s):
        return math.floor(s / CELL)

    def _kappa(self, s):
        return self.curvature.get(self._cell(s), 0.)

    def update(self, stick_x, stick_y, frequency, lag, amplitudes, dt, pose=None):
        """Advance one control period. amplitudes = {'yaw': rad, 'pitch': rad} of the gait wave."""
        dt = max(0., min(.1, dt))
        self.measured = pose is not None
        if pose is not None:
            # Low-pass over about one gait period so the undulation itself is not steered away.
            tau = min(3., max(.5, 1 / abs(frequency))) if frequency else 3.
            a = dt / (tau + dt) if self.heading is not None else 1.
            h = pose['heading'] if self.heading is None else self.heading + a * wrap(pose['heading'] - self.heading)
            self.heading = wrap(h)
            self.elevation = pose['elevation']
            self.on_floor = pose.get('head_height') is not None and pose['head_height'] < GROUND_CLEARANCE
        elif self.heading is None:
            self.heading = 0.
        if self.target_heading is None:
            self.target_heading = self.heading

        # Desired direction from the stick. Right stick deflection (+x) turns right (heading falls).
        if abs(stick_x) > .05:
            # Reversing the stick restarts from the current heading, so the old turn is not finished first.
            if wrap(self.target_heading - self.heading) * -stick_x < 0:
                self.target_heading = self.heading
            self.target_heading = wrap(self.target_heading - stick_x * TURN_RATE * dt)
            lead = TURN_LEAD
        else:
            lead = RELEASE_LEAD
        error = wrap(self.target_heading - self.heading)
        if abs(error) > lead:
            self.target_heading = wrap(self.heading + math.copysign(lead, error))
            error = math.copysign(lead, error)
        elevation = stick_y * (ELEVATION_UP if stick_y > 0 else ELEVATION_DOWN)
        if self.on_floor:  # the floor stops the head going lower than it already is
            elevation = max(elevation, min(self.neck_angle, 0.))
        self.target_elevation = elevation

        # Path advance at the gait's wave speed: a serpenoid wave carries the shape (and the bend)
        # down the body one wavelength per cycle.
        wavelength = 2 * math.pi * self.spacing / abs(lag) if abs(lag) > .1 else 2 * self.length
        ds = frequency * min(wavelength, 2 * self.length) * dt
        direction = 1. if ds >= 0 else -1.

        # Yaw budget: what is left of each joint's range after the propulsion wave.
        budget = min(YAW_STEER_MAX, min(self.range[sid] for sid in self.yaw_ids) - amplitudes['yaw'] - math.radians(2))
        kappa_max = max(0., budget) / self.spacing
        desired = direction * max(-kappa_max, min(kappa_max, kappa_max * error / FULL_ERROR))
        self.command = approach(self.command, desired, 4 * kappa_max * dt)

        previous = self.s
        self.s += ds
        lead_now = self.s if direction > 0 else self.s - self.length
        lead_before = previous if direction > 0 else previous - self.length
        first, last = sorted((self._cell(lead_before), self._cell(lead_now)))
        for cell in range(first, last + 1):
            self.curvature[cell] = self.command
        low, high = self._cell(self.s - self.length) - 4, self._cell(self.s) + 4
        self.curvature = {k: v for k, v in self.curvature.items() if low <= k <= high}

        self.limited = []
        bends = []
        for sid in self.yaw_ids:
            kappa = self._kappa(self.s - self.offsets[sid])
            bends.append(kappa)
            # A child link rotated by +angle points its head-ward axis further left, so heading
            # falls from head to tail; positive path curvature therefore needs a negative angle.
            angle = -kappa * self.spacing
            if abs(angle) >= budget - 1e-9 and budget > 0:
                self.limited.append(sid)
            self.angles[sid] = max(-budget, min(budget, angle))
        if pose is None:
            self.heading = wrap(self.heading + sum(bends) / len(bends) * ds)

        # Neck: slew toward the desired elevation; in simulation trim for sag under gravity.
        # Trim only once the neck has arrived; it fades out when no elevation is asked for.
        if not self.target_elevation:
            self.trim = approach(self.trim, 0., TRIM_LIMIT * dt)
        elif pose is not None and not self.on_floor and abs(self.neck_angle - self.target_elevation) < math.radians(1):
            self.trim = max(-TRIM_LIMIT, min(TRIM_LIMIT, self.trim + .5 * (self.target_elevation - self.elevation) * dt))
        self.neck_angle = approach(self.neck_angle, self.target_elevation, ELEVATION_RATE * dt)
        if pose is None:
            self.elevation = self.neck_angle
        neck = self.neck_angle + self.trim
        for sid, weight in self.neck.items():
            room = self.range[sid] - amplitudes['pitch'] - math.radians(2)
            angle = max(-room, min(room, weight * neck))
            if angle != weight * neck:
                self.limited.append(sid)
            self.angles[sid] = angle
        return self.angles

    def angle(self, sid):
        return self.angles.get(sid, 0.)

    def wave_scale(self, sid):
        """Fraction of the propulsion wave this joint keeps; the raised neck fades it out."""
        if sid not in self.neck_yaw:
            return 1.
        return 1. - min(1., max(0., self.neck_angle) / ELEVATION_UP)

    def snapshot(self):
        deg = math.degrees
        return dict(mode='3d', measured=self.measured,
                    heading=deg(self.heading or 0.), target_heading=deg(self.target_heading or 0.),
                    heading_error=deg(wrap((self.target_heading or 0.) - (self.heading or 0.))),
                    elevation=deg(self.elevation), target_elevation=deg(self.target_elevation),
                    neck=deg(self.neck_angle), on_floor=bool(self.on_floor),
                    curvature=self.command, path_s=self.s, limited=sorted(set(self.limited)),
                    angles={str(sid): round(deg(a), 2) for sid, a in self.angles.items()})

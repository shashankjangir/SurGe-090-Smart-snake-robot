"""Shared, bounded manual gait control. No I/O; callers own motion and Stop."""
import math
import time

STEP = math.radians(5)  # Max turn bias, and per-second slew for turn and joint amplitudes.
HEAD_RANGE = math.radians(10)


def bounded(value, name, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'{name} must be finite and within {low}..{high}')
    return float(value)


def approach(current, desired, step):
    return current + max(-step, min(step, desired - current))


class Localization:
    """Head pose in a fixed metre/radian frame, with capture and receive freshness."""
    def __init__(self):
        self.sample = None
        self.received = None

    def update(self, data, now=None, wall=None):
        now = time.monotonic() if now is None else now
        wall = time.time() if wall is None else wall
        if not isinstance(data, dict) or data.get('frame') != 'world' or data.get('reference') != 'head':
            raise ValueError('Localization requires world frame and head reference')
        source = data.get('source')
        if not isinstance(source, str) or not 1 <= len(source) <= 80:
            raise ValueError('Localization requires a named measurement source')
        sequence = data.get('sequence')
        if type(sequence) is not int or sequence < 0:
            raise ValueError('Localization requires a nonnegative sequence')
        captured = bounded(data.get('captured_at'), 'captured_at', wall - .5, wall + .1)
        sample = dict(x=bounded(data.get('x'), 'x', -100, 100),
                      y=bounded(data.get('y'), 'y', -100, 100),
                      yaw=bounded(data.get('yaw'), 'yaw', -math.pi, math.pi),
                      source=source, sequence=sequence, captured_at=captured)
        if self.sample:
            if source != self.sample['source']:
                raise ValueError('Stop and reset localization before changing source')
            if sequence <= self.sample['sequence'] or captured <= self.sample['captured_at']:
                raise ValueError('Out-of-order localization sample')
            if math.hypot(sample['x'] - self.sample['x'], sample['y'] - self.sample['y']) > .25:
                raise ValueError('Localization jump exceeds 0.25 m; stop and reset')
        self.sample, self.received = sample, now

    def pose(self, now=None, wall=None):
        now = time.monotonic() if now is None else now
        wall = time.time() if wall is None else wall
        if self.sample is None or now - self.received > .5 or wall - self.sample['captured_at'] > .5:
            raise RuntimeError('Fresh measured head localization required')
        return dict(self.sample)


class ManualController:
    timeout = .5

    def __init__(self, options=None, now=None):
        options = {} if options is None else options
        if not isinstance(options, dict) or set(options) - {'assist', 'path', 'localization_verified', 'steering_sign', 'inspection'}:
            raise ValueError('Unknown controller option')
        self.assist = options.get('assist', 'manual')
        if self.assist not in ('manual', 'heading', 'route'):
            raise ValueError('Choose manual, heading or route assistance')
        if 'inspection' in options and type(options['inspection']) is not bool:
            raise ValueError('inspection must be boolean')
        self.inspection = options.get('inspection', False)
        if self.inspection and self.assist != 'manual':
            raise ValueError('Inspection cannot be combined with navigation')
        if self.assist == 'route':
            from .spatial_route import SpatialRoute
            self.route = SpatialRoute(options.get('path'))
        else:
            if 'path' in options:
                raise ValueError('A path requires route assistance')
            self.route = None
        self.verified = options.get('localization_verified') is True
        self.steering_sign = bounded(options.get('steering_sign', 1), 'steering_sign', -1, 1)
        if self.steering_sign not in (-1, 1):
            raise ValueError('steering_sign must be -1 or 1')
        self.input = dict(stick_x=0., stick_y=0., head_x=0., head_y=0., throttle=0., deadman=False)
        self.sequence = -1
        self.received = time.monotonic() if now is None else now
        self.reversed = False
        self.preset = 0
        self.yaw_gain = self.pitch_gain = 1.
        self.rate = self.turn = self.head_x = self.head_y = 0.
        self.yaw = self.pitch = self.lag = None
        self.heading = None
        self.feedback_scale = 1.
        self.feedback_reason = 'Not sampled'
        self.last_targets = None
        self.last_t = None

    def update(self, data, now=None):
        if not isinstance(data, dict):
            raise ValueError('Controller input must be an object')
        sequence = data.get('sequence')
        if type(sequence) is not int or sequence <= self.sequence:
            raise ValueError('Controller sequence must increase')
        if type(data.get('deadman')) is not bool:
            raise ValueError('Controller input requires boolean deadman')
        wall = time.time()
        bounded(data.get('captured_at'), 'captured_at', wall - .5, wall + .1)
        candidate = {k: bounded(data.get(k, 0), k, 0 if k == 'throttle' else -1, 1)
                     for k in ('stick_x', 'stick_y', 'head_x', 'head_y', 'throttle')}
        events = ('reverse', 'preset', 'yaw_up', 'yaw_down', 'pitch_up', 'pitch_down')
        for key in events:
            if key in data and type(data[key]) is not bool:
                raise ValueError(f'{key} must be boolean')
        if data.get('reverse') and self.assist != 'manual':
            raise ValueError('Stop navigation before reversing')
        self.input = dict(candidate, deadman=data['deadman'])
        self.sequence = sequence
        self.received = time.monotonic() if now is None else now
        if data.get('reverse'):
            self.reversed = not self.reversed
        if data.get('preset'):
            self.preset = (self.preset + 1) % 3
        self.yaw_gain = max(0, min(1, self.yaw_gain + .1 * (data.get('yaw_up', False) - data.get('yaw_down', False))))
        self.pitch_gain = max(0, min(1, self.pitch_gain + .1 * (data.get('pitch_up', False) - data.get('pitch_down', False))))

    def check(self, now=None):
        now = time.monotonic() if now is None else now
        if not self.input['deadman']:
            raise InterruptedError('Controller hold released')
        if now - self.received > self.timeout:
            raise InterruptedError('Controller input stale')

    def feedback(self, rows, limit, dt):
        valid = list(rows.values())
        if len(valid) != 10 or any(not row.get('valid') or not all(
                isinstance(row.get(k), (int, float)) and math.isfinite(row[k]) for k in ('position', 'target')) for row in valid):
            desired, reason = .25, 'Incomplete feedback'
        else:
            error = max(abs(row['position'] - row['target']) for row in valid)
            desired = max(.25, min(1., 1. - max(0., error / limit - .5)))
            reason = 'Tracking lag' if desired < 1 else 'Tracking normally'
        self.feedback_scale = approach(self.feedback_scale, desired, max(0., dt) * (2 if desired < self.feedback_scale else .1))
        self.feedback_reason = reason

    def parameters(self, base, dt, pose=None, t=0):
        dt = max(0., min(.1, dt))
        desired_turn = -self.steering_sign * self.input['stick_x'] * STEP
        if self.assist != 'manual':
            if pose is None:
                raise RuntimeError('Measured head pose required for navigation')
            if any(not isinstance(pose.get(k), (int, float)) or not math.isfinite(pose[k]) for k in ('x', 'y', 'yaw')):
                raise RuntimeError('Invalid measured head pose')
            if self.assist == 'heading':
                if self.heading is None or abs(self.input['stick_x']) > .05:
                    self.heading = pose['yaw']
                else:
                    error = math.atan2(math.sin(self.heading - pose['yaw']), math.cos(self.heading - pose['yaw']))
                    desired_turn = self.steering_sign * max(-STEP, min(STEP, .5 * error))
            else:
                self.route.update(dict(position=[pose['x'], pose['y'], 0.], yaw=pose['yaw']), t)
                if self.route.state in ('completed', 'stalled'):
                    raise InterruptedError(f'Controller route {self.route.state}')
                desired_turn = -self.steering_sign * max(-STEP, min(STEP, self.route.bias))
        target_rate = (-1 if self.reversed else 1) * self.input['throttle'] * self.feedback_scale
        if self.rate * target_rate < 0:
            target_rate = 0.
        self.rate = approach(self.rate, 0 if self.inspection else target_rate, dt)
        self.turn = approach(self.turn, 0 if self.inspection else desired_turn, STEP * dt)
        yaw_factor = (0 if self.preset == 1 else 1) if base['pitch'] else (1, .5, .75)[self.preset]
        desired_yaw = base['yaw'] * self.yaw_gain * (0 if self.inspection else yaw_factor)
        desired_pitch = base['pitch'] * self.pitch_gain * (0 if self.preset == 2 or self.inspection else 1)
        self.yaw = approach(base['yaw'] if self.yaw is None else self.yaw, desired_yaw, STEP * dt)
        self.pitch = approach(base['pitch'] if self.pitch is None else self.pitch, desired_pitch, STEP * dt)
        self.head_x = approach(self.head_x, self.input['head_x'] * HEAD_RANGE if self.inspection else 0, STEP * dt)
        self.head_y = approach(self.head_y, self.input['head_y'] * HEAD_RANGE if self.inspection else 0, STEP * dt)
        self.lag = approach(base['lag'] if self.lag is None else self.lag,
                            base['lag'] * (.75 if self.preset == 2 else 1), .5 * dt)
        return dict(base, yaw=self.yaw, pitch=self.pitch, bias=base.get('bias', 0) + self.turn,
                    frequency=base['frequency'] * self.rate, lag=self.lag)

    def limit_targets(self, targets, joints, speed, t):
        dt = 0 if self.last_t is None else max(0., min(.1, t - self.last_t))
        self.last_t = t
        if self.last_targets is None:
            self.last_targets = {j['id']: float(j['zero']) for j in joints}
        # Keep fractional targets so a slow servo limit does not stall on rounding.
        for j in joints:
            sid = j['id']
            desired = max(j['min'], min(j['max'], targets[sid]))
            self.last_targets[sid] = approach(self.last_targets[sid], desired, speed * dt)
        return {sid: round(value) for sid, value in self.last_targets.items()}

    def snapshot(self):
        return dict(sequence=self.sequence, deadman=self.input['deadman'], assist=self.assist,
                    inspection=self.inspection, reversed=self.reversed, preset=self.preset,
                    yaw_gain=self.yaw_gain, pitch_gain=self.pitch_gain, rate=self.rate,
                    feedback_scale=self.feedback_scale, feedback_reason=self.feedback_reason,
                    route=self.route.snapshot() if self.route else None)

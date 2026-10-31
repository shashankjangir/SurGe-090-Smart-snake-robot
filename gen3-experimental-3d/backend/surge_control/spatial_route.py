"""Simulation-only route tracking. Never translates or rotates the simulated body."""
import math

from gait import COUNTS_PER_RADIAN, number
from surge_control.path_engine import PathEngine


def validate_path(path):
    if not isinstance(path, list) or not 2 <= len(path) <= 500:
        raise ValueError('Simulation route needs 2–500 [x, y] points')
    result = []
    for point in path:
        if not isinstance(point, (list, tuple)) or len(point) != 2:
            raise ValueError('Route points must be [x, y] in metres')
        result.append([number(v, 'Route coordinate', -50, 50) for v in point])
    length = sum(math.dist(a, b) for a, b in zip(result, result[1:]))
    if not .1 <= length <= 100:
        raise ValueError('Simulation route length must be 0.1–100 m')
    return result


class SpatialRoute:
    def __init__(self, path):
        self.path = validate_path(path)
        self.engine = PathEngine()
        self.engine.set_path(self.path)
        self.engine.lookahead_distance = .3
        self.index = 0
        self.state = 'ready'
        self.trace = []
        self.last_position = None
        self.last_checkpoint_position = None
        self.last_t = None
        self.last_progress_t = 0.
        self.bias = 0.
        self.error = None
        self.rejected_samples = 0

    def update(self, head, t):
        position = head['position']
        x, y = position[:2]
        if not all(math.isfinite(v) for v in (*position, head['yaw'], t)):
            raise ValueError('Invalid simulation head pose')
        if self.state in ('completed', 'stalled', 'timed_out', 'stopped', 'error'):
            return
        if self.last_position and math.dist(position, self.last_position) > .25:
            self.rejected_samples += 1
            self.bias = 0.
            if t - self.last_progress_t >= 30:
                self.state = 'stalled'
            return
        self.last_position = list(position)
        if not self.trace or math.dist(position, self.trace[-1]) >= .01:
            self.trace.append(list(position))
            self.trace = self.trace[-10000:]
        dt = .05 if self.last_t is None else max(.001, min(.1, t - self.last_t))
        self.last_t = t
        points = self.engine.checkpoints
        target = points[self.index]
        step = min(.05, (self.engine.distances[self.index] - self.engine.distances[self.index - 1]) / 2) if self.index else 0
        moved = self.last_checkpoint_position is None or math.dist((x, y), self.last_checkpoint_position) >= step
        if math.dist((x, y), target) <= .1 and moved:
            self.index += 1
            self.last_checkpoint_position = (x, y)
            self.last_progress_t = t
            if self.index == len(points):
                self.state = 'completed'
                self.bias = 0.
                return
        self.state = 'acquiring' if self.index == 0 else 'tracking'
        if t - self.last_progress_t >= 30:
            self.state = 'stalled'
            self.bias = 0.
            return
        # Only the current ordered interval and its next checkpoint guide steering.
        interval = points[max(0, self.index - 1):self.index + 2]
        self.error = self.engine.compute_nearest_point(x, y, interval)[2]
        self.engine.progress_idx = 0
        # Articulating the trailing chain left steers the free head right.
        desired = -self.engine.calculate_steering(x, y, head['yaw'], interval, dt)
        desired = max(-math.radians(20), min(math.radians(20), desired))
        self.bias += max(-.4 * dt, min(.4 * dt, desired - self.bias))

    def targets(self, targets, config, scale):
        result = dict(targets)
        for joint in config['joints']:
            if joint['axis'] == 'yaw':
                sid = joint['id']
                result[sid] = max(joint['min'], min(joint['max'], round(
                    result[sid] + joint['sign'] * self.bias * scale * COUNTS_PER_RADIAN)))
        return result

    def snapshot(self):
        distances = self.engine.distances
        return dict(target_path=self.path, actual_path=list(self.trace), state=self.state,
                    progress=distances[self.index - 1] / distances[-1] if self.index else 0.,
                    target=list(self.engine.checkpoints[self.index]) if self.index < len(distances) else None,
                    error_m=self.error, steering_deg=math.degrees(self.bias),
                    rejected_samples=self.rejected_samples)

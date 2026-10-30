import math

class PathEngine:
    """Handles predictive forward kinematics and pure pursuit pathfinding."""
    def __init__(self):
        self.lookahead_distance = 0.5
        self.max_turn_offset = 0.8
        self.reset()

    def reset(self):
        self.progress_idx = 0
        self.active_path_len = 0
        self.checkpoints = []
        self.passed = 0
        self.last_checkpoint_pose = None
        self.last_observed_pose = None
        self.distances = []
        self.segments = []

    def set_path(self, path):
        if not path:
            self.reset()
            return
        checkpoints = [tuple(path[0])]
        distances = [0.]
        segments = []
        current_segments = []
        total = 0.
        next_distance = .2
        for start, end in zip(path, path[1:]):
            start, end = tuple(start), tuple(end)
            length = math.dist(start, end)
            if not length:
                continue
            offset = 0.
            segment_start = start
            while next_distance <= total + length + 1e-12:
                offset = min(length, next_distance - total)
                point = (start[0] + (end[0] - start[0]) * offset / length,
                         start[1] + (end[1] - start[1]) * offset / length)
                current_segments.append((segment_start, point))
                segments.append(current_segments)
                current_segments = []
                checkpoints.append(point)
                distances.append(min(next_distance, total + length))
                if len(checkpoints) > 50000:
                    raise ValueError('Path is too long to track safely')
                segment_start = point
                next_distance += .2
            if offset < length:
                current_segments.append((segment_start, end))
            total += length
        if current_segments:
            if len(checkpoints) >= 50000:
                raise ValueError('Path is too long to track safely')
            checkpoints.append(tuple(path[-1]))
            distances.append(total)
            segments.append(current_segments)
        self.reset()
        self.checkpoints = checkpoints
        self.distances = distances
        self.segments = segments

    def observe(self, x, y):
        if not math.isfinite(x) or not math.isfinite(y):
            return False
        if self.last_observed_pose is not None and math.dist((x, y), self.last_observed_pose) > 0.25:
            return False
        self.last_observed_pose = (x, y)
        if self.passed < len(self.checkpoints) and math.hypot(
                x - self.checkpoints[self.passed][0], y - self.checkpoints[self.passed][1]) <= 0.1 and (
                self.last_checkpoint_pose is None or math.dist((x, y), self.last_checkpoint_pose) >= min(0.05, (self.distances[self.passed] - self.distances[self.passed - 1]) / 2)):
            self.passed += 1
            self.last_checkpoint_pose = (x, y)
        return True

    def progress(self):
        if not self.distances or not self.distances[-1] or not self.passed:
            return 0.
        return self.distances[self.passed - 1] / self.distances[-1]

    def deviation(self, x, y):
        if not self.passed or len(self.checkpoints) < 2:
            return None
        index = min(self.passed - 1, len(self.checkpoints) - 2)
        def distance(a, b):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = dx * dx + dy * dy
            t = max(0., min(1., ((x - a[0]) * dx + (y - a[1]) * dy) / length)) if length else 0.
            return math.hypot(x - a[0] - t * dx, y - a[1] - t * dy)
        return min(distance(a, b) for a, b in self.segments[index])

    def complete(self):
        return len(self.checkpoints) > 1 and self.passed == len(self.checkpoints)

    def predict_path(self, current_x, current_y, current_yaw, speed, turn_offset, dt=0.1, steps=50):
        """Predicts the future kinematic path of the snake."""
        predicted_path = []
        x, y, yaw = current_x, current_y, current_yaw
        angular_velocity = -turn_offset * speed * 2.0
        for _ in range(steps):
            x += speed * math.cos(yaw) * dt
            y += speed * math.sin(yaw) * dt
            yaw += angular_velocity * dt
            predicted_path.append((x, y))
        return predicted_path

    def calculate_pure_pursuit(self, current_x, current_y, current_yaw, target_path):
        """Calculates steering curvature needed to reach the next lookahead waypoint sequentially."""
        if not target_path:
            return 0.0

        n = len(target_path)
        if n != self.active_path_len:
            self.active_path_len = n
            self.progress_idx = 0

        # Monotonically track progress forward in a sliding window so loops and crossings don't jump ahead
        window = max(20, int(n * 0.15))
        search_start = self.progress_idx
        search_end = min(n, search_start + window)

        closest_dist = float('inf')
        closest_idx = self.progress_idx
        for i in range(search_start, search_end):
            d = math.hypot(current_x - target_path[i][0], current_y - target_path[i][1])
            if d < closest_dist:
                closest_dist = d
                closest_idx = i

        if closest_idx > self.progress_idx:
            self.progress_idx = closest_idx
        elif self.progress_idx < n - 1:
            curr_pt = target_path[self.progress_idx]
            if math.hypot(current_x - curr_pt[0], current_y - curr_pt[1]) < 0.35:
                self.progress_idx += 1

        lookahead_pt = target_path[-1]
        for i in range(self.progress_idx, n):
            d = math.hypot(current_x - target_path[i][0], current_y - target_path[i][1])
            if d >= self.lookahead_distance:
                lookahead_pt = target_path[i]
                break

        dx = lookahead_pt[0] - current_x
        dy = lookahead_pt[1] - current_y
        local_x = math.cos(-current_yaw) * dx - math.sin(-current_yaw) * dy
        local_y = math.sin(-current_yaw) * dx + math.cos(-current_yaw) * dy
        dist_sq = local_x**2 + local_y**2
        if dist_sq < 0.001:
            return 0.0
        curvature = (2.0 * local_y) / dist_sq
        turn_offset = curvature * 0.3
        return max(-self.max_turn_offset, min(self.max_turn_offset, turn_offset))

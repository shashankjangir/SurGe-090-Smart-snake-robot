import math

class PathEngine:
    """Handles predictive forward kinematics and pure pursuit pathfinding."""
    def __init__(self):
        self.lookahead_distance = 0.5
        self.max_turn_offset = 0.8
        self.progress_idx = 0
        self.active_path_len = 0

    def reset(self):
        self.progress_idx = 0
        self.active_path_len = 0

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

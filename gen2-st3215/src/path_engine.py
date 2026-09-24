import math

class PathEngine:
    """Handles predictive forward kinematics and pure pursuit pathfinding."""
    def __init__(self):
        self.lookahead_distance = 0.5
        self.max_turn_offset = 0.8

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
        """Calculates steering curvature needed to reach the next lookahead waypoint."""
        if not target_path:
            return 0.0
        closest_dist = float('inf')
        closest_idx = 0
        for i, point in enumerate(target_path):
            d = math.hypot(current_x - point[0], current_y - point[1])
            if d < closest_dist:
                closest_dist = d
                closest_idx = i
        lookahead_pt = target_path[-1]
        for i in range(closest_idx, len(target_path)):
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

"""Gen 2.1 planar gait. Units: radians, radians/second, encoder counts."""
import math


class SnakeKinematics:
    def __init__(self, num_motors=10, center_pos=2048):
        self.num_motors = num_motors
        self.center_pos = center_pos
        self.amplitude = 0.8
        self.frequency = 2.0
        self.phase_shift = 1.0
        self.turn_offset = 0.0
        self.ticks_per_radian = 4096.0 / (2 * math.pi)

    def calculate_positions(self, current_time, turn_offset=None):
        if turn_offset is not None:
            self.turn_offset = turn_offset
        positions, angles = {}, {}
        for i in range(self.num_motors):
            angle = self.amplitude * math.sin(self.frequency * current_time - i * self.phase_shift) + self.turn_offset
            ticks = max(1252, min(2844, self.center_pos + round(angle * self.ticks_per_radian)))
            positions[i + 1] = ticks
            angles[i + 1] = (ticks - self.center_pos) / self.ticks_per_radian
        return positions, angles

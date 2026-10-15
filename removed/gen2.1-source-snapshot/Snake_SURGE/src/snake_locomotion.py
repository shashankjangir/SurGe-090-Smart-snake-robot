import math

class SnakeKinematics:
    """Calculates motor target angles using a serpenoid curve."""
    def __init__(self, num_motors=10, center_pos=2048):
        self.num_motors = num_motors
        self.center_pos = center_pos
        self.amplitude = 0.8
        self.frequency = 2.0
        self.phase_shift = 1.0
        self.turn_offset = 0.0
        self.ticks_per_radian = 4096.0 / (2.0 * math.pi)

    def calculate_positions(self, current_time, turn_offset=None):
        """Returns ST3215 Waveshare ticks and radians for each motor at the current time."""
        positions = {}
        angles = {}
        if turn_offset is not None:
            self.turn_offset = turn_offset
        for i in range(self.num_motors): 
            target_angle = (self.amplitude * math.sin(self.frequency * current_time - i * self.phase_shift)) + self.turn_offset
            ticks = self.center_pos + int(target_angle * self.ticks_per_radian)
            clamped_ticks = max(0, min(4095, ticks))
            motor_id = i + 1
            positions[motor_id] = clamped_ticks
            angles[motor_id] = target_angle
        return positions, angles

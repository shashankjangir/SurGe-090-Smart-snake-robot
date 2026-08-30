import math

from .robot_config import Config


class SnakeKinematics:
    """
    Sinusoidal lateral undulation for the planar ST3215 chain.

    Every joint is yaw (output shaft along Z). Pitch-hold from the XL330
    alternating-joint body is disabled when Config.PLANAR_ALL_YAW is True.
    """

    def __init__(
        self,
        num_motors: int = Config.NUM_JOINTS,
        center_pos: int = Config.ENCODER_CENTER,
    ):
        self.num_motors = num_motors
        self.center_pos = center_pos
        self.amplitude = Config.GAIT_AMPLITUDE
        self.frequency = Config.GAIT_FREQUENCY
        self.phase_shift = Config.GAIT_PHASE_SHIFT
        self.turn_offset = Config.GAIT_TURN_OFFSET

    def calculate_positions(
        self,
        current_time: float,
        mode: str = "SLITHER",
        turn_direction: int = 1,
    ) -> dict:
        wave_dir = 1
        bend = 0

        if mode == "SLITHER_REV":
            wave_dir = -1
        elif mode == "SLITHER_TURN":
            wave_dir = 1
            bend = turn_direction * self.turn_offset

        positions = {}
        for i in range(1, self.num_motors + 1):
            drive_yaw = Config.PLANAR_ALL_YAW or (i % 2 != 0)
            if drive_yaw:
                wave_phase = (wave_dir * self.frequency * current_time) - (i * self.phase_shift)
                pos = int(self.center_pos + self.amplitude * math.sin(wave_phase) + bend)
            else:
                pos = self.center_pos
            positions[i] = max(Config.ENCODER_MIN, min(Config.ENCODER_MAX, pos))
        return positions

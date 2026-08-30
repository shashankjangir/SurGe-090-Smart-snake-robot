import math

from .robot_config import Config
from .utils import radians_to_encoder


class Kinematics:
    """
    Bellows-model curvature wave. Not used by the live ST3215 gait
    (see SnakeKinematics). Kept for experiments; convert with to_encoder_ticks().
    """

    def __init__(self):
        self.config = Config

    def calculate_target_angles(self, time_t: float) -> list:
        target_angles = []
        for i in range(self.config.NUM_JOINTS):
            s_i = i * self.config.LINK_LENGTH_M
            if i % 2 == 0:
                k = self.config.K_0 * math.cos(
                    self.config.K_S * s_i + self.config.K_T * time_t + self.config.PSI_D
                )
            else:
                k = self.config.K_0 * math.sin(
                    self.config.K_S * s_i + self.config.K_T * time_t + self.config.PSI_L
                )
            theta = self.config.LINK_LENGTH_M * k
            theta = max(-self.config.MAX_ANGLE_RAD, min(self.config.MAX_ANGLE_RAD, theta))
            target_angles.append(theta)
        return target_angles

    def to_encoder_ticks(self, angles_rad: list) -> dict:
        return {i + 1: radians_to_encoder(a) for i, a in enumerate(angles_rad)}

    def calculate_target_velocities(
        self,
        current_targets: list,
        previous_targets: list,
        dt: float,
    ) -> list:
        if dt <= 0:
            return [0.0] * len(current_targets)
        return [(curr - prev) / dt for curr, prev in zip(current_targets, previous_targets)]

import math

from .robot_config import Config


class Kinematics:
    """
    Bellows-model kinematics for a serial-chain snake robot.

    Computes per-joint target angles by evaluating a travelling curvature wave
    along the backbone.  Joint convention:

    - **Even** indices (0, 2, 4 …) → Dorsal (pitch) joints
    - **Odd**  indices (1, 3, 5 …) → Lateral (yaw) joints
    """

    def __init__(self):
        self.config = Config

    def calculate_target_angles(self, time_t: float) -> list:
        """
        Calculate theoretical target angles for all joints.

        The angle at each joint is approximated as the integral of the
        curvature wave ``k(s, t)`` over the link length ``L``:

            θᵢ ≈ L · k(s_i, t)

        Args:
            time_t: Elapsed time in seconds.

        Returns:
            List of target joint angles in radians, clamped to ±MAX_ANGLE_RAD.
        """
        target_angles = []

        for i in range(self.config.NUM_JOINTS):
            # Arc-length position along the backbone for this joint
            s_i = i * self.config.LINK_LENGTH_M

            if i % 2 == 0:
                # Even index → Dorsal (pitch) joint
                k_d = (
                    self.config.K_0
                    * math.cos(
                        self.config.K_S * s_i
                        + self.config.K_T * time_t
                        + self.config.PSI_D
                    )
                )
                theta_target = self.config.LINK_LENGTH_M * k_d
            else:
                # Odd index → Lateral (yaw) joint
                k_l = (
                    self.config.K_0
                    * math.sin(
                        self.config.K_S * s_i
                        + self.config.K_T * time_t
                        + self.config.PSI_L
                    )
                )
                theta_target = self.config.LINK_LENGTH_M * k_l

            # Clamp to joint angle safety limits
            theta_target = max(
                -self.config.MAX_ANGLE_RAD,
                min(self.config.MAX_ANGLE_RAD, theta_target),
            )
            target_angles.append(theta_target)

        return target_angles

    def calculate_target_velocities(
        self,
        current_targets: list,
        previous_targets: list,
        dt: float,
    ) -> list:
        """
        Estimate target velocities via numerical differentiation of target angles.

        Args:
            current_targets:  Target angles at the current time step (radians).
            previous_targets: Target angles at the previous time step (radians).
            dt:               Time step duration in seconds.

        Returns:
            List of target velocities in rad/s.
        """
        return [
            (curr - prev) / dt
            for curr, prev in zip(current_targets, previous_targets)
        ]

import math
from .robot_config import Config


class SnakeKinematics:
    """
    Sinusoidal lateral undulation gait for a 10-motor serial-chain snake robot.

    Odd-numbered motors (1, 3, 5 …) are **yaw** (lateral) joints that receive
    the travelling sine wave.  Even-numbered motors (2, 4, 6 …) are **pitch**
    joints held flat against the ground.
    """

    def __init__(
        self,
        num_motors: int = Config.NUM_JOINTS,
        center_pos: int = Config.ENCODER_CENTER,
    ):
        """
        Args:
            num_motors: Total number of Dynamixel motors in the snake (default: 10).
            center_pos: Encoder count for 0° (straight). XL330 range is 0–4095, center = 2048.
        """
        self.num_motors = num_motors
        self.center_pos = center_pos

        # Locomotion parameters — tune these for different gaits
        self.amplitude   = 400   # Peak deflection from centre (encoder ticks)
        self.frequency   = 3.0   # Wave propagation speed
        self.phase_shift = 1.2   # Phase offset between adjacent segments (radians)
        self.turn_offset = 300   # Encoder ticks added to yaw joints to curve the spine

    def calculate_positions(
        self,
        current_time: float,
        mode: str = "SLITHER",
        turn_direction: int = 1,
    ) -> dict:
        """
        Calculate target encoder positions for all motors at ``current_time``.

        Uses 2D lateral undulation relying on friction anisotropy of the body
        segments against the floor.

        Args:
            current_time:   Elapsed run time in seconds.
            mode:           One of ``"SLITHER"``, ``"SLITHER_REV"``, ``"SLITHER_TURN"``.
            turn_direction: +1 = bend right, -1 = bend left.  Only used in
                            ``SLITHER_TURN`` mode.  Provided by
                            :class:`ObstacleAvoidance` so the robot turns away
                            from whichever side the obstacle was detected on.

        Returns:
            Dict mapping motor index (1 … num_motors) to goal encoder position.
        """
        wave_dir = 1
        bend     = 0

        if mode == "SLITHER_REV":
            wave_dir = -1   # Invert time component to slither backward
        elif mode == "SLITHER_TURN":
            wave_dir = 1    # Keep slithering forward but bias the spine
            bend     = turn_direction * self.turn_offset

        positions = {}
        for i in range(1, self.num_motors + 1):
            is_yaw = (i % 2 != 0)   # Odd motors are yaw (lateral) joints

            if is_yaw:
                wave_phase = (wave_dir * self.frequency * current_time) - (i * self.phase_shift)
                pos = int(self.center_pos + self.amplitude * math.sin(wave_phase) + bend)
            else:
                # Pitch joints remain flat
                pos = self.center_pos

            # Clamp to valid XL330 encoder range
            positions[i] = max(Config.ENCODER_MIN, min(Config.ENCODER_MAX, pos))

        return positions

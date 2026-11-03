from .robot_config import Config


class ObstacleAvoidance:
    """
    Current-based obstacle detection and evasion state machine.

    States cycle as:
        SLITHER  ──(stall detected)──►  SLITHER_REV  ──(timer)──►  SLITHER_TURN  ──(timer)──►  SLITHER

    The turn direction (left or right) is determined by the sign of the stalling
    motor's current at the moment of collision, so the robot turns away from the
    obstacle rather than always turning the same way.
    """

    def __init__(
        self,
        current_threshold: int = Config.OBSTACLE_CURRENT_THRESHOLD_MA,
        reverse_duration: float = Config.EVASION_REVERSE_DURATION_S,
        turn_duration: float = Config.EVASION_TURN_DURATION_S,
    ):
        """
        Args:
            current_threshold: Motor current (mA) above which a stall/collision is triggered.
            reverse_duration:  Seconds to slither in reverse before turning.
            turn_duration:     Seconds to slither in the turn before resuming forward.
        """
        self.current_threshold = current_threshold
        self.reverse_duration  = reverse_duration
        self.turn_duration     = turn_duration

        self.state          = "SLITHER"
        self.state_end_time = 0.0
        # +1 = turn right (positive bend), -1 = turn left (negative bend).
        # Determined at collision time by the sign of the stalling motor's current.
        self.turn_direction = 1

    def process_state(self, current_time: float, motor_currents: dict) -> str:
        """
        Evaluate the current time and motor current readings, advance the state
        machine if needed, and return the current operational state string.

        Args:
            current_time:   Elapsed time in seconds since the run started.
            motor_currents: Dict mapping motor ID (int) to signed current (mA).

        Returns:
            One of: "SLITHER", "SLITHER_REV", "SLITHER_TURN"
        """
        # --- Phase 1: Manage ongoing evasion timers ---
        if self.state in ("SLITHER_REV", "SLITHER_TURN"):
            if current_time >= self.state_end_time:
                if self.state == "SLITHER_REV":
                    print("[EVASION] Switching from Reverse to Turn-Slither...")
                    self.state          = "SLITHER_TURN"
                    self.state_end_time = current_time + self.turn_duration
                elif self.state == "SLITHER_TURN":
                    print("[EVASION] Evasion complete. Resuming forward slither.")
                    self.state = "SLITHER"
            return self.state

        # --- Phase 2: Detect new collision while slithering normally ---
        for motor_id, current_ma in motor_currents.items():
            if abs(current_ma) > self.current_threshold:
                # Determine which side the obstacle is on from the sign of the current.
                # A positive current means the motor was driving forward and hit something;
                # turn away by inverting the direction.
                self.turn_direction = -1 if current_ma > 0 else 1

                print(
                    f"[ALERT] Obstacle on Motor {motor_id}! "
                    f"Load: {abs(current_ma)} mA  |  "
                    f"Turn direction: {'RIGHT' if self.turn_direction > 0 else 'LEFT'}"
                )
                print("[EVASION] Initiating Reverse Slither...")
                self.state          = "SLITHER_REV"
                self.state_end_time = current_time + self.reverse_duration
                break

        return self.state

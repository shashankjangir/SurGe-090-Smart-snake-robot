from .robot_config import Config


class ObstacleAvoidance:
    """
    Current-based stall detection on ST3215 present-current (mA).

    SLITHER --(|I| > threshold)--> SLITHER_REV --(timer)--> SLITHER_TURN --> SLITHER

    Turn sign still uses current sign (drive vs back-drive). That is not a
    geometric left/right measurement; IMU yaw or which joint stalled vs phase
    would be required for true side-awareness.
    """

    def __init__(
        self,
        current_threshold: int = Config.OBSTACLE_CURRENT_THRESHOLD_MA,
        reverse_duration: float = Config.EVASION_REVERSE_DURATION_S,
        turn_duration: float = Config.EVASION_TURN_DURATION_S,
    ):
        self.current_threshold = current_threshold
        self.reverse_duration = reverse_duration
        self.turn_duration = turn_duration
        self.state = "SLITHER"
        self.state_end_time = 0.0
        self.turn_direction = 1

    def process_state(self, current_time: float, motor_currents: dict) -> str:
        if self.state in ("SLITHER_REV", "SLITHER_TURN"):
            if current_time >= self.state_end_time:
                if self.state == "SLITHER_REV":
                    print("[EVASION] Reverse -> turn")
                    self.state = "SLITHER_TURN"
                    self.state_end_time = current_time + self.turn_duration
                elif self.state == "SLITHER_TURN":
                    print("[EVASION] Resume forward slither")
                    self.state = "SLITHER"
            return self.state

        for motor_id, current_ma in motor_currents.items():
            if abs(current_ma) > self.current_threshold:
                self.turn_direction = -1 if current_ma > 0 else 1
                print(
                    f"[ALERT] Stall on servo {motor_id}: {abs(current_ma)} mA "
                    f"(threshold {self.current_threshold} mA)  "
                    f"turn={'RIGHT' if self.turn_direction > 0 else 'LEFT'}"
                )
                self.state = "SLITHER_REV"
                self.state_end_time = current_time + self.reverse_duration
                break
        return self.state

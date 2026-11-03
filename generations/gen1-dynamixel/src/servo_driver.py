import random
import time

from .robot_config import Config


class ServoState:
    """Holds the last-known state of a single servo joint."""

    def __init__(self, joint_id: int):
        self.joint_id = joint_id
        self.position = 0.0   # radians
        self.velocity = 0.0   # rad/s
        self.load     = 0.0   # Nm (torque / current feedback proxy)


class ServoDriver:
    """
    Hardware Abstraction Layer for serial-bus servos (Dynamixel protocol).

    Currently provides a **mock** simulation backend suitable for software
    testing without physical hardware.  To deploy on the real robot, replace
    the bodies of :meth:`connect`, :meth:`read_all_states`, and
    :meth:`write_target_torques` with Dynamixel SDK ``SyncRead``/``SyncWrite``
    calls targeting the XL330 control table addresses in :class:`DynamixelAddr`.
    """

    def __init__(
        self,
        num_servos: int,
        port: str = "/dev/ttyUSB0",
        baudrate: int = Config.BAUDRATE,   # 57600 — matches XL330 factory default
    ):
        self.num_servos   = num_servos
        self.port         = port
        self.baudrate     = baudrate
        self.states       = [ServoState(i) for i in range(num_servos)]

        # Internal state for the mock physics simulation
        self._target_torques = [0.0] * num_servos

    def connect(self) -> bool:
        """Open the serial port and prepare the servo bus."""
        print(f"[ServoDriver] Connecting to servos on {self.port} at {self.baudrate} baud...")
        time.sleep(0.5)
        print("[ServoDriver] Successfully connected to servos.")
        return True

    def set_torque_mode(self) -> None:
        """Set all servos to current/torque control mode."""
        print("[ServoDriver] Setting all servos to Torque Control Mode.")

    def read_all_states(self) -> list:
        """
        Read position, velocity, and load from all servos.

        .. note::
            **Mock implementation** — simulates physics via Euler integration.
            Replace with a Dynamixel SDK ``SyncRead`` call in production so all
            motor states are fetched in a single bus transaction.
        """
        for i in range(self.num_servos):
            # Simple Euler integration: F = ma proxy
            acceleration = self._target_torques[i] * 5.0

            # Add friction / damping
            acceleration -= self.states[i].velocity * 0.5

            self.states[i].velocity += acceleration * Config.DT
            self.states[i].position += self.states[i].velocity * Config.DT

            # Load feedback: proportional to applied torque plus sensor noise
            self.states[i].load = self._target_torques[i] + random.uniform(-0.1, 0.1)

        return self.states

    def write_target_torques(self, torques: list) -> None:
        """
        Send target torque commands to all servos.

        Args:
            torques: List of torque values (Nm) with length equal to ``num_servos``.

        .. note::
            **Mock implementation** — stores values for the next physics tick.
            Replace with a Dynamixel SDK ``SyncWrite`` call in production.
        """
        if len(torques) != self.num_servos:
            raise ValueError(
                f"Torque array length {len(torques)} must match "
                f"num_servos={self.num_servos}."
            )
        self._target_torques = list(torques)

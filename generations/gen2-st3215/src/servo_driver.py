"""ST3215 bench driver. Missing feedback is a fault, never a zero reading."""
from dataclasses import dataclass
import math
import time

from .feetech_protocol import FeetechBus
from .robot_config import Config, St3215Addr, default_serial_port
from .utils import encoder_to_radians, to_signed_current, to_signed_magnitude


@dataclass
class ServoState:
    joint_id: int
    position: float = 0.0
    velocity: float = 0.0
    load: float = 0.0
    current_ma: int = 0
    encoder: int = Config.ENCODER_CENTER
    voltage_v: float = 0.0
    temperature_c: int = 0
    valid: bool = False


class ServoDriver:
    def __init__(self, num_servos=Config.NUM_JOINTS, port=None,
                 baudrate=Config.BAUDRATE, mock=False):
        if not 1 <= num_servos <= 253:
            raise ValueError("num_servos must be 1..253")
        self.num_servos = num_servos
        self.port = port or default_serial_port()
        self.baudrate = baudrate
        self.mock = mock
        self.states = [ServoState(i + 1) for i in range(num_servos)]
        self._target_torques = [0.0] * num_servos
        self._bus = self._ser = None
        self._enabled = set()

    def connect(self):
        if self.mock or self._bus:
            return True
        import serial
        self._ser = serial.Serial(self.port, self.baudrate, timeout=.02, write_timeout=.2)
        self._bus = FeetechBus(self._ser)
        time.sleep(.2)
        return True

    def close(self):
        try:
            if self._enabled:
                self.enable_torque(False)
        finally:
            if self._bus:
                self._bus.close()
            self._bus = self._ser = None
            self._enabled.clear()

    def _check_id(self, sid):
        if type(sid) is not int or not 1 <= sid <= self.num_servos:
            raise ValueError("Invalid servo ID")
        if not self.mock and self._bus is None:
            raise RuntimeError("Connect the servo bus first")

    def ping(self, servo_id):
        self._check_id(servo_id)
        return self.mock or self._bus.ping(servo_id)

    def enable_torque(self, on=True, servo_id=None):
        ids = [servo_id] if servo_id is not None else list(range(1, self.num_servos + 1))
        for sid in ids:
            self._check_id(sid)
        failures = []
        for sid in ids:
            try:
                if on:
                    # Even an unacknowledged enable needs a cleanup attempt.
                    self._enabled.add(sid)
                    if not self.mock:
                        pos = self._bus.read2(sid, St3215Addr.PRESENT_POSITION)
                        if pos is None or not Config.JOINT_MIN <= pos <= Config.JOINT_MAX:
                            raise RuntimeError(f"ID {sid}: missing or out-of-range startup position")
                        self.write_goal_positions({sid: pos})
                        if not self._bus.write1(sid, St3215Addr.ACC, Config.GOAL_ACC):
                            raise RuntimeError(f"ID {sid}: acceleration not acknowledged")
                if not self.mock and not self._bus.write1(sid, St3215Addr.TORQUE_ENABLE, int(on)):
                    raise RuntimeError(f"ID {sid}: torque {'on' if on else 'off'} not acknowledged")
                if not on:
                    self._enabled.discard(sid)
            except (OSError, RuntimeError) as exc:
                if on:
                    raise
                failures.append(str(exc))
        if failures:
            raise RuntimeError("; ".join(failures))

    def set_torque_mode(self):
        if not self.mock:
            raise NotImplementedError("ST3215 bench control uses position mode")

    def write_goal_positions(self, positions):
        payload = {}
        for sid, ticks in positions.items():
            self._check_id(sid)
            if not math.isfinite(ticks):
                raise ValueError("Position must be finite")
            ticks = max(Config.JOINT_MIN, min(Config.JOINT_MAX, int(ticks)))
            payload[sid] = ticks.to_bytes(2, "little") + b"\0\0" + Config.GOAL_SPEED.to_bytes(2, "little")
        if not self.mock:
            if self._bus is None:
                raise RuntimeError("Connect the servo bus first")
            self._bus.sync_write(St3215Addr.GOAL_POSITION, payload)
        else:
            for sid, data in payload.items():
                state = self.states[sid - 1]
                state.encoder = int.from_bytes(data[:2], "little")
                state.position = encoder_to_radians(state.encoder)
                state.valid = True

    def read_current_ma(self, servo_id):
        self._check_id(servo_id)
        if self.mock:
            return 0
        raw = self._bus.read2(servo_id, St3215Addr.PRESENT_CURRENT)
        if raw is None:
            raise RuntimeError(f"ID {servo_id}: current feedback lost")
        return to_signed_current(raw)

    def read_all_currents(self):
        return {sid: self.read_current_ma(sid) for sid in range(1, self.num_servos + 1)}

    def read_all_states(self):
        for state in self.states:
            self._check_id(state.joint_id)
            state.valid = False
            if self.mock:
                torque = self._target_torques[state.joint_id - 1]
                state.velocity += (torque * 5 - state.velocity * .5) * Config.DT
                state.position += state.velocity * Config.DT
                state.load = torque
            else:
                data = self._bus.read(state.joint_id, St3215Addr.PRESENT_POSITION, 15)
                if data is None:
                    continue
                state.encoder = int.from_bytes(data[:2], "little")
                if not 0 <= state.encoder <= 4095:
                    continue
                state.position = encoder_to_radians(state.encoder)
                state.velocity = to_signed_magnitude(int.from_bytes(data[2:4], "little")) * math.tau / 4096
                state.current_ma = to_signed_current(int.from_bytes(data[13:15], "little"))
                state.load = state.current_ma / Config.STALL_CURRENT_MA * Config.MAX_TORQUE_NM
                state.voltage_v = data[6] * .1
                state.temperature_c = data[7]
            state.valid = True
        return self.states

    def write_target_torques(self, torques):
        if len(torques) != self.num_servos or not all(math.isfinite(t) for t in torques):
            raise ValueError("One finite torque per servo is required")
        if not self.mock:
            raise NotImplementedError("ST3215 bench control uses position mode")
        self._target_torques = list(torques)

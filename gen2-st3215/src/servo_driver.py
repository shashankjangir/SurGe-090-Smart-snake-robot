"""Hardware abstraction for Waveshare ST3215 on a Feetech 1 Mbps bus."""

from __future__ import annotations

import random
import time

from .feetech_protocol import FeetechBus
from .robot_config import Config, St3215Addr, default_serial_port
from .utils import encoder_to_radians, to_signed_current


class ServoState:
    def __init__(self, joint_id: int):
        self.joint_id = joint_id
        self.position = 0.0  # radians
        self.velocity = 0.0  # rad/s
        self.load = 0.0  # Nm proxy
        self.current_ma = 0
        self.encoder = Config.ENCODER_CENTER
        self.voltage_v = 0.0
        self.temperature_c = 0


class ServoDriver:
    """
    ST3215 bus driver.

    Real hardware: USB CDC of the Waveshare board flashed with
    ``firmware/usb_servo_bridge``, or any USB-TTL adapter on the 3-pin bus.
    Field robot: the ESP32 sketch owns Serial1; this class is for bench/PC.

    Set ``mock=True`` (or env SURGE_MOCK=1) to run without servos.
    """

    def __init__(
        self,
        num_servos: int = Config.NUM_JOINTS,
        port: str | None = None,
        baudrate: int = Config.BAUDRATE,
        mock: bool = False,
    ):
        self.num_servos = num_servos
        self.port = port or default_serial_port()
        self.baudrate = baudrate
        self.mock = mock
        self.states = [ServoState(i + 1) for i in range(num_servos)]
        self._target_torques = [0.0] * num_servos
        self._bus: FeetechBus | None = None
        self._ser = None

    def connect(self) -> bool:
        if self.mock:
            print("[ServoDriver] Mock ST3215 bus (no serial).")
            return True
        try:
            import serial
        except ImportError as exc:
            raise ImportError("pyserial is required: pip install pyserial") from exc

        print(
            f"[ServoDriver] Opening {self.port} at {self.baudrate} baud "
            "(Feetech STS / ST3215)..."
        )
        self._ser = serial.Serial(self.port, self.baudrate, timeout=0.02)
        time.sleep(0.2)
        self._bus = FeetechBus(self._ser)
        print("[ServoDriver] Port open.")
        return True

    def close(self) -> None:
        if self._bus:
            self._bus.close()
            self._bus = None
            self._ser = None

    def ping(self, servo_id: int) -> bool:
        if self.mock:
            return True
        assert self._bus is not None
        return self._bus.ping(servo_id)

    def enable_torque(self, on: bool = True, servo_id: int | None = None) -> None:
        value = 1 if on else 0
        ids = [servo_id] if servo_id is not None else list(range(1, self.num_servos + 1))
        for sid in ids:
            if self.mock:
                continue
            self._bus.write1(sid, St3215Addr.ACC, Config.GOAL_ACC)
            ok = self._bus.write1(sid, St3215Addr.TORQUE_ENABLE, value)
            tag = "OK" if ok else "FAIL"
            print(f"[{tag:4}] torque {'enable' if on else 'disable'} ID {sid}")

    def set_torque_mode(self) -> None:
        print("[ServoDriver] ST3215 stays in position mode for the gait loop.")

    def write_goal_positions(self, positions: dict[int, int]) -> None:
        if self.mock:
            for sid, ticks in positions.items():
                idx = sid - 1
                if 0 <= idx < self.num_servos:
                    self.states[idx].encoder = ticks
                    self.states[idx].position = encoder_to_radians(ticks)
            return
        assert self._bus is not None
        payload = {}
        for sid, ticks in positions.items():
            ticks = max(Config.ENCODER_MIN, min(Config.ENCODER_MAX, int(ticks)))
            speed = Config.GOAL_SPEED
            # Position (2) + Time (2) + Speed (2) starting at GOAL_POSITION
            payload[sid] = bytes(
                [
                    ticks & 0xFF,
                    (ticks >> 8) & 0xFF,
                    0,
                    0,
                    speed & 0xFF,
                    (speed >> 8) & 0xFF,
                ]
            )
        self._bus.sync_write(St3215Addr.GOAL_POSITION, payload)

    def read_current_ma(self, servo_id: int) -> int:
        if self.mock:
            return 0
        assert self._bus is not None
        raw = self._bus.read2(servo_id, St3215Addr.PRESENT_CURRENT)
        if raw is None:
            print(f"[WARN] current read failed ID {servo_id}")
            return 0
        return to_signed_current(raw)

    def read_all_currents(self) -> dict[int, int]:
        return {sid: self.read_current_ma(sid) for sid in range(1, self.num_servos + 1)}

    def read_all_states(self) -> list:
        if self.mock:
            for i in range(self.num_servos):
                acc = self._target_torques[i] * 5.0
                acc -= self.states[i].velocity * 0.5
                self.states[i].velocity += acc * Config.DT
                self.states[i].position += self.states[i].velocity * Config.DT
                self.states[i].load = self._target_torques[i] + random.uniform(-0.1, 0.1)
            return self.states

        assert self._bus is not None
        for i, sid in enumerate(range(1, self.num_servos + 1)):
            pos = self._bus.read2(sid, St3215Addr.PRESENT_POSITION)
            cur = self._bus.read2(sid, St3215Addr.PRESENT_CURRENT)
            volt = self._bus.read1(sid, St3215Addr.PRESENT_VOLTAGE)
            temp = self._bus.read1(sid, St3215Addr.PRESENT_TEMPERATURE)
            if pos is not None:
                self.states[i].encoder = pos
                self.states[i].position = encoder_to_radians(pos)
            if cur is not None:
                self.states[i].current_ma = to_signed_current(cur)
                # crude torque proxy: stall 2.7 A ≈ 2.94 N·m
                self.states[i].load = (self.states[i].current_ma / Config.STALL_CURRENT_MA) * Config.MAX_TORQUE_NM
            if volt is not None:
                self.states[i].voltage_v = volt * 0.1
            if temp is not None:
                self.states[i].temperature_c = temp
        return self.states

    def write_target_torques(self, torques: list) -> None:
        if len(torques) != self.num_servos:
            raise ValueError(
                f"Torque array length {len(torques)} must match num_servos={self.num_servos}."
            )
        self._target_torques = list(torques)
        if not self.mock:
            print("[ServoDriver] Torque writes ignored — gait uses position mode.")

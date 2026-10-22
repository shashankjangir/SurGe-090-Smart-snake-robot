"""Gen 2.1 text protocol. Only the matching receiver accepts the handshake.

No port is opened at import. Missing telemetry stays missing; it is never
replaced by a fabricated centre position. STOP requests torque disable.
"""
import math
import os
import time


class ST3215Interface:
    def __init__(self, num_motors=10, port=None, baudrate=115200):
        self.num_motors = num_motors
        self.port_name = port or os.environ.get("SURGE_PORT")
        self.baudrate = baudrate
        self.serial_port = None
        self.is_connected = False
        self.armed = False
        self.last_positions = {}  # commanded positions, NOT measured positions
        self.sensors = {}
        self.sensor_time = None

    def _send(self, command):
        self.serial_port.write((command + "\n").encode("ascii"))

    def _sensor(self, line):
        if not line.startswith("T:"):
            return False
        try:
            values = dict(part.split(":", 1) for part in line.split())
            self.sensors = {key: float(value) for key, value in values.items()}
            self.sensor_time = time.monotonic()
        except ValueError:
            pass
        return True

    def _wait(self, prefix, timeout=0.35):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            line = self.serial_port.readline().decode("ascii", errors="replace").strip()
            if line.startswith("ERR,"):
                self.armed = False
                raise RuntimeError(f"Receiver fault: {line}")
            if line == "STOP,WATCHDOG":
                self.armed = False
                if prefix != "OK,STOP":
                    raise RuntimeError("Receiver watchdog stopped motion")
            if self._sensor(line):
                continue
            if line.startswith(prefix):
                return line
        return None

    def connect(self):
        if not self.port_name:
            return False, "Select a serial port or set SURGE_PORT."
        try:
            import serial
            self.serial_port = serial.Serial()
            self.serial_port.port = self.port_name
            self.serial_port.baudrate = self.baudrate
            self.serial_port.timeout = 0.03
            self.serial_port.write_timeout = 0.2
            self.serial_port.dtr = False
            self.serial_port.rts = False
            self.serial_port.open()
            # A board may still reset when USB opens. Retry the read-only handshake.
            for _ in range(6):
                self._send("HELLO")
                if self._wait("SURGE,2.1", 0.5):
                    self.is_connected = True
                    self.stop()
                    return True, "Gen 2.1 connected; torque off"
            raise RuntimeError("No Gen 2.1 handshake. Flash receiver_gen2_1 (and transmitter_gen2_1 for wireless).")
        except Exception as exc:
            if self.serial_port:
                self.serial_port.close()
            self.is_connected = False
            return False, str(exc)

    def start(self):
        if not self.is_connected:
            raise RuntimeError("Not connected")
        self._send("RUN")
        if self._wait("OK,RUN") is None:
            raise RuntimeError("RUN was not acknowledged")
        self.armed = True

    def stop(self):
        self.armed = False
        if self.is_connected:
            self._send("STOP")
            if self._wait("OK,STOP") is None:
                raise RuntimeError("STOP not acknowledged; receiver watchdog expires after 750 ms without targets")

    def disconnect(self):
        try:
            if self.is_connected:
                self.stop()
        finally:
            if self.serial_port:
                self.serial_port.close()
            self.serial_port = None
            self.is_connected = False
            self.armed = False

    def write_positions(self, positions_dict, speed=600):
        if not self.is_connected or not self.armed:
            raise RuntimeError("Connect and RUN before sending targets")
        if not math.isfinite(float(speed)) or not 1 <= speed <= 3400:
            raise ValueError("speed must be 1..3400")
        parts = ["P"]
        for motor_id, target in positions_dict.items():
            if not 1 <= int(motor_id) <= self.num_motors or not math.isfinite(float(target)):
                raise ValueError("Invalid motor target")
            # ±70 degrees, matching the Gen 2.1 receiver.
            ticks = max(1252, min(2844, int(target)))
            self.last_positions[motor_id] = ticks
            parts.append(f"{motor_id}:{ticks}:{int(speed)}")
        if len(parts) > 1:
            self._send(",".join(parts))

    def read_telemetry(self):
        if not self.is_connected:
            return {}
        self._send("T")
        line = self._wait("T,", 0.2)
        result = {i: {"valid": False, "load": None, "velocity": None, "position": None}
                  for i in range(1, self.num_motors + 1)}
        if line:
            for field in line[2:].split(","):
                try:
                    sid, load, velocity, position = map(int, field.split(":"))
                    if sid in result and 0 <= position <= 4095:
                        result[sid] = {"valid": True, "load": load, "velocity": velocity, "position": position}
                except ValueError:
                    continue
        return result

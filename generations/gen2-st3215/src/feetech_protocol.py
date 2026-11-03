"""Bounded Feetech STS packets over a single-owner serial connection."""
import time

INST_PING, INST_READ, INST_WRITE, INST_SYNC_WRITE = 1, 2, 3, 0x83
BROADCAST_ID = 254


def checksum(body: bytes) -> int:
    return ~sum(body) & 255


def pack(servo_id: int, instruction: int, params: bytes = b"") -> bytes:
    if not 1 <= servo_id <= BROADCAST_ID or len(params) > 253:
        raise ValueError("Invalid servo ID or packet length")
    body = bytes((servo_id, len(params) + 2, instruction)) + params
    return b"\xff\xff" + body + bytes((checksum(body),))


def _extract_status(buf, expected_id, expected_length=None, sent=b""):
    """Ignore noise, incomplete frames, TX echoes, and servo error replies."""
    offset = 0
    while offset + 6 <= len(buf):
        if buf[offset:offset + 2] != b"\xff\xff":
            offset += 1
            continue
        length = buf[offset + 3]
        end = offset + length + 4
        if length < 2 or end > len(buf):
            offset += 1
            continue
        frame = buf[offset:end]
        if checksum(frame[2:-1]) != frame[-1]:
            offset += 1
            continue
        offset = end
        if frame == sent or frame[2] != expected_id or frame[4] != 0:
            continue
        params = frame[5:-1]
        if expected_length is None or len(params) == expected_length:
            return bytes(params)
    return None


class FeetechBus:
    def __init__(self, serial_port, timeout_s=0.02):
        self.ser = serial_port
        self.timeout_s = timeout_s
        self._last_tx = b""

    def close(self):
        self.ser.close()

    def _write(self, packet):
        self.ser.reset_input_buffer()
        self._last_tx = packet
        if self.ser.write(packet) != len(packet):
            raise OSError("Incomplete servo packet write")

    def _read_status(self, expected_id, expected_length=None):
        deadline = time.monotonic() + self.timeout_s
        buf = bytearray()
        while time.monotonic() < deadline:
            waiting = self.ser.in_waiting
            if waiting:
                buf.extend(self.ser.read(min(waiting, 512)))
                data = _extract_status(buf, expected_id, expected_length, self._last_tx)
                if data is not None:
                    return data
                buf = buf[-512:]
            else:
                time.sleep(0.0005)
        return None

    def ping(self, servo_id):
        self._write(pack(servo_id, INST_PING))
        return self._read_status(servo_id, 0) is not None

    def write(self, servo_id, address, data, wait_ack=True):
        self._write(pack(servo_id, INST_WRITE, bytes((address,)) + data))
        return not wait_ack or servo_id == BROADCAST_ID or self._read_status(servo_id, 0) is not None

    def write1(self, servo_id, address, value):
        return self.write(servo_id, address, int(value).to_bytes(1, "little"))

    def write2(self, servo_id, address, value):
        return self.write(servo_id, address, int(value).to_bytes(2, "little"))

    def read(self, servo_id, address, length):
        if not 1 <= length <= 253:
            raise ValueError("Read length must be 1..253")
        self._write(pack(servo_id, INST_READ, bytes((address, length))))
        return self._read_status(servo_id, length)

    def read1(self, servo_id, address):
        data = self.read(servo_id, address, 1)
        return data[0] if data is not None else None

    def read2(self, servo_id, address):
        data = self.read(servo_id, address, 2)
        return int.from_bytes(data, "little") if data is not None else None

    def sync_write(self, address, id_to_data):
        if not id_to_data:
            return
        width = len(next(iter(id_to_data.values())))
        payload = bytearray((address, width))
        for sid, data in id_to_data.items():
            if not 1 <= sid <= 253 or len(data) != width or width == 0:
                raise ValueError("Invalid ID or inconsistent sync-write width")
            payload.extend(bytes((sid,)) + data)
        self._write(pack(BROADCAST_ID, INST_SYNC_WRITE, bytes(payload)))

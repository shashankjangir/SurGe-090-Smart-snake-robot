"""
Minimal Feetech SCS/STS (Protocol 1-style) packet layer for ST3215.

Packet: FF FF | ID | LEN | INST | PARAMS... | CHECKSUM
LEN = number of params + 2 (INST + checksum)
Checksum = ~(ID + LEN + INST + PARAMS) & 0xFF
"""

from __future__ import annotations

import time
from typing import Optional

from .robot_config import Config

INST_PING = 0x01
INST_READ = 0x02
INST_WRITE = 0x03
INST_SYNC_WRITE = 0x83


def checksum(body: bytes) -> int:
    return (~sum(body)) & 0xFF


def pack(servo_id: int, instruction: int, params: bytes = b"") -> bytes:
    body = bytes([servo_id, len(params) + 2, instruction]) + params
    return b"\xff\xff" + body + bytes([checksum(body)])


class FeetechBus:
    """Blocking half-duplex bus over a pyserial port."""

    def __init__(self, serial_port, timeout_s: float = 0.02):
        self.ser = serial_port
        self.timeout_s = timeout_s

    def close(self) -> None:
        if self.ser and self.ser.is_open:
            self.ser.close()

    def _flush_input(self) -> None:
        try:
            self.ser.reset_input_buffer()
        except Exception:
            pass

    def _write(self, packet: bytes) -> None:
        self._flush_input()
        self.ser.write(packet)
        self.ser.flush()

    def _read_status(self, expected_id: int) -> Optional[bytes]:
        """Return param bytes after the error byte, or None on timeout/bad packet."""
        deadline = time.time() + self.timeout_s
        buf = bytearray()
        while time.time() < deadline:
            waiting = self.ser.in_waiting
            if waiting:
                buf.extend(self.ser.read(waiting))
                if len(buf) >= 6:
                    payload = _extract_status(bytes(buf), expected_id)
                    if payload is not None:
                        return payload
            else:
                time.sleep(0.0005)
        return None

    def ping(self, servo_id: int) -> bool:
        self._write(pack(servo_id, INST_PING))
        return self._read_status(servo_id) is not None

    def write(self, servo_id: int, address: int, data: bytes, wait_ack: bool = True) -> bool:
        self._write(pack(servo_id, INST_WRITE, bytes([address]) + data))
        if not wait_ack or servo_id == Config.BROADCAST_ID:
            return True
        return self._read_status(servo_id) is not None

    def write1(self, servo_id: int, address: int, value: int) -> bool:
        return self.write(servo_id, address, bytes([value & 0xFF]))

    def write2(self, servo_id: int, address: int, value: int) -> bool:
        value &= 0xFFFF
        return self.write(servo_id, address, bytes([value & 0xFF, (value >> 8) & 0xFF]))

    def read(self, servo_id: int, address: int, length: int) -> Optional[bytes]:
        self._write(pack(servo_id, INST_READ, bytes([address, length])))
        return self._read_status(servo_id)

    def read1(self, servo_id: int, address: int) -> Optional[int]:
        data = self.read(servo_id, address, 1)
        return data[0] if data and len(data) >= 1 else None

    def read2(self, servo_id: int, address: int) -> Optional[int]:
        data = self.read(servo_id, address, 2)
        if not data or len(data) < 2:
            return None
        return data[0] | (data[1] << 8)

    def sync_write(self, address: int, id_to_data: dict[int, bytes]) -> None:
        if not id_to_data:
            return
        data_len = len(next(iter(id_to_data.values())))
        payload = bytearray([address, data_len])
        for sid, data in id_to_data.items():
            if len(data) != data_len:
                raise ValueError("sync_write data lengths must match")
            payload.append(sid)
            payload.extend(data)
        self._write(pack(Config.BROADCAST_ID, INST_SYNC_WRITE, bytes(payload)))


def _extract_status(buf: bytes, expected_id: int) -> Optional[bytes]:
    for i in range(len(buf) - 5):
        if buf[i] != 0xFF or buf[i + 1] != 0xFF:
            continue
        if i + 4 >= len(buf):
            return None
        sid = buf[i + 2]
        length = buf[i + 3]
        end = i + 4 + length - 1
        if end >= len(buf):
            return None
        packet = buf[i + 2 : end]
        cs = buf[end]
        if checksum(packet) != cs:
            continue
        if sid != expected_id:
            continue
        # packet: ID LEN ERROR [params...]  (checksum excluded)
        params = buf[i + 5 : end]
        return bytes(params)
    return None

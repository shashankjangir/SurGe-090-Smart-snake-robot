"""Assign one connected ST3215 an ID through usb_servo_bridge."""
import argparse
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.feetech_protocol import FeetechBus
from src.robot_config import Config, St3215Addr, default_serial_port


def assign(old_id, new_id, port):
    if not all(type(sid) is int and 1 <= sid <= 253 for sid in (old_id, new_id)):
        raise ValueError("IDs must be 1..253")
    import serial
    bus = FeetechBus(serial.Serial(port, Config.BAUDRATE, timeout=.05, write_timeout=.2))
    try:
        time.sleep(.2)
        if not bus.ping(old_id):
            raise RuntimeError(f"No reply from ID {old_id}")
        if new_id != old_id and bus.ping(new_id):
            raise RuntimeError("New ID already responds; connect exactly one servo")
        if not bus.write1(old_id, St3215Addr.TORQUE_ENABLE, 0):
            raise RuntimeError("Torque-off not acknowledged")
        if not bus.write1(old_id, St3215Addr.LOCK, 0):
            raise RuntimeError("EEPROM unlock not acknowledged")
        try:
            # The ID-change acknowledgment may carry either the old or new ID.
            bus.write(old_id, St3215Addr.ID, bytes((new_id,)), wait_ack=False)
            time.sleep(.05)
        finally:
            # Lock both possible addresses even when the write fails.
            failures = []
            for sid in set((old_id, new_id)):
                try:
                    bus.write(sid, St3215Addr.LOCK, b"\x01", wait_ack=False)
                except OSError as exc:
                    failures.append(str(exc))
            if failures:
                raise RuntimeError("EEPROM relock failed: " + "; ".join(failures))
        time.sleep(.05)
        if not bus.ping(new_id) or bus.read1(new_id, St3215Addr.LOCK) != 1:
            raise RuntimeError("ID/EEPROM lock not verified; inspect before reconnecting the chain")
        print(f"Verified ID {new_id}; EEPROM locked")
    finally:
        bus.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--old", type=int, default=1)
    parser.add_argument("--new", type=int, required=True)
    parser.add_argument("--port", default=default_serial_port())
    args = parser.parse_args()
    assign(args.old, args.new, args.port)


if __name__ == "__main__":
    main()

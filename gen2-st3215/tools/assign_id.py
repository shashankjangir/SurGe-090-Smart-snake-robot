#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Assign a unique ST3215 ID. Connect exactly one servo (factory ID is 1).

  python tools/assign_id.py --new 3
  python tools/assign_id.py --old 1 --new 7

Requires firmware/usb_servo_bridge.ino on the Waveshare ESP32 driver.
"""

import argparse
import sys
import time

sys.path.insert(0, ".")

from src.feetech_protocol import FeetechBus
from src.robot_config import St3215Addr, default_serial_port

try:
    import serial
except ImportError:
    sys.exit("pip install pyserial")


def assign(old_id: int, new_id: int, port: str) -> None:
    ser = serial.Serial(port, 1_000_000, timeout=0.05)
    time.sleep(0.2)
    bus = FeetechBus(ser)
    if not bus.ping(old_id):
        print(f"No ping from ID {old_id} on {port}")
        bus.close()
        sys.exit(1)
    bus.write1(old_id, St3215Addr.LOCK, 0)
    time.sleep(0.05)
    bus.write1(old_id, St3215Addr.ID, new_id)
    time.sleep(0.05)
    bus.write1(new_id, St3215Addr.LOCK, 1)
    time.sleep(0.1)
    ok = bus.ping(new_id)
    bus.close()
    print("OK" if ok else "Wrote ID but ping of new ID failed — power-cycle and retry")
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--old", type=int, default=1)
    p.add_argument("--new", type=int, required=True)
    p.add_argument("--port", default=default_serial_port())
    args = p.parse_args()
    if not (1 <= args.new <= 253):
        sys.exit("new ID must be 1–253")
    assign(args.old, args.new, args.port)

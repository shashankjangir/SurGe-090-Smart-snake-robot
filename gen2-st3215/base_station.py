#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Raspberry Pi 5: read ESP-NOW telemetry forwarded by firmware/base_esp32
over USB serial (115200). Camera CSI stays on this Pi; it is not on the robot.
"""

import argparse
import sys
import time

from src.robot_config import Config

try:
    import serial
except ImportError:
    sys.exit("pip install pyserial")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default="/dev/ttyUSB0", help="ESP32 #2 USB CDC")
    parser.add_argument("--baud", type=int, default=Config.USB_TELEMETRY_BAUD)
    args = parser.parse_args()

    print(f"Base station listening on {args.port} @ {args.baud}")
    print("Flash firmware/base_esp32 on the USB ESP32. Ctrl+C to quit.")
    ser = serial.Serial(args.port, args.baud, timeout=1)
    time.sleep(0.3)
    try:
        while True:
            line = ser.readline().decode("utf-8", errors="replace").strip()
            if line:
                print(line)
    except KeyboardInterrupt:
        print("\nStopped")
    finally:
        ser.close()


if __name__ == "__main__":
    main()

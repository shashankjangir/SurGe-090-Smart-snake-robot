#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test script — ping all Dynamixel motors on the bus.
Verifies that USB → U2D2 → TTL communication is working and all
expected motors respond before running the main control loop.
"""

import sys

from dynamixel_sdk import PortHandler, PacketHandler, COMM_SUCCESS

# Import hardware constants from central config so this script stays in sync
# if the COM port, baud rate, or motor count ever changes.
sys.path.insert(0, '.')
from src.robot_config import Config

# Change this to your U2D2 COM port if auto-detection is not available.
if sys.platform.startswith('win'):
    DEVICENAME = 'COM3'
else:
    DEVICENAME = '/dev/ttyUSB0'


def ping_motors() -> None:
    port_handler   = PortHandler(DEVICENAME)
    packet_handler = PacketHandler(Config.PROTOCOL_VERSION)

    # Open port
    if not port_handler.openPort():
        print(f"[FATAL] Failed to open port '{DEVICENAME}'. "
              "Check USB connection and COM port setting.")
        return

    # Set baud rate
    if not port_handler.setBaudRate(Config.BAUDRATE):
        port_handler.closePort()
        print(f"[FATAL] Failed to set baud rate to {Config.BAUDRATE}.")
        return

    print(f"\n--- Pinging Motors 1–{Config.NUM_JOINTS} ---")
    found_motors   = []
    missing_motors = []

    for dxl_id in range(1, Config.NUM_JOINTS + 1):
        model_number, result, _ = packet_handler.ping(port_handler, dxl_id)
        if result == COMM_SUCCESS:
            print(f"[FOUND  ] Motor ID {dxl_id:02d} — Model: {model_number}")
            found_motors.append(dxl_id)
        else:
            print(f"[MISSING] Motor ID {dxl_id:02d} did not respond. "
                  "Check power, cable, and ID assignment.")
            missing_motors.append(dxl_id)

    port_handler.closePort()

    print(f"\nResult: {len(found_motors)}/{Config.NUM_JOINTS} motors found.")
    if missing_motors:
        print(f"Missing motor IDs: {missing_motors}")
        print("Tip: Use Dynamixel Wizard 2.0 to scan and reassign motor IDs.")
    else:
        print("All motors present — ready to run main.py.")


if __name__ == '__main__':
    ping_motors()

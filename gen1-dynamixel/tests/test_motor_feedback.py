#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test script — read live Dynamixel motor feedback (position, velocity, current).

Used to:
  1. Confirm sensor readings are working on a single motor.
  2. Baseline the free-run current so the obstacle detection threshold in
     ObstacleAvoidance can be calibrated (typical XL330 free-run ≈ 70 mA;
     default threshold is 350 mA).

Run:
    python tests/test_motor_feedback.py
"""

import sys
import time

from dynamixel_sdk import PortHandler, PacketHandler, COMM_SUCCESS

sys.path.insert(0, '.')
from src.robot_config import Config, DynamixelAddr
from src.utils import to_signed_current

# --- Motor to test ---
DXL_ID = 1   # Change to match whichever motor you have connected

# --- Serial port ---
if sys.platform.startswith('win'):
    DEVICENAME = 'COM3'
else:
    DEVICENAME = '/dev/ttyUSB0'


def test_feedback() -> None:
    port_handler   = PortHandler(DEVICENAME)
    packet_handler = PacketHandler(Config.PROTOCOL_VERSION)

    # Open port
    if not port_handler.openPort():
        print(f"[FATAL] Failed to open port '{DEVICENAME}'.")
        return

    # Set baud rate
    if not port_handler.setBaudRate(Config.BAUDRATE):
        port_handler.closePort()
        print(f"[FATAL] Failed to set baud rate to {Config.BAUDRATE}.")
        return

    # Enable torque so the motor holds position
    result, error = packet_handler.write1ByteTxRx(
        port_handler, DXL_ID, DynamixelAddr.TORQUE_ENABLE, 1
    )
    if result != COMM_SUCCESS:
        print(f"[ERROR] Could not enable torque: {packet_handler.getTxRxResult(result)}")
        port_handler.closePort()
        return
    print(f"Torque enabled on Motor {DXL_ID}")

    # Move motor to centre position
    packet_handler.write4ByteTxRx(
        port_handler, DXL_ID, DynamixelAddr.GOAL_POSITION, Config.ENCODER_CENTER
    )

    print("\n--- Reading Feedback (Press Ctrl+C to stop) ---")
    print("Gently resist the motor horn with your fingers to observe current spikes.")
    print(f"{'Position':>10}  {'Velocity':>10}  {'Current (mA)':>14}")
    print("-" * 42)

    try:
        while True:
            pos, _, _  = packet_handler.read4ByteTxRx(
                port_handler, DXL_ID, DynamixelAddr.PRESENT_POSITION
            )
            vel, _, _  = packet_handler.read4ByteTxRx(
                port_handler, DXL_ID, DynamixelAddr.PRESENT_VELOCITY
            )
            raw_cur, result, _ = packet_handler.read2ByteTxRx(
                port_handler, DXL_ID, DynamixelAddr.PRESENT_CURRENT
            )

            if result != COMM_SUCCESS:
                print(f"[WARN] Read error: {packet_handler.getTxRxResult(result)}")
                time.sleep(0.1)
                continue

            current_ma = to_signed_current(raw_cur)
            print(f"{pos:>10}  {vel:>10}  {current_ma:>+14} mA", flush=True)
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\nStopping test...")
    finally:
        # Always disable torque and close port cleanly
        packet_handler.write1ByteTxRx(
            port_handler, DXL_ID, DynamixelAddr.TORQUE_ENABLE, 0
        )
        port_handler.closePort()
        print("Test concluded safely.")


if __name__ == '__main__':
    test_feedback()

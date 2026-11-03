#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Main control loop for SURGE-SNAKE.
Integrates locomotion kinematics, Dynamixel SDK hardware calls, and obstacle avoidance.
"""

import sys
import time

from dynamixel_sdk import PortHandler, PacketHandler, COMM_SUCCESS

from src.robot_config import Config, DynamixelAddr
from src.snake_locomotion import SnakeKinematics
from src.obstacle_avoidance import ObstacleAvoidance
from src.utils import to_signed_current

# --- Hardware Configuration ---
# Automatically select the correct serial port for each OS.
if sys.platform.startswith('win'):
    DEVICENAME = 'COM3'
else:
    DEVICENAME = '/dev/ttyUSB0'   # Default port on Raspberry Pi


# ---------------------------------------------------------------------------
# Motor initialisation / shutdown helpers
# ---------------------------------------------------------------------------

def init_motors(packet_handler, port_handler, num_motors: int) -> None:
    """Enable torque on every motor in the daisy chain."""
    for dxl_id in range(1, num_motors + 1):
        result, error = packet_handler.write1ByteTxRx(
            port_handler, dxl_id, DynamixelAddr.TORQUE_ENABLE, 1
        )
        if result != COMM_SUCCESS:
            print(
                f"[ERROR] Failed to enable torque for Motor {dxl_id}: "
                f"{packet_handler.getTxRxResult(result)}"
            )
        elif error != 0:
            print(f"[WARN ] Motor {dxl_id} torque enable returned hardware error: "
                  f"{packet_handler.getRxPacketError(error)}")
        else:
            print(f"[OK   ] Torque enabled for Motor {dxl_id}")


def disable_motors(packet_handler, port_handler, num_motors: int) -> None:
    """Disable torque on every motor so the snake can be moved freely."""
    for dxl_id in range(1, num_motors + 1):
        packet_handler.write1ByteTxRx(
            port_handler, dxl_id, DynamixelAddr.TORQUE_ENABLE, 0
        )


# ---------------------------------------------------------------------------
# Main control loop
# ---------------------------------------------------------------------------

def main() -> None:
    print("--- SURGE-SNAKE Initializing ---")

    num_motors = Config.NUM_JOINTS   # 10

    # --- Open serial port ---
    port_handler   = PortHandler(DEVICENAME)
    packet_handler = PacketHandler(Config.PROTOCOL_VERSION)

    if not port_handler.openPort():
        print(f"[FATAL] Failed to open port '{DEVICENAME}'. "
              "Check USB connection and COM port setting.")
        return

    if not port_handler.setBaudRate(Config.BAUDRATE):
        port_handler.closePort()   # Clean up the already-opened port
        print(f"[FATAL] Failed to set baud rate to {Config.BAUDRATE}.")
        return

    # --- Initialise motors ---
    init_motors(packet_handler, port_handler, num_motors)

    # --- Initialise logic modules ---
    kinematics = SnakeKinematics(num_motors=num_motors)
    avoidance  = ObstacleAvoidance()   # thresholds/timings come from Config defaults

    start_time = time.time()
    print("\nStarting Main Control Loop. Press Ctrl+C to stop.")

    try:
        while True:
            current_time = time.time() - start_time

            # 1. Read Feedback (Sensors) ----------------------------------------
            motor_currents: dict[int, int] = {}
            for dxl_id in range(1, num_motors + 1):
                raw_current, result, _ = packet_handler.read2ByteTxRx(
                    port_handler, dxl_id, DynamixelAddr.PRESENT_CURRENT
                )
                if result == COMM_SUCCESS:
                    motor_currents[dxl_id] = to_signed_current(raw_current)
                else:
                    # Log read failure but keep going; missing one reading is recoverable
                    print(f"[WARN ] Current read failed for Motor {dxl_id}: "
                          f"{packet_handler.getTxRxResult(result)}")
                    motor_currents[dxl_id] = 0

            # 2. State Machine Evaluation (Obstacle Detection & Evasion) --------
            current_state = avoidance.process_state(current_time, motor_currents)

            # 3. Kinematics — calculate target encoder positions -----------------
            target_positions = kinematics.calculate_positions(
                current_time,
                mode=current_state,
                turn_direction=avoidance.turn_direction,
            )

            # 4. Actuation — send goal positions to each motor ------------------
            for dxl_id, pos in target_positions.items():
                result, error = packet_handler.write4ByteTxRx(
                    port_handler, dxl_id, DynamixelAddr.GOAL_POSITION, pos
                )
                if result != COMM_SUCCESS:
                    print(f"[ERROR] Position write failed for Motor {dxl_id}: "
                          f"{packet_handler.getTxRxResult(result)}")
                elif error != 0:
                    print(f"[WARN ] Motor {dxl_id} hardware error on write: "
                          f"{packet_handler.getRxPacketError(error)}")

            # Small delay to avoid saturating the serial bus (~50 Hz loop)
            time.sleep(Config.DT)

    except KeyboardInterrupt:
        print("\nHalting Snake...")
    finally:
        disable_motors(packet_handler, port_handler, num_motors)
        port_handler.closePort()
        print("Shutdown complete.")


if __name__ == '__main__':
    main()
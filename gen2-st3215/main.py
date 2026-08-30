#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Bench control loop for SURGE-090 gen2 (ST3215).

Requires the Waveshare Servo Driver ESP32 to be flashed with
firmware/usb_servo_bridge so USB CDC is a 1 Mbps Feetech pipe to the bus.

Field robot: flash firmware/robot_esp32 instead; this script is not the
servo master. Use base_station.py on the Pi to read ESP-NOW telemetry.

Power: 3S LiPo (6.0–12.6 V) into driver VIN. Never 5 V from the Mean Well.
"""

import os
import time

from src.robot_config import Config, default_serial_port
from src.servo_driver import ServoDriver
from src.snake_locomotion import SnakeKinematics
from src.obstacle_avoidance import ObstacleAvoidance


def main() -> None:
    mock = os.environ.get("SURGE_MOCK", "").lower() in ("1", "true", "yes")
    port = default_serial_port()
    print("--- SURGE-090 gen2 ST3215 ---")
    print(f"Port {port}  baud {Config.BAUDRATE}  joints {Config.NUM_JOINTS}  mock={mock}")

    driver = ServoDriver(num_servos=Config.NUM_JOINTS, port=port, mock=mock)
    if not driver.connect():
        return

    kinematics = SnakeKinematics(num_motors=Config.NUM_JOINTS)
    avoidance = ObstacleAvoidance()
    driver.enable_torque(True)

    start_time = time.time()
    print("Gait running. Ctrl+C stops and disables torque.")
    try:
        while True:
            t = time.time() - start_time
            currents = driver.read_all_currents()
            state = avoidance.process_state(t, currents)
            goals = kinematics.calculate_positions(
                t, mode=state, turn_direction=avoidance.turn_direction
            )
            driver.write_goal_positions(goals)
            time.sleep(Config.DT)
    except KeyboardInterrupt:
        print("\nHalting.")
    finally:
        driver.enable_torque(False)
        driver.close()
        print("Shutdown complete.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Single ST3215 sweep on the Waveshare bus (replaces the old SG90 GPIO test).

Flash firmware/usb_servo_bridge first. Connect ONE servo (unique ID) at a time
until IDs 1–10 are assigned. VIN must be 6–12.6 V from the 3S pack, not 5 V.
"""

import time

from src.robot_config import Config, default_serial_port
from src.servo_driver import ServoDriver

SERVO_ID = 1


def main() -> None:
    driver = ServoDriver(num_servos=Config.NUM_JOINTS, port=default_serial_port())
    driver.connect()
    if not driver.ping(SERVO_ID):
        print(f"No reply from ID {SERVO_ID}. Check VIN, cable, and ID.")
        driver.close()
        return

    driver.enable_torque(True, servo_id=SERVO_ID)
    print(f"Sweeping ST3215 ID {SERVO_ID}. Ctrl+C to stop.")
    try:
        while True:
            for ticks in (Config.ENCODER_CENTER - 400, Config.ENCODER_CENTER, Config.ENCODER_CENTER + 400):
                print(f"Goal {ticks}")
                driver.write_goal_positions({SERVO_ID: ticks})
                time.sleep(1.0)
    except KeyboardInterrupt:
        print("\nStop")
    finally:
        driver.write_goal_positions({SERVO_ID: Config.ENCODER_CENTER})
        time.sleep(0.5)
        driver.enable_torque(False, servo_id=SERVO_ID)
        driver.close()


if __name__ == "__main__":
    main()

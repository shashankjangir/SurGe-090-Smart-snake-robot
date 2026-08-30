#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Live ST3215 position / voltage / current. Calibrate obstacle threshold here."""

import sys
import time

sys.path.insert(0, ".")

from src.robot_config import Config, St3215Addr, default_serial_port
from src.servo_driver import ServoDriver
from src.utils import to_signed_current

DXL_ID = 1  # servo ID to watch


def test_feedback() -> None:
    driver = ServoDriver(num_servos=DXL_ID, port=default_serial_port())
    driver.connect()
    if not driver.ping(DXL_ID):
        print(f"[FATAL] ID {DXL_ID} did not ping.")
        driver.close()
        return

    driver._bus.write1(DXL_ID, St3215Addr.TORQUE_ENABLE, 1)
    driver._bus.write2(DXL_ID, St3215Addr.GOAL_POSITION, Config.ENCODER_CENTER)

    print("Resist the horn to see current. Ctrl+C stops.")
    print(f"{'Position':>10}  {'Vin (V)':>10}  {'Current (mA)':>14}  {'Temp C':>8}")
    try:
        while True:
            pos = driver._bus.read2(DXL_ID, St3215Addr.PRESENT_POSITION)
            raw_i = driver._bus.read2(DXL_ID, St3215Addr.PRESENT_CURRENT)
            vin = driver._bus.read1(DXL_ID, St3215Addr.PRESENT_VOLTAGE)
            temp = driver._bus.read1(DXL_ID, St3215Addr.PRESENT_TEMPERATURE)
            if pos is None or raw_i is None:
                print("[WARN] read failed")
                time.sleep(0.1)
                continue
            ma = to_signed_current(raw_i)
            volts = (vin * 0.1) if vin is not None else 0.0
            t_c = temp if temp is not None else 0
            print(f"{pos:>10}  {volts:>10.1f}  {ma:>+14} mA  {t_c:>8}")
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nStopping")
    finally:
        driver._bus.write1(DXL_ID, St3215Addr.TORQUE_ENABLE, 0)
        driver.close()


if __name__ == "__main__":
    test_feedback()

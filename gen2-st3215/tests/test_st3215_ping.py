#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Ping ST3215 IDs 1–NUM_JOINTS on the Feetech bus (1 Mbps)."""

import sys

sys.path.insert(0, ".")

from src.robot_config import Config, default_serial_port
from src.servo_driver import ServoDriver


def ping_motors() -> None:
    driver = ServoDriver(num_servos=Config.NUM_JOINTS, port=default_serial_port())
    driver.connect()
    found, missing = [], []
    print(f"\n--- Pinging ST3215 1–{Config.NUM_JOINTS} on {driver.port} ---")
    for sid in range(1, Config.NUM_JOINTS + 1):
        if driver.ping(sid):
            print(f"[FOUND  ] ID {sid:02d}")
            found.append(sid)
        else:
            print(f"[MISSING] ID {sid:02d}")
            missing.append(sid)
    driver.close()
    print(f"\n{len(found)}/{Config.NUM_JOINTS} present. Missing: {missing or 'none'}")
    if missing:
        print("Assign unique IDs one servo at a time (firmware/assign_ids).")


if __name__ == "__main__":
    ping_motors()

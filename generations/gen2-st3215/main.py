"""Gen 2.0 bench gait through usb_servo_bridge; Ctrl+C disables torque."""
import argparse
import math
import os
import time
from src.robot_config import Config, default_serial_port
from src.servo_driver import ServoDriver
from src.snake_locomotion import SnakeKinematics
from src.obstacle_avoidance import ObstacleAvoidance


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", default=default_serial_port())
    parser.add_argument("--mock", action="store_true", default=os.getenv("SURGE_MOCK", "").lower() in ("1", "true", "yes"))
    parser.add_argument("--duration", type=float, default=0, help="Seconds; 0 runs until Ctrl+C")
    args = parser.parse_args()
    if not math.isfinite(args.duration) or args.duration < 0:
        parser.error("duration must be finite and nonnegative")
    driver = ServoDriver(port=args.port, mock=args.mock)
    gait, avoidance = SnakeKinematics(), ObstacleAvoidance()
    try:
        driver.connect()
        driver.enable_torque()
        started = time.monotonic()
        while args.duration == 0 or time.monotonic() - started < args.duration:
            tick = time.monotonic()
            elapsed = tick - started
            mode = avoidance.process_state(elapsed, driver.read_all_currents())
            driver.write_goal_positions(gait.calculate_positions(elapsed, mode, avoidance.turn_direction))
            time.sleep(max(0, Config.DT - (time.monotonic() - tick)))
    except KeyboardInterrupt:
        pass
    finally:
        driver.close()


if __name__ == "__main__":
    main()

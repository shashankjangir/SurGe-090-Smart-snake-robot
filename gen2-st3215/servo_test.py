"""Sweep one ST3215 through the Gen 2.0 USB bridge; Ctrl+C stops immediately."""
import time
from src.robot_config import Config
from src.servo_driver import ServoDriver

SERVO_ID = 1


def main():
    driver = ServoDriver()
    try:
        driver.connect()
        if not driver.ping(SERVO_ID):
            raise RuntimeError(f"No reply from ID {SERVO_ID}")
        driver.enable_torque(True, SERVO_ID)
        while True:
            for offset in (-400, 0, 400):
                driver.write_goal_positions({SERVO_ID: Config.ENCODER_CENTER + offset})
                time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        driver.close()


if __name__ == "__main__":
    main()

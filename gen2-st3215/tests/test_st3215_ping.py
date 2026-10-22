"""Explicit live ping tool; importing or test discovery never opens hardware."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.robot_config import Config
from src.servo_driver import ServoDriver


def ping_motors():
    driver = ServoDriver()
    try:
        driver.connect()
        missing = []
        for sid in range(1, Config.NUM_JOINTS + 1):
            found = driver.ping(sid)
            print(f"ID {sid}: {'found' if found else 'missing'}")
            if not found:
                missing.append(sid)
        return missing
    finally:
        driver.close()


if __name__ == "__main__":
    raise SystemExit(bool(ping_motors()))

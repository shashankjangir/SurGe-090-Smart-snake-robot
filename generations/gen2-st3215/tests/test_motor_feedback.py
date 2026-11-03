"""Live feedback and center hold for servo 1; run explicitly with hardware."""
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.servo_driver import ServoDriver
from src.robot_config import Config

__test__ = False


def test_feedback():
    driver = ServoDriver(num_servos=1)
    try:
        driver.connect()
        driver.enable_torque()
        driver.write_goal_positions({1: Config.ENCODER_CENTER})
        while True:
            state = driver.read_all_states()[0]
            if not state.valid:
                raise RuntimeError("Servo feedback lost")
            print(f"{state.encoder} ticks  {state.voltage_v:.1f} V  {state.current_ma:+d} mA  {state.temperature_c} C")
            time.sleep(.1)
    except KeyboardInterrupt:
        pass
    finally:
        driver.close()


if __name__ == "__main__":
    test_feedback()

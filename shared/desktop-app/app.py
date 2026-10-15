"""Gen 2.1 desktop/headless launcher. Defaults to a finite headless simulation."""
import argparse
import os
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from surge_control.gait import SnakeKinematics
from surge_control.hardware import ST3215Interface
from surge_control.simulation import SimulationInterface


def run_headless(use_sim=True, port=None, duration=10):
    iface = SimulationInterface() if use_sim else ST3215Interface(port=port)
    ok, message = iface.connect(headless=True) if use_sim else iface.connect()
    if not ok:
        raise RuntimeError(message)
    print(message)
    gait = SnakeKinematics()
    started = time.monotonic()
    try:
        iface.start()
        while duration <= 0 or time.monotonic() - started < duration:
            positions, angles = gait.calculate_positions(time.monotonic() - started)
            if use_sim:
                iface.update_physics(20, 0, 1.5, [0, 0, 0])
                iface.write_positions(angles)
            else:
                iface.write_positions(positions)
            time.sleep(.02)
    except KeyboardInterrupt:
        pass
    finally:
        iface.disconnect()
    print("Stopped and disconnected")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gui", action="store_true")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--sim", action="store_true", help="Headless simulation (default)")
    group.add_argument("--hardware", action="store_true", help="Run physical planar gait")
    parser.add_argument("--port", help="Explicit hardware serial port; alternatively SURGE_PORT")
    parser.add_argument("--duration", type=float, default=10, help="Seconds; 0 runs until Ctrl+C")
    args = parser.parse_args()
    if args.port:
        os.environ["SURGE_PORT"] = args.port
    if args.gui:
        from dashboard import SnakeDashboard
        SnakeDashboard().mainloop()
    else:
        run_headless(not args.hardware, args.port, args.duration)

if __name__ == "__main__":
    main()

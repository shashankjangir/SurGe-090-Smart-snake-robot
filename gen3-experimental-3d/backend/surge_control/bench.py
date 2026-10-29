"""Finite Gen 2.1 bench tools with measured alignment and torque-off cleanup."""
import argparse
import math
import time
from .hardware import ST3215Interface


def align(iface, timeout=10):
    deadline = time.monotonic() + timeout
    consecutive = 0
    while time.monotonic() < deadline:
        iface.write_positions({i: 2048 for i in range(1, iface.num_motors + 1)}, speed=400)
        feedback = iface.read_telemetry()
        centered = all(feedback.get(i, {}).get("valid", False) and
                       abs(feedback[i]["position"] - 2048) <= 30 for i in range(1, iface.num_motors + 1))
        consecutive = consecutive + 1 if centered else 0
        if consecutive >= 2:
            return
        time.sleep(.05)
    raise TimeoutError("Alignment not confirmed by all servo encoders")


def main(mode):
    parser = argparse.ArgumentParser(description=f"Gen 2.1 {mode} bench tool; physically moves motors")
    parser.add_argument("--port", help="Receiver/transmitter port (or SURGE_PORT)")
    parser.add_argument("--duration", type=float, default=10)
    args = parser.parse_args()
    iface = ST3215Interface(port=args.port)
    ok, message = iface.connect()
    if not ok:
        raise RuntimeError(message)
    try:
        iface.start()
        align(iface)
        print("Alignment confirmed from encoders")
        started = time.monotonic()
        while mode != "align" and time.monotonic() - started < args.duration:
            t = time.monotonic() - started
            if mode == "sine":
                positions = {i: 2048 + round(400 * math.sin(2*math.pi*.4*t - i*.6)) for i in range(1, 11)}
            else:
                positions = {i: 2048 + round((4096/8)*((11-i)/10)*min(1,t/15)) for i in range(1, 11)}
            iface.write_positions(positions, speed=1500 if mode == "sine" else 300)
            time.sleep(.05)
    except KeyboardInterrupt:
        pass
    finally:
        iface.disconnect()

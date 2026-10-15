"""Gen 3.0 experimental alternating yaw/pitch gait; dry-run by default.
Original waveform: yaw 900 counts, pitch 700, 0.6 Hz, pi/2 phase lag.
Active transport clamps to ±70 degrees. No 3D mechanical validation is implied.
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared"))
from surge_control.hardware import ST3215Interface
from surge_control.bench import align


def positions_at(t):
    positions = {}
    for i in range(1, 11):
        segment = (i - 1) // 2
        direction = 1 if segment % 2 == 0 else -1
        pitch = i % 2 == 0
        amplitude = 700 if pitch else 900
        phase = 2*math.pi*.6*t - segment*math.pi/2 - (math.pi/2 if pitch else 0)
        positions[i] = max(1252, min(2844, 2048 + round(amplitude*math.sin(phase)*direction)))
    return positions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hardware", action="store_true", help="Physically run on an assembled alternating yaw/pitch chain")
    parser.add_argument("--port")
    parser.add_argument("--duration", type=float, default=10)
    args = parser.parse_args()
    if not args.hardware:
        print(json.dumps({"experimental": True, "targets_at_0": positions_at(0)}, indent=2))
        return
    iface = ST3215Interface(port=args.port)
    ok, message = iface.connect()
    if not ok:
        raise RuntimeError(message)
    try:
        iface.start()
        align(iface)
        started = time.monotonic()
        while time.monotonic() - started < args.duration:
            iface.write_positions(positions_at(time.monotonic() - started), speed=1500)
            time.sleep(.05)
    except KeyboardInterrupt:
        pass
    finally:
        iface.disconnect()

if __name__ == "__main__":
    main()

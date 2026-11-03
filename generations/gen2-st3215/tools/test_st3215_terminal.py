"""Gen 2.1 terminal. Each movement lasts two seconds, then releases torque."""
import argparse
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.st3215_interface import ST3215Interface


def move(iface, targets, duration=2):
    try:
        iface.start()
        deadline = time.monotonic() + duration
        while time.monotonic() < deadline:
            iface.write_positions(targets)
            iface.read_telemetry()
            time.sleep(.05)
    finally:
        iface.stop()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port")
    args = parser.parse_args()
    iface = ST3215Interface(num_motors=2, port=args.port)
    ok, message = iface.connect()
    if not ok:
        raise RuntimeError(message)
    print("p <id> <1252..2844> | c: center | t: feedback | i <new-id>: ONE servo only | q: quit")
    try:
        while True:
            parts = input("> ").lower().split()
            if not parts:
                continue
            if parts[0] in ("q", "quit", "exit"):
                break
            try:
                if parts == ["c"]:
                    move(iface, {1: 2048, 2: 2048})
                elif parts == ["t"]:
                    print(iface.read_telemetry())
                elif len(parts) == 3 and parts[0] == "p":
                    sid, position = map(int, parts[1:])
                    if not 1 <= sid <= 2 or not 1252 <= position <= 2844:
                        raise ValueError("ID must be 1..2; position 1252..2844")
                    move(iface, {sid: position})
                elif len(parts) == 2 and parts[0] == "i":
                    sid = int(parts[1])
                    if not 1 <= sid <= 253:
                        raise ValueError("ID must be 1..253")
                    iface.stop()
                    iface._send(f"I,{sid}")
                    if iface._wait("ID_SET_OK", 1) is None:
                        raise RuntimeError("ID assignment not confirmed")
                else:
                    raise ValueError("Unknown command or wrong argument count")
            except ValueError as exc:
                print(exc)
    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        iface.disconnect()


if __name__ == "__main__":
    main()

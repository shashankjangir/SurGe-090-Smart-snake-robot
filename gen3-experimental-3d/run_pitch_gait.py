"""Finite pitch-only wave. Preview by default; retains Gen 3 calibration checks."""
import argparse
from pathlib import Path
import sys

import test_3d_snake as runner


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    execution = parser.add_mutually_exclusive_group()
    execution.add_argument('--hardware', action='store_true')
    execution.add_argument('--simulate', action='store_true')
    parser.add_argument('--port', default='COM6')
    parser.add_argument('--pitch', type=float, default=5, help='Pitch amplitude in degrees')
    parser.add_argument('--frequency', type=float, default=.1, help='Wave frequency in Hz')
    parser.add_argument('--duration', type=float, default=10, help='Finite gait duration in seconds')
    parser.add_argument('--map', type=Path, default=runner.MAP_PATH)
    args = parser.parse_args(argv)
    command = ['--yaw', '0', '--bias', '0', '--pitch', str(args.pitch),
               '--frequency', str(args.frequency), '--duration', str(args.duration), '--map', str(args.map)]
    if args.hardware:
        command += ['--hardware', '--port', args.port]
    elif args.simulate:
        command += ['--simulate', '--headless', '--sim-torque', '2']
    runner.main(command)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('Interrupted; STOP requested.', file=sys.stderr)
        sys.exit(130)
    except (RuntimeError, ValueError, OSError, TimeoutError) as exc:
        print(f'Stopped: {exc}', file=sys.stderr)
        sys.exit(1)

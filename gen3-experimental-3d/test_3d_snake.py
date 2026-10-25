"""Gen 3 commissioning and finite gait runs. Dry-run unless --hardware is set."""
import argparse
import csv
import json
import math
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'shared'))
from gait import MAP_PATH, load_map, number, slew, targets_at, validate_gait
from surge_control.hardware import ST3215Interface

PERIOD = .05
MAX_GAP = .3


def positions_at(t):
    """Compatibility preview using the example map; never arms hardware."""
    return targets_at(t, load_map(), math.radians(5), math.radians(5), 0, .1,
                      math.pi / 2, math.pi / 2, 10, 2)


def feedback(iface, bounds, clock=time.monotonic):
    started = clock()
    state = iface.read_telemetry()
    if clock() - started > MAX_GAP:
        raise RuntimeError('Telemetry deadline exceeded')
    for sid, (low, high) in bounds.items():
        row = state.get(sid, {})
        position = row.get('position')
        if not row.get('valid') or type(position) is not int or not low <= position <= high:
            raise RuntimeError(f'Joint {sid}: missing feedback or position outside permitted range')
    return state


def track(state, target, since, now, error, timeout):
    for sid, value in target.items():
        if abs(state[sid]['position'] - value) > error:
            since.setdefault(sid, now)
            if now - since[sid] >= timeout:
                raise RuntimeError(f'Joint {sid}: sustained tracking error')
        else:
            since.pop(sid, None)


def record(writer, stage, elapsed, target, state, dt):
    for sid, value in target.items():
        row = state[sid]
        writer.writerow([stage, round(elapsed, 4), round(dt, 4), sid, round(value),
                         row['position'], row.get('velocity'), row.get('load')])


def run_motion(iface, config, target_at, duration, writer, *, jog_id=None,
               jog_ticks=0, clock=time.monotonic, sleep=time.sleep, stop_event=None):
    """The caller owns disconnect, including failure before RUN acknowledgement."""
    if jog_id is None:
        bounds = {j['id']: (j['min'], j['max']) for j in config['joints']}
    else:
        bounds = {jog_id: (1252, 2844)}
    state = feedback(iface, bounds, clock)
    current = {sid: float(state[sid]['position']) for sid in bounds}
    if jog_id is not None:
        origin = current[jog_id]
        if not 1252 <= origin + jog_ticks <= 2844:
            raise ValueError('Jog would exceed receiver limits')
        # Return to the measured start; only this servo is enabled.
        target_at = lambda t: {jog_id: origin + jog_ticks * (1 - math.cos(2 * math.pi * min(t, duration) / duration)) / 2}
        neutral = current.copy()
    else:
        neutral = {j['id']: j['zero'] for j in config['joints']}
    if stop_event is not None and stop_event.is_set():
        raise InterruptedError('Stop requested')
    iface.start()
    iface.write_positions({sid: round(v) for sid, v in current.items()}, speed=config['speed'])
    last = clock()
    started = last
    next_tick = last + PERIOD
    since = {}
    aligned = 0
    stage = 'align'
    motion_start = None
    finished = None
    while True:
        sleep(max(0, next_tick - clock()))
        if stop_event is not None and stop_event.is_set():
            raise InterruptedError('Stop requested')
        now = clock()
        dt = now - last
        if dt > MAX_GAP:
            raise RuntimeError('Control deadline exceeded; stopping')
        last = now
        next_tick = now + PERIOD
        elapsed = 0 if motion_start is None else now - motion_start
        desired = neutral if stage != 'motion' else target_at(min(elapsed, duration))
        current = slew(current, desired, config['speed'], dt)
        command = {sid: round(v) for sid, v in current.items()}
        iface.write_positions(command, speed=config['speed'])
        state = feedback(iface, bounds, clock)
        track(state, command, since, clock(), config['tracking_error'], config['tracking_timeout'])
        record(writer, stage, now - started, command, state, dt)
        at_neutral = all(abs(state[sid]['position'] - v) <= 15 for sid, v in neutral.items())
        if stage == 'align':
            aligned = aligned + 1 if at_neutral else 0
            if aligned >= 2:
                stage = 'motion'
                motion_start = clock()
            elif now - started > 15:
                raise TimeoutError('Calibrated neutral was not reached')
        elif stage == 'motion' and elapsed >= duration:
            stage = 'settle'
            finished = now
            aligned = 0
        elif stage == 'settle':
            aligned = aligned + 1 if at_neutral else 0
            if aligned >= 2:
                return
            if now - finished > 5:
                raise TimeoutError('Return to neutral was not confirmed')


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    execution = p.add_mutually_exclusive_group()
    execution.add_argument('--hardware', action='store_true')
    execution.add_argument('--simulate', action='store_true', help='Illustrative PyBullet model; never opens serial')
    p.add_argument('--headless', action='store_true', help='Hide the simulation window')
    p.add_argument('--link-length', type=float, default=.1, help='Simulation placeholder length in metres')
    p.add_argument('--link-mass', type=float, default=.25, help='Simulation placeholder mass in kg')
    p.add_argument('--sim-torque', type=float, default=.3, help='Simulation torque cap in Nm; not a motor rating')
    p.add_argument('--port')
    p.add_argument('--map', type=Path, default=MAP_PATH)
    p.add_argument('--mode', choices=('gait', 'read', 'jog'), default='gait')
    p.add_argument('--duration', type=float, default=10)
    p.add_argument('--ramp', type=float, default=2, help='Seconds at each end of the gait')
    p.add_argument('--yaw', type=float, default=5, help='Amplitude in degrees')
    p.add_argument('--pitch', type=float, default=5, help='Amplitude in degrees; 0 for yaw-only')
    p.add_argument('--bias', type=float, default=0, help='Yaw bias in degrees for turning trials')
    p.add_argument('--frequency', type=float, default=.1, help='Hz; negative reverses the wave')
    p.add_argument('--lag', type=float, default=90, help='Phase degrees between same-axis joints')
    p.add_argument('--offset', type=float, default=90, help='Pitch/yaw phase offset in degrees')
    p.add_argument('--id', type=int, help='Single servo ID for commissioning jog')
    p.add_argument('--ticks', type=int, help='Signed raw jog, -57..57 (approximately +/-5 degrees)')
    p.add_argument('--log', type=Path, help='New CSV path; existing files are never overwritten')
    return p


def main(argv=None):
    p = parser()
    args = p.parse_args(argv)
    try:
        number(args.duration, 'duration', 2, 300)
        if args.simulate:
            number(args.link_length, 'link length', .02, 1)
            number(args.link_mass, 'link mass', .01, 10)
            number(args.sim_torque, 'simulation torque', .01, 2.94)
            if args.mode != 'gait':
                raise ValueError('Simulation supports gait mode only')
        if args.mode == 'jog':
            if args.id not in range(1, 11) or args.ticks is None or not 1 <= abs(args.ticks) <= 57:
                raise ValueError('Jog requires --id 1..10 and --ticks -57..57, excluding zero')
            config = {'speed': 100, 'tracking_error': 25, 'tracking_timeout': .5}
            target_at = None
        elif args.mode == 'gait':
            config = load_map(args.map, require_calibrated=args.hardware)
            values = (math.radians(args.yaw), math.radians(args.pitch), math.radians(args.bias),
                      args.frequency, math.radians(args.lag), math.radians(args.offset), args.duration, args.ramp)
            validate_gait(config, *values)
            target_at = lambda t: targets_at(t, config, *values)
        else:
            config = None
            target_at = None
    except (ValueError, OSError, KeyError, TypeError) as exc:
        p.error(str(exc))

    if not args.hardware and args.mode != 'gait':
        print(json.dumps({'dry_run': True, 'mode': args.mode, 'id': args.id, 'ticks': args.ticks,
                          'note': 'No serial port opened. Add --hardware --port PORT to execute.'}, indent=2))
        return
    log = args.log or Path(__file__).with_name('runs') / (time.strftime('%Y%m%d-%H%M%S') + f'-{time.time_ns() % 1000000000:09d}.csv')
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open('x', newline='', encoding='utf-8') as stream:
        writer = csv.writer(stream)
        writer.writerow(['stage', 'elapsed_s', 'interval_s', 'id', 'target_counts', 'position_counts', 'velocity_raw', 'load_raw'])
        metadata = {'mode': args.mode, 'execution': 'hardware' if args.hardware else 'simulation' if args.simulate else 'preview',
                    'arguments': {key: str(value) if isinstance(value, Path) else value for key, value in vars(args).items()},
                    'joint_map': config}
        with log.with_suffix('.json').open('x', encoding='utf-8') as manifest:
            json.dump(metadata, manifest, indent=2)
        if not args.hardware and not args.simulate:
            for n in range(math.ceil(args.duration / PERIOD) + 1):
                t = min(n * PERIOD, args.duration)
                for sid, value in target_at(t).items():
                    writer.writerow(['preview', round(t, 4), PERIOD, sid, value, '', '', ''])
            print(json.dumps({'dry_run': True, 'calibrated': config['calibrated'], 'log': str(log.resolve()),
                              'targets_at_0': target_at(0), 'note': 'Preview targets only; no measured feedback.'}, indent=2))
            return
        if args.simulate:
            from simulation import SimulationInterface
            iface = SimulationInterface(config, args.link_length, args.link_mass, args.sim_torque, args.headless)
        else:
            iface = ST3215Interface(port=args.port)
        try:
            ok, message = iface.connect()
            if not ok:
                raise RuntimeError(message)
            if args.mode == 'read':
                state = feedback(iface, {i: (0, 4095) for i in range(1, 11)})
                print(json.dumps(state, indent=2))
                record(writer, 'read_torque_off', 0, {i: row['position'] for i, row in state.items()}, state, 0)
            else:
                run_motion(iface, config, target_at, args.duration, writer,
                           jog_id=args.id if args.mode == 'jog' else None, jog_ticks=args.ticks or 0)
        except BaseException as exc:
            writer.writerow(['fault', '', '', '', '', '', '', str(exc)])
            raise
        finally:
            iface.disconnect()
    print(f'Completed; torque off. Log: {log.resolve()}')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('Interrupted; STOP requested.', file=sys.stderr)
        sys.exit(130)
    except (RuntimeError, ValueError, OSError, TimeoutError) as exc:
        print(f'Stopped: {exc}', file=sys.stderr)
        sys.exit(1)

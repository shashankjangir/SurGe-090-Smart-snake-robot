"""Replay a logged hardware run in the simulator and compare servo tracking.

Feeds the exact commands from runs/<name>.csv into PyBullet at the logged intervals,
then reports per joint how far feedback lags the command and the RMS tracking error,
for the real robot and the simulator side by side. Run in the conda `surge` env:

    python generations/gen3-experimental-3d/tools/replay_run.py runs/20261026-201759-468327600.csv
    python generations/gen3-experimental-3d/tools/replay_run.py --all          # every hardware run

Travel distance is not compared: the logs hold joint data only. Fill TRAVEL_TRIALS.md first.
"""
import argparse
import csv
from collections import defaultdict
import json
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from gait import COUNTS_PER_RADIAN, load_map
from simulation import SERVO_DELAY, SimulationInterface


def load(csv_path):
    """Ticks in order: (stage, elapsed, interval, {id: (command, feedback)})."""
    ticks = {}
    with open(csv_path, newline='') as f:
        for r in csv.DictReader(f):
            if r['position_counts'] in ('', 'None'):
                continue
            key = float(r['elapsed_s'])
            tick = ticks.setdefault(key, (r['stage'], key, float(r['interval_s']), {}))
            tick[3][int(r['id'])] = (int(r['target_counts']), int(r['position_counts']))
    return list(ticks.values())


def metrics(series, period):
    """Per moving joint during motion: (lag seconds, RMS error counts)."""
    out = {}
    for sid, (command, feedback) in series.items():
        c, q = np.array(command, float), np.array(feedback, float)
        if len(c) < 40 or np.ptp(c) < 20:
            continue
        shift = min(range(20), key=lambda k: np.mean((q[k:] - c[:len(c) - k]) ** 2))
        out[sid] = (shift * period, float(np.sqrt(np.mean((q - c) ** 2))))
    return out


def replay(csv_path, delay=SERVO_DELAY):
    meta = json.loads(Path(csv_path).with_suffix('.json').read_text())
    if meta.get('execution') != 'hardware':
        return None
    config = meta.get('joint_map') or {}
    if 'joints' not in config:  # early runs logged only speed; use the current map
        config = {**load_map(), **config}
    ticks = load(csv_path)
    if not ticks or not any(stage == 'motion' for stage, *_ in ticks):
        return None
    sim = SimulationInterface(config, headless=True, delay=delay)
    sim.connect()
    try:
        # Start from the robot's measured pose, not the calibrated zero.
        first = ticks[0][3]
        for i, joint in enumerate(config['joints']):
            if joint['id'] in first:
                angle = (first[joint['id']][1] - joint['zero']) / (joint['sign'] * COUNTS_PER_RADIAN)
                sim.p.resetJointState(sim.body, i, angle)
        sim.start()
        real, simulated = defaultdict(lambda: ([], [])), defaultdict(lambda: ([], []))
        for stage, _, interval, joints in ticks:
            sim.write_positions({sid: c for sid, (c, _) in joints.items()}, config['speed'])
            state = sim.read_telemetry(interval)
            if stage != 'motion':
                continue
            for sid, (c, q) in joints.items():
                real[sid][0].append(c); real[sid][1].append(q)
                simulated[sid][0].append(c); simulated[sid][1].append(state[sid]['position'])
    finally:
        sim.disconnect()
    period = float(np.median([t[2] for t in ticks if t[0] == 'motion']))
    return meta.get('arguments', {}), metrics(real, period), metrics(simulated, period)


def report(csv_path, delay):
    result = replay(csv_path, delay)
    if not result:
        return []
    args, real, simulated = result
    print(f"\n{Path(csv_path).name}  pitch {args.get('pitch')}°  yaw {args.get('yaw')}°  {args.get('frequency')} Hz")
    print('  ID   lag real/sim (s)   RMS error real/sim (counts)')
    rows = []
    for sid in sorted(real):
        (lr, er), (ls, es) = real[sid], simulated.get(sid, (float('nan'),) * 2)
        print(f'  {sid:>2}   {lr:5.2f} / {ls:5.2f}      {er:6.1f} / {es:6.1f}')
        rows.append((lr, ls, er, es))
    return rows


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('runs', nargs='*', type=Path)
    p.add_argument('--all', action='store_true', help='Replay every hardware run in runs/')
    p.add_argument('--delay', type=float, default=SERVO_DELAY, help='Simulated command delay in seconds')
    args = p.parse_args(argv)
    paths = sorted((ROOT / 'runs').glob('2026*.csv')) if args.all else args.runs
    rows = []
    for path in paths:
        if path.with_suffix('.json').exists():
            rows += report(path, args.delay)
    if rows:
        lr, ls, er, es = np.array(rows).T
        print(f'\nAll joints: lag real {np.mean(lr):.2f} s vs sim {np.nanmean(ls):.2f} s; '
              f'RMS error real {np.mean(er):.1f} vs sim {np.nanmean(es):.1f} counts')


if __name__ == '__main__':
    main()

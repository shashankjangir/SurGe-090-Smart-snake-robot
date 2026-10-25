"""Finite Gen 3 jobs using the commissioning runner; never opens serial on import."""
import copy
import csv
import importlib.util
import json
import math
import os
from pathlib import Path
import tempfile
import threading
import time

ROOT = Path(__file__).resolve().parents[2] / 'gen3-experimental-3d'
spec = importlib.util.spec_from_file_location('surge_gen3_runner', ROOT / 'test_3d_snake.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
from gait import validate_map


class Gen3Control:
    def __init__(self, lock, map_path=ROOT / 'joint_map.json', hardware_factory=None):
        self.lock = lock
        self.map_path = Path(map_path)
        self.hardware_factory = hardware_factory or runner.ST3215Interface
        self.thread = None
        self.cancel = threading.Event()
        self.state = dict(busy=False, status='Idle; no connection', telemetry={}, stage='idle', log=None, execution=None)

    def snapshot(self):
        with self.lock:
            return copy.deepcopy(self.state)

    def save_map(self, config):
        validate_map(config)
        if self.state['busy']:
            raise RuntimeError('Stop the Gen 3 job before saving calibration')
        original = self.map_path.read_text(encoding='utf-8')
        backups = self.map_path.parent / 'runs'
        backups.mkdir(exist_ok=True)
        (backups / f'calibration-before-{time.time_ns()}.json').write_text(original, encoding='utf-8')
        name = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=self.map_path.parent, delete=False) as stream:
                name = stream.name
                json.dump(config, stream, indent=2)
                stream.write('\n')
            os.replace(name, self.map_path)
        finally:
            if name and Path(name).exists():
                Path(name).unlink()

    def start(self, data):
        if not isinstance(data, dict):
            raise ValueError('Job settings must be an object')
        if self.state['busy']:
            raise RuntimeError('A Gen 3 job already owns the connection')
        mode = data.get('mode', 'read')
        execution = data.get('execution', 'preview')
        if mode not in ('read', 'jog', 'gait') or execution not in ('preview', 'simulation', 'hardware'):
            raise ValueError('Select read, jog or gait and a valid execution mode')
        if mode != 'gait' and execution != 'hardware':
            raise ValueError('Read and jog require hardware execution')
        port = data.get('port', '')
        if execution == 'hardware' and (not isinstance(port, str) or not port.strip() or len(port) > 128):
            raise ValueError('Select the transmitter serial port')
        duration = runner.number(data.get('duration', 10), 'duration', 2, 300)
        sid, ticks, values = None, 0, None
        if mode == 'jog':
            sid = data.get('id')
            ticks = data.get('ticks')
            if type(sid) is not int or sid not in range(1, 11) or type(ticks) is not int or not 1 <= abs(ticks) <= 57:
                raise ValueError('Jog requires ID 1–10 and nonzero ticks between -57 and 57')
            config = dict(speed=100, tracking_error=25, tracking_timeout=.5)
        elif mode == 'gait':
            config = runner.load_map(self.map_path, require_calibrated=execution == 'hardware')
            fields = [('yaw', 5, 0, 90), ('pitch', 5, 0, 90), ('bias', 0, -90, 90),
                      ('frequency', .1, -.6, .6), ('lag', 90, -360, 360), ('offset', 90, -360, 360)]
            numbers = [runner.number(data.get(k, default), k, low, high) for k, default, low, high in fields]
            values = tuple(v if i == 3 else math.radians(v) for i, v in enumerate(numbers)) + (duration, 2)
            runner.validate_gait(config, *values)
        else:
            config = None
        self.cancel.clear()
        self.state.update(busy=True, status='Starting', telemetry={}, stage='starting', log=None, execution=execution)
        self.thread = threading.Thread(target=self._run, args=(mode, execution, port, config, values, duration, sid, ticks), daemon=True)
        self.thread.start()

    def stop(self):
        self.cancel.set()
        if self.state['busy']:
            self.state['status'] = 'Stop requested; waiting for torque-off cleanup'

    def _run(self, mode, execution, port, config, values, duration, sid, ticks):
        iface = None
        status = 'Completed; torque off'
        log = self.map_path.parent / 'runs' / f'web-{time.time_ns()}.csv'
        target_at = None if values is None else lambda t: runner.targets_at(t, config, *values)
        owner = self

        class LiveWriter:
            def writerow(self, row):
                writer.writerow(row)
                stream.flush()
                if len(row) == 8 and isinstance(row[3], int):
                    with owner.lock:
                        owner.state['stage'] = row[0]
                        owner.state['telemetry'][row[3]] = dict(valid=True, target=row[4], position=row[5], velocity=row[6], load=row[7])

        try:
            log.parent.mkdir(exist_ok=True)
            with self.lock:
                self.state['log'] = log.name
            with log.with_suffix('.json').open('x', encoding='utf-8') as stream:
                json.dump(dict(mode=mode, execution=execution, joint_map=config, values=values,
                               duration=duration, id=sid, ticks=ticks), stream, indent=2)
            with log.open('x', newline='', encoding='utf-8') as stream:
                writer = csv.writer(stream)
                writer.writerow(['stage', 'elapsed_s', 'interval_s', 'id', 'target_counts', 'position_counts', 'velocity_raw', 'load_raw'])
                if execution == 'preview':
                    with self.lock:
                        self.state['stage'] = 'preview'
                    for n in range(math.ceil(duration / runner.PERIOD) + 1):
                        if self.cancel.is_set():
                            raise InterruptedError('Stop requested')
                        t = min(n * runner.PERIOD, duration)
                        for motor, target in target_at(t).items():
                            writer.writerow(['preview', t, runner.PERIOD, motor, target, '', '', ''])
                    status = 'Preview complete; no hardware connected'
                else:
                    if execution == 'simulation':
                        from simulation import SimulationInterface
                        iface = SimulationInterface(config, .1, .25, 2, True)
                    else:
                        iface = self.hardware_factory(port=port)
                    ok, message = iface.connect()
                    if not ok:
                        raise RuntimeError(message)
                    if self.cancel.is_set():
                        raise InterruptedError('Stop requested')
                    with self.lock:
                        self.state['status'] = 'Running' if mode != 'read' else 'Reading; torque off'
                    if mode == 'read':
                        started = time.monotonic()
                        state = iface.read_telemetry()
                        if time.monotonic() - started > runner.MAX_GAP:
                            raise RuntimeError('Telemetry deadline exceeded')
                        for motor in range(1, 11):
                            row = state.get(motor, {})
                            position = row.get('position')
                            row['valid'] = bool(row.get('valid')) and type(position) is int and 0 <= position <= 4095
                            state[motor] = row
                        missing = [str(i) for i, row in state.items() if not row['valid']]
                        with self.lock:
                            self.state.update(telemetry=state, stage='read_torque_off')
                        for motor, row in state.items():
                            writer.writerow(['read_torque_off', 0, 0, motor, '', row.get('position', ''), row.get('velocity', ''), row.get('load', '')])
                        if missing:
                            status = 'Torque off; missing/invalid feedback: ' + ', '.join(missing)
                    else:
                        runner.run_motion(iface, config, target_at, duration, LiveWriter(), jog_id=sid,
                                          jog_ticks=ticks, stop_event=self.cancel)
        except Exception as exc:
            status = f'Stopped: {exc}'
            if log.exists():
                with log.open('a', newline='', encoding='utf-8') as stream:
                    csv.writer(stream).writerow(['fault', '', '', '', '', '', '', str(exc)])
        finally:
            if iface is not None:
                try:
                    iface.disconnect()
                except Exception as exc:
                    status += f'; torque-off acknowledgement failed: {exc}. Disconnect robot power.'
            with self.lock:
                self.state.update(busy=False, status=status)

    def close(self):
        self.cancel.set()
        if self.thread:
            self.thread.join(timeout=5)

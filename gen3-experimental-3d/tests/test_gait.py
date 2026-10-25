"""Offline only: no serial ports, no flashing, no physical movement."""
import copy
import csv
import io
import json
import math
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import gait
import test_3d_snake as runner
from simulation import robot_xml


def example_map():
    return dict(calibrated=False, speed=200, tracking_error=25, tracking_timeout=.5,
                joints=[dict(id=i, axis='yaw' if i % 2 else 'pitch', sign=1,
                             zero=2048, min=1934, max=2162) for i in range(1, 11)])


class Clock:
    def __init__(self): self.t = 0.
    def now(self): return self.t
    def sleep(self, seconds): self.t += seconds


class Fake:
    def __init__(self):
        self.positions = {i: 2048 for i in range(1, 11)}
        self.sent = []
        self.armed = False
        self.closed = False
        self.frozen = False
        self.missing = None

    def connect(self): return True, 'test'
    def start(self): self.armed = True
    def disconnect(self): self.closed = True; self.armed = False
    def read_telemetry(self):
        return {i: {'valid': i != self.missing, 'position': v, 'velocity': 0, 'load': 0}
                for i, v in self.positions.items()}
    def write_positions(self, positions, speed):
        assert self.armed
        self.sent.append(positions.copy())
        if not self.frozen:
            self.positions.update(positions)


class GaitTests(unittest.TestCase):
    def setUp(self):
        self.config = example_map()
        self.values = (math.radians(5), math.radians(5), 0, .1, math.pi/2, math.pi/2, 4, 2)

    def test_template_cannot_arm(self):
        with self.assertRaisesRegex(ValueError, 'Measure'):
            gait.validate_map(self.config, True)

    def test_invalid_maps(self):
        mutations = [lambda c: c['joints'][1].update(id=1),
                     lambda c: c['joints'][0].update(sign=0),
                     lambda c: c['joints'][0].update(min=1200),
                     lambda c: c['joints'][0].update(zero=2200),
                     lambda c: c['joints'][0].update(axis='pitch'),
                     lambda c: c.update(speed=float('nan')),
                     lambda c: c.update(calibrated='true')]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                c = copy.deepcopy(self.config)
                mutate(c)
                with self.assertRaises(ValueError): gait.validate_map(c)

    def test_whole_cycle_bounds_and_neutral_endpoints(self):
        gait.validate_gait(self.config, *self.values)
        previous = None
        for step in range(401):
            targets = gait.targets_at(step / 100, self.config, *self.values)
            for j in self.config['joints']:
                self.assertLessEqual(j['min'], targets[j['id']])
                self.assertLessEqual(targets[j['id']], j['max'])
            if previous:
                self.assertTrue(all(abs(targets[i] - previous[i]) <= 3 for i in targets))
            previous = targets
        for t in (0, 4):
            self.assertEqual(gait.targets_at(t, self.config, *self.values), {i: 2048 for i in range(1, 11)})

    def test_mount_sign_zero_and_physical_order(self):
        c = self.config
        c['joints'][0].update(id=10, sign=-1, zero=2050)
        c['joints'][-1]['id'] = 1
        gait.validate_map(c)
        targets = gait.targets_at(2, c, *self.values)
        expected = round(2050 - math.radians(5) * math.sin(.4*math.pi) * gait.COUNTS_PER_RADIAN)
        self.assertEqual(targets[10], expected)

    def test_yaw_only_and_reverse(self):
        values = list(self.values)
        values[1] = 0
        targets = gait.targets_at(2, self.config, *values)
        self.assertTrue(all(targets[i] == 2048 for i in (2, 4, 6, 8, 10)))
        values[3] *= -1
        reverse = gait.targets_at(2, self.config, *values)
        self.assertEqual(reverse[1] - 2048, -(targets[1] - 2048))

    def test_invalid_gait_parameters(self):
        for index, value in ((0, 2), (2, 1), (3, float('nan')), (3, .6), (6, -1), (7, 0), (7, 3)):
            values = list(self.values)
            values[index] = value
            with self.subTest(index=index, value=value), self.assertRaises(ValueError):
                gait.validate_gait(self.config, *values)

    def test_stalled_loop_does_not_allow_large_slew(self):
        self.assertEqual(gait.slew({1: 2000}, {1: 2100}, 200, 10), {1: 2010})

    def test_simulation_has_alternating_axes_and_mapped_limits(self):
        self.config['joints'][0]['sign'] = -1
        root = ET.fromstring(robot_xml(self.config, .1, .25))
        self.assertEqual(len(root.findall('link')), 11)
        joints = root.findall('joint')
        self.assertEqual(len(joints), 10)
        self.assertEqual([j.find('axis').get('xyz') for j in joints], ['0 0 1', '0 1 0'] * 5)
        self.assertLess(float(joints[0].find('limit').get('lower')), 0)


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.config = example_map()
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.map_path = Path(self.directory.name) / 'map.json'
        self.map_path.write_text(json.dumps(self.config))
        self.fake = Fake()
        self.clock = Clock()
        self.output = io.StringIO()
        self.writer = csv.writer(self.output)

    def run_gait(self):
        values = (math.radians(5), math.radians(5), 0, .1, math.pi/2, math.pi/2, 4, 2)
        runner.run_motion(self.fake, self.config, lambda t: gait.targets_at(t, self.config, *values),
                          4, self.writer, clock=self.clock.now, sleep=self.clock.sleep)

    def test_complete_run_returns_to_neutral(self):
        self.fake.positions[1] = 2000
        self.run_gait()
        self.assertEqual(self.fake.sent[0][1], 2000)
        self.assertEqual(self.fake.sent[-1], {i: 2048 for i in range(1, 11)})
        self.assertIn('settle', self.output.getvalue())

    def test_missing_joint_blocks_arming(self):
        self.fake.missing = 4
        with self.assertRaisesRegex(RuntimeError, 'Joint 4'): self.run_gait()
        self.assertFalse(self.fake.armed)
        self.assertFalse(self.fake.sent)

    def test_start_outside_calibration_blocks_arming(self):
        self.fake.positions[1] = 1800
        with self.assertRaises(RuntimeError): self.run_gait()
        self.assertFalse(self.fake.armed)

    def test_jammed_motor_stops(self):
        self.fake.frozen = True
        with self.assertRaisesRegex(RuntimeError, 'tracking'): self.run_gait()

    def test_single_joint_jog_returns_to_measured_start(self):
        runner.run_motion(self.fake, {'speed': 100, 'tracking_error': 25, 'tracking_timeout': .5}, None,
                          2, self.writer, jog_id=3, jog_ticks=-40, clock=self.clock.now, sleep=self.clock.sleep)
        self.assertTrue(all(set(row) == {3} for row in self.fake.sent))
        self.assertEqual(self.fake.sent[-1], {3: 2048})
        self.assertLess(min(row[3] for row in self.fake.sent), 2020)

    def test_jog_limit_blocks_arming(self):
        self.fake.positions[1] = 1260
        with self.assertRaises(ValueError):
            runner.run_motion(self.fake, self.config, None, 2, self.writer, jog_id=1, jog_ticks=-50)
        self.assertFalse(self.fake.armed)

    def test_stale_telemetry(self):
        original = self.fake.read_telemetry
        def slow():
            self.clock.sleep(.31)
            return original()
        self.fake.read_telemetry = slow
        with self.assertRaisesRegex(RuntimeError, 'deadline'): self.run_gait()
        self.assertFalse(self.fake.armed)

    def test_scheduler_stall(self):
        def stall(seconds): self.clock.t += .4
        with self.assertRaisesRegex(RuntimeError, 'deadline'):
            runner.run_motion(self.fake, self.config, lambda t: {}, 2, self.writer,
                              clock=self.clock.now, sleep=stall)
        self.assertEqual(len(self.fake.sent), 1)

    def test_dry_run_never_constructs_hardware(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(runner, 'ST3215Interface') as factory:
            path = Path(directory) / 'run.csv'
            with patch('sys.stdout', new=io.StringIO()):
                runner.main(['--map', str(self.map_path), '--log', str(path)])
            factory.assert_not_called()
            with path.open() as stream:
                rows = list(csv.DictReader(stream))
            self.assertEqual(len(rows), 2010)
            self.assertTrue(all(row['position_counts'] == '' for row in rows))
            self.assertEqual(json.loads(path.with_suffix('.json').read_text())['execution'], 'preview')

    def test_hardware_refuses_template_before_connect(self):
        with patch.object(runner, 'ST3215Interface') as factory, patch('sys.stderr', new=io.StringIO()):
            with self.assertRaises(SystemExit): runner.main(['--hardware'])
            factory.assert_not_called()

    def test_read_mode_never_arms(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(runner, 'ST3215Interface', return_value=self.fake), patch('sys.stdout', new=io.StringIO()):
            runner.main(['--hardware', '--mode', 'read', '--log', str(Path(directory)/'read.csv')])
        self.assertFalse(self.fake.sent)
        self.assertTrue(self.fake.closed)

    def test_existing_log_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(runner, 'ST3215Interface') as factory:
            path = Path(directory)/'saved.csv'
            path.write_text('keep me')
            with self.assertRaises(FileExistsError): runner.main(['--map', str(self.map_path), '--log', str(path)])
            self.assertEqual(path.read_text(), 'keep me')
            factory.assert_not_called()

    def test_simulation_never_constructs_hardware(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(runner, 'ST3215Interface') as hardware, patch('simulation.SimulationInterface', return_value=self.fake), patch.object(runner, 'run_motion'), patch('sys.stdout', new=io.StringIO()):
            runner.main(['--simulate', '--map', str(self.map_path), '--log', str(Path(directory)/'sim.csv')])
            hardware.assert_not_called()
            self.assertTrue(self.fake.closed)

    def test_failed_connect_is_cleaned_up(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(runner, 'ST3215Interface', return_value=self.fake):
            self.fake.connect = lambda: (False, 'no receiver')
            with self.assertRaisesRegex(RuntimeError, 'no receiver'):
                runner.main(['--hardware', '--mode', 'read', '--log', str(Path(directory)/'read.csv')])
            self.assertTrue(self.fake.closed)

    def test_cleanup_after_fault_and_keyboard_interrupt(self):
        for error in (RuntimeError('injected'), KeyboardInterrupt()):
            with tempfile.TemporaryDirectory() as directory:
                c = copy.deepcopy(self.config)
                c['calibrated'] = True
                map_path = Path(directory) / 'map.json'
                map_path.write_text(json.dumps(c))
                fake = Fake()
                with patch.object(runner, 'ST3215Interface', return_value=fake), patch.object(runner, 'run_motion', side_effect=error):
                    with self.assertRaises(type(error)):
                        runner.main(['--hardware', '--map', str(map_path), '--log', str(Path(directory)/'log.csv')])
                self.assertTrue(fake.closed)


if __name__ == '__main__':
    unittest.main()

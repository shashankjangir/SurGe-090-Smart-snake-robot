"""Route validation, truthful progress, bounded steering and real headless travel."""
import importlib.util
import math
import json
from pathlib import Path
import sys
import unittest
import tempfile
import threading
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / 'backend')]
from gait import envelope, load_map, slew, targets_at
from surge_control.spatial_route import SpatialRoute, validate_path


def head(x, y=0):
    return dict(position=[x, y, .04], yaw=0)


class SpatialRouteTest(unittest.TestCase):
    def test_rejects_unbounded_or_malformed_routes(self):
        for path in (None, [], [[0, 0]], [[0, 0], [True, 0]], [[0, 0], [math.nan, 1]],
                     [[0, 0], [51, 0]], [[0, 0], [0, 0]], [[0, 0], [1, 2, 3]], [[0, 0]] * 501):
            with self.subTest(path=path), self.assertRaises(ValueError):
                validate_path(path)

    def test_short_route_requires_actual_movement(self):
        route = SpatialRoute([[0, 0], [.1, 0]])
        route.update(head(0), 0)
        route.update(head(0), 1)
        self.assertNotEqual(route.state, 'completed')
        route.update(head(.09), 2)
        self.assertEqual(route.state, 'completed')
        self.assertEqual(route.snapshot()['progress'], 1)

    def test_order_and_jump_rejection_prevent_false_completion(self):
        route = SpatialRoute([[0, 0], [1, 0], [0, 0]])
        route.update(head(0), 0)
        route.update(head(1), 1)
        self.assertEqual(route.rejected_samples, 1)
        self.assertEqual(route.snapshot()['progress'], 0)
        route.update(head(0), 31)
        self.assertEqual(route.state, 'stalled')

    def test_persistent_rejected_pose_stalls(self):
        route = SpatialRoute([[0, 0], [1, 0]])
        route.update(head(0), 0)
        route.update(head(2), 1)
        route.update(head(2), 31)
        self.assertEqual(route.state, 'stalled')
        self.assertEqual(route.snapshot()['progress'], 0)

    def test_hardware_rejects_simulation_routes_without_opening_a_port(self):
        from surge_control.gen3 import Gen3Control
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'joint_map.json'
            path.write_bytes((ROOT / 'joint_map.json').read_bytes())
            opened = []
            control = Gen3Control(threading.RLock(), path, hardware_factory=lambda **kwargs: opened.append(kwargs))
            self.addCleanup(control.close)
            with self.assertRaisesRegex(ValueError, 'only supported for simulation'):
                control.start(dict(mode='gait', execution='hardware', port='not-a-port', simulation_path=[[0, 0], [1, 0]]))
            self.assertFalse(opened)
            self.assertFalse(control.state['busy'])

    def test_route_fault_is_not_reported_as_completion(self):
        from surge_control.gen3 import Gen3Control, runner
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'joint_map.json'
            path.write_bytes((ROOT / 'joint_map.json').read_bytes())
            control = Gen3Control(threading.RLock(), path)
            self.addCleanup(control.close)
            control.simulation = type('Sim', (), {'disconnect': lambda self: None})()
            control.simulation_revision = control.get_map_revision()
            control.state['simulation_state'] = 'connected'
            with patch.object(runner, 'run_motion', side_effect=RuntimeError('physics fault')):
                control.start(dict(mode='gait', execution='simulation', simulation_path=[[0, 0], [1, 0]],
                                   simulation_tracking=dict(verified=True, tracking_error=100, tracking_timeout=.5)))
                control.thread.join(5)
            snapshot = control.snapshot()
            self.assertEqual(snapshot['simulation_route']['state'], 'error')
            self.assertEqual(snapshot['simulation_state'], 'error')
            self.assertIsNone(snapshot['simulation_head'])
            self.assertIn('physics fault', snapshot['status'])

    def test_correction_touches_yaw_only_and_preserves_encoder_limits(self):
        route = SpatialRoute([[0, 0], [1, .2]])
        config = load_map()
        targets = {j['id']: j['zero'] for j in config['joints']}
        route.bias = 100
        corrected = route.targets(targets, config, 1)
        for j in config['joints']:
            self.assertTrue(j['min'] <= corrected[j['id']] <= j['max'])
            if j['axis'] == 'pitch':
                self.assertEqual(corrected[j['id']], targets[j['id']])


@unittest.skipUnless(importlib.util.find_spec('pybullet'), 'Run in conda surge for physics')
class RoutePhysicsTest(unittest.TestCase):
    def follow(self, curve):
        from simulation import SimulationInterface
        config = load_map()
        sim = SimulationInterface(config, torque=2, headless=True)
        self.addCleanup(sim.disconnect)
        sim.connect()
        self.assertLess(sim.link_positions()[-1][0], sim.head_pose()['position'][0])
        self.assertAlmostEqual(sim.head_pose()['yaw'], 0)
        start = sim.head_pose()['position']
        path = [[start[0] + i * .04, .1 * math.sin(2 * math.pi * i / 40) if curve else 0] for i in range(41)]
        route = SpatialRoute(path)
        sim.start()
        previous = {j['id']: float(j['zero']) for j in config['joints']}
        for n in range(1600):
            t = n * .05
            route.update(sim.head_pose(), t)
            if route.state in ('completed', 'stalled'):
                break
            desired = targets_at(t, config, math.radians(30), 0, 0, .3, math.pi / 2, 0, 80, 2)
            desired = route.targets(desired, config, envelope(t, 80, 2))
            current = slew(previous, desired, 1500, .05)
            for sid in current:
                self.assertLessEqual(abs(current[sid] - previous[sid]), 75 + 1e-8)
            sim.write_positions({i: round(v) for i, v in current.items()}, 1500)
            telemetry = sim.read_telemetry()
            for j in config['joints']:
                self.assertTrue(j['min'] <= telemetry[j['id']]['position'] <= j['max'])
            previous = current
        self.assertEqual(route.state, 'completed', route.snapshot())
        self.assertEqual(route.snapshot()['progress'], 1)
        self.assertLessEqual(math.dist(sim.head_pose()['position'][:2], path[-1]), .1)
        self.assertGreater(sim.head_pose()['position'][0] - start[0], 1.4)
        self.assertEqual(route.rejected_samples, 0)

    def test_straight_route_in_physics(self):
        self.follow(False)

    def test_broad_s_curve_in_physics(self):
        self.follow(True)

    def test_console_execution_publishes_head_and_saves_actual_route(self):
        from simulation import SimulationInterface
        from surge_control.gen3 import Gen3Control, runner
        with tempfile.TemporaryDirectory() as directory:
            map_path = Path(directory) / 'joint_map.json'
            map_path.write_bytes((ROOT / 'joint_map.json').read_bytes())
            control = Gen3Control(threading.RLock(), map_path)
            self.addCleanup(control.close)
            sim = SimulationInterface(load_map(), torque=2, headless=True)
            sim.connect()
            control.simulation = sim
            control.simulation_revision = control.get_map_revision()
            control.state['simulation_state'] = 'connected'
            clock = [0.]
            original = runner.run_motion

            def sleep(dt):
                clock[0] += dt

            def accelerated(*args, **kwargs):
                return original(*args, **kwargs, clock=lambda: clock[0], sleep=sleep)

            body = dict(mode='gait', execution='simulation', yaw=30, pitch=0, frequency=.3,
                        speed=1500, duration=120, ramp=2,
                        simulation_path=[[-.05, 0], [.95, 0]],
                        simulation_tracking=dict(verified=True, tracking_error=100, tracking_timeout=.5))
            with patch.object(runner, 'run_motion', accelerated):
                control.start(body)
                control.thread.join(30)
                self.assertFalse(control.thread.is_alive())
            snapshot = control.snapshot()
            self.assertEqual(snapshot['simulation_state'], 'connected', snapshot['status'])
            self.assertEqual(snapshot['simulation_route']['state'], 'completed', snapshot['status'])
            self.assertTrue(snapshot['status'].startswith('Completed route'))
            self.assertEqual(len(snapshot['simulation_poses']), 11)
            self.assertEqual(snapshot['simulation_head']['position'], snapshot['simulation_links'][0])
            trace_file = map_path.parent / 'runs/routes' / (snapshot['run_id'] + '.json')
            self.assertGreater(len(json.loads(trace_file.read_text())['actual_path']), 20)
            self.assertEqual(len(control.list_runs()), 1)
            self.assertEqual(load_map(map_path), load_map())


if __name__ == '__main__':
    unittest.main()

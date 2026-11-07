"""3D Motions steering: stick direction -> per-joint targets. Offline; the PyBullet check skips without it."""
import json
import importlib.util
import math
from pathlib import Path
import sys
import time
import unittest

ROOT = Path(__file__).resolve().parents[3]
GEN = ROOT / 'generations/gen3-dashboard-refined'
sys.path.insert(0, str(GEN / 'backend'))
sys.path.insert(0, str(GEN))
from surge_control.manual import ManualController
from surge_control.gen3 import GaitMotionGenerator, runner
from surge_control.steering import Steering3D, joint_offsets, body_pose, YAW_STEER_MAX, ELEVATION_UP

CONFIG = runner.load_map(GEN / 'joint_map.json')
YAW_IDS = [j['id'] for j in CONFIG['joints'] if j['axis'] == 'yaw']
WAVE = dict(yaw=math.radians(40), pitch=0.)
LAG = math.radians(90)


def steering():
    return Steering3D(CONFIG['joints'], joint_offsets(CONFIG['joints']))


def run(s, seconds, x=0., y=0., frequency=.5, pose=None):
    for _ in range(round(seconds / .05)):
        s.update(x, y, frequency, LAG, WAVE, .05, pose)


def packet(sequence, **kwargs):
    return dict(sequence=sequence, captured_at=time.time(), deadman=True, throttle=1., **kwargs)


class SteeringModelTests(unittest.TestCase):
    def test_offsets_follow_the_cad_chain_head_to_tail(self):
        offsets = joint_offsets(CONFIG['joints'])
        ordered = [offsets[j['id']] for j in CONFIG['joints']]
        self.assertEqual(ordered, sorted(ordered))
        self.assertAlmostEqual(ordered[1] - ordered[0], .0584, places=3)

    def test_left_turn_starts_at_the_head_and_travels_down_the_body(self):
        s = steering()
        run(s, .5, x=-1)
        self.assertGreater(s.target_heading, 0)              # left = heading increases
        self.assertLess(s.angle(2), 0)                       # first yaw joint bends
        self.assertEqual(s.angle(12), 0)                     # tail has not reached the bend yet
        run(s, 3, x=-1)
        self.assertTrue(all(s.angle(sid) < 0 for sid in YAW_IDS))
        self.assertTrue(all(abs(s.angle(sid)) <= YAW_STEER_MAX + 1e-9 for sid in YAW_IDS))

    def test_right_turn_mirrors_left(self):
        left, right = steering(), steering()
        run(left, 2, x=-1)
        run(right, 2, x=1)
        for sid in YAW_IDS:
            self.assertAlmostEqual(left.angle(sid), -right.angle(sid))

    def test_changing_direction_mid_turn_rebends_from_the_head(self):
        s = steering()
        run(s, 3, x=-1)
        run(s, 1, x=1)
        self.assertGreater(s.angle(2), 0)                    # head now turning right
        self.assertLess(s.angle(12), 0)                      # tail still finishing the left turn
        run(s, 4, x=1)
        self.assertTrue(all(s.angle(sid) > 0 for sid in YAW_IDS))

    def test_measured_pose_closes_the_heading_loop(self):
        s = steering()
        run(s, 1, x=-1, pose=dict(heading=0., elevation=0., head_height=0.))
        for _ in range(200):  # the body reaches the new heading and holds it
            s.update(0., 0., .5, LAG, WAVE, .05, dict(heading=s.target_heading, elevation=0., head_height=0.))
        self.assertTrue(all(abs(s.angle(sid)) < math.radians(.5) for sid in YAW_IDS))

    def test_without_motion_the_bend_cannot_travel(self):
        s = steering()
        run(s, 2, x=-1, frequency=0.)
        self.assertTrue(all(s.angle(sid) == 0 for sid in YAW_IDS[1:]))

    def test_reverse_steers_from_the_tail(self):
        s = steering()
        run(s, .3, x=-1, frequency=-.5)
        self.assertNotEqual(s.angle(12), 0)
        self.assertEqual(s.angle(2), 0)

    def test_up_raises_the_neck_and_calms_the_raised_head(self):
        s = steering()
        run(s, 3, y=1)
        self.assertAlmostEqual(s.neck_angle, ELEVATION_UP)
        self.assertGreater(s.angle(1), 0)
        self.assertGreater(s.angle(3), 0)
        self.assertEqual(s.angle(5), 0)                      # the body behind the neck stays down
        self.assertEqual(s.wave_scale(2), 0)                 # raised head stops swinging
        self.assertEqual(s.wave_scale(12), 1)                # the body keeps propelling

    def test_floor_stops_the_head_going_down(self):
        s = steering()
        run(s, 2, y=-1, pose=dict(heading=0., elevation=0., head_height=0.))
        self.assertEqual(s.target_elevation, 0)
        self.assertEqual(s.neck_angle, 0)
        raised = steering()
        run(raised, 2, y=-1, pose=dict(heading=0., elevation=.3, head_height=.05))
        self.assertLess(raised.neck_angle, 0)

    def test_body_pose_reads_heading_and_head_pitch(self):
        yaw, pitch = math.radians(30), math.radians(20)
        # Yaw about Z, then nose-up pitch (a negative turn about the body Y axis); quaternions are x, y, z, w.
        a, b = [0., 0., math.sin(yaw / 2), math.cos(yaw / 2)], [0., -math.sin(pitch / 2), 0., math.cos(pitch / 2)]
        q = [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
             a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]
        poses = [dict(position=[-i * .05 * math.cos(yaw), -i * .05 * math.sin(yaw), .03], quaternion=q) for i in range(13)]
        pose = body_pose(poses)
        self.assertAlmostEqual(pose['heading'], yaw)
        self.assertAlmostEqual(pose['elevation'], pitch, places=6)
        self.assertAlmostEqual(pose['head_height'], 0)


class ControllerIntegrationTests(unittest.TestCase):
    def test_options_are_validated(self):
        for options in (dict(steering='fly'), dict(steering='3d', assist='heading'), dict(steering='3d', inspection=True)):
            with self.assertRaises(ValueError):
                ManualController(options)

    def test_stick_input_changes_each_servo_target(self):
        def targets(x, y):
            gen = GaitMotionGenerator(CONFIG, dict(yaw=WAVE['yaw'], pitch=0., bias=0., frequency=.5, lag=LAG,
                                                   offset=0., speed=3000), 60, 2)
            m = ManualController(dict(steering='3d'))
            m.attach_steering(CONFIG['joints'], joint_offsets(CONFIG['joints']))
            gen.manual = m
            m.pose3d = dict(heading=0., elevation=0., head_height=0.)  # body held still: the target leads it
            for n in range(120):
                m.update(packet(n, stick_x=x, stick_y=y))
                result, _ = gen.evaluate(n * .05)
            return result, m.snapshot()['steering']
        straight, _ = targets(0., 0.)
        left, steer = targets(-1., 0.)
        up, lifted = targets(0., 1.)
        self.assertGreater(steer['target_heading'], 0)
        changed = [sid for sid in YAW_IDS if left[sid] != straight[sid]]
        self.assertEqual(changed, YAW_IDS)
        self.assertNotEqual(up[1], straight[1])
        self.assertNotEqual(up[3], straight[3])
        self.assertGreater(lifted['target_elevation'], 0)
        for joint in CONFIG['joints']:
            for result in (left, up):
                self.assertTrue(joint['min'] <= result[joint['id']] <= joint['max'])

    def test_hardware_is_refused_until_trialled(self):
        import tempfile
        import threading
        from surge_control.gen3 import Gen3Control
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'joint_map.json'
            path.write_text(json.dumps(dict(json.loads((GEN / 'joint_map.json').read_text()), calibrated=True)))
            opened = []
            control = Gen3Control(threading.RLock(), path, hardware_factory=lambda **kwargs: opened.append(kwargs))
            self.addCleanup(control.close)
            with self.assertRaisesRegex(ValueError, 'simulation and dry-run'):
                control.start(dict(mode='gait', execution='hardware', port='not-a-port', yaw=5, pitch=0, speed=500,
                                   ramp=1, duration=3, controller=dict(steering='3d'), input=packet(0)))
            self.assertFalse(opened)
            self.assertFalse(control.state['busy'])

    def test_classic_steering_ignores_stick_y(self):
        m = ManualController()
        m.update(packet(0, stick_y=1.))
        base = dict(yaw=.4, pitch=.2, bias=0., frequency=.5, lag=1., offset=0.)
        self.assertEqual(m.parameters(base, .05)['pitch'], .2)
        self.assertIsNone(m.snapshot()['steering'])


@unittest.skipUnless(importlib.util.find_spec('pybullet'), 'PyBullet not installed')
class PyBulletSteeringTests(unittest.TestCase):
    """The player's direction changes the simulated body's real heading and head height."""

    def drive(self, script):
        from simulation import SimulationInterface
        config = dict(CONFIG, speed=3000, tracking_error=796, tracking_timeout=2)
        gen = GaitMotionGenerator(config, dict(yaw=WAVE['yaw'], pitch=0., bias=0., frequency=.5, lag=LAG,
                                               offset=0., speed=3000), 120, 2)
        m = ManualController(dict(steering='3d'))
        m.attach_steering(config['joints'], joint_offsets(config['joints']))
        gen.manual = m
        sim = SimulationInterface(config, None, .25, headless=True)
        sim.connect(); sim.start()
        self.addCleanup(sim.disconnect)
        t, n, out = 0., 0, []
        for seconds, x, y in script:
            for _ in range(round(seconds / runner.PERIOD)):
                m.update(packet(n, stick_x=x, stick_y=y)); n += 1
                m.pose3d = body_pose(sim.link_poses())
                targets, _ = gen.evaluate(t)
                sim.write_positions(targets, 3000)
                sim.read_telemetry(runner.PERIOD)
                t += runner.PERIOD
            out.append(dict(body_pose(sim.link_poses())))
        return out

    def test_left_then_right_turns_the_body(self):
        start, left, right = self.drive([(4, 0., 0.), (8, -1., 0.), (8, 1., 0.)])
        self.assertLess(abs(start['heading']), math.radians(5))
        self.assertGreater(left['heading'], math.radians(60))
        self.assertLess(right['heading'], left['heading'] - math.radians(60))

    def test_up_lifts_the_head_and_down_returns_it_to_the_floor(self):
        _, up, down = self.drive([(4, 0., 0.), (3, 0., 1.), (3, 0., -1.)])
        self.assertGreater(up['elevation'], math.radians(15))
        self.assertGreater(up['head_height'], .03)
        self.assertLess(down['head_height'], .01)


if __name__ == '__main__':
    unittest.main()

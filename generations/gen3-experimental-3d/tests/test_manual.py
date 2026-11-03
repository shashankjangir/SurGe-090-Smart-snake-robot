"""Controller safety, navigation and both runners; entirely offline."""
import importlib.util
import json
import math
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
GEN = ROOT / 'generations/gen3-experimental-3d'
sys.path.insert(0, str(GEN / 'backend'))
sys.path.insert(0, str(ROOT / 'shared'))
from surge_control.manual import ManualController, Localization
from surge_control.gen3 import Gen3Control, GaitMotionGenerator, runner
from surge_control.runtime import ControlRuntime


def packet(sequence=0, **kwargs):
    return dict(sequence=sequence, captured_at=time.time(), deadman=True, throttle=1., **kwargs)


class ManualTests(unittest.TestCase):
    def test_validation_is_atomic_and_replay_does_not_refresh_deadline(self):
        c = ManualController(now=0)
        c.update(packet(), now=0)
        for data in (packet(), packet(1, stick_x=float('nan')), packet(1, reverse='yes'),
                     dict(packet(1), deadman=1), dict(packet(1), captured_at=time.time() - 2)):
            with self.assertRaises(ValueError): c.update(data, now=.4)
        self.assertEqual(c.sequence, 0)
        with self.assertRaises(InterruptedError): c.check(.51)

    def test_release_even_at_zero_stick_stops(self):
        c = ManualController(now=0)
        c.update(packet(), now=0)
        c.check(.49)
        c.update(dict(packet(1), deadman=False), now=.49)
        with self.assertRaises(InterruptedError): c.check(.49)

    def test_reverse_crosses_zero_and_shape_changes_are_smooth(self):
        c = ManualController()
        base = dict(yaw=.4, pitch=.2, bias=0., frequency=.1, lag=1., offset=1.)
        c.update(packet())
        for _ in range(30): c.parameters(base, .05)
        self.assertEqual(c.rate, 1)
        c.update(packet(1, reverse=True, preset=True, pitch_down=True))
        rates = [c.parameters(base, .05)['frequency'] for _ in range(45)]
        self.assertTrue(any(abs(v) < 1e-8 for v in rates))
        self.assertLess(rates[-1], 0)
        self.assertLess(c.yaw, .4)
        self.assertAlmostEqual(c.pitch_gain, .9)

    def test_feedback_reduces_rate_recovers_slowly_and_preserves_shape(self):
        c = ManualController()
        rows = {i: dict(valid=True, target=2048, position=2248) for i in range(1, 11)}
        for _ in range(10): c.feedback(rows, 216, .05)
        low = c.feedback_scale
        self.assertLess(low, 1)
        for row in rows.values(): row['position'] = 2048
        c.feedback(rows, 216, .05)
        self.assertLess(c.feedback_scale - low, .01)
        c.feedback({}, 216, .05)
        self.assertEqual(c.feedback_reason, 'Incomplete feedback')

    def test_navigation_requires_pose_and_tracks_ordered_route(self):
        base = dict(yaw=.1, pitch=0., bias=0., frequency=.1, lag=1., offset=0.)
        c = ManualController(dict(assist='heading'))
        c.update(packet())
        with self.assertRaises(RuntimeError): c.parameters(base, .05)
        c.parameters(base, .05, dict(x=0, y=0, yaw=0))
        self.assertLess(c.parameters(base, .05, dict(x=0, y=0, yaw=.2))['bias'], 0)
        c = ManualController(dict(assist='route', path=[[0, 0], [1, 0]]))
        c.update(packet())
        # A teleport to the end is rejected and cannot claim completion.
        c.parameters(base, .05, dict(x=0, y=0, yaw=0), 0)
        c.parameters(base, .05, dict(x=1, y=0, yaw=0), .05)
        self.assertNotEqual(c.route.state, 'completed')
        with self.assertRaises(InterruptedError):
            for n in range(1, 21): c.parameters(base, .05, dict(x=n / 20, y=0, yaw=0), n / 20)
        self.assertEqual(c.route.state, 'completed')

    def test_gen3_targets_keep_map_signs_joint_and_velocity_limits(self):
        config = runner.load_map()
        base = dict(yaw=.1, pitch=.1, bias=0., frequency=.1, lag=1., offset=1., speed=100)
        g = GaitMotionGenerator(config, base, 10, 2)
        c = g.manual = ManualController(dict(inspection=True))
        c.update(packet(head_x=1, head_y=1))
        previous = {j['id']: j['zero'] for j in config['joints']}
        for n in range(201):
            targets, _ = g.evaluate(n * .05)
            for j in config['joints']:
                self.assertLessEqual(abs(targets[j['id']] - previous[j['id']]), 6)
                self.assertLessEqual(j['min'], targets[j['id']])
                self.assertLessEqual(targets[j['id']], j['max'])
                if j['id'] > 2: self.assertEqual(targets[j['id']], j['zero'])
            if n == 80:
                self.assertGreater(targets[1], 2048)
                self.assertGreater(targets[2], 2048)
            previous = targets
        self.assertEqual(targets, {j['id']: j['zero'] for j in config['joints']})

    def test_localization_freshness_sequences_jump_and_source(self):
        loc = Localization()
        data = dict(frame='world', reference='head', source='camera', sequence=0, captured_at=100., x=0, y=0, yaw=0)
        loc.update(data, now=0, wall=100)
        self.assertEqual(loc.pose(.1, 100.1)['x'], 0)
        for bad in (dict(data, sequence=0), dict(data, sequence=1, captured_at=100.1, x=1),
                    dict(data, source='other', sequence=1, captured_at=100.1), dict(data, captured_at=99)):
            with self.assertRaises(ValueError): loc.update(bad, .1, 100.1)
        with self.assertRaises(RuntimeError): loc.pose(.51, 100.51)


class ControllerApiTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('manual_web', GEN / 'backend/web_dashboard/web_app.py')
        web = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(web)
        self.app = web.create_app()
        self.c = self.app.config['GEN3']
        self.planar = self.app.config['CONTROL']
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.c.map_path = Path(self.temp.name) / 'joint_map.json'
        self.c.map_path.write_text(json.dumps(runner.load_map()))
        self.c.hardware_factory = lambda **kw: self.fail('Physical hardware opened')
        self.addCleanup(self.c.close)
        self.addCleanup(self.planar.close)
        self.client = self.app.test_client()
        session = self.c.sessions.get_or_create(None)
        session.update(role='operator', name='offline-test')
        self.c.sessions.active_operator = dict(session_id=session['session_id'], name='offline-test', last_heartbeat=time.monotonic(), expires_at=time.monotonic() + 30)
        self.headers = {'X-Session-ID': session['session_id']}

    def test_viewer_cannot_write_input_or_localization(self):
        viewer = self.app.test_client()
        for endpoint in ('/api/gen3/controller', '/api/controller', '/api/localization'):
            self.assertEqual(viewer.post(endpoint, json={}).status_code, 403)

    def start_preview(self):
        result = self.client.post('/api/gen3/start', json=dict(mode='gait', execution='preview', request_id='test',
            yaw=1, pitch=1, speed=100, ramp=1, duration=3, controller={}, input=packet()), headers=self.headers)
        self.assertEqual(result.status_code, 202, result.get_json())
        return result.get_json()['run_id']

    def test_preview_controller_input_run_isolation_release_and_no_serial(self):
        run_id = self.start_preview()
        bad = self.client.post('/api/gen3/controller', json=dict(packet(1), run_id='old'), headers=self.headers)
        self.assertEqual(bad.status_code, 400)
        good = self.client.post('/api/gen3/controller', json=dict(packet(1), run_id=run_id), headers=self.headers)
        self.assertEqual(good.status_code, 200)
        release = self.client.post('/api/gen3/controller', json=dict(packet(0), run_id=run_id, deadman=False), headers=self.headers)
        self.assertEqual(release.status_code, 200)
        self.c.thread.join(2)
        self.assertFalse(self.c.state['busy'])
        self.assertEqual(self.c.state['telemetry'], {})

    @patch('surge_control.gen3.time.time_ns', return_value=123456789)
    def test_old_start_retry_returns_original_id_and_cannot_control_new_run(self, _clock):
        first = self.start_preview()
        self.c.stop()
        self.c.thread.join(2)
        original = self.c.start_requests[(self.headers['X-Session-ID'], 'test')]
        self.c.start(dict(original, request_id='second', input=packet()), session_id=self.headers['X-Session-ID'])
        self.assertNotEqual(first, self.c.active_run_id)
        result = self.client.post('/api/gen3/start', json=original, headers=self.headers)
        self.assertEqual(result.status_code, 202)
        self.assertEqual(result.get_json()['run_id'], first)
        stale = self.client.post('/api/gen3/controller', json=dict(packet(1), run_id=first), headers=self.headers)
        self.assertEqual(stale.status_code, 400)

    def test_backend_stops_stale_input_without_status_poll(self):
        self.start_preview()
        self.c.thread.join(2)
        self.assertFalse(self.c.state['busy'])
        self.assertTrue(self.c.cancel.is_set())

    def test_physical_navigation_rejected_before_opening_hardware(self):
        response = self.client.post('/api/gen3/start', json=dict(mode='gait', execution='hardware', port='FAKE',
            request_id='test', controller=dict(assist='heading'), input=packet()), headers=self.headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn('localization', response.get_json()['error'])

    def test_mocked_hardware_expiry_performs_disconnect_cleanup(self):
        class Hardware:
            def __init__(self):
                self.positions = {i: 2048 for i in range(1, 11)}
                self.closed = False
                self.started = False
            def connect(self): return True, 'Offline hardware stub'
            def start(self): self.started = True
            def read_telemetry(self):
                return {i: dict(valid=True, position=v, velocity=0, load=0) for i, v in self.positions.items()}
            def write_positions(self, positions, **kw): self.positions = positions
            def disconnect(self): self.closed = True
        hardware = Hardware()
        self.c.hardware_factory = lambda **kw: hardware
        response = self.client.post('/api/gen3/start', json=dict(mode='gait', execution='hardware', port='OFFLINE',
            request_id='mock', yaw=1, pitch=1, speed=100, ramp=1, duration=3, controller={}, input=packet()), headers=self.headers)
        self.assertEqual(response.status_code, 202, response.get_json())
        self.c.thread.join(2)
        self.assertFalse(self.c.state['busy'])
        self.assertTrue(hardware.started)
        self.assertTrue(hardware.closed)
        self.assertTrue(self.c.cancel.is_set())

    def test_localization_feed_rejects_replay_and_reset_during_motion(self):
        data = dict(generation='3', frame='world', reference='head', source='offline-camera', sequence=0,
                    captured_at=time.time(), x=0, y=0, yaw=0)
        self.assertEqual(self.client.post('/api/localization', json=data, headers=self.headers).status_code, 200)
        self.assertEqual(self.client.post('/api/localization', json=data, headers=self.headers).status_code, 400)
        self.start_preview()
        self.assertEqual(self.client.post('/api/localization', json=dict(generation='3', reset=True), headers=self.headers).status_code, 409)


class PlanarManualTests(unittest.TestCase):
    class Fake:
        def __init__(self):
            self.positions = {i: 2048 for i in range(1, 11)}
            self.writes = []
            self.stops = 0
            self.missing = False
        def start(self): pass
        def stop(self): self.stops += 1
        def disconnect(self): self.stop()
        def write_positions(self, positions, **kw):
            self.writes.append(positions)
            self.positions = positions
        def read_telemetry(self):
            return {} if self.missing else {i: dict(valid=True, position=v, velocity=0, load=0) for i, v in self.positions.items()}

    def setUp(self):
        self.c = ControlRuntime()
        self.fake = self.Fake()
        self.c.iface = self.fake
        self.c.state.update(is_running=True, is_paused=True, engine='ST3215')

    def test_preflight_missing_servo_does_not_start_or_send_position(self):
        self.fake.missing = True
        with self.assertRaises(RuntimeError): self.c.controller(dict(packet(), btn_start=True), now=0)
        self.assertFalse(self.fake.writes)
        self.assertTrue(self.c.state['is_paused'])

    def test_manual_speed_bounds_at_high_gait_speed_and_missing_feedback_stop(self):
        self.c.state['params']['speed'] = 3
        self.c.controller(dict(packet(stick_x=1), btn_start=True), now=0)
        previous = dict(self.fake.positions)
        for n in range(1, 30):
            self.c.controller(dict(packet(n, stick_x=1), run_id=self.c.controller_run_id), now=n * .02)
            self.c.tick(.02, now=n * .02)
            for sid, value in self.fake.positions.items():
                self.assertLessEqual(abs(value - previous[sid]), 49)
            previous = dict(self.fake.positions)
        self.fake.missing = True
        self.c.tick(.02, now=.6)
        self.assertTrue(self.c.state['is_paused'])
        self.assertGreater(self.fake.stops, 0)

    def test_physical_heading_hold_stops_when_localization_expires(self):
        self.c.localization.update(dict(frame='world', reference='head', source='camera', sequence=0,
                                       captured_at=time.time(), x=0, y=0, yaw=0), now=0)
        self.c.controller(dict(packet(), btn_start=True, options=dict(assist='heading', localization_verified=True, steering_sign=1)), now=0)
        self.c.controller(dict(packet(1), run_id=self.c.controller_run_id), now=.55)
        self.c.tick(.02, now=.55)
        self.assertTrue(self.c.state['is_paused'])
        self.assertFalse(self.fake.writes)

    def test_repeated_clock_cannot_reuse_controller_run_id(self):
        with patch('surge_control.runtime.time.time_ns', return_value=123):
            self.c.controller(dict(packet(), btn_start=True), now=0)
            first = self.c.controller_run_id
            self.c.pause()
            self.c.controller(dict(packet(), btn_start=True), now=.1)
            self.assertNotEqual(first, self.c.controller_run_id)
            with self.assertRaises(ValueError): self.c.controller(dict(packet(1), run_id=first), now=.2)


if __name__ == '__main__': unittest.main()

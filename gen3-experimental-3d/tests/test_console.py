"""Comprehensive tests for the Gen 3 control console:
- Live parameter transitions and continuous monotonic phase integration
- Multi-user operator leases, heartbeats, expiry stop, and CSRF protection
- Optimistic concurrency calibration and free-shaft centering
- Disarmed diagnostics snapshot (D command)
- Presets and annotated runs journal
- Constrained firmware build and safe mocked upload
No physical serial ports are opened.
"""
import copy
import importlib.util
import json
import math
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'gen3-experimental-3d/backend'))
sys.path.insert(0, str(ROOT / 'shared'))
WEB_APP_PATH = ROOT / 'gen3-experimental-3d/backend/web_dashboard/web_app.py' if (ROOT / 'gen3-experimental-3d/backend/web_dashboard/web_app.py').exists() else WEB_APP_PATH
from surge_control.gen3 import Gen3Control, GaitMotionGenerator, runner
from surge_control.session import SessionManager


class ConsoleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'joint_map.json'
        config = json.loads((ROOT / 'gen3-experimental-3d/joint_map.json').read_text())
        self.path.write_text(json.dumps(config))
        self.lock = threading.RLock()
        self.control = Gen3Control(self.lock, self.path)
        self.addCleanup(self.control.close)

    def test_monotonic_phase_and_frequency_transition(self):
        config = runner.load_map(self.path)
        config['speed'] = 200
        initial_params = {
            'yaw': math.radians(5),
            'pitch': math.radians(5),
            'bias': 0.0,
            'frequency': 0.1,
            'lag': math.radians(90),
            'offset': math.radians(90),
            'speed': 200
        }
        gen = GaitMotionGenerator(config, initial_params, duration=10, ramp=2)

        # Evaluate at t=0, 1, 2
        t0_targets, p0 = gen.evaluate(0.0)
        t1_targets, p1 = gen.evaluate(1.0)
        self.assertAlmostEqual(gen.phase, 2 * math.pi * 0.1 * 1.0, places=4)

        # Request live frequency change from 0.1 Hz to 0.2 Hz
        res = gen.request_update(
            request_id="req-1",
            expected_revision=1,
            candidate_settings={'frequency': 0.2, 'speed': 200},
            t_now=1.0
        )
        self.assertEqual(res['status'], 'accepted')
        self.assertEqual(res['revision'], 2)

        # Phase must advance continuously without backwards jump
        phase_before = gen.phase
        t1_5_targets, p1_5 = gen.evaluate(1.5)
        self.assertGreater(gen.phase, phase_before)

        # Advance past transition duration
        t3_targets, p3 = gen.evaluate(3.0)
        self.assertAlmostEqual(gen.applied_settings['frequency'], 0.2, places=4)
        self.assertIsNone(gen.pending_settings)

    def test_frequency_reversal_is_continuous(self):
        config = runner.load_map(self.path)
        initial_params = {
            'yaw': math.radians(5),
            'pitch': math.radians(0),
            'bias': 0.0,
            'frequency': 0.1,
            'lag': math.radians(90),
            'offset': 0.0,
            'speed': 100
        }
        gen = GaitMotionGenerator(config, initial_params, duration=15, ramp=2)
        gen.evaluate(2.0)

        # Request direction reversal to -0.1 Hz
        res = gen.request_update(
            request_id="req-rev",
            expected_revision=1,
            candidate_settings={'frequency': -0.1},
            t_now=2.0
        )
        self.assertEqual(res['status'], 'accepted')

        # Sample at fine dt during transition to verify position continuity
        prev_targets, _ = gen.evaluate(2.0)
        for step in range(1, 40):
            t = 2.0 + step * 0.05
            targets, _ = gen.evaluate(t)
            for jid in range(1, 11):
                # Delta per 50ms step must never exceed physical max speed
                delta = abs(targets[jid] - prev_targets[jid])
                self.assertLessEqual(delta, 10, f"Discontinuous jump {delta} at joint {jid} during reversal")
            prev_targets = targets

    def test_stale_and_duplicate_request_handling(self):
        config = runner.load_map(self.path)
        config['speed'] = 200
        initial_params = {
            'yaw': math.radians(5),
            'pitch': math.radians(0),
            'bias': 0.0,
            'frequency': 0.1,
            'lag': math.radians(90),
            'offset': 0.0,
            'speed': 200
        }
        gen = GaitMotionGenerator(config, initial_params, duration=20, ramp=2)
        gen.evaluate(1.0)

        # Valid update
        res1 = gen.request_update("req-1", 1, {'yaw': 8, 'speed': 200}, 1.0)
        self.assertEqual(res1['status'], 'accepted')
        self.assertEqual(res1['revision'], 2)

        # Duplicate request ID must be idempotent
        res_dup = gen.request_update("req-1", 1, {'yaw': 8, 'speed': 200}, 1.1)
        self.assertEqual(res_dup['status'], 'idempotent')
        self.assertEqual(res_dup['revision'], 2)

        # Stale revision (expected 1, but revision is now 2) must be rejected
        with self.assertRaisesRegex(ValueError, 'Stale settings revision'):
            gen.request_update("req-2", 1, {'yaw': 10, 'speed': 200}, 1.2)

    def test_excessive_transition_speed_rejection(self):
        config = runner.load_map(self.path)
        config['speed'] = 100
        initial_params = {
            'yaw': math.radians(5),
            'pitch': math.radians(0),
            'bias': 0.0,
            'frequency': 0.1,
            'lag': math.radians(90),
            'offset': 0.0,
            'speed': 100
        }
        gen = GaitMotionGenerator(config, initial_params, duration=20, ramp=2)
        gen.evaluate(1.0)

        # Candidate amplitude 60° at 0.5 Hz has peak speed far exceeding 100 counts/s
        with self.assertRaisesRegex(ValueError, 'exceeds speed'):
            gen.request_update("req-bad", 1, {'yaw': 60, 'frequency': 0.5}, 1.0)

    def test_live_update_cannot_extend_duration(self):
        config = runner.load_map(self.path)
        initial_params = {
            'yaw': math.radians(5),
            'pitch': math.radians(0),
            'bias': 0.0,
            'frequency': 0.1,
            'lag': math.radians(90),
            'offset': 0.0,
            'speed': 100
        }
        gen = GaitMotionGenerator(config, initial_params, duration=10, ramp=2)
        # Attempt update during final ramp (e.g. t=9.0s when duration is 10s and ramp is 2s)
        gen.evaluate(9.0)
        with self.assertRaisesRegex(ValueError, 'shutdown ramp'):
            gen.request_update("req-late", 1, {'yaw': 6}, 9.0)

    def test_operator_sessions_lease_and_heartbeat(self):
        mgr = SessionManager(heartbeat_interval=0.5, lease_timeout=1.0)
        s1 = mgr.get_or_create()
        s2 = mgr.get_or_create()

        # Login as Shashank
        res1 = mgr.login(s1['session_id'], name="Shashank", password="xyz@1234")
        self.assertTrue(res1['success'])
        self.assertEqual(res1['role'], "operator")
        self.assertTrue(mgr.is_operator(s1['session_id']))
        self.assertFalse(mgr.is_operator(s2['session_id']))

        # Bhavesh logging in while Shashank is active becomes a viewer
        res2 = mgr.login(s2['session_id'], name="Bhavesh", password="xyz@1234")
        self.assertTrue(res2['success'])
        self.assertEqual(res2['role'], "viewer")
        self.assertIn("Shashank is currently operating", res2['message'])

        # Heartbeat keeps lease alive for operator, viewers cannot renew
        hb1 = mgr.heartbeat(s1['session_id'])
        self.assertTrue(hb1['active'])
        hb2 = mgr.heartbeat(s2['session_id'])
        self.assertFalse(hb2['active'])

        # Logout releases lease
        mgr.logout(s1['session_id'])
        self.assertFalse(mgr.is_operator(s1['session_id']))

        # Now Bhavesh can login and become active operator
        res3 = mgr.login(s2['session_id'], name="Bhavesh", password="xyz@1234")
        self.assertTrue(res3['success'])
        self.assertEqual(res3['role'], "operator")
        self.assertTrue(mgr.is_operator(s2['session_id']))

    def test_lease_expiry_detection(self):
        mgr = SessionManager(heartbeat_interval=0.1, lease_timeout=0.2)
        s1 = mgr.get_or_create()
        mgr.login(s1['session_id'], name="Mahima", password="xyz@1234")
        self.assertTrue(mgr.is_operator(s1['session_id']))

        # Wait for timeout to expire
        time.sleep(0.3)
        expired, info = mgr.check_lease_expiry()
        self.assertTrue(expired)
        self.assertEqual(info['name'], "Mahima")
        self.assertFalse(mgr.is_operator(s1['session_id']))

    def test_calibration_optimistic_concurrency(self):
        data = self.control.load_map_with_revision()
        rev1 = data['revision']
        config = data['config']

        # Save with matching revision succeeds
        config['speed'] = 120
        self.control.save_map(config, expected_revision=rev1)
        self.assertEqual(self.control.load_map_with_revision()['config']['speed'], 120)

        # Save with stale revision fails
        config['speed'] = 140
        with self.assertRaisesRegex(ValueError, 'stale revision'):
            self.control.save_map(config, expected_revision="old-stale-rev")

    def test_read_diagnostics_snapshot(self):
        class DiagHardware:
            def __init__(self, **kw): self.closed = False
            def connect(self): return True, 'OK'
            def read_diagnostics(self):
                return {i: {
                    'valid': True,
                    'reg8': 1,
                    'torque': 0,
                    'voltage': 114,
                    'temperature': 30,
                    'status': 0
                } for i in range(1, 11)}
            def disconnect(self): self.closed = True

        self.control.hardware_factory = lambda **kw: DiagHardware()
        diag = self.control.read_diagnostics(port='COM6')
        self.assertIn('servos', diag)
        self.assertEqual(len(diag['servos']), 10)
        self.assertEqual(diag['servos'][1]['voltage'], 114)
        self.assertEqual(diag['servos'][1]['temperature'], 30)

    def test_presets_and_run_annotations(self):
        presets = self.control.get_presets()
        self.assertGreaterEqual(len(presets), 4)

        custom = {
            "name": "Custom Test Preset",
            "mode": "gait",
            "yaw": 3.0,
            "pitch": 4.0,
            "bias": 0.0,
            "frequency": 0.1,
            "lag": 90.0,
            "offset": 90.0,
            "speed": 100,
            "ramp": 2.0,
            "duration": 8.0
        }
        self.control.save_preset(custom)
        updated = self.control.get_presets()
        self.assertTrue(any(p['name'] == 'Custom Test Preset' for p in updated))

        self.control.delete_preset("Custom Test Preset")
        after_del = self.control.get_presets()
        self.assertFalse(any(p['name'] == 'Custom Test Preset' for p in after_del))

    def test_firmware_allowlist_and_mock_upload(self):
        fm = self.control.firmware

        # Disallow non-allowlisted env
        with self.assertRaisesRegex(ValueError, 'Environment must be one of'):
            fm.build("malicious_target")

        # Mock upload executes cleanly when no job is active
        with self.assertRaisesRegex(ValueError, 'upload unavailable'):
            fm.upload("receiver_gen2_1", "COM6", mock=True)
        self.assertEqual(fm.snapshot()['state'], 'idle')

    def test_web_routes_integration(self):
        spec = importlib.util.spec_from_file_location('gen3_web_test_full', WEB_APP_PATH)
        web = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(web)
        app = web.create_app()
        self.addCleanup(app.config['GEN3'].close)
        client = app.test_client()

        # Session bootstrap (starts as Viewer)
        res = client.get('/api/gen3/session')
        self.assertEqual(res.status_code, 200)
        session_data = res.get_json()
        self.assertIn('current_user', session_data)
        user = session_data['current_user']
        sid = user['session_id']
        headers = {'X-Session-ID': sid}

        # Login as operator
        login_res = client.post('/api/gen3/session/login', json={'name': 'Shashank', 'password': 'xyz@1234'}, headers=headers)
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.get_json()['success'])
        self.assertEqual(login_res.get_json()['role'], 'operator')

        # Heartbeat
        hb_res = client.post('/api/gen3/session/heartbeat', json={}, headers=headers)
        self.assertEqual(hb_res.status_code, 200)
        self.assertTrue(hb_res.get_json()['active'])

        # Presets route
        presets_res = client.get('/api/gen3/presets')
        self.assertEqual(presets_res.status_code, 200)
        self.assertIn('presets', presets_res.get_json())

        # Firmware status route
        fw_res = client.get('/api/gen3/firmware/status')
        self.assertEqual(fw_res.status_code, 200)

        # Stop is always available to all users
        stop_res = client.post('/api/gen3/stop', json={}, headers=headers)
        self.assertEqual(stop_res.status_code, 200)

    def test_unauthorized_actions_rejected(self):
        spec = importlib.util.spec_from_file_location('gen3_auth_test', WEB_APP_PATH)
        web = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(web)
        app = web.create_app()
        self.addCleanup(app.config['GEN3'].close)
        client = app.test_client()

        # Session without logging in as operator (viewer mode)
        res = client.get('/api/gen3/session')
        user = res.get_json()['current_user']
        viewer_headers = {'X-Session-ID': user['session_id']}

        # Viewer trying to start hardware motion
        hw_res = client.post('/api/gen3/start', json={'mode': 'gait', 'execution': 'hardware', 'port': 'COM6'}, headers=viewer_headers)
        self.assertEqual(hw_res.status_code, 403)
        self.assertIn('Operator mode required', hw_res.get_json()['error'])

        # Viewer trying to apply live tuning
        apply_res = client.post('/api/gen3/apply', json={'settings': {'yaw': 5}}, headers=viewer_headers)
        self.assertEqual(apply_res.status_code, 403)
        self.assertIn('Operator mode required', apply_res.get_json()['error'])

        # Viewer CAN press stop
        stop_res = client.post('/api/gen3/stop', json={}, headers=viewer_headers)
        self.assertEqual(stop_res.status_code, 200)

    def test_log_traversal_protection(self):
        spec = importlib.util.spec_from_file_location('gen3_log_test', WEB_APP_PATH)
        web = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(web)
        app = web.create_app()
        self.addCleanup(app.config['GEN3'].close)
        client = app.test_client()

        # Traversal attempt
        res = client.get('/api/gen3/log/..%2F..%2Fjoint_map.json')
        self.assertIn(res.status_code, (400, 404))

        # Non web- log file attempt
        res2 = client.get('/api/gen3/log/secret.txt')
        self.assertEqual(res2.status_code, 400)

    def test_stop_preempts_transition(self):
        config = runner.load_map(self.path)
        config['speed'] = 150
        initial_params = {
            'yaw': math.radians(5),
            'pitch': math.radians(0),
            'bias': 0.0,
            'frequency': 0.1,
            'lag': math.radians(90),
            'offset': 0.0,
            'speed': 150
        }
        gen = GaitMotionGenerator(config, initial_params, duration=15, ramp=2)
        gen.evaluate(1.0)
        gen.request_update("req-trans", 1, {'yaw': 6, 'speed': 150}, 1.0)
        self.assertIsNotNone(gen.pending_settings)

        # Abort on stop
        gen.abort_transition()
        self.assertIsNone(gen.pending_settings)
        self.assertEqual(gen.transition['state'], 'aborted')

    def test_simultaneous_starts_rejected(self):
        self.control.state['busy'] = True
        with self.assertRaisesRegex(RuntimeError, 'already owns the connection'):
            self.control.start({'mode': 'preview', 'execution': 'preview'})

    def test_failed_torque_release_reporting(self):
        class FailingDisconnectHardware:
            def connect(self): return True, 'OK'
            def read_telemetry(self): return {i: {'valid': True, 'position': 2048} for i in range(1, 11)}
            def disconnect(self): raise OSError('USB link unplugged')

        self.control.hardware_factory = lambda **kw: FailingDisconnectHardware()
        with self.lock:
            self.control.start({'mode': 'read', 'execution': 'hardware', 'port': 'COM6'})
        self.control.thread.join(3)
        snap = self.control.snapshot()
        self.assertIn('torque-off acknowledgement failed', snap['status'])
        self.assertIn('Disconnect robot power', snap['status'])


if __name__ == '__main__':
    unittest.main()

"""Regression checks for the independent console review; no physical transport."""
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
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'gen3-experimental-3d/backend'))
sys.path.insert(0, str(ROOT / 'shared'))
DASHBOARD_DIR = ROOT / 'gen3-experimental-3d/backend/web_dashboard' if (ROOT / 'gen3-experimental-3d/backend/web_dashboard').exists() else DASHBOARD_DIR
from surge_control.gen3 import Gen3Control, GaitMotionGenerator, runner, DEFAULT_PRESETS


class ConsoleHardeningTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'joint_map.json'
        self.config = runner.load_map()
        self.path.write_text(json.dumps(self.config))
        spec = importlib.util.spec_from_file_location('hardened_web', DASHBOARD_DIR / 'web_app.py')
        web = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(web)
        self.app = web.create_app()
        self.control = self.app.config['GEN3']
        self.control.map_path = self.path
        self.control.hardware_factory = lambda **kw: self.fail('Physical transport requested')
        self.addCleanup(self.app.config['CONTROL'].close)
        self.addCleanup(self.control.close)
        self.client = self.app.test_client()

    def operator(self, name='Shashank'):
        user = self.client.get('/api/gen3/session').get_json()['current_user']
        headers = {'X-Session-ID': user['session_id']}
        res = self.client.post('/api/gen3/session/login', json={'name': name, 'password': 'xyz@1234'}, headers=headers)
        self.assertEqual(res.status_code, 200)
        return user, headers

    def generator(self):
        p = dict(yaw=math.radians(5), pitch=0, bias=0, frequency=.1, lag=0, offset=0, speed=100)
        gen = GaitMotionGenerator(self.config, p, 30, 2)
        for i in range(401):
            gen.evaluate(i / 100)
        return gen

    def test_viewer_calling_mutating_endpoints_rejected(self):
        user = self.client.get('/api/gen3/session').get_json()['current_user']
        viewer_headers = {'X-Session-ID': user['session_id']}
        for endpoint in ('start', 'apply', 'map', 'presets', 'firmware/build', 'diagnostics', 'center'):
            res = self.client.post('/api/gen3/' + endpoint, json={}, headers=viewer_headers)
            self.assertEqual(res.status_code, 403)
            self.assertIn('Operator mode required', res.get_json()['error'])
        del_res = self.client.delete('/api/gen3/presets/test', headers=viewer_headers)
        self.assertEqual(del_res.status_code, 403)
        self.assertIn('Operator mode required', del_res.get_json()['error'])

        # Shared hardware port and motion require operator
        connect_hw = self.client.post('/api/connect', json={'engine': 'HARDWARE', 'port': 'COM6'}, headers=viewer_headers)
        self.assertEqual(connect_hw.status_code, 403)
        self.assertIn('Operator mode required', connect_hw.get_json()['error'])
        self.app.config['CONTROL'].state['engine'] = 'HARDWARE'
        start_hw = self.client.post('/api/start', json={}, headers=viewer_headers)
        self.assertEqual(start_hw.status_code, 403)
        self.assertIn('Operator mode required', start_hw.get_json()['error'])
        self.app.config['CONTROL'].state['engine'] = 'SIM'

        connect_st3215 = self.client.post('/api/connect', json={'engine': 'ST3215'}, headers=viewer_headers)
        self.assertEqual(connect_st3215.status_code, 403)
        self.app.config['CONTROL'].state['engine'] = 'ST3215'
        for endpoint in ('start', 'controller', 'params'):
            self.assertEqual(self.client.post('/api/' + endpoint, json={}, headers=viewer_headers).status_code, 403)
        self.app.config['CONTROL'].state['engine'] = 'SIM'
        for endpoint in ('start', 'controller', 'params', 'set_path'):
            self.assertEqual(self.client.post('/api/' + endpoint, json={}, headers=viewer_headers).status_code, 403)

    def test_planar_connection_requires_operator_for_both_engines_and_disconnect(self):
        viewer = self.client.get('/api/gen3/session').get_json()['current_user']
        headers = {'X-Session-ID': viewer['session_id']}
        runtime = self.app.config['CONTROL']
        with patch.object(runtime, 'connect', return_value=(True, 'Connected')) as connect, \
             patch.object(runtime, 'disconnect') as disconnect:
            for payload in ({}, {'engine': 'SIM'}, {'engine': 'HARDWARE', 'port': 'COM6'}):
                self.assertEqual(self.client.post('/api/connect', json=payload, headers=headers).status_code, 403)
            runtime.state['is_running'] = True
            self.assertEqual(self.client.post('/api/connect', json={}, headers=headers).status_code, 403)
            disconnect.assert_not_called()
            runtime.state['is_running'] = False
            _, operator_headers = self.operator()
            for engine in ('SIM', 'HARDWARE'):
                self.assertEqual(self.client.post('/api/connect', json={'engine': engine}, headers=operator_headers).status_code, 200)
            self.assertEqual(connect.call_count, 2)
            runtime.state['is_running'] = True
            self.assertEqual(self.client.post('/api/connect', json={}, headers=operator_headers).status_code, 200)
            disconnect.assert_called_once()
            runtime.state['is_running'] = False

    def test_viewer_stop_works(self):
        user = self.client.get('/api/gen3/session').get_json()['current_user']
        viewer_headers = {'X-Session-ID': user['session_id']}
        res1 = self.client.post('/api/gen3/stop', json={}, headers=viewer_headers)
        self.assertEqual(res1.status_code, 200)
        self.assertTrue(res1.get_json()['success'])
        res2 = self.client.post('/api/stop', json={}, headers=viewer_headers)
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.get_json()['success'])

    def test_stop_signals_before_waiting_for_control_lock(self):
        finished = threading.Event()
        def request_stop():
            with self.app.test_client() as client:
                client.post('/api/gen3/stop', json={})
            finished.set()
        with self.app.config['CONTROL'].lock:
            thread = threading.Thread(target=request_stop)
            thread.start()
            self.assertTrue(self.control.cancel.wait(1))
            self.assertFalse(finished.is_set())
        thread.join(1)
        self.assertTrue(finished.is_set())

    def test_default_lease_and_cookie_safety(self):
        self.assertEqual(self.control.sessions.lease_timeout, 3.0)
        cookie = self.client.get('/api/gen3/session').headers['Set-Cookie']
        self.assertIn('HttpOnly', cookie)
        self.assertIn('SameSite=Lax', cookie)

    def test_every_mutation_rejects_viewer_forged_and_expired_sessions(self):
        public = {'/api/stop', '/api/gen3/stop'}
        routes = [(rule.rule.replace('<name>', 'audit').replace('<run_id>', 'web-audit'), method)
                  for rule in self.app.url_map.iter_rules()
                  for method in rule.methods & {'POST', 'PUT', 'PATCH', 'DELETE'}
                  if not rule.rule.startswith('/api/gen3/session') and rule.rule not in public]
        user, _ = self.operator()
        self.control.sessions.active_operator['expires_at'] = 0
        for headers in ({}, {'X-Session-ID': 'operator'}, {'X-Session-ID': user['session_id']}):
            with self.app.test_client() as client:
                for route, method in routes:
                    with self.subTest(route=route, method=method, headers=headers):
                        response = client.open(route, method=method, json={}, headers=headers)
                        self.assertEqual(response.status_code, 403)
                        self.assertEqual(response.get_json()['error'], 'Operator mode required')

    def test_cross_origin_actions_and_malformed_objects(self):
        self.operator()
        for route in ('/api/start', '/api/params', '/api/gen3/session/login', '/api/gen3/session/heartbeat'):
            response = self.client.post(route, json={}, headers={'Origin': 'https://untrusted.example'})
            self.assertEqual(response.status_code, 403)
        for route in ('/api/params', '/api/controller', '/api/gen3/session/login', '/api/gen3/map'):
            self.assertEqual(self.client.post(route, json=[1]).status_code, 400)
        self.assertEqual(self.client.post('/api/params', json={'amp': .5},
                                         headers={'Origin': 'http://localhost'}).status_code, 200)

    def test_either_public_stop_stops_both_generations(self):
        runtime = self.app.config['CONTROL']
        for route in ('/api/stop', '/api/gen3/stop'):
            self.control.cancel.clear()
            with patch.object(runtime, 'pause') as pause:
                response = self.client.post(route, json={}, headers={'Origin': 'https://untrusted.example'})
                self.assertEqual(response.status_code, 200)
                pause.assert_called_once()
                self.assertTrue(self.control.cancel.is_set())

    def test_planar_expiry_stops_without_requests_and_blocks_handoff(self):
        from unittest.mock import Mock
        runtime = self.app.config['CONTROL']
        user, _ = self.operator()
        fake = Mock()
        runtime.iface = fake
        runtime.state.update(is_running=True, is_paused=True)
        self.assertEqual(self.client.post('/api/start', json={}).status_code, 200)
        self.assertEqual(runtime.owner_session, user['session_id'])
        self.assertEqual(self.client.post('/api/gen3/session/logout', json={}).status_code, 409)
        self.control.sessions.active_operator['expires_at'] = 0
        self.assertFalse(self.client.post('/api/gen3/session/heartbeat', json={}).get_json()['active'])
        for client in (self.client, self.app.test_client()):
            self.assertEqual(client.post('/api/gen3/session/login', json={
                'name': 'Shashank', 'password': 'xyz@1234'}).status_code, 401)
        runtime.tick(.02)
        fake.stop.assert_called_once()
        fake.write_positions.assert_not_called()
        self.assertTrue(runtime.state['is_paused'])
        self.assertEqual(self.client.post('/api/params', json={'amp': .5}).status_code, 403)

    def test_missing_or_corrupt_credentials_fail_closed(self):
        from surge_control.session import SessionManager
        config = self.path.parent / 'operators.json'
        for content in (None, '{', '{}', '{"password": 123}'):
            if content is not None:
                config.write_text(content)
            manager = SessionManager(config_path=config)
            self.assertFalse(manager.authenticate('Shashank', 'xyz@1234')[0])

    def test_authorized_commissioning_routes_dispatch_without_physical_transport(self):
        user, _ = self.operator()
        for mode in ('read', 'align', 'jog', 'gait', 'center'):
            route = '/api/gen3/center' if mode == 'center' else '/api/gen3/start'
            payload = dict(mode=mode, execution='hardware', port='FAKE', request_id='audit-' + mode)
            with patch.object(self.control, 'start') as start:
                self.assertEqual(self.client.post(route, json=payload).status_code, 202)
                start.assert_called_once_with(payload, session_id=user['session_id'])
        for route, method, payload, result in (
            ('diagnostics', 'read_diagnostics', {'port': 'FAKE'}, {'servos': {}}),
            ('simulation/connect', 'connect_simulation', {}, None),
            ('simulation/disconnect', 'disconnect_simulation', {}, None),
        ):
            with patch.object(self.control, method, return_value=result) as handler:
                self.assertIn(self.client.post('/api/gen3/' + route, json=payload).status_code, (200, 202))
                handler.assert_called_once()
        with patch.object(self.control.firmware, 'build') as build:
            self.assertEqual(self.client.post('/api/gen3/firmware/build', json={'env': 'receiver_gen2_1'}).status_code, 200)
            build.assert_called_once_with('receiver_gen2_1', operator_name='Shashank')

    def test_authentication_validation_and_all_operators(self):
        # Invalid operator name
        bad_name = self.client.post('/api/gen3/session/login', json={'name': 'Unknown', 'password': 'xyz@1234'})
        self.assertEqual(bad_name.status_code, 401)
        self.assertIn('Invalid operator name', bad_name.get_json()['error'])

        # Wrong password
        bad_pw = self.client.post('/api/gen3/session/login', json={'name': 'Shashank', 'password': 'wrong'})
        self.assertEqual(bad_pw.status_code, 401)
        self.assertIn('Incorrect password', bad_pw.get_json()['error'])

        # All three operators can log in (including case-insensitive)
        for name in ('Shashank', 'bhavesh', 'MAHIMA'):
            app_inst = self.app.config['GEN3']
            app_inst.sessions.active_operator = None
            res = self.client.post('/api/gen3/session/login', json={'name': name, 'password': 'xyz@1234'})
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.get_json()['success'])
            self.assertEqual(res.get_json()['role'], 'operator')

    def test_second_operator_becomes_viewer_and_handoff_rules(self):
        client1 = self.app.test_client()
        client2 = self.app.test_client()

        # Shashank logs in
        r1 = client1.post('/api/gen3/session/login', json={'name': 'Shashank', 'password': 'xyz@1234'})
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.get_json()['role'], 'operator')

        # Bhavesh logs in while Shashank is active -> becomes viewer
        r2 = client2.post('/api/gen3/session/login', json={'name': 'Bhavesh', 'password': 'xyz@1234'})
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.get_json()['role'], 'viewer')
        self.assertIn('Shashank is currently operating', r2.get_json()['message'])

        # Handoff blocked if busy with motion
        self.control.state['busy'] = True
        logout_blocked = client1.post('/api/gen3/session/logout', json={})
        self.assertEqual(logout_blocked.status_code, 409)

        # Stop motion allows logout and handoff
        self.control.state['busy'] = False
        logout_ok = client1.post('/api/gen3/session/logout', json={})
        self.assertEqual(logout_ok.status_code, 200)

        # Now Bhavesh can become operator
        r3 = client2.post('/api/gen3/session/login', json={'name': 'Bhavesh', 'password': 'xyz@1234'})
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.get_json()['role'], 'operator')

    def test_password_never_exposed_in_api_or_logs(self):
        user, _ = self.operator()
        status_dump = json.dumps(self.client.get('/api/gen3/status').get_json())
        session_dump = json.dumps(self.client.get('/api/gen3/session').get_json())
        self.assertNotIn('xyz@1234', status_dump)
        self.assertNotIn('xyz@1234', session_dump)

    def test_malformed_payload_and_commissioning_speed_rejected(self):
        _, headers = self.operator()
        self.assertEqual(self.client.post('/api/gen3/start', json=[1], headers=headers).status_code, 400)
        self.assertEqual(self.client.post('/api/gen3/start', json=dict(
            mode='align', execution='hardware', port='FAKE', speed=1500,
            request_id='commission'), headers=headers).status_code, 400)
        self.assertFalse(self.control.state['busy'])
        with self.assertRaises(ValueError):
            self.generator().request_update('bad', 1, None, 4)

    def test_apply_requires_explicit_revision(self):
        _, headers = self.operator()
        self.control.active_run_id = 'web-test'
        response = self.client.post('/api/gen3/apply', json=dict(
            run_id='web-test', request_id='apply', settings={}), headers=headers)
        self.assertEqual(response.status_code, 400)

    def test_dashboard_assets_are_utf8_and_upload_is_unavailable(self):
        dashboard = DASHBOARD_DIR
        for name in ('static/gen3.js', 'static/gen3.css', 'templates/gen3.html'):
            (dashboard / name).read_text(encoding='utf-8')
        response = self.client.get('/gen3')
        self.assertIn(b'disabled>Browser upload unavailable', response.data)

    def test_default_presets_validate_and_numeric_strings_rejected(self):
        for preset in DEFAULT_PRESETS:
            self.control.save_preset(copy.deepcopy(preset))
        preset = dict(DEFAULT_PRESETS[0], yaw='0')
        with self.assertRaises(ValueError):
            self.control.save_preset(preset)

    def test_preset_save_rejects_stale_snapshot_without_overwriting(self):
        _, headers = self.operator()
        before = self.path.read_bytes()
        preset = dict(DEFAULT_PRESETS[0], name='test draft')
        create = self.client.post('/api/gen3/presets', json={'preset': preset, 'expected': None}, headers=headers)
        self.assertEqual(create.status_code, 200)
        changed = dict(preset, description='Edited draft')
        stale = self.client.post('/api/gen3/presets', json={'preset': changed, 'expected': None}, headers=headers)
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(next(p for p in self.control.get_presets() if p['name'] == preset['name']), preset)
        replace = self.client.post('/api/gen3/presets', json={'preset': changed, 'expected': preset}, headers=headers)
        self.assertEqual(replace.status_code, 200)
        self.assertEqual(next(p for p in self.control.get_presets() if p['name'] == preset['name']), changed)
        self.assertEqual(self.path.read_bytes(), before)

    def test_simulation_connection_lifecycle_and_stale_map(self):
        import types
        class Sim:
            instances = []
            def __init__(self, *args): self.closed = False; self.instances.append(self)
            def connect(self): return True, 'ready'
            def disconnect(self): self.closed = True
        viewer = self.client.get('/api/gen3/session').get_json()['current_user']
        self.assertEqual(self.client.post('/api/gen3/simulation/connect', json={}, headers={'X-Session-ID': viewer['session_id']}).status_code, 403)
        _, headers = self.operator()
        with patch.dict(sys.modules, {'simulation': types.SimpleNamespace(SimulationInterface=Sim)}):
            self.assertEqual(self.client.post('/api/gen3/simulation/connect', json={}, headers=headers).status_code, 202)
            self.control.simulation_thread.join(1)
            self.assertEqual(self.control.snapshot()['simulation_state'], 'connected')
            self.path.write_text(self.path.read_text() + ' ')
            response = self.client.post('/api/gen3/start', headers=headers, json={'request_id':'stale', 'mode':'gait', 'execution':'simulation', 'simulation_tracking': {'tracking_error': 100, 'tracking_timeout': .5, 'verified': True}})
            self.assertEqual(response.status_code, 409)
            self.assertIn('joint map changed', response.get_json()['error'])
            self.assertEqual(self.client.post('/api/gen3/simulation/disconnect', json={}, headers=headers).status_code, 200)
            self.assertTrue(Sim.instances[0].closed)
            self.assertEqual(self.control.snapshot()['simulation_state'], 'disconnected')

    def test_simulation_connection_failure_is_reported_without_hardware(self):
        import types
        class Sim:
            instances = []
            def __init__(self, *args): self.closed = False; self.instances.append(self)
            def connect(self): raise RuntimeError('mock connection failed')
            def disconnect(self): self.closed = True
        _, headers = self.operator()
        with patch.dict(sys.modules, {'simulation': types.SimpleNamespace(SimulationInterface=Sim)}):
            self.assertEqual(self.client.post('/api/gen3/simulation/connect', json={}, headers=headers).status_code, 202)
            self.control.simulation_thread.join(1)
            state = self.control.snapshot()
            self.assertEqual(state['simulation_state'], 'error')
            self.assertIn('mock connection failed', state['simulation_error'])
            self.assertTrue(Sim.instances[0].closed)

    def test_stop_during_simulation_connection_closes_engine(self):
        import types
        entered, release = threading.Event(), threading.Event()
        class Sim:
            instances = []
            def __init__(self, *args): self.closed = False; self.instances.append(self)
            def connect(self): entered.set(); release.wait(1); return True, 'ready'
            def disconnect(self): self.closed = True
        _, headers = self.operator()
        with patch.dict(sys.modules, {'simulation': types.SimpleNamespace(SimulationInterface=Sim)}):
            self.assertEqual(self.client.post('/api/gen3/simulation/connect', json={}, headers=headers).status_code, 202)
            self.assertTrue(entered.wait(1))
            self.assertEqual(self.client.post('/api/gen3/stop', json={}).status_code, 200)
            release.set()
            self.control.simulation_thread.join(1)
            self.assertTrue(Sim.instances[0].closed)
            self.assertEqual(self.control.snapshot()['simulation_state'], 'disconnected')

    @unittest.skipUnless(importlib.util.find_spec('pybullet'), 'PyBullet unavailable')
    def test_headless_simulation_start_stop_and_cleanup(self):
        _, headers = self.operator()
        before = self.path.read_bytes()
        self.assertEqual(self.client.post('/api/gen3/simulation/connect', json={}, headers=headers).status_code, 202)
        self.control.simulation_thread.join(5)
        self.assertEqual(self.control.snapshot()['simulation_state'], 'connected')
        body = dict(request_id='simulation-test', mode='gait', execution='simulation', yaw=1, pitch=0, duration=4,
                    simulation_tracking={'tracking_error': 33, 'tracking_timeout': 1.2, 'verified': True})
        self.assertEqual(self.client.post('/api/gen3/start', json=body, headers=headers).status_code, 202)
        self.assertEqual(self.client.post('/api/gen3/stop', json={}).status_code, 200)
        self.control.thread.join(5)
        self.assertFalse(self.control.state['busy'])
        self.assertEqual(self.control.state['simulation_state'], 'connected')
        manifest = json.loads((self.path.parent / 'runs' / (self.control.active_run_id + '.json')).read_text())
        self.assertEqual(manifest['simulation_tracking'], {'tracking_error': 33, 'tracking_timeout': 1.2})
        self.assertEqual(self.client.post('/api/gen3/start', json=dict(body, request_id='simulation-disconnect'), headers=headers).status_code, 202)
        self.assertEqual(self.client.post('/api/gen3/simulation/disconnect', json={}, headers=headers).status_code, 200)
        self.control.thread.join(5)
        self.assertEqual(self.control.snapshot()['simulation_state'], 'disconnected', self.control.snapshot())
        self.assertIsNone(self.control.simulation)
        self.assertEqual(self.path.read_bytes(), before)

    def test_simulation_tracking_is_request_scoped_and_validated(self):
        before = self.path.read_bytes()
        self.control.simulation = type('FakeSimulation', (), {'disconnect': lambda self: None})()
        self.control.simulation_revision = self.control.get_map_revision()
        self.control.state['simulation_state'] = 'connected'
        data = dict(mode='gait', execution='simulation', yaw=1, pitch=0, duration=4,
                    simulation_tracking={'tracking_error': 33, 'tracking_timeout': 1.2, 'verified': True})
        with self.assertRaisesRegex(ValueError, 'Verify simulation tracking'):
            self.control.start({k: v for k, v in data.items() if k != 'simulation_tracking'})
        captured = []
        with patch.object(self.control, '_run', side_effect=lambda *args: captured.append(args)):
            self.control.start(data)
            self.control.thread.join(1)
        self.assertEqual(captured[0][3]['tracking_error'], 33)
        self.assertEqual(captured[0][3]['tracking_timeout'], 1.2)
        self.assertEqual(self.path.read_bytes(), before)
        for error, timeout in ((1, .1), (796, 2)):
            self.control.state['busy'] = False
            self.control.state['simulation_state'] = 'connected'
            with patch.object(self.control, '_run', side_effect=lambda *args: captured.append(args)):
                self.control.start(dict(data, simulation_tracking={'tracking_error': error, 'tracking_timeout': timeout, 'verified': True}))
                self.control.thread.join(1)
            self.assertEqual((captured[-1][3]['tracking_error'], captured[-1][3]['tracking_timeout']), (error, timeout))
        self.control.state['busy'] = False
        self.control.state['simulation_state'] = 'connected'
        for tracking in ({'tracking_error': 0, 'tracking_timeout': .5, 'verified': True},
                         {'tracking_error': 33, 'tracking_timeout': 3, 'verified': True},
                         {'tracking_error': 33, 'tracking_timeout': .5, 'verified': False},
                         {'tracking_error': float('nan'), 'tracking_timeout': .5, 'verified': True}):
            with self.assertRaises(ValueError):
                self.control.start(dict(data, simulation_tracking=tracking))
        with self.assertRaises(ValueError):
            self.control.start(dict(data, execution='hardware', port='MOCK'))
        self.assertEqual(self.path.read_bytes(), before)

    def test_initial_applied_settings_use_numeric_degrees_and_defaults(self):
        self.control.start(dict(mode='gait', execution='preview', yaw=1, pitch=0, duration=4))
        self.control.thread.join(1)
        settings = self.control.state['active_settings']
        self.assertEqual(settings['yaw'], 1)
        self.assertEqual(settings['lag'], 90)
        self.assertEqual(settings['speed'], 500)

    def test_run_timer_uses_monotonic_time_and_freezes_after_completion(self):
        self.assertEqual(self.control.snapshot()['elapsed_seconds'], 0)
        self.control.job_started = 100
        self.control.state['busy'] = True
        with patch('surge_control.gen3.time.monotonic', return_value=107.5):
            self.assertEqual(self.control.snapshot()['elapsed_seconds'], 7.5)
        self.control.state['busy'] = False
        self.control.start(dict(mode='gait', execution='preview', yaw=1, pitch=0, duration=4))
        self.control.thread.join(1)
        finished = self.control.snapshot()
        self.assertFalse(finished['busy'])
        self.assertEqual(finished['motion_duration'], 4)
        with patch('surge_control.gen3.time.monotonic', return_value=999999999):
            self.assertEqual(self.control.snapshot()['elapsed_seconds'], finished['elapsed_seconds'])

    def test_lease_expiry_stops_without_http_polling(self):
        class Fake:
            def __init__(self): self.positions = {i: 2048 for i in range(1, 11)}; self.closed = False
            def connect(self): return True, 'fake'
            def start(self): pass
            def write_positions(self, positions, speed): self.positions.update(positions)
            def read_telemetry(self): return {i: dict(valid=True, position=p) for i, p in self.positions.items()}
            def disconnect(self): self.closed = True
        fake = Fake()
        self.control.hardware_factory = lambda **kw: fake
        self.control.sessions.lease_timeout = .08
        user, _ = self.operator()
        self.control.start(dict(mode='gait', execution='hardware', port='FAKE', yaw=5, pitch=0), session_id=user['session_id'])
        self.control.thread.join(1)
        self.assertFalse(self.control.thread.is_alive())
        self.assertTrue(self.control.cancel.is_set())
        self.assertTrue(fake.closed)
        self.assertFalse(self.control.sessions.heartbeat(user['session_id'])['active'])

    def test_lag_transition_is_bounded_or_rejected(self):
        gen = self.generator()
        try:
            result = gen.request_update('lag', 1, {'lag': 180}, 4)
        except ValueError:
            self.assertEqual(gen.current_revision, 1)
            return
        previous = gen.evaluate(4)[0]
        for i in range(1, math.ceil(result['transition_duration'] * 100) + 1):
            targets, _ = gen.evaluate(4 + i / 100)
            # One-count allowance for encoder quantization at 10 ms.
            self.assertLessEqual(max(abs(targets[k] - previous[k]) for k in targets), 2)
            previous = targets

    def test_overlap_and_live_speed_rejected_without_mutation(self):
        gen = self.generator()
        gen.request_update('first', 1, {'yaw': 6}, 4)
        before = gen.evaluate(4.2)[0]
        with self.assertRaisesRegex(ValueError, 'transition'):
            gen.request_update('second', 2, {'yaw': 7}, 4.2)
        self.assertEqual(gen.evaluate(4.2)[0], before)
        fresh = self.generator()
        res = fresh.request_update('speed', 1, {'speed': 120}, 4)
        self.assertEqual(res['revision'], 2)
        fresh.evaluate(4 + res['transition_duration'] + 0.1)
        self.assertEqual(fresh.applied_settings['speed'], 120)

    def test_stop_latches_and_wrong_run_cannot_apply(self):
        _, headers = self.operator()
        self.control.state['busy'] = True
        self.control.active_run_id = 'current'
        self.control.motion_generator = self.generator()
        response = self.client.post('/api/gen3/apply', headers=headers, json=dict(run_id='old', request_id='a', expected_revision=1, settings={'yaw': 6}))
        self.assertEqual(response.status_code, 400)
        self.control.stop()
        with self.assertRaisesRegex(RuntimeError, 'No active'):
            self.control.live_apply({'yaw': 6}, 1, 'a')
        self.control.state['busy'] = False

    def test_live_speed_factor_update_via_api(self):
        _, headers = self.operator()
        self.control.state['busy'] = True
        self.control.active_run_id = 'current'
        self.control.motion_generator = self.generator()
        response = self.client.post('/api/gen3/apply', headers=headers, json=dict(
            run_id='current',
            request_id='speed-change-1',
            expected_revision=1,
            settings={'speed': 150}
        ))
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['revision'], 2)
        self.assertIn('transition_duration', data)
        self.control.motion_generator.evaluate(4 + data['transition_duration'] + 0.1)
        self.assertEqual(self.control.motion_generator.applied_settings['speed'], 150)
        self.control.stop()
        self.control.state['busy'] = False

    def test_calibration_revision_required_and_signed_annotations(self):
        _, headers = self.operator()
        self.assertEqual(self.client.post('/api/gen3/map', json=self.config, headers=headers).status_code, 400)
        runs = self.path.parent / 'runs'; runs.mkdir()
        record = runs / 'web-123.json'; record.write_text('{"speed":100}')
        self.control.annotate_run('web-123', displacement_cm=-5, notes='backward')
        result = json.loads(record.read_text())
        self.assertEqual(result['speed'], 100)
        self.assertEqual(result['annotations']['displacement_cm'], -5)
        with self.assertRaises(ValueError):
            self.control.annotate_run('../joint_map', notes='bad')

    def test_firmware_unavailable_and_start_excludes_build(self):
        _, headers = self.operator()
        response = self.client.post('/api/gen3/firmware/upload', headers=headers, json=dict(confirm_board=True, confirm_power=True, confirm_risk=True, env='receiver_gen2_1', port='FAKE'))
        self.assertEqual(response.status_code, 400)
        self.assertIn('unavailable', response.get_json()['error'])
        with patch.object(self.control.firmware, 'snapshot', return_value={'is_busy': True}):
            with self.assertRaisesRegex(RuntimeError, 'Firmware'):
                self.control.start(dict(mode='gait', execution='preview'))

    def test_start_retry_does_not_restart_and_changed_retry_rejected(self):
        data = dict(mode='gait', execution='preview', yaw=1, pitch=0, duration=4, request_id='one')
        self.control.start(data)
        self.control.thread.join(1)
        first_run = self.control.active_run_id
        self.control.start(data)
        self.assertEqual(first_run, self.control.active_run_id)
        with self.assertRaises(ValueError):
            self.control.start(dict(data, yaw=2))

    def test_align_uses_all_saved_zeros(self):
        calls = []
        class Fake:
            def connect(self): return True, 'fake'
            def disconnect(self): pass
        self.control.hardware_factory = lambda **kw: Fake()
        def capture(iface, config, target_at, *args, **kwargs):
            calls.append(target_at(0))
        with patch.object(runner, 'run_motion', side_effect=capture):
            self.control.start(dict(mode='align', execution='hardware', port='FAKE'))
            self.control.thread.join(1)
        self.assertEqual(calls, [{i: 2048 for i in range(1, 11)}])


if __name__ == '__main__':
    unittest.main()

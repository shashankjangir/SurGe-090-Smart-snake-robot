"""Web commissioning checks; no serial ports are opened."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'generations/gen3-experimental-3d/backend'))
sys.path.insert(0, str(ROOT / 'shared'))
DASHBOARD_DIR = ROOT / 'generations/gen3-experimental-3d/backend/web_dashboard' if (ROOT / 'generations/gen3-experimental-3d/backend/web_dashboard').exists() else DASHBOARD_DIR
from surge_control.gen3 import Gen3Control, runner


class WebTests(unittest.TestCase):
    def test_host_preserves_receiver_servo_diagnostics(self):
        iface = runner.ST3215Interface(port='FAKE')
        class Serial:
            def readline(self): return b'ERR,SERVO,ID=4,OP=TORQUE,RESULT=0,STATUS=32\n'
        iface.serial_port = Serial()
        with self.assertRaisesRegex(RuntimeError, 'ID=4,OP=TORQUE,RESULT=0,STATUS=32'):
            iface._wait('T,')

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'joint_map.json'
        config = json.loads((ROOT / 'generations/gen3-experimental-3d/joint_map.json').read_text())
        config['calibrated'] = False
        self.path.write_text(json.dumps(config))
        self.lock = threading.RLock()
        self.control = Gen3Control(self.lock, self.path)
        self.addCleanup(self.control.close)

    def job(self, data):
        with self.lock:
            self.control.start(data)
        self.control.thread.join(3)
        self.assertFalse(self.control.thread.is_alive())
        return self.control.snapshot()

    def test_hardware_gait_rejects_unmeasured_map_before_connection(self):
        with self.assertRaisesRegex(ValueError, 'Measure joint'):
            self.control.start(dict(mode='gait', execution='hardware', port='FAKE'))
        self.assertFalse(self.control.state['busy'])

    def test_preview_never_opens_hardware_and_keeps_measurements_empty(self):
        self.control.hardware_factory = lambda **kw: self.fail('Hardware opened in preview')
        state = self.job(dict(mode='gait', execution='preview', duration=4, yaw=1, pitch=0))
        self.assertIn('Preview complete', state['status'])
        self.assertEqual(state['telemetry'], {})
        self.assertTrue((self.path.parent / 'runs' / state['log']).exists())

    def test_preview_accepts_3000_and_rejects_above_before_connection(self):
        self.control.hardware_factory = lambda **kw: self.fail('Hardware opened in preview')
        data = dict(mode='gait', execution='preview', duration=4, yaw=1, pitch=0)
        state = self.job(dict(data, speed=3000))
        self.assertIn('Preview complete', state['status'])
        with self.assertRaisesRegex(ValueError, 'speed'):
            self.control.start(dict(data, speed=3001))
        self.assertFalse(self.control.state['busy'])

    def pose_hardware(self, telemetry):
        class Hardware:
            closed = False
            def connect(self): return True, 'Torque off'
            def read_telemetry(self): return telemetry
            def disconnect(self): self.closed = True
        iface = Hardware()
        self.control.hardware_factory = lambda **kw: iface
        return iface

    def test_idle_metrics_refresh_updates_telemetry_voltage_and_timing(self):
        class Hardware:
            closed = False
            voltage = 119
            def connect(self): return True, 'Torque off'
            def read_telemetry(self): return {i: dict(valid=True, position=2048) for i in range(1, 11)}
            def read_diagnostics(self): return {i: dict(valid=True, voltage=self.voltage, temperature=30) for i in range(1, 11)}
            def disconnect(self): self.closed = True
        iface = Hardware()
        self.control.hardware_factory = lambda **kw: iface
        self.control.read_diagnostics('FAKE', sample_telemetry=True)
        first = self.control.snapshot()
        self.assertTrue(iface.closed)
        self.assertEqual(len(first['telemetry']), 10)
        self.assertEqual(first['bus']['kind'], 'idle')
        self.assertGreaterEqual(first['bus']['latency_ms'], 0)
        self.assertEqual(self.control.battery_snapshot()['voltage'], 11.9)
        iface.voltage = 117
        with _patch('surge_control.gen3.time.time', return_value=first['bus']['at'] + 3):
            self.control.read_diagnostics('FAKE', sample_telemetry=True)
        self.assertEqual(self.control.battery_snapshot()['voltage'], 11.7)
        self.assertGreater(self.control.snapshot()['bus']['interval_s'], 0)
        self.assertEqual(self.control.battery_snapshot()['capacity_mah'], 2200)

    def test_capture_pose_roundtrips_encoder_counts_and_persists(self):
        config = json.loads(self.path.read_text())
        positions = {j['id']: j['min'] if j['id'] % 2 else 2101 for j in config['joints']}
        iface = self.pose_hardware({i: dict(valid=True, position=p) for i, p in positions.items()})
        captured = self.control.capture_pose('FAKE')
        self.assertTrue(iface.closed)
        from gait import validate_pose
        self.assertEqual(validate_pose(config, captured['pose']), positions)
        saved = self.control.save_pose_preset(dict(captured, name='My shape'))
        self.assertEqual(saved[0]['pose'], captured['pose'])
        other = Gen3Control(threading.RLock(), self.path)
        self.addCleanup(other.close)
        self.assertEqual(other.get_pose_presets(), saved)
        with self.assertRaisesRegex(ValueError, 'already exists'):
            self.control.save_pose_preset(dict(captured, name=' My shape '))
        changed = copy.deepcopy(captured)
        changed['joints'][0]['sign'] *= -1
        with self.assertRaisesRegex(ValueError, 'calibration changed'):
            self.control.save_pose_preset(dict(changed, name='Other'))
        self.assertEqual(self.control.get_pose_presets(), saved)

    def test_recalibrate_saved_pose_preserves_name_and_rejects_stale_updates(self):
        original_map = self.path.read_text()
        joints = json.loads(original_map)['joints']
        initial = dict(name='Hand shape', joints=joints, pose={str(i): 0 for i in range(1, 11)})
        self.control.save_pose_preset(initial)
        self.control.save_pose_preset(dict(initial, name='Other shape'))
        replacement = dict(initial, pose={str(i): 1 for i in range(1, 11)}, expected=initial)
        updated = self.control.save_pose_preset(replacement)
        self.assertEqual(len(updated), 2)
        self.assertEqual(updated[0]['name'], 'Hand shape')
        self.assertEqual(updated[0]['pose'], replacement['pose'])
        self.assertEqual(updated[1], dict(initial, name='Other shape'))
        with self.assertRaisesRegex(RuntimeError, 'Saved pose changed'):
            self.control.save_pose_preset(replacement)
        with self.assertRaisesRegex(RuntimeError, 'Saved pose changed'):
            self.control.save_pose_preset(dict(replacement, name='Missing pose'))
        self.assertEqual(self.control.get_pose_presets(), updated)
        self.assertEqual(self.path.read_text(), original_map)

    def test_capture_rejects_missing_invalid_and_out_of_range_feedback(self):
        for row in ({}, dict(valid=False, position=2048), dict(valid=True, position=True),
                    dict(valid=True, position=4096), dict(valid=True, position=1000)):
            with self.subTest(row=row):
                telemetry = {i: dict(valid=True, position=2048) for i in range(1, 11)}
                telemetry[4] = row
                iface = self.pose_hardware(telemetry)
                with self.assertRaises(ValueError):
                    self.control.capture_pose('FAKE')
                self.assertTrue(iface.closed)
                self.assertEqual(self.control.get_pose_presets(), [])

    def test_capture_refuses_busy_robot_before_connecting(self):
        self.control.state['busy'] = True
        self.control.hardware_factory = lambda **kw: self.fail('Hardware opened while busy')
        with self.assertRaisesRegex(RuntimeError, 'Stop active'):
            self.control.capture_pose('FAKE')
        self.control.state['busy'] = False

    def test_partial_read_preserves_real_values_and_never_arms(self):
        class Hardware:
            def __init__(self, **kw): self.closed = False
            def connect(self): return True, 'OK'
            def read_telemetry(self): return {1: dict(valid=True, position=2008, load=0, velocity=0)}
            def disconnect(self): self.closed = True
        iface = Hardware()
        self.control.hardware_factory = lambda **kw: iface
        state = self.job(dict(mode='read', execution='hardware', port='FAKE'))
        self.assertEqual(state['telemetry'][1]['position'], 2008)
        self.assertFalse(state['telemetry'][7]['valid'])
        self.assertNotIn('position', state['telemetry'][7])
        self.assertIn('missing/invalid', state['status'])
        self.assertTrue(iface.closed)

    def test_hardware_feedback_reports_live_bus_latency(self):
        class Hardware:
            def __init__(self, **kw): pass
            def connect(self): return True, 'OK'
            def read_telemetry(self):
                time.sleep(.02)
                return {i: dict(valid=True, position=2048, load=0, velocity=0) for i in range(1, 11)}
            def disconnect(self): pass
        self.control.hardware_factory = lambda **kw: Hardware()
        self.assertIsNone(self.control.snapshot()['bus'])
        state = self.job(dict(mode='read', execution='hardware', port='COM7'))
        self.assertEqual(state['bus']['port'], 'COM7')
        self.assertGreaterEqual(state['bus']['latency_ms'], 15)
        self.assertLessEqual(state['bus']['at'], time.time())

    def test_map_rejection_and_backup_preserve_measurements(self):
        original = self.path.read_text()
        config = json.loads(original)
        invalid = copy.deepcopy(config)
        invalid['joints'][0]['id'] = 2
        with self.assertRaises(ValueError): self.control.save_map(invalid)
        self.assertEqual(self.path.read_text(), original)
        config['speed'] = 180
        self.control.save_map(config)
        self.assertEqual(json.loads(self.path.read_text())['speed'], 180)
        self.assertEqual(next((self.path.parent / 'runs').glob('calibration-before-*.json')).read_text(), original)

    def test_stop_before_arm(self):
        event = threading.Event()
        event.set()
        class Hardware:
            def read_telemetry(self): return {1: dict(valid=True, position=2008)}
            def start(self): raise AssertionError('Stop must prevent arming')
        with self.assertRaises(InterruptedError):
            runner.run_motion(Hardware(), dict(speed=100), None, 4, None, jog_id=1, jog_ticks=20, stop_event=event)

    def test_stop_during_jog_releases_connection(self):
        owner = self.control
        class Hardware:
            def __init__(self): self.position = 2008; self.sent = 0; self.closed = False
            def connect(self): return True, 'OK'
            def start(self): pass
            def read_telemetry(self): return {1: dict(valid=True, position=self.position, load=0, velocity=0)}
            def write_positions(self, positions, speed):
                self.position = positions[1]
                self.sent += 1
                if self.sent == 2: owner.stop()
            def disconnect(self): self.closed = True
        iface = Hardware()
        owner.hardware_factory = lambda **kw: iface
        state = self.job(dict(mode='jog', execution='hardware', port='FAKE', id=1, ticks=20, duration=4))
        self.assertIn('Stop requested', state['status'])
        self.assertTrue(iface.closed)
        self.assertIn('fault', (self.path.parent / 'runs' / state['log']).read_text())

    def test_live_telemetry_keeps_peak_and_recent_tracking_error(self):
        owner = self.control
        class LaggingHardware:
            def __init__(self): self.position = 2008; self.sent = 0
            def connect(self): return True, 'OK'
            def start(self): pass
            def read_telemetry(self): return {1: dict(valid=True, position=self.position, load=0, velocity=0)}
            def write_positions(self, positions, speed):
                self.sent += 1
                self.position = positions[1] - (12 if self.sent == 3 else 4)
                if self.sent == 6: owner.stop()
            def disconnect(self): pass
        owner.hardware_factory = lambda **kw: LaggingHardware()
        state = self.job(dict(mode='jog', execution='hardware', port='FAKE', id=1, ticks=20, duration=4))
        joint = state['telemetry'][1]
        self.assertEqual(joint['error'], abs(joint['position'] - joint['target']))
        self.assertEqual(joint['peak_error'], 12)
        self.assertEqual(joint['error_history'][-1], joint['error'])
        self.assertLessEqual(len(joint['error_history']), 40)
        # Jogs enforce their fixed commissioning limit, not the map's gait limit.
        self.assertEqual(state['tracking'], dict(error=25, timeout=.5))

    def test_pose_job_reaches_pose_then_returns_to_neutral(self):
        config = json.loads(self.path.read_text())
        config['calibrated'] = True
        self.path.write_text(json.dumps(config))
        owner = self.control
        class Hardware:
            def __init__(self): self.position = {i: 2048 for i in range(1, 11)}; self.history = []
            def connect(self): return True, 'OK'
            def start(self): pass
            def read_telemetry(self): return {i: dict(valid=True, position=p, load=0, velocity=0) for i, p in self.position.items()}
            def write_positions(self, positions, speed):
                self.position.update(positions); self.history.append(dict(positions))
            def disconnect(self): pass
        iface = Hardware()
        owner.hardware_factory = lambda **kw: iface
        state = self.job(dict(mode='pose', execution='hardware', port='FAKE', pose={'1': 10, '3': 10}, duration=2, speed=1500))
        self.assertIn('Completed', state['status'])
        sign3 = next(j['sign'] for j in config['joints'] if j['id'] == 3)
        self.assertIn(2048 + round(10 * 4096 / 360), [h[1] for h in iface.history])
        self.assertIn(2048 + sign3 * round(10 * 4096 / 360), [h[3] for h in iface.history])
        self.assertEqual(iface.history[-1], {i: 2048 for i in range(1, 11)})
        manifest = json.loads((self.path.parent / 'runs' / state['log']).with_suffix('.json').read_text())
        self.assertEqual(manifest['pose_targets']['1'], 2048 + round(10 * 4096 / 360))

    def test_default_presets_fit_the_current_map(self):
        from surge_control.gen3 import DEFAULT_PRESETS
        from gait import validate_gait
        import math
        config = json.loads((ROOT / 'generations/gen3-experimental-3d/joint_map.json').read_text())
        for p in DEFAULT_PRESETS:
            with self.subTest(p['name']):
                validate_gait(config, *(math.radians(p[k]) for k in ('yaw', 'pitch', 'bias')), p['frequency'],
                              math.radians(p['lag']), math.radians(p['offset']), p['duration'], p['ramp'], speed=p['speed'])
        crawl = [p for p in DEFAULT_PRESETS if p['name'].startswith('Caterpillar')]
        self.assertEqual(len(crawl), 3)
        self.assertTrue(all(p['yaw'] == 0 and p['bias'] == 0 for p in crawl))

    def test_pose_and_overrides_are_validated_before_start(self):
        with self.assertRaisesRegex(ValueError, 'outside its calibrated limits'):
            self.control.start(dict(mode='pose', execution='preview', pose={'2': 80}))
        with self.assertRaisesRegex(ValueError, 'Unknown setting'):
            self.control.start(dict(mode='gait', execution='preview', joints={'2': {'turbo': 1}}))
        self.assertFalse(self.control.state['busy'])
        state = self.job(dict(mode='gait', execution='preview', duration=4, yaw=5, pitch=5, joints={'2': {'enabled': False}}))
        self.assertIn('Preview complete', state['status'])

    def test_pose_api_requires_operator_and_persists_without_motion(self):
        spec = importlib.util.spec_from_file_location('pose_web_test', DASHBOARD_DIR / 'web_app.py')
        web = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(web)
        app = web.create_app()
        gen3 = app.config['GEN3']
        self.addCleanup(gen3.close)
        gen3.map_path = self.path
        iface = self.pose_hardware({i: dict(valid=True, position=2048 + i) for i in range(1, 11)})
        gen3.hardware_factory = lambda **kw: iface
        client = app.test_client()
        self.assertEqual(client.post('/api/gen3/pose/capture', json={'port': 'FAKE'}).status_code, 403)
        self.assertEqual(client.post('/api/gen3/pose/presets', json={}).status_code, 403)
        self.assertEqual(client.post('/api/gen3/metrics', json={'port': 'FAKE'}).status_code, 403)
        self.assertFalse(iface.closed)
        self.assertEqual(client.post('/api/gen3/session/login', json={
            'name': 'Shashank', 'password': 'test-only-operator-password'}).status_code, 200)
        app.config['CONTROL'].state['is_running'] = True
        self.assertEqual(client.post('/api/gen3/pose/capture', json={'port': 'FAKE'}).status_code, 409)
        self.assertEqual(client.post('/api/gen3/metrics', json={'port': 'FAKE'}).status_code, 409)
        app.config['CONTROL'].state['is_running'] = False
        response = client.post('/api/gen3/pose/capture', json={'port': 'FAKE'})
        self.assertEqual(response.status_code, 200)
        snapshot = response.get_json()
        self.assertEqual(client.post('/api/gen3/pose/presets', json=dict(snapshot, name='Hand')).status_code, 200)
        self.assertEqual(client.get('/api/gen3/pose/presets').get_json()['presets'][0]['pose'], snapshot['pose'])
        self.assertFalse(gen3.state['busy'])

    def test_web_port_ownership_and_validation(self):
        spec = importlib.util.spec_from_file_location('gen3_web_test', DASHBOARD_DIR / 'web_app.py')
        web = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(web)
        app = web.create_app()
        self.addCleanup(app.config['GEN3'].close)
        client = app.test_client()
        self.assertEqual(client.get('/gen3').status_code, 200)
        user = client.get('/api/gen3/session').get_json()['current_user']
        client.environ_base['HTTP_X_SESSION_ID'] = user['session_id']
        login_res = client.post('/api/gen3/session/login', json={'name': 'Shashank', 'password': 'test-only-operator-password'})
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(client.post('/api/gen3/start', json=[]).status_code, 400)
        app.config['CONTROL'].state['is_running'] = True
        self.assertEqual(client.post('/api/gen3/start', json={'mode': 'gait'}).status_code, 409)
        app.config['CONTROL'].state['is_running'] = False
        app.config['GEN3'].state['busy'] = True
        self.assertEqual(client.post('/api/connect', json={}).status_code, 409)
        self.assertEqual(client.post('/api/controller', json={'btn_start': True}).status_code, 409)

    def test_phone_controller_relays_only_fresh_keyed_input_to_laptop(self):
        spec = importlib.util.spec_from_file_location('phone_web_test', DASHBOARD_DIR / 'web_app.py')
        web = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(web)
        app = web.create_app()
        self.addCleanup(app.config['GEN3'].close)
        client = app.test_client()
        phone = client.application.test_client()
        phone.environ_base['REMOTE_ADDR'] = '192.168.1.50'
        self.assertEqual(phone.get('/phone').status_code, 200)
        self.assertEqual(phone.get('/api/phone/link').status_code, 403)
        self.assertEqual(phone.get('/api/phone/pad').status_code, 403)
        key = client.get('/api/phone/link').get_json()['key']
        pad = dict(key=key, client='p1', sequence=1, axes=[0.5, 0, 0, 0], buttons=[0] * 4 + [1] + [0] * 12)
        self.assertEqual(phone.post('/api/phone/input', json=dict(pad, key='wrong')).status_code, 403)
        self.assertEqual(phone.post('/api/phone/input', json=dict(pad, axes=[2, 0, 0, 0])).status_code, 400)
        self.assertEqual(phone.post('/api/phone/input', json=dict(pad, buttons=[0] * 16)).status_code, 400)
        self.assertFalse(phone.post('/api/phone/input', json=pad).get_json()['laptop_listening'])
        self.assertEqual(client.get('/api/phone/pad').get_json()['pad']['axes'][0], 0.5)
        # Late packet from the same phone is ignored; laptop is now seen as listening.
        late = phone.post('/api/phone/input', json=dict(pad, sequence=0, axes=[-1, 0, 0, 0])).get_json()
        self.assertTrue(late['laptop_listening'])
        self.assertEqual(client.get('/api/phone/pad').get_json()['pad']['axes'][0], 0.5)
        app.config['PHONE']['pad']['at'] -= 1
        self.assertIsNone(client.get('/api/phone/pad').get_json()['pad'])


from tempfile import TemporaryDirectory as _TemporaryDirectory
from unittest.mock import patch as _patch


def setUpModule():
    global _operator_fixture, _operator_patch
    _operator_fixture = _TemporaryDirectory()
    config = Path(_operator_fixture.name) / 'operators.json'
    config.write_text(json.dumps({'operators': ['Shashank', 'Bhavesh', 'Mahima'],
                                 'password': 'test-only-operator-password'}))
    _operator_patch = _patch('surge_control.session.DEFAULT_CONFIG_PATH', config)
    _operator_patch.start()


def tearDownModule():
    _operator_patch.stop()
    _operator_fixture.cleanup()


if __name__ == '__main__':
    unittest.main()

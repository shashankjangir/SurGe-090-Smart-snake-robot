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

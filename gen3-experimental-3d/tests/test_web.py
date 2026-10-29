"""Web commissioning checks; no serial ports are opened."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'gen3-experimental-3d/backend'))
sys.path.insert(0, str(ROOT / 'shared'))
DASHBOARD_DIR = ROOT / 'gen3-experimental-3d/backend/web_dashboard' if (ROOT / 'gen3-experimental-3d/backend/web_dashboard').exists() else DASHBOARD_DIR
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
        config = json.loads((ROOT / 'gen3-experimental-3d/joint_map.json').read_text())
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
        login_res = client.post('/api/gen3/session/login', json={'name': 'Shashank', 'password': 'xyz@1234'})
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(client.post('/api/gen3/start', json=[]).status_code, 400)
        app.config['CONTROL'].state['is_running'] = True
        self.assertEqual(client.post('/api/gen3/start', json={'mode': 'gait'}).status_code, 409)
        app.config['CONTROL'].state['is_running'] = False
        app.config['GEN3'].state['busy'] = True
        self.assertEqual(client.post('/api/connect', json={}).status_code, 409)
        self.assertEqual(client.post('/api/controller', json={'btn_start': True}).status_code, 409)


if __name__ == '__main__':
    unittest.main()

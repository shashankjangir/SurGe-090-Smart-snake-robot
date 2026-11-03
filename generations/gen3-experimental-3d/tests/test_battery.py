"""Battery reserve uses cached diagnostics only; never opens a serial port."""
import importlib.util
import math
from pathlib import Path
import sys
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
spec = importlib.util.spec_from_file_location('battery_web', ROOT / 'backend/web_dashboard/web_app.py')
web = importlib.util.module_from_spec(spec)
spec.loader.exec_module(web)


class BatteryTests(unittest.TestCase):
    def setUp(self):
        self.app = web.create_app()
        self.control = self.app.config['GEN3']
        self.control.hardware_factory = lambda **kw: self.fail('Battery polling opened hardware')
        self.addCleanup(self.control.close)
        self.addCleanup(self.app.config['CONTROL'].close)
        self.client = self.app.test_client()

    def sample(self, readings, age=0):
        self.control.last_diagnostic = dict(timestamp=time.time() - age, servos={
            i: dict(valid=True, voltage=v) for i, v in enumerate(readings, 1)})
        response = self.client.get('/api/system_stats')
        self.assertEqual(response.status_code, 200)
        return response.get_json()['battery']

    def test_endpoints_average_and_clamp(self):
        for voltage, percent in [(126, 100), (111, 0), (120, 60), (130, 100), (105, 0)]:
            with self.subTest(voltage=voltage):
                sample = self.sample([voltage] * 10)
                self.assertEqual(sample['percent'], percent)
                self.assertEqual(sample['state'], 'fresh')
        sample = self.sample([119, 121])
        self.assertEqual((sample['percent'], sample['voltage'], sample['sample_count']), (60, 12, 2))

    def test_invalid_missing_stale_and_simulation(self):
        self.assertEqual(self.client.get('/api/system_stats').get_json()['battery']['state'], 'unavailable')
        sample = self.sample([120, -1, 0, None, True, '120', math.nan, math.inf, 256])
        self.assertEqual((sample['percent'], sample['sample_count']), (60, 1))
        self.control.last_diagnostic['servos'][1]['valid'] = False
        self.assertIsNone(self.control.battery_snapshot()['percent'])
        self.assertEqual(self.sample([120], age=31)['state'], 'stale')
        self.assertEqual(self.sample([])['state'], 'unavailable')
        self.control.last_diagnostic = None
        self.control.state.update(execution='simulation', telemetry={1: dict(valid=True, voltage=126)})
        self.assertIsNone(self.client.get('/api/system_stats').get_json()['battery']['percent'])

    def test_both_headers_place_battery_after_temperature(self):
        for route in ('/', '/gen3'):
            html = self.client.get(route).get_data(as_text=True)
            self.assertEqual(html.count('id="battery-indicator"'), 1)
            self.assertLess(html.index('id="sys-temp"'), html.index('id="battery-indicator"'))


if __name__ == '__main__':
    unittest.main()

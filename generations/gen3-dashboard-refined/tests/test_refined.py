"""HTTP and configuration checks for the separate edition. No hardware is opened."""
import sys
import unittest
from pathlib import Path

GEN = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(GEN), str(GEN / 'backend')]
from web_dashboard.web_app import create_app
from surge_control.gen3 import ROOT
from surge_control.session import DEFAULT_CONFIG_PATH


class RefinedTests(unittest.TestCase):
    def test_generation_owns_its_configuration_and_cookie(self):
        app = create_app()
        self.addCleanup(app.config['GEN3'].close)
        self.addCleanup(app.config['CONTROL'].close)
        self.assertEqual(ROOT, GEN)
        self.assertEqual(DEFAULT_CONFIG_PATH, GEN / 'operators.json')
        self.assertEqual(app.config['GEN3'].map_path, GEN / 'joint_map.json')
        response = app.test_client().get('/api/gen3/session')
        self.assertIn('surge_refined_session=', response.headers['Set-Cookie'])
        self.assertNotIn('surge_gen3_session=', response.headers['Set-Cookie'])

    def test_pages_keep_the_working_routes_and_load_the_refined_system(self):
        app = create_app()
        self.addCleanup(app.config['GEN3'].close)
        self.addCleanup(app.config['CONTROL'].close)
        client = app.test_client()
        for route in ('/', '/gen3', '/3d', '/phone'):
            with self.subTest(route=route):
                response = client.get(route)
                self.assertEqual(response.status_code, 200)
                self.assertIn(b'/static/refined.css', response.data)
        response = client.get('/gen3')
        self.assertIn(b'id="floating-stop-btn"', response.data)
        self.assertIn(b'id="gen3SimCanvas"', response.data)
        self.assertNotIn(b'class="marquee-banner"', response.data)


if __name__ == '__main__':
    unittest.main()

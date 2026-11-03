"""Controller node authentication and cleanup with mocked HTTP and gamepad only."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location('controller_audit', Path(__file__).resolve().parents[1] / 'controller_node.py')
node = importlib.util.module_from_spec(spec)
spec.loader.exec_module(node)


class ControllerAuthTests(unittest.TestCase):
    def setUp(self):
        self.requests = Mock(RequestException=OSError)
        modules = patch.dict('sys.modules', {'requests': self.requests})
        modules.start()
        self.addCleanup(modules.stop)

    def test_requires_operator_before_accessing_gamepad(self):
        with self.assertRaisesRegex(ValueError, '--operator'):
            node.run_controller()

    def test_rejected_login_reports_server_error_and_closes_without_stop(self):
        client = Mock()
        client.post.return_value.status_code = 401
        client.post.return_value.json.return_value = {'error': 'Incorrect password'}
        with patch('requests.Session', return_value=client), patch('getpass.getpass', return_value='test-only'):
            with self.assertRaisesRegex(RuntimeError, 'Incorrect password'):
                node.run_controller(operator='Shashank')
        self.assertEqual(client.post.call_count, 1)
        client.close.assert_called_once()

    def test_cli_reports_login_failure_without_traceback(self):
        with patch.object(node.sys, 'argv', ['controller_node.py', '--operator', 'Shashank']), \
             patch.object(node, 'run_controller', side_effect=RuntimeError('Incorrect password')), \
             patch('builtins.print') as output:
            self.assertEqual(node.main(), 1)
        output.assert_called_once_with('Controller: Incorrect password', file=node.sys.stderr)

    def test_authenticated_control_heartbeat_and_public_stop(self):
        for generation in ('2.1', '3'):
            with self.subTest(generation=generation):
                client = Mock()
                client.post.return_value.json.return_value = {'role': 'operator', 'active': True, 'run_id': 'offline-run'}
                client.get.return_value.json.return_value = {'is_running': False, 'is_paused': True}
                pygame = Mock()
                pygame.joystick.get_count.return_value = 1
                joystick = Mock(spec=['init', 'get_instance_id', 'get_numaxes',
                                      'get_numbuttons', 'get_button', 'get_axis'])
                pygame.joystick.Joystick.return_value = joystick
                joystick.get_numaxes.return_value = 6
                joystick.get_numbuttons.return_value = 8
                joystick.get_instance_id.return_value = 42
                pygame.JOYDEVICEREMOVED = 1542
                pygame.event.get.side_effect = [
                    [Mock(type=1542, instance_id=99)], [], [], [], [Mock(type=1542, instance_id=42)]]
                joystick.get_button.side_effect = [0] * 8 + [1, 0, 0, 0, 1, 0, 0, 0] + [0, 0, 0, 0, 1, 0, 0, 0] + [0, 1, 0, 0, 1, 0, 0, 0]
                joystick.get_axis.side_effect = lambda i: -1. if i == 5 else 0.
                with patch('requests.Session', return_value=client), patch('getpass.getpass', return_value='test-only'), \
                     patch.dict('sys.modules', {'pygame': pygame}), patch.object(node.time, 'sleep'):
                    node.run_controller(generation=generation, operator='Shashank')
                paths = [call.args[0].split(':5000')[1] for call in client.post.call_args_list]
                self.assertEqual(paths[0], '/api/gen3/session/login')
                self.assertIn('/api/gen3/session/heartbeat', paths)
                self.assertIn('/api/controller' if generation == '2.1' else '/api/gen3/start', paths)
                self.assertIn('/api/stop', paths)
                self.assertIn('/api/stop' if generation == '2.1' else '/api/gen3/stop', paths)
                self.assertIn('/api/controller' if generation == '2.1' else '/api/gen3/controller', paths)
                self.assertEqual(paths[-1], '/api/gen3/session/logout')
                client.close.assert_called_once()

    def test_viewer_login_cannot_start_controller_or_stop_another_operator(self):
        client = Mock()
        client.post.return_value.json.return_value = {'role': 'viewer', 'message': 'Lease unavailable'}
        with patch('requests.Session', return_value=client), patch('getpass.getpass', return_value='test-only'):
            with self.assertRaisesRegex(RuntimeError, 'Lease unavailable'):
                node.run_controller(operator='Shashank')
        self.assertEqual(client.post.call_count, 1)
        client.close.assert_called_once()

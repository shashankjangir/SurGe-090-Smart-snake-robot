"""Transmitter port recommendation; comports() is faked, no serial port is opened."""
from pathlib import Path
from types import SimpleNamespace
from unittest import mock
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend' / 'web_dashboard'))
from web_app import create_app


def port(device, description, vid=None, location=None):
    return SimpleNamespace(device=device, description=description, vid=vid, location=location)


BLUETOOTH = [port('COM4', 'Standard Serial over Bluetooth link (COM4)'),
             port('COM5', 'Standard Serial over Bluetooth link (COM5)')]
CP210X = 0x10C4
# Receiver and transmitter share the CP210x bridge and serial number 0001; only the USB socket differs.
BOTH_BOARDS = BLUETOOTH + [port('COM6', 'Silicon Labs CP210x (COM6)', CP210X, '1-2.3.2'),
                           port('COM7', 'Silicon Labs CP210x (COM7)', CP210X, '1-2.4')]


class PortDetectionTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.app = create_app()
        self.app.config['TRANSMITTER_FILE'] = Path(temp.name) / 'transmitter_port.json'
        self.client = self.app.test_client()

    def ports(self, listed):
        with mock.patch('serial.tools.list_ports.comports', return_value=listed):
            return self.client.get('/api/ports').get_json(), self.client.get('/api/gen3/ports').get_json()

    def test_single_esp32_board_is_recommended_over_bluetooth(self):
        listed = BLUETOOTH + [port('COM7', 'Silicon Labs CP210x USB to UART Bridge (COM7)', CP210X)]
        for data in self.ports(listed):
            self.assertEqual(data['recommended'], 'COM7')
            self.assertEqual([p['device'] for p in data['ports']], ['COM4', 'COM5', 'COM7'])

    def test_two_boards_are_ambiguous_until_the_transmitter_socket_is_learned(self):
        data, _ = self.ports(BOTH_BOARDS)
        self.assertIsNone(data['recommended'])
        with mock.patch('serial.tools.list_ports.comports', return_value=BOTH_BOARDS):
            self.app.config['REMEMBER_TRANSMITTER']('COM7')
        data, _ = self.ports(BOTH_BOARDS)
        self.assertEqual(data['recommended'], 'COM7')

    def test_learned_socket_survives_com_renumbering(self):
        with mock.patch('serial.tools.list_ports.comports', return_value=BOTH_BOARDS):
            self.app.config['REMEMBER_TRANSMITTER']('COM7')
        renumbered = BLUETOOTH + [port('COM9', 'Silicon Labs CP210x (COM9)', CP210X, '1-2.4'),
                                  port('COM3', 'Silicon Labs CP210x (COM3)', CP210X, '1-2.3.2')]
        data, _ = self.ports(renumbered)
        self.assertEqual(data['recommended'], 'COM9')

    def test_only_bluetooth_has_no_recommendation(self):
        data, _ = self.ports(BLUETOOTH)
        self.assertIsNone(data['recommended'])


if __name__ == '__main__':
    unittest.main()

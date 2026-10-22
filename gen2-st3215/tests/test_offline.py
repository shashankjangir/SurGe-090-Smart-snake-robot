"""Hardware-free regression tests: python -m unittest discover -s gen2-st3215/tests."""
import importlib.util
import math
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from src.feetech_protocol import FeetechBus, _extract_status, pack
from src.servo_driver import ServoDriver, ServoState
from src.robot_config import Config, St3215Addr
from src.snake_locomotion import SnakeKinematics
from src.obstacle_avoidance import ObstacleAvoidance
from src.kinematics import Kinematics
from src.torque_controller import TorqueController
from src.utils import to_signed_current, encoder_to_radians, radians_to_encoder


class PacketTests(unittest.TestCase):
    def test_error_reply_is_not_success(self):
        self.assertIsNone(_extract_status(pack(1, 32), 1))

    def test_noise_echo_bad_checksum_wrong_id_and_partial_frame(self):
        sent = pack(1, 2, bytes((69, 2)))
        reply = pack(1, 0, b"\x34\x12")
        bad = reply[:-1] + bytes((reply[-1] ^ 1,))
        data = b"noise\xff\xff\x01\xff" + sent + bad + pack(2, 0, b"ab") + reply
        self.assertEqual(_extract_status(data, 1, 2, sent), b"\x34\x12")
        self.assertIsNone(_extract_status(reply[:-1], 1, 2))
        self.assertIsNone(_extract_status(reply, 1, 1))

    def test_fragmented_serial_read(self):
        reply = pack(1, 0, b"\x34\x12")
        class Serial:
            def reset_input_buffer(self): pass
            def write(self, data):
                self.chunks = [data[:3], data[3:], reply[:4], reply[4:]]
                return len(data)
            @property
            def in_waiting(self): return len(self.chunks[0]) if self.chunks else 0
            def read(self, count): return self.chunks.pop(0)
        self.assertEqual(FeetechBus(Serial()).read2(1, 69), 0x1234)

    def test_short_write_raises(self):
        port = Mock()
        port.write.return_value = 2
        with self.assertRaises(OSError): FeetechBus(port).ping(1)

    def test_sync_write_validates_before_sending(self):
        port = Mock()
        with self.assertRaises(ValueError): FeetechBus(port).sync_write(42, {1: b"a", 2: b"ab"})
        port.write.assert_not_called()
        with self.assertRaises(ValueError): pack(1, 3, b"a" * 254)


class DriverTests(unittest.TestCase):
    def setUp(self):
        self.driver = ServoDriver(num_servos=2)
        self.bus = self.driver._bus = Mock()

    def test_lost_current_raises(self):
        self.bus.read2.return_value = None
        with self.assertRaisesRegex(RuntimeError, "feedback lost"):
            self.driver.read_all_currents()

    def test_invalid_targets_do_not_send_partial_command(self):
        with self.assertRaises(ValueError): self.driver.write_goal_positions({1: 2048, 2: math.nan})
        self.bus.sync_write.assert_not_called()
        with self.assertRaises(ValueError): self.driver.write_goal_positions({0: 2048})

    def test_targets_clamp_to_mechanical_limits(self):
        self.driver.write_goal_positions({1: -10, 2: 9999})
        values = self.bus.sync_write.call_args.args[1]
        self.assertEqual(int.from_bytes(values[1][:2], "little"), Config.JOINT_MIN)
        self.assertEqual(int.from_bytes(values[2][:2], "little"), Config.JOINT_MAX)

    def test_cleanup_attempts_every_motor_and_closes_even_on_failure(self):
        self.driver._enabled = {1, 2}
        self.bus.write1.side_effect = [OSError("unplugged"), True]
        with self.assertRaises(RuntimeError): self.driver.close()
        self.assertEqual(self.bus.write1.call_count, 2)
        self.bus.close.assert_called_once()
        self.assertIsNone(self.driver._bus)

    def test_enable_preserves_position_before_torque(self):
        self.bus.read2.return_value = 2200
        self.bus.write1.return_value = True
        self.driver.enable_torque(True, 1)
        calls = self.bus.mock_calls
        names = [c[0] for c in calls]
        self.assertLess(names.index("sync_write"), len(names) - 1)
        self.assertEqual(calls[-1].args, (1, St3215Addr.TORQUE_ENABLE, 1))

    def test_failed_startup_is_included_in_cleanup(self):
        self.bus.read2.return_value = None
        with self.assertRaises(RuntimeError): self.driver.enable_torque(True, 1)
        self.assertIn(1, self.driver._enabled)
        self.driver.close()
        self.bus.write1.assert_any_call(1, St3215Addr.TORQUE_ENABLE, 0)

    def test_state_validity_is_reset_on_lost_read(self):
        self.driver.states[0].valid = True
        self.bus.read.return_value = None
        self.assertFalse(any(s.valid for s in self.driver.read_all_states()))

    def test_mock_is_deterministic(self):
        driver = ServoDriver(num_servos=1, mock=True)
        driver.enable_torque()
        driver.write_goal_positions({1: 2300})
        self.assertEqual(driver.read_all_states()[0].encoder, 2300)
        driver.close()
        self.assertFalse(driver._enabled)


class ControlTests(unittest.TestCase):
    def test_gait_all_modes_are_bounded(self):
        gait = SnakeKinematics()
        gait.amplitude = 10000
        for mode in ("SLITHER", "SLITHER_REV", "SLITHER_TURN"):
            for time in (0, .5, 20):
                self.assertTrue(all(Config.JOINT_MIN <= p <= Config.JOINT_MAX for p in gait.calculate_positions(time, mode).values()))
        with self.assertRaises(ValueError): gait.calculate_positions(math.nan)
        with self.assertRaises(ValueError): gait.calculate_positions(0, "typo")

    def test_evasion_transitions_and_missing_data(self):
        avoid = ObstacleAvoidance(current_threshold=100, reverse_duration=2, turn_duration=3)
        self.assertEqual(avoid.process_state(0, {1: 101}), "SLITHER_REV")
        self.assertEqual(avoid.process_state(2, {1: 0}), "SLITHER_TURN")
        self.assertEqual(avoid.process_state(5, {1: 0}), "SLITHER")
        for bad in ({}, {1: None}, {1: math.nan}):
            with self.assertRaises(ValueError): avoid.process_state(6, bad)

    def test_experimental_controls_validate_dimensions(self):
        with self.assertRaises(ValueError): Kinematics().calculate_target_velocities([1], [], .1)
        self.assertEqual(Kinematics().calculate_target_velocities([1], [0], 0), [0])
        with self.assertRaises(ValueError): TorqueController().compute_torques([], [], [])
        states = [ServoState(i) for i in range(10)]
        self.assertEqual(TorqueController().compute_torques(states, [0]*10, [0]*10), [0]*10)

    def test_conversions(self):
        self.assertEqual(to_signed_current(0x8002), -13)
        for tick in (1252, 2048, 2844):
            self.assertEqual(radians_to_encoder(encoder_to_radians(tick)), tick)
        with self.assertRaises(ValueError): radians_to_encoder(math.inf)

    def test_shared_transport_propagates_receiver_fault(self):
        from src.st3215_interface import ST3215Interface
        iface = ST3215Interface()
        iface.armed = True
        iface.serial_port = Mock()
        iface.serial_port.readline.return_value = b"ERR,SERVO\n"
        with self.assertRaisesRegex(RuntimeError, "ERR,SERVO"): iface._wait("T,")
        self.assertFalse(iface.armed)

    def test_terminal_stops_even_when_start_fails(self):
        spec = importlib.util.spec_from_file_location("terminal", ROOT / "tools/test_st3215_terminal.py")
        terminal = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(terminal)
        iface = Mock()
        iface.start.side_effect = RuntimeError("lost ACK")
        with self.assertRaises(RuntimeError): terminal.move(iface, {1: 2048})
        iface.stop.assert_called_once()

    def test_id_assignment_closes_and_relocks_after_failed_write(self):
        spec = importlib.util.spec_from_file_location("assign_id", ROOT / "tools/assign_id.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        bus = Mock()
        bus.ping.side_effect = [True, False]
        bus.write1.return_value = True
        bus.write.side_effect = [OSError("write failed"), True, True]
        with patch.dict(sys.modules, {"serial": Mock()}), patch.object(module, "FeetechBus", return_value=bus), patch.object(module.time, "sleep"):
            with self.assertRaises(OSError): module.assign(1, 2, "unused")
        bus.write.assert_any_call(1, St3215Addr.LOCK, b"\x01", wait_ack=False)
        bus.write.assert_any_call(2, St3215Addr.LOCK, b"\x01", wait_ack=False)
        bus.close.assert_called_once()

    def test_id_assignment_validates_before_opening_port(self):
        spec = importlib.util.spec_from_file_location("assign_invalid", ROOT / "tools/assign_id.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with self.assertRaises(ValueError): module.assign(0, 2, "unused")


if __name__ == "__main__":
    unittest.main()

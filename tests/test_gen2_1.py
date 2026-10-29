"""Offline regression checks. Never open a serial port or flash hardware."""
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys
import subprocess
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "gen3-experimental-3d/backend"))
sys.path.insert(0, str(ROOT / "shared"))
from surge_control.gait import SnakeKinematics
from surge_control.hardware import ST3215Interface
from surge_control.runtime import ControlRuntime
from surge_control.bench import align


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeInterface:
    def __init__(self):
        self.started = False
        self.stops = 0
        self.sent = []
        self.closed = False
        self.pose = (0., 0., 0.)
        self.pose_resets = 0
    def start(self): self.started = True
    def stop(self): self.stops += 1
    def disconnect(self): self.closed = True
    def reset_pose(self):
        self.pose = (0., 0., 0.)
        self.pose_resets += 1
    def get_robot_pose(self): return self.pose
    def get_all_segment_positions(self): return [(0, 0)] * 11
    def get_3d_state(self): return []
    def update_physics(self, *args): pass
    def write_positions(self, positions, **kwargs): self.sent.append(positions)
    def read_telemetry(self): return {}
    def draw_target_path(self, path): pass


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.c = ControlRuntime()
        self.f = FakeInterface()
        self.c.iface = self.f
        self.c.state.update(is_running=True, is_paused=False, engine="SIM")

    def test_clock_advances_once(self):
        self.c.tick(.02)
        self.assertAlmostEqual(self.c.state["sim_time"], .02)

    def test_pause_sends_stop_and_freezes_clock(self):
        self.c.pause()
        self.c.tick(.02)
        self.assertEqual(self.f.stops, 1)
        self.assertEqual(self.c.state["sim_time"], 0)
        self.assertFalse(self.f.sent)

    def test_path_completion_stops_once(self):
        self.c.state["target_path"] = [[1, 0], [0, 0]]
        self.c.tick(.02)
        self.c.tick(.02)
        self.assertEqual(self.c.state["status"], "Path Complete")
        self.assertEqual(self.f.stops, 1)

    def test_path_completion_requires_moving_on_whole_path(self):
        loop_path = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0.5], [0, 0]]
        self.c.set_path(loop_path)
        self.c.state["is_paused"] = False
        self.f.pose = (0., 0., 0.)
        self.c.tick(.02)
        self.assertFalse(self.c.state["is_paused"], "Must not complete at start of loop")
        self.assertNotEqual(self.c.state["status"], "Path Complete")

        for pt in loop_path:
            self.f.pose = (float(pt[0]), float(pt[1]), 0.)
            self.c.tick(.02)

        self.assertTrue(self.c.state["is_paused"], "Must complete when whole path has been traversed")
        self.assertEqual(self.c.state["status"], "Path Complete")

    def test_preset_reaches_gait(self):
        self.c.controller({"btn_preset": True})
        self.c.tick(.02)
        self.assertEqual(self.c.gait.amplitude, 1.2)

    def test_controller_timeout_stops(self):
        self.c.controller({"stick_x": 1, "stick_y": 0}, now=1)
        self.c.tick(.02, now=2)
        self.assertTrue(self.c.state["is_paused"])
        self.assertFalse(self.f.sent)

    def test_reverse_advances_negative_phase(self):
        self.c.state["is_reversed"] = True
        self.c.tick(.02)
        self.assertAlmostEqual(self.c.state["sim_time"], -.02)

    def test_hardware_rejects_unlocalized_path(self):
        self.c.state["engine"] = "ST3215"
        with self.assertRaises(ValueError): self.c.set_path([[0,0], [1,1]])

    def test_invalid_params_are_atomic(self):
        before = dict(self.c.state["params"])
        with self.assertRaises(ValueError): self.c.set_params({"amp": .2, "speed": 0})
        self.assertEqual(before, self.c.state["params"])
        with self.assertRaises(ValueError): self.c.set_params({"amp": float("nan")})

    def test_gait_ticks_and_angles_share_limits(self):
        gait = SnakeKinematics()
        gait.amplitude = 2
        ticks, angles = gait.calculate_positions(.5, 1)
        self.assertEqual(len(ticks), 10)
        for i in ticks:
            self.assertTrue(1252 <= ticks[i] <= 2844)
            self.assertAlmostEqual(angles[i], (ticks[i]-2048)*2*math.pi/4096)

    def test_clear_path_resets_pose_and_pauses(self):
        self.c.set_path([[1, 1], [2, 2]])
        self.assertEqual(len(self.c.state["target_path"]), 2)
        self.c.set_path([])
        self.assertEqual(len(self.c.state["target_path"]), 0)
        self.assertTrue(self.c.state["is_paused"])
        self.assertEqual(self.f.pose_resets, 1)


class HardwareTests(unittest.TestCase):
    def setUp(self):
        self.h = ST3215Interface()
        self.h.is_connected = True
        self.h.armed = True
        self.sent = []
        self.h._send = self.sent.append

    def test_speed_is_serialized(self):
        self.h.write_positions({1:2048}, speed=400)
        self.assertEqual(self.sent, ["P,1:2048:400"])

    def test_write_requires_run(self):
        self.h.armed = False
        with self.assertRaises(RuntimeError): self.h.write_positions({1:2048})

    def test_missing_telemetry_not_fabricated(self):
        self.h._wait = lambda *a: "T,1:12:5:2060,"
        values = self.h.read_telemetry()
        self.assertTrue(values[1]["valid"])
        self.assertFalse(values[2]["valid"])
        self.assertIsNone(values[2]["position"])

    def test_sensor_and_servo_frames_are_demultiplexed(self):
        lines = iter([b"T:25 P:1000 D:12 X:0 Y:0 Z:1 BMP:1 MPU:1\n", b"T,1:12:0:2048,\n"])
        self.h.serial_port = type("Serial", (), {"readline": lambda s: next(lines, b"")})()
        data = self.h.read_telemetry()
        self.assertEqual(self.h.sensors["D"], 12)
        self.assertEqual(data[1]["position"], 2048)

    def test_serial_reply_can_arrive_in_fragments(self):
        lines = iter([b'T,1:12:', b'0:2048,\n'])
        self.h.serial_port = type('Serial', (), {'readline': lambda s: next(lines, b'')})()
        self.assertTrue(self.h.read_telemetry()[1]['valid'])

    def test_fragmented_fault_is_not_silently_discarded(self):
        lines = iter([b'ERR,SER', b'VO,ID=6,OP=WRITE,RESULT=0,STATUS=0\n'])
        self.h.serial_port = type('Serial', (), {'readline': lambda s: next(lines, b'')})()
        with self.assertRaisesRegex(RuntimeError, 'ID=6,OP=WRITE'):
            self.h.read_telemetry()

    def test_serial_reply_buffer_is_bounded(self):
        self.h.serial_port = type('Serial', (), {'readline': lambda s: b'x' * 1025})()
        with self.assertRaisesRegex(RuntimeError, 'maximum length'):
            self.h._wait('T,')

    def test_short_serial_write_is_reported(self):
        self.h.serial_port = type('Serial', (), {'write': lambda s, data: len(data)-1})()
        with self.assertRaisesRegex(OSError, 'Incomplete serial'):
            ST3215Interface._send(self.h, 'HELLO')

    def test_stop_failure_still_closes_port(self):
        port = type("Serial", (), {"closed": False, "close": lambda s: setattr(s, "closed", True)})()
        self.h.serial_port = port
        self.h._wait = lambda *a: None
        with self.assertRaises(RuntimeError): self.h.disconnect()
        self.assertTrue(port.closed)
        self.assertFalse(self.h.is_connected)

    def test_alignment_requires_measured_feedback(self):
        iface = type("Servo", (), {"num_motors":1, "last_positions":{1:2048},
                     "write_positions":lambda *a,**k:None, "read_telemetry":lambda s:{1:{"valid":False,"position":None}}})()
        with patch("surge_control.bench.time.monotonic", side_effect=[0,0,11]), patch("surge_control.bench.time.sleep"):
            with self.assertRaises(TimeoutError): align(iface)


class ApiTests(unittest.TestCase):
    def setUp(self):
        web_path = "gen3-experimental-3d/backend/web_dashboard/web_app.py" if (ROOT / "gen3-experimental-3d/backend/web_dashboard/web_app.py").exists() else "shared/web-dashboard/web_app.py"
        self.module = load("web_under_test", web_path)
        self.c = ControlRuntime()
        self.c.iface = FakeInterface()
        self.c.state.update(is_running=True, engine="SIM")
        self.client = self.module.create_app(self.c).test_client()

    def test_import_has_no_worker(self):
        self.assertIsNone(self.module.app.config["CONTROL"].thread)

    def test_pages_render(self):
        for url in ("/", "/3d", "/api/status", "/api/system_stats"):
            self.assertEqual(self.client.get(url).status_code, 200)

    def test_start_stop_contract(self):
        self.assertEqual(self.client.post("/api/start", json={}).status_code, 200)
        self.assertFalse(self.c.state["is_paused"])
        self.assertEqual(self.client.post("/api/stop", json={}).status_code, 200)
        self.assertTrue(self.c.state["is_paused"])

    def test_invalid_values_rejected(self):
        self.assertEqual(self.client.post("/api/params", json={"speed":0}).status_code, 400)
        self.assertEqual(self.client.post("/api/set_path", json={"path":[[1]]}).status_code, 400)

    def test_report_uses_segments_not_only_waypoints(self):
        self.c.state.update(target_path=[[0,0],[10,0]], actual_path=[[4,.1],[5,.1]])
        response = self.client.get("/api/report")
        self.assertAlmostEqual(response.json["avg_error"], .1)


class PreservationTests(unittest.TestCase):
    def test_gen1_originals_preserved(self):
        baseline = json.loads((ROOT / "docs/versions/gen1-git-baseline.json").read_text())
        for rel, expected in baseline.items():
            # Gen 1 overview was refreshed; its original remains in the archive.
            source = ("removed/pre-gen1-docs-2026-10-16/" + rel
                      if rel == "gen1-dynamixel/README.md" else rel)
            if not (ROOT / source).exists():
                self.skipTest(f"Preservation source {source} not present in workspace")
            actual = subprocess.check_output(
                ["git", "hash-object", "--path=" + rel, "--", source], cwd=ROOT, text=True).strip()
            self.assertEqual(actual, expected, rel)

    def test_source_snapshot_complete(self):
        manifest = ROOT / "removed/baselines/incoming-sha256.json"
        if not manifest.exists():
            self.skipTest("Original incoming archive absent since 16 October; see removed/INDEX.md")
        baseline = json.loads(manifest.read_text())
        for rel, digest in baseline.items():
            p = ROOT / "removed/gen2.1-source-snapshot/Snake_SURGE" / rel
            self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(), digest, rel)

    def test_planar_model_has_10_joints_11_links(self):
        urdf_path = ROOT / "gen3-experimental-3d/backend/simulation/pybullet/snake.urdf" if (ROOT / "gen3-experimental-3d/backend/simulation/pybullet/snake.urdf").exists() else ROOT / "shared/simulation/pybullet/snake.urdf"
        root = ET.parse(urdf_path).getroot()
        self.assertEqual(len(root.findall("joint")), 10)
        self.assertEqual(len(root.findall("link")), 11)
        self.assertTrue(all(j.find("axis").get("xyz") == "0 0 1" for j in root.findall("joint")))

    def test_gen3_dry_run_targets_are_bounded(self):
        module = load("experimental", "gen3-experimental-3d/test_3d_snake.py")
        targets = module.positions_at(.4)
        self.assertEqual(len(targets),10)
        self.assertTrue(all(1252 <= v <= 2844 for v in targets.values()))


class SimulationTests(unittest.TestCase):
    def test_headless_from_arbitrary_directory(self):
        try:
            import pybullet
        except ImportError:
            self.skipTest("PyBullet not installed in this interpreter")
        from surge_control.simulation import SimulationInterface
        a, b = SimulationInterface(), SimulationInterface()
        try:
            ok, msg = a.connect(headless=True)
            self.assertTrue(ok, msg)
            ok, msg = b.connect(headless=True)
            self.assertTrue(ok, msg)
            a.start()
            for i in range(10):
                _, angles = SnakeKinematics().calculate_positions(i*.02)
                a.write_positions(angles)
            self.assertEqual(len(a.read_telemetry()),10)
            self.assertEqual(len(a.get_3d_state()),11)
            a.disconnect()
            self.assertEqual(len(b.get_3d_state()),11)
        finally:
            a.disconnect()
            b.disconnect()

if __name__ == "__main__":
    unittest.main()

"""One serialized control loop for the Gen 2.1 dashboard."""
import math
import threading
import time
from .gait import SnakeKinematics
from .path_engine import PathEngine
from .hardware import ST3215Interface
from .simulation import SimulationInterface


class ControlRuntime:
    def __init__(self):
        self.lock = threading.RLock()
        self.iface = None
        self.gait = SnakeKinematics()
        self.path = PathEngine()
        self.state = {
            "is_running": False, "is_paused": True, "engine": "SIM", "status": "Disconnected",
            "target_path": [], "actual_path": [], "telemetry": {}, "segments": [],
            "robot_pose": {"x": 0., "y": 0., "yaw": 0.}, "pose_valid": False,
            "params": {"fric": 20., "amp": .8, "freq": 2., "phase": 1., "force": 2., "speed": 1., "low_power": False},
            "controller": {"active": False, "x": 0., "y": 0., "trigger_rt": 0., "raw_buttons": {}},
            "is_reversed": False, "sim_time": 0., "sensors": {}, "sensor_age_s": None,
        }
        self.controller_time = None
        self.thread = None
        self.shutdown = threading.Event()

    def connect(self, engine="SIM", port=None, headless=True):
        if engine not in ("SIM", "ST3215"):
            raise ValueError("Unknown engine")
        self.disconnect()
        self.iface = SimulationInterface() if engine == "SIM" else ST3215Interface(port=port)
        ok, msg = self.iface.connect(headless=headless) if engine == "SIM" else self.iface.connect()
        self.state.update(engine=engine, is_running=ok, is_paused=True, status=msg, actual_path=[],
                          target_path=[], sim_time=0., telemetry={}, segments=[], pose_valid=engine == "SIM" and ok,
                          robot_pose={"x": 0., "y": 0., "yaw": 0.}, sensors={}, sensor_age_s=None)
        self.state["controller"]["active"] = False
        if not ok:
            self.iface = None
        return ok, msg

    def pause(self, reason="Stopped; torque off"):
        self.state["is_paused"] = True
        self.state["status"] = reason
        if self.iface:
            self.iface.stop()

    def start(self):
        if not self.iface or not self.state["is_running"]:
            raise ValueError("Connect an engine first")
        if self.state.get("status") == "Path Complete":
            self.path.reset()
        self.iface.start()
        self.state.update(is_paused=False, status="Running")

    def disconnect(self):
        old, self.iface = self.iface, None
        self.state.update(is_running=False, is_paused=True, status="Disconnected")
        if old:
            old.disconnect()

    def set_params(self, data):
        bounds = {"fric": (1, 50), "amp": (0, 1.2), "freq": (.1, 5), "phase": (.1, 3),
                  "force": (.1, 2.94), "speed": (.1, 3)}
        new = dict(self.state["params"])
        for key, (lo, hi) in bounds.items():
            if key in data:
                value = float(data[key])
                if not math.isfinite(value) or not lo <= value <= hi:
                    raise ValueError(f"{key} must be {lo}..{hi}")
                new[key] = value
        if "low_power" in data:
            new["low_power"] = bool(data["low_power"])
        self.state["params"] = new

    def set_path(self, points):
        if self.state["engine"] != "SIM":
            raise ValueError("Physical path following needs localization; use manual gait control for hardware")
        if not isinstance(points, list) or len(points) > 5000:
            raise ValueError("Path must contain at most 5000 points")
        path = []
        for point in points:
            if not isinstance(point, (list, tuple)) or len(point) != 2:
                raise ValueError("Each waypoint must be [x, y]")
            x, y = map(float, point)
            if not all(math.isfinite(v) and abs(v) <= 100 for v in (x, y)):
                raise ValueError("Waypoints must be finite and within 100 m")
            path.append([x, y])
        self.state.update(target_path=path, actual_path=[])
        self.path.reset()
        if self.iface:
            self.iface.draw_target_path(path)
        if not path:
            self.pause("Path cleared; stopped")
            if self.state["engine"] == "SIM" and hasattr(self.iface, "reset_pose"):
                self.iface.reset_pose()
                x, y, yaw = self.iface.get_robot_pose()
                self.state["robot_pose"] = {"x": x, "y": y, "yaw": yaw}
                self.state["segments"] = self.iface.get_all_segment_positions()
                self.state["actual_path"] = []

    def controller(self, data, now=None):
        now = time.monotonic() if now is None else now
        c = self.state["controller"]
        for source, dest in (("stick_x", "x"), ("stick_y", "y"), ("trigger_rt", "trigger_rt")):
            if source in data:
                value = float(data[source])
                if not math.isfinite(value):
                    raise ValueError("Controller values must be finite")
                c[dest] = max(0 if dest == "trigger_rt" else -1, min(1, value))
        c["raw_buttons"] = data.get("raw_buttons", {})
        c["active"] = max(abs(c["x"]), abs(c["y"])) > .25
        self.controller_time = now
        if data.get("btn_reverse"):
            self.state["is_reversed"] = not self.state["is_reversed"]
        if data.get("btn_preset"):
            amp = self.state["params"]["amp"]
            self.state["params"]["amp"] = .8 if amp < .6 else 1.2 if amp < 1 else .4
        if data.get("btn_stop"):
            self.pause()
        elif data.get("btn_start"):
            self.start()

    def is_path_complete(self, x, y, target):
        """Path is complete only when the snake has moved along the whole path to the final waypoint."""
        if not target or len(target) < 2:
            return False
        if len(target) <= 2:
            return math.hypot(x - target[-1][0], y - target[-1][1]) < .15
        progress = getattr(self.path, "progress_idx", 0)
        has_traversed = (progress >= len(target) - 2) or ((progress / max(1, len(target) - 1)) >= 0.95)
        dist_to_end = math.hypot(x - target[-1][0], y - target[-1][1])
        has_moved = len(self.state.get("actual_path", [])) >= 2
        return has_traversed and dist_to_end < 0.35 and has_moved

    def tick(self, dt, now=None):
        now = time.monotonic() if now is None else now
        s = self.state
        if not s["is_running"] or not self.iface:
            return
        dt = max(0, min(.1, dt))
        c = s["controller"]
        if c["active"] and self.controller_time is not None and now - self.controller_time > .75:
            c["active"] = False
            self.pause("Controller link lost; stopped")
        if s["engine"] == "SIM":
            x, y, yaw = self.iface.get_robot_pose()
            s["robot_pose"] = {"x": x, "y": y, "yaw": yaw}
            s["segments"] = self.iface.get_all_segment_positions()
            if not s["actual_path"] or math.hypot(s["actual_path"][-1][0] - x, s["actual_path"][-1][1] - y) > .02:
                s["actual_path"].append([x, y])
                s["actual_path"] = s["actual_path"][-10000:]
        if not s["is_paused"]:
            params = s["params"]
            speed = params["speed"] * (.1 if params["low_power"] else 1)
            turn = 0.
            target = s["target_path"]
            if c["active"]:
                turn = -.8 * c["x"]
                speed *= min(1, math.hypot(c["x"], c["y"]))
            elif s["engine"] == "SIM" and target:
                turn = self.path.calculate_pure_pursuit(x, y, yaw, target)
                if len(target) > 1 and not c["active"] and self.is_path_complete(x, y, target):
                    self.pause("Path Complete")
            if not s["is_paused"]:
                s["sim_time"] += dt * speed * (-1 if s["is_reversed"] else 1)
                self.gait.amplitude = params["amp"]
                self.gait.frequency = params["freq"]
                self.gait.phase_shift = params["phase"]
                positions, angles = self.gait.calculate_positions(s["sim_time"], turn)
                if s["engine"] == "SIM":
                    self.iface.dt = dt or .02
                    self.iface.update_physics(params["fric"], 0, 1.5, [x, y, 0])
                    # Low power mode clamps force per motor individually (< 2A / 1.8 Nm safe envelope)
                    motor_force = min(1.8, params["force"]) if params["low_power"] else params["force"]
                    self.iface.write_positions(angles, max_force=motor_force)
                else:
                    self.iface.write_positions(positions, speed=600 if params["low_power"] else 2400)
        s["telemetry"] = self.iface.read_telemetry()
        s["sensors"] = dict(getattr(self.iface, "sensors", {}))
        sensor_time = getattr(self.iface, "sensor_time", None)
        s["sensor_age_s"] = None if sensor_time is None else now - sensor_time

    def start_worker(self):
        if self.thread and self.thread.is_alive():
            return
        self.shutdown.clear()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def _loop(self):
        previous = time.monotonic()
        while not self.shutdown.is_set():
            started = time.monotonic()
            with self.lock:
                try:
                    self.tick(started - previous, started)
                except Exception as exc:
                    try:
                        self.disconnect()
                    except Exception:
                        pass
                    self.state["status"] = f"Error: {exc}"
            previous = started
            self.shutdown.wait(max(.001, .02 - (time.monotonic() - started)))

    def close(self):
        self.shutdown.set()
        if self.thread:
            self.thread.join(timeout=2)
        with self.lock:
            self.disconnect()

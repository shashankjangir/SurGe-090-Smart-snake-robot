"""One serialized control loop for the Gen 2.1 dashboard."""
import math
import threading
import time
from .gait import SnakeKinematics
from .path_engine import PathEngine
from .hardware import ST3215Interface
from .simulation import SimulationInterface
from .manual import ManualController, Localization


class ControlRuntime:
    def __init__(self):
        self.lock = threading.RLock()
        self.iface = None
        self.gait = SnakeKinematics()
        self.path = PathEngine()
        self.state = {
            "is_running": False, "is_paused": True, "engine": "SIM", "status": "Disconnected",
            "target_path": [], "actual_path": [], "path_progress": 0., "telemetry": {}, "segments": [],
            "robot_pose": {"x": 0., "y": 0., "yaw": 0.}, "pose_valid": False,
            "params": {"fric": 20., "amp": .8, "freq": 2., "phase": 1., "force": 2., "speed": 1., "low_power": False},
            "controller": {"active": False, "x": 0., "y": 0., "trigger_rt": 0., "raw_buttons": {}},
            "is_reversed": False, "sim_time": 0., "sensors": {}, "sensor_age_s": None,
        }
        self.manual = None
        self.localization = Localization()
        self.controller_run_id = None
        self.sessions = None
        self.owner_session = None
        self.report_errors = []
        self.path_revision = 0
        self.path_stalled_time = 0.
        self.thread = None
        self.shutdown = threading.Event()

    def connect(self, engine="SIM", port=None, headless=True):
        if engine not in ("SIM", "ST3215"):
            raise ValueError("Unknown engine")
        self.disconnect()
        self.iface = SimulationInterface() if engine == "SIM" else ST3215Interface(port=port)
        ok, msg = self.iface.connect(headless=headless) if engine == "SIM" else self.iface.connect()
        self.state.update(engine=engine, is_running=ok, is_paused=True, status=msg, actual_path=[], path_progress=0.,
                          target_path=[], sim_time=0., telemetry={}, segments=[], pose_valid=engine == "SIM" and ok,
                          robot_pose={"x": 0., "y": 0., "yaw": 0.}, sensors={}, sensor_age_s=None)
        self.state["controller"]["active"] = False
        if not ok:
            self.iface = None
        self.path.reset()
        self.report_errors.clear()
        self.path_revision += 1
        self.path_stalled_time = 0.
        return ok, msg

    def pause(self, reason="Stopped; torque off"):
        self.state["is_paused"] = True
        self.manual = None
        self.state['controller']['active'] = False
        self.state["status"] = reason
        if self.iface:
            self.iface.stop()

    def start(self):
        if not self.iface or not self.state["is_running"]:
            raise ValueError("Connect an engine first")
        if self.state.get("status") == "Path Complete":
            self.path.set_path(self.state['target_path'])
            self.report_errors.clear()
            self.path_revision += 1
            self.state.update(actual_path=[], path_progress=0.)
        self.path_stalled_time = 0.
        if self.state["engine"] == "SIM" and self.state.get("target_path"):
            pose = self.state.get("robot_pose", {})
            self.path.start_acquisition(pose.get("x", 0.0), pose.get("y", 0.0), self.state["target_path"])
        self.iface.start()
        self.state.update(is_paused=False, status="Running")

    def disconnect(self):
        old, self.iface = self.iface, None
        self.manual = None
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
        self.path.set_path(path)
        self.report_errors.clear()
        self.path_revision += 1
        self.path_stalled_time = 0.
        if path and self.state['is_running'] and not self.state['is_paused']:
            self.pause('Path ready; stopped')
        self.state.update(target_path=path, actual_path=[], path_progress=0.)
        if self.iface:
            self.iface.draw_target_path(path)
        if not path:
            self.pause("Path cleared; stopped")
            self.state.update(sim_time=0., telemetry={}, controller={"active": False, "x": 0., "y": 0., "trigger_rt": 0., "raw_buttons": {}}, is_reversed=False)
            if self.state["engine"] == "SIM" and hasattr(self.iface, "reset_pose"):
                self.iface.reset_pose()
                x, y, yaw = self.iface.get_robot_pose()
                self.state["robot_pose"] = {"x": x, "y": y, "yaw": yaw}
                self.state["segments"] = self.iface.get_all_segment_positions()
                self.state["actual_path"] = []

    def controller(self, data, now=None):
        received = time.monotonic()
        now = time.monotonic() if now is None else now
        if not isinstance(data, dict):
            raise ValueError('Controller input must be an object')
        for key in ('btn_start', 'btn_stop'):
            if key in data and type(data[key]) is not bool:
                raise ValueError(f'{key} must be boolean')
        buttons = data.get('raw_buttons', {})
        if not isinstance(buttons, dict) or len(buttons) > 32 or any(type(v) not in (bool, int) or v not in (0, 1) for v in buttons.values()):
            raise ValueError('raw_buttons must contain at most 32 boolean button states')
        if data.get('btn_stop') or data.get('deadman') is False:
            self.pause('Controller released; torque off')
            return
        if data.get('btn_start'):
            if not self.state['is_paused']:
                raise RuntimeError('Stop the current motion before starting controller mode')
            manual = ManualController(data.get('options'), now)
            manual.update(data, now)
            manual.check(now)
            if manual.inspection:
                raise ValueError('Head inspection requires the Gen 3 joint map')
            if manual.assist != 'manual' and self.state['engine'] != 'SIM':
                if not manual.verified or 'steering_sign' not in data.get('options', {}):
                    raise ValueError('Verify external localization and steering sign before navigation')
                self.localization.pose(now)
            if self.state['engine'] != 'SIM':
                measured = self.iface.read_telemetry() if self.iface else {}
                if any(not measured.get(i, {}).get('valid') or type(measured[i].get('position')) is not int or
                       not 1252 <= measured[i]['position'] <= 2844 for i in range(1, 11)):
                    raise RuntimeError('All ten measured servo positions are required before manual motion')
                manual.last_targets = {i: float(measured[i]['position']) for i in range(1, 11)}
            manual.check(now + time.monotonic() - received)
            self.start()
            self.manual = manual
            self.manual_phase = 0.
            self.manual_elapsed = 0.
            self.manual_tracking_since = {}
            stamp = max(time.time_ns(), int(self.controller_run_id or 0) + 1)
            self.controller_run_id = str(stamp)
            self.state['controller_run_id'] = self.controller_run_id
        elif self.manual:
            if data.get('run_id') != self.controller_run_id:
                raise ValueError('Current controller run_id required')
            self.manual.update(data, now)
        else:
            raise RuntimeError('Press Start while holding the controller enable bumper')
        c = self.state["controller"]
        c.update(x=self.manual.input['stick_x'], y=self.manual.input['stick_y'], raw_buttons=buttons)
        c["active"] = True
        c['manual'] = self.manual.snapshot()
        c['trigger_rt'] = self.manual.input['throttle']

    def is_path_complete(self, x, y, target):
        """Path is complete only when the snake has moved along the whole path to the final waypoint."""
        return len(target) > 1 and self.path.complete() and math.hypot(x - target[-1][0], y - target[-1][1]) <= .1

    def tick(self, dt, now=None):
        now = time.monotonic() if now is None else now
        s = self.state
        if not s["is_running"] or not self.iface:
            return
        if not s['is_paused'] and self.sessions and not self.sessions.is_operator(self.owner_session):
            self.pause('Operator lease expired; stopped')
            s['controller']['active'] = False
            if s.get('engine') == 'SIM':
                self.disconnect()
            return
        dt = max(0, min(.1, dt))
        if self.manual:
            try:
                self.manual.check(now)
            except InterruptedError as exc:
                self.pause(f'{exc}; torque off')
        c = s["controller"]
        sampled = False
        if s["engine"] == "SIM":
            x, y, yaw = self.iface.get_robot_pose()
            if not all(math.isfinite(v) for v in (x, y, yaw)):
                self.pause("Simulation pose unavailable; stopped")
                s["pose_valid"] = False
                return
            s["pose_valid"] = True
            s["robot_pose"] = {"x": x, "y": y, "yaw": yaw}
            s["segments"] = self.iface.get_all_segment_positions()
            if not s['is_paused'] and (not s["actual_path"] or math.hypot(s["actual_path"][-1][0] - x, s["actual_path"][-1][1] - y) > .02):
                sampled = True
                s["actual_path"].append([x, y])
                s["actual_path"] = s["actual_path"][-10000:]
        if not s["is_paused"]:
            params = s["params"]
            speed = params["speed"] * (.1 if params["low_power"] else 1)
            turn = 0.
            target = s["target_path"]
            manual_angles = None
            if self.manual:
                pose = s['robot_pose'] if s['engine'] == 'SIM' else None
                if self.manual.assist != 'manual' and s['engine'] != 'SIM':
                    try:
                        pose = self.localization.pose(now)
                        s.update(robot_pose=pose, pose_valid=True)
                    except RuntimeError as exc:
                        s['pose_valid'] = False
                        self.pause(str(exc))
                        return
                self.manual.feedback(s['telemetry'], 216, dt)
                base = dict(yaw=params['amp'], pitch=0., bias=0., frequency=params['freq'], lag=params['phase'], offset=0.)
                try:
                    self.manual_elapsed += dt
                    p = self.manual.parameters(base, dt, pose, self.manual_elapsed)
                except InterruptedError as exc:
                    self.pause(str(exc))
                    return
                s['sim_time'] += dt * speed
                phase = getattr(self, 'manual_phase', 0.) + dt * speed * p['frequency']
                self.manual_phase = phase
                joints = [dict(id=i, zero=2048, min=1252, max=2844) for i in range(1, 11)]
                desired = {i: 2048 + 4096 / (2 * math.pi) * (p['yaw'] * math.sin(phase - (i - 1) * p['lag']) + p['bias']) for i in range(1, 11)}
                positions = self.manual.limit_targets(desired, joints, 600 if params['low_power'] else 2400, self.manual_elapsed)
                manual_angles = {i: (v - 2048) * (2 * math.pi) / 4096 for i, v in positions.items()}
                s['is_reversed'] = self.manual.reversed
                c['manual'] = self.manual.snapshot()
                if self.manual.route:
                    s['path_progress'] = self.manual.route.snapshot()['progress']
            elif s["engine"] == "SIM" and target:
                previous = self.path.passed
                accepted = self.path.observe(x, y)
                s['path_progress'] = self.path.progress()
                self.path_stalled_time = 0. if self.path.passed > previous else self.path_stalled_time + dt
                if accepted and sampled:
                    error = self.path.deviation(x, y)
                    if error is not None:
                        self.report_errors.append(error)
                        self.report_errors = self.report_errors[-10000:]
                turn = self.path.calculate_steering(x, y, yaw, target, dt=dt)
                if self.is_path_complete(x, y, target):
                    self.pause("Path Complete")
                elif len(target) > 1 and self.path_stalled_time >= 30.:
                    self.pause("Path stalled; ordered progress not verified")
            if not s["is_paused"]:
                if manual_angles is None:
                    s["sim_time"] += dt * speed * (-1 if s["is_reversed"] else 1)
                    self.gait.amplitude = params["amp"]
                    self.gait.frequency = params["freq"]
                    self.gait.phase_shift = params["phase"]
                    positions, angles = self.gait.calculate_positions(s["sim_time"], turn)
                else:
                    angles = manual_angles
                if s["engine"] == "SIM":
                    self.iface.dt = dt or .02
                    self.iface.update_physics(params["fric"], 0, 1.5, [x, y, 0])
                    # Low power mode clamps force per motor individually (< 2A / 1.8 Nm safe envelope)
                    motor_force = min(1.8, params["force"]) if params["low_power"] else params["force"]
                    self.iface.write_positions(angles, max_force=motor_force)
                else:
                    self.iface.write_positions(positions, speed=600 if params["low_power"] else 2400)
        s["telemetry"] = self.iface.read_telemetry()
        if self.manual and not s['is_paused']:
            for sid, row in s['telemetry'].items():
                row['target'] = positions.get(sid)
            if s['engine'] != 'SIM':
                for sid in range(1, 11):
                    row = s['telemetry'].get(sid, {})
                    if not row.get('valid') or type(row.get('position')) is not int or not 1252 <= row['position'] <= 2844:
                        self.pause(f'Joint {sid}: missing or invalid feedback; stopped')
                        return
                    if abs(row['position'] - positions[sid]) > 216:
                        self.manual_tracking_since.setdefault(sid, now)
                        if now - self.manual_tracking_since[sid] > .5:
                            self.pause(f'Joint {sid}: sustained tracking error; stopped')
                            return
                    else:
                        self.manual_tracking_since.pop(sid, None)
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

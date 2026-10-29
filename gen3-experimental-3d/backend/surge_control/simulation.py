"""Gen 2.1 simplified planar simulation; not a validated mechanical twin."""
from pathlib import Path
import math


class SimulationInterface:
    def __init__(self, num_motors=10):
        self.num_motors = num_motors
        self.is_connected = False
        self.snake_id = None
        self.p = None
        self.headless = True
        self.sliders = {}
        self.target_path_ids = []
        self.dt = 0.02

    def connect(self, headless=False):
        try:
            import pybullet
            import pybullet_data
            from pybullet_utils.bullet_client import BulletClient
            self.headless = headless
            self.p = BulletClient(connection_mode=pybullet.DIRECT if headless else pybullet.GUI)
            p = self.p
            p.setAdditionalSearchPath(pybullet_data.getDataPath())
            p.setGravity(0, 0, -9.81)
            p.setTimeStep(self.dt)
            p.loadURDF("plane.urdf")
            model = Path(__file__).resolve().parents[1] / "simulation/pybullet/snake.urdf"
            self.snake_id = p.loadURDF(str(model), [0, 0, 0.05], flags=p.URDF_USE_SELF_COLLISION | p.URDF_USE_SELF_COLLISION_EXCLUDE_PARENT)
            if p.getNumJoints(self.snake_id) != self.num_motors:
                raise ValueError("URDF joint count does not match controller")
            if not headless:
                for key, label, low, high, value in [
                    ("pov", "Camera view", 0, 2, 0), ("zoom", "Camera zoom", .1, 10, 1.5),
                    ("amp", "Amplitude (rad)", .1, 1.2, .8), ("freq", "Frequency (rad/s)", .1, 5, 2),
                    ("phase", "Phase lag (rad)", .1, 3, 1), ("force", "Torque cap (Nm)", .1, 2.94, 2.0),
                    ("fric", "Lateral/forward friction ratio", 1, 50, 20)]:
                    self.sliders[key] = p.addUserDebugParameter(label, low, high, value)
            self.is_connected = True
            return True, "Planar simulation: 11 links / 10 joints"
        except Exception as exc:
            self.disconnect()
            return False, str(exc)

    def start(self):
        if not self.is_connected:
            raise RuntimeError("Simulation disconnected")

    def stop(self):
        if self.is_connected:
            for j in range(self.num_motors):
                self.p.setJointMotorControl2(self.snake_id, j, self.p.VELOCITY_CONTROL, force=0)

    def reset_pose(self):
        if self.is_connected and self.p is not None:
            p = self.p
            p.resetBasePositionAndOrientation(self.snake_id, [0, 0, 0.05], [0, 0, 0, 1])
            p.resetBaseVelocity(self.snake_id, [0, 0, 0], [0, 0, 0])
            for j in range(self.num_motors):
                p.resetJointState(self.snake_id, j, targetValue=0.0, targetVelocity=0.0)
                p.setJointMotorControl2(self.snake_id, j, p.POSITION_CONTROL, targetPosition=0.0, force=2.0)

    def disconnect(self):
        if self.p is not None:
            try:
                self.p.disconnect()
            finally:
                self.p = None
        self.is_connected = False

    def draw_target_path(self, path):
        if self.headless or not self.is_connected:
            return
        for item in self.target_path_ids:
            self.p.removeUserDebugItem(item)
        self.target_path_ids = [self.p.addUserDebugLine([*a, .02], [*b, .02], [0, 0, 1], 3)
                               for a, b in zip(path, path[1:])]

    def read_sliders(self):
        if self.headless:
            return {"pov": 0, "zoom": 1.5, "amp": .8, "freq": 2, "phase": 1, "force": 2, "fric": 20}
        return {key: self.p.readUserDebugParameter(value) for key, value in self.sliders.items()}

    def update_physics(self, fric_ratio, pov_mode, zoom, base_pos):
        if not math.isfinite(fric_ratio) or fric_ratio < 1:
            raise ValueError("Friction ratio must be >= 1")
        for j in range(-1, self.num_motors):
            self.p.changeDynamics(self.snake_id, j, lateralFriction=.05 * fric_ratio,
                                  anisotropicFriction=[1 / fric_ratio, 1, 1])
        if not self.headless:
            self.p.resetDebugVisualizerCamera(zoom, 0 if int(pov_mode) == 1 else 45,
                                             -89 if int(pov_mode) == 1 else -30, base_pos)

    def write_positions(self, angles_dict, max_force=2.0):
        if not self.is_connected:
            raise RuntimeError("Simulation disconnected")
        for sid, angle in angles_dict.items():
            if not 1 <= sid <= self.num_motors:
                raise ValueError("Invalid joint ID")
            self.p.setJointMotorControl2(self.snake_id, sid - 1, self.p.POSITION_CONTROL,
                                        targetPosition=max(-math.radians(70), min(math.radians(70), angle)),
                                        force=max(0, min(2.94, max_force)))
        self.p.setTimeStep(self.dt)
        self.p.stepSimulation()

    def get_robot_pose(self):
        pos, quat = self.p.getBasePositionAndOrientation(self.snake_id)
        return pos[0], pos[1], self.p.getEulerFromQuaternion(quat)[2]

    def get_all_segment_positions(self):
        return [tuple(segment["pos"][:2]) for segment in self.get_3d_state()]

    def get_3d_state(self):
        if not self.is_connected:
            return []
        pos, quat = self.p.getBasePositionAndOrientation(self.snake_id)
        result = [{"pos": pos, "quat": quat}]
        for j in range(self.num_motors):
            data = self.p.getLinkState(self.snake_id, j)
            result.append({"pos": data[0], "quat": data[1]})
        return result

    def read_telemetry(self):
        return {j + 1: {"valid": True, "position": round(2048 + s[0] * 4096 / (2 * math.pi)),
                        "velocity": s[1], "load": None, "torque_nm": s[3]}
                for j in range(self.num_motors) for s in [self.p.getJointState(self.snake_id, j)]}

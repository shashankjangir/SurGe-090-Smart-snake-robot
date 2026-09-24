import pybullet as p
import pybullet_data
import time
import math

class SimulationInterface:
    """Handles PyBullet physics simulation acting as a digital twin for the hardware."""
    def __init__(self, num_motors=10):
        self.num_motors = num_motors
        self.is_connected = False
        self.snake_id = None
        self.sliders = {}
        self.base_forward_friction = 0.05
        self.last_head_pos = None
        self.last_tail_pos = None
        self.step_counter = 0
        self.target_path_ids = []
        
    def connect(self, headless=False):
        """Initializes PyBullet and loads the snake URDF. Uses DIRECT mode if headless."""
        self.headless = headless
        try:
            if headless:
                self.client_id = p.connect(p.DIRECT)
            else:
                self.client_id = p.connect(p.GUI)
                
            p.setAdditionalSearchPath(pybullet_data.getDataPath())
            p.setGravity(0, 0, -9.81)
            
            if not headless:
                p.configureDebugVisualizer(p.COV_ENABLE_GUI, 1)
            p.loadURDF("plane.urdf")
            if not headless:
                for i in range(-20, 21): 
                    x = i * 0.5 
                    p.addUserDebugLine([x, -10, 0.01], [x, 10, 0.01], [0.8, 0.8, 0.8], 1)
                    p.addUserDebugLine([-10, x, 0.01], [10, x, 0.01], [0.8, 0.8, 0.8], 1)
                p.addUserDebugLine([-10, 0, 0.02], [10, 0, 0.02], [0, 0, 0], 2)
                p.addUserDebugLine([0, -10, 0.02], [0, 10, 0.02], [0, 0, 0], 2)
                
            startPos = [0, 0, 0.05]
            startOrientation = p.getQuaternionFromEuler([0, 0, 0])
            self.snake_id = p.loadURDF("snake.urdf", startPos, startOrientation, flags=p.URDF_USE_SELF_COLLISION | p.URDF_USE_SELF_COLLISION_EXCLUDE_PARENT)
            
            if not headless:
                self.sliders['pov'] = p.addUserDebugParameter("POV (0:Follow, 1:Top, 2:Side)", 0, 2, 0)
                self.sliders['zoom'] = p.addUserDebugParameter("Camera Zoom", 0.1, 10.0, 1.5)
                self.sliders['amp'] = p.addUserDebugParameter("Sine Amplitude", 0.1, 1.5, 0.8)
                self.sliders['freq'] = p.addUserDebugParameter("Sine Speed (Freq)", 0.1, 5.0, 2.0)
                self.sliders['phase'] = p.addUserDebugParameter("Phase Lag", 0.1, 3.0, 1.0)
                self.sliders['force'] = p.addUserDebugParameter("Max Motor Force", 0.1, 20.0, 5.0)
                self.sliders['fric'] = p.addUserDebugParameter("Wheel Effect (Lat/Fwd)", 1.0, 50.0, 20.0)
                
            self.is_connected = True
            return True, "Simulation Started Successfully"
        except Exception as e:
            return False, f"Failed to start PyBullet: {e}"
            
    def disconnect(self):
        """Closes PyBullet."""
        if self.is_connected:
            p.disconnect(self.client_id)
            self.is_connected = False
            
    def draw_target_path(self, path):
        """Draws the target blue path directly onto the PyBullet ground."""
        if not self.is_connected or getattr(self, 'headless', False): return
        try:
            for lid in self.target_path_ids:
                p.removeUserDebugItem(lid)
            self.target_path_ids.clear()
            step = max(1, len(path) // 200)
            for i in range(0, len(path)-step, step):
                p1 = [path[i][0], path[i][1], 0.02]
                p2 = [path[i+step][0], path[i+step][1], 0.02]
                lid = p.addUserDebugLine(p1, p2, lineColorRGB=[0, 0, 1], lineWidth=4)
                self.target_path_ids.append(lid)
        except p.error:
            self.is_connected = False

    def read_sliders(self):
        """Reads user parameters from the PyBullet UI sliders."""
        if not self.is_connected: return {}
        if getattr(self, 'headless', False):
            return {
                'pov': 0, 'zoom': 1.5, 'amp': 0.8, 'freq': 2.0, 
                'phase': 1.0, 'force': 5.0, 'fric': 20.0
            }
        try:
            return {
                'pov': int(p.readUserDebugParameter(self.sliders['pov'])),
                'zoom': p.readUserDebugParameter(self.sliders['zoom']),
                'amp': p.readUserDebugParameter(self.sliders['amp']),
                'freq': p.readUserDebugParameter(self.sliders['freq']),
                'phase': p.readUserDebugParameter(self.sliders['phase']),
                'force': p.readUserDebugParameter(self.sliders['force']),
                'fric': p.readUserDebugParameter(self.sliders['fric'])
            }
        except p.error:
            self.is_connected = False
            return {}
            
    def update_physics(self, fric_ratio, pov_mode, zoom, base_pos):
        """Applies dynamic friction scaling, updates camera tracking, and draws trails."""
        if not self.is_connected: return
        try:
            lateral_f = self.base_forward_friction * fric_ratio
            p.changeDynamics(self.snake_id, -1, lateralFriction=lateral_f, anisotropicFriction=[1.0/fric_ratio, 1, 1])
            num_j = p.getNumJoints(self.snake_id)
            for j in range(num_j):
                p.changeDynamics(self.snake_id, j, lateralFriction=lateral_f, anisotropicFriction=[1.0/fric_ratio, 1, 1])
                
            if getattr(self, 'headless', False):
                return  # Skip camera updates and debug lines in headless
                
            if pov_mode == 0: 
                p.resetDebugVisualizerCamera(cameraDistance=zoom, cameraYaw=45, cameraPitch=-30, cameraTargetPosition=base_pos)
            elif pov_mode == 1: 
                p.resetDebugVisualizerCamera(cameraDistance=zoom*1.5, cameraYaw=0, cameraPitch=-89.9, cameraTargetPosition=base_pos)
            elif pov_mode == 2: 
                p.resetDebugVisualizerCamera(cameraDistance=zoom*1.2, cameraYaw=90, cameraPitch=-10, cameraTargetPosition=base_pos)
            tail_state = p.getLinkState(self.snake_id, num_j - 1)
            tail_pos = tail_state[0]
            if self.last_head_pos is None:
                self.last_head_pos = base_pos
                self.last_tail_pos = tail_pos
            if self.step_counter % 10 == 0:
                p.addUserDebugLine(self.last_head_pos, base_pos, lineColorRGB=[0.5, 0, 0.5], lineWidth=4, lifeTime=0)
                self.last_head_pos = base_pos
                self.last_tail_pos = tail_pos
            self.step_counter += 1
        except p.error:
            self.is_connected = False
            
    def write_positions(self, angles_dict, max_force=5.0):
        """Applies target motor angles and steps the physics engine."""
        if not self.is_connected: return
        try:
            num_j = p.getNumJoints(self.snake_id)
            for dxl_id, angle in angles_dict.items():
                joint_idx = dxl_id - 1
                if joint_idx < num_j:
                    p.setJointMotorControl2(self.snake_id, joint_idx, p.POSITION_CONTROL, targetPosition=angle, force=max_force)
            p.stepSimulation()
        except p.error:
            self.is_connected = False
        
    def get_robot_pose(self):
        """Gets current (X, Y, Yaw) pose of the snake head."""
        if not self.is_connected: return 0, 0, 0
        try:
            pos, orn = p.getBasePositionAndOrientation(self.snake_id)
            _, _, yaw = p.getEulerFromQuaternion(orn)
            return pos[0], pos[1], yaw
        except p.error:
            self.is_connected = False
            return 0, 0, 0
            
    def get_all_segment_positions(self):
        """Gets (X,Y) tuples for all snake segments."""
        if not self.is_connected: return []
        segments = []
        try:
            pos, _ = p.getBasePositionAndOrientation(self.snake_id)
            segments.append((pos[0], pos[1]))
            num_j = p.getNumJoints(self.snake_id)
            for i in range(num_j):
                state = p.getLinkState(self.snake_id, i)
                segments.append((state[0][0], state[0][1]))
            return segments
        except p.error:
            self.is_connected = False
            return []
            
    def read_telemetry(self):
        """Extracts live virtual load, velocity, and position telemetry from joints."""
        telemetry = {}
        if not self.is_connected: return telemetry
        try:
            num_j = p.getNumJoints(self.snake_id)
            for i in range(min(self.num_motors, num_j)):
                state = p.getJointState(self.snake_id, i)
                pos_rad = state[0]
                vel_rads = state[1]
                force = state[3]
                dxl_id = i + 1
                telemetry[dxl_id] = {
                    'load': int(force * 100),
                    'velocity': int(vel_rads * 10), 
                    'position': int((pos_rad / (2*math.pi)) * 4096) + 2048
                }
            return telemetry
        except p.error:
            self.is_connected = False
            return {}

    def get_3d_state(self):
        """Returns 3D XYZ and Quaternion of all segments for Three.js"""
        if not self.is_connected: return []
        segments_3d = []
        try:
            pos, orn = p.getBasePositionAndOrientation(self.snake_id)
            segments_3d.append({"pos": pos, "quat": orn})
            num_j = p.getNumJoints(self.snake_id)
            for i in range(num_j):
                state = p.getLinkState(self.snake_id, i)
                segments_3d.append({"pos": state[0], "quat": state[1]})
            return segments_3d
        except p.error:
            self.is_connected = False
            return []

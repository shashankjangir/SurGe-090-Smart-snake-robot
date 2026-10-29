"""Simple alternating-axis PyBullet bench; dimensions are placeholders, not CAD."""
import tempfile
from pathlib import Path

from gait import COUNTS_PER_RADIAN


def robot_xml(config, length, mass):
    parts = ['<robot name="gen3_bench">']
    for i in range(11):
        inertia = mass * length * length / 6
        parts.append(f'''<link name="link{i}">
          <inertial><origin xyz="{length/2} 0 0"/><mass value="{mass}"/>
            <inertia ixx="{inertia}" ixy="0" ixz="0" iyy="{inertia}" iyz="0" izz="{inertia}"/></inertial>
          <visual><origin xyz="{length/2} 0 0"/><geometry><box size="{length} 0.04 0.04"/></geometry></visual>
          <collision><origin xyz="{length/2} 0 0"/><geometry><box size="{length*.85} 0.04 0.04"/></geometry></collision>
        </link>''')
        if i:
            joint = config['joints'][i-1]
            axis = '0 0 1' if joint['axis'] == 'yaw' else '0 1 0'
            limits = [(joint[k] - joint['zero']) / (joint['sign'] * COUNTS_PER_RADIAN) for k in ('min', 'max')]
            parts.append(f'''<joint name="servo{joint['id']}" type="revolute">
              <parent link="link{i-1}"/><child link="link{i}"/>
              <origin xyz="{length} 0 0"/><axis xyz="{axis}"/>
              <limit lower="{min(limits)}" upper="{max(limits)}" effort="2.94" velocity="5"/>
            </joint>''')
    return ''.join(parts) + '</robot>'


class SimulationInterface:
    def __init__(self, config, length=.1, mass=.25, torque=.3, headless=False):
        self.config = config
        self.length, self.mass, self.torque = length, mass, torque
        self.headless = headless
        self.p = None
        self.armed = False

    def connect(self):
        import pybullet
        import pybullet_data
        from pybullet_utils.bullet_client import BulletClient
        self.p = BulletClient(connection_mode=pybullet.DIRECT if self.headless else pybullet.GUI)
        self.p.setAdditionalSearchPath(pybullet_data.getDataPath())
        self.p.setTimeStep(1/240)
        self.p.setGravity(0, 0, -9.81)
        self.p.loadURDF('plane.urdf')
        with tempfile.TemporaryDirectory(prefix='surge-gen3-') as directory:
            path = Path(directory) / 'snake.urdf'
            path.write_text(robot_xml(self.config, self.length, self.mass), encoding='utf-8')
            self.body = self.p.loadURDF(str(path), [0, 0, .04],
                flags=self.p.URDF_USE_SELF_COLLISION | self.p.URDF_USE_SELF_COLLISION_EXCLUDE_PARENT)
        self.stop()
        self.p.resetDebugVisualizerCamera(1.7, 35, -35, [.5, 0, 0])
        return True, 'Illustrative alternating-axis simulation'

    def start(self):
        self.armed = True

    def stop(self):
        self.armed = False
        if self.p is not None and hasattr(self, 'body'):
            for i in range(10):
                self.p.setJointMotorControl2(self.body, i, self.p.VELOCITY_CONTROL, force=0)

    def disconnect(self):
        if self.p is not None:
            try:
                self.stop()
            finally:
                self.p.disconnect()
                self.p = None

    def write_positions(self, positions, speed):
        if not self.armed:
            raise RuntimeError('Simulation is not armed')
        for i, joint in enumerate(self.config['joints']):
            if joint['id'] in positions:
                angle = (positions[joint['id']] - joint['zero']) / (joint['sign'] * COUNTS_PER_RADIAN)
                self.p.setJointMotorControl2(self.body, i, self.p.POSITION_CONTROL,
                    targetPosition=angle, maxVelocity=speed / COUNTS_PER_RADIAN, force=self.torque)

    def link_positions(self):
        # World-space centers of the floating base and ten child links.
        return [list(self.p.getBasePositionAndOrientation(self.body)[0])] + [
            list(self.p.getLinkState(self.body, i, computeForwardKinematics=True)[0])
            for i in range(10)
        ]

    def read_telemetry(self):
        # shortcut: fixed 50 ms physics per sample; use a measured model for performance predictions.
        for _ in range(12):
            self.p.stepSimulation()
        state = {}
        for i, joint in enumerate(self.config['joints']):
            position, velocity, _, _ = self.p.getJointState(self.body, i)
            state[joint['id']] = {'valid': True,
                'position': round(joint['zero'] + joint['sign'] * position * COUNTS_PER_RADIAN),
                'velocity': round(joint['sign'] * velocity * COUNTS_PER_RADIAN), 'load': None}
        return state

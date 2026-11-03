"""Gen 3 prototype assembly; mass, inertia and contact remain illustrative."""
import json
import math
import tempfile
from pathlib import Path

from collections import deque

from gait import COUNTS_PER_RADIAN

# ST3215 response fitted to the 24-26 Oct hardware logs (tools/replay_run.py --all): feedback trails
# the command by 0.25 s on average (sim with this delay: 0.23 s) and settles 2-4 counts short. Stall torque 2.94 Nm at 12 V, scaled to 3S.
SERVO_DELAY = .1
SERVO_DEADBAND = 3
SERVO_TORQUE = 2.94 * 11.1 / 12
PHYSICS_DT = 1 / 240

MODELS = Path(__file__).resolve().parent / 'backend/web_dashboard/static/models'


def robot_xml(config, length, mass):
    assembly = json.loads((MODELS / 'gen3-cad.json').read_text(encoding='utf-8')) if length is None else None
    parts = ['<robot name="gen3_bench">']
    for i in range(11):
        span = length if assembly is None else abs(assembly['bodies'][max(i, 1)]['origin'][0] - assembly['bodies'][max(i, 1)-1]['origin'][0])
        center = [-span/2, 0, 0] if assembly is None else assembly['bodies'][i]['center']
        xyz = ' '.join(str(v) for v in center)
        visual = f'<box size="{span} 0.04 0.04"/>' if assembly is None else f'<mesh filename="{(MODELS / f"gen3-body-{i}.obj").as_posix()}"/>'
        # contact box section follows the CAD body (round V2: 0.057 m), so the body rests on its skin
        h = .04 if assembly is None or 'size' not in assembly['bodies'][i] else min(assembly['bodies'][i]['size'][1:])
        # Round V2 body: contact is a cylinder along the spine, so pitch waves roll and lift on
        # the real skin instead of box edges. shortcut: uniform link mass until segments are weighed.
        r = h / 2
        parts.append(f'''<link name="link{i}">
          <inertial><origin xyz="{xyz}"/><mass value="{mass}"/>
            <inertia ixx="{mass * r**2 / 2}" ixy="0" ixz="0" iyy="{mass * (3 * r**2 + span**2) / 12}" iyz="0" izz="{mass * (3 * r**2 + span**2) / 12}"/></inertial>
          <visual><origin xyz="{xyz}"/><geometry>{visual}</geometry></visual>
          <collision><origin xyz="{xyz}" rpy="0 1.5707963 0"/><geometry><cylinder radius="{r}" length="{span*.85}"/></geometry></collision>
        </link>''')
        if i:
            joint = config['joints'][i-1]
            axis = '0 0 1' if joint['axis'] == 'yaw' else '0 1 0'
            limits = [(joint[k] - joint['zero']) / (joint['sign'] * COUNTS_PER_RADIAN) for k in ('min', 'max')]
            offset = -length if assembly is None else assembly['bodies'][i]['origin'][0] - assembly['bodies'][i-1]['origin'][0]
            parts.append(f'''<joint name="servo{joint['id']}" type="revolute">
              <parent link="link{i-1}"/><child link="link{i}"/>
              <origin xyz="{offset} 0 0"/><axis xyz="{axis}"/>
              <limit lower="{min(limits)}" upper="{max(limits)}" effort="2.94" velocity="5"/>
            </joint>''')
    return ''.join(parts) + '</robot>'


class SimulationInterface:
    def __init__(self, config, length=None, mass=.25, torque=SERVO_TORQUE, headless=False,
                 delay=SERVO_DELAY, deadband=SERVO_DEADBAND):
        self.config = config
        self.length, self.mass, self.torque = length, mass, torque
        self.delay, self.deadband = delay, deadband
        self.headless = headless
        self.p = None
        self.armed = False
        self.time = 0.
        self.pending = deque()  # (apply_at, positions, speed): commands still in flight

    def connect(self):
        import pybullet
        import pybullet_data
        from pybullet_utils.bullet_client import BulletClient
        self.p = BulletClient(connection_mode=pybullet.DIRECT if self.headless else pybullet.GUI)
        self.p.setAdditionalSearchPath(pybullet_data.getDataPath())
        self.p.setTimeStep(PHYSICS_DT)
        self.p.setGravity(0, 0, -9.81)
        self.p.loadURDF('plane.urdf')
        with tempfile.TemporaryDirectory(prefix='surge-gen3-') as directory:
            path = Path(directory) / 'snake.urdf'
            path.write_text(robot_xml(self.config, self.length, self.mass), encoding='utf-8')
            self.body = self.p.loadURDF(str(path), [0, 0, .06],
                flags=self.p.URDF_USE_SELF_COLLISION | self.p.URDF_USE_SELF_COLLISION_EXCLUDE_PARENT)
        self.stop()
        # shortcut: directional contact is illustrative; fit it to measured surface trials later.
        for i in range(-1, 10):
            self.p.changeDynamics(self.body, i, lateralFriction=.8,
                                  anisotropicFriction=[.1, 1, 1], restitution=0)
        self.p.resetDebugVisualizerCamera(1.7, 35, -35, [.5, 0, 0])
        return True, 'Gen 3 prototype assembly; mass and contact illustrative'

    def start(self):
        self.armed = True

    def stop(self):
        self.armed = False
        self.pending.clear()
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
        # Radio + bus latency: the servo sees the command only after the delay.
        self.pending.append((self.time + self.delay, dict(positions), speed))

    def _apply(self, positions, speed):
        for i, joint in enumerate(self.config['joints']):
            if joint['id'] in positions:
                angle = (positions[joint['id']] - joint['zero']) / (joint['sign'] * COUNTS_PER_RADIAN)
                current = self.p.getJointState(self.body, i)[0]
                if abs(angle - current) * COUNTS_PER_RADIAN <= self.deadband:
                    angle = current  # inside the servo dead zone: hold where it is
                self.p.setJointMotorControl2(self.body, i, self.p.POSITION_CONTROL,
                    targetPosition=angle, maxVelocity=speed / COUNTS_PER_RADIAN, force=self.torque)

    def link_positions(self):
        # World-space centers of the floating base and ten child links.
        return [list(self.p.getBasePositionAndOrientation(self.body)[0])] + [
            list(self.p.getLinkState(self.body, i, computeForwardKinematics=True)[0])
            for i in range(10)
        ]

    def link_poses(self):
        base = self.p.getBasePositionAndOrientation(self.body)
        return [dict(position=list(base[0]), quaternion=list(base[1]))] + [
            dict(position=list(s[0]), quaternion=list(s[1])) for s in
            (self.p.getLinkState(self.body, i, computeForwardKinematics=True) for i in range(10))
        ]

    def head_pose(self):
        """ID 1 head-body COM; local +X points away from the tail, Z is up."""
        position, quaternion = self.p.getBasePositionAndOrientation(self.body)
        forward = self.p.getMatrixFromQuaternion(quaternion)
        return dict(position=list(position), quaternion=list(quaternion),
                    yaw=math.atan2(forward[3], forward[0]))

    def step(self, seconds):
        for _ in range(max(1, round(seconds / PHYSICS_DT))):
            while self.pending and self.pending[0][0] <= self.time:
                self._apply(*self.pending.popleft()[1:])
            self.p.stepSimulation()
            self.time += PHYSICS_DT

    def read_telemetry(self, dt=.05):
        # Advances physics by dt (the control period by default; replay passes logged intervals).
        self.step(dt)
        state = {}
        for i, joint in enumerate(self.config['joints']):
            position, velocity, _, _ = self.p.getJointState(self.body, i)
            state[joint['id']] = {'valid': True,
                'position': round(joint['zero'] + joint['sign'] * position * COUNTS_PER_RADIAN),
                'velocity': round(joint['sign'] * velocity * COUNTS_PER_RADIAN), 'load': None}
        return state

"""Native assembly provenance, rigid ownership and articulated joint placement."""
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from gait import load_map
from simulation import MODELS, SimulationInterface, robot_xml
import xml.etree.ElementTree as ET


class AssemblyTest(unittest.TestCase):
    def test_native_source_and_rigid_body_ownership(self):
        model = json.loads((MODELS / 'gen3-cad.json').read_text())
        source = next(k for k in model['sources'] if k.endswith('.SLDASM'))
        self.assertEqual(hashlib.sha256((ROOT / source).read_bytes()).hexdigest(), model['sources'][source])
        self.assertEqual(len(model['bodies']), 11)
        for i in range(1, 11):
            case = next(m for m in model['meshes'] if m['name'] == f'servo_ID{i}_case_nominal_step')
            horn = next(m for m in model['meshes'] if m['name'] == f'servo_ID{i}_horn_and_rear_disc_step')
            self.assertEqual(case['body'], i)
            self.assertEqual(horn['body'], i-1)
        urdf = ET.fromstring(robot_xml(load_map(), None, .25))
        for i, joint in enumerate(urdf.findall('joint')):
            self.assertAlmostEqual(float(joint.find('origin').get('xyz').split()[0]), -.02061 if i == 0 else -.05837)
        for i, link in enumerate(urdf.findall('link')):
            self.assertTrue(Path(link.find('visual/geometry/mesh').get('filename')).is_file())
            self.assertEqual([float(v) for v in link.find('inertial/origin').get('xyz').split()], model['bodies'][i]['center'])

    def test_neutral_and_each_joint_keep_cad_pivots_connected(self):
        sim = SimulationInterface(load_map(), headless=True)
        self.addCleanup(sim.disconnect)
        sim.connect()
        model = json.loads((MODELS / 'gen3-cad.json').read_text())
        for joint in range(10):
            sim.p.resetJointState(sim.body, joint, .2)
            for i in range(10):
                # PyBullet link frame is the pivot, while published poses are COM frames.
                child = sim.p.getLinkState(sim.body, i, computeForwardKinematics=True)
                if i:
                    parent = sim.p.getLinkState(sim.body, i-1, computeForwardKinematics=True)
                    p, q = parent[4], parent[5]
                else:
                    p, q = sim.p.getBasePositionAndOrientation(sim.body)
                    center = model['bodies'][0]['center']
                    p, _ = sim.p.multiplyTransforms(p, q, [-v for v in center], [0, 0, 0, 1])
                dx = model['bodies'][i+1]['origin'][0] - model['bodies'][i]['origin'][0]
                expected, _ = sim.p.multiplyTransforms(p, q, [dx, 0, 0], [0, 0, 0, 1])
                for actual, wanted in zip(child[4], expected):
                    self.assertAlmostEqual(actual, wanted, places=6)
            sim.p.resetJointState(sim.body, joint, 0)


if __name__ == '__main__':
    unittest.main()

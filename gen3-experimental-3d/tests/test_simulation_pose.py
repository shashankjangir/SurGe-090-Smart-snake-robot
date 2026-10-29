"""Focused check that the Gen 3 viewer receives a moving floating body."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gait import load_map
from simulation import SimulationInterface


class SimulationPoseTest(unittest.TestCase):
    def test_world_positions_follow_floating_body(self):
        sim = SimulationInterface(load_map(), headless=True)
        try:
            sim.connect()
            before = sim.link_positions()
            sim.p.resetBasePositionAndOrientation(sim.body, [before[0][0] + 0.3, 0, 0.2], [0, 0, 0, 1])
            after = sim.link_positions()
            self.assertEqual(len(after), 11)
            self.assertGreater(after[0][0] - before[0][0], 0.29)
            self.assertGreater(after[-1][0] - before[-1][0], 0.29)
        finally:
            sim.disconnect()


if __name__ == '__main__':
    unittest.main()


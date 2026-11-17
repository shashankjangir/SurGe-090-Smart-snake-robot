"""The layout check must work without private files from the original machine."""
import importlib.util
from pathlib import Path
import tempfile
import unittest


spec = importlib.util.spec_from_file_location(
    'verify_layout', Path(__file__).resolve().parents[1] / 'tools/verify_layout.py')
layout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)


class LayoutTests(unittest.TestCase):
    def test_portable_export_and_path_boundaries(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in (
                'generations/gen1-dynamixel/README.md',
                'generations/gen2-st3215/README.md',
                'generations/gen3-experimental-3d/README.md',
                'generations/gen3-experimental-3d/joint_map.json',
                'docs/GEN3_HANDOFF.md', 'docs/REPOSITORY_LAYOUT.md',
                'generations/gen2-st3215/firmware/receiver_gen2_1/receiver_gen2_1.cpp',
                'generations/gen2-st3215/firmware/transmitter_gen2_1/transmitter_gen2_1.cpp',
            ):
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.touch()
            (root / 'platformio.ini').write_text(
                '[platformio]\nsrc_dir = generations/gen2-st3215/firmware\n')
            manifest = root / 'docs/reorganization/moves.csv'
            manifest.parent.mkdir()
            manifest.write_text('current_path\ngenerations/gen3-experimental-3d/operators.json\n')
            cad = root / 'gen3-experimental-3d/cad'
            cad.mkdir(parents=True)
            self.assertEqual(layout.verify(root), (1, 0))
            manifest.write_text('current_path\n../private.txt\n')
            with self.assertRaises(AssertionError):
                layout.verify(root)


if __name__ == '__main__':
    unittest.main()

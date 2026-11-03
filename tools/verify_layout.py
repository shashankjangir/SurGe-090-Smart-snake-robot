"""Check repository paths and dashboard assets without opening hardware."""
from pathlib import Path
import configparser
import csv
import re

ROOT = Path(__file__).resolve().parents[1]


def verify(root=ROOT):
    for name in ('gen1-dynamixel', 'gen2-st3215', 'gen3-experimental-3d'):
        assert (root / 'generations' / name / 'README.md').is_file(), name
        assert not (root / name).exists(), f'Duplicate old generation path: {name}'
    for name in ('docs/GEN3_HANDOFF.md', 'docs/REPOSITORY_LAYOUT.md',
                 'docs/reorganization/moves.csv', 'platformio.ini',
                 'generations/gen3-experimental-3d/joint_map.json'):
        assert (root / name).is_file(), name
    config = configparser.ConfigParser()
    config.read(root / 'platformio.ini')
    firmware = config['platformio']['src_dir']
    assert firmware == 'generations/gen2-st3215/firmware', firmware
    assert (root / firmware / 'receiver_gen2_1/receiver_gen2_1.cpp').is_file()
    assert (root / firmware / 'transmitter_gen2_1/transmitter_gen2_1.cpp').is_file()
    with (root / 'docs/reorganization/moves.csv').open(encoding='utf-8', newline='') as stream:
        moved = list(csv.DictReader(stream))
    destinations = [item['current_path'] for item in moved]
    assert len(set(destinations)) == len(destinations), 'Duplicate move destinations'
    for destination in destinations:
        path = (root / destination).resolve()
        assert path.is_relative_to(root.resolve()), destination
        assert path.is_file(), destination
    web = root / 'generations/gen3-experimental-3d/backend/web_dashboard'
    assets = set()
    for name in ('index.html', 'gen3.html', '3d_viewer.html'):
        source = (web / 'templates' / name).read_text(encoding='utf-8')
        references = re.findall(r'(?:src|href)="/static/([^"?]+)', source)
        for reference in references:
            assert (web / 'static' / reference).is_file(), f'{name}: {reference}'
            assets.add(reference)
    return len(moved), len(assets)


if __name__ == '__main__':
    moved, assets = verify()
    print(f'Layout OK: {moved} moved files and {assets} dashboard asset paths verified; no hardware opened.')

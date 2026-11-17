"""Extend the 10-motor CAD web asset to the 12-motor upgrade (IDs 11 and 12).

The SolidWorks assembly still has 10 motors. Until it is re-exported with 12, this clones
mid modules 8 and 9 as bodies 10 and 11 (same alternating yaw/pitch orientation) and moves
the tail with the driver board to body 12, so ID 12 becomes the driver end.
Run once after tools/export_assembly_simulation.py; a 12-body asset is left unchanged.
"""
import json
import re
import shutil
from pathlib import Path

MODELS = Path(__file__).resolve().parents[1] / 'backend/web_dashboard/static/models'


def renumber(name, shift):
    return re.sub(r'ID(\d+)', lambda m: f'ID{int(m[1]) + shift}', name)


def main():
    path = MODELS / 'gen3-cad.json'
    asset = json.loads(path.read_text(encoding='utf-8'))
    bodies, meshes = asset['bodies'], asset['meshes']
    if len(bodies) == 13:
        print('Already 12 motors; nothing to do')
        return
    assert len(bodies) == 11, 'Expected the 10-motor export (11 bodies)'
    step = bodies[9]['origin'][0] - bodies[8]['origin'][0]
    moved = lambda body, n: dict(body, origin=[body['origin'][0] + n * step, 0., 0.])
    tail = [m for m in meshes if m['body'] == 10]
    meshes = [m for m in meshes if m['body'] != 10]
    for source, target in ((8, 10), (9, 11)):
        meshes += [dict(m, body=target, name=renumber(m['name'], 2)) for m in meshes if m['body'] == source]
    meshes += [dict(m, body=12, name=renumber(m['name'], 2)) for m in tail]
    asset['bodies'] = bodies[:10] + [moved(bodies[8], 2), moved(bodies[9], 2), moved(bodies[10], 2)]
    asset['meshes'] = meshes
    asset['assembly'] = ('SolidWorks prototype extended to 12 motors: 1 head, 11 mid, 1 tail; ID 12 controller '
                         'board. Mid modules for IDs 10-11 are cloned from IDs 8-9 until the assembly is '
                         're-exported. Fit and load validation required. Mass and contact remain illustrative.')
    shutil.copyfile(MODELS / 'gen3-body-10.obj', MODELS / 'gen3-body-12.obj')
    shutil.copyfile(MODELS / 'gen3-body-8.obj', MODELS / 'gen3-body-10.obj')
    shutil.copyfile(MODELS / 'gen3-body-9.obj', MODELS / 'gen3-body-11.obj')
    path.write_text(json.dumps(asset, separators=(',', ':')), encoding='utf-8')
    print('Wrote 13 bodies / 12 joints to', path)


if __name__ == '__main__':
    main()

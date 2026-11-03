"""Tessellate a read-only SolidWorks assembly STEP export for Gen 3.

Run with the installed CAD Python; pass the STEP exported from the supplied SLDASM,
optionally followed by that SLDASM's path (default: the current V2 assembly).
Runtime uses only the generated JSON/OBJ assets, with no CAD dependency.
"""
import hashlib
import itertools
import json
from pathlib import Path
import re
import sys
import tempfile

import numpy as np
import trimesh
from build123d import import_step, export_stl

ROOT = Path(__file__).resolve().parents[1]
NATIVE = ROOT / 'cad/3D_motion_parts/V2/assembly_neutral_2048_PROTOTYPE_fit_and_load_validation_required_v2.SLDASM'
TARGET = ROOT / 'backend/web_dashboard/static/models'


def main(step, native=NATIVE):
    native = Path(native).resolve()
    shape = import_step(step)
    components = list(shape.children[0].children)
    assert len(components) == 32, 'Assembly structure changed; review body ownership'
    horns = {int(re.search(r'ID(\d+)', c.label)[1]): c for c in components if '_horn_' in c.label}
    assert sorted(horns) == list(range(1, 11))
    origins = [[0., 0., 0.]] + [[horns[i].bounding_box().center().X / 1000, 0., 0.] for i in range(1, 11)]
    mids = sorted([c for c in components if '_MID' in c.label], key=lambda c: -c.bounding_box().center().X)
    assert len(mids) == 9
    meshes = []
    for c in components:
        if '_MID' in c.label:
            body, color = mids.index(c) + 1, '#169fc2'
        elif '_HEAD' in c.label:
            body, color = 0, '#169fc2'
        elif '_TAIL' in c.label:
            body, color = 10, '#169fc2'
        elif c.label.startswith('controller_board'):
            body, color = 10, '#227a52'
        else:
            i = int(re.search(r'ID(\d+)', c.label)[1])
            body, color = (i - 1, '#adb8c5') if '_horn_' in c.label else (i, '#202833')
        with tempfile.TemporaryDirectory(prefix='surge-mesh-') as directory:
            stl = Path(directory) / 'component.stl'
            assert export_stl(c, str(stl), tolerance=.15, angular_tolerance=.2)
            mesh = trimesh.load(str(stl), force='mesh')
        v = mesh.vertices / 1000 - origins[body]
        f = mesh.faces
        assert np.isfinite(v).all() and len(f) and f.min() >= 0 and f.max() < len(v)
        meshes.append(dict(name=c.label, body=body, color=color, vertices=v.round(7).tolist(), faces=f.tolist()))
    bodies = []
    for i in range(11):
        selected = [m for m in meshes if m['body'] == i]
        v = np.array([v for m in selected for v in m['vertices']])
        center = (v.min(axis=0) + v.max(axis=0)) / 2
        bodies.append(dict(origin=origins[i], center=center.round(7).tolist(),
                           size=(v.max(axis=0) - v.min(axis=0)).round(7).tolist()))
        obj = []
        offset = 1
        for m in selected:
            m['vertices'] = (np.array(m['vertices']) - center).round(7).tolist()
            obj.extend('v %.7f %.7f %.7f\n' % tuple(v) for v in m['vertices'])
            obj.extend('f %d %d %d\n' % tuple(j + offset for j in f) for f in m['faces'])
            offset += len(m['vertices'])
        (TARGET / f'gen3-body-{i}.obj').write_text(''.join(obj), encoding='utf-8')
    asset = dict(units='m', assembly='SolidWorks prototype: 1 head, 9 mid, 1 tail; 10 motors; ID 10 controller board. Fit and load validation required. Mass and contact remain illustrative.',
        sources={native.relative_to(ROOT).as_posix(): hashlib.sha256(native.read_bytes()).hexdigest(),
                 'native_step_sha256': hashlib.sha256(Path(step).read_bytes()).hexdigest()}, bodies=bodies, meshes=meshes)
    write_web_asset(asset)
    print('Joint origins:', origins)


def _right_angle_rotations():
    out = []
    for perm in itertools.permutations(range(3)):
        for signs in itertools.product((1, -1), repeat=3):
            r = np.zeros((3, 3))
            r[range(3), perm] = signs
            if np.linalg.det(r) > 0:
                out.append(r)
    return out


def pack(meshes, tolerance=2e-4):
    """Store repeated parts once. Each mesh keeps name/body/color plus a shape index and,
    for copies, a row-major 3x4 rigid transform [R|t]; vertices are rounded to 0.1 mm.
    Copies are tessellated separately, so match surfaces by nearest point both ways."""
    from scipy.spatial import cKDTree
    shapes, packed = [], []
    for m in meshes:
        v, f = np.array(m['vertices']), np.array(m['faces'])
        matrix, tree = None, cKDTree(v)
        for index, (sv, sf, stree) in enumerate(shapes):
            if len(sv) != len(v):
                continue
            for r in _right_angle_rotations():
                t = v.mean(0) - sv.mean(0) @ r.T
                moved = sv @ r.T + t
                if tree.query(moved)[0].max() < tolerance and stree.query((v - t) @ r)[0].max() < tolerance:
                    matrix = np.hstack([r, t[:, None]]).round(7).ravel().tolist()
                    break
            if matrix:
                break
        if matrix is None:
            index = len(shapes)
            shapes.append((v, f, tree))
        packed.append(dict(name=m['name'], body=m['body'], color=m['color'], shape=index,
                           **({'matrix': matrix} if matrix else {})))
    return [dict(vertices=v.round(4).ravel().tolist(), faces=f.ravel().tolist()) for v, f, _ in shapes], packed


def write_web_asset(asset):
    shapes, meshes = pack(asset['meshes'])
    target = TARGET / 'gen3-cad.json'
    target.write_text(json.dumps({**asset, 'shapes': shapes, 'meshes': meshes}, separators=(',', ':')), encoding='utf-8')
    print('Wrote', target, target.stat().st_size, 'bytes;', len(shapes), 'shapes for', len(meshes), 'meshes')


if __name__ == '__main__':
    main(*sys.argv[1:3])

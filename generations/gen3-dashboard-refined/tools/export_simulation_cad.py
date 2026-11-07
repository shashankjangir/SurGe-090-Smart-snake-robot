"""Export CAD visuals using KiCad 10 Python/OCCT; no app runtime CAD dependency."""
from pathlib import Path
import tempfile
import subprocess
import sys
import hashlib
import pcbnew

root = Path(__file__).resolve().parents[1]
scratch = tempfile.TemporaryDirectory(prefix="surge-cad-")
out = Path(scratch.name)
sources = {
    'connector': root / 'cad/3D_motion_parts/alternate_connector.STEP',
    'motor': root / 'cad/ST3215.step',
}
for name, source in sources.items():
    assert source.is_file(), source
    board = pcbnew.BOARD()
    fp = pcbnew.FOOTPRINT(board)
    fp.SetReference('CAD1')
    model = pcbnew.FP_3DMODEL()
    model.m_Filename = str(source)
    fp.Add3DModel(model)
    board.Add(fp)
    for a, b in [((0,0),(1,0)),((1,0),(1,1)),((1,1),(0,1)),((0,1),(0,0))]:
        edge = pcbnew.PCB_SHAPE(board)
        edge.SetShape(pcbnew.SHAPE_T_SEGMENT)
        edge.SetStart(pcbnew.VECTOR2I(pcbnew.FromMM(a[0]),pcbnew.FromMM(a[1])))
        edge.SetEnd(pcbnew.VECTOR2I(pcbnew.FromMM(b[0]),pcbnew.FromMM(b[1])))
        edge.SetLayer(pcbnew.Edge_Cuts)
        board.Add(edge)
    pcbnew.SaveBoard(str(out / (name + '.kicad_pcb')), board)
    print(name, source)

for name in sources:
    subprocess.run([str(Path(sys.executable).with_name("kicad-cli.exe")), "pcb", "export", "glb", "--no-board-body", "--user-origin", "0x0mm", "-o", str(out / (name + ".glb")), str(out / (name + ".kicad_pcb"))], check=True)
import json
from pathlib import Path
import struct
import numpy as np

summary = {}
for source in out.glob('*.glb'):
    raw = source.read_bytes()
    assert raw[:4] == b'glTF'
    size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + size])
    binary = raw[28 + size:]

    def accessor(index):
        a = doc['accessors'][index]
        b = doc['bufferViews'][a['bufferView']]
        dtype = {5126:'<f4', 5125:'<u4', 5123:'<u2', 5121:'u1'}[a['componentType']]
        width = {'SCALAR':1, 'VEC3':3}[a['type']]
        assert b.get('byteStride',np.dtype(dtype).itemsize*width)==np.dtype(dtype).itemsize*width
        return np.frombuffer(binary, dtype=dtype, count=a['count']*width,
                             offset=b.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,width)

    parts = []
    def visit(index, parent):
        node = doc['nodes'][index]
        matrix = np.eye(4)
        if 'matrix' in node:
            matrix = np.array(node['matrix']).reshape(4,4).T
        else:
            x,y,z,w = node.get('rotation',[0,0,0,1])
            matrix[:3,:3] = [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],
                             [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],
                             [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
            matrix[:3,:3] *= np.array(node.get('scale',[1,1,1]))
            matrix[:3,3] = node.get('translation',[0,0,0])
        matrix = parent @ matrix
        if 'mesh' in node:
            vertices, faces = [], []
            for prim in doc['meshes'][node['mesh']]['primitives']:
                assert prim.get('mode',4)==4
                v = accessor(prim['attributes']['POSITION']).astype(float)
                v = v @ matrix[:3,:3].T + matrix[:3,3]
                v[:,1] -= 0.001595  # remove scratch PCB top-surface placement
                v = v[:,[0,2,1]] * [1,-1,1]  # glTF Y-up back to STEP Z-up
                f = accessor(prim['indices']).reshape(-1,3)
                assert len(v)>0 and f.max()<len(v)
                faces.extend((f+len(vertices)).tolist())
                vertices.extend(v.tolist())
            v = np.array(vertices)
            parts.append({'name':node.get('name',''), 'vertices':vertices,'faces':faces,
                          'bounds_m':[v.min(axis=0).tolist(),v.max(axis=0).tolist()]})
        for child in node.get('children',[]):
            visit(child,matrix)
    for index in doc['scenes'][doc.get('scene',0)]['nodes']:
        visit(index,np.eye(4))
    all_v = np.array([v for part in parts for v in part['vertices']])
    summary[source.stem] = {'bounds_mm':(np.array([all_v.min(axis=0),all_v.max(axis=0)])*1000).round(4).tolist(),
        'parts':[{'name':p['name'],'bounds_mm':(np.array(p['bounds_m'])*1000).round(4).tolist(),
                  'triangles':len(p['faces'])} for p in parts]}
    (out/(source.stem+'.json')).write_text(json.dumps({'units':'m','axes':'original STEP','parts':parts}, separators=(',',':')),encoding='utf-8')
    with (out/(source.stem+'.obj')).open('w',encoding='utf-8') as target:
        offset = 1
        for part in parts:
            target.write('o '+part['name']+'\n')
            target.writelines('v %.8g %.8g %.8g\n'%tuple(v) for v in part['vertices'])
            target.writelines('f %d %d %d\n'%tuple(i+offset for i in f) for f in part['faces'])
            offset += len(part['vertices'])

meshes = []
for name, selected in [('motor', [0, 1, 2, 6, 7]), ('connector', [0])]:
    data = json.loads((out / (name + '.json')).read_text())
    assert len(data['parts']) == (8 if name == 'motor' else 1), 'CAD part layout changed; review transforms'
    for i in selected:
        part = data['parts'][i]
        if name == 'motor':
            vertices = [[round(x + .013, 7), round(y + .0093, 7), round(z, 7)] for x, y, z in part['vertices']]
        else:
            vertices = [[round(-z + .0015, 7), round(x, 7), round(-y, 7)] for x, y, z in part['vertices']]
        assert all(len(f) == 3 and min(f) >= 0 and max(f) < len(vertices) for f in part['faces'])
        meshes.append(dict(kind=name, color=('#adb8c5' if i >= 6 else '#202833') if name == 'motor' else '#169fc2', vertices=vertices, faces=part['faces']))
asset = dict(units='m', assembly='Illustrative 0.1 m joint spacing; mounting transforms, mass and contact unmeasured. Ten motors, eleven connectors; ID 10 carries the Waveshare bus servo driver with ESP32. Board proxy, mounting and connector revision unverified; removed battery excluded.', sources={str(p.relative_to(root.parent)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources.values()}, meshes=meshes)
target = root / 'backend/web_dashboard/static/models/gen3-cad.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(asset, separators=(',', ':')), encoding='utf-8')
print('Wrote', target, target.stat().st_size, 'bytes')
scratch.cleanup()

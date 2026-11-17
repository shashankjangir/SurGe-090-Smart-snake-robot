"""Saved taught poses."""
import json

from .atomic_json import atomic_json


def load(runs_dir):
    path = runs_dir / 'pose_presets.json'
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else []


def save(runs_dir, name, data, pose, joints):
    presets = load(runs_dir)
    previous = next((p for p in presets if p['name'] == name.strip()), None)
    if 'expected' in data:
        if previous is None or data['expected'] != previous:
            raise RuntimeError('Saved pose changed; reload the presets and re-calibrate again')
    elif previous is not None:
        raise ValueError('A pose with this name already exists; choose another name')
    updated = dict(name=name.strip(), pose=pose, joints=joints)
    if previous is None:
        presets.append(updated)
    else:
        presets[presets.index(previous)] = updated
    path = runs_dir / 'pose_presets.json'
    atomic_json(path, presets)
    return presets

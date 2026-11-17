"""Recorded runs and their operator annotations."""
import json

from gait import number

from .atomic_json import atomic_json


def list_runs(runs_dir):
    if not runs_dir.exists():
        return []
    items = []
    for json_file in sorted(runs_dir.glob('web-*.json'), key=lambda p: p.stat().st_mtime, reverse=True)[:50]:
        try:
            data = json.loads(json_file.read_text(encoding='utf-8'))
            csv_file = json_file.with_suffix('.csv')
            items.append({
                'run_id': json_file.stem,
                'timestamp': data.get('timestamp', json_file.stat().st_mtime),
                'mode': data.get('mode'),
                'execution': data.get('execution'),
                'duration': data.get('duration'),
                'speed': data.get('speed'),
                'has_csv': csv_file.exists(),
                'annotations': data.get('annotations', {})
            })
        except Exception:
            continue
    return items


def annotate(runs_dir, run_id, displacement_cm=None, surface=None, notes=None):
    if not isinstance(run_id, str) or not run_id.startswith('web-') or not run_id[4:].isdigit():
        raise ValueError('Invalid run ID')
    json_file = runs_dir / f'{run_id}.json'
    if not json_file.exists():
        raise ValueError(f"Run {run_id} not found")
    data = json.loads(json_file.read_text(encoding='utf-8'))
    annotations = data.get('annotations', {})
    if displacement_cm is not None:
        annotations['displacement_cm'] = number(displacement_cm, 'displacement_cm', -10000, 10000)
    if surface is not None:
        annotations['surface'] = str(surface).strip()[:100]
    if notes is not None:
        annotations['notes'] = str(notes).strip()[:1000]
    data['annotations'] = annotations
    atomic_json(json_file, data)
    return annotations

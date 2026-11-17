"""Calibration revisions, backups, audit entries, and file replacement."""
import hashlib
import json
import os
from pathlib import Path
import tempfile
import time


def _revision(content):
    return hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]


def revision(path):
    return _revision(path.read_text(encoding='utf-8'))


def save(path, config, expected_revision, operator_name):
    original = path.read_text(encoding='utf-8')
    current_rev = _revision(original)
    if expected_revision and expected_revision != current_rev:
        raise ValueError("Calibration map was modified externally (stale revision). Reload and re-verify before saving.")

    backups = path.parent / 'runs'
    backups.mkdir(exist_ok=True)
    backup_name = f'calibration-before-{time.time_ns()}.json'
    (backups / backup_name).write_text(original, encoding='utf-8')
    audit_file = backups / 'calibration_audit.jsonl'
    try:
        with audit_file.open('a', encoding='utf-8') as f:
            f.write(json.dumps({
                'timestamp': time.time(),
                'event': 'calibration_save',
                'operator': operator_name,
                'backup': backup_name,
                'revision': current_rev
            }) + '\n')
    except Exception:
        pass
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as stream:
            name = stream.name
            json.dump(config, stream, indent=2)
            stream.write('\n')
        os.replace(name, path)
    finally:
        if name and Path(name).exists():
            Path(name).unlink()

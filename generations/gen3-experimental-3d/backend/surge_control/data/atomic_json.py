"""Replace a JSON file atomically."""
import json
import os
from pathlib import Path
import tempfile


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as stream:
            name = stream.name
            json.dump(value, stream, indent=2, allow_nan=False)
            stream.write('\n')
        os.replace(name, path)
    finally:
        if name and Path(name).exists():
            Path(name).unlink()

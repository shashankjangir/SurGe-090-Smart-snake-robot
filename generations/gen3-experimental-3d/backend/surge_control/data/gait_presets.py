"""Default and saved gait presets."""
import json

from .atomic_json import atomic_json


DEFAULT_PRESETS = [
    {
        "name": "Pitch wave 5°",
        "description": "5° pitch commissioning wave, 0.1 Hz, 10s duration",
        "mode": "gait",
        "yaw": 0.0,
        "pitch": 5.0,
        "bias": 0.0,
        "frequency": 0.1,
        "lag": 90.0,
        "offset": 90.0,
        "speed": 100,
        "ramp": 2.0,
        "duration": 10.0
    },
    {
        "name": "Pitch wave 10°",
        "description": "10° pitch wave with extended 8s ramp within 100 counts/s limit",
        "mode": "gait",
        "yaw": 0.0,
        "pitch": 10.0,
        "bias": 0.0,
        "frequency": 0.1,
        "lag": 90.0,
        "offset": 90.0,
        "speed": 100,
        "ramp": 8.0,
        "duration": 30.0
    },
    {
        "name": "Turning yaw trial 5°",
        "description": "5° yaw wave with 5° bias and 4s ramp for turning assessment",
        "mode": "gait",
        "yaw": 5.0,
        "pitch": 0.0,
        "bias": 5.0,
        "frequency": 0.1,
        "lag": 90.0,
        "offset": 90.0,
        "speed": 100,
        "ramp": 4.0,
        "duration": 10.0
    },
    {
        "name": "Caterpillar crawl 10° (commissioning)",
        "description": "Pitch-only travelling wave, lag -72°; crawled backward in the 3 Nov 2026 PyBullet check (lag +72° crawls forward). 8s ramp keeps peak demand under 100 counts/s",
        "mode": "gait",
        "yaw": 0.0,
        "pitch": 10.0,
        "bias": 0.0,
        "frequency": 0.1,
        "lag": -72.0,
        "offset": 0.0,
        "speed": 100,
        "ramp": 8.0,
        "duration": 30.0
    },
    {
        "name": "Caterpillar crawl 20°",
        "description": "Pitch-only travelling wave at 0.25 Hz, lag -72°; peak demand ~477 counts/s. Crawled backward in the 3 Nov 2026 PyBullet check; lag +72° crawls forward",
        "mode": "gait",
        "yaw": 0.0,
        "pitch": 20.0,
        "bias": 0.0,
        "frequency": 0.25,
        "lag": -72.0,
        "offset": 0.0,
        "speed": 500,
        "ramp": 3.0,
        "duration": 24.0
    },
    {
        "name": "Serpenoid combined 5°/5°",
        "description": "Alternating yaw/pitch serpenoid locomotion trial",
        "mode": "gait",
        "yaw": 5.0,
        "pitch": 5.0,
        "bias": 0.0,
        "frequency": 0.1,
        "lag": 90.0,
        "offset": 90.0,
        "speed": 100,
        "ramp": 2.0,
        "duration": 15.0
    },
    {
        "name": "Lateral undulation 30°",
        "description": "Yaw-only serpenoid wave; ~60 cm forward in PyBullet. Needs side friction on real floors. Peak ~643 counts/s",
        "mode": "gait",
        "yaw": 30.0,
        "pitch": 0.0,
        "bias": 0.0,
        "frequency": 0.2,
        "lag": 90.0,
        "offset": 0.0,
        "speed": 900,
        "ramp": 2.5,
        "duration": 30.0
    },
    {
        "name": "Lateral undulation 30° reverse",
        "description": "Same wave tail-to-head (negative frequency); ~66 cm backward in PyBullet. Peak ~643 counts/s",
        "mode": "gait",
        "yaw": 30.0,
        "pitch": 0.0,
        "bias": 0.0,
        "frequency": -0.2,
        "lag": 90.0,
        "offset": 0.0,
        "speed": 900,
        "ramp": 2.5,
        "duration": 30.0
    },
    {
        "name": "Sidewinding 30°/10° right",
        "description": "Yaw and pitch waves 90° apart (Gong 2016); ~40 cm sideways in PyBullet. Peak ~643 counts/s",
        "mode": "gait",
        "yaw": 30.0,
        "pitch": 10.0,
        "bias": 0.0,
        "frequency": 0.2,
        "lag": 96.0,
        "offset": 90.0,
        "speed": 900,
        "ramp": 2.5,
        "duration": 30.0
    },
    {
        "name": "Sidewinding 30°/10° left",
        "description": "Offset -90° mirrors sidewinding; ~45 cm sideways in PyBullet. Peak ~643 counts/s",
        "mode": "gait",
        "yaw": 30.0,
        "pitch": 10.0,
        "bias": 0.0,
        "frequency": 0.2,
        "lag": 96.0,
        "offset": -90.0,
        "speed": 900,
        "ramp": 2.5,
        "duration": 30.0
    },
    {
        "name": "Lateral rolling 25°",
        "description": "Lag 0, offset 90°: the arced body rolls sideways (Tesch 2009); ~48 cm in PyBullet. If it rocks without rolling, raise amplitude toward 35°. Peak ~417 counts/s",
        "mode": "gait",
        "yaw": 25.0,
        "pitch": 25.0,
        "bias": 0.0,
        "frequency": 0.15,
        "lag": 0.0,
        "offset": 90.0,
        "speed": 900,
        "ramp": 3.0,
        "duration": 30.0
    },
    {
        "name": "Caterpillar crawl 20° forward",
        "description": "Pitch-only wave, lag +72°; ~22 cm forward in PyBullet. Peak ~429 counts/s",
        "mode": "gait",
        "yaw": 0.0,
        "pitch": 20.0,
        "bias": 0.0,
        "frequency": 0.2,
        "lag": 72.0,
        "offset": 0.0,
        "speed": 900,
        "ramp": 2.5,
        "duration": 30.0
    }
]


def load(runs_dir):
    preset_file = runs_dir / 'presets.json'
    try:
        presets = json.loads(preset_file.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return DEFAULT_PRESETS
    except (OSError, UnicodeError, ValueError) as exc:
        raise RuntimeError('Could not read saved gait presets. Restore or repair presets.json before editing.') from exc
    if not isinstance(presets, list) or any(
        not isinstance(preset, dict) or not isinstance(preset.get('name'), str) for preset in presets
    ):
        raise RuntimeError('Invalid saved gait presets. Restore or repair presets.json before editing.')
    return presets


def save(runs_dir, preset, expected=...):
    presets = load(runs_dir)
    existing_preset = next((p for p in presets if p['name'] == preset['name']), None)
    if expected is not ... and expected != existing_preset:
        raise RuntimeError('Preset changed; reload the presets before saving')
    # Replace if name exists, else append
    existing = [p for p in presets if p['name'] != preset['name']]
    existing.append(preset)
    preset_file = runs_dir / 'presets.json'
    atomic_json(preset_file, existing)
    return existing


def delete(runs_dir, name):
    presets = load(runs_dir)
    updated = [p for p in presets if p['name'] != name]
    preset_file = runs_dir / 'presets.json'
    atomic_json(preset_file, updated)
    return updated

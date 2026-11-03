"""Finite Gen 3 jobs, live gait transitions, multi-user operator leases,
diagnostics, calibration concurrency, and firmware management.
Importing this module never opens serial ports.
"""
import copy
import csv
import hashlib
import functools
import importlib.util
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time

_p2 = Path(__file__).resolve().parents[2]
ROOT = _p2 if _p2.name == 'gen3-experimental-3d' else _p2 / 'gen3-experimental-3d'
spec = importlib.util.spec_from_file_location('surge_gen3_runner', ROOT / 'test_3d_snake.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
from gait import validate_map, validate_gait, validate_overrides, validate_pose, joint_wave, calc_peak_speed, envelope, COUNTS_PER_RADIAN
from surge_control.session import SessionManager
from surge_control.spatial_route import SpatialRoute
from surge_control.manual import ManualController, Localization

# PyBullet comes from the conda `surge` environment (pip wheels fail to build on Windows).
SIMULATION_AVAILABLE = importlib.util.find_spec('pybullet') is not None
SIMULATION_UNAVAILABLE_MESSAGE = (
    'PyBullet is not installed in the Python running this dashboard. Restart it with '
    '`conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py`.')

ALLOWED_FIRMWARE_ENVS = ('receiver_gen2_1', 'transmitter_gen2_1')
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


def locked(method):
    @functools.wraps(method)
    def call(self, *args, **kwargs):
        with self.lock:
            return method(self, *args, **kwargs)
    return call


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


class GaitMotionGenerator:
    """Monotonic continuous phase integration and smooth C^1 raised-cosine parameter transitions."""

    def __init__(self, config, initial_params, duration, ramp, overrides=None):
        self.config = config
        # Per-joint enable/gain/phase/bias; fixed for the run, validated with every live update.
        self.overrides = overrides
        self.duration = duration
        self.ramp = ramp
        self.applied_settings = copy.deepcopy(initial_params)
        self.pending_settings = None
        self.current_revision = 1
        self.last_request_id = None
        self.requests = {}
        self.phase = 0.0
        self.last_t = None
        self.transition = None
        self.lock = threading.Lock()
        self.manual = None
        self.manual_pose = None

    def evaluate(self, t):
        with self.lock:
            dt = 0.0 if self.last_t is None else max(0.0, t - self.last_t)
            self.last_t = t

            if self.transition and self.transition['state'] == 'transitioning':
                tau = max(0.0, min(1.0, (t - self.transition['start_t']) / self.transition['duration']))
                w = (1.0 - math.cos(math.pi * tau)) / 2.0
                p_from = self.transition['from_settings']
                p_to = self.transition['to_settings']
                current_params = {
                    'yaw': p_from['yaw'] + (p_to['yaw'] - p_from['yaw']) * w,
                    'pitch': p_from['pitch'] + (p_to['pitch'] - p_from['pitch']) * w,
                    'bias': p_from['bias'] + (p_to['bias'] - p_from['bias']) * w,
                    'frequency': p_from['frequency'] + (p_to['frequency'] - p_from['frequency']) * w,
                    'lag': p_from['lag'] + (p_to['lag'] - p_from['lag']) * w,
                    'offset': p_from['offset'] + (p_to['offset'] - p_from['offset']) * w,
                    'speed': p_from['speed'] + (p_to['speed'] - p_from['speed']) * w,
                }
                if tau >= 1.0:
                    self.applied_settings = copy.deepcopy(p_to)
                    self.pending_settings = None
                    self.transition['state'] = 'applied'
            else:
                current_params = self.applied_settings

            if self.manual:
                current_params = self.manual.parameters(current_params, dt, self.manual_pose, t)
            # Monotonic phase integration
            self.phase += 2.0 * math.pi * current_params['frequency'] * dt

            scale = envelope(t, self.duration, self.ramp)
            indices = {"yaw": 0, "pitch": 0}
            targets = {}
            for j in self.config["joints"]:
                axis = j["axis"]
                k = indices[axis]
                indices[axis] += 1
                override = (self.overrides or {}).get(j["id"])
                center, amplitude = joint_wave(override, current_params['bias'] if axis == "yaw" else 0.0,
                                               current_params['yaw'] if axis == "yaw" else current_params['pitch'])
                shift = override['phase'] if override else 0.0
                angle = scale * (center + amplitude *
                                 math.sin(self.phase - k * current_params['lag'] + (current_params['offset'] if axis == "pitch" else 0.0) + shift))
                if self.manual and self.manual.inspection:
                    angle = scale * (self.manual.head_y if j['id'] == 1 else self.manual.head_x if j['id'] == 2 else 0.)
                target = round(j["zero"] + j["sign"] * angle * COUNTS_PER_RADIAN)
                targets[j["id"]] = max(j["min"], min(j["max"], target))
            if self.manual:
                targets = self.manual.limit_targets(targets, self.config['joints'], current_params['speed'], t)
            return targets, current_params

    def request_update(self, request_id, expected_revision, candidate_settings, t_now):
        with self.lock:
            if not isinstance(candidate_settings, dict):
                raise ValueError('Live settings must be an object')
            if not isinstance(request_id, str) or not 1 <= len(request_id) <= 128:
                raise ValueError('Invalid request ID')
            if request_id in self.requests:
                previous, result = self.requests[request_id]
                if previous != candidate_settings:
                    raise ValueError('Request ID reused with different settings')
                return dict(result, status='idempotent')
            if len(self.requests) >= 1000:
                raise ValueError('Update limit reached; start a new run')
            for key, fixed in (('duration', self.duration), ('ramp', self.ramp)):
                if key in candidate_settings and candidate_settings[key] != fixed:
                    raise ValueError(f'{key} is fixed for the active run')
            if set(candidate_settings) - {'yaw', 'pitch', 'bias', 'frequency', 'lag', 'offset', 'speed', 'duration', 'ramp'}:
                raise ValueError('Unknown live setting')

            if expected_revision != self.current_revision:
                raise ValueError(f"Stale settings revision: current revision is {self.current_revision}, received {expected_revision}")

            if self.transition and self.transition['state'] == 'transitioning':
                raise ValueError('Wait for the current transition to finish')
            remaining = self.duration - t_now
            if remaining <= self.ramp:
                raise ValueError("Cannot update settings during final return/shutdown ramp")

            candidate_deg = {
                'yaw': runner.number(candidate_settings.get('yaw', math.degrees(self.applied_settings['yaw'])), 'yaw', 0, 90),
                'pitch': runner.number(candidate_settings.get('pitch', math.degrees(self.applied_settings['pitch'])), 'pitch', 0, 90),
                'bias': runner.number(candidate_settings.get('bias', math.degrees(self.applied_settings['bias'])), 'bias', -90, 90),
                'frequency': runner.number(candidate_settings.get('frequency', self.applied_settings['frequency']), 'frequency', -0.6, 0.6),
                'lag': runner.number(candidate_settings.get('lag', math.degrees(self.applied_settings['lag'])), 'lag', -360, 360),
                'offset': runner.number(candidate_settings.get('offset', math.degrees(self.applied_settings['offset'])), 'offset', -360, 360),
                'speed': runner.number(candidate_settings.get('speed', self.applied_settings['speed']), 'speed', 1, 3000)
            }
            candidate_rad = {
                'yaw': math.radians(candidate_deg['yaw']),
                'pitch': math.radians(candidate_deg['pitch']),
                'bias': math.radians(candidate_deg['bias']),
                'frequency': candidate_deg['frequency'],
                'lag': math.radians(candidate_deg['lag']),
                'offset': math.radians(candidate_deg['offset']),
                'speed': candidate_deg['speed']
            }

            # Validate candidate
            validate_gait(
                self.config,
                candidate_rad['yaw'], candidate_rad['pitch'], candidate_rad['bias'],
                candidate_rad['frequency'], candidate_rad['lag'], candidate_rad['offset'],
                self.duration, self.ramp, speed=candidate_rad['speed'], overrides=self.overrides
            )

            old = self.applied_settings
            limit = min(old['speed'], candidate_rad['speed'])
            available = remaining - self.ramp
            trans_duration = 1.5
            # Bound every derivative throughout the interpolation, including rotating downstream axes.
            def demand(seconds):
                rate = math.pi / (2 * seconds)
                env_rate = math.pi / (2 * self.ramp)
                worst = 0.0
                indices = {'yaw': 0, 'pitch': 0}
                for joint in self.config['joints']:
                    axis = joint['axis']; k = indices[axis]; indices[axis] += 1
                    amplitude = max(old[axis], candidate_rad[axis])
                    bias = max(abs(old['bias']), abs(candidate_rad['bias'])) if axis == 'yaw' else 0
                    da = abs(candidate_rad[axis] - old[axis]) * rate
                    db = abs(candidate_rad['bias'] - old['bias']) * rate if axis == 'yaw' else 0
                    phase_rate = 2 * math.pi * max(abs(old['frequency']), abs(candidate_rad['frequency']))
                    phase_rate += k * abs(candidate_rad['lag'] - old['lag']) * rate
                    if axis == 'pitch':
                        phase_rate += abs(candidate_rad['offset'] - old['offset']) * rate
                    override = (self.overrides or {}).get(joint['id'])
                    if override and not override['enabled']:
                        continue
                    gain = override['gain'] if override else 1.0
                    own_bias = abs(override['bias']) if override else 0.0
                    worst = max(worst, COUNTS_PER_RADIAN * (env_rate * (gain * (amplitude + bias) + own_bias) + gain * (da + db + amplitude * phase_rate)))
                return worst
            while trans_duration <= available and demand(trans_duration) > limit:
                trans_duration += .25
            if trans_duration > available or demand(trans_duration) > limit:
                raise ValueError('Transition speed demand exceeds available time and speed limit')

            self.current_revision += 1
            self.last_request_id = request_id
            self.pending_settings = copy.deepcopy(candidate_rad)
            from_settings = self.applied_settings
            self.transition = {
                'start_t': t_now,
                'duration': trans_duration,
                'from_settings': copy.deepcopy(from_settings),
                'to_settings': copy.deepcopy(candidate_rad),
                'request_id': request_id,
                'revision': self.current_revision,
                'state': 'transitioning'
            }
            result = {'status': 'accepted', 'revision': self.current_revision,
                      'request_id': request_id, 'transition_duration': trans_duration}
            self.requests[request_id] = (copy.deepcopy(candidate_settings), result)
            return result


    def abort_transition(self):
        with self.lock:
            if self.transition and self.transition['state'] == 'transitioning':
                self.transition['state'] = 'aborted'
            self.pending_settings = None


class FirmwareManager:
    """Allowlisted PlatformIO builds; browser upload remains unavailable."""

    def __init__(self):
        self.lock = threading.Lock()
        self.active_job = None
        self.status = {
            'state': 'idle',
            'env': None,
            'log': [],
            'last_artifact': None,
            'error': None
        }

    def snapshot(self):
        with self.lock:
            res = copy.deepcopy(self.status)
            res['is_busy'] = self.active_job is not None and self.active_job.is_alive()
            return res

    def build(self, env, operator_name=None):
        if env not in ALLOWED_FIRMWARE_ENVS:
            raise ValueError(f"Environment must be one of {ALLOWED_FIRMWARE_ENVS}")
        with self.lock:
            if self.active_job and self.active_job.is_alive():
                raise RuntimeError("Another firmware job is currently running")
            audit_file = ROOT / 'runs' / 'firmware_audit.jsonl'
            try:
                audit_file.parent.mkdir(exist_ok=True)
                with audit_file.open('a', encoding='utf-8') as f:
                    f.write(json.dumps({
                        'timestamp': time.time(),
                        'event': 'firmware_build',
                        'env': env,
                        'operator': operator_name
                    }) + '\n')
            except Exception:
                pass
            self.status = {
                'state': 'building',
                'env': env,
                'operator': operator_name,
                'log': [f"Starting build for environment: {env} (shell=False)"],
                'last_artifact': None,
                'error': None
            }
            self.active_job = threading.Thread(target=self._run_build, args=(env,), daemon=True)
            self.active_job.start()

    def _run_build(self, env):
        try:
            cmd = [sys.executable, "-m", "platformio", "run", "-e", env]
            proc = subprocess.Popen(
                cmd,
                cwd=str(ROOT.parents[1]),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                shell=False
            )
            try:
                output, _ = proc.communicate(timeout=120)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.communicate()
                raise RuntimeError('Firmware build exceeded 120 seconds; process stopped')
            with self.lock:
                self.status['log'].extend(output.splitlines()[-500:])
            if proc.returncode == 0:
                with self.lock:
                    self.status['state'] = 'build_success'
                    artifact = ROOT.parents[1] / '.pio' / 'build' / env / 'firmware.bin'
                    self.status['last_artifact'] = str(artifact) if artifact.is_file() else None
                    self.status['log'].append(f"Build succeeded for {env}.")
            else:
                with self.lock:
                    self.status['state'] = 'build_error'
                    self.status['error'] = f"Build failed with exit code {proc.returncode}"
                    self.status['log'].append(self.status['error'])
        except Exception as exc:
            with self.lock:
                self.status['state'] = 'build_error'
                self.status['error'] = str(exc)
                self.status['log'].append(f"Build exception: {exc}")

    def upload(self, env, port, mock=True):
        raise ValueError('Firmware upload unavailable; no serial port opened or flash written')


class Gen3Control:
    def __init__(self, lock, map_path=ROOT / 'joint_map.json', hardware_factory=None):
        self.lock = lock
        self.map_path = Path(map_path)
        self.hardware_factory = hardware_factory or runner.ST3215Interface
        self.thread = None
        self.cancel = threading.Event()
        self.sessions = SessionManager()
        def _on_op_leave(op):
            if self.state['simulation_state'] in ('connected', 'connecting', 'running') or self.simulation is not None:
                self.disconnect_simulation()
            if hasattr(self, 'planar_control') and self.planar_control:
                if self.planar_control.state.get('is_running') and self.planar_control.state.get('engine') == 'SIM':
                    self.planar_control.disconnect()
        self.sessions.on_operator_leave.append(_on_op_leave)
        self.firmware = FirmwareManager()
        self.motion_generator = None
        self.manual = None
        self.localization = Localization()
        self.simulation_route = None
        self.simulation = None
        self.simulation_thread = None
        self.simulation_revision = None
        self.simulation_disconnect_requested = False
        self.active_run_id = None
        self.run_stamp = 0
        self.active_run_log = None
        self.start_requests = {}
        self.start_run_ids = {}
        self.last_diagnostic = None
        self.job_started = None
        self.state = dict(
            busy=False,
            elapsed_seconds=0,
            motion_duration=None,
            status='Idle; no connection',
            telemetry={},
            tracking=None,
            bus=None,
            simulation_links=None,
            simulation_poses=None,
            simulation_head=None,
            simulation_route=None,
            simulation_state='disconnected',
            simulation_error=None,
            stage='idle',
            log=None,
            execution=None,
            run_id=None,
            active_settings=None,
            pending_settings=None,
            settings_revision=1,
            transition_state='idle',
            controller=None,
            server_time=time.time()
        )

    def snapshot(self):
        with self.lock:
            # Check lease expiry
            is_expired, expired_op = self.sessions.check_lease_expiry()
            if is_expired:
                if self.state['busy'] and self.state.get('execution') == 'hardware':
                    self.stop()
                    self.state['status'] = f"Operator lease for {expired_op['name']} expired; safety stop commanded"
                # Auto-disconnect any connected simulation engine when the operator lease expires
                if self.state['simulation_state'] in ('connected', 'connecting', 'running') or self.simulation is not None:
                    self.disconnect_simulation()
                if hasattr(self, 'planar_control') and self.planar_control:
                    if self.planar_control.state.get('is_running') and self.planar_control.state.get('engine') == 'SIM':
                        self.planar_control.disconnect()

            snap = copy.deepcopy(self.state)
            if snap['busy'] and self.job_started is not None:
                snap['elapsed_seconds'] = max(0, time.monotonic() - self.job_started)
            snap['operator'] = self.sessions.status()
            snap['firmware'] = self.firmware.snapshot()
            snap['diagnostic'] = copy.deepcopy(self.last_diagnostic)
            snap['server_time'] = time.time()
            snap['simulation_available'] = SIMULATION_AVAILABLE
            return snap

    def battery_snapshot(self):
        # shortcut: D is disarmed-only; extend receiver motion feedback for voltage during runs.
        with self.lock:
            diagnostic = self.last_diagnostic or {}
            voltages = [row['voltage'] / 10 for row in diagnostic.get('servos', {}).values()
                        if row.get('valid') and type(row.get('voltage')) in (int, float)
                        and math.isfinite(row['voltage']) and 0 < row['voltage'] <= 255]
            sampled_at = diagnostic.get('timestamp')
            age = max(0, time.time() - sampled_at) if sampled_at is not None else None
            voltage = sum(voltages) / len(voltages) if voltages else None
            return dict(
                chemistry='LiPo', cells=3, capacity_mah=2200,
                percent=max(0, min(100, round((voltage - 11.1) / 1.5 * 100))) if voltage is not None else None,
                voltage=round(voltage, 2) if voltage is not None else None,
                sample_count=len(voltages), sampled_at=sampled_at,
                age_s=round(age, 1) if age is not None else None,
                state='unavailable' if voltage is None or age is None else 'stale' if age > 30 else 'fresh'
            )

    def get_map_revision(self):
        content = self.map_path.read_text(encoding='utf-8')
        return hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]

    def load_map_with_revision(self):
        with self.lock:
            rev = self.get_map_revision()
            config = runner.load_map(self.map_path)
            return {'config': config, 'revision': rev}

    @locked
    def save_map(self, config, expected_revision=None, operator_name=None):
        validate_map(config)
        if self.state['busy'] or self.firmware.snapshot()['is_busy']:
            raise RuntimeError('Stop the Gen 3 job before saving calibration')

        original = self.map_path.read_text(encoding='utf-8')
        current_rev = hashlib.sha256(original.encode('utf-8')).hexdigest()[:16]
        if expected_revision and expected_revision != current_rev:
            raise ValueError("Calibration map was modified externally (stale revision). Reload and re-verify before saving.")

        backups = self.map_path.parent / 'runs'
        backups.mkdir(exist_ok=True)
        backup_name = f'calibration-before-{time.time_ns()}.json'
        (backups / backup_name).write_text(original, encoding='utf-8')
        audit_file = backups / 'calibration_audit.jsonl'
        try:
            with audit_file.open('a', encoding='utf-8') as f:
                f.write(json.dumps({
                    'timestamp': time.time(),
                    'event': 'calibration_save',
                    'operator': operator_name or (self.sessions.active_operator['name'] if self.sessions.active_operator else None),
                    'backup': backup_name,
                    'revision': current_rev
                }) + '\n')
        except Exception:
            pass
        name = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=self.map_path.parent, delete=False) as stream:
                name = stream.name
                json.dump(config, stream, indent=2)
                stream.write('\n')
            os.replace(name, self.map_path)
        finally:
            if name and Path(name).exists():
                Path(name).unlink()

    @locked
    def connect_simulation(self):
        if self.state['busy'] or self.firmware.snapshot()['is_busy']:
            raise RuntimeError('Stop the active job before connecting simulation')
        if self.state['simulation_state'] in ('connecting', 'connected', 'running', 'disconnecting'):
            raise RuntimeError('Simulation is already connected or changing state')
        config = runner.load_map(self.map_path)
        revision = self.get_map_revision()
        self.cancel.clear()
        self.simulation_disconnect_requested = False
        self.state.update(simulation_state='connecting', simulation_error=None)

        def connect():
            iface = None
            cancelled = False
            try:
                from simulation import SimulationInterface
                iface = SimulationInterface(config, None, .25, 2, True)
                ok, message = iface.connect()
                if not ok:
                    raise RuntimeError(message)
                with self.lock:
                    if not self.cancel.is_set() and not self.simulation_disconnect_requested:
                        self.simulation = iface
                        self.simulation_revision = revision
                        self.state.update(simulation_state='connected', simulation_error=None)
                        iface = None
                    else:
                        cancelled = True
                        self.state['simulation_state'] = 'disconnecting'
            except Exception as exc:
                message = SIMULATION_UNAVAILABLE_MESSAGE if isinstance(exc, ModuleNotFoundError) else str(exc)
                with self.lock:
                    self.state.update(simulation_state='error', simulation_error=message)
            finally:
                if iface is not None:
                    try:
                        iface.disconnect()
                        if cancelled:
                            with self.lock:
                                self.state.update(simulation_state='disconnected', simulation_error=None)
                    except Exception as exc:
                        with self.lock:
                            self.state.update(simulation_state='error', simulation_error=f'Simulation cleanup failed: {exc}')
        self.simulation_thread = threading.Thread(target=connect, daemon=True)
        self.simulation_thread.start()

    @locked
    def disconnect_simulation(self):
        if self.state['simulation_state'] in ('connecting', 'running'):
            self.simulation_disconnect_requested = True
            self.cancel.set()
            self.state['simulation_state'] = 'disconnecting'
            if self.state['busy']:
                self.stop()
            return
        if self.state['simulation_state'] == 'disconnecting':
            return
        iface, self.simulation = self.simulation, None
        self.simulation_revision = None
        try:
            if iface is not None:
                iface.disconnect()
        except Exception as exc:
            self.state.update(simulation_state='error', simulation_error=str(exc))
            raise RuntimeError('Simulation disconnect failed') from exc
        self.state.update(simulation_state='disconnected', simulation_error=None, simulation_links=None,
                          simulation_poses=None, simulation_head=None)

    @locked
    def start(self, data, session_id=None):
        if not isinstance(data, dict):
            raise ValueError('Job settings must be an object')
        request_id = data.get('request_id')
        if request_id is not None and (not isinstance(request_id, str) or not 1 <= len(request_id) <= 128):
            raise ValueError('request_id must be a string of 1..128 characters')
        key = (session_id, request_id)
        if request_id and key in self.start_requests:
            if self.start_requests[key] != data:
                raise ValueError('Request ID was reused with different settings')
            return self.start_run_ids[key]
        if self.state['busy']:
            raise RuntimeError('A Gen 3 job already owns the connection')
        if self.firmware.snapshot()['is_busy']:
            raise RuntimeError('Firmware maintenance owns the controller')

        mode = data.get('mode', 'read')
        execution = data.get('execution', 'preview')
        manual = None
        if 'controller' in data:
            if mode != 'gait' or data.get('joints') or 'simulation_path' in data:
                raise ValueError('Controller requires a shared gait without joint overrides or a second route')
            manual = ManualController(data['controller'])
            if 'steering_sign' not in data['controller']:
                manual.steering_sign = -1
            manual.update(data.get('input'))
            manual.check()
            if manual.assist != 'manual' and execution != 'simulation':
                if execution != 'hardware' or not manual.verified or 'steering_sign' not in data['controller']:
                    raise ValueError('Navigation requires simulation or verified external localization and steering sign')
                self.localization.pose()
        if mode not in ('read', 'jog', 'gait', 'pose', 'center', 'align') or execution not in ('preview', 'simulation', 'hardware'):
            raise ValueError('Select read, jog, gait, or center and a valid execution mode')
        route = None
        if 'simulation_path' in data:
            if execution != 'simulation' or mode != 'gait':
                raise ValueError('Routes are only supported for simulation gait jobs')
            route = SpatialRoute(data['simulation_path'])
        if self.state['simulation_state'] in ('connecting', 'disconnecting'):
            raise RuntimeError('Wait for the simulation connection to finish changing')
        if execution == 'simulation' and 'simulation_tracking' not in data:
            raise ValueError('Verify simulation tracking limits before starting')
        if 'simulation_tracking' in data and (execution != 'simulation' or mode not in ('gait', 'pose')):
            raise ValueError('Simulation tracking settings are only valid for simulation gait or pose jobs')
        if execution == 'simulation':
            if self.state['simulation_state'] != 'connected' or self.simulation is None:
                raise RuntimeError('Connect the simulation engine before starting')
            if self.simulation_revision != self.get_map_revision():
                raise RuntimeError('The joint map changed; disconnect and reconnect the simulation engine')
        if mode in ('read', 'jog', 'center', 'align') and execution != 'hardware':
            raise ValueError(f'{mode.capitalize()} requires hardware execution')

        port = data.get('port', '')
        if execution == 'hardware' and (not isinstance(port, str) or not port.strip() or len(port) > 128):
            raise ValueError('Select the transmitter serial port')

        # Role enforcement for hardware start
        if execution == 'hardware' and session_id:
            if not self.sessions.is_operator(session_id):
                raise RuntimeError("Must hold an active operator lease to start hardware motion")

        duration = runner.number(data.get('duration', 10), 'duration', 2, 300)
        ramp = runner.number(data.get('ramp', 2), 'ramp', 1, 30)
        sid, ticks, values = None, 0, None
        run_speed = runner.number(data.get('speed', 500), 'speed', 1, 3000)
        if mode not in ('gait', 'pose') and run_speed not in (100, 500):
            raise ValueError('Commissioning actions use default speed')
        self.motion_generator = None
        self.pose_targets = None
        self.joint_overrides = None

        def apply_simulation_tracking(config):
            if 'simulation_tracking' in data:
                tracking = data['simulation_tracking']
                if not isinstance(tracking, dict) or set(tracking) != {'tracking_error', 'tracking_timeout', 'verified'} or tracking['verified'] is not True:
                    raise ValueError('Verify both simulation tracking settings before starting')
                config['tracking_error'] = runner.number(tracking['tracking_error'], 'tracking_error', 1, 796)
                config['tracking_timeout'] = runner.number(tracking['tracking_timeout'], 'tracking_timeout', .1, 2)

        if mode == 'jog':
            sid = data.get('id')
            ticks = data.get('ticks')
            if type(sid) is not int or sid not in range(1, 11) or type(ticks) is not int or not 1 <= abs(ticks) <= 57:
                raise ValueError('Jog requires ID 1–10 and nonzero ticks between -57 and 57')
            config = dict(speed=100, tracking_error=25, tracking_timeout=.5)
        elif mode == 'center':
            sid = data.get('id')
            if type(sid) is not int or sid not in range(1, 11) or not data.get('free_shaft'):
                raise ValueError('Centering requires single ID 1..10 and explicit free_shaft confirmation')
            config = dict(speed=100, tracking_error=25, tracking_timeout=.5)
        elif mode == 'align':
            config = runner.load_map(self.map_path)
            values = None
        elif mode == 'gait':
            config = runner.load_map(self.map_path, require_calibrated=execution == 'hardware')
            apply_simulation_tracking(config)
            overrides = validate_overrides(data.get('joints'))
            fields = [('yaw', 5, 0, 90), ('pitch', 5, 0, 90), ('bias', 0, -90, 90),
                      ('frequency', .1, -.6, .6), ('lag', 90, -360, 360), ('offset', 90, -360, 360)]
            numbers = [runner.number(data.get(k, default), k, low, high) for k, default, low, high in fields]
            run_speed = runner.number(run_speed, 'speed', 1, 3000)
            values = tuple(v if i == 3 else math.radians(v) for i, v in enumerate(numbers)) + (duration, ramp)
            runner.validate_gait(config, *values, speed=run_speed, overrides=overrides)
            self.joint_overrides = data.get('joints') or None

            # Initialize live motion generator
            initial_rad = {
                'yaw': values[0],
                'pitch': values[1],
                'bias': values[2],
                'frequency': values[3],
                'lag': values[4],
                'offset': values[5],
                'speed': run_speed
            }
            self.motion_generator = GaitMotionGenerator(config, initial_rad, duration, ramp, overrides)
            self.motion_generator.manual = manual
        elif mode == 'pose':
            # Every joint goes to its own angle, holds for `duration`, then returns to neutral.
            config = runner.load_map(self.map_path, require_calibrated=execution == 'hardware')
            apply_simulation_tracking(config)
            self.pose_targets = validate_pose(config, data.get('pose'))
        else:
            config = None

        if request_id:
            if len(self.start_requests) >= 1000:
                raise RuntimeError('Request history full; restart the stopped server')
            self.start_requests[key] = copy.deepcopy(data)
        self.owner_session = session_id
        self.manual = manual
        self.simulation_route = route
        self.cancel.clear()
        self.run_stamp = max(time.time_ns(), self.run_stamp + 1)
        self.active_run_id = f"web-{self.run_stamp}"
        if request_id:
            self.start_run_ids[key] = self.active_run_id
        self.job_started = time.monotonic()
        self.state.update(
            busy=True,
            elapsed_seconds=0,
            motion_duration=duration if mode != 'read' else None,
            status='Starting',
            telemetry={},
            tracking=None,
            bus=None,
            simulation_links=None,
            simulation_poses=None,
            simulation_head=None,
            simulation_route=route.snapshot() if route else None,
            stage='starting',
            log=None,
            execution=execution,
            run_id=self.active_run_id,
            active_settings=(dict({k: math.degrees(v) if k in ('yaw', 'pitch', 'bias', 'lag', 'offset') else v
                                   for k, v in initial_rad.items()}, duration=duration, ramp=ramp)
                             if mode == 'gait' else None),
            pending_settings=None,
            settings_revision=1,
            transition_state='idle'
        )
        self.state['controller'] = manual.snapshot() if manual else None
        if execution == 'simulation':
            self.state['simulation_state'] = 'running'
        self.thread = threading.Thread(
            target=self._run,
            args=(mode, execution, port, config, values, duration, ramp, run_speed, sid, ticks),
            daemon=True
        )
        self.thread.start()
        return self.active_run_id

    def live_apply(self, candidate_settings, expected_revision, request_id, session_id=None):
        with self.lock:
            if self.cancel.is_set() or not self.state['busy'] or not self.motion_generator:
                raise RuntimeError("No active gait motion job to update")
            if session_id and not self.sessions.is_operator(session_id):
                raise RuntimeError("Only the active operator can apply live parameter updates")
            if self.manual:
                raise RuntimeError('Stop controller motion before using live Apply')

            t_now = self.motion_generator.last_t or 0.0
            res = self.motion_generator.request_update(request_id, expected_revision, candidate_settings, t_now)

            if res['status'] == 'idempotent':
                return res
            self.state['pending_settings'] = copy.deepcopy(candidate_settings)
            self.state['settings_revision'] = self.motion_generator.current_revision
            self.state['transition_state'] = 'transitioning'

            if self.active_run_log:
                try:
                    with self.active_run_log.with_suffix('.events.jsonl').open('a', encoding='utf-8') as stream:
                        op_name = self.sessions.get_operator_name(session_id) or (self.sessions.active_operator['name'] if self.sessions.active_operator else None)
                        stream.write(json.dumps(dict(event='accepted', operator=op_name, elapsed=t_now, settings=candidate_settings, **res)) + '\n')
                except OSError as exc:
                    self.stop()
                    raise RuntimeError('Update logging failed; Stop requested') from exc
            return res

    @locked
    def controller_input(self, data, session_id):
        if not self.state['busy'] or self.cancel.is_set() or not self.manual:
            raise RuntimeError('No active controller job')
        if session_id != self.owner_session or not self.sessions.is_operator(session_id):
            raise RuntimeError('Controller job belongs to another operator session')
        if data.get('run_id') != self.active_run_id:
            raise ValueError('Current controller run_id required')
        if data.get('deadman') is False:
            self.manual.input['deadman'] = False
            self.stop()
            self.state['controller'] = self.manual.snapshot()
            return self.state['controller']
        self.manual.update(data)
        self.state['controller'] = self.manual.snapshot()
        return self.state['controller']

    def stop(self, operator_name=None):
        self.cancel.set()
        if self.motion_generator:
            self.motion_generator.abort_transition()
        if self.active_run_log:
            try:
                with self.active_run_log.with_suffix('.events.jsonl').open('a', encoding='utf-8') as stream:
                    op = operator_name or (self.sessions.active_operator['name'] if self.sessions.active_operator else 'unknown')
                    t_now = max(0.0, time.monotonic() - (self.job_started or time.monotonic()))
                    stream.write(json.dumps(dict(event='stop', operator=op, elapsed=t_now)) + '\n')
            except Exception:
                pass
        if self.state['busy']:
            self.state['status'] = 'Stop requested; waiting for torque-off cleanup'

    def read_diagnostics(self, port, sample_telemetry=False):
        with self.lock:
            if self.state['busy'] or self.firmware.snapshot()['is_busy']:
                raise RuntimeError("Stop active motion and firmware jobs before running diagnostics")
            if not port or not isinstance(port, str):
                raise ValueError("Select a valid transmitter serial port")
            iface = self.hardware_factory(port=port)
            try:
                ok, message = iface.connect()
                if not ok:
                    raise RuntimeError(message)
                if sample_telemetry:
                    started = time.monotonic()
                    telemetry = iface.read_telemetry()
                    latency = time.monotonic() - started
                    if latency > runner.MAX_GAP:
                        raise RuntimeError('Telemetry deadline exceeded')
                    for motor in range(1, 11):
                        row = telemetry.get(motor, {})
                        position = row.get('position')
                        row['valid'] = bool(row.get('valid')) and type(position) is int and 0 <= position <= 4095
                        telemetry[motor] = row
                    sampled_at = time.time()
                    previous = self.state.get('bus') or {}
                    interval = sampled_at - previous['at'] if previous.get('port') == port and previous.get('kind') == 'idle' else None
                    self.state.update(telemetry=telemetry, feedback_at=sampled_at,
                                      bus=dict(port=port, at=sampled_at, latency_ms=round(latency * 1000, 1),
                                               interval_s=interval, kind='idle'))
                diag = iface.read_diagnostics()
                self.last_diagnostic = {
                    'timestamp': time.time(),
                    'port': port,
                    'servos': diag
                }
                return self.last_diagnostic
            finally:
                iface.disconnect()

    @locked
    def capture_pose(self, port):
        if self.state['busy'] or self.firmware.snapshot()['is_busy']:
            raise RuntimeError('Stop active motion and firmware jobs before capturing a pose')
        if not isinstance(port, str) or not port.strip():
            raise ValueError('Select a valid transmitter serial port')
        config = runner.load_map(self.map_path)
        iface = self.hardware_factory(port=port)
        try:
            ok, message = iface.connect()
            if not ok:
                raise RuntimeError(message)
            started = time.monotonic()
            telemetry = iface.read_telemetry()
            if time.monotonic() - started > runner.MAX_GAP:
                raise RuntimeError('Telemetry deadline exceeded; capture again')
            pose = {}
            for joint in config['joints']:
                row = telemetry.get(joint['id'], {})
                position = row.get('position')
                if not row.get('valid') or type(position) is not int or not 0 <= position <= 4095:
                    raise ValueError(f"Joint {joint['id']} has missing or invalid feedback; capture again")
                if not joint['min'] <= position <= joint['max']:
                    raise ValueError(f"Joint {joint['id']} is outside its calibrated limits")
                pose[str(joint['id'])] = joint['sign'] * (position - joint['zero']) * 360 / 4096
            return dict(pose=pose, joints=config['joints'])
        finally:
            iface.disconnect()

    @locked
    def get_pose_presets(self):
        path = self.map_path.parent / 'runs' / 'pose_presets.json'
        return json.loads(path.read_text(encoding='utf-8')) if path.exists() else []

    @locked
    def save_pose_preset(self, data):
        name = data.get('name')
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80:
            raise ValueError('Pose name must be 1 to 80 characters')
        config = runner.load_map(self.map_path)
        if data.get('joints') != config['joints']:
            raise ValueError('Joint calibration changed; capture the pose again')
        pose = data.get('pose')
        if not isinstance(pose, dict) or set(pose) != {str(j['id']) for j in config['joints']}:
            raise ValueError('A complete pose for all ten joints is required')
        validate_pose(config, pose)
        presets = self.get_pose_presets()
        previous = next((p for p in presets if p['name'] == name.strip()), None)
        if 'expected' in data:
            if previous is None or data['expected'] != previous:
                raise RuntimeError('Saved pose changed; reload the presets and re-calibrate again')
        elif previous is not None:
            raise ValueError('A pose with this name already exists; choose another name')
        updated = dict(name=name.strip(), pose=pose, joints=config['joints'])
        if previous is None:
            presets.append(updated)
        else:
            presets[presets.index(previous)] = updated
        path = self.map_path.parent / 'runs' / 'pose_presets.json'
        path.parent.mkdir(exist_ok=True)
        atomic_json(path, presets)
        return presets

    def _run(self, mode, execution, port, config, values, duration, ramp, run_speed, sid, ticks):
        iface = self.simulation if execution == 'simulation' else None
        failed = False
        status = 'Completed; torque off'
        log = self.map_path.parent / 'runs' / f'{self.active_run_id}.csv'
        self.active_run_log = log
        owner = self

        job_config = copy.deepcopy(config) if config is not None else {}
        if config is not None:
            job_config['speed'] = run_speed

        if self.motion_generator:
            def target_at(t):
                if self.manual:
                    with self.lock:
                        self.manual.check()
                        if self.manual.assist != 'manual':
                            if execution == 'simulation':
                                head = iface.head_pose()
                                pose = dict(x=head['position'][0], y=head['position'][1], yaw=head['yaw'])
                            else:
                                pose = self.localization.pose()
                            self.motion_generator.manual_pose = pose
                        if execution != 'preview':
                            age = time.time() - self.state.get('feedback_at', 0)
                            self.manual.feedback(self.state['telemetry'] if age <= .5 else {}, job_config['tracking_error'], runner.PERIOD)
                if execution == 'simulation' and self.simulation_route:
                    self.simulation_route.update(iface.head_pose(), t)
                    if self.simulation_route.state in ('completed', 'stalled'):
                        raise InterruptedError(f'Route {self.simulation_route.state}')
                with self.lock:
                    targets, current_params = self.motion_generator.evaluate(t)
                if self.manual:
                    with self.lock:
                        self.state['controller'] = self.manual.snapshot()
                job_config['speed'] = current_params['speed']
                if execution == 'simulation' and self.simulation_route:
                    targets = self.simulation_route.targets(targets, job_config, envelope(t, duration, ramp))
                return targets
        elif self.pose_targets is not None:
            pose_targets = dict(self.pose_targets)
            target_at = lambda t: pose_targets
        elif values is not None:
            target_at = lambda t: runner.targets_at(t, job_config, *values)
        else:
            target_at = (lambda t: {j['id']: j['zero'] for j in config['joints']}) if mode == 'align' else None

        class LeaseStop:
            def is_set(inner):
                if owner.cancel.is_set():
                    return True
                with owner.lock:
                    if owner.owner_session and not owner.sessions.is_operator(owner.owner_session):
                        owner.stop()
                    if owner.manual:
                        try:
                            owner.manual.check()
                        except InterruptedError as exc:
                            owner.state['status'] = str(exc)
                            owner.stop()
                    return owner.cancel.is_set()

        class LiveWriter:
            def writerow(self, row):
                writer.writerow(row)
                stream.flush()
                if len(row) == 8 and isinstance(row[3], int):
                    with owner.lock:
                        if execution == 'simulation' and row[3] == 10:
                            owner.state['simulation_links'] = iface.link_positions()
                            owner.state['simulation_poses'] = iface.link_poses()
                            owner.state['simulation_head'] = iface.head_pose()
                            owner.state['simulation_route'] = owner.simulation_route.snapshot() if owner.simulation_route else None
                        owner.state['feedback_at'] = time.time()
                        if owner.state.get('bus') is not None and row[2]:
                            owner.state['bus']['interval_s'] = row[2]
                        owner.state['stage'] = row[0]
                        owner.state['tracking'] = dict(error=job_config.get('tracking_error'), timeout=job_config.get('tracking_timeout'))
                        # Peak and recent error are kept at the 20 Hz loop rate; the browser polls slower.
                        previous = owner.state['telemetry'].get(row[3]) or {}
                        error = abs(row[5] - row[4]) if isinstance(row[5], (int, float)) and isinstance(row[4], (int, float)) else None
                        history = (previous.get('error_history') or []) + ([error] if error is not None else [])
                        owner.state['telemetry'][row[3]] = dict(
                            valid=True,
                            target=row[4],
                            position=row[5],
                            velocity=row[6],
                            load=row[7],
                            error=error,
                            peak_error=max((v for v in (previous.get('peak_error'), error) if v is not None), default=None),
                            error_history=history[-40:]
                        )
                        if owner.motion_generator:
                            trans = owner.motion_generator.transition
                            owner.state['transition_state'] = trans['state'] if trans else 'applied'
                            if owner.motion_generator.pending_settings is None and trans and trans['state'] == 'applied':
                                owner.state['active_settings'] = {k: math.degrees(v) if k in ('yaw', 'pitch', 'bias', 'lag', 'offset') else v for k, v in trans['to_settings'].items()}
                                owner.state['pending_settings'] = None

        try:
            log.parent.mkdir(exist_ok=True)
            with self.lock:
                self.state['log'] = log.name
            op_name = self.sessions.get_operator_name(self.owner_session) if self.owner_session else (self.sessions.active_operator['name'] if self.sessions.active_operator else None)
            with log.with_suffix('.json').open('x', encoding='utf-8') as manifest:
                json.dump(dict(
                    operator=op_name,
                    mode=mode,
                    execution=execution,
                    joint_map=config,
                    simulation_tracking=(dict(tracking_error=job_config['tracking_error'], tracking_timeout=job_config['tracking_timeout']) if execution == 'simulation' and config is not None else None),
                    simulation_path=self.simulation_route.path if execution == 'simulation' and self.simulation_route else None,
                    values=values,
                    joint_overrides=self.joint_overrides,
                    pose_targets=self.pose_targets,
                    duration=duration,
                    ramp=ramp,
                    speed=run_speed,
                    id=sid,
                    ticks=ticks,
                    timestamp=time.time(),
                    annotations={},
                    controller=self.manual.snapshot() if self.manual else None
                ), manifest, indent=2)

            with log.open('x', newline='', encoding='utf-8') as stream:
                writer = csv.writer(stream)
                writer.writerow(['stage', 'elapsed_s', 'interval_s', 'id', 'target_counts', 'position_counts', 'velocity_raw', 'load_raw'])
                if execution == 'preview':
                    with self.lock:
                        self.state['stage'] = 'preview'
                    for n in range(math.ceil(duration / runner.PERIOD) + 1):
                        if self.manual and n:
                            self.cancel.wait(runner.PERIOD)
                        if LeaseStop().is_set():
                            raise InterruptedError('Stop requested')
                        t = min(n * runner.PERIOD, duration)
                        targets = target_at(t)
                        for motor, target in targets.items():
                            writer.writerow(['preview', t, runner.PERIOD, motor, target, '', '', ''])
                    status = 'Preview complete; no hardware connected'
                else:
                    if execution == 'simulation':
                        iface = self.simulation
                    else:
                        iface = self.hardware_factory(port=port)
                        ok, message = iface.connect()
                        if not ok:
                            raise RuntimeError(message)
                        # Time the feedback round trip the loop already makes; adds no bus traffic.
                        read_telemetry = getattr(iface, 'read_telemetry', None)
                        def timed_read_telemetry():
                            started = time.monotonic()
                            result = read_telemetry()
                            with self.lock:
                                bus = self.state.get('bus') or {}
                                bus.update(port=port, at=time.time(), latency_ms=round((time.monotonic() - started) * 1000, 1))
                                self.state['bus'] = bus
                            return result
                        if read_telemetry:
                            iface.read_telemetry = timed_read_telemetry
                    if self.cancel.is_set():
                        raise InterruptedError('Stop requested')
                    with self.lock:
                        self.state['status'] = 'Running' if mode != 'read' else 'Reading; torque off'
                    if mode == 'read':
                        started = time.monotonic()
                        state = iface.read_telemetry()
                        if time.monotonic() - started > runner.MAX_GAP:
                            raise RuntimeError('Telemetry deadline exceeded')
                        for motor in range(1, 11):
                            row = state.get(motor, {})
                            position = row.get('position')
                            row['valid'] = bool(row.get('valid')) and type(position) is int and 0 <= position <= 4095
                            state[motor] = row
                        missing = [str(i) for i, row in state.items() if not row['valid']]
                        with self.lock:
                            self.state.update(telemetry=state, stage='read_torque_off', feedback_at=time.time())
                        for motor, row in state.items():
                            writer.writerow(['read_torque_off', 0, 0, motor, '', row.get('position', ''), row.get('velocity', ''), row.get('load', '')])
                        if missing:
                            status = 'Torque off; missing/invalid feedback: ' + ', '.join(missing)
                    else:
                        # Pass runner with lease monitoring
                        runner.run_motion(
                            iface,
                            job_config,
                            target_at,
                            duration,
                            LiveWriter(),
                            jog_id=sid,
                            jog_ticks=ticks,
                            stop_event=LeaseStop(),
                            center=mode == 'center'
                        )
        except Exception as exc:
            failed = not isinstance(exc, InterruptedError)
            status = f'Stopped: {exc}'
            if log.exists():
                try:
                    with log.open('a', newline='', encoding='utf-8') as stream:
                        csv.writer(stream).writerow(['fault', '', '', '', '', '', '', str(exc)])
                except Exception:
                    pass
        finally:
            if execution == 'simulation':
                with self.lock:
                    if self.simulation_route:
                        route = self.simulation_route
                        if route.state not in ('completed', 'stalled'):
                            route.state = 'error' if failed else 'stopped' if self.cancel.is_set() else 'timed_out'
                        self.state['simulation_route'] = copy.deepcopy(route.snapshot())
                        if not failed:
                            status = 'Completed route; torque off' if route.state == 'completed' else f'Stopped: route {route.state.replace("_", " ")}; torque off'
                        try:
                            atomic_json(log.parent / 'routes' / log.with_suffix('.json').name, self.state['simulation_route'])
                        except OSError as exc:
                            status += f'; route log failed: {exc}'
                    try:
                        if iface is not None:
                            if not failed and not self.simulation_disconnect_requested:
                                iface.stop()
                            else:
                                iface.disconnect()
                    except Exception as exc:
                        failed = True
                        status += f'; simulation cleanup failed: {exc}'
                        try:
                            if iface is not None: iface.disconnect()
                        except Exception as cleanup_exc:
                            status += f'; disconnect failed: {cleanup_exc}'
                    if failed or self.simulation_disconnect_requested:
                        self.state['simulation_links'] = None
                        self.state['simulation_poses'] = None
                        self.state['simulation_head'] = None
                        self.simulation = None
                        self.simulation_revision = None
                    self.state['simulation_state'] = 'error' if failed else 'disconnected' if self.simulation_disconnect_requested else 'connected'
                    self.state['simulation_error'] = status if failed else None
                    self.simulation_disconnect_requested = False
                    self.state.update(busy=False, elapsed_seconds=max(0, time.monotonic() - self.job_started),
                                      status=status, pending_settings=None, transition_state='idle')
            else:
                if iface is not None:
                    try:
                        iface.disconnect()
                    except Exception as exc:
                        status += f'; torque-off acknowledgement failed: {exc}. Disconnect robot power.'
                with self.lock:
                    self.state.update(busy=False, elapsed_seconds=max(0, time.monotonic() - self.job_started),
                                      status=status, pending_settings=None, transition_state='idle')

    @locked
    def get_presets(self):
        preset_file = self.map_path.parent / 'runs' / 'presets.json'
        if preset_file.exists():
            try:
                return json.loads(preset_file.read_text(encoding='utf-8'))
            except Exception:
                pass
        return DEFAULT_PRESETS

    @locked
    def save_preset(self, preset, expected=...):
        if not isinstance(preset, dict) or not preset.get('name'):
            raise ValueError("Preset must have a valid name")
        if not isinstance(preset['name'], str) or not 1 <= len(preset['name'].strip()) <= 80:
            raise ValueError('Preset name must be 1 to 80 characters')
        if set(preset) - {'name', 'description', 'mode', 'yaw', 'pitch', 'bias', 'frequency', 'lag', 'offset', 'speed', 'ramp', 'duration'}:
            raise ValueError('Unknown preset field')
        if not isinstance(preset.get('description', ''), str) or len(preset.get('description', '')) > 500:
            raise ValueError('Invalid preset description')
        for key in ('yaw', 'pitch', 'bias', 'frequency', 'lag', 'offset', 'speed', 'ramp', 'duration'):
            runner.number(preset.get(key), key, -10000, 10000)
        config = runner.load_map(self.map_path)
        validate_gait(config, *(math.radians(preset[k]) for k in ('yaw', 'pitch', 'bias')), preset['frequency'], math.radians(preset['lag']), math.radians(preset['offset']), preset['duration'], preset['ramp'], speed=preset['speed'])
        presets = self.get_presets()
        existing_preset = next((p for p in presets if p['name'] == preset['name']), None)
        if expected is not ... and expected != existing_preset:
            raise RuntimeError('Preset changed; reload the presets before saving')
        # Replace if name exists, else append
        existing = [p for p in presets if p['name'] != preset['name']]
        existing.append(preset)
        preset_file = self.map_path.parent / 'runs' / 'presets.json'
        preset_file.parent.mkdir(exist_ok=True)
        atomic_json(preset_file, existing)
        return existing

    @locked
    def delete_preset(self, name):
        presets = self.get_presets()
        updated = [p for p in presets if p['name'] != name]
        preset_file = self.map_path.parent / 'runs' / 'presets.json'
        preset_file.parent.mkdir(exist_ok=True)
        atomic_json(preset_file, updated)
        return updated

    @locked
    def list_runs(self):
        runs_dir = self.map_path.parent / 'runs'
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

    @locked
    def annotate_run(self, run_id, displacement_cm=None, surface=None, notes=None):
        if not isinstance(run_id, str) or not run_id.startswith('web-') or not run_id[4:].isdigit():
            raise ValueError('Invalid run ID')
        json_file = self.map_path.parent / 'runs' / f'{run_id}.json'
        if not json_file.exists():
            raise ValueError(f"Run {run_id} not found")
        data = json.loads(json_file.read_text(encoding='utf-8'))
        annotations = data.get('annotations', {})
        if displacement_cm is not None:
            annotations['displacement_cm'] = runner.number(displacement_cm, 'displacement_cm', -10000, 10000)
        if surface is not None:
            annotations['surface'] = str(surface).strip()[:100]
        if notes is not None:
            annotations['notes'] = str(notes).strip()[:1000]
        data['annotations'] = annotations
        atomic_json(json_file, data)
        return annotations

    def close(self):
        self.cancel.set()
        self.simulation_disconnect_requested = True
        if self.simulation_thread:
            self.simulation_thread.join(timeout=5)
        if self.thread:
            self.thread.join(timeout=5)
        with self.lock:
            if self.simulation is not None and not self.state['busy']:
                self.simulation.disconnect()
                self.simulation = None
                self.state['simulation_state'] = 'disconnected'

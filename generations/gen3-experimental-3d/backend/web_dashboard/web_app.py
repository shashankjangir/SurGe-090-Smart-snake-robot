"""SURGE Gen 2.1 dashboard. Importing this module never starts hardware or threads."""
import atexit
import copy
import gzip
import json
import math
import sys
import time
import zlib
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from flask import Flask, jsonify, request, render_template, send_from_directory, abort, g
from surge_control.runtime import ControlRuntime
from surge_control.gen3 import Gen3Control, runner


import os

TRUSTED_PROXIES = set(filter(None, [p.strip() for p in os.environ.get('SURGE_TRUSTED_PROXIES', '127.0.0.1,::1').split(',')]))

def is_request_secure():
    if request.is_secure:
        return True
    if request.remote_addr in TRUSTED_PROXIES:
        proto = request.headers.get('X-Forwarded-Proto', '').strip().lower()
        if proto == 'https':
            return True
    return False

def create_app(runtime=None):
    app = Flask(__name__, root_path=str(Path(__file__).resolve().parent))
    control = runtime or ControlRuntime()
    app.config["CONTROL"] = control
    gen3 = Gen3Control(control.lock)
    app.config['GEN3'] = gen3
    gen3.planar_control = control
    control.sessions = gen3.sessions

    def get_current_session(create_if_missing=True):
        session_id = request.headers.get('X-Session-ID') or request.cookies.get('surge_gen3_session')
        session = gen3.sessions.get_or_create(session_id) if (session_id or create_if_missing) else None
        if session:
            g.current_session = session
        return session

    @app.after_request
    def set_session_cookie(response):
        session = getattr(g, 'current_session', None)
        if session and request.cookies.get('surge_gen3_session') != session['session_id']:
            is_secure = is_request_secure()
            response.set_cookie('surge_gen3_session', session['session_id'], path='/', samesite='Lax', httponly=True, secure=is_secure)
        return response

    static_dir = Path(app.static_folder)
    version_cache = {'at': 0., 'v': ''}

    def asset_version():
        # Changes whenever any static file changes, so ?v= URLs can be cached for a year.
        # Rescanned at most once a second because every static request asks.
        if time.monotonic() - version_cache['at'] > 1:
            stamp = repr([(str(p), p.stat().st_mtime_ns, p.stat().st_size)
                          for p in sorted(static_dir.rglob('*')) if p.is_file()])
            version_cache.update(at=time.monotonic(), v=format(zlib.crc32(stamp.encode()), 'x'))
        return version_cache['v']

    @app.context_processor
    def inject_asset_version():
        return {'asset_v': asset_version()}

    compressible = ('text/', 'application/javascript', 'application/json', 'image/svg+xml')
    gzip_cache = {}

    @app.after_request
    def compress_and_cache(response):
        is_static = request.path.startswith('/static/')
        if is_static and request.args.get('v') and request.args.get('v') == asset_version():
            response.cache_control.no_cache = None
            response.cache_control.public = True
            response.cache_control.max_age = 31536000
            response.cache_control.immutable = True
        if (response.status_code != 200 or 'gzip' not in request.headers.get('Accept-Encoding', '')
                or response.headers.get('Content-Encoding') or response.mimetype is None
                or not response.mimetype.startswith(compressible)):
            return response
        response.direct_passthrough = False
        body = response.get_data()
        if len(body) < 1024:
            return response
        key = (request.path, response.headers.get('ETag')) if is_static else None
        compressed = gzip_cache.get(key) if key else None
        if compressed is None:
            compressed = gzip.compress(body, 9 if is_static else 5)
            if key:
                gzip_cache[key] = compressed
        response.set_data(compressed)
        response.headers['Content-Encoding'] = 'gzip'
        response.vary.add('Accept-Encoding')
        return response

    @app.before_request
    def connection_owner():
        if request.path.startswith('/api/') and request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            if request.path not in ('/api/stop', '/api/gen3/stop'):
                origin = request.headers.get('Origin')
                if (origin and origin != request.host_url.rstrip('/')) or request.headers.get('Sec-Fetch-Site') == 'cross-site':
                    return jsonify(error='Cross-origin control requests are not allowed'), 403
            payload = request.get_json(silent=True)
            if payload is not None and not isinstance(payload, dict):
                return jsonify(error='Request body must be a JSON object'), 400
        if request.method == 'POST' and request.path in ('/api/stop', '/api/gen3/stop'):
            data = request.get_json(silent=True)
            if request.path == '/api/stop' or not isinstance(data, dict) or not data.get('run_id'):
                gen3.cancel.set()
        if request.path.startswith('/api/'):
            if request.method != 'GET' or request.path == '/api/gen3/session':
                control.lock.acquire()
                g.control_locked = True
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            if request.path.startswith('/api/gen3/'):
                public_actions = (
                    '/api/gen3/stop',
                    '/api/gen3/session',
                    '/api/gen3/session/login',
                    '/api/gen3/session/logout',
                    '/api/gen3/session/claim',
                    '/api/gen3/session/release',
                    '/api/gen3/session/heartbeat'
                )
                session = get_current_session(create_if_missing=True)
                if request.path not in public_actions:
                    if not session or not gen3.sessions.is_operator(session['session_id']):
                        return jsonify(error='Operator mode required'), 403

                with control.lock:
                    if request.path not in public_actions and request.path != '/api/gen3/apply':
                        if control.state['is_running'] or gen3.firmware.snapshot()['is_busy']:
                            return jsonify(error='Release the existing controller or firmware job first'), 409
                    if request.path.startswith('/api/gen3/firmware/') and gen3.state['busy']:
                        return jsonify(error='Stop motion before firmware maintenance'), 409
            elif request.path == '/api/connect':
                session = get_current_session(create_if_missing=True)
                if not session or not gen3.sessions.is_operator(session['session_id']):
                    return jsonify(error='Operator mode required'), 403
                with control.lock:
                    if gen3.state['busy'] or gen3.firmware.snapshot()['is_busy']:
                        return jsonify(error='Stop the Gen 3 job first'), 409
            elif request.path in ('/api/start', '/api/controller', '/api/params', '/api/set_path', '/api/localization'):
                session = get_current_session(create_if_missing=True)
                if not session or not gen3.sessions.is_operator(session['session_id']):
                    return jsonify(error='Operator mode required'), 403
                with control.lock:
                    if (gen3.state['busy'] and request.path != '/api/localization') or gen3.firmware.snapshot()['is_busy']:
                        return jsonify(error='Stop the Gen 3 job first'), 409

    @app.teardown_request
    def release_request_lock(exc):
        if g.pop('control_locked', False):
            control.lock.release()

    @app.get('/gen3')
    def gen3_page():
        return render_template('gen3.html')

    @app.get('/api/gen3/status')
    def gen3_status():
        return jsonify(gen3.snapshot())

    @app.get('/api/gen3/session')
    def gen3_session_get():
        session = get_current_session(create_if_missing=True)
        return jsonify(gen3.sessions.status(current_session_id=session['session_id']))

    @app.post('/api/gen3/session/login')
    def gen3_session_login():
        is_loopback = request.remote_addr in ('127.0.0.1', '::1', 'localhost', None)
        is_secure = is_request_secure()
        if not is_loopback and not is_secure:
            return jsonify(error='Operator credentials must not be transmitted over remote plaintext HTTP. Use HTTPS or connect locally.'), 403
        data = request.get_json(silent=True) or {}
        name = data.get('name')
        password = data.get('password')
        session = get_current_session(create_if_missing=True)
        with control.lock:
            busy = gen3.state['busy'] or (control.state['is_running'] and not control.state['is_paused'])
            res = gen3.sessions.login(session['session_id'], name=name, password=password, busy_with_motion=busy)
        if not res.get('success'):
            return jsonify(error=res.get('error', 'Authentication failed')), 401
        return jsonify(res)

    @app.post('/api/gen3/session/logout')
    def gen3_session_logout():
        session = get_current_session(create_if_missing=False)
        if session:
            with control.lock:
                busy = gen3.state['busy'] or (control.state['is_running'] and not control.state['is_paused'])
                if busy and gen3.sessions.is_operator(session['session_id']):
                    return jsonify(error='Stop motion before releasing operator lease'), 409
                was_operator = gen3.sessions.is_operator(session['session_id'])
                gen3.sessions.logout(session['session_id'], busy_with_motion=busy)
                # Auto-disconnect any connected simulation engine when the operator logs out
                if was_operator:
                    if gen3.state['simulation_state'] in ('connected', 'connecting', 'running') or gen3.simulation is not None:
                        gen3.disconnect_simulation()
                    if control.state.get('is_running') and control.state.get('engine') == 'SIM':
                        control.disconnect()
        return jsonify(success=True)

    @app.post('/api/gen3/session/claim')
    def gen3_session_claim():
        data = request.get_json(silent=True) or {}
        name = data.get('name')
        password = data.get('password', '')
        session = get_current_session(create_if_missing=True)
        with control.lock:
            busy = gen3.state['busy'] or (control.state['is_running'] and not control.state['is_paused'])
            res = gen3.sessions.login(session['session_id'], name=name, password=password, busy_with_motion=busy)
        if not res.get('success'):
            return jsonify(error=res.get('error', 'Authentication failed')), 401
        return jsonify(res)

    @app.post('/api/gen3/session/release')
    def gen3_session_release():
        return gen3_session_logout()

    @app.post('/api/gen3/session/heartbeat')
    def gen3_session_heartbeat():
        session = get_current_session(create_if_missing=False)
        if not session:
            return jsonify(active=False, expires_in=0.0)
        res = gen3.sessions.heartbeat(session['session_id'])
        return jsonify(res)

    @app.get('/api/ports')
    @app.get('/api/gen3/ports')
    def gen3_ports():
        from serial.tools import list_ports
        ports = list_ports.comports()
        # USB-UART bridges on ESP32 boards: CP210x, CH340, FTDI, Espressif native USB.
        # Bluetooth COM ports have no VID and caused write timeouts, so they are never picked.
        # Receiver and transmitter share the same bridge, so only a single board is unambiguous.
        boards = [p for p in ports if p.vid in (0x10C4, 0x1A86, 0x0403, 0x303A)]
        if len(boards) > 1:
            # Both boards attached: prefer the USB socket the transmitter last connected from.
            try:
                learned = json.loads(Path(app.config['TRANSMITTER_FILE']).read_text(encoding='utf-8'))['location']
            except (OSError, ValueError, KeyError):
                learned = None
            boards = [p for p in boards if learned and p.location == learned]
        return jsonify(ports=[dict(device=p.device, description=p.description) for p in ports],
                       recommended=boards[0].device if len(boards) == 1 else None)

    def remember_transmitter(device):
        # The socket path (e.g. 1-2.4) survives Windows renumbering COM ports.
        from serial.tools import list_ports
        location = next((p.location for p in list_ports.comports() if p.device == device), None)
        if location:
            try:
                Path(app.config['TRANSMITTER_FILE']).write_text(json.dumps({'location': location}), encoding='utf-8')
            except OSError:
                pass  # A missed hint must never fail a connection.

    app.config.setdefault('TRANSMITTER_FILE', gen3.map_path.parent / 'transmitter_port.json')
    app.config['REMEMBER_TRANSMITTER'] = remember_transmitter

    @app.get('/api/gen3/map')
    def gen3_map():
        with control.lock:
            data = gen3.load_map_with_revision()
            res = copy.deepcopy(data['config'])
            res['revision'] = data['revision']
            return jsonify(res)

    @app.post('/api/gen3/map')
    def gen3_save_map():
        payload = request.get_json() or {}
        expected_revision = payload.pop('expected_revision', None) or payload.pop('revision', None)
        if not expected_revision:
            raise ValueError('Calibration revision is required; reload the map')
        config = payload.get('config', payload)
        session = get_current_session(create_if_missing=False)
        op_name = gen3.sessions.get_operator_name(session['session_id']) if session else None
        with control.lock:
            gen3.save_map(config, expected_revision=expected_revision, operator_name=op_name)
        return jsonify(success=True)

    @app.post('/api/gen3/simulation/connect')
    def gen3_simulation_connect():
        gen3.connect_simulation()
        return jsonify(success=True, state='connecting'), 202

    @app.post('/api/gen3/simulation/disconnect')
    def gen3_simulation_disconnect():
        gen3.disconnect_simulation()
        return jsonify(success=True, state=gen3.state['simulation_state'])

    @app.post('/api/gen3/start')
    def gen3_start():
        with control.lock:
            if control.state['is_running']:
                raise RuntimeError('Disconnect the planar controller before starting a Gen 3 job')
            session = get_current_session(create_if_missing=False)
            session_id = session['session_id'] if session else None
            data = request.get_json()
            if not isinstance(data, dict):
                raise ValueError('Job settings must be an object')
            if not isinstance(data.get('request_id'), str) or not 1 <= len(data['request_id']) <= 128:
                raise ValueError('Start requires a request_id')
            run_id = gen3.start(data, session_id=session_id)
        if data.get('execution') == 'hardware':
            remember_transmitter(data.get('port'))
        return jsonify(success=True, run_id=run_id), 202

    @app.post('/api/gen3/controller')
    def gen3_controller():
        return jsonify(success=True, controller=gen3.controller_input(request.get_json() or {}, g.current_session['session_id']))

    @app.post('/api/gen3/apply')
    def gen3_apply():
        data = request.get_json() or {}
        session = get_current_session(create_if_missing=False)
        session_id = session['session_id'] if session else None
        if data.get('run_id') != gen3.active_run_id or not data.get('request_id'):
            raise ValueError('Current run_id and request_id are required')
        candidate = data.get('settings', data)
        revision = data.get('expected_revision')
        if type(revision) is not int or revision < 1:
            raise ValueError('A positive integer expected_revision is required')
        request_id = data['request_id']
        with control.lock:
            res = gen3.live_apply(candidate, revision, request_id, session_id=session_id)
        return jsonify(res)

    @app.post('/api/gen3/stop')
    def gen3_stop():
        session = get_current_session(create_if_missing=False)
        op_name = gen3.sessions.get_operator_name(session['session_id']) if session else None
        with control.lock:
            data = request.get_json(silent=True) or {}
            if data.get('run_id') and (gen3.state.get('run_id') != data['run_id'] or
                                       gen3.state.get('execution') != 'simulation'):
                raise RuntimeError('That simulation is no longer the active job')
            gen3.stop(operator_name=op_name)
            if not data.get('run_id'):
                control.pause()
        return jsonify(success=True)

    @app.post('/api/gen3/diagnostics')
    def gen3_diagnostics():
        data = request.get_json() or {}
        port = data.get('port')
        with control.lock:
            diag = gen3.read_diagnostics(port)
        return jsonify(diag)

    @app.post('/api/gen3/center')
    def gen3_center():
        data = request.get_json() or {}
        if not isinstance(data.get('request_id'), str) or not 1 <= len(data['request_id']) <= 128:
            raise ValueError('Center requires a request_id')
        data['mode'] = 'center'
        data['execution'] = 'hardware'
        session = get_current_session(create_if_missing=False)
        session_id = session['session_id'] if session else None
        with control.lock:
            gen3.start(data, session_id=session_id)
        return jsonify(success=True), 202

    @app.get('/api/gen3/presets')
    def gen3_get_presets():
        return jsonify(presets=gen3.get_presets())

    @app.post('/api/gen3/presets')
    def gen3_save_preset():
        data = request.get_json() or {}
        if 'preset' in data:
            if set(data) != {'preset', 'expected'}:
                raise ValueError('Expected preset snapshot is required')
            presets = gen3.save_preset(data['preset'], expected=data['expected'])
        else:
            presets = gen3.save_preset(data)
        return jsonify(success=True, presets=presets)

    @app.delete('/api/gen3/presets/<name>')
    def gen3_delete_preset(name):
        presets = gen3.delete_preset(name)
        return jsonify(success=True, presets=presets)

    @app.get('/api/gen3/runs')
    def gen3_runs():
        return jsonify(runs=gen3.list_runs())

    @app.post('/api/gen3/runs/<run_id>/annotate')
    def gen3_annotate_run(run_id):
        data = request.get_json() or {}
        res = gen3.annotate_run(
            run_id,
            displacement_cm=data.get('displacement_cm'),
            surface=data.get('surface'),
            notes=data.get('notes')
        )
        return jsonify(success=True, annotations=res)

    @app.post('/api/gen3/firmware/build')
    def gen3_firmware_build():
        data = request.get_json() or {}
        env = data.get('env')
        session = get_current_session(create_if_missing=False)
        op_name = gen3.sessions.get_operator_name(session['session_id']) if session else None
        with control.lock:
            if gen3.state['busy'] or control.state['is_running']:
                raise RuntimeError('Stop and disconnect motion before building firmware')
            gen3.firmware.build(env, operator_name=op_name)
        return jsonify(success=True)

    @app.post('/api/gen3/firmware/upload')
    def gen3_firmware_upload():
        data = request.get_json() or {}
        if not data.get('confirm_board') or not data.get('confirm_power') or not data.get('confirm_risk'):
            raise ValueError("All safety confirmation checkboxes must be verified before upload")
        env = data.get('env')
        port = data.get('port')
        with control.lock:
            if gen3.state['busy']:
                raise RuntimeError("Stop active motion before uploading firmware")
            raise ValueError('Firmware upload is unavailable; no board will be flashed. Use the documented owner-operated upload procedure.')
        return jsonify(success=True)

    @app.get('/api/gen3/firmware/status')
    def gen3_firmware_status():
        return jsonify(gen3.firmware.snapshot())

    @app.get('/api/gen3/log/<name>')
    def gen3_log(name):
        if not name.startswith('web-') or not name.endswith(('.csv', '.json', '.events.jsonl')):
            raise ValueError('Select a Gen 3 web log')
        return send_from_directory(gen3.map_path.parent / 'runs', name, as_attachment=True)

    @app.errorhandler(ValueError)
    def bad_request(exc):
        return jsonify(error=str(exc)), 400

    @app.errorhandler(RuntimeError)
    def device_error(exc):
        return jsonify(error=str(exc)), 409

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/3d")
    @app.get("/3d_viewer")
    def viewer():
        return render_template("3d_viewer.html", embedded=request.args.get("embedded") == "1")

    @app.post("/api/connect")
    def connect():
        with control.lock:
            if gen3.state['busy']:
                raise RuntimeError('Stop the Gen 3 job first')
            session = get_current_session(create_if_missing=True)
            if not session or not gen3.sessions.is_operator(session['session_id']):
                return jsonify(error='Operator mode required'), 403
            if control.state["is_running"]:
                control.disconnect()
                return jsonify(success=True, status="Disconnected")
            data = request.get_json() or {}
            ok, message = control.connect(data.get("engine", "SIM"), data.get("port"), data.get("headless", True))
            if ok and data.get("engine") == "ST3215":
                remember_transmitter(data.get("port"))
            return jsonify(success=ok, status=message), 200 if ok else 409

    @app.post("/api/start")
    def start():
        with control.lock:
            if gen3.state['busy']:
                raise RuntimeError('Stop the Gen 3 job first')
            control.start()
            control.owner_session = g.current_session['session_id']
        return jsonify(success=True)

    @app.post("/api/stop")
    def stop():
        with control.lock:
            gen3.stop()
            control.pause()
            report = None
            if control.state["engine"] == "SIM" and control.state["path_progress"] > 0.2:
                report = report_data()
        return jsonify(success=True, report=report)

    @app.post("/api/params")
    def params():
        with control.lock:
            control.set_params(request.get_json() or {})
        return jsonify(success=True)

    @app.post("/api/set_path")
    def path():
        with control.lock:
            data = request.get_json() or {}
            new_path = data.get("path", [])
            report = None
            if (not new_path and data.get("include_report") and control.state['engine'] == 'SIM'
                    and control.state['is_running'] and control.state['is_paused']
                    and control.state['status'] == 'Stopped; torque off'
                    and control.state['path_progress'] > .2):
                report = report_data()
            elif not new_path and data.get("include_report") and control.state['engine'] == 'SIM' and data.get("snapshot"):
                # Explicit snapshot requested on Clear Canvas
                report = report_data(force=True)
            control.set_path(new_path)
            revision = control.path_revision
        return jsonify(success=True, report=report, path_revision=revision)

    @app.post("/api/controller")
    def controller():
        with control.lock:
            if gen3.state['busy']:
                raise RuntimeError('Stop the Gen 3 job first')
            if control.manual and control.owner_session != g.current_session['session_id']:
                raise RuntimeError('Controller job belongs to another operator session')
            control.controller(request.get_json() or {})
            control.owner_session = g.current_session['session_id']
        return jsonify(success=True, run_id=control.controller_run_id)

    @app.post('/api/localization')
    def localization():
        from surge_control.manual import Localization
        data = request.get_json() or {}
        generation = data.get('generation')
        if generation not in ('2.1', '3'):
            raise ValueError('Select localization generation 2.1 or 3')
        target = gen3 if generation == '3' else control
        moving = gen3.state['busy'] if generation == '3' else not control.state['is_paused']
        if data.get('reset') is True:
            if moving:
                raise RuntimeError('Stop motion before resetting localization')
            target.localization = Localization()
        else:
            if moving and target.owner_session != g.current_session['session_id']:
                raise RuntimeError('Localization belongs to another operator session')
            try:
                target.localization.update(data)
            except ValueError:
                if moving and target.manual and target.manual.assist != 'manual':
                    target.stop() if generation == '3' else target.pause('Invalid localization; stopped')
                raise
        return jsonify(success=True)

    @app.get("/api/status")
    def status():
        with control.lock:
            # Trim the trail before copying; deep-copying 10k points only to drop them was the cost.
            result = copy.deepcopy({k: v for k, v in control.state.items() if k != "actual_path"})
            result["actual_path"] = copy.deepcopy(control.state["actual_path"][-500:])
            result["path_revision"] = control.path_revision
        return jsonify(result)

    @app.get("/api/3d_status")
    def state3d():
        with control.lock:
            segments = control.iface.get_3d_state() if control.iface and control.state["engine"] == "SIM" else []
            return jsonify(segments=segments, target_path=control.state["target_path"], actual_path=control.state["actual_path"][-500:], controller=control.state["controller"])

    @app.get("/api/system_stats")
    def stats():
        try:
            import psutil
            cpu, ram = psutil.cpu_percent(), psutil.virtual_memory().percent
        except ImportError:
            cpu, ram = 0., 0.
        return jsonify(cpu=cpu, ram=ram, temp="N/A", battery=gen3.battery_snapshot())

    report_cache = {}

    def report_data(force=False):
        progress, revision = control.state["path_progress"], control.path_revision
        actual_len = len(control.state["actual_path"])
        target_len = len(control.state["target_path"])
        cache_key = (revision, target_len, actual_len, progress, force)
        if cache_key in report_cache:
            return report_cache[cache_key]

        target, actual = copy.deepcopy((control.state["target_path"], control.state["actual_path"]))
        errors = list(control.report_errors)
        if len(target) < 2 or progress < .2 - 1e-9 or len(errors) < 2:
            if not force:
                return None
            outcome = "cleared while running" if (control.state['is_running'] and not control.state['is_paused']) else (
                "completed" if control.state.get("status") == "Path Complete" else (
                    "failed" if "stalled" in (control.state.get("status") or "").lower() else "stopped"
                )
            )
            return dict(outcome=outcome, avg_error=0.0, accuracy_percent=0.0,
                        sample_count=len(errors), trace_sample_count=len(actual),
                        path_progress=progress, path_revision=revision,
                        target_path=target, actual_path=actual,
                        duration_s=round(control.state.get("sim_time", 0.0), 2),
                        metric="Snapshot at clear")
        # Enforce hard computation budget: cap error samples to 10,000 max
        bounded_errors = errors[-10000:]
        error = sum(bounded_errors) / len(bounded_errors)
        outcome = "completed" if control.state.get("status") == "Path Complete" else (
            "failed" if "stalled" in (control.state.get("status") or "").lower() else "stopped"
        )
        res = dict(outcome=outcome, avg_error=error, accuracy_percent=max(0, 100*(1-error/.5)),
                   metric="Simulation visualization score = max(0, 100 × (1 − average deviation / 0.5 m)); not physical accuracy",
                   sample_count=len(bounded_errors), trace_sample_count=len(actual), path_progress=progress, path_revision=revision,
                   target_path=target, actual_path=actual,
                   duration_s=round(control.state.get("sim_time", 0.0), 2))
        if len(report_cache) > 20:
            report_cache.clear()
        report_cache[cache_key] = res
        return res

    @app.get("/api/report")
    def report():
        with control.lock:
            if control.state["engine"] != "SIM" or not control.state["is_running"]:
                return jsonify(error="Simulation report unavailable"), 409
            data = report_data()
        if data is None:
            return jsonify(error="At least 20% verified progress and two samples are required"), 400
        return jsonify(data)

    return app

app = create_app()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5000)
    args = parser.parse_args()
    runtime = app.config["CONTROL"]
    runtime.start_worker()
    atexit.register(runtime.close)
    atexit.register(app.config['GEN3'].close)
    try:
        app.run(host=args.host, port=args.port, debug=False, threaded=True)
    finally:
        app.config['GEN3'].close()
        runtime.close()

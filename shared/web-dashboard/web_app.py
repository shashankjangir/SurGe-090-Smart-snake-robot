"""SURGE Gen 2.1 dashboard. Importing this module never starts hardware or threads."""
import atexit
import copy
import math
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flask import Flask, jsonify, request, render_template
from surge_control.runtime import ControlRuntime


def create_app(runtime=None):
    app = Flask(__name__, root_path=str(Path(__file__).resolve().parent))
    control = runtime or ControlRuntime()
    app.config["CONTROL"] = control

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
    def viewer():
        return render_template("3d_viewer.html")

    @app.post("/api/connect")
    def connect():
        with control.lock:
            if control.state["is_running"]:
                control.disconnect()
                return jsonify(success=True, status="Disconnected")
            data = request.get_json() or {}
            ok, message = control.connect(data.get("engine", "SIM"), data.get("port"), data.get("headless", True))
            return jsonify(success=ok, status=message), 200 if ok else 409

    @app.post("/api/start")
    def start():
        with control.lock:
            control.start()
        return jsonify(success=True)

    @app.post("/api/stop")
    def stop():
        with control.lock:
            control.pause()
        return jsonify(success=True)

    @app.post("/api/params")
    def params():
        with control.lock:
            control.set_params(request.get_json() or {})
        return jsonify(success=True)

    @app.post("/api/set_path")
    def path():
        with control.lock:
            control.set_path((request.get_json() or {}).get("path", []))
        return jsonify(success=True)

    @app.post("/api/controller")
    def controller():
        with control.lock:
            control.controller(request.get_json() or {})
        return jsonify(success=True)

    @app.get("/api/status")
    def status():
        with control.lock:
            result = copy.deepcopy(control.state)
            result["actual_path"] = result["actual_path"][-500:]
        return jsonify(result)

    @app.get("/api/3d_status")
    def state3d():
        with control.lock:
            segments = control.iface.get_3d_state() if control.iface and control.state["engine"] == "SIM" else []
            return jsonify(segments=segments, target_path=control.state["target_path"], actual_path=control.state["actual_path"])

    @app.get("/api/system_stats")
    def stats():
        try:
            import psutil
            cpu, ram = psutil.cpu_percent(), psutil.virtual_memory().percent
        except ImportError:
            cpu, ram = 0., 0.
        return jsonify(cpu=cpu, ram=ram, temp="N/A")

    @app.get("/api/report")
    def report():
        with control.lock:
            target, actual = copy.deepcopy((control.state["target_path"], control.state["actual_path"]))
            if control.state["engine"] != "SIM":
                return jsonify(error="No hardware localization; a physical tracking report is unavailable"), 409
        if len(target) < 2 or len(actual) < 2:
            return jsonify(error="Not enough data"), 400
        def distance(point, a, b):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = dx*dx + dy*dy
            t = max(0, min(1, ((point[0]-a[0])*dx + (point[1]-a[1])*dy)/length)) if length else 0
            return math.hypot(point[0]-a[0]-t*dx, point[1]-a[1]-t*dy)
        error = sum(min(distance(p, a, b) for a, b in zip(target, target[1:])) for p in actual) / len(actual)
        return jsonify(avg_error=error, accuracy_percent=max(0, 100*(1-error/.5)),
                       metric="Visualization score relative to 0.5 m; not a calibrated accuracy measurement",
                       target_path=target, actual_path=actual)

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
    try:
        app.run(host=args.host, port=args.port, debug=False, threaded=True)
    finally:
        runtime.close()

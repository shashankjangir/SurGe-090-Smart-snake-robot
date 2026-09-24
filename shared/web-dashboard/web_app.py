import time
import math
import threading
import psutil
import os
from flask import Flask, request, jsonify, render_template

from src.snake_locomotion import SnakeKinematics
from src.path_engine import PathEngine
from src.simulation_interface import SimulationInterface
from src.st3215_interface import ST3215Interface

app = Flask(__name__)

# Global State
state = {
    'is_running': False,
    'engine': 'SIM',  # SIM, ST3215
    'status': 'Disconnected',
    'target_path': [],
    'actual_path': [],
    'telemetry': {},
    'robot_pose': {'x': 0.0, 'y': 0.0, 'yaw': 0.0},
    'segments': [],
    'params': {'fric': 20.0, 'amp': 0.8, 'freq': 2.0, 'phase': 1.0, 'force': 5.0}
}

active_iface = None
kinematics = SnakeKinematics()
path_engine = PathEngine()
start_time = 0

def update_loop():
    global state, active_iface, start_time
    last_time = time.time()
    while True:
        if state['is_running'] and active_iface:
            try:
                curr_real = time.time()
                dt = curr_real - last_time
                last_time = curr_real
                
                speed = state['params'].get('speed', 1.0)
                state['sim_time'] = state.get('sim_time', 0.0) + (dt * speed)
                curr_time = state['sim_time']
                
                # Update Pose
                if state['engine'] == "SIM":
                    rx, ry, ryaw = active_iface.get_robot_pose()
                    state['robot_pose'] = {'x': rx, 'y': ry, 'yaw': ryaw}
                    state['segments'] = active_iface.get_all_segment_positions()
                else:
                    rx, ry, ryaw = state['robot_pose']['x'], state['robot_pose']['y'], state['robot_pose']['yaw']
                    state['segments'] = []
                    
                # Store actual path for plotting
                if len(state['actual_path']) == 0 or math.hypot(state['actual_path'][-1][0] - rx, state['actual_path'][-1][1] - ry) > 0.05:
                    state['actual_path'].append([rx, ry])
                
                # Check for Auto-Stop
                if len(state['target_path']) > 1:
                    end_x, end_y = state['target_path'][-1]
                    dist_to_end = math.hypot(rx - end_x, ry - end_y)
                    if dist_to_end < 0.4:
                        print("Reached Target Path End. Auto-Stopping...")
                        state['is_running'] = False
                        if active_iface:
                            active_iface.disconnect()
                        state['status'] = 'Path Complete'
                        continue
                
                # Calculate Kinematics
                turn_offset = path_engine.calculate_pure_pursuit(rx, ry, ryaw, state['target_path'])
                positions, angles = kinematics.calculate_positions(curr_time, turn_offset)
                
                # Send to Hardware/Sim
                if state['engine'] == "SIM":
                    active_iface.update_physics(state['params']['fric'], 0, 1.5, [rx, ry, 0])
                    active_iface.write_positions(angles, max_force=state['params']['force'])
                else:
                    active_iface.write_positions(positions)
                    
                # Read Telemetry
                telemetry_data = active_iface.read_telemetry()
                state['telemetry'] = telemetry_data
                
            except Exception as e:
                print(f"Engine connection lost: {e}")
                state['is_running'] = False
                state['status'] = f"Error: {e}"
                if active_iface:
                    active_iface.is_connected = False
                    
        else:
            last_time = time.time()
            
        sleep_time = max(0.005, 0.05 / state['params'].get('speed', 1.0)) if state.get('is_running') else 0.05
        time.sleep(sleep_time)

# Start background thread
thread = threading.Thread(target=update_loop, daemon=True)
thread.start()


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/3d')
def viewer_3d():
    return render_template('3d_viewer.html')

@app.route('/api/3d_status', methods=['GET'])
def get_3d_status():
    if active_iface and state['engine'] == 'SIM':
        return jsonify({
            'segments': active_iface.get_3d_state(),
            'target_path': state['target_path'],
            'actual_path': state['actual_path']
        })
    return jsonify({'segments': [], 'target_path': [], 'actual_path': []})

@app.route('/api/connect', methods=['POST'])
def connect_engine():
    global state, active_iface, start_time
    data = request.json
    engine_type = data.get('engine', 'ST3215')
    
    if state['is_running']:
        # Disconnect
        state['is_running'] = False
        if active_iface:
            active_iface.disconnect()
        state['status'] = 'Disconnected'
        return jsonify({'success': True, 'status': state['status']})
    
    # Connect
    state['engine'] = engine_type
    if engine_type == 'SIM':
        active_iface = SimulationInterface()
    elif engine_type == 'ST3215':
        import serial.tools.list_ports
        import platform
        default_port = 'COM12' if platform.system() == 'Windows' else '/dev/ttyUSB0'
        for p in serial.tools.list_ports.comports():
            if 'AMA' not in p.device and 'Bluetooth' not in p.description:
                default_port = p.device
                break
        active_iface = ST3215Interface(port=default_port)
        
    state['status'] = 'Connecting...'
    if engine_type == 'SIM':
        headless_flag = data.get('headless', True)
        success, msg = active_iface.connect(headless=headless_flag)
    else:
        success, msg = active_iface.connect()
    
    if success:
        state['is_running'] = True
        state['sim_time'] = 0.0
        start_time = time.time()
        state['actual_path'] = []
        state['status'] = f"Connected to {engine_type}"
    else:
        state['status'] = f"Failed: {msg}"
        
    return jsonify({'success': success, 'status': state['status']})

@app.route('/api/params', methods=['POST'])
def set_params():
    global state, kinematics
    data = request.json
    for k in ['fric', 'amp', 'freq', 'phase', 'force', 'speed']:
        if k in data:
            state['params'][k] = float(data[k])
    
    kinematics.amplitude = state['params']['amp']
    kinematics.frequency = state['params']['freq']
    kinematics.phase_shift = state['params']['phase']
    return jsonify({'success': True})

@app.route('/api/set_path', methods=['POST'])
def set_path():
    global state
    data = request.json
    state['target_path'] = data.get('path', [])
    state['actual_path'] = []
    
    # Sync with sim if running
    if state['engine'] == 'SIM' and active_iface and state['is_running']:
        active_iface.draw_target_path(state['target_path'])
        
    return jsonify({'success': True})

@app.route('/api/status', methods=['GET'])
def get_status():
    global state
    return jsonify({
        'is_running': state['is_running'],
        'status': state['status'],
        'engine': state['engine'],
        'robot_pose': state['robot_pose'],
        'telemetry': state['telemetry'],
        'segments': state['segments'],
        'actual_path': state['actual_path'][-50:] 
    })

@app.route('/api/system_stats', methods=['GET'])
def get_system_stats():
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent
    
    temp = 0.0
    try:
        if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = float(f.read().strip()) / 1000.0
        else:
            temp = "N/A"
    except Exception:
        temp = "Error"
        
    return jsonify({
        'cpu': cpu,
        'ram': ram,
        'temp': temp
    })

@app.route('/api/report', methods=['GET'])
def get_report():
    target = state['target_path']
    actual = state['actual_path']
    
    if len(target) < 2 or len(actual) < 2:
        return jsonify({'error': 'Not enough data'})
        
    total_error = 0.0
    for ax, ay in actual:
        min_dist = float('inf')
        for tx, ty in target:
            dist = math.hypot(ax - tx, ay - ty)
            if dist < min_dist:
                min_dist = dist
        total_error += min_dist
        
    avg_error = total_error / len(actual)
    accuracy_percent = max(0.0, 100.0 * (1.0 - (avg_error / 0.5)))
    
    return jsonify({
        'avg_error': avg_error,
        'accuracy_percent': accuracy_percent,
        'target_path': target,
        'actual_path': actual
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

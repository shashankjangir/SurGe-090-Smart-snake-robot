import tkinter as tk
from tkinter import ttk, messagebox
import time
import math
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

from src.snake_locomotion import SnakeKinematics
from src.path_engine import PathEngine
from src.simulation_interface import SimulationInterface
from src.st3215_interface import ST3215Interface

class SnakeDashboard(tk.Tk):
    """Main GUI Application for controlling the Snake SURGE robot."""
    def __init__(self):
        super().__init__()
        self.title("Snake SURGE - Standard X/Y Path Controller")
        self.geometry("1100x900")
        
        self.kinematics = SnakeKinematics()
        self.path_engine = PathEngine()
        self.sim_iface = SimulationInterface()
        import serial.tools.list_ports
        import platform
        default_port = 'COM12' if platform.system() == 'Windows' else '/dev/ttyUSB0'
        for p in serial.tools.list_ports.comports():
            if 'AMA' not in p.device and 'Bluetooth' not in p.description:
                default_port = p.device
                break
        self.st3215_iface = ST3215Interface(port=default_port)
        
        self.active_iface = None
        self.target_path = []
        self.actual_path = []
        
        self.robot_x = 0.0
        self.robot_y = 0.0
        self.robot_yaw = 0.0
        
        self.pixels_per_meter = 50.0
        self.is_running = False
        self.start_time = 0
        
        self.max_motor_force = 5.0
        
        self.setup_ui()
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.update_loop()
        
    def setup_ui(self):
        """Initializes all Tkinter UI elements, frames, and canvas."""
        control_frame = ttk.LabelFrame(self, text="Connection Panel")
        control_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.mode_var = tk.StringVar(value="SIM")
        ttk.Radiobutton(control_frame, text="Simulation (PyBullet)", variable=self.mode_var, value="SIM").pack(side=tk.LEFT, padx=10, pady=5)
        ttk.Radiobutton(control_frame, text=f"Hardware (ST3215 via ESP32 auto-detect)", variable=self.mode_var, value="ST3215").pack(side=tk.LEFT, padx=10, pady=5)
        
        self.btn_connect = ttk.Button(control_frame, text="Connect Engine", command=self.toggle_connection)
        self.btn_connect.pack(side=tk.LEFT, padx=20)
        
        self.btn_clear = ttk.Button(control_frame, text="Clear Canvas Path", command=self.clear_path)
        self.btn_clear.pack(side=tk.LEFT, padx=10)
        
        self.status_var = tk.StringVar(value="Status: Disconnected")
        ttk.Label(control_frame, textvariable=self.status_var, font=('Arial', 10, 'bold')).pack(side=tk.RIGHT, padx=20)
        
        math_frame = ttk.LabelFrame(self, text="Mathematical Path Generator: y = f(x)")
        math_frame.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(math_frame, text="y =").pack(side=tk.LEFT, padx=5)
        self.entry_func = ttk.Entry(math_frame, width=30)
        self.entry_func.insert(0, "sin(x)")
        self.entry_func.pack(side=tk.LEFT, padx=5)
        
        ttk.Label(math_frame, text="From x=").pack(side=tk.LEFT, padx=5)
        self.entry_a = ttk.Entry(math_frame, width=5)
        self.entry_a.insert(0, "0")
        self.entry_a.pack(side=tk.LEFT, padx=5)
        
        ttk.Label(math_frame, text="To x=").pack(side=tk.LEFT, padx=5)
        self.entry_b = ttk.Entry(math_frame, width=5)
        self.entry_b.insert(0, "10")
        self.entry_b.pack(side=tk.LEFT, padx=5)
        
        self.btn_generate = ttk.Button(math_frame, text="Generate Path", command=self.generate_math_path)
        self.btn_generate.pack(side=tk.LEFT, padx=20)
        
        canvas_frame = ttk.LabelFrame(self, text="Path Engine (Center Origin, Standard X/Y Axes)")
        canvas_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        self.canvas = tk.Canvas(canvas_frame, bg="#eef2f5", height=500)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind("<B1-Motion>", self.draw_path)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_release)
        self.canvas.bind("<MouseWheel>", self.zoom_canvas)
        
        telemetry_frame = ttk.LabelFrame(self, text="Live Telemetry Dashboard (10 Actuators)")
        telemetry_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.labels = {}
        for i in range(1, 11):
            f = tk.Frame(telemetry_frame, relief=tk.RAISED, borderwidth=1, bg="white")
            f.pack(side=tk.LEFT, expand=True, fill=tk.BOTH, padx=2, pady=5)
            tk.Label(f, text=f"MOTOR {i}", font=('Arial', 9, 'bold'), bg="#333", fg="white").pack(fill=tk.X)
            self.labels[i] = {
                'pos': tk.Label(f, text="Angle: -", bg="white", font=('Consolas', 9)),
                'vel': tk.Label(f, text="Speed: -", bg="white", font=('Consolas', 9)),
                'load': tk.Label(f, text="Torque: -", bg="white", font=('Consolas', 9))
            }
            self.labels[i]['pos'].pack(anchor="w", padx=5)
            self.labels[i]['vel'].pack(anchor="w", padx=5)
            self.labels[i]['load'].pack(anchor="w", padx=5)
            
    def zoom_canvas(self, event):
        """Zooms the Tkinter canvas in or out based on mouse wheel input."""
        if event.delta > 0:
            self.pixels_per_meter *= 1.2
        else:
            self.pixels_per_meter /= 1.2
        self.pixels_per_meter = max(5.0, min(self.pixels_per_meter, 200.0))

    def generate_math_path(self):
        """Evaluates math functions safely and stores it as the target path."""
        func_str = self.entry_func.get()
        try:
            a = float(self.entry_a.get())
            b = float(self.entry_b.get())
            safe_dict = {'sin': math.sin, 'cos': math.cos, 'tan': math.tan, 'exp': math.exp, 'sqrt': math.sqrt, 'pi': math.pi, 'e': math.e, 'abs': abs}
            self.target_path = []
            x = a
            while x <= b:
                safe_dict['x'] = x
                y = eval(func_str, {"__builtins__": None}, safe_dict)
                self.target_path.append((x, y))
                x += 0.1
                
            if self.mode_var.get() == "SIM" and self.active_iface:
                self.active_iface.draw_target_path(self.target_path)
        except Exception as e:
            messagebox.showerror("Math Error", f"Invalid function or range!\n{e}")

    def clear_path(self):
        """Clears both target and actual paths from the canvas."""
        self.target_path = []
        self.actual_path = []
        if self.mode_var.get() == "SIM" and self.active_iface:
            self.active_iface.draw_target_path(self.target_path)
        
    def draw_path(self, event):
        """Appends mouse coordinates to the target path array."""
        x = event.x
        y = event.y
        world_x = (x - 550) / self.pixels_per_meter  
        world_y = (250 - y) / self.pixels_per_meter  
        self.target_path.append((world_x, world_y))

    def on_mouse_release(self, event):
        """Broadcasts the newly drawn path to the PyBullet interface."""
        if self.mode_var.get() == "SIM" and self.active_iface:
            self.active_iface.draw_target_path(self.target_path)

    def toggle_connection(self):
        """Toggles the hardware or simulation engine connection."""
        if self.is_running:
            self.is_running = False
            try:
                if self.active_iface: self.active_iface.disconnect()
            except Exception:
                pass
            self.btn_connect.config(text="Connect Engine")
            self.status_var.set("Status: Disconnected")
            self.compute_and_plot_accuracy()
            return
            
        if self.mode_var.get() == "SIM":
            self.active_iface = self.sim_iface
        elif self.mode_var.get() == "ST3215":
            self.active_iface = self.st3215_iface
            
        self.status_var.set("Status: Connecting...")
        self.update_idletasks()
        
        success, msg = self.active_iface.connect()
        self.status_var.set(f"Status: {msg}")
        
        if success:
            self.is_running = True
            self.start_time = time.time()
            self.actual_path = []
            self.btn_connect.config(text="Disconnect Engine")
            
    def compute_and_plot_accuracy(self):
        """Computes path accuracy and displays an embedded graph in a GUI popup."""
        if len(self.target_path) < 2 or len(self.actual_path) < 2:
            return
        
        total_error = 0.0
        for ax, ay in self.actual_path:
            min_dist = float('inf')
            for tx, ty in self.target_path:
                dist = math.hypot(ax - tx, ay - ty)
                if dist < min_dist:
                    min_dist = dist
            total_error += min_dist
            
        avg_error = total_error / len(self.actual_path)
        
        # Calculate a normalized Accuracy Percentage (assuming 0.5m average error = 0% accuracy)
        accuracy_percent = max(0.0, 100.0 * (1.0 - (avg_error / 0.5)))
        
        report_win = tk.Toplevel(self)
        report_win.title("Path Tracking Accuracy Report")
        report_win.geometry("800x650")
        
        ttk.Label(report_win, text=f"Path Tracking Accuracy: {accuracy_percent:.1f}%", font=('Arial', 18, 'bold'), foreground="green" if accuracy_percent > 80 else "red").pack(pady=(15, 0))
        ttk.Label(report_win, text=f"Average Deviation: {avg_error:.4f} meters", font=('Arial', 12)).pack(pady=(5, 10))
        
        fig, ax = plt.subplots(figsize=(7, 5))
        tx_vals = [p[0] for p in self.target_path]
        ty_vals = [p[1] for p in self.target_path]
        ax_vals = [p[0] for p in self.actual_path]
        ay_vals = [p[1] for p in self.actual_path]
        
        ax.plot(tx_vals, ty_vals, 'b-', label='Target Path', linewidth=2)
        ax.plot(ax_vals, ay_vals, 'm-', label='Actual Path', linewidth=2)
        ax.set_title("Target vs Actual Path Tracking")
        ax.set_xlabel("World X (meters)")
        ax.set_ylabel("World Y (meters)")
        ax.legend()
        ax.grid(True)
        ax.axis('equal')
        
        canvas = FigureCanvasTkAgg(fig, master=report_win)
        canvas.draw()
        canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

    def on_close(self):
        """Handles application shutdown."""
        self.is_running = False
        try:
            if self.active_iface:
                self.active_iface.disconnect()
        except Exception:
            pass
        self.destroy()

    def render_canvas(self, turn_offset):
        """Draws the dynamic 2D representation of the physical snake onto the Tkinter canvas."""
        self.canvas.delete("all")
        ppm = self.pixels_per_meter
        
        min_x_m, max_x_m = int(-550 / ppm) - 1, int(550 / ppm) + 1
        min_y_m, max_y_m = int(-250 / ppm) - 1, int(250 / ppm) + 1
        
        for i in range(min_y_m, max_y_m):
            screen_y = 250 - (i * ppm)
            self.canvas.create_line(0, screen_y, 1100, screen_y, fill="#e0e0e0")
            if i != 0: self.canvas.create_text(555, screen_y, text=f"{i}m", anchor="w", fill="#a0a0a0")
                
        for i in range(min_x_m, max_x_m):
            screen_x = 550 + (i * ppm)
            self.canvas.create_line(screen_x, 0, screen_x, 500, fill="#e0e0e0")
            if i != 0: self.canvas.create_text(screen_x, 255, text=f"{i}m", anchor="n", fill="#a0a0a0")
        
        self.canvas.create_line(550, 0, 550, 500, fill="#888", dash=(4, 4), width=2)
        self.canvas.create_line(0, 250, 1100, 250, fill="#888", dash=(4, 4), width=2)
        
        if len(self.target_path) > 1:
            for i in range(len(self.target_path)-1):
                wx1, wy1 = self.target_path[i]
                wx2, wy2 = self.target_path[i+1]
                self.canvas.create_line(550+(wx1*ppm), 250-(wy1*ppm), 550+(wx2*ppm), 250-(wy2*ppm), fill="#4287f5", width=4)
                
        if len(self.actual_path) > 1:
            for i in range(len(self.actual_path)-1):
                wx1, wy1 = self.actual_path[i]
                wx2, wy2 = self.actual_path[i+1]
                self.canvas.create_line(550+(wx1*ppm), 250-(wy1*ppm), 550+(wx2*ppm), 250-(wy2*ppm), fill="#800080", width=3)
                
        if self.mode_var.get() == "SIM" and self.is_running:
            segments = self.sim_iface.get_all_segment_positions()
            for i in range(len(segments)-1):
                wx1, wy1 = segments[i]
                wx2, wy2 = segments[i+1]
                self.canvas.create_line(550+(wx1*ppm), 250-(wy1*ppm), 550+(wx2*ppm), 250-(wy2*ppm), fill="#cc0000", width=8, capstyle=tk.ROUND)
            if len(segments) > 0:
                hx, hy = segments[0]
                self.canvas.create_oval(550+(hx*ppm)-6, 250-(hy*ppm)-6, 550+(hx*ppm)+6, 250-(hy*ppm)+6, fill="red", outline="black")
        else:
            self.canvas.create_oval(550+(self.robot_x*ppm)-8, 250-(self.robot_y*ppm)-8, 550+(self.robot_x*ppm)+8, 250-(self.robot_y*ppm)+8, fill="red")
            
        predicted_path = self.path_engine.predict_path(self.robot_x, self.robot_y, self.robot_yaw, speed=0.5, turn_offset=turn_offset)
        for (px, py) in predicted_path:
            self.canvas.create_oval(550+(px*ppm)-1, 250-(py*ppm)-1, 550+(px*ppm)+1, 250-(py*ppm)+1, fill="orange")

    def update_loop(self):
        """Main execution loop tracking physical updates, kinematics, paths, and UI redraws."""
        turn_offset = 0.0
        if self.is_running and self.active_iface:
            try:
                curr_time = time.time() - self.start_time
                
                if self.mode_var.get() == "SIM":
                    self.robot_x, self.robot_y, self.robot_yaw = self.sim_iface.get_robot_pose()
                    sliders = self.sim_iface.read_sliders()
                    if sliders:
                        self.kinematics.amplitude = sliders['amp']
                        self.kinematics.frequency = sliders['freq']
                        self.kinematics.phase_shift = sliders['phase']
                        self.max_motor_force = sliders['force']
                        self.sim_iface.update_physics(sliders['fric'], sliders['pov'], sliders['zoom'], [self.robot_x, self.robot_y, 0])
                
                self.actual_path.append((self.robot_x, self.robot_y))
                
                # Check for Auto-Stop
                if len(self.target_path) > 1:
                    end_x, end_y = self.target_path[-1]
                    dist_to_end = math.hypot(self.robot_x - end_x, self.robot_y - end_y)
                    if dist_to_end < 0.4:
                        print("Reached Target Path End. Auto-Stopping and Generating Report...")
                        self.toggle_connection()
                        return
                
                turn_offset = self.path_engine.calculate_pure_pursuit(self.robot_x, self.robot_y, self.robot_yaw, self.target_path)
                positions, angles = self.kinematics.calculate_positions(curr_time, turn_offset)
                
                if self.mode_var.get() == "SIM":
                    self.active_iface.write_positions(angles, self.max_motor_force)
                else:
                    self.active_iface.write_positions(positions)
                    
                telemetry = self.active_iface.read_telemetry()
                for dxl_id, data in telemetry.items():
                    if dxl_id in self.labels:
                        deg = (data['position'] - 2048) * (360.0 / 4096.0)
                        torque_nm = data['load'] * (0.22 / 1500.0)
                        self.labels[dxl_id]['pos'].config(text=f"Angle:  {deg:5.1f}°")
                        self.labels[dxl_id]['vel'].config(text=f"Speed:  {data['velocity']}")
                        self.labels[dxl_id]['load'].config(text=f"Torque: {torque_nm:5.3f} Nm")
            except Exception as e:
                print(f"Engine connection lost: {e}")
                self.is_running = False
                self.active_iface.is_connected = False
                self.btn_connect.config(text="Connect Engine")
                self.status_var.set("Status: Engine Closed")
                    
        self.render_canvas(turn_offset)
        self.after(50, self.update_loop)

def run_headless(use_sim=False):
    """Runs the snake in a headless mode (no GUI), tracking a straight line."""
    print("="*50)
    print(" Snake SURGE - Headless Mode (Straight Line)")
    print("="*50)
    
    if use_sim:
        iface = SimulationInterface()
        print("Starting Simulation Engine...")
        import serial.tools.list_ports
        import platform
        default_port = 'COM12' if platform.system() == 'Windows' else '/dev/ttyUSB0'
        for p in serial.tools.list_ports.comports():
            if 'AMA' not in p.device and 'Bluetooth' not in p.description:
                default_port = p.device
                break
        iface = ST3215Interface(port=default_port)
        print(f"Starting ST3215 Hardware Engine on {default_port}...")
        
    connected, msg = iface.connect()
    if not connected:
        print(f"FATAL ERROR: {msg}")
        return
        
    print("Engine Connected. Running... (Press Ctrl+C to Stop)")
    
    kinematics = SnakeKinematics()
    path_engine = PathEngine()
    target_path = [(x * 0.5, 0) for x in range(200)] # Straight line along X
    
    start_time = time.time()
    try:
        while True:
            curr_time = time.time() - start_time
            if use_sim:
                rx, ry, ryaw = iface.get_robot_pose()
                turn = path_engine.calculate_pure_pursuit(rx, ry, ryaw, target_path)
                pos, ang = kinematics.calculate_positions(curr_time, turn)
                iface.write_positions(ang)
            else:
                pos, ang = kinematics.calculate_positions(curr_time, 0.0)
                iface.write_positions(pos)
            time.sleep(0.02)
    except KeyboardInterrupt:
        print("\nEmergency Stop Triggered by User.")
    finally:
        iface.disconnect()
        print("Hardware Safely Shutdown.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Snake SURGE Unified Control")
    parser.add_argument('--gui', action='store_true', help="Launch the Tkinter Dashboard GUI")
    parser.add_argument('--sim', action='store_true', help="Use PyBullet simulation instead of Hardware in headless mode")
    args = parser.parse_args()

    if args.gui:
        app = SnakeDashboard()
        app.mainloop()
    else:
        run_headless(use_sim=args.sim)

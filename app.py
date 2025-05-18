from flask import Flask, render_template, request, jsonify
import numpy as np
import json
# นำเข้าคลาส core จากโปรแกรมเดิม
from simulation import BallPhysics, TargetArea, StrikerSettings, Simulation

app = Flask(__name__)

# สร้าง simulation object สำหรับใช้งาน
simulation = Simulation()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.json
    
    # รับค่าพารามิเตอร์จาก request
    release_height = float(data.get('release_height', 2.0))
    strike_angle = float(data.get('strike_angle', 45.0))
    strike_velocity = float(data.get('strike_velocity', 5.25))
    
    # ตั้งค่า simulation
    simulation.striker_settings.release_height = release_height
    simulation.striker_settings.strike_angle = strike_angle
    simulation.striker_settings.strike_velocity = strike_velocity
    
    # คำนวณผล
    success, message = simulation.start_simulation()
    
    if success:
        # ส่งข้อมูลผลลัพธ์กลับไป
        result = {
            'landing_distance': simulation.landing_distance,
            'trajectory_x': simulation.trajectory_x,
            'trajectory_y': simulation.trajectory_y,
            'target_zone': simulation.target_zone + 1 if simulation.target_zone >= 0 else None,
            'message': message
        }
        return jsonify(result)
    else:
        return jsonify({'error': message}), 400

@app.route('/api/optimize', methods=['POST'])
def optimize():
    data = request.json
    target_distance = float(data.get('target_distance'))
    
    # หาค่าที่เหมาะสม
    success, result = simulation.calculate_optimal_angle(target_distance)
    
    if success:
        angle, velocity = result
        
        # คำนวณช่วงความคลาดเคลื่อน ±5%
        angle_tolerance = angle * 0.05
        
        return jsonify({
            'angle': angle,
            'velocity': velocity,
            'angle_min': angle - angle_tolerance,
            'angle_max': angle + angle_tolerance
        })
    else:
        return jsonify({'error': result}), 400

if __name__ == '__main__':
    app.run(debug=True)
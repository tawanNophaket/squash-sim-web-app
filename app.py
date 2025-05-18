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
    strike_height = float(data.get('strike_height', 0.35))
    show_ideal = data.get('show_ideal', False)
    
    # ตั้งค่า simulation
    simulation.striker_settings.release_height = release_height
    simulation.striker_settings.strike_angle = strike_angle
    simulation.striker_settings.strike_velocity = strike_velocity
    simulation.striker_settings.strike_height = strike_height
    simulation.toggle_ideal_comparison(show_ideal)
    
    # ตั้งค่าพารามิเตอร์ฟิสิกส์ถ้ามี
    if 'physics' in data:
        physics = data['physics']
        simulation.ball_physics.gravity = float(physics.get('gravity', 9.81))
        simulation.ball_physics.ball_mass = float(physics.get('ball_mass', 0.024))
        simulation.air_density = float(physics.get('air_density', 1.225))
        simulation.drag_coefficient = float(physics.get('drag_coefficient', 0.5))
        simulation.ball_physics.elasticity = float(physics.get('elasticity', 0.4))
    
    # คำนวณผล
    success, message = simulation.start_simulation()
    
    if success:
        # ส่งข้อมูลผลลัพธ์กลับไป
        result = {
            'landing_distance': simulation.landing_distance,
            'trajectory_x': simulation.trajectory_x,
            'trajectory_y': simulation.trajectory_y,
            'target_zone': simulation.target_zone + 1 if simulation.target_zone >= 0 else None,
            'message': message,
            'strike_time': simulation.strike_time,
            'target_zones': [(min_dist, max_dist) for min_dist, max_dist in simulation.target_area.zones]
        }
        
        # ส่งข้อมูล ideal trajectory ถ้าต้องการ
        if show_ideal:
            result['ideal_trajectory_x'] = simulation.ideal_trajectory_x
            result['ideal_trajectory_y'] = simulation.ideal_trajectory_y
            result['ideal_landing_distance'] = simulation.ideal_landing_distance
            
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

@app.route('/api/field_info', methods=['GET'])
def field_info():
    """ส่งข้อมูลสนามปัจจุบัน"""
    field_dimensions = simulation.target_area.get_field_dimensions()
    zones = [(min_dist, max_dist) for min_dist, max_dist in simulation.target_area.zones]
    
    return jsonify({
        'dimensions': {
            'min_distance': simulation.target_area.min_distance,
            'max_distance': simulation.target_area.max_distance,
            'zone_width': simulation.target_area.zone_width,
            'field_type': simulation.target_area.field_type
        },
        'zones': zones,
        'available_field_types': ['standard', 'extra1', 'extra2']
    })

@app.route('/api/change_field', methods=['POST'])
def change_field():
    """เปลี่ยนรูปแบบสนาม"""
    data = request.json
    field_type = data.get('field_type', 'standard')
    
    # เปลี่ยนรูปแบบสนาม
    simulation.target_area.load_field_configuration(field_type)
    
    # ส่งข้อมูลสนามใหม่
    field_dimensions = simulation.target_area.get_field_dimensions()
    zones = [(min_dist, max_dist) for min_dist, max_dist in simulation.target_area.zones]
    
    return jsonify({
        'dimensions': field_dimensions,
        'zones': zones,
        'message': f'Changed field type to {field_type}'
    })

@app.route('/api/sensitivity_analysis', methods=['POST'])
def sensitivity_analysis():
    """ทำการวิเคราะห์ความไว (sensitivity analysis)"""
    data = request.json
    base_angle = float(data.get('base_angle', 45.0))
    variation = float(data.get('variation', 5.0))
    
    # ตั้งค่าอื่นๆ จาก request
    release_height = float(data.get('release_height', 2.0))
    strike_velocity = float(data.get('strike_velocity', 5.25))
    
    # ตั้งค่า simulation
    simulation.striker_settings.release_height = release_height
    simulation.striker_settings.strike_velocity = strike_velocity
    
    # สร้างชุดมุมและคำนวณระยะตก
    angles = np.linspace(base_angle - variation, base_angle + variation, 21).tolist()
    distances = []
    
    for angle in angles:
        simulation.striker_settings.strike_angle = angle
        simulation.start_simulation()
        distances.append(simulation.landing_distance)
    
    # คำนวณค่าต่างๆ สำหรับการวิเคราะห์
    base_distance = distances[len(angles) // 2]  # ระยะที่มุมกลาง
    
    # หาระยะที่ ±5% ของมุม
    idx_minus_5 = next((i for i, a in enumerate(angles) if a >= base_angle * 0.95), 0)
    idx_plus_5 = next((i for i, a in enumerate(angles) if a >= base_angle * 1.05), len(angles) - 1)
    
    distance_minus_5 = distances[idx_minus_5]
    distance_plus_5 = distances[idx_plus_5]
    
    # คำนวณความแตกต่างของระยะ
    distance_range = abs(distance_plus_5 - distance_minus_5)
    distance_percent = (distance_range / base_distance) * 100 if base_distance > 0 else 0
    
    sensitivity_results = {
        'angles': angles,
        'distances': distances,
        'base_distance': base_distance,
        'minus_5_percent': {
            'angle': base_angle * 0.95,
            'distance': distance_minus_5
        },
        'plus_5_percent': {
            'angle': base_angle * 1.05,
            'distance': distance_plus_5
        },
        'distance_range': distance_range,
        'distance_percent': distance_percent
    }
    
    return jsonify(sensitivity_results)

@app.route('/api/test_all_zones', methods=['POST'])
def test_all_zones():
    """ทดสอบการหาค่าที่เหมาะสมสำหรับทุกโซน"""
    data = request.json
    
    # ดึงค่าพารามิเตอร์จาก request
    release_height = float(data.get('release_height', 2.0))
    
    # ตั้งค่า simulation
    simulation.striker_settings.release_height = release_height
    
    # รับโซนทั้งหมด
    zones = simulation.target_area.zones
    
    # สร้าง array เก็บผลลัพธ์
    results = []
    
    # ทดสอบแต่ละโซน
    for i, (min_dist, max_dist) in enumerate(zones):
        # คำนวณระยะเป้าหมาย (จุดกึ่งกลางของโซน)
        target_distance = (min_dist + max_dist) / 2
        
        # หาค่าที่เหมาะสม
        success, result = simulation.calculate_optimal_angle(target_distance)
        
        if success:
            angle, velocity = result
            
            # ทดสอบผลลัพธ์
            simulation.striker_settings.strike_angle = angle
            simulation.striker_settings.strike_velocity = velocity
            simulation.start_simulation()
            
            actual_distance = simulation.landing_distance
            error = abs(actual_distance - target_distance)
            error_percent = (error / target_distance) * 100 if target_distance > 0 else 0
            within_tolerance = error_percent <= 5.0
            
            # เก็บผลลัพธ์
            results.append({
                'zone': i + 1,
                'range': [min_dist, max_dist],
                'target': target_distance,
                'angle': angle,
                'velocity': velocity,
                'actual_distance': actual_distance,
                'error': error,
                'error_percent': error_percent,
                'within_tolerance': within_tolerance
            })
        else:
            # ถ้าหาค่าที่เหมาะสมไม่สำเร็จ
            results.append({
                'zone': i + 1,
                'range': [min_dist, max_dist],
                'target': target_distance,
                'error': 'Optimization failed'
            })
    
    # คำนวณสรุปสถิติ
    successful_zones = sum(1 for r in results if isinstance(r.get('error'), (int, float)))
    total_error = sum(r.get('error', 0) for r in results if isinstance(r.get('error'), (int, float)))
    max_error = max((r.get('error', 0) for r in results if isinstance(r.get('error'), (int, float))), default=0)
    within_tolerance_count = sum(1 for r in results if r.get('within_tolerance', False))
    
    summary = {
        'successful_zones': successful_zones,
        'total_zones': len(zones),
        'avg_error': total_error / successful_zones if successful_zones > 0 else 0,
        'max_error': max_error,
        'within_tolerance_count': within_tolerance_count,
        'tolerance_percent': (within_tolerance_count / len(zones)) * 100 if len(zones) > 0 else 0
    }
    
    return jsonify({
        'results': results,
        'summary': summary
    })

if __name__ == '__main__':
    app.run(debug=True)
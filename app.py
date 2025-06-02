from flask import Flask, render_template, request, jsonify
import numpy as np
import json
import math

# นำเข้าคลาส core จากโปรแกรมเดิม
from simulation import BallPhysics, TargetArea, StrikerSettings, Simulation

app = Flask(__name__)

# สร้าง simulation object สำหรับใช้งาน
# ห่อด้วย try-except เพื่อดักจับ error ตอนสร้าง instance (เช่น AttributeError ที่เคยเจอ)
try:
    simulation = Simulation()
except Exception as e:
    print(f"CRITICAL ERROR during Simulation object instantiation: {e}")
    # ในกรณีนี้ โปรแกรมอาจจะไม่สามารถทำงานต่อได้เลย
    # อาจจะต้องมี fallback หรือแสดงข้อความให้ผู้ใช้ทราบอย่างชัดเจน
    simulation = None  # ตั้งเป็น None เพื่อให้ตรวจสอบได้ใน route


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/calculate", methods=["POST"])
def calculate():
    if simulation is None:
        return (
            jsonify(
                {"error": "เครื่องจำลองการทำงานเริ่มต้นไม่สำเร็จ กรุณาตรวจสอบบันทึกของเซิร์ฟเวอร์"}
            ),
            500,
        )
    try:
        data = request.json

        release_height = float(data.get("release_height", 2.0))
        strike_angle_elevation = float(data.get("strike_angle_elevation", 45.0))
        strike_azimuth_angle = float(data.get("strike_azimuth_angle", 0.0))
        strike_velocity = float(data.get("strike_velocity", 5.25))
        strike_height = float(data.get("strike_height", 0.35))
        show_ideal = data.get("show_ideal", False)

        simulation.striker_settings.release_height = release_height
        simulation.striker_settings.strike_angle_elevation = strike_angle_elevation
        simulation.striker_settings.strike_azimuth_angle = strike_azimuth_angle
        simulation.striker_settings.strike_velocity = strike_velocity
        simulation.striker_settings.strike_height = strike_height
        simulation.toggle_ideal_comparison(show_ideal)

        if "physics" in data:
            physics_data = data["physics"]
            simulation.ball_physics.gravity = float(physics_data.get("gravity", 9.81))
            simulation.ball_physics.ball_mass = float(
                physics_data.get("ball_mass", 0.024)
            )
            simulation.air_density = float(physics_data.get("air_density", 1.225))
            simulation.drag_coefficient = float(
                physics_data.get("drag_coefficient", 0.5)
            )
            simulation.ball_physics.elasticity = float(
                physics_data.get("elasticity", 0.4)
            )

        success, message_or_result = simulation.start_simulation()

        if success:
            # message_or_result คือ message string ที่ได้จาก start_simulation
            result = {
                "landing_position_x": simulation.landing_position[0],
                "landing_position_z": simulation.landing_position[1],
                "landing_distance_radial": simulation.landing_distance_radial,
                "trajectory_x": simulation.trajectory_x,
                "trajectory_y": simulation.trajectory_y,
                "trajectory_z": simulation.trajectory_z,
                "target_zone": (
                    simulation.target_zone + 1
                    if simulation.target_zone >= 0
                    and simulation.target_zone < len(simulation.target_area.zones)
                    else None
                ),
                "message": message_or_result,  # message จาก start_simulation
                "strike_time": simulation.strike_time,
                "target_zones_data": simulation.target_area.get_field_dimensions()[
                    "raw_zones_data"
                ],
            }
            if show_ideal and simulation.ideal_trajectory_x:
                result["ideal_trajectory_x"] = simulation.ideal_trajectory_x
                result["ideal_trajectory_y"] = simulation.ideal_trajectory_y
                result["ideal_trajectory_z"] = simulation.ideal_trajectory_z
                result["ideal_landing_position_x"] = simulation.ideal_landing_position[
                    0
                ]
                result["ideal_landing_position_z"] = simulation.ideal_landing_position[
                    1
                ]
            return jsonify(result)
        else:
            # message_or_result คือ error message string
            return jsonify({"error": message_or_result}), 400
    except Exception as e:
        app.logger.error(f"Error in /api/calculate: {e}", exc_info=True)
        return (
            jsonify({"error": f"เกิดข้อผิดพลาดที่ไม่คาดคิดใน API การคำนวณ: {str(e)}"}),
            500,
        )


@app.route("/api/optimize", methods=["POST"])
def optimize():
    if simulation is None:
        return (
            jsonify(
                {"error": "เครื่องจำลองการทำงานเริ่มต้นไม่สำเร็จ กรุณาตรวจสอบบันทึกของเซิร์ฟเวอร์"}
            ),
            500,
        )
    try:
        data = request.json
        target_x = float(data.get("target_x", 0.0))
        target_z = float(data.get("target_z", 1.7))
        release_height = float(data.get("release_height", 2.0))
        strike_height = float(data.get("strike_height", 0.35))
        current_elevation_angle = float(data.get("current_elevation_angle", 45.0))
        current_azimuth_angle = float(data.get("current_azimuth_angle", 0.0))
        current_velocity = float(data.get("current_velocity", 5.25))

        fixed_params_input = data.get("fixed_params", {})  # Default to empty dict
        fixed_params = {}
        if fixed_params_input.get("elevation_angle"):
            fixed_params["elevation_angle"] = current_elevation_angle
        if fixed_params_input.get("azimuth_angle"):
            fixed_params["azimuth_angle"] = current_azimuth_angle
        if fixed_params_input.get("velocity"):
            fixed_params["velocity"] = current_velocity

        simulation.striker_settings.release_height = release_height
        simulation.striker_settings.strike_height = strike_height
        simulation.striker_settings.strike_angle_elevation = current_elevation_angle
        simulation.striker_settings.strike_azimuth_angle = current_azimuth_angle
        simulation.striker_settings.strike_velocity = current_velocity

        if "physics" in data:
            physics_data = data["physics"]
            simulation.ball_physics.gravity = float(physics_data.get("gravity", 9.81))
            simulation.ball_physics.ball_mass = float(
                physics_data.get("ball_mass", 0.024)
            )
            simulation.air_density = float(physics_data.get("air_density", 1.225))
            simulation.drag_coefficient = float(
                physics_data.get("drag_coefficient", 0.5)
            )
            simulation.ball_physics.elasticity = float(
                physics_data.get("elasticity", 0.4)
            )

        if not hasattr(simulation, "calculate_optimal_parameters"):
            return (
                jsonify(
                    {
                        "error": "ไม่พบฟังก์ชันการปรับให้เหมาะสม (calculate_optimal_parameters) ในแกนกลางของระบบจำลอง"
                    }
                ),
                501,
            )

        success, opt_result_data = simulation.calculate_optimal_parameters(
            target_x, target_z, fixed_params=fixed_params
        )

        if success:
            el_angle = opt_result_data["elevation_angle"]
            az_angle = opt_result_data["azimuth_angle"]
            vel = opt_result_data["velocity"]
            required_voltage = opt_result_data.get("required_voltage", None)

            el_angle_tolerance = el_angle * 0.05
            az_angle_tolerance = abs(
                az_angle * 0.05
            )  # abs for cases where angle is negative
            vel_tolerance = vel * 0.05

            error_distance = opt_result_data["error"]
            target_radial_dist = math.sqrt(target_x**2 + target_z**2)
            error_percent = (
                (error_distance / target_radial_dist) * 100
                if target_radial_dist > 1e-6
                else 0
            )

            return jsonify(
                {
                    "strike_angle_elevation": el_angle,
                    "strike_azimuth_angle": az_angle,
                    "strike_velocity": vel,
                    "required_voltage": required_voltage,
                    "strike_angle_elevation_range": [
                        (
                            el_angle - el_angle_tolerance
                            if "elevation_angle" not in fixed_params
                            else el_angle
                        ),
                        (
                            el_angle + el_angle_tolerance
                            if "elevation_angle" not in fixed_params
                            else el_angle
                        ),
                    ],
                    "strike_azimuth_angle_range": [
                        (
                            az_angle - az_angle_tolerance
                            if "azimuth_angle" not in fixed_params
                            else az_angle
                        ),
                        (
                            az_angle + az_angle_tolerance
                            if "azimuth_angle" not in fixed_params
                            else az_angle
                        ),
                    ],
                    "strike_velocity_range": [
                        (vel - vel_tolerance if "velocity" not in fixed_params else vel),
                        (vel + vel_tolerance if "velocity" not in fixed_params else vel),
                    ],
                    "actual_landing_x": opt_result_data["landing_x"],
                    "actual_landing_z": opt_result_data["landing_z"],
                    "target_x": target_x,
                    "target_z": target_z,
                    "error_distance": error_distance,
                    "error_percent": error_percent,
                    "message": "พบค่าพารามิเตอร์ที่เหมาะสมที่สุดแล้ว",
                }
            )
        else:
            # opt_result_data is an error message string
            return jsonify({"error": opt_result_data}), 400
    except Exception as e:
        app.logger.error(f"Error in /api/optimize: {e}", exc_info=True)
        return (
            jsonify({"error": f"เกิดข้อผิดพลาดที่ไม่คาดคิดใน API การปรับให้เหมาะสม: {str(e)}"}),
            500,
        )


@app.route("/api/field_info", methods=["GET"])
def field_info():
    if simulation is None:
        return (
            jsonify(
                {"error": "เครื่องจำลองการทำงานเริ่มต้นไม่สำเร็จ กรุณาตรวจสอบบันทึกของเซิร์ฟเวอร์"}
            ),
            500,
        )
    try:
        field_data = simulation.target_area.get_field_dimensions()

        # Prepare dimensions part of the response
        response_dimensions = {
            "min_radial_distance": field_data.get("min_distance_overall"),
            "max_radial_distance": field_data.get("max_distance_overall"),
            "zone_width_radial": field_data.get("zone_width_radial"),
            "field_type": field_data.get("field_type"),
            "azimuth_angle_min": simulation.striker_settings.azimuth_angle_min,
            "azimuth_angle_max": simulation.striker_settings.azimuth_angle_max,
            "elevation_angle_min": simulation.striker_settings.angle_elevation_min,
            "elevation_angle_max": simulation.striker_settings.angle_elevation_max,
            "velocity_min": simulation.striker_settings.velocity_min,
            "velocity_max": simulation.striker_settings.velocity_max,
        }
        return jsonify(
            {
                "dimensions": response_dimensions,
                "zones_data": field_data.get("raw_zones_data"),
                "available_field_types": ["standard", "extra1", "extra2", "real1", "extramap1", "extramap2"],
            }
        )
    except Exception as e:
        app.logger.error(f"Error in /api/field_info: {e}", exc_info=True)
        return (
            jsonify({"error": f"เกิดข้อผิดพลาดที่ไม่คาดคิดใน API ข้อมูลสนาม: {str(e)}"}),
            500,
        )


@app.route("/api/change_field", methods=["POST"])
def change_field():
    if simulation is None:
        return (
            jsonify(
                {"error": "เครื่องจำลองการทำงานเริ่มต้นไม่สำเร็จ กรุณาตรวจสอบบันทึกของเซิร์ฟเวอร์"}
            ),
            500,
        )
    try:
        data = request.json
        field_type = data.get("field_type", "standard")
        simulation.target_area.load_field_configuration(field_type)

        new_field_data = simulation.target_area.get_field_dimensions()
        response_dimensions = {
            "min_radial_distance": new_field_data.get("min_distance_overall"),
            "max_radial_distance": new_field_data.get("max_distance_overall"),
            "zone_width_radial": new_field_data.get("zone_width_radial"),
            "field_type": new_field_data.get("field_type"),
            "azimuth_angle_min": simulation.striker_settings.azimuth_angle_min,
            "azimuth_angle_max": simulation.striker_settings.azimuth_angle_max,
            "elevation_angle_min": simulation.striker_settings.angle_elevation_min,
            "elevation_angle_max": simulation.striker_settings.angle_elevation_max,
            "velocity_min": simulation.striker_settings.velocity_min,
            "velocity_max": simulation.striker_settings.velocity_max,
        }
        return jsonify(
            {
                "dimensions": response_dimensions,
                "zones_data": new_field_data.get("raw_zones_data"),
                "message": f"เปลี่ยนประเภทสนามเป็น {field_type} แล้ว",
            }
        )
    except Exception as e:
        app.logger.error(f"Error in /api/change_field: {e}", exc_info=True)
        return (
            jsonify({"error": f"เกิดข้อผิดพลาดที่ไม่คาดคิดใน API การเปลี่ยนสนาม: {str(e)}"}),
            500,
        )


# Sensitivity analysis might need more robust error handling too if kept
@app.route("/api/sensitivity_analysis", methods=["POST"])
def sensitivity_analysis():
    if simulation is None:
        return (
            jsonify(
                {"error": "เครื่องจำลองการทำงานเริ่มต้นไม่สำเร็จ กรุณาตรวจสอบบันทึกของเซิร์ฟเวอร์"}
            ),
            500,
        )
    try:
        data = request.json
        base_elevation_angle = float(data.get("base_elevation_angle", 45.0))
        base_azimuth_angle = float(data.get("base_azimuth_angle", 0.0))
        variation_elevation = float(data.get("variation_elevation", 5.0))

        release_height = float(data.get("release_height", 2.0))
        strike_velocity = float(data.get("strike_velocity", 5.25))
        strike_height = float(data.get("strike_height", 0.35))

        # Directly use current simulation's physics settings for consistency
        # simulation.striker_settings.release_height = release_height (No, use current sim settings)
        # simulation.striker_settings.strike_velocity = strike_velocity
        # simulation.striker_settings.strike_height = strike_height
        # simulation.striker_settings.strike_azimuth_angle = base_azimuth_angle

        elevation_angles = np.linspace(
            base_elevation_angle - variation_elevation,
            base_elevation_angle + variation_elevation,
            21,
        ).tolist()
        landing_positions_x = []
        landing_positions_z = []
        radial_distances = []

        # Store original settings to restore later
        original_el = simulation.striker_settings.strike_angle_elevation
        original_az = simulation.striker_settings.strike_azimuth_angle

        simulation.striker_settings.strike_azimuth_angle = (
            base_azimuth_angle  # Fix azimuth for this analysis
        )

        for el_angle in elevation_angles:
            # Use get_landing_position with current simulation's striker settings (release_h, strike_h, velocity)
            # but vary the elevation angle for the analysis.
            lx, lz = simulation.ball_physics.get_landing_position(
                simulation.striker_settings.release_height,  # Use current sim setting
                simulation.striker_settings.strike_velocity,  # Use current sim setting
                el_angle,  # Vary this
                base_azimuth_angle,  # Fixed for analysis
                simulation.striker_settings.strike_height,  # Use current sim setting
            )
            landing_positions_x.append(lx)
            landing_positions_z.append(lz)
            radial_distances.append(
                math.sqrt(lx**2 + lz**2) if lx is not None and lz is not None else None
            )

        # Restore original settings
        simulation.striker_settings.strike_angle_elevation = original_el
        simulation.striker_settings.strike_azimuth_angle = original_az

        base_radial_distance = None
        if (
            len(radial_distances) > len(elevation_angles) // 2
            and radial_distances[len(elevation_angles) // 2] is not None
        ):
            base_radial_distance = radial_distances[len(elevation_angles) // 2]

        sensitivity_results = {
            "elevation_angles": elevation_angles,
            "landing_positions_x": landing_positions_x,
            "landing_positions_z": landing_positions_z,
            "radial_distances": radial_distances,
            "base_radial_distance": base_radial_distance,
        }
        return jsonify(sensitivity_results)
    except Exception as e:
        app.logger.error(f"Error in /api/sensitivity_analysis: {e}", exc_info=True)
        return (
            jsonify({"error": f"เกิดข้อผิดพลาดที่ไม่คาดคิดใน API การวิเคราะห์ความไว: {str(e)}"}),
            500,
        )


if __name__ == "__main__":
    # Basic logging setup for Flask development server
    import logging

    logging.basicConfig(level=logging.INFO)  # Show info level logs
    # For more detailed debug logs from Flask itself if needed:
    # app.logger.setLevel(logging.DEBUG)

    if simulation is None:
        print("ไม่สามารถเริ่มแอปพลิเคชัน Flask ได้เนื่องจากไม่สามารถเริ่มต้นอ็อบเจ็กต์ Simulation")
    else:
        app.run(host="0.0.0.0", port=5000, debug=True)

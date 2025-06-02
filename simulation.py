import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import json
import os
import math
import datetime  # เพิ่มสำหรับการบันทึกวันที่ในรายงาน


class BallPhysics:
    """Class to handle the physics calculations of the ball's trajectory"""

    def __init__(self, gravity=9.81, ball_mass=0.024, elasticity=0.4):
        self.gravity = gravity
        self.ball_mass = ball_mass
        self.elasticity = elasticity
        self.time_step = 0.01
        self.ideal_mode = False
        self.air_density = 1.225
        self.drag_coefficient = 0.5
        self.cross_sectional_area = math.pi * (0.04**2)

    def calculate_trajectory(
        self,
        release_height,
        strike_velocity,
        strike_angle_elevation,
        strike_azimuth_angle,
        strike_height=0.35,
        time_limit=5.0,
    ):
        angle_rad_elevation = math.radians(strike_angle_elevation)
        angle_rad_azimuth = math.radians(strike_azimuth_angle)

        v0x = (
            strike_velocity
            * math.cos(angle_rad_elevation)
            * math.sin(angle_rad_azimuth)
        )
        v0y = strike_velocity * math.sin(angle_rad_elevation)
        v0z = (
            strike_velocity
            * math.cos(angle_rad_elevation)
            * math.cos(angle_rad_azimuth)
        )

        x0, y0, z0 = 0.0, strike_height, 0.0
        x_positions, y_positions, z_positions, times = [x0], [y0], [z0], [0.0]
        x, y, z = x0, y0, z0
        vx, vy, vz = v0x, v0y, v0z
        t = 0.0

        while t < time_limit and y >= 0:
            t += self.time_step
            ax_drag, ay_drag, az_drag = 0, 0, 0
            if not self.ideal_mode:
                speed_sq = vx**2 + vy**2 + vz**2
                if speed_sq > 1e-9:
                    speed = math.sqrt(speed_sq)
                    drag_force_magnitude = (
                        0.5
                        * self.air_density
                        * speed_sq
                        * self.drag_coefficient
                        * self.cross_sectional_area
                    )
                    ax_drag = -drag_force_magnitude * (vx / speed) / self.ball_mass
                    ay_drag = -drag_force_magnitude * (vy / speed) / self.ball_mass
                    az_drag = -drag_force_magnitude * (vz / speed) / self.ball_mass

            vx += ax_drag * self.time_step
            vy += (ay_drag - self.gravity) * self.time_step
            vz += az_drag * self.time_step

            prev_x, prev_y, prev_z = x, y, z
            x += vx * self.time_step
            y += vy * self.time_step
            z += vz * self.time_step

            x_positions.append(x)
            y_positions.append(y)
            z_positions.append(z)
            times.append(t)

            if y < 0 and prev_y >= 0:
                fraction = prev_y / (prev_y - y) if (prev_y - y) != 0 else 0
                interp_x = prev_x - fraction * (prev_x - x)
                interp_z = prev_z - fraction * (prev_z - z)

                x_positions[-1] = interp_x
                y_positions[-1] = 0.0
                z_positions[-1] = interp_z
                break

        if y_positions and y_positions[-1] < 0:
            y_positions[-1] = 0.0
        return x_positions, y_positions, z_positions, times

    def calculate_trajectory_ideal(
        self,
        release_height,
        strike_velocity,
        strike_angle_elevation,
        strike_azimuth_angle,
        strike_height=0.35,
        time_limit=5.0,
    ):
        old_mode = self.ideal_mode
        self.ideal_mode = True
        result = self.calculate_trajectory(
            release_height,
            strike_velocity,
            strike_angle_elevation,
            strike_azimuth_angle,
            strike_height,
            time_limit,
        )
        self.ideal_mode = old_mode
        return result

    def simulate_free_fall(self, release_height, strike_height_target, time_limit=5.0):
        y0 = release_height
        vy_fall = 0.0
        y_positions_fall = [y0]
        times_fall = [0.0]
        y_current = y0
        t_current = 0.0

        while t_current < time_limit and y_current > strike_height_target:
            t_current += self.time_step
            vy_fall -= self.gravity * self.time_step
            y_next = y_current + vy_fall * self.time_step

            if y_next < strike_height_target and vy_fall != 0:
                t_to_target = (strike_height_target - y_current) / vy_fall
                t_current += t_to_target
                y_current = strike_height_target
                y_positions_fall.append(y_current)
                times_fall.append(t_current)
                break

            y_current = y_next
            if y_current < 0:
                y_current = 0

            y_positions_fall.append(y_current)
            times_fall.append(t_current)
            if y_current == strike_height_target or y_current == 0:
                break

        if (
            y_positions_fall[-1] != strike_height_target
            and y_current == strike_height_target
        ):
            pass
        elif (
            y_current > strike_height_target
            and y_positions_fall[-1] > strike_height_target
            and vy_fall != 0
        ):
            t_to_target = (strike_height_target - y_positions_fall[-1]) / vy_fall
            if t_to_target > 0 and t_to_target < self.time_step * 2:
                corrected_time = times_fall[-1] + t_to_target
                if corrected_time > times_fall[-1]:
                    times_fall.append(corrected_time)
                    y_positions_fall.append(strike_height_target)
                    t_current = times_fall[-1]
        return y_positions_fall, times_fall, t_current

    def get_landing_position(
        self,
        release_height,
        strike_velocity,
        strike_angle_elevation,
        strike_azimuth_angle,
        strike_height=None,
    ):
        if strike_height is None:
            strike_height = 0.35
        x_pos, _, z_pos, _ = self.calculate_trajectory(
            release_height,
            strike_velocity,
            strike_angle_elevation,
            strike_azimuth_angle,
            strike_height,
        )
        return (x_pos[-1], z_pos[-1]) if x_pos and z_pos else (0.0, 0.0)

    def get_landing_position_ideal(
        self,
        release_height,
        strike_velocity,
        strike_angle_elevation,
        strike_azimuth_angle,
        strike_height=None,
    ):
        old_mode = self.ideal_mode
        self.ideal_mode = True
        res_x, res_z = self.get_landing_position(
            release_height,
            strike_velocity,
            strike_angle_elevation,
            strike_azimuth_angle,
            strike_height,
        )
        self.ideal_mode = old_mode
        return res_x, res_z


class TargetArea:
    def __init__(self):
        self.min_distance = 0.75
        self.max_distance = 2.65
        self.zone_width = 0.38
        self.field_type = "standard"
        self.custom_zones = []
        self.colors = [
            "#FF6347",
            "#FFD700",
            "#ADFF2F",
            "#87CEEB",
            "#9370DB",  # Tomato, Gold, GreenYellow, SkyBlue, MediumPurple
            "#FFA07A",
            "#FF8C00",
            "#32CD32",
            "#00CED1",
            "#BA55D3",  # LightSalmon, DarkOrange, LimeGreen, DarkTurquoise, MediumOrchid
            "#F08080",
            "#FF69B4",
            "#7FFF00",
            "#40E0D0",
            "#8A2BE2",  # LightCoral, HotPink, Chartreuse, Turquoise, BlueViolet
        ]
        self.zones = self._calculate_zones()

    def _calculate_target_point_for_sector(self, r_min, r_max, az_min_deg, az_max_deg):
        mid_r = (r_min + r_max) / 2
        mid_az_deg = (az_min_deg + az_max_deg) / 2
        mid_az_rad = math.radians(mid_az_deg)
        target_x = mid_r * math.sin(mid_az_rad)
        target_z = mid_r * math.cos(mid_az_rad)
        return target_x, target_z

    def _calculate_zones(self):
        zones = []
        if self.field_type == "extra2":
            # Defining cells for extra2 based on Rubric (Page 4, bottom left image)
            # Radii from image (mm): R1100, R1500, R1850, R2200, R2550
            # Colors from image (approx, inner to outer): Orange/Red-ish, Yellow, Green, Light Blue
            # Central Light Blue sector: 34 degrees wide (-17 to +17 deg)

            # Cell definitions: [id, r_min (m), r_max (m), az_min (deg), az_max (deg), color_index]
            # We can further divide these colored bands into smaller "ช่อง" if needed.
            # For now, each colored band is one "cell".
            extra2_cells_params = [
                (
                    "E2_Cell1_Orange",
                    1.10,
                    1.50,
                    -30,
                    30,
                    0,
                ),  # Wider angle for inner zone
                ("E2_Cell2_Yellow", 1.50, 1.85, -25, 25, 1),
                ("E2_Cell3_Green", 1.85, 2.20, -20, 20, 2),
                ("E2_Cell4_LBlue", 2.20, 2.55, -17, 17, 3),
            ]
            for i, params in enumerate(extra2_cells_params):
                target_x, target_z = self._calculate_target_point_for_sector(
                    params[1], params[2], params[3], params[4]
                )
                zones.append(
                    {
                        "id": params[0],
                        "shape": "sector",
                        "r_min": params[1],
                        "r_max": params[2],
                        "az_min": params[3],
                        "az_max": params[4],
                        "color": self.colors[params[5] % len(self.colors)],
                        "target_point": {"x": target_x, "z": target_z},
                    }
                )
            return zones

        elif self.field_type == "extra1":
            current_distance = self.min_distance
            idx = 0
            while current_distance < self.max_distance:
                next_distance = min(
                    current_distance + self.zone_width, self.max_distance
                )
                target_z_val = (current_distance + next_distance) / 2
                zones.append(
                    {
                        "id": f"E1_Z{idx+1}",
                        "shape": "radial1d",
                        "r_min": current_distance,
                        "r_max": next_distance,
                        "color": self.colors[idx % len(self.colors)],
                        "target_point": {
                            "x": 0.0,
                            "z": target_z_val,
                        },  # Target is straight ahead
                    }
                )
                current_distance = next_distance
                idx += 1
            return zones

        # Standard 1D radial zones
        current_distance = self.min_distance
        idx = 0
        while current_distance < self.max_distance:
            next_distance = min(current_distance + self.zone_width, self.max_distance)
            target_z_val = (current_distance + next_distance) / 2
            zones.append(
                {
                    "id": f"STD_Z{idx+1}",
                    "shape": "radial1d",
                    "r_min": current_distance,
                    "r_max": next_distance,
                    "color": self.colors[idx % len(self.colors)],
                    "target_point": {
                        "x": 0.0,
                        "z": target_z_val,
                    },  # Target is straight ahead
                }
            )
            current_distance = next_distance
            idx += 1

        if self.field_type == "real1":
            zones.append({
                "id": "REAL1_FIELD",
                "shape": "rect",
                "x_min": 0.0,
                "x_max": 3.0,
                "z_min": 0.0,
                "z_max": 2.0,
                "color": "#607D8B",
                "target_point": {"x": 1.5, "z": 1.0},
            })

        if self.field_type == "extramap1":
            zones.append({
                "id": "EXTRAMAP1_FIELD",
                "shape": "rect",
                "x_min": 0.0,
                "x_max": 4.0,
                "z_min": 0.0,
                "z_max": 2.0,
                "color": "#607D8B",
                "target_point": {"x": 2.0, "z": 1.0},
            })

        if self.field_type == "extramap2":
            zones.append({
                "id": "EXTRAMAP2_FIELD",
                "shape": "rect",
                "x_min": 0.0,
                "x_max": 3.0,
                "z_min": 0.0,
                "z_max": 2.0,
                "color": "#607D8B",
                "target_point": {"x": 1.5, "z": 1.0},
            })

        return zones

    def get_zone_for_position(self, x, z):
        landing_r = math.sqrt(x**2 + z**2)
        landing_azimuth = math.degrees(math.atan2(x, z))

        for i, zone_def in enumerate(self.zones):
            if not isinstance(zone_def, dict):
                continue
            shape = zone_def.get("shape")
            if shape == "sector":
                if zone_def.get("r_min", -float("inf")) <= landing_r < zone_def.get(
                    "r_max", float("inf")
                ) and zone_def.get("az_min", -180) <= landing_azimuth < zone_def.get(
                    "az_max", 180
                ):
                    return i
            elif shape == "rect":
                if zone_def.get("x_min", -float("inf")) <= x < zone_def.get(
                    "x_max", float("inf")
                ) and zone_def.get("z_min", -float("inf")) <= z < zone_def.get(
                    "z_max", float("inf")
                ):
                    return i
            elif shape == "radial1d":
                if (
                    zone_def.get("r_min", -float("inf"))
                    <= landing_r
                    < zone_def.get("r_max", float("inf"))
                ):
                    return i
        return -1

    def load_field_configuration(self, field_type="standard"):
        self.field_type = field_type
        self.custom_zones = []

        if field_type == "standard":
            self.min_distance = 0.75
            self.max_distance = 2.65
            self.zone_width = 0.38
        elif field_type == "extra1":
            self.min_distance = 0.75
            self.max_distance = 4.55
            self.zone_width = 0.38
        elif field_type == "extra2":
            # min_distance, max_distance for extra2 will be derived from its zones in get_field_dimensions
            pass
        elif field_type == "real1":
            self.min_distance = 0.0
            self.max_distance = 3.0
            self.zone_width = 3.0
        elif field_type == "extramap1":
            self.min_distance = 0.0
            self.max_distance = 4.0
            self.zone_width = 4.0
        elif field_type == "extramap2":
            self.min_distance = 0.0
            self.max_distance = 3.0
            self.zone_width = 3.0

        self.zones = self._calculate_zones()

    def get_field_dimensions(self):
        overall_min_r_val = float("inf")
        overall_max_r_val = float("-inf")
        has_radial_data = False

        if self.zones:
            for z_def in self.zones:
                if not isinstance(z_def, dict):
                    continue
                if "r_min" in z_def:
                    overall_min_r_val = min(overall_min_r_val, z_def["r_min"])
                    has_radial_data = True
                if "r_max" in z_def:
                    overall_max_r_val = max(overall_max_r_val, z_def["r_max"])
                    has_radial_data = True

        if not has_radial_data or overall_min_r_val == float("inf"):
            if self.field_type == "standard" or self.field_type == "extra1":
                overall_min_r_val = self.min_distance
                overall_max_r_val = self.max_distance
            elif self.field_type == "real1":
                overall_min_r_val = 0.0
                overall_max_r_val = 3.0
            else:
                overall_min_r_val = 0.0
                overall_max_r_val = 3.0

        return {
            "min_distance_overall": overall_min_r_val,
            "max_distance_overall": overall_max_r_val,
            "zone_width_radial": (
                self.zone_width
                if (self.field_type == "standard" or self.field_type == "extra1")
                else None
            ),
            "field_type": self.field_type,
            "raw_zones_data": self.zones if self.zones else [],
        }

    def set_field_dimensions(
        self, min_distance, max_distance, zone_width, field_type="custom"
    ):
        self.min_distance = min_distance
        self.max_distance = max_distance
        self.zone_width = zone_width
        self.field_type = field_type
        self.custom_zones = []
        self.zones = self._calculate_zones()


class StrikerSettings:
    def __init__(self):
        self.available_heights = [1.0, 1.5, 2.0]
        self.release_height = 2.0
        self.strike_height = 0.35
        self.strike_angle_elevation = 45.0
        self.strike_azimuth_angle = 0.0
        self.strike_velocity = 5.25
        self.delay_time = 0.37
        self.striker_power = 50.0
        self.angle_elevation_min = 10.0
        self.angle_elevation_max = 80.0
        self.azimuth_angle_min = -45.0
        self.azimuth_angle_max = 45.0
        self.velocity_min = 1.0
        self.velocity_max = 20.0
        self.power_min = 10.0
        self.power_max = 100.0
        self.delay_min = 0.0
        self.delay_max = 1.0
        self.strike_height_min = 0.01
        self.strike_height_max = 0.5

    def convert_power_to_velocity(self):
        if self.power_max == self.power_min:
            return self.velocity_min
        power_factor = (self.striker_power - self.power_min) / (
            self.power_max - self.power_min
        )
        power_factor = max(0, min(1, power_factor))
        return self.velocity_min + power_factor * (
            self.velocity_max - self.velocity_min
        )

    def validate_settings(self):
        if self.release_height not in self.available_heights:
            return (
                False,
                f"Release height must be one of {self.available_heights} meters",
            )
        if not (self.strike_height_min <= self.strike_height <= self.strike_height_max):
            return (
                False,
                f"Strike height: {self.strike_height_min:.2f}-{self.strike_height_max:.2f} m",
            )
        if not (
            self.angle_elevation_min
            <= self.strike_angle_elevation
            <= self.angle_elevation_max
        ):
            return (
                False,
                f"Elevation: {self.angle_elevation_min:.1f}-{self.angle_elevation_max:.1f} deg",
            )
        if not (
            self.azimuth_angle_min
            <= self.strike_azimuth_angle
            <= self.azimuth_angle_max
        ):
            return (
                False,
                f"Azimuth: {self.azimuth_angle_min:.1f}-{self.azimuth_angle_max:.1f} deg",
            )

        vel_to_check = self.strike_velocity
        if vel_to_check <= 0 and self.striker_power > 0:
            vel_to_check = self.convert_power_to_velocity()
        elif vel_to_check <= 0:
            vel_to_check = self.velocity_min

        if not (self.velocity_min <= vel_to_check <= self.velocity_max):
            return (
                False,
                f"Velocity ({vel_to_check:.2f}): {self.velocity_min:.1f}-{self.velocity_max:.1f} m/s",
            )
        if not (self.power_min <= self.striker_power <= self.power_max):
            return False, f"Power: {self.power_min:.1f}-{self.power_max:.1f}%"
        return True, "Settings are valid"

    def get_settings(self):
        return {
            "release_height": self.release_height,
            "strike_height": self.strike_height,
            "strike_angle_elevation": self.strike_angle_elevation,
            "strike_azimuth_angle": self.strike_azimuth_angle,
            "strike_velocity": self.strike_velocity,
            "delay_time": self.delay_time,
            "striker_power": self.striker_power,
        }

    def set_settings(self, settings):
        for key, value in settings.items():
            if hasattr(self, key):
                setattr(self, key, float(value))


class FieldSettings:
    def __init__(self):
        self.field_width = 3.5
        self.field_length = 3.5
        self.robot_pos_x = 0.0
        self.robot_pos_z = 0.0
        self.robot_orientation_yaw = 0.0


class Simulation:
    def __init__(self):
        self.ball_physics = BallPhysics()
        self.target_area = TargetArea()
        self.striker_settings = StrikerSettings()
        self.field_settings = FieldSettings()
        self.trajectory_x, self.trajectory_y, self.trajectory_z = [], [], []
        self.landing_position = (0.0, 0.0)
        self.landing_distance_radial = 0.0
        self.target_zone = -1
        self.fall_y, self.fall_times = [], []
        self.strike_time = 0.0
        self.ideal_trajectory_x, self.ideal_trajectory_y, self.ideal_trajectory_z = (
            [],
            [],
            [],
        )
        self.ideal_landing_position = (0.0, 0.0)
        self.show_ideal_comparison = False
        self.air_density = 1.225
        self.drag_coefficient = 0.5

    def start_simulation(self):
        valid, message = self.striker_settings.validate_settings()
        if not valid:
            return False, message

        vel = self.striker_settings.strike_velocity
        if vel <= 0 and self.striker_settings.striker_power > 0:
            vel = self.striker_settings.convert_power_to_velocity()
        elif vel <= 0:
            vel = self.striker_settings.velocity_min

        self.ball_physics.air_density = self.air_density
        self.ball_physics.drag_coefficient = self.drag_coefficient

        self.trajectory_x, self.trajectory_y, self.trajectory_z, times = (
            self.ball_physics.calculate_trajectory(
                self.striker_settings.release_height,
                vel,
                self.striker_settings.strike_angle_elevation,
                self.striker_settings.strike_azimuth_angle,
                self.striker_settings.strike_height,
            )
        )
        self.strike_time = times[-1] if times else 0.0
        if self.trajectory_x:
            land_x, land_z = self.trajectory_x[-1], self.trajectory_z[-1]
            self.landing_position = (land_x, land_z)
            self.landing_distance_radial = math.sqrt(land_x**2 + land_z**2)
        else:
            land_x, land_z = 0.0, 0.0
            self.landing_position = (0.0, 0.0)
            self.landing_distance_radial = 0.0

        self.target_zone = self.target_area.get_zone_for_position(land_x, land_z)
        zone_name = "None"
        if self.target_zone >= 0 and self.target_zone < len(self.target_area.zones):
            zone_name = self.target_area.zones[self.target_zone].get(
                "id", f"Zone {self.target_zone + 1}"
            )
        msg_out = f"Landed at (x={land_x:.2f}, z={land_z:.2f})m. Radial: {self.landing_distance_radial:.2f}m. Zone: {zone_name}"

        if self.show_ideal_comparison:
            (
                self.ideal_trajectory_x,
                self.ideal_trajectory_y,
                self.ideal_trajectory_z,
                _,
            ) = self.ball_physics.calculate_trajectory_ideal(
                self.striker_settings.release_height,
                vel,
                self.striker_settings.strike_angle_elevation,
                self.striker_settings.strike_azimuth_angle,
                self.striker_settings.strike_height,
            )
            self.ideal_landing_position = (
                (self.ideal_trajectory_x[-1], self.ideal_trajectory_z[-1])
                if self.ideal_trajectory_x
                else (0.0, 0.0)
            )
        return True, msg_out

    def toggle_ideal_comparison(self, show_comparison):
        self.show_ideal_comparison = show_comparison

    def reset_simulation(self):
        self.trajectory_x, self.trajectory_y, self.trajectory_z = [], [], []
        self.landing_position = (0.0, 0.0)
        self.landing_distance_radial = 0.0
        self.target_zone = -1
        self.ideal_trajectory_x, self.ideal_trajectory_y, self.ideal_trajectory_z = (
            [],
            [],
            [],
        )
        self.ideal_landing_position = (0.0, 0.0)
        return True, "Simulation reset"

    def calculate_optimal_parameters(self, target_x, target_z, fixed_params=None):
        if fixed_params is None:
            fixed_params = {}
        best_params = {
            "elevation_angle": self.striker_settings.strike_angle_elevation,
            "velocity": self.striker_settings.strike_velocity,
            "azimuth_angle": self.striker_settings.strike_azimuth_angle,
            "error": float("inf"),
            "landing_x": 0,
            "landing_z": 0,
        }

        release_h = self.striker_settings.release_height
        strike_h = self.striker_settings.strike_height

        # Increased steps for better initial grid search
        az_steps = 20 if "azimuth_angle" not in fixed_params else 1
        el_steps = 25 if "elevation_angle" not in fixed_params else 1
        vel_steps = 25 if "velocity" not in fixed_params else 1

        vel_min_s = fixed_params.get("velocity", self.striker_settings.velocity_min)
        vel_max_s = fixed_params.get("velocity", self.striker_settings.velocity_max)
        el_min_s = fixed_params.get(
            "elevation_angle", self.striker_settings.angle_elevation_min
        )
        el_max_s = fixed_params.get(
            "elevation_angle", self.striker_settings.angle_elevation_max
        )
        az_min_s = fixed_params.get(
            "azimuth_angle", self.striker_settings.azimuth_angle_min
        )
        az_max_s = fixed_params.get(
            "azimuth_angle", self.striker_settings.azimuth_angle_max
        )

        # Heuristic adjustment based on target distance
        target_rad = math.sqrt(target_x**2 + target_z**2)
        if "velocity" not in fixed_params:
            if target_rad > 3.5:
                vel_min_s = max(vel_min_s, 7.0)
            elif target_rad < 1.0:
                vel_max_s = min(vel_max_s, 8.0)
        if "elevation_angle" not in fixed_params:
            if target_rad > 3.0:
                el_max_s = min(el_max_s, 65.0)  # Lower angles for far targets
            elif target_rad < 1.0:
                el_min_s = max(el_min_s, 30.0)  # Higher angles for near targets

        az_range = np.linspace(az_min_s, az_max_s, az_steps)
        el_range = np.linspace(el_min_s, el_max_s, el_steps)
        vel_range = np.linspace(vel_min_s, vel_max_s, vel_steps)

        for az in az_range:
            cur_az = fixed_params.get("azimuth_angle", az)
            for el in el_range:
                cur_el = fixed_params.get("elevation_angle", el)
                for vel in vel_range:
                    cur_vel = fixed_params.get("velocity", vel)
                    land_x, land_z = self.ball_physics.get_landing_position(
                        release_h, cur_vel, cur_el, cur_az, strike_h
                    )
                    error = math.sqrt(
                        (land_x - target_x) ** 2 + (land_z - target_z) ** 2
                    )
                    if error < best_params["error"]:
                        best_params.update(
                            {
                                "error": error,
                                "azimuth_angle": cur_az,
                                "elevation_angle": cur_el,
                                "velocity": cur_vel,
                                "landing_x": land_x,
                                "landing_z": land_z,
                            }
                        )

        tolerance = 0.05  # Target 5cm accuracy
        if best_params["error"] < tolerance:
            return True, best_params

        # Refined search if initial error is not too large (e.g. < 30cm)
        if best_params["error"] < 0.30:
            # print(f"Refining search. Initial best error: {best_params['error']:.3f}m")
            refine_steps = 9  # More steps for refinement
            az_ref_min = best_params["azimuth_angle"] - 1.5
            az_ref_max = best_params["azimuth_angle"] + 1.5
            el_ref_min = best_params["elevation_angle"] - 1.5
            el_ref_max = best_params["elevation_angle"] + 1.5
            vel_ref_min = best_params["velocity"] - 0.3
            vel_ref_max = best_params["velocity"] + 0.3

            az_r_range = (
                np.linspace(az_ref_min, az_ref_max, refine_steps)
                if "azimuth_angle" not in fixed_params
                else [best_params["azimuth_angle"]]
            )
            el_r_range = (
                np.linspace(el_ref_min, el_ref_max, refine_steps)
                if "elevation_angle" not in fixed_params
                else [best_params["elevation_angle"]]
            )
            vel_r_range = (
                np.linspace(vel_ref_min, vel_ref_max, refine_steps)
                if "velocity" not in fixed_params
                else [best_params["velocity"]]
            )

            az_r_range = np.clip(
                az_r_range,
                self.striker_settings.azimuth_angle_min,
                self.striker_settings.azimuth_angle_max,
            )
            el_r_range = np.clip(
                el_r_range,
                self.striker_settings.angle_elevation_min,
                self.striker_settings.angle_elevation_max,
            )
            vel_r_range = np.clip(
                vel_r_range,
                self.striker_settings.velocity_min,
                self.striker_settings.velocity_max,
            )

            for az_r in az_r_range:
                cur_az_r = fixed_params.get("azimuth_angle", az_r)
                for el_r in el_r_range:
                    cur_el_r = fixed_params.get("elevation_angle", el_r)
                    for vel_r in vel_r_range:
                        cur_vel_r = fixed_params.get("velocity", vel_r)
                        land_x_r, land_z_r = self.ball_physics.get_landing_position(
                            release_h, cur_vel_r, cur_el_r, cur_az_r, strike_h
                        )
                        error_r = math.sqrt(
                            (land_x_r - target_x) ** 2 + (land_z_r - target_z) ** 2
                        )
                        if error_r < best_params["error"]:
                            best_params.update(
                                {
                                    "error": error_r,
                                    "azimuth_angle": cur_az_r,
                                    "elevation_angle": cur_el_r,
                                    "velocity": cur_vel_r,
                                    "landing_x": land_x_r,
                                    "landing_z": land_z_r,
                                }
                            )
            # print(f"After refinement, best error: {best_params['error']:.3f}m")
            if best_params["error"] < tolerance:
                return True, best_params

        return False, (
            f"Could not find optimal parameters within {tolerance*100:.0f}cm. "
            f"Best error: {best_params['error']:.2f}m. "
            f"Params: Az:{best_params['azimuth_angle']:.1f}, El:{best_params['elevation_angle']:.1f}, Vel:{best_params['velocity']:.1f}"
        )

    def save_settings(self, filename):
        settings_data = {
            "striker_settings": self.striker_settings.get_settings(),
            "field_settings": self.field_settings.get_settings(),
            "target_area_config": self.target_area.get_field_dimensions(),
            "physics_sim_params": {
                "gravity": self.ball_physics.gravity,
                "ball_mass": self.ball_physics.ball_mass,
                "air_density_sim": self.air_density,
                "drag_coefficient_sim": self.drag_coefficient,
                "elasticity": self.ball_physics.elasticity,
            },
        }
        try:
            with open(filename, "w") as f:
                json.dump(settings_data, f, indent=4)
            return True, f"Settings saved to {filename}"
        except Exception as e:
            return False, f"Error saving settings: {str(e)}"

    def load_settings(self, filename):
        try:
            with open(filename, "r") as f:
                settings_data = json.load(f)
            if "striker_settings" in settings_data:
                self.striker_settings.set_settings(settings_data["striker_settings"])
            if "target_area_config" in settings_data:
                ta_conf = settings_data["target_area_config"]
                self.target_area.load_field_configuration(
                    ta_conf.get("field_type", "standard")
                )
            if "physics_sim_params" in settings_data:
                phys = settings_data["physics_sim_params"]
                self.ball_physics.gravity = phys.get(
                    "gravity", self.ball_physics.gravity
                )
                self.ball_physics.ball_mass = phys.get(
                    "ball_mass", self.ball_physics.ball_mass
                )
                self.air_density = phys.get("air_density_sim", self.air_density)
                self.drag_coefficient = phys.get(
                    "drag_coefficient_sim", self.drag_coefficient
                )
                self.ball_physics.elasticity = phys.get(
                    "elasticity", self.ball_physics.elasticity
                )
            return True, f"Settings loaded from {filename}"
        except Exception as e:
            return False, f"Error loading settings: {str(e)}"


def main():
    sim = Simulation()
    sim.target_area.load_field_configuration("extra2")
    print(f"Field: {sim.target_area.field_type}, Zones: {len(sim.target_area.zones)}")
    for zone in sim.target_area.zones:
        print(
            f"  {zone.get('id')}: Target Point ({zone.get('target_point',{}).get('x',0):.2f}, {zone.get('target_point',{}).get('z',0):.2f})"
        )

    sim.striker_settings.strike_angle_elevation = 30
    sim.striker_settings.strike_azimuth_angle = 5
    sim.striker_settings.strike_velocity = 10
    sim.striker_settings.release_height = 2.0
    sim.striker_settings.strike_height = 0.35

    success, msg = sim.start_simulation()
    print(f"\nSim 1: {msg}" if success else f"\nSim 1 Fail: {msg}")

    target_x, target_z = 0.5, 2.0
    print(
        f"\nOptimizing for X={target_x}, Z={target_z} on {sim.target_area.field_type}"
    )
    opt_s, opt_r = sim.calculate_optimal_parameters(target_x, target_z)
    if opt_s:
        print(
            f"Optimal: El={opt_r['elevation_angle']:.2f}, Az={opt_r['azimuth_angle']:.2f}, Vel={opt_r['velocity']:.2f}"
        )
        print(
            f"  Landing: (x={opt_r['landing_x']:.2f}, z={opt_r['landing_z']:.2f})m, Error: {opt_r['error']:.3f}m"
        )
        sim.striker_settings.strike_angle_elevation = opt_r["elevation_angle"]
        sim.striker_settings.strike_azimuth_angle = opt_r["azimuth_angle"]
        sim.striker_settings.strike_velocity = opt_r["velocity"]
        ver_s, ver_msg = sim.start_simulation()
        print(f"Verification: {ver_msg}")
    else:
        print(f"Optimization failed: {opt_r}")


if __name__ == "__main__":
    main()

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
        """
        Initialize physics parameters

        Args:
            gravity (float): Acceleration due to gravity (m/s^2)
            ball_mass (float): Mass of the squash ball (kg)
            elasticity (float): Coefficient of restitution for the ball
        """
        self.gravity = gravity
        self.ball_mass = ball_mass
        self.elasticity = elasticity
        self.time_step = 0.01  # Time step for simulation (seconds)
        self.ideal_mode = False  # Flag for ideal/non-ideal calculations

        # Realistic air resistance parameters
        self.air_density = 1.225  # kg/m^3
        self.drag_coefficient = 0.5  # Dimensionless
        self.cross_sectional_area = math.pi * (
            0.04**2
        )  # m^2 (based on squash ball diameter ~4cm)

    def calculate_trajectory(
        self,
        release_height,
        strike_velocity,
        strike_angle,
        strike_height=0.35,
        time_limit=5.0,
    ):
        """
        Calculate the trajectory of the ball after being struck

        Args:
            release_height (float): Height from which the ball is released (m)
            strike_velocity (float): Velocity imparted by the striker (m/s)
            strike_angle (float): Angle at which the ball is struck (degrees)
            strike_height (float): Height at which the ball is struck (m)
            time_limit (float): Maximum time to simulate (seconds)

        Returns:
            tuple: Lists of x positions, y positions, and times
        """
        # Convert angle to radians
        angle_rad = math.radians(strike_angle)

        # Initial velocity components
        vx = strike_velocity * math.cos(angle_rad)
        vy = strike_velocity * math.sin(angle_rad)

        # Initial position (ball is hit at x=0, and y=strike_height)
        x0 = 0.0
        y0 = strike_height

        # Lists to store trajectory
        x_positions = [x0]
        y_positions = [y0]
        times = [0.0]

        # Current state
        x = x0
        y = y0
        t = 0.0

        # Simulation loop
        while t < time_limit and y >= 0:
            # Update time
            t += self.time_step

            # Calculate air resistance if not in ideal mode
            if not self.ideal_mode:
                # Calculate speed
                speed = math.sqrt(vx**2 + vy**2)

                # Calculate drag force magnitude (0.5 * density * speed^2 * drag_coef * area)
                drag_force_magnitude = (
                    0.5
                    * self.air_density
                    * speed**2
                    * self.drag_coefficient
                    * self.cross_sectional_area
                )

                # Calculate drag force components
                if speed > 0:  # Avoid division by zero
                    drag_force_x = -drag_force_magnitude * vx / speed
                    drag_force_y = -drag_force_magnitude * vy / speed

                    # Calculate drag acceleration
                    drag_acc_x = drag_force_x / self.ball_mass
                    drag_acc_y = drag_force_y / self.ball_mass

                    # Apply drag acceleration to velocity
                    vx += drag_acc_x * self.time_step
                    vy += drag_acc_y * self.time_step

            # Update velocity due to gravity
            vy = vy - self.gravity * self.time_step

            # Update position
            x = x + vx * self.time_step
            y = y + vy * self.time_step

            # If ball hits the ground, calculate bounce (if not the end point)
            if y <= 0:
                y = 0

                # For visualization purposes, we allow one bounce
                # In the actual simulation we only care about the first ground contact
                break

            # Store positions
            x_positions.append(x)
            y_positions.append(y)
            times.append(t)

        return x_positions, y_positions, times

    def calculate_trajectory_ideal(
        self,
        release_height,
        strike_velocity,
        strike_angle,
        strike_height=0.35,
        time_limit=5.0,
    ):
        """
        Calculate the trajectory of the ball after being struck using ideal physics (no air resistance)

        Args:
            release_height (float): Height from which the ball is released (m)
            strike_velocity (float): Velocity imparted by the striker (m/s)
            strike_angle (float): Angle at which the ball is struck (degrees)
            strike_height (float): Height at which the ball is struck (m)
            time_limit (float): Maximum time to simulate (seconds)

        Returns:
            tuple: Lists of x positions, y positions, and times
        """
        # Temporarily set to ideal mode
        old_mode = self.ideal_mode
        self.ideal_mode = True

        # Calculate trajectory
        result = self.calculate_trajectory(
            release_height, strike_velocity, strike_angle, strike_height, time_limit
        )

        # Restore previous mode
        self.ideal_mode = old_mode

        return result

    def simulate_free_fall(self, release_height, time_limit=5.0):
        """
        Simulate the free fall of the ball before it's struck

        Args:
            release_height (float): Height from which the ball is released (m)
            time_limit (float): Maximum time to simulate (seconds)

        Returns:
            tuple: Lists of y positions and times, and the time at which the ball should be struck
        """
        # Initial position
        y0 = release_height

        # Initial velocity
        vy = 0.0

        # Lists to store trajectory
        y_positions = [y0]
        times = [0.0]

        # Current state
        y = y0
        t = 0.0

        # Simulation loop
        while t < time_limit and y > 0.1:  # Stop when close to striker level
            # Update time
            t += self.time_step

            # Update velocity due to gravity
            vy = vy + self.gravity * self.time_step

            # Update position
            y = y - vy * self.time_step

            # Store positions
            y_positions.append(y)
            times.append(t)

        # Return the fall trajectory and the time when the ball reaches the strike point
        return y_positions, times, t

    def get_landing_distance(
        self, release_height, strike_velocity, strike_angle, strike_height=None
    ):
        """
        Calculate the landing distance of the ball

        Args:
            release_height (float): Height from which the ball is released (m)
            strike_velocity (float): Velocity imparted by the striker (m/s)
            strike_angle (float): Angle at which the ball is struck (degrees)
            strike_height (float, optional): Height at which the ball is struck (m)

        Returns:
            float: The distance where the ball lands
        """
        if strike_height is None:
            strike_height = 0.35  # Default value if not provided

        x_pos, y_pos, _ = self.calculate_trajectory(
            release_height, strike_velocity, strike_angle, strike_height
        )
        if len(x_pos) > 0:
            return x_pos[-1]
        return 0.0

    def get_landing_distance_ideal(
        self, release_height, strike_velocity, strike_angle, strike_height=None
    ):
        """
        Calculate the landing distance of the ball using ideal physics (no air resistance)

        Args:
            release_height (float): Height from which the ball is released (m)
            strike_velocity (float): Velocity imparted by the striker (m/s)
            strike_angle (float): Angle at which the ball is struck (degrees)
            strike_height (float, optional): Height at which the ball is struck (m)

        Returns:
            float: The distance where the ball lands
        """
        if strike_height is None:
            strike_height = 0.35  # Default value if not provided

        # Temporarily set to ideal mode
        old_mode = self.ideal_mode
        self.ideal_mode = True

        # Calculate landing distance
        x_pos, y_pos, _ = self.calculate_trajectory(
            release_height, strike_velocity, strike_angle, strike_height
        )

        # Restore previous mode
        self.ideal_mode = old_mode

        if len(x_pos) > 0:
            return x_pos[-1]
        return 0.0


class TargetArea:
    """Class representing the target area on the field"""

    def __init__(self):
        # Default target configuration (from the course specification)
        self.min_distance = 0.75  # 75cm
        self.max_distance = 2.65  # 265cm
        self.zone_width = 0.38  # 38cm
        self.field_type = "standard"

        # Custom zones (for non-uniform width zones)
        self.custom_zones = []

        # Calculate zones
        self.zones = self._calculate_zones()

        # Colors for each zone
        self.colors = [
            "red",
            "blue",
            "green",
            "yellow",
            "purple",
            "orange",
            "cyan",
            "magenta",
            "lime",
            "pink",
        ]

    def _calculate_zones(self):
        """Calculate the zone boundaries based on the field configuration"""
        # If we have custom zones defined (for extra maps), use those
        if self.custom_zones and self.field_type != "standard":
            return self.custom_zones

        # Otherwise calculate uniform zones based on zone_width
        zones = []
        current_distance = self.min_distance

        while current_distance < self.max_distance:
            next_distance = min(current_distance + self.zone_width, self.max_distance)
            zones.append((current_distance, next_distance))
            current_distance = next_distance

        return zones

    def get_zone_for_distance(self, distance):
        """
        Get the zone index for a given distance

        Args:
            distance (float): The landing distance in meters

        Returns:
            int: The zone index (0-based) or -1 if not in any zone
        """
        for i, (min_dist, max_dist) in enumerate(self.zones):
            if min_dist <= distance < max_dist:
                return i
        return -1

    def load_field_configuration(self, field_type="standard"):
        """
        Load field configuration based on type

        Args:
            field_type (str): The type of field configuration
        """
        self.field_type = field_type
        self.custom_zones = []

        if field_type == "standard":
            # Standard field
            self.min_distance = 0.75
            self.max_distance = 2.65
            self.zone_width = 0.38
        elif field_type == "extra1":
            # Extra field 1 with extended ranges
            self.min_distance = 0.75
            self.max_distance = 4.55
            self.zone_width = 0.38  # Default width, though we use custom zones

            # Define the custom zones for extra1 (non-uniform width)
            self.custom_zones = [
                # Original zones (same as standard)
                (0.75, 1.13),  # 0.75 + 0.38 = 1.13
                (1.13, 1.51),  # 1.13 + 0.38 = 1.51
                (1.51, 1.89),  # 1.51 + 0.38 = 1.89
                (1.89, 2.27),  # 1.89 + 0.38 = 2.27
                (2.27, 2.65),  # 2.27 + 0.38 = 2.65
                # Additional extended zones
                (2.65, 3.03),  # 2.65 + 0.38 = 3.03
                (3.03, 3.41),  # 3.03 + 0.38 = 3.41
                (3.41, 3.79),  # 3.41 + 0.38 = 3.79
                (3.79, 4.17),  # 3.79 + 0.38 = 4.17
                (4.17, 4.55),  # 4.17 + 0.38 = 4.55
            ]
        elif field_type == "extra2":
            # Extra field 2 (same distances as standard but angle will be added later)
            self.min_distance = 0.75
            self.max_distance = 2.65
            self.zone_width = 0.38

        # Recalculate zones
        self.zones = self._calculate_zones()

    def get_field_dimensions(self):
        """Get the field dimensions as a dictionary"""
        return {
            "min_distance": self.min_distance,
            "max_distance": self.max_distance,
            "zone_width": self.zone_width,
            "field_type": self.field_type,
        }

    def set_field_dimensions(
        self, min_distance, max_distance, zone_width, field_type="custom"
    ):
        """Set custom field dimensions"""
        self.min_distance = min_distance
        self.max_distance = max_distance
        self.zone_width = zone_width
        self.field_type = field_type
        self.custom_zones = []  # Clear any custom zones when setting new dimensions

        # Recalculate zones
        self.zones = self._calculate_zones()


class StrikerSettings:
    """Class to manage striker settings and parameters"""

    def __init__(self):
        """Initialize with default values"""
        # Available release heights (m)
        self.available_heights = [1.0, 1.5, 2.0]  # 100cm, 150cm, 200cm

        # Current settings
        self.release_height = 2.0  # Default to 2.0 meters
        self.strike_height = 0.35  # Height at which the ball is struck (m)
        self.strike_angle = 45.0  # Degrees
        self.strike_velocity = 5.25  # m/s
        self.delay_time = 0.37  # seconds
        self.striker_power = 50.0  # Percentage

        # Limits for settings
        self.angle_min = 10.0
        self.angle_max = 80.0
        self.velocity_min = 1.0
        self.velocity_max = 20.0
        self.power_min = 10.0
        self.power_max = 100.0
        self.delay_min = 0.0
        self.delay_max = 1.0
        self.strike_height_min = 0.01  # 1cm
        self.strike_height_max = 0.5  # 50cm

    def convert_power_to_velocity(self):
        """Convert power percentage to strike velocity"""
        # Linear mapping from power percentage to velocity range
        power_factor = (self.striker_power - self.power_min) / (
            self.power_max - self.power_min
        )
        velocity = self.velocity_min + power_factor * (
            self.velocity_max - self.velocity_min
        )
        return velocity

    def validate_settings(self):
        """Validate that all settings are within allowed ranges"""
        # Check release height
        if self.release_height not in self.available_heights:
            return (
                False,
                f"Release height must be one of {self.available_heights} meters",
            )

        # Check strike height
        if not (self.strike_height_min <= self.strike_height <= self.strike_height_max):
            return (
                False,
                f"Strike height must be between {self.strike_height_min} and {self.strike_height_max} meters",
            )

        # Check angle
        if not (self.angle_min <= self.strike_angle <= self.angle_max):
            return (
                False,
                f"Strike angle must be between {self.angle_min} and {self.angle_max} degrees",
            )

        # Check velocity
        if not (self.velocity_min <= self.strike_velocity <= self.velocity_max):
            return (
                False,
                f"Strike velocity must be between {self.velocity_min} and {self.velocity_max} m/s",
            )

        # Check power
        if not (self.power_min <= self.striker_power <= self.power_max):
            return (
                False,
                f"Striker power must be between {self.power_min} and {self.power_max}%",
            )

        # Check delay
        if not (self.delay_min <= self.delay_time <= self.delay_max):
            return (
                False,
                f"Delay time must be between {self.delay_min} and {self.delay_max} seconds",
            )

        return True, "Settings are valid"

    def get_settings(self):
        """Get the current settings as a dictionary"""
        return {
            "release_height": self.release_height,
            "strike_height": self.strike_height,
            "strike_angle": self.strike_angle,
            "strike_velocity": self.strike_velocity,
            "delay_time": self.delay_time,
            "striker_power": self.striker_power,
        }

    def set_settings(self, settings):
        """Set settings from a dictionary"""
        if "release_height" in settings:
            self.release_height = settings["release_height"]
        if "strike_height" in settings:
            self.strike_height = settings["strike_height"]
        if "strike_angle" in settings:
            self.strike_angle = settings["strike_angle"]
        if "strike_velocity" in settings:
            self.strike_velocity = settings["strike_velocity"]
        if "delay_time" in settings:
            self.delay_time = settings["delay_time"]
        if "striker_power" in settings:
            self.striker_power = settings["striker_power"]


class FieldSettings:
    """Class to manage field settings"""

    def __init__(self):
        """Initialize with default values"""
        # Field dimensions
        self.field_width = 3.5  # meters
        self.field_length = 3.5  # meters

        # Robot area
        self.robot_area_width = 0.5  # meters
        self.robot_area_length = 0.5  # meters

        # Swing area
        self.swing_area_width = 0.5  # meters
        self.swing_area_length = 0.5  # meters

        # Release point (from the edge of the field)
        self.release_point_x = 0.0  # meters
        self.release_point_y = 0.0  # meters

    def get_settings(self):
        """Get the current settings as a dictionary"""
        return {
            "field_width": self.field_width,
            "field_length": self.field_length,
            "robot_area_width": self.robot_area_width,
            "robot_area_length": self.robot_area_length,
            "swing_area_width": self.swing_area_width,
            "swing_area_length": self.swing_area_length,
            "release_point_x": self.release_point_x,
            "release_point_y": self.release_point_y,
        }

    def set_settings(self, settings):
        """Set settings from a dictionary"""
        if "field_width" in settings:
            self.field_width = settings["field_width"]
        if "field_length" in settings:
            self.field_length = settings["field_length"]
        if "robot_area_width" in settings:
            self.robot_area_width = settings["robot_area_width"]
        if "robot_area_length" in settings:
            self.robot_area_length = settings["robot_area_length"]
        if "swing_area_width" in settings:
            self.swing_area_width = settings["swing_area_width"]
        if "swing_area_length" in settings:
            self.swing_area_length = settings["swing_area_length"]
        if "release_point_x" in settings:
            self.release_point_x = settings["release_point_x"]
        if "release_point_y" in settings:
            self.release_point_y = settings["release_point_y"]


class Simulation:
    """Main simulation class that coordinates all components"""

    def __init__(self):
        """Initialize the simulation"""
        self.ball_physics = BallPhysics()
        self.target_area = TargetArea()
        self.striker_settings = StrikerSettings()
        self.field_settings = FieldSettings()

        # Simulation results
        self.trajectory_x = []
        self.trajectory_y = []
        self.landing_distance = 0.0
        self.target_zone = -1

        # Fall trajectory before strike
        self.fall_y = []
        self.fall_times = []
        self.strike_time = 0.0

        # For comparison of ideal vs non-ideal
        self.ideal_trajectory_x = []
        self.ideal_trajectory_y = []
        self.ideal_landing_distance = 0.0
        self.show_ideal_comparison = False

        # For physics parameters
        self.air_density = 1.225  # kg/m^3
        self.drag_coefficient = 0.5  # Dimensionless

        # For target indicator on plot
        self.target_indicator = None
        self.target_text_annotation = None

        # For zone highlight on plot
        self.zone_highlight = None
        self.zone_text = None

    def start_simulation(self):
        """Start the simulation"""
        # Validate settings
        valid, message = self.striker_settings.validate_settings()
        if not valid:
            return False, message

        # Simulate free fall
        self.fall_y, self.fall_times, self.strike_time = (
            self.ball_physics.simulate_free_fall(self.striker_settings.release_height)
        )

        # Get strike velocity (either direct or from power)
        if self.striker_settings.strike_velocity <= 0:
            strike_velocity = self.striker_settings.convert_power_to_velocity()
        else:
            strike_velocity = self.striker_settings.strike_velocity

        # Apply physics parameters
        self.ball_physics.air_density = self.air_density
        self.ball_physics.drag_coefficient = self.drag_coefficient

        # Calculate trajectory after strike
        self.trajectory_x, self.trajectory_y, _ = (
            self.ball_physics.calculate_trajectory(
                self.striker_settings.release_height,
                strike_velocity,
                self.striker_settings.strike_angle,
                self.striker_settings.strike_height,
            )
        )

        # Calculate landing distance
        if len(self.trajectory_x) > 0:
            self.landing_distance = self.trajectory_x[-1]
        else:
            self.landing_distance = 0.0

        # Determine target zone
        self.target_zone = self.target_area.get_zone_for_distance(self.landing_distance)

        # If comparison is enabled, calculate ideal trajectory too
        if self.show_ideal_comparison:
            self.ideal_trajectory_x, self.ideal_trajectory_y, _ = (
                self.ball_physics.calculate_trajectory_ideal(
                    self.striker_settings.release_height,
                    strike_velocity,
                    self.striker_settings.strike_angle,
                    self.striker_settings.strike_height,
                )
            )

            if len(self.ideal_trajectory_x) > 0:
                self.ideal_landing_distance = self.ideal_trajectory_x[-1]
            else:
                self.ideal_landing_distance = 0.0

        return (
            True,
            f"Ball landed at {self.landing_distance:.2f}m (Zone: {self.target_zone + 1 if self.target_zone >= 0 else 'None'})",
        )

    def toggle_ideal_comparison(self, show_comparison):
        """Toggle the ideal vs non-ideal comparison"""
        self.show_ideal_comparison = show_comparison

    def reset_simulation(self):
        """Reset the simulation"""
        # รีเซ็ตค่าต่างๆ ในตัวจำลอง
        self.trajectory_x = []
        self.trajectory_y = []
        self.landing_distance = 0.0
        self.target_zone = -1
        self.fall_y = []
        self.fall_times = []
        self.strike_time = 0.0
        self.ideal_trajectory_x = []
        self.ideal_trajectory_y = []
        self.ideal_landing_distance = 0.0

        # รีเซ็ตตัวชี้วัด
        self.target_indicator = None
        self.target_text_annotation = None
        self.zone_highlight = None
        self.zone_text = None

        return True, "Simulation reset successfully"

    def calculate_optimal_angle(self, target_distance):
        """Calculate the optimal angle to hit a target distance"""
        if not (
            self.target_area.min_distance
            <= target_distance
            <= self.target_area.max_distance
        ):
            return (
                False,
                f"Target distance must be between {self.target_area.min_distance} and {self.target_area.max_distance} meters",
            )

        # Simple binary search to find the angle
        min_angle = self.striker_settings.angle_min
        max_angle = self.striker_settings.angle_max

        # Get velocity (either direct or from power)
        if self.striker_settings.strike_velocity <= 0:
            strike_velocity = self.striker_settings.convert_power_to_velocity()
        else:
            strike_velocity = self.striker_settings.strike_velocity

        # Maximum iterations to prevent infinite loop
        max_iterations = 20
        best_angle = min_angle
        best_distance_error = float("inf")

        for _ in range(max_iterations):
            mid_angle = (min_angle + max_angle) / 2

            # Calculate distance with this angle
            distance = self.ball_physics.get_landing_distance(
                self.striker_settings.release_height,
                strike_velocity,
                mid_angle,
                self.striker_settings.strike_height,
            )

            # Check if this is better than our current best
            distance_error = abs(distance - target_distance)
            if distance_error < best_distance_error:
                best_angle = mid_angle
                best_distance_error = distance_error

            # Update search range
            if distance < target_distance:
                min_angle = mid_angle
            else:
                max_angle = mid_angle

            # If we're close enough, stop
            if distance_error < 0.01:
                break

        return True, (best_angle, strike_velocity)

    def calculate_optimal_velocity(self, target_distance, fixed_angle=None):
        """Calculate the optimal velocity to hit a target distance at a given angle"""
        if not (
            self.target_area.min_distance
            <= target_distance
            <= self.target_area.max_distance
        ):
            return (
                False,
                f"Target distance must be between {self.target_area.min_distance} and {self.target_area.max_distance} meters",
            )

        # ใช้มุมปัจจุบันถ้าไม่มีการระบุมุมที่ต้องการ
        angle = (
            fixed_angle
            if fixed_angle is not None
            else self.striker_settings.strike_angle
        )

        # ทำ binary search เพื่อหาความเร็วที่เหมาะสม
        min_velocity = self.striker_settings.velocity_min
        max_velocity = self.striker_settings.velocity_max

        # จำนวนรอบสูงสุดเพื่อป้องกัน infinite loop
        max_iterations = 20
        best_velocity = min_velocity
        best_distance_error = float("inf")

        for _ in range(max_iterations):
            mid_velocity = (min_velocity + max_velocity) / 2

            # คำนวณระยะทางด้วยความเร็วนี้
            distance = self.ball_physics.get_landing_distance(
                self.striker_settings.release_height,
                mid_velocity,
                angle,
                self.striker_settings.strike_height,
            )

            # ตรวจสอบว่าผลลัพธ์นี้ดีกว่าค่าที่ดีที่สุดปัจจุบันหรือไม่
            distance_error = abs(distance - target_distance)
            if distance_error < best_distance_error:
                best_velocity = mid_velocity
                best_distance_error = distance_error

            # ปรับช่วงการค้นหา
            if distance < target_distance:
                min_velocity = mid_velocity
            else:
                max_velocity = mid_velocity

            # ถ้าใกล้เคียงพอแล้ว ให้หยุด
            if distance_error < 0.01:
                break

        return True, (angle, best_velocity)

    def calculate_optimal_parameters(self, target_distance, fixed_params=None):
        """
        คำนวณหาค่าพารามิเตอร์ที่เหมาะสมที่สุด (มุมและความเร็ว) เพื่อให้ลูกตกที่ระยะเป้าหมาย

        Args:
            target_distance (float): ระยะเป้าหมายที่ต้องการให้ลูกตก (เมตร)
            fixed_params (dict, optional): พารามิเตอร์ที่ต้องการให้คงที่ (ถ้าไม่กำหนดจะปรับทั้งมุมและความเร็ว)
                - 'angle': กำหนดมุมคงที่และหาเฉพาะความเร็ว
                - 'velocity': กำหนดความเร็วคงที่และหาเฉพาะมุม

        Returns:
            tuple: (success, result) โดย result เป็น tuple ของ (angle, velocity)
        """
        # ตรวจสอบว่าระยะเป้าหมายอยู่ในช่วงที่เป็นไปได้หรือไม่
        if not (
            self.target_area.min_distance
            <= target_distance
            <= self.target_area.max_distance
        ):
            return (
                False,
                f"Target distance must be between {self.target_area.min_distance:.2f} and {self.target_area.max_distance:.2f} meters",
            )

        if fixed_params is None:
            fixed_params = {}

        fix_angle = "angle" in fixed_params
        fix_velocity = "velocity" in fixed_params

        if fix_angle and fix_velocity:
            angle = fixed_params["angle"]
            velocity = fixed_params["velocity"]
            distance = self.ball_physics.get_landing_distance(
                self.striker_settings.release_height,
                velocity,
                angle,
                self.striker_settings.strike_height,
            )
            error = abs(distance - target_distance)
            if error < 0.1:
                return (True, (angle, velocity))
            else:
                return (
                    False,
                    f"Fixed parameters result in landing distance of {distance:.2f}m (error: {error:.2f}m)",
                )
        elif fix_angle:
            angle = fixed_params["angle"]
            return self.calculate_optimal_velocity(target_distance, angle)
        elif fix_velocity:
            original_velocity = self.striker_settings.strike_velocity
            self.striker_settings.strike_velocity = fixed_params["velocity"]
            result = self.calculate_optimal_angle(target_distance)
            self.striker_settings.strike_velocity = original_velocity
            return result
        else:
            # ปรับปรุงส่วน Initial Guesses
            test_angles = []
            test_velocities = []

            if target_distance <= 1.5:  # ระยะใกล้
                test_angles = [25, 30, 35]
                test_velocities = [3, 4, 5]
            elif target_distance <= 2.5:  # ระยะกลาง
                test_angles = [35, 40, 45, 50]
                test_velocities = [4.5, 5.5, 6.5]
            elif target_distance <= 3.5:  # ระยะไกลปานกลาง (สำหรับ extra1)
                test_angles = [40, 45, 50, 55]
                test_velocities = [6, 7, 8, 9]
            else:  # ระยะไกลมาก (สำหรับ extra1 ส่วนปลาย)
                test_angles = [40, 45, 50, 55, 60]
                test_velocities = [8, 9, 10, 11, 12]  # เพิ่มความเร็วที่สูงขึ้น

            angle_min_config, angle_max_config = (
                self.striker_settings.angle_min,
                self.striker_settings.angle_max,
            )
            velocity_min_config, velocity_max_config = (
                self.striker_settings.velocity_min,
                self.striker_settings.velocity_max,
            )

            best_params = None
            best_error = float("inf")

            for angle_guess in test_angles:
                for velocity_guess in test_velocities:
                    if not (
                        angle_min_config <= angle_guess <= angle_max_config
                    ) or not (
                        velocity_min_config <= velocity_guess <= velocity_max_config
                    ):
                        continue

                    distance = self.ball_physics.get_landing_distance(
                        self.striker_settings.release_height,
                        velocity_guess,
                        angle_guess,
                        self.striker_settings.strike_height,
                    )
                    error = abs(distance - target_distance)

                    if error < best_error:
                        best_error = error
                        best_params = (angle_guess, velocity_guess, distance)

            if best_params:
                # เริ่มต้นการปรับละเอียดจากค่าที่ดีที่สุดที่ได้จากการ guess
                current_angle, current_velocity, _ = best_params

                # Iterative refinement (สามารถปรับปรุงให้ซับซ้อนขึ้นได้ เช่นใช้ step ที่เล็กลงเรื่อยๆ)
                # หรือใช้ optimization algorithm ที่เฉพาะเจาะจงมากขึ้น
                # ในที่นี้จะยังคงการปรับทีละน้อยแบบเดิม แต่เริ่มจากจุดที่ดีขึ้น

                # ปรับมุม
                angle_step = 1.0
                for _ in range(10):  # เพิ่มจำนวนรอบการปรับ
                    dist_current = self.ball_physics.get_landing_distance(
                        self.striker_settings.release_height,
                        current_velocity,
                        current_angle,
                        self.striker_settings.strike_height,
                    )
                    error_current = abs(dist_current - target_distance)

                    dist_up_angle = self.ball_physics.get_landing_distance(
                        self.striker_settings.release_height,
                        current_velocity,
                        current_angle + angle_step,
                        self.striker_settings.strike_height,
                    )
                    error_up_angle = abs(dist_up_angle - target_distance)

                    dist_down_angle = self.ball_physics.get_landing_distance(
                        self.striker_settings.release_height,
                        current_velocity,
                        current_angle - angle_step,
                        self.striker_settings.strike_height,
                    )
                    error_down_angle = abs(dist_down_angle - target_distance)

                    if (
                        error_up_angle < error_current
                        and error_up_angle <= error_down_angle
                        and (current_angle + angle_step) <= angle_max_config
                    ):
                        current_angle += angle_step
                    elif (
                        error_down_angle < error_current
                        and (current_angle - angle_step) >= angle_min_config
                    ):
                        current_angle -= angle_step
                    else:
                        angle_step /= 2  # ลด step ถ้าไม่ดีขึ้น

                    if angle_step < 0.05 or abs(error_current) < 0.01:  # เกณฑ์การหยุด
                        break

                # ปรับความเร็ว
                velocity_step = 0.25
                for _ in range(10):  # เพิ่มจำนวนรอบการปรับ
                    dist_current = self.ball_physics.get_landing_distance(
                        self.striker_settings.release_height,
                        current_velocity,
                        current_angle,
                        self.striker_settings.strike_height,
                    )
                    error_current = abs(dist_current - target_distance)

                    dist_up_vel = self.ball_physics.get_landing_distance(
                        self.striker_settings.release_height,
                        current_velocity + velocity_step,
                        current_angle,
                        self.striker_settings.strike_height,
                    )
                    error_up_vel = abs(dist_up_vel - target_distance)

                    dist_down_vel = self.ball_physics.get_landing_distance(
                        self.striker_settings.release_height,
                        current_velocity - velocity_step,
                        current_angle,
                        self.striker_settings.strike_height,
                    )
                    error_down_vel = abs(dist_down_vel - target_distance)

                    if (
                        error_up_vel < error_current
                        and error_up_vel <= error_down_vel
                        and (current_velocity + velocity_step) <= velocity_max_config
                    ):
                        current_velocity += velocity_step
                    elif (
                        error_down_vel < error_current
                        and (current_velocity - velocity_step) >= velocity_min_config
                    ):
                        current_velocity -= velocity_step
                    else:
                        velocity_step /= 2  # ลด step ถ้าไม่ดีขึ้น

                    if velocity_step < 0.05 or abs(error_current) < 0.01:  # เกณฑ์การหยุด
                        break

                # ตรวจสอบว่าค่าสุดท้ายยังอยู่ในช่วงที่กำหนด
                current_angle = max(
                    angle_min_config, min(angle_max_config, current_angle)
                )
                current_velocity = max(
                    velocity_min_config, min(velocity_max_config, current_velocity)
                )

                return (True, (current_angle, current_velocity))

            return (
                False,
                "Could not find suitable initial parameters for optimization.",
            )

    def save_settings(self, filename):
        """Save current settings to a file"""
        settings = {
            "striker": self.striker_settings.get_settings(),
            "field": self.field_settings.get_settings(),
            "target_area": self.target_area.get_field_dimensions(),
            "physics": {
                "gravity": self.ball_physics.gravity,
                "ball_mass": self.ball_physics.ball_mass,
                "air_resistance": self.ball_physics.air_resistance,
                "elasticity": self.ball_physics.elasticity,
            },
        }

        try:
            with open(filename, "w") as file:
                json.dump(settings, file, indent=4)
            return True, f"Settings saved to {filename}"
        except Exception as e:
            return False, f"Error saving settings: {str(e)}"

    def load_settings(self, filename):
        """Load settings from a file"""
        try:
            with open(filename, "r") as file:
                settings = json.load(file)

            # Update striker settings
            if "striker" in settings:
                self.striker_settings.set_settings(settings["striker"])

            # Update field settings
            if "field" in settings:
                self.field_settings.set_settings(settings["field"])

            # Update target area
            if "target_area" in settings:
                self.target_area.set_field_dimensions(
                    settings["target_area"]["min_distance"],
                    settings["target_area"]["max_distance"],
                    settings["target_area"].get("field_type", "custom"),
                )

            # Update physics parameters
            if "physics" in settings:
                self.ball_physics.gravity = settings["physics"].get("gravity", 9.81)
                self.ball_physics.ball_mass = settings["physics"].get(
                    "ball_mass", 0.024
                )
                self.ball_physics.air_resistance = settings["physics"].get(
                    "air_resistance", 0.001
                )
                self.ball_physics.elasticity = settings["physics"].get(
                    "elasticity", 0.4
                )

            return True, f"Settings loaded from {filename}"
        except Exception as e:
            return False, f"Error loading settings: {str(e)}"


def main():
    """Main function to run the simulation"""
    root = tk.Tk()
    app = SimulationGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()

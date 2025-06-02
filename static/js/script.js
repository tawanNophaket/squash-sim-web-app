// Global variables
let trajectoryChartSideView = null;
let trajectoryChartTopView = null;
let fieldChart2D = null;

let currentRawZonesData = [];
let currentFieldType = "standard";
let fieldInfoExpanded = false;

const zoneColors = [
  "#FF6347",
  "#FFD700",
  "#ADFF2F",
  "#87CEEB",
  "#9370DB",
  "#FFA07A",
  "#FF8C00",
  "#32CD32",
  "#00CED1",
  "#BA55D3",
  "#F08080",
  "#FF69B4",
  "#7FFF00",
  "#40E0D0",
  "#8A2BE2",
];

// --- ส่วนของ Message Box, Debug Info, showCustomMessage, setButtonDisabled ไม่มีการเปลี่ยนแปลง ---
let debugInfo = { lastRequest: null, lastResponse: null, errors: [] };
function addDebugInfo(type, data) {
  if (type === "request") debugInfo.lastRequest = data;
  else if (type === "response") debugInfo.lastResponse = data;
  else if (type === "error")
    debugInfo.errors.push({
      time: new Date().toLocaleTimeString(),
      error: data,
    });
  updateDebugInfoDisplay();
}
function updateDebugInfoDisplay() {
  const debugInfoContent = document.getElementById("debug-info-content");
  if (!debugInfoContent) return;
  let content = "=== ข้อมูลดีบัก ===\n\n";
  content += "--- คำขอล่าสุด ---\n";
  content += debugInfo.lastRequest
    ? JSON.stringify(debugInfo.lastRequest, null, 2)
    : "ไม่มีข้อมูลคำขอ";
  content += "\n\n";
  content += "--- การตอบกลับล่าสุด ---\n";
  content += debugInfo.lastResponse
    ? JSON.stringify(debugInfo.lastResponse, null, 2)
    : "ไม่มีข้อมูลการตอบกลับ";
  content += "\n\n";
  content += "--- ข้อผิดพลาด ---\n";
  if (debugInfo.errors.length > 0) {
    debugInfo.errors.forEach((error, index) => {
      let errorMsg = error.error;
      if (typeof error.error === "object" && error.error !== null) {
        errorMsg = JSON.stringify(error.error);
      } else if (error.error === undefined && error.message) {
        errorMsg = error.message;
      }
      content += `[${error.time}] Error ${index + 1}: ${errorMsg}\n`;
    });
  } else {
    content += "ไม่พบข้อผิดพลาด";
  }
  debugInfoContent.textContent = content;
}
function toggleDebugInfo() {
  const debugInfoContent = document.getElementById("debug-info-content");
  if (!debugInfoContent) return;
  debugInfoContent.style.display =
    debugInfoContent.style.display === "none" ? "block" : "none";
}
function showCustomMessage(message, type = "info") {
  const notification = document.getElementById("notification");
  if (!notification) return;
  const messageEl = document.getElementById("notification-message");
  const iconEl = notification.querySelector(".notification-icon");
  messageEl.textContent = message;
  iconEl.innerHTML = "";
  switch (type) {
    case "success":
      iconEl.innerHTML =
        '<i class="fas fa-check-circle" style="color: #00e676;"></i>';
      break;
    case "error":
      iconEl.innerHTML =
        '<i class="fas fa-times-circle" style="color: #ff5252;"></i>';
      break;
    case "warning":
      iconEl.innerHTML =
        '<i class="fas fa-exclamation-triangle" style="color: #ffab40;"></i>';
      break;
    default:
      iconEl.innerHTML =
        '<i class="fas fa-info-circle" style="color: #64b5f6;"></i>';
      break;
  }
  notification.classList.add("show");
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}
function setButtonDisabled(buttonId, isDisabled) {
  const button = document.getElementById(buttonId);
  if (button) button.disabled = isDisabled;
}
// --- สิ้นสุดส่วนที่ไม่เปลี่ยนแปลง ---

document.addEventListener("DOMContentLoaded", function () {
  setupAllCharts();
  initializeEventListeners();
  fetchFieldInfo();

  setTimeout(() => {
    showCustomMessage("Welcome to Group 11 Simulation!", "info");
  }, 1000);

  if (document.querySelector(".tab-btn")) {
    openTab("simulator");
  }
});

function setupAllCharts() {
  setupTrajectoryChartSideView();
  setupTrajectoryChartTopView();
  setupFieldChart2D();
}

function initializeEventListeners() {
  const strikeHeightSlider = document.getElementById("strike-height");
  if (strikeHeightSlider)
    strikeHeightSlider.addEventListener("input", (e) => {
      document.getElementById("height-value").textContent =
        e.target.value + " m";
    });

  const strikeAngleElevationSlider = document.getElementById(
    "strike-angle-elevation"
  );
  if (strikeAngleElevationSlider)
    strikeAngleElevationSlider.addEventListener("input", (e) => {
      document.getElementById("angle-elevation-value").textContent =
        parseFloat(e.target.value).toFixed(1) + "°";
    });

  const strikeAzimuthAngleSlider = document.getElementById(
    "strike-azimuth-angle"
  );
  if (strikeAzimuthAngleSlider)
    strikeAzimuthAngleSlider.addEventListener("input", (e) => {
      document.getElementById("angle-azimuth-value").textContent =
        parseFloat(e.target.value).toFixed(1) + "°";
    });

  const strikeVelocitySlider = document.getElementById("strike-velocity");
  if (strikeVelocitySlider)
    strikeVelocitySlider.addEventListener("input", (e) => {
      document.getElementById("velocity-value").textContent =
        parseFloat(e.target.value).toFixed(2) + " m/s";
    });

  const targetXInput = document.getElementById("target-x");
  const targetZInput = document.getElementById("target-z");
  if (targetXInput)
    targetXInput.addEventListener("input", updateTargetZoneIndicator2D);
  if (targetZInput)
    targetZInput.addEventListener("input", updateTargetZoneIndicator2D);

  const fieldTypeSelect = document.getElementById("field-type");
  if (fieldTypeSelect)
    fieldTypeSelect.addEventListener("change", handleFieldTypeChange);

  const fixElevationAngleCheckbox = document.getElementById(
    "fix-elevation-angle"
  );
  const fixAzimuthAngleCheckbox = document.getElementById("fix-azimuth-angle");
  const fixVelocityCheckbox = document.getElementById("fix-velocity");

  if (fixElevationAngleCheckbox)
    fixElevationAngleCheckbox.addEventListener(
      "change",
      checkConflictingOptimizeOptions
    );
  if (fixAzimuthAngleCheckbox)
    fixAzimuthAngleCheckbox.addEventListener(
      "change",
      checkConflictingOptimizeOptions
    );
  if (fixVelocityCheckbox)
    fixVelocityCheckbox.addEventListener(
      "change",
      checkConflictingOptimizeOptions
    );

  // เพิ่ม Event Listeners สำหรับ Physics Settings ในแท็บ "ตั้งค่า"
  const physicsInputs = [
    "gravity",
    "ball-mass",
    "air-density",
    "drag-coefficient",
    "elasticity",
  ];
  physicsInputs.forEach((id) => {
    const inputElement = document.getElementById(id);
    if (inputElement) {
      // โหลดค่าเริ่มต้นจาก localStorage ถ้ามี
      const storedValue = localStorage.getItem(`physics_${id}`);
      if (storedValue !== null) {
        inputElement.value = storedValue;
      }
      // เพิ่ม event listener เพื่อบันทึกเมื่อมีการเปลี่ยนแปลง
      inputElement.addEventListener("change", (e) => {
        localStorage.setItem(`physics_${id}`, e.target.value);
        // อาจจะเพิ่มการ show message ว่าบันทึกแล้ว
        // showCustomMessage(`บันทึก ${id} เป็น ${e.target.value} แล้ว`, "info", 1500);
      });
    }
  });

  const adjElInput = document.getElementById("adjusted-elevation-angle-input");
  const adjAzInput = document.getElementById("adjusted-azimuth-angle-input");
  const adjVelInput = document.getElementById("adjusted-velocity-input");

  if (adjElInput)
    adjElInput.addEventListener("input", () =>
      validateNumericInputAgainstRange(adjElInput)
    );
  if (adjAzInput)
    adjAzInput.addEventListener("input", () =>
      validateNumericInputAgainstRange(adjAzInput)
    );
  if (adjVelInput)
    adjVelInput.addEventListener("input", () =>
      validateNumericInputAgainstRange(adjVelInput)
    );

  const simulateAdjustedBtn = document.getElementById(
    "simulate-adjusted-optimal-btn"
  );
  if (simulateAdjustedBtn) {
    simulateAdjustedBtn.addEventListener("click", () => {
      const elValid = adjElInput
        ? validateNumericInputAgainstRange(adjElInput)
        : true;
      const azValid = adjAzInput
        ? validateNumericInputAgainstRange(adjAzInput)
        : true;
      const velValid = adjVelInput
        ? validateNumericInputAgainstRange(adjVelInput)
        : true;

      if (!elValid || !azValid || !velValid) {
        showCustomMessage(
          "ค่าที่ป้อนสำหรับทดลองอยู่นอกช่วงที่แนะนำ (±5%) กรุณาแก้ไข",
          "warning"
        );
        return;
      }

      const newElevation = parseFloat(adjElInput.value);
      const newAzimuth = parseFloat(adjAzInput.value);
      const newVelocity = parseFloat(adjVelInput.value);

      // Update main simulator sliders and their display values
      const mainElSlider = document.getElementById("strike-angle-elevation");
      const mainElValue = document.getElementById("angle-elevation-value");
      if (mainElSlider && mainElValue && !isNaN(newElevation)) {
        mainElSlider.value = newElevation.toFixed(1);
        mainElValue.textContent = newElevation.toFixed(1) + "°";
      }

      const mainAzSlider = document.getElementById("strike-azimuth-angle");
      const mainAzValue = document.getElementById("angle-azimuth-value");
      if (mainAzSlider && mainAzValue && !isNaN(newAzimuth)) {
        mainAzSlider.value = newAzimuth.toFixed(1);
        mainAzValue.textContent = newAzimuth.toFixed(1) + "°";
      }

      const mainVelSlider = document.getElementById("strike-velocity");
      const mainVelValue = document.getElementById("velocity-value");
      if (mainVelSlider && mainVelValue && !isNaN(newVelocity)) {
        mainVelSlider.value = newVelocity.toFixed(2);
        mainVelValue.textContent = newVelocity.toFixed(2) + " m/s";
      }

      showCustomMessage("กำลังจำลองด้วยค่าที่ปรับแล้วจากส่วนทดลอง...", "info");
      setTimeout(() => startSimulation(), 100);
    });
  }

  const optElInput = document.getElementById("optimized-elevation-angle-input");
  const optAzInput = document.getElementById("optimized-azimuth-angle-input");
  const optVelInput = document.getElementById("optimized-velocity-input");

  if (optElInput)
    optElInput.addEventListener("input", () =>
      validateNumericInputAgainstRange(optElInput)
    );
  if (optAzInput)
    optAzInput.addEventListener("input", () =>
      validateNumericInputAgainstRange(optAzInput)
    );
  if (optVelInput)
    optVelInput.addEventListener("input", () =>
      validateNumericInputAgainstRange(optVelInput)
    );

  const simulateWithOptimalBtn = document.getElementById(
    "simulate-with-optimal-inputs-btn"
  );
  if (simulateWithOptimalBtn) {
    simulateWithOptimalBtn.addEventListener("click", () => {
      const elValid = optElInput
        ? validateNumericInputAgainstRange(optElInput)
        : true;
      const azValid = optAzInput
        ? validateNumericInputAgainstRange(optAzInput)
        : true;
      const velValid = optVelInput
        ? validateNumericInputAgainstRange(optVelInput)
        : true;

      if (!elValid || !azValid || !velValid) {
        showCustomMessage(
          "ค่าที่ป้อนสำหรับมุม/ความเร็วที่เหมาะสมที่สุด อยู่นอกช่วงที่แนะนำ (±5%) กรุณาแก้ไข",
          "warning"
        );
        return;
      }

      const newElevation = parseFloat(optElInput.value);
      const newAzimuth = parseFloat(optAzInput.value);
      const newVelocity = parseFloat(optVelInput.value);

      // Update main simulator sliders and their display values
      const mainElSlider = document.getElementById("strike-angle-elevation");
      const mainElValue = document.getElementById("angle-elevation-value");
      if (mainElSlider && mainElValue && !isNaN(newElevation)) {
        mainElSlider.value = newElevation.toFixed(1);
        mainElValue.textContent = newElevation.toFixed(1) + "°";
      }

      const mainAzSlider = document.getElementById("strike-azimuth-angle");
      const mainAzValue = document.getElementById("angle-azimuth-value");
      if (mainAzSlider && mainAzValue && !isNaN(newAzimuth)) {
        mainAzSlider.value = newAzimuth.toFixed(1);
        mainAzValue.textContent = newAzimuth.toFixed(1) + "°";
      }

      const mainVelSlider = document.getElementById("strike-velocity");
      const mainVelValue = document.getElementById("velocity-value");
      if (mainVelSlider && mainVelValue && !isNaN(newVelocity)) {
        mainVelSlider.value = newVelocity.toFixed(2);
        mainVelValue.textContent = newVelocity.toFixed(2) + " m/s";
      }

      showCustomMessage(
        "กำลังจำลองด้วยค่าที่แสดง/ปรับแล้วจากส่วน Optimized Parameters...",
        "info"
      );
      setTimeout(() => startSimulation(), 100);
    });
  }

  checkConflictingOptimizeOptions();
}

function checkConflictingOptimizeOptions() {
  const fixElevation = document.getElementById("fix-elevation-angle")?.checked;
  const fixAzimuth = document.getElementById("fix-azimuth-angle")?.checked;
  const fixVelocity = document.getElementById("fix-velocity")?.checked;
  const optimizeBtn = document.getElementById("optimize-btn");

  if (optimizeBtn) {
    if (fixElevation && fixAzimuth && fixVelocity) {
      showCustomMessage(
        "ไม่สามารถปรับให้เหมาะสมได้หากพารามิเตอร์ทั้งหมด (มุมเงย, มุมทิศ, ความเร็ว) ถูกตรึงค่า",
        "warning"
      );
      optimizeBtn.disabled = true;
    } else {
      optimizeBtn.disabled = false;
    }
  }
}

function fetchFieldInfo() {
  fetch("/api/field_info")
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          const errorMsg = err.error || `Network error: ${response.status}`;
          console.error(
            "Field info fetch error (response not ok):",
            errorMsg,
            err
          );
          throw new Error(errorMsg);
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Fetched field_info:", data);
      if (data.dimensions) {
        currentFieldType = data.dimensions.field_type || "standard";
        const fieldTypeDropdown = document.getElementById("field-type");
        if (fieldTypeDropdown) fieldTypeDropdown.value = currentFieldType;

        updateSliderRange(
          "strike-angle-elevation",
          data.dimensions.elevation_angle_min,
          data.dimensions.elevation_angle_max
        );
        updateSliderRange(
          "strike-azimuth-angle",
          data.dimensions.azimuth_angle_min,
          data.dimensions.azimuth_angle_max
        );
        updateSliderRange(
          "strike-velocity",
          data.dimensions.velocity_min,
          data.dimensions.velocity_max
        );
      }
      if (data.zones_data && Array.isArray(data.zones_data)) {
        currentRawZonesData = data.zones_data;
        console.log(
          "CurrentRawZonesData SET in fetchFieldInfo:",
          JSON.parse(JSON.stringify(currentRawZonesData))
        );
      } else {
        console.warn(
          "No valid zones_data received from /api/field_info. Using empty array."
        );
        currentRawZonesData = [];
      }
      updateFieldChart2D();
      updateTargetZoneIndicator2D();
    })
    .catch((error) => {
      console.error("Error fetching field info (catch block):", error);
      showCustomMessage(
        "ไม่สามารถโหลดข้อมูลสนามได้: " + error.message,
        "error"
      );
      currentRawZonesData = [];
      updateFieldChart2D();
    });
}

function updateSliderRange(sliderId, minVal, maxVal) {
  const slider = document.getElementById(sliderId);
  if (slider && minVal !== undefined && maxVal !== undefined) {
    const numMin = parseFloat(minVal);
    const numMax = parseFloat(maxVal);
    if (isNaN(numMin) || isNaN(numMax)) {
      console.error(`Invalid min/max for slider ${sliderId}:`, minVal, maxVal);
      return;
    }
    slider.min = numMin;
    slider.max = numMax;

    const valueDisplayId =
      sliderId.replace("strike-", "").replace("-angle", "") + "-value";
    const valueDisplay = document.getElementById(valueDisplayId);

    if (valueDisplay) {
      let currentValue = parseFloat(slider.value);
      if (isNaN(currentValue)) currentValue = (numMin + numMax) / 2;
      if (currentValue < numMin) slider.value = numMin;
      else if (currentValue > numMax) slider.value = numMax;
      valueDisplay.textContent =
        parseFloat(slider.value).toFixed(
          sliderId.includes("velocity") ? 2 : 1
        ) + (sliderId.includes("velocity") ? " m/s" : "°");
    }
  }
}

function handleFieldTypeChange() {
  currentFieldType = document.getElementById("field-type").value;
  console.log("Field type changed to:", currentFieldType);

  fetch("/api/change_field", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field_type: currentFieldType }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          const errorMsg = err.error || `Network error: ${response.status}`;
          console.error("Change field error (response not ok):", errorMsg, err);
          throw new Error(errorMsg);
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Response from change_field:", data);
      if (data.zones_data && Array.isArray(data.zones_data)) {
        currentRawZonesData = data.zones_data;
        console.log(
          "CurrentRawZonesData SET in handleFieldTypeChange:",
          JSON.parse(JSON.stringify(currentRawZonesData))
        );
      } else {
        console.warn(
          "No valid zones_data received from /api/change_field for type:",
          currentFieldType
        );
        currentRawZonesData = [];
      }
      updateFieldChart2D();
      updateTargetZoneIndicator2D();
      showCustomMessage(
        `เปลี่ยนสนามเป็น ${currentFieldType} สำเร็จ`,
        "success"
      );

      if (data.dimensions) {
        updateSliderRange(
          "strike-angle-elevation",
          data.dimensions.elevation_angle_min,
          data.dimensions.elevation_angle_max
        );
        updateSliderRange(
          "strike-azimuth-angle",
          data.dimensions.azimuth_angle_min,
          data.dimensions.azimuth_angle_max
        );
        updateSliderRange(
          "strike-velocity",
          data.dimensions.velocity_min,
          data.dimensions.velocity_max
        );
      }
    })
    .catch((error) => {
      console.error("Error changing field type (catch block):", error);
      showCustomMessage(
        "ไม่สามารถเปลี่ยนประเภทสนามได้: " + error.message,
        "error"
      );
      currentRawZonesData = [];
      updateFieldChart2D();
    });
}

function startSimulation() {
  // อ่านค่า Physics จาก localStorage หรือใช้ค่า default
  const getPhysicsSetting = (id, defaultValue) => {
    const storedValue = localStorage.getItem(`physics_${id}`);
    return storedValue !== null ? parseFloat(storedValue) : defaultValue;
  };

  const payload = {
    release_height: parseFloat(document.getElementById("release-height").value),
    strike_height: parseFloat(document.getElementById("strike-height").value),
    strike_angle_elevation: parseFloat(
      document.getElementById("strike-angle-elevation").value
    ),
    strike_azimuth_angle: parseFloat(
      document.getElementById("strike-azimuth-angle").value
    ),
    strike_velocity: parseFloat(
      document.getElementById("strike-velocity").value
    ),
    show_ideal: document.getElementById("ideal-comparison").checked,
    physics: {
      gravity: getPhysicsSetting("gravity", 9.81),
      ball_mass: getPhysicsSetting("ball-mass", 0.024),
      air_density: getPhysicsSetting("air-density", 1.225),
      drag_coefficient: getPhysicsSetting("drag-coefficient", 0.5),
      elasticity: getPhysicsSetting("elasticity", 0.4),
    },
  };
  addDebugInfo("request", payload);
  setButtonDisabled("start-btn", true);

  fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          const errorMsg = err.error || `API Error: ${response.status}`;
          console.error(
            "Calculate API error (response not ok):",
            errorMsg,
            err
          );
          throw new Error(errorMsg);
        });
      }
      return response.json();
    })
    .then((result) => {
      addDebugInfo("response", result);
      if (result.error) {
        showCustomMessage("เกิดข้อผิดพลาดในการจำลอง: " + result.error, "error");
        return;
      }
      updateSimulationResultsUI(result);
      setTimeout(() => {
        openTab("results");
        showCustomMessage("การจำลองเสร็จสิ้น", "success");
      }, 200);
    })
    .catch((error) => {
      console.error("Error running simulation (catch block):", error);
      addDebugInfo("error", { message: error.message, stack: error.stack });
      showCustomMessage("เกิดข้อผิดพลาดในการจำลอง: " + error.message, "error");
    })
    .finally(() => {
      setButtonDisabled("start-btn", false);
    });
}

function optimizeSettings() {
  // อ่านค่า Physics จาก localStorage หรือใช้ค่า default (เหมือนใน startSimulation)
  const getPhysicsSetting = (id, defaultValue) => {
    const storedValue = localStorage.getItem(`physics_${id}`);
    return storedValue !== null ? parseFloat(storedValue) : defaultValue;
  };

  const payload = {
    target_x: parseFloat(document.getElementById("target-x").value),
    target_z: parseFloat(document.getElementById("target-z").value),
    release_height: parseFloat(document.getElementById("release-height").value),
    strike_height: parseFloat(document.getElementById("strike-height").value),
    current_elevation_angle: parseFloat(
      document.getElementById("strike-angle-elevation").value
    ),
    current_azimuth_angle: parseFloat(
      document.getElementById("strike-azimuth-angle").value
    ),
    current_velocity: parseFloat(
      document.getElementById("strike-velocity").value
    ),
    fixed_params: {
      elevation_angle: document.getElementById("fix-elevation-angle").checked,
      azimuth_angle: document.getElementById("fix-azimuth-angle").checked,
      velocity: document.getElementById("fix-velocity").checked,
    },
    physics: {
      gravity: getPhysicsSetting("gravity", 9.81),
      ball_mass: getPhysicsSetting("ball-mass", 0.024),
      air_density: getPhysicsSetting("air-density", 1.225),
      drag_coefficient: getPhysicsSetting("drag-coefficient", 0.5),
      elasticity: getPhysicsSetting("elasticity", 0.4),
    },
  };
  addDebugInfo("request", payload);
  setButtonDisabled("optimize-btn", true);
  showCustomMessage("กำลังหาค่าที่เหมาะสม...", "info");

  fetch("/api/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          const errorMsg = err.error || `API Error: ${response.status}`;
          console.error("Optimize API error (response not ok):", errorMsg, err);
          throw new Error(errorMsg);
        });
      }
      return response.json();
    })
    .then((result) => {
      addDebugInfo("response", result);
      if (result.error) {
        showCustomMessage(
          "ไม่สามารถหาค่าที่เหมาะสมได้: " + result.error,
          "error"
        );
        return;
      }
      updateOptimizedParamsUI(result);

      if (
        !payload.fixed_params.elevation_angle &&
        result.strike_angle_elevation !== undefined
      ) {
        document.getElementById("strike-angle-elevation").value =
          result.strike_angle_elevation.toFixed(1);
        document.getElementById("angle-elevation-value").textContent =
          result.strike_angle_elevation.toFixed(1) + "°";
      }
      if (
        !payload.fixed_params.azimuth_angle &&
        result.strike_azimuth_angle !== undefined
      ) {
        document.getElementById("strike-azimuth-angle").value =
          result.strike_azimuth_angle.toFixed(1);
        document.getElementById("angle-azimuth-value").textContent =
          result.strike_azimuth_angle.toFixed(1) + "°";
      }
      if (
        !payload.fixed_params.velocity &&
        result.strike_velocity !== undefined
      ) {
        document.getElementById("strike-velocity").value =
          result.strike_velocity.toFixed(2);
        document.getElementById("velocity-value").textContent =
          result.strike_velocity.toFixed(2) + " m/s";
      }

      showCustomMessage(
        "พบค่าที่เหมาะสมแล้ว! กำลังจำลองด้วยค่าใหม่...",
        "success"
      );
      setTimeout(() => startSimulation(), 500);
    })
    .catch((error) => {
      console.error("Error optimizing settings (catch block):", error);
      addDebugInfo("error", { message: error.message, stack: error.stack });
      showCustomMessage(
        "ไม่สามารถหาค่าที่เหมาะสมได้: " + error.message,
        "error"
      );
    })
    .finally(() => {
      setButtonDisabled("optimize-btn", false);
    });
}

function updateSimulationResultsUI(result) {
  document.getElementById("landing-position-x").textContent =
    result.landing_position_x.toFixed(3) + " m";
  document.getElementById("landing-position-z").textContent =
    result.landing_position_z.toFixed(3) + " m";
  document.getElementById("strike-time").textContent =
    result.strike_time.toFixed(3) + " s";

  const targetZoneHitEl = document.getElementById("target-zone-hit");
  const zoneIndex = result.target_zone ? result.target_zone - 1 : -1;

  if (
    zoneIndex >= 0 &&
    currentRawZonesData &&
    zoneIndex < currentRawZonesData.length
  ) {
    const zoneDef = currentRawZonesData[zoneIndex];
    targetZoneHitEl.textContent = zoneDef.id
      ? zoneDef.id
      : "โซน " + (zoneIndex + 1);
    const zoneColor =
      zoneDef.color || zoneColors[zoneIndex % zoneColors.length];
    targetZoneHitEl.style.color = zoneColor;
  } else {
    targetZoneHitEl.textContent = "ไม่พบ";
    targetZoneHitEl.style.color = "";
  }

  updateTrajectoryCharts(
    result.trajectory_x,
    result.trajectory_y,
    result.trajectory_z,
    result.target_zones_data
  );

  const idealGroup = document.querySelector(".ideal-result-group");
  if (result.ideal_trajectory_x && idealGroup) {
    document.getElementById("ideal-landing-x").textContent =
      result.ideal_landing_position_x.toFixed(3) + " m";
    document.getElementById("ideal-landing-z").textContent =
      result.ideal_landing_position_z.toFixed(3) + " m";
    idealGroup.style.display = "grid";
    updateIdealTrajectoryCharts(
      result.ideal_trajectory_x,
      result.ideal_trajectory_y,
      result.ideal_trajectory_z
    );
  } else if (idealGroup) {
    idealGroup.style.display = "none";
    if (trajectoryChartSideView?.data.datasets[1])
      trajectoryChartSideView.data.datasets[1].data = [];
    if (trajectoryChartTopView?.data.datasets[1])
      trajectoryChartTopView.data.datasets[1].data = [];
    trajectoryChartSideView?.update();
    trajectoryChartTopView?.update();
  }

  if (result.optimized_params) {
    updateOptimizedParamsUI({
      strike_angle_elevation: result.optimized_params.strike_angle_elevation,
      strike_azimuth_angle: result.optimized_params.strike_azimuth_angle,
      strike_velocity: result.optimized_params.strike_velocity,
      strike_angle_elevation_range:
        result.optimized_params.strike_angle_elevation_range,
      strike_azimuth_angle_range:
        result.optimized_params.strike_azimuth_angle_range,
      strike_velocity_range: result.optimized_params.strike_velocity_range,
      target_x: result.optimization_target.x,
      target_z: result.optimization_target.z,
      error_distance: result.optimization_error_distance,
      actual_landing_x: result.optimized_actual_landing_x,
      actual_landing_z: result.optimized_actual_landing_z,
    });
  }
}

function updateOptimizedParamsUI(data) {
  document.getElementById("optimal-params-display").style.display = "block";

  const safe = (v, d = 0) => (typeof v === "number" && !isNaN(v) ? v : d);
  const safeArr = (arr, idx, d = 0) =>
    Array.isArray(arr) && typeof arr[idx] === "number" && !isNaN(arr[idx])
      ? arr[idx]
      : d;

  // Update Read-only System Optimized Values
  const sysElVal = document.getElementById("system-optimal-elevation-value");
  const sysAzVal = document.getElementById("system-optimal-azimuth-value");
  const sysVelVal = document.getElementById("system-optimal-velocity-value");

  if (sysElVal)
    sysElVal.textContent = safe(data.strike_angle_elevation).toFixed(1) + "°";
  if (sysAzVal)
    sysAzVal.textContent = safe(data.strike_azimuth_angle).toFixed(1) + "°";
  if (sysVelVal)
    sysVelVal.textContent = safe(data.strike_velocity).toFixed(2) + " m/s";

  // Update Adjustable Input Fields and their Ranges
  const elInput = document.getElementById("optimized-elevation-angle-input");
  const elRangeSpan = document.getElementById(
    "optimized-elevation-angle-range"
  );
  if (elInput) elInput.value = safe(data.strike_angle_elevation).toFixed(1);
  if (elRangeSpan && elInput) {
    const rangeArray = data.strike_angle_elevation_range;
    if (rangeArray && Array.isArray(rangeArray)) {
      elRangeSpan.textContent = `${safeArr(rangeArray, 0).toFixed(
        1
      )}° - ${safeArr(rangeArray, 1).toFixed(1)}°`;
      elInput.dataset.min = safeArr(rangeArray, 0).toFixed(1);
      elInput.dataset.max = safeArr(rangeArray, 1).toFixed(1);
      elInput.style.borderColor = "";
    } else {
      elRangeSpan.textContent = "N/A";
    }
  }

  const azInput = document.getElementById("optimized-azimuth-angle-input");
  const azRangeSpan = document.getElementById("optimized-azimuth-angle-range");
  if (azInput) azInput.value = safe(data.strike_azimuth_angle).toFixed(1);
  if (azRangeSpan && azInput) {
    const rangeArray = data.strike_azimuth_angle_range;
    if (rangeArray && Array.isArray(rangeArray)) {
      azRangeSpan.textContent = `${safeArr(rangeArray, 0).toFixed(
        1
      )}° - ${safeArr(rangeArray, 1).toFixed(1)}°`;
      azInput.dataset.min = safeArr(rangeArray, 0).toFixed(1);
      azInput.dataset.max = safeArr(rangeArray, 1).toFixed(1);
      azInput.style.borderColor = "";
    } else {
      azRangeSpan.textContent = "N/A";
    }
  }

  const velInput = document.getElementById("optimized-velocity-input");
  const velRangeSpan = document.getElementById("optimized-velocity-range");
  if (velInput) velInput.value = safe(data.strike_velocity).toFixed(2);
  if (velRangeSpan && velInput) {
    const rangeArray = data.strike_velocity_range;
    if (rangeArray && Array.isArray(rangeArray)) {
      velRangeSpan.textContent = `${safeArr(rangeArray, 0).toFixed(
        2
      )} - ${safeArr(rangeArray, 1).toFixed(2)} m/s`;
      velInput.dataset.min = safeArr(rangeArray, 0).toFixed(2);
      velInput.dataset.max = safeArr(rangeArray, 1).toFixed(2);
      velInput.style.borderColor = "";
    } else {
      velRangeSpan.textContent = "N/A";
    }
  }

  // The following elements for target_x, target_z, error_distance, actual_landing_x, actual_landing_z
  // were removed from HTML, so their update lines are removed from here.
}

// Function to validate input fields (can be reused)
function validateNumericInputAgainstRange(inputElement) {
  const value = parseFloat(inputElement.value);
  const min = parseFloat(inputElement.dataset.min);
  const max = parseFloat(inputElement.dataset.max);

  if (isNaN(value) || value < min || value > max) {
    inputElement.style.borderColor = "red";
    return false;
  } else {
    inputElement.style.borderColor = ""; // Or your default border color
    return true;
  }
}

function updateTrajectoryCharts(trajX, trajY, trajZ, zonesDataFromCalc) {
  if (!trajX || !trajY || !trajZ) return;
  const activeZones = zonesDataFromCalc || currentRawZonesData;

  if (trajectoryChartSideView) {
    const sideViewData = trajZ.map((z, i) => ({ x: z, y: trajY[i] }));
    trajectoryChartSideView.data.datasets[0].data = sideViewData;
    if (sideViewData.length > 0) {
      const landingPoint = sideViewData[sideViewData.length - 1];
      trajectoryChartSideView.data.datasets[2].data = [
        { x: landingPoint.x, y: 0 },
      ];
    } else {
      trajectoryChartSideView.data.datasets[2].data = [];
    }
    draw1DRadialZonesOnChart(trajectoryChartSideView, activeZones, "side");
    trajectoryChartSideView.update();
  }

  if (trajectoryChartTopView) {
    const topViewData = trajX.map((x, i) => ({ x: x, y: trajZ[i] }));
    trajectoryChartTopView.data.datasets[0].data = topViewData;
    if (topViewData.length > 0) {
      const landingPoint = topViewData[topViewData.length - 1];
      trajectoryChartTopView.data.datasets[2].data = [
        { x: landingPoint.x, y: landingPoint.y },
      ];
    } else {
      trajectoryChartTopView.data.datasets[2].data = [];
    }
    draw2DFieldZonesOnChart(trajectoryChartTopView, activeZones, "top");
    trajectoryChartTopView.update();
  }
}

function updateIdealTrajectoryCharts(idealX, idealY, idealZ) {
  if (!idealX || !idealY || !idealZ) return;

  if (trajectoryChartSideView && trajectoryChartSideView.data.datasets[1]) {
    const idealSideData = idealZ.map((z, i) => ({ x: z, y: idealY[i] }));
    trajectoryChartSideView.data.datasets[1].data = idealSideData;
    trajectoryChartSideView.data.datasets[1].hidden = false;
    trajectoryChartSideView.update();
  }
  if (trajectoryChartTopView && trajectoryChartTopView.data.datasets[1]) {
    const idealTopData = idealX.map((x, i) => ({ x: x, y: idealZ[i] }));
    trajectoryChartTopView.data.datasets[1].data = idealTopData;
    trajectoryChartTopView.data.datasets[1].hidden = false;
    trajectoryChartTopView.update();
  }
}

function draw1DRadialZonesOnChart(chartInstance, zonesData, viewType) {
  if (
    !chartInstance ||
    !chartInstance.options ||
    !chartInstance.options.plugins ||
    !chartInstance.options.plugins.annotation
  ) {
    console.warn(
      "Chart instance or annotation plugin not ready for draw1DRadialZonesOnChart"
    );
    return;
  }
  chartInstance.options.plugins.annotation.annotations = {};

  if (!zonesData || !Array.isArray(zonesData)) {
    chartInstance.update();
    return;
  }

  const applicableZones = zonesData.filter(
    (zd) => zd && zd.shape === "radial1d"
  );
  if (applicableZones.length === 0) {
    chartInstance.update();
    return;
  }

  const annotations = {};
  applicableZones.forEach((zoneDef, index) => {
    const min_r = zoneDef.r_min;
    const max_r = zoneDef.r_max;
    const color = zoneDef.color || zoneColors[index % zoneColors.length];
    const label = zoneDef.id || `โซนรัศมี ${index + 1}`;

    if (viewType === "side" && min_r !== undefined && max_r !== undefined) {
      annotations[`zoneBox_side_${index}`] = {
        type: "box",
        xMin: min_r,
        xMax: max_r,
        yMin: -0.05,
        yMax: 0.05,
        backgroundColor: color + "33",
        borderColor: color,
        borderWidth: 1,
        drawTime: "beforeDatasetsDraw",
      };
      annotations[`zoneLabel_side_${index}`] = {
        type: "label",
        xValue: (min_r + max_r) / 2,
        yValue: 0.1,
        content: label,
        color: "#ffffff",
        font: { size: 9, weight: "bold" },
        backgroundColor: color + "AA",
        padding: 2,
      };
    }
  });
  chartInstance.options.plugins.annotation.annotations = annotations;
  chartInstance.update();
}

function draw2DFieldZonesOnChart(chartInstance, zonesData, viewType) {
  if (
    !chartInstance ||
    !chartInstance.options ||
    !chartInstance.options.plugins ||
    !chartInstance.options.plugins.annotation
  ) {
    console.warn(
      "Chart instance or annotation plugin not ready for draw2DFieldZonesOnChart"
    );
    return;
  }
  chartInstance.options.plugins.annotation.annotations = {};

  if (!zonesData || !Array.isArray(zonesData)) {
    chartInstance.update();
    return;
  }

  const applicableZones = zonesData.filter(
    (zd) => zd && (zd.shape === "sector" || zd.shape === "rect")
  );
  if (applicableZones.length === 0) {
    chartInstance.update();
    return;
  }

  const annotations = {};
  applicableZones.forEach((zoneDef, index) => {
    const color = zoneDef.color || zoneColors[index % zoneColors.length];
    const label = zoneDef.id || `โซน ${index + 1}`;
    const annotationId = `zone_ann_top_${
      zoneDef.id ? zoneDef.id.replace(/\s+/g, "_") : index
    }`;

    if (
      viewType === "top" &&
      zoneDef.shape === "rect" &&
      zoneDef.x_min !== undefined
    ) {
      annotations[annotationId] = {
        id: annotationId,
        type: "box",
        xMin: zoneDef.x_min,
        xMax: zoneDef.x_max,
        yMin: zoneDef.z_min,
        yMax: zoneDef.z_max,
        backgroundColor: color + "33",
        borderColor: color,
        borderWidth: 1,
        drawTime: "beforeDatasetsDraw",
        label: {
          content: label,
          enabled: true,
          color: "white",
          font: { size: 9 },
          backgroundColor: color + "AA",
          padding: 2,
          position: "center",
        },
      };
    } else if (
      viewType === "top" &&
      zoneDef.shape === "sector" &&
      zoneDef.r_min !== undefined &&
      zoneDef.az_min !== undefined &&
      zoneDef.az_max !== undefined
    ) {
      const points = [];
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const angle = Math.radians(
          zoneDef.az_min + (zoneDef.az_max - zoneDef.az_min) * (i / steps)
        );
        points.push({
          x: zoneDef.r_max * Math.sin(angle),
          y: zoneDef.r_max * Math.cos(angle),
        });
      }
      for (let i = steps; i >= 0; i--) {
        const angle = Math.radians(
          zoneDef.az_min + (zoneDef.az_max - zoneDef.az_min) * (i / steps)
        );
        points.push({
          x: zoneDef.r_min * Math.sin(angle),
          y: zoneDef.r_min * Math.cos(angle),
        });
      }
      if (points.length > 0) {
        annotations[annotationId] = {
          id: annotationId,
          type: "polygon",
          points: points,
          backgroundColor: color + "33",
          borderColor: color,
          borderWidth: 1,
          label: {
            content: label,
            enabled: true,
            color: "white",
            font: { size: 9 },
            backgroundColor: color + "AA",
            padding: 2,
            position: "center",
          },
        };
      }
    }
  });
  chartInstance.options.plugins.annotation.annotations = annotations;
  chartInstance.update();
}

function updateTargetZoneIndicator2D() {
  const targetXStr = document.getElementById("target-x").value;
  const targetZStr = document.getElementById("target-z").value;
  const indicatorEl = document.getElementById("indicator-zone-2d");

  if (!indicatorEl) return;

  const targetX = parseFloat(targetXStr);
  const targetZ = parseFloat(targetZStr);

  if (
    isNaN(targetX) ||
    isNaN(targetZ) ||
    !currentRawZonesData ||
    !Array.isArray(currentRawZonesData) ||
    currentRawZonesData.length === 0
  ) {
    indicatorEl.textContent = "ไม่มีข้อมูล";
    indicatorEl.style.backgroundColor = "#607D8B";
    return;
  }

  let zoneHitIndex = -1;
  let hitZoneDef = null;

  const targetR = Math.sqrt(targetX * targetX + targetZ * targetZ);
  const targetAzimuthDegrees = Math.degrees(Math.atan2(targetX, targetZ));

  for (let i = 0; i < currentRawZonesData.length; i++) {
    const zoneDef = currentRawZonesData[i];
    if (!zoneDef || !zoneDef.shape) continue;

    if (
      zoneDef.shape === "sector" &&
      zoneDef.r_min !== undefined &&
      zoneDef.r_max !== undefined &&
      zoneDef.az_min !== undefined &&
      zoneDef.az_max !== undefined
    ) {
      if (
        targetR >= zoneDef.r_min &&
        targetR < zoneDef.r_max &&
        targetAzimuthDegrees >= zoneDef.az_min &&
        targetAzimuthDegrees < zoneDef.az_max
      ) {
        zoneHitIndex = i;
        hitZoneDef = zoneDef;
        break;
      }
    } else if (
      zoneDef.shape === "rect" &&
      zoneDef.x_min !== undefined &&
      zoneDef.x_max !== undefined &&
      zoneDef.z_min !== undefined &&
      zoneDef.z_max !== undefined
    ) {
      if (
        targetX >= zoneDef.x_min &&
        targetX < zoneDef.x_max &&
        targetZ >= zoneDef.z_min &&
        targetZ < zoneDef.z_max
      ) {
        zoneHitIndex = i;
        hitZoneDef = zoneDef;
        break;
      }
    } else if (
      zoneDef.shape === "radial1d" &&
      zoneDef.r_min !== undefined &&
      zoneDef.r_max !== undefined
    ) {
      if (targetR >= zoneDef.r_min && targetR < zoneDef.r_max) {
        zoneHitIndex = i;
        hitZoneDef = zoneDef;
        break;
      }
    }
  }

  if (hitZoneDef) {
    indicatorEl.textContent = hitZoneDef.id || `โซน ${zoneHitIndex + 1}`;
    indicatorEl.style.backgroundColor =
      hitZoneDef.color || zoneColors[zoneHitIndex % zoneColors.length];
  } else {
    indicatorEl.textContent = "ไม่พบ";
    indicatorEl.style.backgroundColor = "#607D8B";
  }
}

Math.radians = function (degrees) {
  return (degrees * Math.PI) / 180;
};
Math.degrees = function (radians) {
  return (radians * 180) / Math.PI;
};

function resetSimulation() {
  document.getElementById("release-height").value = "2.0";
  document.getElementById("strike-height").value = "0.35";
  document.getElementById("height-value").textContent = "0.35 m";

  const elSlider = document.getElementById("strike-angle-elevation");
  if (elSlider) {
    elSlider.value = "45";
    document.getElementById("angle-elevation-value").textContent = "45.0°";
  }

  const azSlider = document.getElementById("strike-azimuth-angle");
  if (azSlider) {
    azSlider.value = "0";
    document.getElementById("angle-azimuth-value").textContent = "0.0°";
  }

  const velSlider = document.getElementById("strike-velocity");
  if (velSlider) {
    velSlider.value = "5.25";
    document.getElementById("velocity-value").textContent = "5.25 m/s";
  }

  document.getElementById("ideal-comparison").checked = false;
  document.getElementById("target-x").value = "0.0";
  document.getElementById("target-z").value = "1.7";

  document.getElementById("fix-elevation-angle").checked = false;
  document.getElementById("fix-azimuth-angle").checked = false;
  document.getElementById("fix-velocity").checked = false;
  checkConflictingOptimizeOptions();

  // Reset Physics Settings ใน UI และ localStorage เป็นค่า default
  const defaultPhysics = {
    gravity: 9.81,
    "ball-mass": 0.024,
    "air-density": 1.225,
    "drag-coefficient": 0.5,
    elasticity: 0.4,
  };
  for (const id in defaultPhysics) {
    const inputElement = document.getElementById(id);
    if (inputElement) {
      inputElement.value = defaultPhysics[id];
      localStorage.setItem(`physics_${id}`, defaultPhysics[id]);
    }
  }

  document.getElementById("landing-position-x").textContent = "0.00 m";
  document.getElementById("landing-position-z").textContent = "0.00 m";
  document.getElementById("target-zone-hit").textContent = "ไม่พบ";
  document.getElementById("strike-time").textContent = "0.00 s";

  const idealGroup = document.querySelector(".ideal-result-group");
  if (idealGroup) idealGroup.style.display = "none";
  const optDisplay = document.getElementById("optimal-params-display");
  if (optDisplay) optDisplay.style.display = "none";

  [trajectoryChartSideView, trajectoryChartTopView, fieldChart2D].forEach(
    (chart) => {
      if (chart) {
        chart.data.datasets.forEach((dataset) => (dataset.data = []));
        if (
          chart.options.plugins.annotation &&
          chart.options.plugins.annotation.annotations
        ) {
          chart.options.plugins.annotation.annotations = {};
        }
        chart.update();
      }
    }
  );

  fetchFieldInfo();

  debugInfo = { lastRequest: null, lastResponse: null, errors: [] };
  updateDebugInfoDisplay();
  showCustomMessage("รีเซ็ตการจำลองแล้ว", "info");
}

function openTab(tabName) {
  const tabContents = document.getElementsByClassName("tab-content");
  for (let i = 0; i < tabContents.length; i++)
    tabContents[i].classList.remove("active");
  const tabButtons = document.getElementsByClassName("tab-btn");
  for (let i = 0; i < tabButtons.length; i++)
    tabButtons[i].classList.remove("active");
  const navButtons = document.getElementsByClassName("nav-btn");
  for (let i = 0; i < navButtons.length; i++)
    navButtons[i].classList.remove("active");

  const currentTab = document.getElementById(tabName);
  if (currentTab) currentTab.classList.add("active");

  document
    .querySelectorAll(
      `.tab-btn[onclick*="${tabName}"], .nav-btn[onclick*="${tabName}"]`
    )
    .forEach((btn) => btn.classList.add("active"));
  updateChartsIfNeeded(tabName);

  if (tabName === "compare") {
    if (typeof initializeCompareTab === "function") {
      initializeCompareTab();
    } else {
      console.error(
        "initializeCompareTab function is not defined. Make sure it is globally available from index.html."
      );
    }
  }
}

function updateChartsIfNeeded(tabName) {
  if (tabName === "results") {
    setTimeout(() => {
      if (trajectoryChartSideView?.resize) trajectoryChartSideView.resize();
      trajectoryChartSideView?.update();
      if (trajectoryChartTopView?.resize) trajectoryChartTopView.resize();
      trajectoryChartTopView?.update();
    }, 10);
  } else if (tabName === "field") {
    setTimeout(() => {
      if (fieldChart2D?.resize) fieldChart2D.resize();
      updateFieldChart2D();
    }, 10);
  }
}

function setupTrajectoryChartSideView() {
  const ctx = document
    .getElementById("trajectory-chart-side-view")
    ?.getContext("2d");
  if (!ctx) {
    console.error("trajectory-chart-side-view canvas not found");
    return;
  }
  Chart.defaults.color = "#e0e0e0";
  trajectoryChartSideView = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "วิถีโคจรของลูก (Z-Y)",
          data: [],
          borderColor: "#03a9f4",
          backgroundColor: "#03a9f4",
          showLine: true,
          pointRadius: 2,
          tension: 0.1,
        },
        {
          label: "วิถีโคจรในอุดมคติ (Z-Y)",
          data: [],
          borderColor: "#e53935",
          backgroundColor: "#e53935",
          showLine: true,
          pointRadius: 0,
          borderDash: [5, 5],
          hidden: true,
          tension: 0.1,
        },
        {
          label: "จุดตกกระทบ (Z)",
          data: [],
          backgroundColor: "#ffc107",
          borderColor: "#ffc107",
          pointRadius: 8,
          pointStyle: "star",
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: "ระยะทางด้านหน้า (Z, ม)" },
          grid: { color: "#424242" },
          ticks: { color: "#e0e0e0" },
        },
        y: {
          title: { display: true, text: "ความสูง (Y, ม)" },
          beginAtZero: true,
          grid: { color: "#424242" },
          ticks: { color: "#e0e0e0" },
        },
      },
      plugins: {
        legend: { labels: { font: { size: 10 }, color: "#e0e0e0" } },
        annotation: { annotations: {} },
      },
    },
  });
}

function setupTrajectoryChartTopView() {
  const ctx = document
    .getElementById("trajectory-chart-top-view")
    ?.getContext("2d");
  if (!ctx) {
    console.error("trajectory-chart-top-view canvas not found");
    return;
  }
  trajectoryChartTopView = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "วิถีโคจรของลูก (X-Z)",
          data: [],
          borderColor: "#4caf50",
          backgroundColor: "#4caf50",
          showLine: true,
          pointRadius: 2,
          tension: 0.1,
        },
        {
          label: "วิถีโคจรในอุดมคติ (X-Z)",
          data: [],
          borderColor: "#ff9800",
          backgroundColor: "#ff9800",
          showLine: true,
          pointRadius: 0,
          borderDash: [5, 5],
          hidden: true,
          tension: 0.1,
        },
        {
          label: "จุดตกกระทบ (X-Z)",
          data: [],
          backgroundColor: "#ffeb3b",
          borderColor: "#ffeb3b",
          pointRadius: 8,
          pointStyle: "crossRot",
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: "ระยะทางด้านข้าง (X, ม)" },
          grid: { color: "#424242" },
          ticks: { color: "#e0e0e0" },
        },
        y: {
          title: { display: true, text: "ระยะทางด้านหน้า (Z, ม)" },
          grid: { color: "#424242" },
          ticks: { color: "#e0e0e0" },
        },
      },
      plugins: {
        legend: { labels: { font: { size: 10 }, color: "#e0e0e0" } },
        annotation: { annotations: {} },
      },
      aspectRatio: 1,
    },
  });
}

function setupFieldChart2D() {
  const ctx = document.getElementById("field-chart-2d")?.getContext("2d");
  if (!ctx) {
    console.error("field-chart-2d canvas not found");
    return;
  }
  fieldChart2D = new Chart(ctx, {
    type: "scatter",
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: "ระยะทาง X (ม)" },
          grid: { color: "#424242" },
          suggestedMin: -2.6,
          suggestedMax: 2.6,
          ticks: { color: "#e0e0e0" },
        },
        y: {
          title: { display: true, text: "ระยะทาง Z (ด้านหน้า, ม)" },
          grid: { color: "#424242" },
          suggestedMin: 0,
          suggestedMax: 5.0,
          ticks: { color: "#e0e0e0" },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            label: function (context) {
              if (
                context.element &&
                context.element.options &&
                context.element.options.id
              ) {
                const annotationId = context.element.options.id;
                const annotations =
                  context.chart.options.plugins.annotation.annotations;
                if (
                  annotations &&
                  annotations[annotationId] &&
                  annotations[annotationId].label &&
                  annotations[annotationId].label.content
                ) {
                  return annotations[annotationId].label.content;
                }
              }
              if (context.dataset.label) {
                return `${context.dataset.label}: (${context.parsed.x.toFixed(
                  2
                )}, ${context.parsed.y.toFixed(2)})`;
              }
              return `(${context.parsed.x.toFixed(
                2
              )}, ${context.parsed.y.toFixed(2)})`;
            },
          },
        },
        annotation: { annotations: {} },
      },
      onClick: (event, elements) => {
        // Changed 'elements' to 'activeElements' for Chart.js v3/v4, but 'event' is more direct for click coords
        const chart = fieldChart2D; // Use 'chart' for clarity within this scope
        if (
          chart &&
          chart.canvas &&
          chart.scales &&
          chart.scales.x &&
          chart.scales.y &&
          chart.scales.x.min !== undefined &&
          chart.scales.x.max !== undefined &&
          chart.scales.y.min !== undefined &&
          chart.scales.y.max !== undefined &&
          chart.chartArea
        ) {
          const canvasEl = chart.canvas;
          const rect = canvasEl.getBoundingClientRect();

          // Use event.native for original DOM event properties if available and needed.
          // For Chart.js click event, 'event' itself often has chart-relative coordinates.
          // However, clientX/clientY are more reliable for viewport coordinates.
          const clickClientX = event.native?.clientX ?? event.x; // Fallback to event.x if native is not there
          const clickClientY = event.native?.clientY ?? event.y; // Fallback to event.y

          if (clickClientX === undefined || clickClientY === undefined) {
            console.warn(
              "onClick - clientX/clientY are undefined in the event object.",
              event
            );
            showCustomMessage("ไม่สามารถอ่านพิกัดการคลิกได้", "warning");
            return;
          }

          const clickXCanvas = clickClientX - rect.left;
          const clickYCanvas = clickClientY - rect.top;

          console.log(
            "onClick - Raw Click (clientX, clientY):",
            clickClientX,
            clickClientY
          );
          console.log(
            "onClick - Canvas BoundingRect (left, top):",
            rect.left,
            rect.top
          );
          console.log(
            "onClick - Click relative to Canvas (clickXCanvas, clickYCanvas):",
            clickXCanvas,
            clickYCanvas
          );
          console.log(
            "onClick - Chart Area (left, top, right, bottom):",
            chart.chartArea.left,
            chart.chartArea.top,
            chart.chartArea.right,
            chart.chartArea.bottom
          );

          if (
            clickXCanvas >= chart.chartArea.left &&
            clickXCanvas <= chart.chartArea.right &&
            clickYCanvas >= chart.chartArea.top &&
            clickYCanvas <= chart.chartArea.bottom
          ) {
            let targetModelX = chart.scales.x.getValueForPixel(clickXCanvas);
            let targetModelY = chart.scales.y.getValueForPixel(clickYCanvas);
            if (
              currentFieldType === "real1" ||
              currentFieldType === "extramap1" ||
              currentFieldType === "extramap2"
            ) {
              document.getElementById("target-x").value = (
                targetModelY - 1
              ).toFixed(2);
              document.getElementById("target-z").value = (
                targetModelX - 0.375
              ).toFixed(2);
              showCustomMessage(
                `ตั้งเป้าหมายเป็น X: ${(targetModelY - 1).toFixed(2)}m, Z: ${(
                  targetModelX - 0.375
                ).toFixed(2)}m`,
                "info"
              );
            } else {
              document.getElementById("target-x").value =
                targetModelX.toFixed(2);
              document.getElementById("target-z").value =
                targetModelY.toFixed(2);
              showCustomMessage(
                `ตั้งเป้าหมายเป็น X: ${targetModelX.toFixed(
                  2
                )}m, Z: ${targetModelY.toFixed(2)}m`,
                "info"
              );
            }
            updateTargetZoneIndicator2D();
          } else {
            console.warn(
              "Click was outside the chart area. Click (rel):",
              clickXCanvas,
              ",",
              clickYCanvas,
              "Area (L,R,T,B):",
              chart.chartArea.left,
              chart.chartArea.right,
              chart.chartArea.top,
              chart.chartArea.bottom
            );
            showCustomMessage("คลิกอยู่นอกพื้นที่แสดงผลของกราฟ", "warning");
          }
        } else {
          console.warn(
            "Field chart, its scales, or chartArea are not ready for click event.",
            chart?.scales,
            chart?.chartArea
          );
          showCustomMessage(
            "กราฟสนามยังไม่พร้อมใช้งานสำหรับการคลิก",
            "warning"
          );
        }
      },
    },
  });
}

function updateFieldChart2D() {
  console.log(
    "updateFieldChart2D called. FieldType:",
    currentFieldType,
    "ZonesData:",
    JSON.parse(JSON.stringify(currentRawZonesData))
  );
  if (!fieldChart2D) {
    console.error("fieldChart2D is not initialized");
    return;
  }

  fieldChart2D.data.datasets = [];
  if (
    fieldChart2D.options.plugins.annotation &&
    fieldChart2D.options.plugins.annotation.annotations
  ) {
    fieldChart2D.options.plugins.annotation.annotations = {};
  } else {
    fieldChart2D.options.plugins.annotation = { annotations: {} };
  }

  if (
    !currentRawZonesData ||
    !Array.isArray(currentRawZonesData) ||
    currentRawZonesData.length === 0
  ) {
    console.log("No raw zone data, field chart will be empty.");
    if (fieldChart2D.options.scales.x) {
      fieldChart2D.options.scales.x.min = -2.6;
      fieldChart2D.options.scales.x.max = 2.6;
    }
    if (fieldChart2D.options.scales.y) {
      fieldChart2D.options.scales.y.min = 0;
      fieldChart2D.options.scales.y.max = 5.0;
    }
    fieldChart2D.update();
    return;
  }

  const annotations = {};
  let minX = 0,
    maxX = 0,
    minZ = 0,
    maxZ = 0;
  let firstPoint = true;

  function updateChartBounds(x, z) {
    if (x === undefined || z === undefined || isNaN(x) || isNaN(z)) return;
    if (firstPoint) {
      minX = maxX = x;
      minZ = maxZ = z;
      firstPoint = false;
    } else {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }

  currentRawZonesData.forEach((zoneDef, index) => {
    if (!zoneDef || typeof zoneDef !== "object") {
      console.warn("Skipping invalid zoneDef:", zoneDef);
      return;
    }
    const color = zoneDef.color || zoneColors[index % zoneColors.length];
    const zoneLabel = zoneDef.id || `โซน ${index + 1}`;
    const annotationId = `zone_ann_${
      zoneDef.id ? zoneDef.id.replace(/\s+/g, "_") : index
    }`;

    if (zoneDef.shape === "rect" && zoneDef.x_min !== undefined) {
      annotations[annotationId] = {
        id: annotationId,
        type: "box",
        xMin: zoneDef.x_min,
        xMax: zoneDef.x_max,
        yMin: zoneDef.z_min,
        yMax: zoneDef.z_max,
        backgroundColor: color + "66",
        borderColor: color,
        borderWidth: 2,
        label: {
          content: zoneLabel,
          enabled: true,
          color: "white",
          font: { size: 10, weight: "bold" },
          backgroundColor: color + "CC",
          padding: 3,
          position: "center",
        },
      };
      updateChartBounds(zoneDef.x_min, zoneDef.z_min);
      updateChartBounds(zoneDef.x_max, zoneDef.z_max);
    } else if (
      zoneDef.shape === "sector" &&
      zoneDef.r_min !== undefined &&
      zoneDef.az_min !== undefined &&
      zoneDef.az_max !== undefined
    ) {
      const points = [];
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const angle = Math.radians(
          zoneDef.az_min + (zoneDef.az_max - zoneDef.az_min) * (i / steps)
        );
        points.push({
          x: zoneDef.r_max * Math.sin(angle),
          y: zoneDef.r_max * Math.cos(angle),
        });
      }
      for (let i = steps; i >= 0; i--) {
        const angle = Math.radians(
          zoneDef.az_min + (zoneDef.az_max - zoneDef.az_min) * (i / steps)
        );
        points.push({
          x: zoneDef.r_min * Math.sin(angle),
          y: zoneDef.r_min * Math.cos(angle),
        });
      }
      if (points.length > 0) {
        annotations[annotationId] = {
          id: annotationId,
          type: "polygon",
          points: points,
          backgroundColor: color + "66",
          borderColor: color,
          borderWidth: 2,
          label: {
            content: zoneLabel,
            enabled: true,
            color: "white",
            font: { size: 10, weight: "bold" },
            backgroundColor: color + "CC",
            padding: 3,
            position: "center",
          },
        };
        points.forEach((p) => {
          updateChartBounds(p.x, p.y);
        });
      }
    } else if (
      zoneDef.shape === "radial1d" &&
      zoneDef.r_min !== undefined &&
      zoneDef.r_max !== undefined
    ) {
      const r_min = zoneDef.r_min;
      const r_max = zoneDef.r_max;
      let visualWidth = 0.5;
      if (
        fieldChart2D.scales.x &&
        fieldChart2D.scales.x.min !== undefined &&
        fieldChart2D.scales.x.max !== undefined
      ) {
        const chartXRange =
          fieldChart2D.scales.x.max - fieldChart2D.scales.x.min;
        if (chartXRange > 0) visualWidth = Math.max(0.2, chartXRange * 0.1);
      }

      annotations[annotationId] = {
        id: annotationId,
        type: "box",
        xMin: -visualWidth / 2,
        xMax: visualWidth / 2,
        yMin: r_min,
        yMax: r_max,
        backgroundColor: color + "33",
        borderColor: color,
        borderWidth: 1,
        borderDash: [3, 3],
        label: {
          content: `${zoneLabel} (${r_min.toFixed(2)}-${r_max.toFixed(2)}m)`,
          enabled: true,
          color: "white",
          font: { size: 9 },
          position: "center",
        },
      };
      updateChartBounds(-visualWidth / 2, r_min);
      updateChartBounds(visualWidth / 2, r_max);
    }
  });

  annotations["striker_pos_field"] = {
    type: "point",
    xValue: 0,
    yValue: 0,
    backgroundColor: "white",
    borderColor: "red",
    radius: 6,
    borderWidth: 2,
    label: {
      content: "จุดเริ่มต้นการตี",
      enabled: true,
      font: { size: 10 },
      yAdjust: -15,
    },
  };
  updateChartBounds(0, 0);

  fieldChart2D.options.plugins.annotation.annotations = annotations;

  if (!firstPoint) {
    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;
    const paddingX = Math.max(0.5, rangeX * 0.15);
    const paddingZ = Math.max(0.5, rangeZ * 0.15);

    if (fieldChart2D.options.scales.x) {
      fieldChart2D.options.scales.x.min = minX - paddingX;
      fieldChart2D.options.scales.x.max = maxX + paddingX;
    }
    if (fieldChart2D.options.scales.y) {
      fieldChart2D.options.scales.y.min =
        minZ >= 0 && minZ < 0.1 ? 0 : minZ - paddingZ;
      fieldChart2D.options.scales.y.max = maxZ + paddingZ;
    }
  } else {
    if (fieldChart2D.options.scales.x) {
      fieldChart2D.options.scales.x.min = -2.6;
      fieldChart2D.options.scales.x.max = 2.6;
    }
    if (fieldChart2D.options.scales.y) {
      fieldChart2D.options.scales.y.min = 0;
      fieldChart2D.options.scales.y.max = 5.0;
    }
  }

  console.log(
    "Updating field chart. New scales X:",
    fieldChart2D.options.scales.x?.min,
    fieldChart2D.options.scales.x?.max
  );
  console.log(
    "Updating field chart. New scales Z:",
    fieldChart2D.options.scales.y?.min,
    fieldChart2D.options.scales.y?.max
  );
  console.log(
    "Annotations being applied:",
    JSON.parse(JSON.stringify(annotations))
  );
  fieldChart2D.update("none");

  // Custom background for real1
  const canvas = document.getElementById("field-chart-2d");
  if (
    currentFieldType === "real1" ||
    currentFieldType === "extramap1" ||
    currentFieldType === "extramap2"
  ) {
    if (canvas) {
      let imgUrl = "/static/images/field_diagram.PNG";
      let widthPx = 1130;
      if (currentFieldType === "extramap1") {
        imgUrl = "/static/images/extramap1.png";
        widthPx = 1510;
      }
      if (currentFieldType === "extramap2") {
        imgUrl = "/static/images/extramap2.png";
        widthPx = 1130;
      }
      canvas.style.backgroundImage = `url('${imgUrl}')`;
      canvas.style.backgroundSize = "100% 100%";
      canvas.style.backgroundRepeat = "no-repeat";
      canvas.width = widthPx;
      canvas.height = 755;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
    }
    if (fieldChart2D.options.scales.x) {
      fieldChart2D.options.scales.x.min = 0;
      fieldChart2D.options.scales.x.max =
        currentFieldType === "extramap1" ? 4 : 3;
      fieldChart2D.options.scales.x.title.text = "ระยะทาง Z (ม)";
      fieldChart2D.options.scales.x.reverse = true;
      fieldChart2D.options.scales.x.display = false;
      fieldChart2D.options.scales.x.grid = { display: false };
      fieldChart2D.options.scales.x.ticks = { display: false };
    }
    if (fieldChart2D.options.scales.y) {
      fieldChart2D.options.scales.y.min = 0;
      fieldChart2D.options.scales.y.max = 2;
      fieldChart2D.options.scales.y.title.text = "ระยะทาง X (ม)";
      fieldChart2D.options.scales.y.reverse = false;
      fieldChart2D.options.scales.y.display = false;
      fieldChart2D.options.scales.y.grid = { display: false };
      fieldChart2D.options.scales.y.ticks = { display: false };
    }
    if (fieldChart2D.options.plugins.legend) {
      fieldChart2D.options.plugins.legend.display = false;
    }
    fieldChart2D.update();
  } else {
    if (canvas) {
      canvas.style.backgroundImage = "";
      canvas.width = 600;
      canvas.height = 400;
      canvas.style.width = "100%";
      canvas.style.height = "400px";
    }
    if (fieldChart2D.options.scales.x) {
      fieldChart2D.options.scales.x.title.text = "ระยะทาง X (ม)";
      fieldChart2D.options.scales.x.reverse = false;
    }
    if (fieldChart2D.options.scales.y) {
      fieldChart2D.options.scales.y.title.text = "ระยะทาง Z (ด้านหน้า, ม)";
      fieldChart2D.options.scales.y.reverse = false;
    }
    if (fieldChart2D.options.scales.x) {
      fieldChart2D.options.scales.x.display = true;
      fieldChart2D.options.scales.x.grid = { display: true };
      fieldChart2D.options.scales.x.ticks = { display: true };
    }
    if (fieldChart2D.options.scales.y) {
      fieldChart2D.options.scales.y.display = true;
      fieldChart2D.options.scales.y.grid = { display: true };
      fieldChart2D.options.scales.y.ticks = { display: true };
    }
    if (fieldChart2D.options.plugins.legend) {
      fieldChart2D.options.plugins.legend.display = false;
    }
  }
  fieldChart2D.update();
}

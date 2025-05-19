// Global variables
let trajectoryChart = null;
let fieldChart = null;
let currentZones = [];
let currentFieldType = "standard";
let fieldInfoExpanded = false;

// Define a more appealing color palette for zones
const zoneColors = [
  "#4CAF50",
  "#2196F3",
  "#FFC107",
  "#E91E63",
  "#9C27B0",
  "#00BCD4",
  "#FF5722",
  "#795548",
  "#607D8B",
  "#8BC34A",
];

// DOM Elements for Message Box
const messageBox = document.getElementById("custom-message-box");
const messageBoxText = messageBox
  ? document.getElementById("message-box-text")
  : null;
const messageBoxCloseBtn = messageBox
  ? document.getElementById("message-box-close-btn")
  : null;
const messageBoxContent = messageBox
  ? messageBox.querySelector(".message-box-content")
  : null;

// ตัวแปรสำหรับเก็บ debug info
let debugInfo = {
  lastRequest: null,
  lastResponse: null,
  errors: [],
};

// ฟังก์ชันสำหรับเพิ่ม debug info
function addDebugInfo(type, data) {
  if (type === "request") {
    debugInfo.lastRequest = data;
  } else if (type === "response") {
    debugInfo.lastResponse = data;
  } else if (type === "error") {
    debugInfo.errors.push({
      time: new Date().toLocaleTimeString(),
      error: data,
    });
  }

  // อัปเดตการแสดงผล
  updateDebugInfoDisplay();
}

// ฟังก์ชันอัปเดตการแสดงผล debug info
function updateDebugInfoDisplay() {
  const debugInfoContent = document.getElementById("debug-info-content");
  if (!debugInfoContent) return;

  let content = "=== DEBUG INFO ===\n\n";

  // แสดง request ล่าสุด
  content += "--- LAST REQUEST ---\n";
  content += debugInfo.lastRequest
    ? JSON.stringify(debugInfo.lastRequest, null, 2)
    : "No request data";
  content += "\n\n";

  // แสดง response ล่าสุด
  content += "--- LAST RESPONSE ---\n";
  content += debugInfo.lastResponse
    ? JSON.stringify(debugInfo.lastResponse, null, 2)
    : "No response data";
  content += "\n\n";

  // แสดง errors
  content += "--- ERRORS ---\n";
  if (debugInfo.errors.length > 0) {
    debugInfo.errors.forEach((error, index) => {
      content += `[${error.time}] Error ${index + 1}: ${error.error}\n`;
    });
  } else {
    content += "No errors";
  }

  debugInfoContent.textContent = content;
}

// ฟังก์ชันแสดง/ซ่อน debug info
function toggleDebugInfo() {
  const debugInfoContent = document.getElementById("debug-info-content");
  if (!debugInfoContent) return;

  if (debugInfoContent.style.display === "none") {
    debugInfoContent.style.display = "block";
  } else {
    debugInfoContent.style.display = "none";
  }
}

// Function to show custom message box
function showCustomMessage(message, type = "info") {
  // type can be 'success', 'error', 'warning', 'info'
  const notification = document.getElementById("notification");
  if (!notification) return;

  const messageEl = document.getElementById("notification-message");
  const iconEl = notification.querySelector(".notification-icon");

  // Set message
  messageEl.textContent = message;

  // Set icon based on type
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
    case "info":
    default:
      iconEl.innerHTML =
        '<i class="fas fa-info-circle" style="color: #64b5f6;"></i>';
      break;
  }

  // Show notification
  notification.classList.add("show");

  // Hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

// Helper function to toggle disabled state on buttons
function setButtonDisabled(buttonId, isDisabled) {
  const button = document.getElementById(buttonId);
  if (button) {
    button.disabled = isDisabled;
  }
}

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", function () {
  setupTrajectoryChart();
  setupFieldChart();

  // เพิ่ม event listener สำหรับค่าต่างๆ
  const strikeHeight = document.getElementById("strike-height");
  if (strikeHeight) {
    strikeHeight.addEventListener("input", function () {
      document.getElementById("height-value").textContent = this.value + " m";
    });
  }

  const strikeAngle = document.getElementById("strike-angle");
  if (strikeAngle) {
    strikeAngle.addEventListener("input", function () {
      document.getElementById("angle-value").textContent = this.value + "°";
    });
  }

  const strikeVelocity = document.getElementById("strike-velocity");
  if (strikeVelocity) {
    strikeVelocity.addEventListener("input", function () {
      document.getElementById("velocity-value").textContent =
        this.value + " m/s";
    });
  }

  const targetDistance = document.getElementById("target-distance");
  if (targetDistance) {
    targetDistance.addEventListener("input", function () {
      document.getElementById("target-value").textContent = this.value + " m";
      updateTargetZoneIndicator();
    });
  }

  const fieldType = document.getElementById("field-type");
  if (fieldType) {
    fieldType.addEventListener("change", handleFieldTypeChange);
  }

  // Setup field info toggle
  const fieldInfoElem = document.getElementById("field-info-text");
  if (fieldInfoElem) {
    fieldInfoElem.addEventListener("click", toggleFieldInfo);
    // เพิ่มไอคอนที่มุมขวาบนเพื่อบ่งบอกว่าสามารถคลิกได้
    fieldInfoElem.innerHTML =
      fieldInfoElem.innerHTML +
      '<div class="field-info-toggle"><i class="fas fa-chevron-down"></i></div>';
  }

  // เพิ่ม event listener สำหรับ checkbox
  const fixAngleCheckbox = document.getElementById("fix-angle");
  const fixVelocityCheckbox = document.getElementById("fix-velocity");

  if (fixAngleCheckbox && fixVelocityCheckbox) {
    fixAngleCheckbox.addEventListener("change", function () {
      checkConflictingOptions();
    });

    fixVelocityCheckbox.addEventListener("change", function () {
      checkConflictingOptions();
    });

    // ตรวจสอบค่าเริ่มต้น
    checkConflictingOptions();
  }

  // ตั้งค่า default values สำหรับ checkbox
  if (fixAngleCheckbox) fixAngleCheckbox.checked = false;
  if (fixVelocityCheckbox) fixVelocityCheckbox.checked = false;

  // เรียกดึงข้อมูลสนามตอนเริ่มต้น
  fetchFieldInfo();

  // แสดงข้อความต้อนรับ
  setTimeout(() => {
    showCustomMessage("ยินดีต้อนรับสู่โปรแกรมจำลองการตีลูกสควอช", "info");
  }, 1000);

  // เปิด tab แรกเมื่อโหลดเสร็จ
  if (document.querySelector(".tab-btn")) {
    document.querySelector(".tab-btn").click();
  }
});

function checkConflictingOptions() {
  const fixAngleCheckbox = document.getElementById("fix-angle");
  const fixVelocityCheckbox = document.getElementById("fix-velocity");
  const optimizeBtn = document.getElementById("optimize-btn");

  if (fixAngleCheckbox && fixVelocityCheckbox && optimizeBtn) {
    // ถ้าเลือกทั้งสองตัวเลือก จะไม่สามารถปรับค่าใดๆ ได้
    if (fixAngleCheckbox.checked && fixVelocityCheckbox.checked) {
      showCustomMessage(
        "ไม่สามารถกำหนดให้ทั้งมุมและความเร็วคงที่ได้",
        "warning"
      );
      optimizeBtn.disabled = true;
    } else {
      optimizeBtn.disabled = false;
    }
  }
}

// สร้างฟังก์ชัน fetchFieldInfo ที่หายไป
function fetchFieldInfo() {
  fetch("/api/field_info")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // อัปเดตข้อมูลสนาม
      if (data.dimensions) {
        document.getElementById("min-distance").value =
          data.dimensions.min_distance;
        document.getElementById("max-distance").value =
          data.dimensions.max_distance;
        document.getElementById("zone-width").value =
          data.dimensions.zone_width;
        currentFieldType = data.dimensions.field_type; // สำคัญ: อัปเดต currentFieldType ก่อน
        updateTargetSliderRange(
          data.dimensions.min_distance,
          data.dimensions.max_distance
        );
      }

      // อัปเดตโซน
      if (data.zones) {
        currentZones = data.zones; // สำคัญ: อัปเดต currentZones ก่อนเรียก updateFieldChart และ updateTargetZoneIndicator
        updateFieldChart(data.zones);
      }
    })
    .catch((error) => {
      console.error("Error fetching field info:", error);
      showCustomMessage("ไม่สามารถโหลดข้อมูลสนามได้", "error");
    });
}

function handleFieldTypeChange() {
  const fieldType = document.getElementById("field-type").value;
  const isCustom = fieldType === "custom";

  // เปิด/ปิดการแก้ไขค่าสนาม
  document.getElementById("min-distance").disabled = !isCustom;
  document.getElementById("max-distance").disabled = !isCustom;
  document.getElementById("zone-width").disabled = !isCustom;
  document.getElementById("apply-field-btn").disabled = !isCustom;

  if (!isCustom) {
    changeFieldType(fieldType);
  }
}

// เพิ่มฟังก์ชันเปลี่ยนประเภทสนาม
function changeFieldType(fieldType) {
  fetch("/api/change_field", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ field_type: fieldType }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.zones) {
        currentZones = data.zones; // สำคัญ: อัปเดต currentZones ก่อน
        updateFieldChart(data.zones);

        if (data.dimensions) {
          document.getElementById("min-distance").value =
            data.dimensions.min_distance;
          document.getElementById("max-distance").value =
            data.dimensions.max_distance;
          document.getElementById("zone-width").value =
            data.dimensions.zone_width;
          currentFieldType = data.dimensions.field_type; // สำคัญ: อัปเดต currentFieldType ก่อน
          updateTargetSliderRange(
            data.dimensions.min_distance,
            data.dimensions.max_distance
          );
        }
        showCustomMessage(`เปลี่ยนสนามเป็น ${fieldType} สำเร็จ`, "success");
      }
    })
    .catch((error) => {
      console.error("Error changing field type:", error);
      showCustomMessage("ไม่สามารถเปลี่ยนประเภทสนามได้", "error");
    });
}

// เพิ่มฟังก์ชัน toggle field info
function toggleFieldInfo() {
  const details = document.querySelector(".field-info-details");
  if (!details) return;

  fieldInfoExpanded = !fieldInfoExpanded;
  if (fieldInfoExpanded) {
    details.classList.add("expanded");
  } else {
    details.classList.remove("expanded");
  }

  // หมุนไอคอน
  const toggle = document.querySelector(".field-info-toggle i");
  if (toggle) {
    if (fieldInfoExpanded) {
      toggle.classList.replace("fa-chevron-down", "fa-chevron-up");
    } else {
      toggle.classList.replace("fa-chevron-up", "fa-chevron-down");
    }
  }
}

// เพิ่มฟังก์ชัน startSimulation
function startSimulation() {
  // ดึงค่าจาก inputs
  const releaseHeight = parseFloat(
    document.getElementById("release-height").value
  );
  const strikeHeight = parseFloat(
    document.getElementById("strike-height").value
  );
  const strikeAngle = parseFloat(document.getElementById("strike-angle").value);
  const strikeVelocity = parseFloat(
    document.getElementById("strike-velocity").value
  );
  const showIdeal = document.getElementById("ideal-comparison").checked;

  // ดึงค่า physics parameters ถ้ามี
  const physicsParams = {};
  if (document.getElementById("gravity")) {
    physicsParams.gravity = parseFloat(
      document.getElementById("gravity").value
    );
  }
  if (document.getElementById("ball-mass")) {
    physicsParams.ball_mass = parseFloat(
      document.getElementById("ball-mass").value
    );
  }
  if (document.getElementById("air-density")) {
    physicsParams.air_density = parseFloat(
      document.getElementById("air-density").value
    );
  }
  if (document.getElementById("drag-coefficient")) {
    physicsParams.drag_coefficient = parseFloat(
      document.getElementById("drag-coefficient").value
    );
  }
  if (document.getElementById("elasticity")) {
    physicsParams.elasticity = parseFloat(
      document.getElementById("elasticity").value
    );
  }

  // ข้อมูลที่จะส่งไป API
  const data = {
    release_height: releaseHeight,
    strike_height: strikeHeight,
    strike_angle: strikeAngle,
    strike_velocity: strikeVelocity,
    show_ideal: showIdeal,
    physics: physicsParams,
  };

  // เพิ่ม debug info
  addDebugInfo("request", data);

  // ปิดปุ่มระหว่างประมวลผล
  setButtonDisabled("start-btn", true);

  // เรียกใช้ API
  fetch("/api/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((result) => {
      // เพิ่ม debug info
      addDebugInfo("response", result);

      // อัปเดต UI ด้วยผลลัพธ์
      updateSimulationResults(result);

      // เพิ่มโค้ดส่วนนี้: เปลี่ยนไปที่หน้า Results ทันที
      setTimeout(() => {
        openTab("results");
        showCustomMessage("การจำลองเสร็จสิ้น", "success");
      }, 200);
    })
    .catch((error) => {
      console.error("Error running simulation:", error);

      // เพิ่ม debug info
      addDebugInfo("error", error.toString());

      showCustomMessage("เกิดข้อผิดพลาดในการจำลอง", "error");
    })
    .finally(() => {
      setButtonDisabled("start-btn", false);
    });
}

// ฟังก์ชัน optimizeSettings ที่แก้ไขแล้ว
function optimizeSettings() {
  // ดึงค่าพารามิเตอร์ทั้งหมดจาก UI
  const targetDistance = parseFloat(
    document.getElementById("target-distance").value
  );
  const releaseHeight = parseFloat(
    document.getElementById("release-height").value
  );
  const strikeHeight = parseFloat(
    document.getElementById("strike-height").value
  );
  const currentAngle = parseFloat(
    document.getElementById("strike-angle").value
  );
  const currentVelocity = parseFloat(
    document.getElementById("strike-velocity").value
  );

  // สร้าง object สำหรับ fixed parameters
  let fixedParams = null;

  // ตรวจสอบว่ามี checkbox สำหรับ fix ค่าหรือไม่
  const fixAngleElement = document.getElementById("fix-angle");
  const fixVelocityElement = document.getElementById("fix-velocity");

  if (fixAngleElement && fixVelocityElement) {
    // มี checkbox สำหรับ fix ค่า
    const fixAngle = fixAngleElement.checked;
    const fixVelocity = fixVelocityElement.checked;

    // ตรวจสอบว่าต้องการ fix ค่าใดหรือไม่
    if (fixAngle || fixVelocity) {
      fixedParams = {};

      if (fixAngle) {
        fixedParams.angle = true;
      }

      if (fixVelocity) {
        fixedParams.velocity = true;
      }
    }
  }

  // ดึงค่า physics parameters
  const physicsParams = {};
  if (document.getElementById("gravity")) {
    physicsParams.gravity = parseFloat(
      document.getElementById("gravity").value
    );
  }
  if (document.getElementById("ball-mass")) {
    physicsParams.ball_mass = parseFloat(
      document.getElementById("ball-mass").value
    );
  }
  if (document.getElementById("air-density")) {
    physicsParams.air_density = parseFloat(
      document.getElementById("air-density").value
    );
  }
  if (document.getElementById("drag-coefficient")) {
    physicsParams.drag_coefficient = parseFloat(
      document.getElementById("drag-coefficient").value
    );
  }
  if (document.getElementById("elasticity")) {
    physicsParams.elasticity = parseFloat(
      document.getElementById("elasticity").value
    );
  }

  // แสดงว่ากำลังโหลด
  setButtonDisabled("optimize-btn", true);
  showCustomMessage("กำลังหาค่าที่เหมาะสม...", "info");

  // สร้างข้อมูลสำหรับส่งไป API
  const requestData = {
    target_distance: targetDistance,
    release_height: releaseHeight,
    strike_height: strikeHeight,
    current_angle: currentAngle,
    current_velocity: currentVelocity,
    fixed_params: fixedParams,
    physics: physicsParams,
  };

  // เพิ่ม debug info
  addDebugInfo("request", requestData);

  console.log("Sending optimize request:", requestData);

  // เรียกใช้ API
  fetch("/api/optimize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.error || "Network response was not ok");
        });
      }
      return response.json();
    })
    .then((result) => {
      // เพิ่ม debug info
      addDebugInfo("response", result);

      console.log("Optimization result:", result);

      // อัปเดตค่าที่เหมาะสม
      if (!fixedParams || !fixedParams.angle) {
        document.getElementById("strike-angle").value = result.angle;
        document.getElementById("angle-value").textContent =
          result.angle.toFixed(2) + "°";
      }

      if (!fixedParams || !fixedParams.velocity) {
        document.getElementById("strike-velocity").value = result.velocity;
        document.getElementById("velocity-value").textContent =
          result.velocity.toFixed(2) + " m/s";
      }

      // แสดงค่าความคลาดเคลื่อน
      const toleranceDisplay = document.getElementById(
        "optimal-angle-tolerance-display"
      );
      if (toleranceDisplay) {
        const optimizedAngleValue = document.getElementById(
          "optimized-angle-value"
        );
        const optimizedAngleToleranceRange = document.getElementById(
          "optimized-angle-tolerance-range"
        );
        const optimizedVelocityValue = document.getElementById(
          "optimized-velocity-value"
        );
        const optimizedVelocityToleranceRange = document.getElementById(
          "optimized-velocity-tolerance-range"
        );
        const optimizedActualDistance = document.getElementById(
          "optimized-actual-distance"
        );
        const optimizedError = document.getElementById("optimized-error");

        if (optimizedAngleValue)
          optimizedAngleValue.textContent = result.angle.toFixed(2) + "°";
        if (optimizedAngleToleranceRange)
          optimizedAngleToleranceRange.textContent = `${result.angle_min.toFixed(
            2
          )}° - ${result.angle_max.toFixed(2)}°`;

        if (optimizedVelocityValue)
          optimizedVelocityValue.textContent =
            result.velocity.toFixed(2) + " m/s";
        if (optimizedVelocityToleranceRange)
          optimizedVelocityToleranceRange.textContent = `${result.velocity_min.toFixed(
            2
          )} - ${result.velocity_max.toFixed(2)} m/s`;

        if (optimizedActualDistance)
          optimizedActualDistance.textContent =
            result.actual_distance.toFixed(2) + " m";
        if (optimizedError)
          optimizedError.textContent = `${result.error.toFixed(
            2
          )} m (${result.error_percent.toFixed(2)}%)`;

        toleranceDisplay.style.display = "block";
      }

      // สำคัญ: รัน simulation ทันทีหลังจากได้ค่าที่เหมาะสม
      setTimeout(() => {
        showCustomMessage("กำลังจำลองด้วยค่าที่เหมาะสม...", "info");
        startSimulation(); // รัน simulation อัตโนมัติ

        // เปลี่ยนไปที่หน้า Results เพื่อแสดงผลลัพธ์
        setTimeout(() => {
          openTab("results");
        }, 500);
      }, 500);
    })
    .catch((error) => {
      console.error("Error optimizing settings:", error);

      // เพิ่ม debug info
      addDebugInfo("error", error.toString());

      showCustomMessage(
        "ไม่สามารถหาค่าที่เหมาะสมได้: " + error.message,
        "error"
      );
    })
    .finally(() => {
      setButtonDisabled("optimize-btn", false);
    });
}

// อัปเดตผลลัพธ์การจำลอง
function updateSimulationResults(result) {
  // อัปเดตข้อความผลลัพธ์
  document.getElementById("landing-distance").textContent =
    result.landing_distance.toFixed(2) + " m";
  document.getElementById("strike-time").textContent =
    result.strike_time.toFixed(2) + " s";

  // อัปเดตโซนเป้าหมาย
  const targetZoneElem = document.getElementById("target-zone");
  if (result.target_zone !== null) {
    targetZoneElem.textContent = "Zone " + result.target_zone;
    const zoneColor = zoneColors[(result.target_zone - 1) % zoneColors.length];
    targetZoneElem.style.color = zoneColor;
  } else {
    targetZoneElem.textContent = "None";
    targetZoneElem.style.color = "";
  }

  // อัปเดตกราฟ trajectory
  updateTrajectoryChart(
    result.trajectory_x,
    result.trajectory_y,
    result.target_zones
  );

  // แสดงผลลัพธ์ ideal trajectory ถ้ามี
  const idealResult = document.querySelector(".ideal-result");
  if (result.ideal_landing_distance && idealResult) {
    document.getElementById("ideal-landing").textContent =
      result.ideal_landing_distance.toFixed(2) + " m";
    idealResult.style.display = "block";

    // อัปเดตกราฟ ideal trajectory
    if (result.ideal_trajectory_x && result.ideal_trajectory_y) {
      updateIdealTrajectory(
        result.ideal_trajectory_x,
        result.ideal_trajectory_y
      );
    }
  } else if (idealResult) {
    idealResult.style.display = "none";
  }
}

// อัปเดตกราฟ trajectory
function updateTrajectoryChart(x_positions, y_positions, zones) {
  if (!trajectoryChart) return;

  // สร้างข้อมูลจุดพิกัด
  const trajectoryData = [];
  for (let i = 0; i < x_positions.length; i++) {
    trajectoryData.push({
      x: x_positions[i],
      y: y_positions[i],
    });
  }

  // อัปเดตข้อมูลในกราฟ
  trajectoryChart.data.datasets[0].data = trajectoryData;

  // อัปเดตจุดตกเป้าหมาย
  if (trajectoryData.length > 0) {
    const landingPoint = trajectoryData[trajectoryData.length - 1];
    trajectoryChart.data.datasets[2].data = [
      {
        x: landingPoint.x,
        y: 0, // ตกลงที่ความสูง 0
      },
    ];
  } else {
    trajectoryChart.data.datasets[2].data = [];
  }

  // วาดโซนบนกราฟ
  if (zones) {
    drawZonesOnTrajectoryChart(zones);
  }

  // อัปเดตกราฟ
  trajectoryChart.update();
}

// อัปเดต ideal trajectory
function updateIdealTrajectory(x_positions, y_positions) {
  if (!trajectoryChart) return;

  // สร้างข้อมูลจุดพิกัด
  const trajectoryData = [];
  for (let i = 0; i < x_positions.length; i++) {
    trajectoryData.push({
      x: x_positions[i],
      y: y_positions[i],
    });
  }

  // อัปเดตข้อมูลในกราฟ
  trajectoryChart.data.datasets[1].data = trajectoryData;
  // แสดงชุดข้อมูลนี้
  trajectoryChart.data.datasets[1].hidden = false;

  // อัปเดตกราฟ
  trajectoryChart.update();
}

// วาดโซนบนกราฟ trajectory
function drawZonesOnTrajectoryChart(zones) {
  if (!trajectoryChart) return;

  // ตั้งค่า annotations สำหรับแสดงโซน
  const annotations = {};
  zones.forEach((zone, index) => {
    const color = zoneColors[index % zoneColors.length];

    // สร้าง box annotation
    annotations["zoneBox" + index] = {
      type: "box",
      xMin: zone[0],
      xMax: zone[1],
      yMin: -0.05,
      yMax: 0.05,
      backgroundColor: color + "33", // โปร่งใส
      borderColor: color,
      borderWidth: 1,
      drawTime: "beforeDatasetsDraw",
    };

    // สร้าง label annotation
    annotations["zoneLabel" + index] = {
      type: "label",
      xValue: (zone[0] + zone[1]) / 2,
      yValue: 0.1,
      content: `Zone ${index + 1}`,
      color: "#ffffff",
      font: {
        size: 10,
        weight: "bold",
      },
      backgroundColor: color + "CC",
      padding: 3,
    };
  });

  // อัปเดต annotations
  trajectoryChart.options.plugins.annotation.annotations = annotations;
}

// อัปเดตไฮไลท์โซนที่เลือก
function updateTargetZoneIndicator() {
  const targetDistance = parseFloat(
    document.getElementById("target-distance").value
  );

  // หาว่า targetDistance อยู่ในโซนไหน
  let zoneIndex = -1;
  for (let i = 0; i < currentZones.length; i++) {
    const [min, max] = currentZones[i];
    if (targetDistance >= min && targetDistance <= max) {
      zoneIndex = i;
      break;
    }
  }

  // อัปเดตข้อความและสี
  const indicatorZone = document.getElementById("indicator-zone");
  if (indicatorZone) {
    if (zoneIndex >= 0) {
      indicatorZone.textContent = `Zone ${zoneIndex + 1}`;
      indicatorZone.style.backgroundColor =
        zoneColors[zoneIndex % zoneColors.length];
    } else {
      indicatorZone.textContent = "None";
      indicatorZone.style.backgroundColor = "#607D8B"; // สีเทา
    }
  }
}

// ฟังก์ชันรีเซ็ตการจำลอง
function resetSimulation() {
  // รีเซ็ตค่าทั้งหมด
  document.getElementById("release-height").value = "2.0";
  document.getElementById("strike-height").value = "0.35";
  document.getElementById("height-value").textContent = "0.35 m";
  document.getElementById("strike-angle").value = "45";
  document.getElementById("angle-value").textContent = "45°";
  document.getElementById("strike-velocity").value = "5.25";
  document.getElementById("velocity-value").textContent = "5.25 m/s";
  document.getElementById("target-distance").value = "1.7";
  document.getElementById("target-value").textContent = "1.7 m";
  document.getElementById("ideal-comparison").checked = false;

  // รีเซ็ต Fix Options
  const fixAngle = document.getElementById("fix-angle");
  const fixVelocity = document.getElementById("fix-velocity");
  if (fixAngle) fixAngle.checked = false;
  if (fixVelocity) fixVelocity.checked = false;
  checkConflictingOptions();

  // รีเซ็ตผลลัพธ์
  document.getElementById("landing-distance").textContent = "0.00 m";
  document.getElementById("strike-time").textContent = "0.00 s";
  document.getElementById("target-zone").textContent = "None";

  // ซ่อน ideal result
  const idealResult = document.querySelector(".ideal-result");
  if (idealResult) {
    idealResult.style.display = "none";
  }

  // ซ่อนผลลัพธ์การหาค่าที่เหมาะสม
  const toleranceDisplay = document.getElementById(
    "optimal-angle-tolerance-display"
  );
  if (toleranceDisplay) {
    toleranceDisplay.style.display = "none";
  }

  // รีเซ็ตกราฟ
  if (trajectoryChart) {
    trajectoryChart.data.datasets[0].data = [];
    trajectoryChart.data.datasets[1].data = [];
    trajectoryChart.data.datasets[2].data = [];
    trajectoryChart.options.plugins.annotation.annotations = {};
    trajectoryChart.update();
  }

  // อัปเดตตัวบ่งชี้โซน
  updateTargetZoneIndicator();

  // รีเซ็ต Debug Info
  debugInfo = {
    lastRequest: null,
    lastResponse: null,
    errors: [],
  };
  updateDebugInfoDisplay();

  showCustomMessage("รีเซ็ตการจำลองแล้ว", "info");
}

// ฟังก์ชันทดสอบโซนทั้งหมด
function testAllZones() {
  const releaseHeight = parseFloat(
    document.getElementById("release-height").value
  );

  // แสดงว่ากำลังโหลด
  setButtonDisabled("test-zones-btn", true);
  showCustomMessage("กำลังทดสอบโซนทั้งหมด...", "info");

  // เรียกใช้ API
  fetch("/api/test_all_zones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ release_height: releaseHeight }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((result) => {
      // สร้างตารางผลลัพธ์
      const resultContainer = document.getElementById("test-zone-results");
      if (resultContainer) {
        displayZoneTestResults(resultContainer, result);
      }

      showCustomMessage("ทดสอบโซนเสร็จสิ้น", "success");
    })
    .catch((error) => {
      console.error("Error testing zones:", error);
      showCustomMessage("ไม่สามารถทดสอบโซนได้", "error");
    })
    .finally(() => {
      setButtonDisabled("test-zones-btn", false);
    });
}

// แสดงผลการทดสอบโซน
function displayZoneTestResults(container, result) {
  const { results, summary } = result;

  // สร้าง HTML สำหรับตาราง
  let html = `
    <h2><i class="fas fa-tasks"></i> ผลการทดสอบโซนทั้งหมด</h2>
    <div class="card">
        <table class="zone-table">
            <thead>
                <tr>
                    <th>โซน</th>
                    <th>ช่วงระยะ (m)</th>
                    <th>มุมที่เหมาะสม (°)</th>
                    <th>ความเร็ว (m/s)</th>
                    <th>ระยะที่ได้ (m)</th>
                    <th>ความคลาดเคลื่อน</th>
                    <th>ความแม่นยำ</th>
                </tr>
            </thead>
            <tbody>
    `;

  // เพิ่มแถวสำหรับแต่ละโซน
  results.forEach((zone) => {
    if (typeof zone.error === "string") {
      // กรณีเกิดข้อผิดพลาด
      html += `
            <tr>
                <td>Zone ${zone.zone}</td>
                <td>${zone.range[0].toFixed(2)} - ${zone.range[1].toFixed(
        2
      )}</td>
                <td colspan="4">${zone.error}</td>
            </tr>
            `;
    } else {
      // กรณีสำเร็จ
      html += `
            <tr>
                <td>Zone ${zone.zone}</td>
                <td>${zone.range[0].toFixed(2)} - ${zone.range[1].toFixed(
        2
      )}</td>
                <td>${zone.angle.toFixed(2)}°</td>
                <td>${zone.velocity.toFixed(2)} m/s</td>
                <td>${zone.actual_distance.toFixed(2)} m</td>
                <td>${zone.error.toFixed(2)} m (${zone.error_percent.toFixed(
        2
      )}%)</td>
                <td class="${
                  zone.within_tolerance ? "tolerance-pass" : "tolerance-fail"
                }">
                    ${zone.within_tolerance ? "ผ่าน" : "ไม่ผ่าน"}
                </td>
            </tr>
            `;
    }
  });

  html += `
            </tbody>
        </table>

        <div class="summary-box">
            <h3><i class="fas fa-chart-pie"></i> สรุปผลการทดสอบ</h3>
            <div class="stat-row">
                <span class="stat-label">โซนที่ทดสอบสำเร็จ:</span>
                <span class="stat-value">${summary.successful_zones} / ${
    summary.total_zones
  } โซน</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">ความคลาดเคลื่อนเฉลี่ย:</span>
                <span class="stat-value">${summary.avg_error.toFixed(
                  2
                )} m</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">ความคลาดเคลื่อนสูงสุด:</span>
                <span class="stat-value">${summary.max_error.toFixed(
                  2
                )} m</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">โซนที่ผ่านความคลาดเคลื่อน ±5%:</span>
                <span class="stat-value ${
                  summary.tolerance_percent > 80
                    ? "good"
                    : summary.tolerance_percent > 50
                    ? "medium"
                    : "poor"
                }">
                    ${summary.within_tolerance_count} / ${
    summary.total_zones
  } โซน (${summary.tolerance_percent.toFixed(1)}%)
                </span>
            </div>
        </div>
    </div>
    `;

  // แสดงผลลัพธ์
  container.innerHTML = html;
}

// ฟังก์ชันจัดการหน้า Tab
function openTab(tabName) {
  const tabContents = document.getElementsByClassName("tab-content");
  for (let i = 0; i < tabContents.length; i++) {
    tabContents[i].classList.remove("active");
  }

  const tabButtons = document.getElementsByClassName("tab-btn");
  for (let i = 0; i < tabButtons.length; i++) {
    tabButtons[i].classList.remove("active");
  }

  const navButtons = document.getElementsByClassName("nav-btn");
  for (let i = 0; i < navButtons.length; i++) {
    navButtons[i].classList.remove("active");
  }

  document.getElementById(tabName).classList.add("active");

  // เพิ่ม active class ให้กับปุ่มที่เกี่ยวข้อง
  document
    .querySelectorAll(
      `.tab-btn[onclick*="${tabName}"], .nav-btn[onclick*="${tabName}"]`
    )
    .forEach((btn) => {
      btn.classList.add("active");
    });

  updateChartsIfNeeded(tabName);
}

function updateChartsIfNeeded(tabName) {
  if (tabName === "field" && fieldChart) {
    setTimeout(() => {
      if (fieldChart.resize) fieldChart.resize();
      fieldChart.update();
    }, 0);
  } else if (tabName === "results" && trajectoryChart) {
    setTimeout(() => {
      if (trajectoryChart.resize) trajectoryChart.resize();
      trajectoryChart.update();
    }, 0);
  }
}

function setupTrajectoryChart() {
  const ctx = document.getElementById("trajectory-chart");
  if (!ctx) return;

  const ctxObj = ctx.getContext("2d");
  Chart.defaults.color = "#e0e0e0";

  trajectoryChart = new Chart(ctxObj, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Ball Trajectory", // วิถีลูกบอล
          data: [],
          borderColor: "#03a9f4",
          backgroundColor: "#03a9f4",
          showLine: true,
          pointRadius: 3,
          tension: 0.1,
        },
        {
          label: "Ideal Trajectory", // วิถีในอุดมคติ
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
          label: "Target Landing", // จุดตกเป้าหมาย
          data: [],
          backgroundColor: "#ffc107",
          borderColor: "#ffc107",
          pointRadius: 10,
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
          title: {
            display: true,
            text: "Distance (m)",
            color: "#e0e0e0",
            font: { size: 14 },
          }, // ระยะทาง (เมตร)
          ticks: { color: "#9e9e9e" },
          grid: { color: "#424242", borderColor: "#424242" },
        },
        y: {
          title: {
            display: true,
            text: "Height (m)",
            color: "#e0e0e0",
            font: { size: 14 },
          }, // ความสูง (เมตร)
          ticks: { color: "#9e9e9e" },
          grid: { color: "#424242", borderColor: "#424242" },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: { labels: { color: "#e0e0e0", font: { size: 12 } } },
        tooltip: {
          backgroundColor: "rgba(42, 42, 42, 0.9)",
          titleColor: "#e0e0e0",
          bodyColor: "#e0e0e0",
          callbacks: {
            label: function (context) {
              return `(${context.parsed.x.toFixed(
                2
              )}m, ${context.parsed.y.toFixed(2)}m)`;
            },
          },
        },
        annotation: { annotations: {} },
      },
    },
  });
}

function setupFieldChart() {
  const ctx = document.getElementById("field-chart");
  if (!ctx) return;

  const ctxObj = ctx.getContext("2d");
  fieldChart = new Chart(ctxObj, {
    type: "bar",
    data: {
      labels: [], // ชื่อโซน
      datasets: [
        {
          label: "Target Zones (m)", // โซนเป้าหมาย (เมตร)
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.95,
          categoryPercentage: 0.9,
          hoverBackgroundColor: [],
          hoverBorderColor: [],
          hoverBorderWidth: 3,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animations: {
        tension: {
          duration: 1000,
          easing: "easeOutQuart",
          from: 0.8,
          to: 0.2,
          loop: false,
        },
      },
      onHover: (event, chartElements) => {
        const chart = event.chart;
        const canvas = chart.canvas;

        if (chartElements && chartElements.length > 0) {
          canvas.style.cursor = "pointer";
          // ไฮไลท์โซนที่เลื่อนเมาส์ไป
          const index = chartElements[0].index;
          handleZoneHover(index);
        } else {
          canvas.style.cursor = "default";
          // ยกเลิกไฮไลท์
          handleZoneHover(-1);
        }
      },
      onClick: (event, chartElements) => {
        if (chartElements && chartElements.length > 0) {
          const index = chartElements[0].index;
          // เมื่อคลิกที่โซน ตั้งค่า target distance เป็นค่ากลางของโซนนั้น
          if (currentZones[index]) {
            const zoneMiddle =
              (currentZones[index][0] + currentZones[index][1]) / 2;
            const targetSlider = document.getElementById("target-distance");
            targetSlider.value = zoneMiddle.toFixed(2);
            document.getElementById("target-value").textContent =
              zoneMiddle.toFixed(2) + " m";
            updateTargetZoneIndicator();
            showCustomMessage(
              `ตั้งค่าระยะเป้าหมายเป็นกึ่งกลางของโซน ${
                index + 1
              } (${zoneMiddle.toFixed(2)}m)`,
              "info"
            );
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Distance from Striker (m)",
            color: "#e0e0e0",
            font: { size: 16, weight: "bold" },
          }, // ระยะห่างจากเครื่องตี (เมตร)
          ticks: {
            color: "#9e9e9e",
            font: { size: 14 },
          },
          grid: {
            color: "rgba(66, 66, 66, 0.5)",
            drawBorder: true,
            drawTicks: true,
          },
          min: 0,
        },
        y: {
          title: {
            display: true,
            text: "Zones",
            color: "#e0e0e0",
            font: { size: 16, weight: "bold" },
          }, // โซน
          ticks: {
            color: "#e0e0e0",
            font: { size: 14, weight: "bold" },
            padding: 10,
            z: 10,
          },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(42, 42, 42, 0.9)",
          titleColor: "#e0e0e0",
          bodyColor: "#e0e0e0",
          titleFont: { size: 16, weight: "bold" },
          bodyFont: { size: 14 },
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: function (tooltipItem) {
              return tooltipItem[0].label;
            },
            label: function (context) {
              const raw = context.raw;
              if (
                raw &&
                typeof raw[0] !== "undefined" &&
                typeof raw[1] !== "undefined"
              ) {
                return `${raw[0].toFixed(2)}m - ${raw[1].toFixed(
                  2
                )}m (ความกว้าง: ${(raw[1] - raw[0]).toFixed(2)}m)`;
              }
              return "";
            },
          },
        },
      },
    },
  });
}

// ฟังก์ชันสำหรับไฮไลท์โซน
function handleZoneHover(index) {
  if (
    !fieldChart ||
    !fieldChart.data ||
    !fieldChart.data.datasets ||
    !fieldChart.data.datasets[0]
  ) {
    return;
  }

  const dataset = fieldChart.data.datasets[0];
  const backgroundColor = [...dataset.backgroundColor];
  const borderColor = [...dataset.borderColor];
  const hoverBorderWidth = [...Array(backgroundColor.length)].fill(
    dataset.borderWidth
  );

  if (index >= 0 && index < backgroundColor.length) {
    for (let i = 0; i < backgroundColor.length; i++) {
      if (i === index) {
        // ทำให้แถบที่เลือกสว่างขึ้น
        const baseColor = zoneColors[i % zoneColors.length];
        const ctx = document.createElement("canvas").getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 400, 0);

        gradient.addColorStop(0, baseColor + "CC"); // ความโปร่งใส 80%
        gradient.addColorStop(0.5, baseColor + "FF"); // สีเต็ม
        gradient.addColorStop(1, baseColor + "FF"); // สีเต็ม

        backgroundColor[i] = gradient;
        borderColor[i] = "#ffffff"; // ขอบสีขาวเมื่อไฮไลท์
        hoverBorderWidth[i] = 4; // เพิ่มความหนาขอบ
      } else {
        // ทำให้แถบอื่นจางลง
        const baseColor = zoneColors[i % zoneColors.length];
        const ctx = document.createElement("canvas").getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 400, 0);

        gradient.addColorStop(0, baseColor + "44"); // ความโปร่งใส 27%
        gradient.addColorStop(0.5, baseColor + "88"); // ความโปร่งใส 53%
        gradient.addColorStop(1, baseColor + "AA"); // ความโปร่งใส 67%

        backgroundColor[i] = gradient;
        borderColor[i] = zoneColors[i % zoneColors.length] + "88";
        hoverBorderWidth[i] = dataset.borderWidth;
      }
    }
  } else {
    // ตั้งค่าสีปกติสำหรับทุกแถบ
    for (let i = 0; i < backgroundColor.length; i++) {
      const baseColor = zoneColors[i % zoneColors.length];
      const ctx = document.createElement("canvas").getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 400, 0);

      gradient.addColorStop(0, baseColor + "99"); // ความโปร่งใส 60%
      gradient.addColorStop(0.5, baseColor + "CC"); // ความโปร่งใส 80%
      gradient.addColorStop(1, baseColor + "FF"); // สีเต็ม

      backgroundColor[i] = gradient;
      borderColor[i] = zoneColors[i % zoneColors.length];
      hoverBorderWidth[i] = dataset.borderWidth;
    }
  }

  dataset.backgroundColor = backgroundColor;
  dataset.borderColor = borderColor;
  dataset.hoverBorderWidth = hoverBorderWidth;
  fieldChart.update();
}

function updateFieldChart(zones) {
  if (!fieldChart || !zones || zones.length === 0) {
    if (fieldChart) {
      fieldChart.data.labels = [];
      fieldChart.data.datasets[0].data = [];
      fieldChart.data.datasets[0].backgroundColor = [];
      fieldChart.data.datasets[0].borderColor = [];
      fieldChart.update();
    }
    return;
  }

  const zoneLabels = zones.map((_, index) => `Zone ${index + 1}`); // โซน 1, โซน 2, ...
  const floatingBarData = zones.map((zone) => [zone[0], zone[1]]);

  // ทำให้สีมีความสวยงามยิ่งขึ้นด้วยการใช้ความโปร่งใสและลักษณะของแถบสีที่หลากหลาย
  const backgroundColors = zones.map((_, index) => {
    const baseColor = zoneColors[index % zoneColors.length];
    const ctx = document.createElement("canvas").getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 400, 0);

    // สร้าง gradient จากสีพื้นหลังไปยังสีหลัก
    gradient.addColorStop(0, baseColor + "99"); // ความโปร่งใส 60%
    gradient.addColorStop(0.5, baseColor + "CC"); // ความโปร่งใส 80%
    gradient.addColorStop(1, baseColor + "FF"); // สีเต็ม

    return gradient;
  });

  const borderColors = zones.map(
    (_, index) => zoneColors[index % zoneColors.length]
  );

  // ตั้งค่าข้อมูลและสีให้กับกราฟ
  fieldChart.data.labels = zoneLabels;
  fieldChart.data.datasets[0].data = floatingBarData;
  fieldChart.data.datasets[0].backgroundColor = backgroundColors;
  fieldChart.data.datasets[0].borderColor = borderColors;
  fieldChart.data.datasets[0].hoverBackgroundColor = backgroundColors.map(
    (_, index) => {
      const baseColor = zoneColors[index % zoneColors.length];
      return baseColor + "FF"; // สีเต็มเมื่อ hover
    }
  );
  fieldChart.data.datasets[0].hoverBorderColor = borderColors.map(
    (_, index) => "#ffffff"
  );

  // ปรับช่วงการแสดงผลให้มีความสวยงาม
  const allDistances = zones.flat();
  const overallMinDistance = Math.min(...allDistances, 0);
  const overallMaxDistance = Math.max(...allDistances);

  fieldChart.options.scales.x.min =
    overallMinDistance > 0 ? Math.floor(overallMinDistance * 0.9) : 0;
  fieldChart.options.scales.x.max = Math.ceil(overallMaxDistance * 1.1);

  // อัปเดตกราฟ
  fieldChart.update();
}

// ฟังก์ชัน applyFieldSettings
function applyFieldSettings() {
  const minDistance = parseFloat(document.getElementById("min-distance").value);
  const maxDistance = parseFloat(document.getElementById("max-distance").value);
  const zoneWidth = parseFloat(document.getElementById("zone-width").value);

  if (minDistance >= maxDistance) {
    showCustomMessage("Min distance must be less than max distance", "error");
    return;
  }

  if (zoneWidth <= 0 || zoneWidth > maxDistance - minDistance) {
    showCustomMessage("Invalid zone width", "error");
    return;
  }

  // API call to apply custom field
  fetch("/api/change_field", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      field_type: "custom",
      min_distance: minDistance,
      max_distance: maxDistance,
      zone_width: zoneWidth,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.zones) {
        currentZones = data.zones;
        updateFieldChart(data.zones);
        updateTargetZoneIndicator();
        // อัปเดต Target Slider Range ด้วยค่าที่ได้จาก response
        if (data.dimensions) {
          updateTargetSliderRange(
            data.dimensions.min_distance,
            data.dimensions.max_distance
          );
        }
        showCustomMessage("Custom field settings applied", "success");
      }
    })
    .catch((error) => {
      console.error("Error applying field settings:", error);
      showCustomMessage("Could not apply field settings", "error");
    });
}

function updateTargetSliderRange(min_distance, max_distance) {
  const targetSlider = document.getElementById("target-distance");
  const targetValueDisplay = document.getElementById("target-value");

  if (targetSlider && targetValueDisplay) {
    const newMin = parseFloat(min_distance);
    const newMax = parseFloat(max_distance);

    // Debugging: Log ค่าใหม่
    console.log(`Updating target slider range: min=${newMin}, max=${newMax}`);

    targetSlider.min = newMin;
    targetSlider.max = newMax;

    // ปรับค่าปัจจุบันของ slider ถ้ามันอยู่นอกช่วงใหม่
    let currentSliderVal = parseFloat(targetSlider.value);

    if (currentSliderVal < newMin) {
      targetSlider.value = newMin;
    } else if (currentSliderVal > newMax) {
      targetSlider.value = newMax;
    }

    // บังคับให้ browser รับรู้การเปลี่ยนแปลง value อีกครั้ง
    // และอัปเดตการแสดงผลค่าของ slider
    const updatedSliderValue = parseFloat(targetSlider.value);
    targetValueDisplay.textContent = updatedSliderValue.toFixed(2) + " m";

    // Debugging: Log ค่า slider หลังอัปเดต
    console.log(
      `Target slider updated: value=${targetSlider.value}, min=${targetSlider.min}, max=${targetSlider.max}`
    );

    // หลังจากปรับค่า slider แล้ว ให้อัปเดต indicator ด้วย
    updateTargetZoneIndicator();
  }
}

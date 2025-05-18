// Global variables
let trajectoryChart = null;
let angleChart = null;
let fieldChart = null;
let currentZones = [];
let currentFieldType = 'standard';

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set up charts
    setupTrajectoryChart();
    setupAngleChart();
    setupFieldChart();
    
    // เพิ่ม event listeners สำหรับสไลเดอร์และค่าอื่นๆ
    document.getElementById('strike-height').addEventListener('input', function() {
        document.getElementById('height-value').textContent = this.value + ' m';
        updateTargetZoneIndicator();
    });
    
    document.getElementById('strike-angle').addEventListener('input', function() {
        document.getElementById('angle-value').textContent = this.value + '°';
        updateTargetZoneIndicator();
    });
    
    document.getElementById('strike-velocity').addEventListener('input', function() {
        document.getElementById('velocity-value').textContent = this.value + ' m/s';
        updateTargetZoneIndicator();
    });
    
    document.getElementById('target-distance').addEventListener('input', function() {
        document.getElementById('target-value').textContent = this.value + ' m';
        updateTargetZoneIndicator();
    });
    
    document.getElementById('field-type').addEventListener('change', function() {
        const isCustom = this.value === 'custom';
        document.getElementById('min-distance').disabled = !isCustom;
        document.getElementById('max-distance').disabled = !isCustom;
        document.getElementById('zone-width').disabled = !isCustom;
        document.getElementById('apply-field-btn').disabled = !isCustom;
    });
    
    // Load initial field info
    fetchFieldInfo();
});

// Tab functionality
function openTab(tabName) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    // Remove active class from all tab buttons
    const tabButtons = document.getElementsByClassName('tab-btn');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    // Show the selected tab content and mark button as active
    document.getElementById(tabName).classList.add('active');
    
    // Find the button that opens this tab and mark it as active
    for (let i = 0; i < tabButtons.length; i++) {
        if (tabButtons[i].getAttribute('onclick').includes(tabName)) {
            tabButtons[i].classList.add('active');
            break;
        }
    }
    
    // Update charts on tab change
    updateChartsIfNeeded(tabName);
}

// Update charts based on the active tab
function updateChartsIfNeeded(tabName) {
    if (tabName === 'field' && fieldChart) {
        fieldChart.update();
    } else if (tabName === 'analysis' && angleChart) {
        angleChart.update();
    } else if (tabName === 'results' && trajectoryChart) {
        trajectoryChart.update();
    }
}

// Setup trajectory chart
function setupTrajectoryChart() {
    const ctx = document.getElementById('trajectory-chart').getContext('2d');
    
    trajectoryChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Ball Trajectory',
                    data: [],
                    backgroundColor: '#00e0ff',
                    borderColor: '#00e0ff',
                    showLine: true,
                    pointRadius: 3
                },
                {
                    label: 'Ideal Trajectory',
                    data: [],
                    backgroundColor: '#ff2027',
                    borderColor: '#ff2027',
                    showLine: true,
                    pointRadius: 0,
                    borderDash: [5, 5],
                    hidden: true
                },
                {
                    label: 'Target',
                    data: [],
                    backgroundColor: '#FFD700',
                    borderColor: '#FFD700',
                    pointRadius: 8,
                    pointStyle: 'star'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Distance (m)',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: '#333333'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Height (m)',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: '#333333'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#FFFFFF'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `(${context.parsed.x.toFixed(2)}m, ${context.parsed.y.toFixed(2)}m)`;
                        }
                    }
                }
            }
        }
    });
}

// Setup angle chart
function setupAngleChart() {
    const ctx = document.getElementById('angle-chart').getContext('2d');
    
    angleChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Landing Distance',
                data: [],
                borderColor: '#ff2027',
                backgroundColor: 'rgba(255, 32, 39, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Strike Angle (°)',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: '#333333'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Landing Distance (m)',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: '#333333'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#FFFFFF'
                    }
                }
            }
        }
    });
}

// Setup field chart
function setupFieldChart() {
    const ctx = document.getElementById('field-chart').getContext('2d');
    
    fieldChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'],
            datasets: [{
                label: 'Target Zones',
                data: [0.38, 0.38, 0.38, 0.38, 0.38], // จะถูกอัปเดตหลังจาก fetchFieldInfo
                backgroundColor: [
                    '#FF3333', '#33FF33', '#3333FF', '#FFFF33', '#FF33FF',
                    '#33FFFF', '#FF9933', '#9933FF', '#33FF99', '#FF3399'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Distance (m)',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: '#333333'
                    },
                    stacked: true,
                    offset: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Zones',
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: '#333333'
                    },
                    stacked: true
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const zone = context.datasetIndex;
                            const zoneInfo = currentZones[context.dataIndex];
                            if (zoneInfo) {
                                return `Range: ${zoneInfo[0].toFixed(2)}m - ${zoneInfo[1].toFixed(2)}m`;
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// Update the field chart with zone data
function updateFieldChart(zones) {
    if (!fieldChart) return;
    
    const zoneLabels = zones.map((_, index) => `Zone ${index + 1}`);
    const zoneWidths = zones.map(zone => zone[1] - zone[0]);
    
    fieldChart.data.labels = zoneLabels;
    fieldChart.data.datasets[0].data = zoneWidths;
    
    // Set the x-axis scale
    const minDistance = zones[0][0];
    const maxDistance = zones[zones.length - 1][1];
    
    fieldChart.options.scales.x.min = minDistance - 0.1;
    fieldChart.options.scales.x.max = maxDistance + 0.1;
    
    fieldChart.update();
}

// Fetch field information
function fetchFieldInfo() {
    fetch('/api/field_info')
        .then(response => response.json())
        .then(data => {
            // Update current zones
            currentZones = data.zones;
            currentFieldType = data.dimensions.field_type;
            
            // Update slider range for target distance
            const minDistance = data.dimensions.min_distance;
            const maxDistance = data.dimensions.max_distance;
            
            const targetSlider = document.getElementById('target-distance');
            targetSlider.min = minDistance;
            targetSlider.max = maxDistance;
            
            // Set field inputs
            document.getElementById('field-type').value = currentFieldType;
            document.getElementById('min-distance').value = minDistance;
            document.getElementById('max-distance').value = maxDistance;
            document.getElementById('zone-width').value = data.dimensions.zone_width;
            
            // Update field chart
            updateFieldChart(currentZones);
            
            // Update target zone indicator
            updateTargetZoneIndicator();
        })
        .catch(error => {
            console.error('Error fetching field info:', error);
        });
}

// Update target zone indicator
function updateTargetZoneIndicator() {
    const targetDistance = parseFloat(document.getElementById('target-distance').value);
    
    // Find which zone this distance belongs to
    let zoneIndex = -1;
    for (let i = 0; i < currentZones.length; i++) {
        const [min, max] = currentZones[i];
        if (targetDistance >= min && targetDistance < max) {
            zoneIndex = i;
            break;
        }
    }
    
    // Update indicator
    const indicatorElem = document.getElementById('indicator-zone');
    if (zoneIndex >= 0) {
        const zoneColors = [
            '#FF3333', '#33FF33', '#3333FF', '#FFFF33', '#FF33FF',
            '#33FFFF', '#FF9933', '#9933FF', '#33FF99', '#FF3399'
        ];
        
        const color = zoneColors[zoneIndex % zoneColors.length];
        indicatorElem.textContent = `Zone ${zoneIndex + 1}`;
        indicatorElem.style.backgroundColor = color;
    } else {
        indicatorElem.textContent = 'Outside Zones';
        indicatorElem.style.backgroundColor = '#777777';
    }
}

// Change field type
function changeFieldType() {
    const fieldType = document.getElementById('field-type').value;
    
    // If not custom, fetch the field configuration
    if (fieldType !== 'custom') {
        fetch('/api/change_field', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                field_type: fieldType
            })
        })
        .then(response => response.json())
        .then(data => {
            // Update current zones
            currentZones = data.zones;
            currentFieldType = fieldType;
            
            // Update inputs
            document.getElementById('min-distance').value = data.dimensions.min_distance;
            document.getElementById('max-distance').value = data.dimensions.max_distance;
            document.getElementById('zone-width').value = data.dimensions.zone_width;
            
            // Update target slider range
            const targetSlider = document.getElementById('target-distance');
            targetSlider.min = data.dimensions.min_distance;
            targetSlider.max = data.dimensions.max_distance;
            
            // If current value is outside new range, update it
            if (parseFloat(targetSlider.value) < data.dimensions.min_distance) {
                targetSlider.value = data.dimensions.min_distance;
                document.getElementById('target-value').textContent = targetSlider.value + ' m';
            } else if (parseFloat(targetSlider.value) > data.dimensions.max_distance) {
                targetSlider.value = data.dimensions.max_distance;
                document.getElementById('target-value').textContent = targetSlider.value + ' m';
            }
            
            // Update field chart
            updateFieldChart(currentZones);
            
            // Update target zone indicator
            updateTargetZoneIndicator();
        })
        .catch(error => {
            console.error('Error changing field type:', error);
        });
    }
}

// Apply custom field settings
function applyFieldSettings() {
    const minDistance = parseFloat(document.getElementById('min-distance').value);
    const maxDistance = parseFloat(document.getElementById('max-distance').value);
    const zoneWidth = parseFloat(document.getElementById('zone-width').value);
    
    // Validate inputs
    if (minDistance >= maxDistance) {
        alert('Min distance must be less than max distance');
        return;
    }
    
    if (zoneWidth <= 0) {
        alert('Zone width must be positive');
        return;
    }
    
    // Set field type to custom
    currentFieldType = 'custom';
    document.getElementById('field-type').value = 'custom';
    
    // Calculate zones
    const zones = [];
    let current = minDistance;
    
    while (current < maxDistance) {
        const next = Math.min(current + zoneWidth, maxDistance);
        zones.push([current, next]);
        current = next;
    }
    
    // Update current zones
    currentZones = zones;
    
    // Update target slider range
    const targetSlider = document.getElementById('target-distance');
    targetSlider.min = minDistance;
    targetSlider.max = maxDistance;
    
    // If current value is outside new range, update it
    if (parseFloat(targetSlider.value) < minDistance) {
        targetSlider.value = minDistance;
        document.getElementById('target-value').textContent = targetSlider.value + ' m';
    } else if (parseFloat(targetSlider.value) > maxDistance) {
        targetSlider.value = maxDistance;
        document.getElementById('target-value').textContent = targetSlider.value + ' m';
    }
    
    // Update field chart
    updateFieldChart(currentZones);
    
    // Update target zone indicator
    updateTargetZoneIndicator();
}

// Start simulation
function startSimulation() {
    const releaseHeight = document.getElementById('release-height').value;
    const strikeHeight = document.getElementById('strike-height').value;
    const strikeAngle = document.getElementById('strike-angle').value;
    const strikeVelocity = document.getElementById('strike-velocity').value;
    const showIdeal = document.getElementById('ideal-comparison').checked;
    
    // Get physics parameters
    const physics = {
        gravity: parseFloat(document.getElementById('gravity').value),
        ball_mass: parseFloat(document.getElementById('ball-mass').value),
        air_density: parseFloat(document.getElementById('air-density').value),
        drag_coefficient: parseFloat(document.getElementById('drag-coefficient').value),
        elasticity: parseFloat(document.getElementById('elasticity').value)
    };
    
    // Show loading state
    document.getElementById('start-btn').textContent = 'Calculating...';
    document.getElementById('start-btn').disabled = true;
    
    // Send request to backend
    fetch('/api/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            release_height: releaseHeight,
            strike_height: strikeHeight,
            strike_angle: strikeAngle,
            strike_velocity: strikeVelocity,
            show_ideal: showIdeal,
            physics: physics
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }
        
        // Update results display
        document.getElementById('landing-distance').textContent = data.landing_distance.toFixed(2) + ' m';
        
        // Update target zone display
        if (data.target_zone) {
            const zoneColors = [
                '#FF3333', '#33FF33', '#3333FF', '#FFFF33', '#FF33FF',
                '#33FFFF', '#FF9933', '#9933FF', '#33FF99', '#FF3399'
            ];
            
            const zoneColor = zoneColors[(data.target_zone - 1) % zoneColors.length];
            document.getElementById('target-zone').textContent = 'Zone ' + data.target_zone;
            document.getElementById('target-zone').style.color = zoneColor;
        } else {
            document.getElementById('target-zone').textContent = 'None (Outside)';
            document.getElementById('target-zone').style.color = '#FFFFFF';
        }
        
        // Update strike time
        document.getElementById('strike-time').textContent = data.strike_time.toFixed(3) + ' s';
        
        // Update trajectory chart
        const trajectoryData = [];
        for (let i = 0; i < data.trajectory_x.length; i++) {
            trajectoryData.push({
                x: data.trajectory_x[i],
                y: data.trajectory_y[i]
            });
        }
        
        trajectoryChart.data.datasets[0].data = trajectoryData;
        
        // Add target indicator based on the target_distance
        const targetDistance = document.getElementById('target-distance').value;
        trajectoryChart.data.datasets[2].data = [{
            x: parseFloat(targetDistance),
            y: 0
        }];
        
        // Update ideal trajectory if available
        if (showIdeal && data.ideal_trajectory_x && data.ideal_trajectory_y) {
            const idealData = [];
            for (let i = 0; i < data.ideal_trajectory_x.length; i++) {
                idealData.push({
                    x: data.ideal_trajectory_x[i],
                    y: data.ideal_trajectory_y[i]
                });
            }
            
            trajectoryChart.data.datasets[1].data = idealData;
            trajectoryChart.data.datasets[1].hidden = false;
            
            // Show ideal landing distance
            document.getElementById('ideal-landing').textContent = data.ideal_landing_distance.toFixed(2) + ' m';
            
            // Calculate difference
            const difference = data.ideal_landing_distance - data.landing_distance;
            document.getElementById('landing-difference').textContent = difference.toFixed(2) + ' m';
            
            // Show ideal result elements
            document.querySelectorAll('.ideal-result').forEach(el => {
                el.style.display = 'block';
            });
        } else {
            // Hide ideal trajectory
            trajectoryChart.data.datasets[1].hidden = true;
            trajectoryChart.data.datasets[1].data = [];
            
            // Hide ideal result elements
            document.querySelectorAll('.ideal-result').forEach(el => {
                el.style.display = 'none';
            });
        }
        
        // Draw zone areas
        drawZonesOnTrajectoryChart(data.target_zones);
        
        trajectoryChart.update();
        
        // Switch to results tab
        openTab('results');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while running the simulation');
    })
    .finally(() => {
        // Reset button state
        document.getElementById('start-btn').textContent = 'Start Simulation';
        document.getElementById('start-btn').disabled = false;
    });
}

// Draw zones on trajectory chart
function drawZonesOnTrajectoryChart(zones) {
    if (!trajectoryChart || !zones) return;
    
    // Remove existing annotations
    if (trajectoryChart.options.plugins.annotation) {
        trajectoryChart.options.plugins.annotation.annotations = {};
    } else {
        trajectoryChart.options.plugins.annotation = {
            annotations: {}
        };
    }
    
    // Add zone areas as boxes
    const zoneColors = [
        '#FF3333', '#33FF33', '#3333FF', '#FFFF33', '#FF33FF',
        '#33FFFF', '#FF9933', '#9933FF', '#33FF99', '#FF3399'
    ];
    
    const annotations = {};
    
    zones.forEach((zone, index) => {
        const color = zoneColors[index % zoneColors.length];
        
        annotations['zone' + index] = {
            type: 'box',
            xMin: zone[0],
            xMax: zone[1],
            yMin: 0,
            yMax: 0.05,
            backgroundColor: color + '80',
            borderColor: color,
            borderWidth: 1
        };
        
        // Add label for each zone
        annotations['label' + index] = {
            type: 'label',
            xValue: (zone[0] + zone[1]) / 2,
            yValue: 0.025,
            content: 'Zone ' + (index + 1),
            font: {
                size: 12,
                weight: 'bold'
            },
            color: 'black'
        };
    });
    
    trajectoryChart.options.plugins.annotation.annotations = annotations;
}

// Draw field canvas
const drawFieldCanvas = function(ctx, fieldSettings, targetZones) {
    // ล้างแคนวาส
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // ขนาดและตำแหน่ง
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // ตั้งค่าสี
    const colors = {
        background: '#000000',       // พื้นหลังดำ
        grid: '#333333',             // เส้นกริดเทาเข้ม
        gridMain: '#555555',         // เส้นกริดหลักเทาสว่าง
        text: '#FFFFFF',             // ข้อความสีขาว
        robotArea: '#ff2027',        // พื้นที่หุ่นยนต์สีแดง
        swingArea: '#00e0ff',        // พื้นที่ตีสีฟ้า
        releasePoint: '#FFD700',     // จุดปล่อยลูกสีเหลืองทอง
        zonesBase: '#1a1a1a',        // พื้นฐานโซนสีเทาเข้ม
        zones: [
            '#FF3333', '#33FF33', '#3333FF', '#FFFF33', '#FF33FF',
            '#33FFFF', '#FF9933', '#9933FF', '#33FF99', '#FF3399'
        ]
    };
    
    // ขอบเขตพื้นที่วาด (margin)
    const margin = {
        top: 40,
        right: 40,
        bottom: 60,
        left: 100
    };
    
    // พื้นที่วาดที่ใช้งานได้
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // คำนวณ scale ตามความกว้างจริงของกราฟ
    const maxDistance = fieldSettings.max_distance + 0.3; // เพิ่มขอบ 0.3 เมตร
    const drawHeight = 3.0; // ความสูงในการวาด (เมตร)
    
    const xScale = plotWidth / maxDistance;
    const yScale = plotHeight / drawHeight;
    
    // ฟังก์ชันแปลงพิกัด
    const toPixelX = (x) => margin.left + x * xScale;
    const toPixelY = (y) => margin.top + y * yScale;
    
    // วาดพื้นหลังทั้งหมด
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
    
    // วาดเส้นกรอบพื้นที่วาด
    ctx.strokeStyle = colors.gridMain;
    ctx.lineWidth = 2;
    ctx.strokeRect(margin.left, margin.top, plotWidth, plotHeight);
    
    // วาดเส้นกริดแนวตั้ง
    ctx.lineWidth = 1;
    const gridXStep = maxDistance > 5 ? 0.5 : 0.25;
    for (let x = 0; x <= maxDistance; x += gridXStep) {
        ctx.strokeStyle = x % 1 === 0 ? colors.gridMain : colors.grid;
        ctx.beginPath();
        ctx.moveTo(toPixelX(x), margin.top);
        ctx.lineTo(toPixelX(x), margin.top + plotHeight);
        ctx.stroke();
        
        // แสดงค่าระยะทางที่จุดเต็มเมตร
        if (x % 1 === 0 || x === maxDistance - gridXStep) {
            ctx.fillStyle = colors.text;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${x.toFixed(1)}`, toPixelX(x), margin.top + plotHeight + 20);
        }
    }
    
    // ป้ายกำกับแกน X
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ระยะทาง (เมตร)', toPixelX(maxDistance/2), height - 15);
    
    // ป้ายกำกับแกน Y (โซน)
    ctx.save();
    ctx.translate(20, margin.top + plotHeight/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center';
    ctx.fillText('โซนเป้าหมาย', 0, 0);
    ctx.restore();
    
    // ข้อมูลสนาม
    const zoneCount = targetZones.length;
    const zoneHeight = plotHeight / Math.max(6, zoneCount); // ต้องมีอย่างน้อย 6 โซน
    
    // วาดพื้นหลังพื้นที่โซน (เป็นสีเทาเข้ม)
    ctx.fillStyle = colors.zonesBase;
    ctx.fillRect(toPixelX(0), margin.top, toPixelX(maxDistance) - margin.left, plotHeight);
    
    // วาดโซนต่างๆ
    if (targetZones && targetZones.length > 0) {
        targetZones.forEach((zone, index) => {
            const [min, max] = zone;
            const color = colors.zones[index % colors.zones.length];
            
            // คำนวณตำแหน่งและขนาดของโซน
            const zoneY = margin.top + index * zoneHeight;
            
            // วาดพื้นหลังโซน
            ctx.fillStyle = color + '40'; // โปร่งใส 25%
            ctx.fillRect(toPixelX(min), zoneY, (max - min) * xScale, zoneHeight);
            
            // วาดกรอบโซน
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(toPixelX(min), zoneY, (max - min) * xScale, zoneHeight);
            
            // ป้ายชื่อโซน
            ctx.fillStyle = colors.text;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`โซน ${index + 1}`, toPixelX(min) - 10, zoneY + zoneHeight/2 + 5);
            
            // แสดงช่วงระยะทางของโซน
            ctx.fillStyle = colors.text;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${min.toFixed(2)} - ${max.toFixed(2)} m`, toPixelX((min + max) / 2), zoneY + zoneHeight - 10);
        });
    }
    
    // วาดพื้นที่หุ่นยนต์ (Robot Area)
    const robotAreaWidth = 0.5;  // กว้าง 0.5 เมตร
    const robotAreaHeight = 0.5; // สูง 0.5 เมตร
    const robotAreaY = margin.top + plotHeight - robotAreaHeight * yScale;
    
    ctx.fillStyle = colors.robotArea + '60';  // โปร่งใส 60%
    ctx.fillRect(toPixelX(0), robotAreaY, robotAreaWidth * xScale, robotAreaHeight * yScale);
    
    ctx.strokeStyle = colors.robotArea;
    ctx.lineWidth = 3;
    ctx.strokeRect(toPixelX(0), robotAreaY, robotAreaWidth * xScale, robotAreaHeight * yScale);
    
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Robot Area', toPixelX(robotAreaWidth / 2), robotAreaY + robotAreaHeight * yScale / 2);
    
    // วาดพื้นที่ตี (Swing Area)
    const swingAreaWidth = 0.5;  // กว้าง 0.5 เมตร
    const swingAreaHeight = 0.5; // สูง 0.5 เมตร
    
    ctx.fillStyle = colors.swingArea + '60';  // โปร่งใส 60%
    ctx.fillRect(toPixelX(robotAreaWidth), robotAreaY, swingAreaWidth * xScale, swingAreaHeight * yScale);
    
    ctx.strokeStyle = colors.swingArea;
    ctx.lineWidth = 3;
    ctx.strokeRect(toPixelX(robotAreaWidth), robotAreaY, swingAreaWidth * xScale, swingAreaHeight * yScale);
    
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Swing Area', toPixelX(robotAreaWidth + swingAreaWidth / 2), robotAreaY + swingAreaHeight * yScale / 2);
    
    // วาดจุดปล่อยลูก (Release Point)
    // ในมุมมองด้านบน เราจะวาดเป็นเส้นตรงในแนวดิ่งที่มาจากความสูงที่กำหนด
    const releaseHeight = fieldSettings.release_height || 2.0;
    
    ctx.strokeStyle = colors.releasePoint;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 3]); // เส้นประ
    
    ctx.beginPath();
    ctx.moveTo(toPixelX(0), margin.top);
    ctx.lineTo(toPixelX(0), margin.top + plotHeight);
    ctx.stroke();
    
    ctx.setLineDash([]); // กลับเป็นเส้นทึบ
    
    // วาดวงกลมที่จุดปล่อย
    ctx.fillStyle = colors.releasePoint;
    ctx.beginPath();
    ctx.arc(toPixelX(0), margin.top, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // ข้อความจุดปล่อยลูก
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Release Point (${releaseHeight} m)`, toPixelX(0) + 15, margin.top + 20);
    
    // เพิ่มคำอธิบายสนาม
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.text;
    ctx.fillText(`${fieldSettings.field_type.toUpperCase()} FIELD`, width / 2, 25);
    
    // วาดแถบสี (Color Legend) สำหรับโซนต่างๆ
    if (targetZones.length > 0) {
        const legendWidth = 20;
        const legendHeight = 20;
        const legendSpacing = 8;
        const legendY = height - 30;
        const legendStartX = margin.left;
        
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        
        targetZones.forEach((zone, index) => {
            if (index < 6) { // แสดงโซนแรก 6 โซนเท่านั้น เพื่อความสวยงาม
                const legendX = legendStartX + index * (legendWidth + 80);
                const color = colors.zones[index % colors.zones.length];
                
                // วาดกล่องสี
                ctx.fillStyle = color;
                ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
                
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
                
                // ชื่อโซน
                ctx.fillStyle = colors.text;
                ctx.fillText(`Zone ${index + 1}`, legendX + legendWidth + legendSpacing, legendY + legendHeight/2 + 4);
            }
        });
    }
    
    // เพิ่มหัวข้อย่อยในมุมล่างซ้าย
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Min: ${fieldSettings.min_distance}m | Max: ${fieldSettings.max_distance}m | Width: ${fieldSettings.zone_width}m`, margin.left, height - 5);
};

// Draw trajectory canvas
const drawTrajectoryCanvas = function(ctx, data, targetDistance) {
    // ล้างแคนวาส
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // ตั้งค่าสี
    const colors = {
        background: '#1a1a1a',
        grid: '#333333',
        axis: '#FFFFFF',
        trajectory: '#00e0ff',
        idealTrajectory: '#ff2027',
        target: '#FFD700',
        landingPoint: '#33FF33',
        idealLandingPoint: '#FF33FF',
        text: '#FFFFFF',
        zones: [
            '#FF3333', '#33FF33', '#3333FF', '#FFFF33', '#FF33FF',
            '#33FFFF', '#FF9933', '#9933FF', '#33FF99', '#FF3399'
        ]
    };
    
    // คำนวณขนาดและตำแหน่ง
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    const margin = {
        top: 40,
        right: 40,
        bottom: 60,
        left: 60
    };
    
    // ขนาดกราฟที่ใช้งานได้
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // พิจารณาค่า min/max จากข้อมูล
    let xMax = 3.0;  // ค่าเริ่มต้น
    let yMax = 2.5;  // ค่าเริ่มต้น
    
    if (data.trajectory_x && data.trajectory_x.length > 0) {
        xMax = Math.max(xMax, Math.max(...data.trajectory_x) * 1.1);
        yMax = Math.max(yMax, Math.max(...data.trajectory_y) * 1.2);
    }
    
    if (data.ideal_trajectory_x && data.ideal_trajectory_x.length > 0) {
        xMax = Math.max(xMax, Math.max(...data.ideal_trajectory_x) * 1.1);
        yMax = Math.max(yMax, Math.max(...data.ideal_trajectory_y) * 1.2);
    }
    
    if (targetDistance) {
        xMax = Math.max(xMax, targetDistance * 1.1);
    }
    
    // สเกลสำหรับการแปลงค่า
    const xScale = plotWidth / xMax;
    const yScale = plotHeight / yMax;
    
    // ฟังก์ชันแปลงพิกัด
    const toPixelX = (x) => margin.left + x * xScale;
    const toPixelY = (y) => height - margin.bottom - y * yScale;
    
    // วาดพื้นหลัง
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
    
    // วาดเส้นกริด
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    
    // เส้นกริดแนวนอน
    const yStep = yMax > 3 ? 0.5 : 0.25;
    for (let y = 0; y <= yMax; y += yStep) {
        ctx.beginPath();
        ctx.moveTo(toPixelX(0), toPixelY(y));
        ctx.lineTo(toPixelX(xMax), toPixelY(y));
        ctx.stroke();
        
        // แสดงค่าความสูง
        ctx.fillStyle = colors.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${y.toFixed(1)} m`, toPixelX(0) - 5, toPixelY(y) + 4);
    }
    
    // เส้นกริดแนวตั้ง
    const xStep = xMax > 5 ? 1.0 : 0.5;
    for (let x = 0; x <= xMax; x += xStep) {
        ctx.beginPath();
        ctx.moveTo(toPixelX(x), toPixelY(0));
        ctx.lineTo(toPixelX(x), toPixelY(yMax));
        ctx.stroke();
        
        // แสดงค่าระยะทาง
        ctx.fillStyle = colors.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${x.toFixed(1)} m`, toPixelX(x), toPixelY(0) + 20);
    }
    
    // วาดพื้นที่โซนเป้าหมาย
    if (data.target_zones && data.target_zones.length > 0) {
        const zoneHeight = 0.1;  // ความสูงของโซน (เมตร)
        
        data.target_zones.forEach((zone, index) => {
            const [min, max] = zone;
            const color = colors.zones[index % colors.zones.length];
            
            // วาดโซน
            ctx.fillStyle = color + '80';  // เพิ่มความโปร่งใส
            ctx.fillRect(toPixelX(min), toPixelY(0), (max - min) * xScale, zoneHeight * yScale);
            
            // ขอบโซน
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(toPixelX(min), toPixelY(0), (max - min) * xScale, zoneHeight * yScale);
            
            // ชื่อโซน
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Zone ${index + 1}`, toPixelX((min + max) / 2), toPixelY(0) - 5);
        });
    }
    
    // วาดเส้นทางอุดมคติ (ถ้ามี)
    if (data.ideal_trajectory_x && data.ideal_trajectory_x.length > 0 && 
        data.ideal_trajectory_y && data.ideal_trajectory_y.length > 0) {
        
        ctx.strokeStyle = colors.idealTrajectory;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);  // เส้นประ
        
        ctx.beginPath();
        ctx.moveTo(toPixelX(data.ideal_trajectory_x[0]), toPixelY(data.ideal_trajectory_y[0]));
        
        for (let i = 1; i < data.ideal_trajectory_x.length; i++) {
            ctx.lineTo(toPixelX(data.ideal_trajectory_x[i]), toPixelY(data.ideal_trajectory_y[i]));
        }
        
        ctx.stroke();
        ctx.setLineDash([]);  // กลับไปเป็นเส้นทึบ
        
        // วาดจุดตกอุดมคติ
        if (data.ideal_landing_distance) {
            ctx.fillStyle = colors.idealLandingPoint;
            ctx.beginPath();
            ctx.arc(toPixelX(data.ideal_landing_distance), toPixelY(0), 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // แสดงระยะตกอุดมคติ
            ctx.fillStyle = colors.idealLandingPoint;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Ideal: ${data.ideal_landing_distance.toFixed(2)} m`, toPixelX(data.ideal_landing_distance), toPixelY(0) - 25);
        }
    }
    
    // วาดเส้นทางจริง
    if (data.trajectory_x && data.trajectory_x.length > 0 && 
        data.trajectory_y && data.trajectory_y.length > 0) {
        
        ctx.strokeStyle = colors.trajectory;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.moveTo(toPixelX(data.trajectory_x[0]), toPixelY(data.trajectory_y[0]));
        
        for (let i = 1; i < data.trajectory_x.length; i++) {
            ctx.lineTo(toPixelX(data.trajectory_x[i]), toPixelY(data.trajectory_y[i]));
        }
        
        ctx.stroke();
        
        // วาดจุดตกจริง
        if (data.landing_distance) {
            ctx.fillStyle = colors.landingPoint;
            ctx.beginPath();
            ctx.arc(toPixelX(data.landing_distance), toPixelY(0), 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // แสดงระยะตกจริง
            ctx.fillStyle = colors.landingPoint;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Actual: ${data.landing_distance.toFixed(2)} m`, toPixelX(data.landing_distance), toPixelY(0) - 10);
        }
    }
    
    // วาดเป้าหมาย (ถ้ามี)
    if (targetDistance) {
        ctx.fillStyle = colors.target;
        ctx.beginPath();
        ctx.arc(toPixelX(targetDistance), toPixelY(0), 7, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // วาดเส้นเป้าหมาย
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = colors.target;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toPixelX(targetDistance), toPixelY(0));
        ctx.lineTo(toPixelX(targetDistance), toPixelY(yMax * 0.8));
        ctx.stroke();
        ctx.setLineDash([]);
        
        // ข้อความเป้าหมาย
        ctx.fillStyle = colors.target;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Target: ${parseFloat(targetDistance).toFixed(2)} m`, toPixelX(targetDistance), toPixelY(yMax * 0.85));
    }
    
    // วาดชื่อแกน
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Distance (m)', toPixelX(xMax / 2), height - 15);
    
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(15, toPixelY(yMax / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Height (m)', 0, 0);
    ctx.restore();
    
    // วาดชื่อกราฟ
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Ball Trajectory Simulation', toPixelX(xMax / 2), margin.top / 2);
    
    // วาดคำอธิบาย (Legend)
    const legendX = margin.left;
    const legendY = margin.top / 2;
    const legendSpacing = 120;
    
    // Actual Trajectory
    ctx.strokeStyle = colors.trajectory;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY);
    ctx.lineTo(legendX + 30, legendY);
    ctx.stroke();
    
    ctx.fillStyle = colors.text;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Actual Trajectory', legendX + 40, legendY + 4);
    
    // Ideal Trajectory (ถ้ามี)
    if (data.ideal_trajectory_x) {
        ctx.strokeStyle = colors.idealTrajectory;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(legendX + legendSpacing, legendY);
        ctx.lineTo(legendX + legendSpacing + 30, legendY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = colors.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Ideal Trajectory', legendX + legendSpacing + 40, legendY + 4);
    }
    
    // Target
    if (targetDistance) {
        ctx.fillStyle = colors.target;
        ctx.beginPath();
        ctx.arc(legendX + legendSpacing * 2, legendY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = colors.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Target', legendX + legendSpacing * 2 + 10, legendY + 4);
    }
};

// Reset simulation
function resetSimulation() {
    // Reset UI elements to default values
    document.getElementById('release-height').value = '2.0';
    document.getElementById('strike-height').value = '0.35';
    document.getElementById('height-value').textContent = '0.35 m';
    document.getElementById('strike-angle').value = '45';
    document.getElementById('angle-value').textContent = '45.0°';
    document.getElementById('strike-velocity').value = '5.25';
    document.getElementById('velocity-value').textContent = '5.25 m/s';
    document.getElementById('ideal-comparison').checked = false;
    
    // Reset physics settings
    document.getElementById('gravity').value = '9.81';
    document.getElementById('ball-mass').value = '0.024';
    document.getElementById('air-density').value = '1.225';
    document.getElementById('drag-coefficient').value = '0.5';
    document.getElementById('elasticity').value = '0.4';
    
    // Clear results
    document.getElementById('landing-distance').textContent = '0.00 m';
    document.getElementById('target-zone').textContent = 'None';
    document.getElementById('strike-time').textContent = '0.00 s';
    document.getElementById('ideal-landing').textContent = '0.00 m';
    document.getElementById('landing-difference').textContent = '0.00 m';
    
    // Hide ideal result elements
    document.querySelectorAll('.ideal-result').forEach(el => {
        el.style.display = 'none';
    });
    
    // Clear charts
    if (trajectoryChart) {
        trajectoryChart.data.datasets[0].data = [];
        trajectoryChart.data.datasets[1].data = [];
        trajectoryChart.data.datasets[2].data = [];
        trajectoryChart.update();
    }
    
    if (angleChart) {
        angleChart.data.labels = [];
        angleChart.data.datasets[0].data = [];
        angleChart.update();
    }
    
    // Clear test zone results
    document.getElementById('test-zone-results').innerHTML = '';
    
    // Clear sensitivity results
    document.getElementById('sensitivity-results').innerHTML = '';
    
    // Update target zone indicator
    updateTargetZoneIndicator();
}

// Find optimal settings
function optimizeSettings() {
    const targetDistance = document.getElementById('target-distance').value;
    
    // Show loading state
    document.getElementById('optimize-btn').textContent = 'Optimizing...';
    document.getElementById('optimize-btn').disabled = true;
    
    // Send request to backend
    fetch('/api/optimize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            target_distance: targetDistance
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }
        
        // Update UI with optimal settings
        document.getElementById('strike-angle').value = data.angle;
        document.getElementById('angle-value').textContent = data.angle.toFixed(1) + '°';
        document.getElementById('strike-velocity').value = data.velocity;
        document.getElementById('velocity-value').textContent = data.velocity.toFixed(2) + ' m/s';
        
        // Show popup with results including tolerance
        showOptimizedValuesPopup(targetDistance, data.angle, data.velocity, data.angle_min, data.angle_max);
        
        // Start simulation with new settings
        startSimulation();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred during optimization');
    })
    .finally(() => {
        // Reset button state
        document.getElementById('optimize-btn').textContent = 'Find Optimal Settings';
        document.getElementById('optimize-btn').disabled = false;
    });
}

// Show popup with optimized values
function showOptimizedValuesPopup(targetDistance, angle, velocity, angleMin, angleMax) {
    // Create popup elements
    const popup = document.createElement('div');
    popup.className = 'popup';
    
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    
    // Add content
    popupContent.innerHTML = `
        <h2>✅ OPTIMAL SETTINGS FOUND</h2>
        <p>Target Distance: ${parseFloat(targetDistance).toFixed(2)} m</p>
        <hr>
        <div class="popup-params">
            <div class="param-row">
                <span class="param-label">Strike Angle:</span>
                <span class="param-value">${angle.toFixed(2)}°</span>
            </div>
            <div class="param-row">
                <span class="param-label">±5% Tolerance:</span>
                <span class="param-range">${angleMin.toFixed(2)}° - ${angleMax.toFixed(2)}°</span>
            </div>
            <div class="param-row">
                <span class="param-label">Strike Velocity:</span>
                <span class="param-value">${velocity.toFixed(2)} m/s</span>
            </div>
        </div>
        <hr>
        <div class="popup-instructions">
            <p><strong>MACHINE SETUP INSTRUCTIONS</strong></p>
            <ol>
                <li>Set the angle to exactly ${angle.toFixed(2)}° if possible</li>
                <li>If precise adjustment is difficult, any angle between ${angleMin.toFixed(2)}° and ${angleMax.toFixed(2)}° (±5%) should work</li>
                <li>Remember to keep velocity at ${velocity.toFixed(2)} m/s</li>
            </ol>
        </div>
        <div class="popup-buttons">
            <button class="close-btn">Close</button>
        </div>
    `;
    
    // Add to DOM
    popup.appendChild(popupContent);
    document.body.appendChild(popup);
    
    // Add close button event
    popup.querySelector('.close-btn').addEventListener('click', function() {
        document.body.removeChild(popup);
    });
}

// Run sensitivity analysis
function runSensitivityAnalysis() {
    const baseAngle = parseFloat(document.getElementById('base-angle').value);
    const variation = parseFloat(document.getElementById('angle-variation').value);
    const releaseHeight = document.getElementById('release-height').value;
    const strikeVelocity = document.getElementById('strike-velocity').value;
    
    // Show loading
    document.getElementById('sensitivity-results').innerHTML = '<p>Calculating sensitivity...</p>';
    
    // Call API
    fetch('/api/sensitivity_analysis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            base_angle: baseAngle,
            variation: variation,
            release_height: releaseHeight,
            strike_velocity: strikeVelocity
        })
    })
    .then(response => response.json())
    .then(data => {
        // Update angle chart
        angleChart.data.labels = data.angles.map(a => a.toFixed(1));
        angleChart.data.datasets[0].data = data.distances;
        angleChart.update();
        
        // Display results
        let html = `
            <h3>Sensitivity Results</h3>
            <p>Base Angle: ${baseAngle.toFixed(2)}° → Distance: ${data.base_distance.toFixed(3)}m</p>
            <p>±5% Angle Range: ${data.minus_5_percent.angle.toFixed(2)}° to ${data.plus_5_percent.angle.toFixed(2)}°</p>
            <p>Expected Distance Range: ${Math.min(data.minus_5_percent.distance, data.plus_5_percent.distance).toFixed(3)}m to ${Math.max(data.minus_5_percent.distance, data.plus_5_percent.distance).toFixed(3)}m</p>
            <p>Distance Variation: ${data.distance_range.toFixed(3)}m (${data.distance_percent.toFixed(1)}% of base distance)</p>
        `;
        
        // Add tolerance indicator
        let toleranceClass = '';
        let toleranceMessage = '';
        
        if (data.distance_percent <= 5) {
            toleranceClass = 'good';
            toleranceMessage = 'Excellent! The sensitivity is within 5% tolerance.';
        } else if (data.distance_percent <= 10) {
            toleranceClass = 'medium';
            toleranceMessage = 'Acceptable. The sensitivity is within 10% tolerance.';
        } else {
            toleranceClass = 'poor';
            toleranceMessage = 'High sensitivity! Consider using a more stable angle setting.';
        }
        
        html += `<p class="stat-value ${toleranceClass}">${toleranceMessage}</p>`;
        
        document.getElementById('sensitivity-results').innerHTML = html;
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('sensitivity-results').innerHTML = '<p>Error calculating sensitivity analysis</p>';
    });
}

// Test all zones
function testAllZones() {
    const releaseHeight = document.getElementById('release-height').value;
    
    // Show loading
    document.getElementById('test-zone-results').innerHTML = '<p>Testing all zones...</p>';
    
    // Call API
    fetch('/api/test_all_zones', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            release_height: releaseHeight
        })
    })
    .then(response => response.json())
    .then(data => {
        // Create results table
        let html = `
            <h3>Zone Testing Results - ${currentFieldType.toUpperCase()} Field</h3>
            <table class="zone-table">
                <thead>
                    <tr>
                        <th>Zone</th>
                        <th>Range (m)</th>
                        <th>Target (m)</th>
                        <th>Optimal Angle (°)</th>
                        <th>Optimal Velocity (m/s)</th>
                        <th>Actual Distance (m)</th>
                        <th>Error (m)</th>
                        <th>Error (%)</th>
                        <th>Within ±5%</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Add rows for each zone
        data.results.forEach(result => {
            if (typeof result.error === 'string') {
                // Error occurred for this zone
                html += `
                    <tr>
                        <td>${result.zone}</td>
                        <td>${result.range[0].toFixed(2)} - ${result.range[1].toFixed(2)}</td>
                        <td>${result.target.toFixed(2)}</td>
                        <td colspan="6">${result.error}</td>
                    </tr>
                `;
            } else {
                // Success
                const toleranceClass = result.within_tolerance ? 'tolerance-pass' : 'tolerance-fail';
                const toleranceText = result.within_tolerance ? '✓ Yes' : '✗ No';
                
                html += `
                    <tr>
                        <td>${result.zone}</td>
                        <td>${result.range[0].toFixed(2)} - ${result.range[1].toFixed(2)}</td>
                        <td>${result.target.toFixed(2)}</td>
                        <td>${result.angle.toFixed(2)}</td>
                        <td>${result.velocity.toFixed(2)}</td>
                        <td>${result.actual_distance.toFixed(3)}</td>
                        <td>${result.error.toFixed(3)}</td>
                        <td>${result.error_percent.toFixed(1)}%</td>
                        <td class="${toleranceClass}">${toleranceText}</td>
                    </tr>
                `;
            }
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        // Add summary box
        const summary = data.summary;
        let toleranceClass = '';
        
        if (summary.tolerance_percent >= 90) {
            toleranceClass = 'good';
        } else if (summary.tolerance_percent >= 75) {
            toleranceClass = 'medium';
        } else {
            toleranceClass = 'poor';
        }
        
        html += `
            <div class="summary-box">
                <h3>Summary Statistics</h3>
                <div class="stat-row">
                    <span class="stat-label">Success Rate:</span>
                    <span class="stat-value">${summary.successful_zones}/${summary.total_zones} zones (${(summary.successful_zones/summary.total_zones*100).toFixed(1)}%)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Average Error:</span>
                    <span class="stat-value">${summary.avg_error.toFixed(3)} m</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Maximum Error:</span>
                    <span class="stat-value">${summary.max_error.toFixed(3)} m</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Within ±5% Tolerance:</span>
                    <span class="stat-value ${toleranceClass}">${summary.within_tolerance_count}/${summary.total_zones} zones (${summary.tolerance_percent.toFixed(1)}%)</span>
                </div>
            </div>
        `;
        
        // Add recommendation based on results
        if (summary.tolerance_percent < 75) {
            html += `
                <p class="stat-value poor">
                    RECOMMENDATION: Optimization accuracy is below acceptable levels. 
                    Consider refining physics parameters or improving the optimization algorithm.
                </p>
            `;
        } else if (summary.tolerance_percent < 90) {
            html += `
                <p class="stat-value medium">
                    RECOMMENDATION: Optimization is acceptable but could be improved. 
                    Fine-tune physics parameters for better accuracy.
                </p>
            `;
        } else {
            html += `
                <p class="stat-value good">
                    RECOMMENDATION: Optimization is performing well! 
                    The simulation is accurately predicting ball trajectories.
                </p>
            `;
        }
        
        // Display results
        document.getElementById('test-zone-results').innerHTML = html;
        
        // Switch to results tab
        openTab('results');
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('test-zone-results').innerHTML = '<p>Error testing zones: ' + error.message + '</p>';
    });
}

const canvas = document.getElementById('field-canvas');
const ctx = canvas.getContext('2d');
drawFieldCanvas(ctx, fieldSettings, currentZones);
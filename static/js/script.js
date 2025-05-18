// Global variables
let trajectoryChart = null;
let fieldChart = null;
let currentZones = [];
let currentFieldType = 'standard';
let fieldInfoExpanded = false;

// Define a more appealing color palette for zones
const zoneColors = [
    '#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#9C27B0',
    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#8BC34A'
];

// DOM Elements for Message Box
const messageBox = document.getElementById('custom-message-box');
const messageBoxIcon = document.getElementById('message-box-icon');
const messageBoxText = document.getElementById('message-box-text');
const messageBoxCloseBtn = document.getElementById('message-box-close-btn');
const messageBoxContent = messageBox.querySelector('.message-box-content');


// Function to show custom message box
function showCustomMessage(message, type = 'info') { // type can be 'success', 'error', 'warning', 'info'
    messageBoxText.textContent = message;
    messageBoxContent.className = 'message-box-content ' + type; // Reset and add type class

    switch (type) {
        case 'success':
            messageBoxIcon.className = 'fas fa-check-circle';
            break;
        case 'error':
            messageBoxIcon.className = 'fas fa-times-circle';
            break;
        case 'warning':
            messageBoxIcon.className = 'fas fa-exclamation-triangle';
            break;
        case 'info':
        default:
            messageBoxIcon.className = 'fas fa-info-circle';
            break;
    }
    messageBox.classList.remove('message-box-hidden');
    messageBox.classList.add('message-box-visible');
}

// Close message box
if (messageBoxCloseBtn) {
    messageBoxCloseBtn.addEventListener('click', () => {
        messageBox.classList.add('message-box-hidden');
        messageBox.classList.remove('message-box-visible');
    });
}
if (messageBox) {
    messageBox.addEventListener('click', (event) => {
        if (event.target === messageBox) {
            messageBox.classList.add('message-box-hidden');
            messageBox.classList.remove('message-box-visible');
        }
    });
}


// Helper function to toggle disabled state on buttons
function setButtonDisabled(buttonId, isDisabled) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = isDisabled;
    }
}


// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setupTrajectoryChart();
    setupFieldChart();
    
    document.getElementById('strike-height').addEventListener('input', function() {
        document.getElementById('height-value').textContent = this.value + ' m';
    });
    
    document.getElementById('strike-angle').addEventListener('input', function() {
        document.getElementById('angle-value').textContent = this.value + '°';
    });
    
    document.getElementById('strike-velocity').addEventListener('input', function() {
        document.getElementById('velocity-value').textContent = this.value + ' m/s';
    });
    
    document.getElementById('target-distance').addEventListener('input', function() {
        document.getElementById('target-value').textContent = this.value + ' m';
        updateTargetZoneIndicator();
    });
    
    document.getElementById('field-type').addEventListener('change', handleFieldTypeChange);
    
    // Setup field info toggle
    const fieldInfoElem = document.getElementById('field-info-text');
    if(fieldInfoElem) {
        fieldInfoElem.addEventListener('click', toggleFieldInfo);
        // เพิ่มไอคอนที่มุมขวาบนเพื่อบ่งบอกว่าสามารถคลิกได้
        fieldInfoElem.innerHTML = fieldInfoElem.innerHTML + 
          '<div class="field-info-toggle"><i class="fas fa-chevron-down"></i></div>';
    }
    
    fetchFieldInfo();
});

function handleFieldTypeChange() {
    const fieldType = document.getElementById('field-type').value;
    const isCustom = fieldType === 'custom';
    document.getElementById('min-distance').disabled = !isCustom;
    document.getElementById('max-distance').disabled = !isCustom;
    document.getElementById('zone-width').disabled = !isCustom;
    document.getElementById('apply-field-btn').disabled = !isCustom;
    if (!isCustom) {
        changeFieldType(fieldType); 
    }
}


// Tab functionality
function openTab(tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    const tabButtons = document.getElementsByClassName('tab-btn');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    document.getElementById(tabName).classList.add('active');
    
    for (let i = 0; i < tabButtons.length; i++) {
        if (tabButtons[i].getAttribute('onclick').includes(tabName)) {
            tabButtons[i].classList.add('active');
            break;
        }
    }
    
    updateChartsIfNeeded(tabName);
}

function updateChartsIfNeeded(tabName) {
    if (tabName === 'field' && fieldChart) {
        setTimeout(() => fieldChart.resize(), 0);
        fieldChart.update();
    } else if (tabName === 'results' && trajectoryChart) {
        setTimeout(() => trajectoryChart.resize(), 0);
        trajectoryChart.update();
    }
}

function setupTrajectoryChart() {
    const ctx = document.getElementById('trajectory-chart').getContext('2d');
    Chart.defaults.color = '#e0e0e0';

    trajectoryChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Ball Trajectory', // วิถีลูกบอล
                    data: [],
                    borderColor: '#03a9f4',
                    backgroundColor: '#03a9f4',
                    showLine: true,
                    pointRadius: 3,
                    tension: 0.1
                },
                {
                    label: 'Ideal Trajectory', // วิถีในอุดมคติ
                    data: [],
                    borderColor: '#e53935',
                    backgroundColor: '#e53935',
                    showLine: true,
                    pointRadius: 0,
                    borderDash: [5, 5],
                    hidden: true,
                    tension: 0.1
                },
                {
                    label: 'Target Landing', // จุดตกเป้าหมาย
                    data: [],
                    backgroundColor: '#ffc107',
                    borderColor: '#ffc107',
                    pointRadius: 10,
                    pointStyle: 'star',
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Distance (m)', color: '#e0e0e0', font: {size: 14} }, // ระยะทาง (เมตร)
                    ticks: { color: '#9e9e9e' },
                    grid: { color: '#424242', borderColor: '#424242' }
                },
                y: {
                    title: { display: true, text: 'Height (m)', color: '#e0e0e0', font: {size: 14} }, // ความสูง (เมตร)
                    ticks: { color: '#9e9e9e' },
                    grid: { color: '#424242', borderColor: '#424242' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { labels: { color: '#e0e0e0', font: {size: 12} } },
                tooltip: {
                    backgroundColor: 'rgba(42, 42, 42, 0.9)',
                    titleColor: '#e0e0e0',
                    bodyColor: '#e0e0e0',
                    callbacks: {
                        label: function(context) {
                            return `(${context.parsed.x.toFixed(2)}m, ${context.parsed.y.toFixed(2)}m)`;
                        }
                    }
                },
                annotation: { annotations: {} }
            }
        }
    });
}

function setupFieldChart() {
    const ctx = document.getElementById('field-chart').getContext('2d');
    fieldChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [], // ชื่อโซน
            datasets: [{
                label: 'Target Zones (m)', // โซนเป้าหมาย (เมตร)
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
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'easeOutQuart',
                    from: 0.8,
                    to: 0.2,
                    loop: false
                }
            },
            onHover: (event, chartElements) => {
                const chart = event.chart;
                const canvas = chart.canvas;
                
                if (chartElements && chartElements.length > 0) {
                    canvas.style.cursor = 'pointer';
                    // ไฮไลท์โซนที่เลื่อนเมาส์ไป
                    const index = chartElements[0].index;
                    handleZoneHover(index);
                } else {
                    canvas.style.cursor = 'default';
                    // ยกเลิกไฮไลท์
                    handleZoneHover(-1);
                }
            },
            onClick: (event, chartElements) => {
                if (chartElements && chartElements.length > 0) {
                    const index = chartElements[0].index;
                    // เมื่อคลิกที่โซน ตั้งค่า target distance เป็นค่ากลางของโซนนั้น
                    if (currentZones[index]) {
                        const zoneMiddle = (currentZones[index][0] + currentZones[index][1]) / 2;
                        const targetSlider = document.getElementById('target-distance');
                        targetSlider.value = zoneMiddle.toFixed(2);
                        document.getElementById('target-value').textContent = zoneMiddle.toFixed(2) + ' m';
                        updateTargetZoneIndicator();
                        showCustomMessage(`ตั้งค่าระยะเป้าหมายเป็นกึ่งกลางของโซน ${index + 1} (${zoneMiddle.toFixed(2)}m)`, 'info');
                    }
                }
            },
            scales: {
                x: { 
                    title: { 
                        display: true, 
                        text: 'Distance from Striker (m)', 
                        color: '#e0e0e0',
                        font: {size: 16, weight: 'bold'} 
                    }, // ระยะห่างจากเครื่องตี (เมตร)
                    ticks: { 
                        color: '#9e9e9e',
                        font: {size: 14}
                    },
                    grid: { 
                        color: 'rgba(66, 66, 66, 0.5)',
                        drawBorder: true,
                        drawTicks: true
                    },
                    min: 0
                },
                y: {
                    title: { 
                        display: true, 
                        text: 'Zones', 
                        color: '#e0e0e0', 
                        font: {size: 16, weight: 'bold'} 
                    }, // โซน
                    ticks: { 
                        color: '#e0e0e0',
                        font: {size: 14, weight: 'bold'},
                        padding: 10,
                        z: 10
                    },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(42, 42, 42, 0.9)',
                    titleColor: '#e0e0e0',
                    bodyColor: '#e0e0e0',
                    titleFont: {size: 16, weight: 'bold'},
                    bodyFont: {size: 14},
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(tooltipItem) {
                            return tooltipItem[0].label;
                        },
                        label: function(context) {
                            const raw = context.raw;
                            if (raw && typeof raw[0] !== 'undefined' && typeof raw[1] !== 'undefined') {
                                return `${raw[0].toFixed(2)}m - ${raw[1].toFixed(2)}m (ความกว้าง: ${(raw[1] - raw[0]).toFixed(2)}m)`;
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// ฟังก์ชันสำหรับไฮไลท์โซน
function handleZoneHover(index) {
    if (!fieldChart || !fieldChart.data || !fieldChart.data.datasets || !fieldChart.data.datasets[0]) {
        return;
    }
    
    const dataset = fieldChart.data.datasets[0];
    const backgroundColor = [...dataset.backgroundColor];
    const borderColor = [...dataset.borderColor];
    const hoverBorderWidth = [...Array(backgroundColor.length)].fill(dataset.borderWidth);
    
    if (index >= 0 && index < backgroundColor.length) {
        for (let i = 0; i < backgroundColor.length; i++) {
            if (i === index) {
                // ทำให้แถบที่เลือกสว่างขึ้น
                const baseColor = zoneColors[i % zoneColors.length];
                const ctx = document.createElement('canvas').getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 400, 0);
                
                gradient.addColorStop(0, baseColor + 'CC'); // ความโปร่งใส 80%
                gradient.addColorStop(0.5, baseColor + 'FF'); // สีเต็ม
                gradient.addColorStop(1, baseColor + 'FF'); // สีเต็ม
                
                backgroundColor[i] = gradient;
                borderColor[i] = '#ffffff'; // ขอบสีขาวเมื่อไฮไลท์
                hoverBorderWidth[i] = 4; // เพิ่มความหนาขอบ
            } else {
                // ทำให้แถบอื่นจางลง
                const baseColor = zoneColors[i % zoneColors.length];
                const ctx = document.createElement('canvas').getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 400, 0);
                
                gradient.addColorStop(0, baseColor + '44'); // ความโปร่งใส 27%
                gradient.addColorStop(0.5, baseColor + '88'); // ความโปร่งใส 53%
                gradient.addColorStop(1, baseColor + 'AA'); // ความโปร่งใส 67%
                
                backgroundColor[i] = gradient;
                borderColor[i] = zoneColors[i % zoneColors.length] + '88';
                hoverBorderWidth[i] = dataset.borderWidth;
            }
        }
    } else {
        // ตั้งค่าสีปกติสำหรับทุกแถบ
        for (let i = 0; i < backgroundColor.length; i++) {
            const baseColor = zoneColors[i % zoneColors.length];
            const ctx = document.createElement('canvas').getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 400, 0);
            
            gradient.addColorStop(0, baseColor + '99'); // ความโปร่งใส 60%
            gradient.addColorStop(0.5, baseColor + 'CC'); // ความโปร่งใส 80%
            gradient.addColorStop(1, baseColor + 'FF'); // สีเต็ม
            
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
        if(fieldChart) {
            fieldChart.data.labels = [];
            fieldChart.data.datasets[0].data = [];
            fieldChart.data.datasets[0].backgroundColor = [];
            fieldChart.data.datasets[0].borderColor = [];
            fieldChart.update();
        }
        return;
    }
    
    const zoneLabels = zones.map((_, index) => `Zone ${index + 1}`); // โซน 1, โซน 2, ...
    const floatingBarData = zones.map(zone => [zone[0], zone[1]]); 
    
    // ทำให้สีมีความสวยงามยิ่งขึ้นด้วยการใช้ความโปร่งใสและลักษณะของแถบสีที่หลากหลาย
    const backgroundColors = zones.map((_, index) => {
        const baseColor = zoneColors[index % zoneColors.length];
        const ctx = document.createElement('canvas').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 400, 0);
        
        // สร้าง gradient จากสีพื้นหลังไปยังสีหลัก
        gradient.addColorStop(0, baseColor + '99'); // ความโปร่งใส 60%
        gradient.addColorStop(0.5, baseColor + 'CC'); // ความโปร่งใส 80% 
        gradient.addColorStop(1, baseColor + 'FF'); // สีเต็ม
        
        return gradient;
    });
    
    const borderColors = zones.map((_, index) => zoneColors[index % zoneColors.length]);
    
    // ตั้งค่าข้อมูลและสีให้กับกราฟ
    fieldChart.data.labels = zoneLabels;
    fieldChart.data.datasets[0].data = floatingBarData;
    fieldChart.data.datasets[0].backgroundColor = backgroundColors;
    fieldChart.data.datasets[0].borderColor = borderColors;
    fieldChart.data.datasets[0].hoverBackgroundColor = backgroundColors.map((_, index) => {
        const baseColor = zoneColors[index % zoneColors.length];
        return baseColor + 'FF'; // สีเต็มเมื่อ hover
    });
    fieldChart.data.datasets[0].hoverBorderColor = borderColors.map((_, index) => '#ffffff');
    
    // ปรับช่วงการแสดงผลให้มีความสวยงาม
    const allDistances = zones.flat();
    const overallMinDistance = Math.min(...allDistances, 0);
    const overallMaxDistance = Math.max(...allDistances);
    
    fieldChart.options.scales.x.min = overallMinDistance > 0 ? Math.floor(overallMinDistance * 0.9) : 0;
    fieldChart.options.scales.x.max = Math.ceil(overallMaxDistance * 1.1);
    
    // เพิ่มการตกแต่ง
    fieldChart.options.plugins.tooltip.callbacks.beforeLabel = function(context) {
        const index = context.dataIndex;
        const width = zones[index][1] - zones[index][0];
        return `ความกว้างของโซน: ${width.toFixed(2)}m`;
    };
    
    // อัปเดตกราฟ
    fieldChart.update();
}

function fetchFieldInfo() {
    setButtonDisabled('reset-btn', true); 
    fetch('/api/field_info')
        .then(response => response.json())
        .then(data => {
            currentZones = data.zones;
            currentFieldType = data.dimensions.field_type;
            
            const minDistance = data.dimensions.min_distance;
            const maxDistance = data.dimensions.max_distance;
            
            const targetSlider = document.getElementById('target-distance');
            targetSlider.min = minDistance;
            targetSlider.max = maxDistance;
            if (parseFloat(targetSlider.value) < minDistance) targetSlider.value = minDistance;
            if (parseFloat(targetSlider.value) > maxDistance) targetSlider.value = maxDistance;
            document.getElementById('target-value').textContent = parseFloat(targetSlider.value).toFixed(2) + ' m';

            document.getElementById('field-type').value = currentFieldType;
            document.getElementById('min-distance').value = minDistance.toFixed(2);
            document.getElementById('max-distance').value = maxDistance.toFixed(2);
            document.getElementById('zone-width').value = data.dimensions.zone_width.toFixed(2);
            
            updateFieldChart(currentZones);
            updateTargetZoneIndicator();

            const fieldInfoElem = document.getElementById('field-info-text');
            if (fieldInfoElem) {
                 fieldInfoElem.innerHTML = `
                    <p><strong>Field Type:</strong> ${currentFieldType.charAt(0).toUpperCase() + currentFieldType.slice(1)}</p> 
                    <p><strong>Total Range:</strong> ${minDistance.toFixed(2)}m - ${maxDistance.toFixed(2)}m</p> 
                    <p><strong>Number of Zones:</strong> ${currentZones.length}</p>
                    <div class="field-info-toggle"><i class="fas fa-chevron-down"></i></div>
                    <div class="field-info-details">
                        <p><strong>Robot Area:</strong> 0.0m - 0.5m (approx.)</p>
                        <p><strong>Average Zone Width:</strong> ${data.dimensions.zone_width.toFixed(2)}m</p>
                        <p><strong>Zone Distribution:</strong> ${data.dimensions.distribution || 'Even'}</p>
                    </div>
                 `;
                 
                 // เพิ่ม event listener สำหรับการคลิก
                 fieldInfoElem.addEventListener('click', toggleFieldInfo);
                 
                 // ซ่อนรายละเอียดเพิ่มเติมเมื่อโหลดครั้งแรก
                 const detailsElem = fieldInfoElem.querySelector('.field-info-details');
                 if (detailsElem) {
                     detailsElem.style.display = 'none';
                 }
            }
        })
        .catch(error => {
            console.error('Error fetching field info:', error);
            showCustomMessage('ไม่สามารถโหลดข้อมูลสนามได้ กรุณาลองใหม่อีกครั้ง', 'error');
        })
        .finally(() => {
            setButtonDisabled('reset-btn', false);
        });
}

function toggleFieldInfo(event) {
    const fieldInfoElem = document.getElementById('field-info-text');
    if (!fieldInfoElem) return;
    
    const detailsElem = fieldInfoElem.querySelector('.field-info-details');
    const toggleIcon = fieldInfoElem.querySelector('.field-info-toggle i');
    
    if (!detailsElem || !toggleIcon) return;
    
    fieldInfoExpanded = !fieldInfoExpanded;
    
    if (fieldInfoExpanded) {
        detailsElem.style.display = 'block';
        toggleIcon.className = 'fas fa-chevron-up';
        // เลื่อนลงทีละน้อยเพื่อการเปลี่ยนแปลงที่นุ่มนวล
        detailsElem.style.opacity = '0';
        detailsElem.style.maxHeight = '0';
        setTimeout(() => {
            detailsElem.style.transition = 'all 0.3s ease';
            detailsElem.style.opacity = '1';
            detailsElem.style.maxHeight = '200px';
        }, 10);
    } else {
        detailsElem.style.opacity = '0';
        detailsElem.style.maxHeight = '0';
        toggleIcon.className = 'fas fa-chevron-down';
        setTimeout(() => {
            detailsElem.style.display = 'none';
        }, 300);
    }
}

function updateFieldInfoAfterChange(fieldType, minVal, maxVal, zoneWidth, zoneCount) {
    const fieldInfoElem = document.getElementById('field-info-text');
    if (fieldInfoElem) {
         fieldInfoElem.innerHTML = `
            <p><strong>Field Type:</strong> ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}</p>
            <p><strong>Total Range:</strong> ${minVal.toFixed(2)}m - ${maxVal.toFixed(2)}m</p>
            <p><strong>Number of Zones:</strong> ${zoneCount}</p>
            <div class="field-info-toggle"><i class="fas fa-chevron-${fieldInfoExpanded ? 'up' : 'down'}"></i></div>
            <div class="field-info-details" style="${fieldInfoExpanded ? '' : 'display: none;'}">
                <p><strong>Robot Area:</strong> 0.0m - 0.5m (approx.)</p>
                <p><strong>Average Zone Width:</strong> ${zoneWidth.toFixed(2)}m</p>
                <p><strong>Zone Distribution:</strong> ${fieldType === 'custom' ? 'Custom' : 'Standard'}</p>
            </div>
         `;
         
         // เพิ่ม event listener สำหรับการคลิก
         fieldInfoElem.addEventListener('click', toggleFieldInfo);
    }
}

function updateTargetZoneIndicator() {
    const targetDistance = parseFloat(document.getElementById('target-distance').value);
    let zoneIndex = -1;

    for (let i = 0; i < currentZones.length; i++) {
        const [min, max] = currentZones[i];
        if (targetDistance >= min && targetDistance < max) {
            zoneIndex = i;
            break;
        }
        if (i === currentZones.length - 1 && targetDistance === max) {
            zoneIndex = i;
            break;
        }
    }
    
    const indicatorElem = document.getElementById('indicator-zone');
    if (zoneIndex >= 0) {
        indicatorElem.textContent = `Zone ${zoneIndex + 1}`; // โซน X
        indicatorElem.style.backgroundColor = zoneColors[zoneIndex % zoneColors.length];
    } else {
        indicatorElem.textContent = 'Outside'; // นอกโซน
        indicatorElem.style.backgroundColor = '#757575';
    }
}

function changeFieldType(fieldType) { 
    setButtonDisabled('apply-field-btn', true); 
    fetch('/api/change_field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_type: fieldType })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showCustomMessage('เกิดข้อผิดพลาดในการเปลี่ยนประเภทสนาม: ' + data.error, 'error');
            return;
        }
        currentZones = data.zones;
        currentFieldType = fieldType;
        
        const minVal = data.dimensions.min_distance;
        const maxVal = data.dimensions.max_distance;
        const zoneWidth = data.dimensions.zone_width;

        document.getElementById('min-distance').value = minVal.toFixed(2);
        document.getElementById('max-distance').value = maxVal.toFixed(2);
        document.getElementById('zone-width').value = zoneWidth.toFixed(2);
        
        const targetSlider = document.getElementById('target-distance');
        targetSlider.min = minVal;
        targetSlider.max = maxVal;
        if (parseFloat(targetSlider.value) < minVal) targetSlider.value = minVal;
        if (parseFloat(targetSlider.value) > maxVal) targetSlider.value = maxVal;
        document.getElementById('target-value').textContent = parseFloat(targetSlider.value).toFixed(2) + ' m';
        
        updateFieldChart(currentZones);
        updateTargetZoneIndicator();
        updateFieldInfoAfterChange(fieldType, minVal, maxVal, zoneWidth, currentZones.length);

        showCustomMessage(`เปลี่ยนประเภทสนามเป็น ${fieldType} แล้ว`, 'success');
        
        // เพิ่มการเคลื่อนไหวเพื่อดึงดูดความสนใจไปยังการเปลี่ยนแปลง
        const fieldChartCanvas = document.getElementById('field-chart');
        if (fieldChartCanvas) {
            fieldChartCanvas.style.transition = 'all 0.3s ease';
            fieldChartCanvas.style.transform = 'scale(1.02)';
            setTimeout(() => {
                fieldChartCanvas.style.transform = 'scale(1)';
            }, 300);
        }
    })
    .catch(error => {
        console.error('Error changing field type:', error);
        showCustomMessage('ไม่สามารถเปลี่ยนประเภทสนามได้ กรุณาลองใหม่อีกครั้ง', 'error');
    })
    .finally(() => {
        setButtonDisabled('apply-field-btn', false);
    });
}

function applyFieldSettings() {
    const minDistance = parseFloat(document.getElementById('min-distance').value);
    const maxDistance = parseFloat(document.getElementById('max-distance').value);
    const zoneWidth = parseFloat(document.getElementById('zone-width').value);
    
    if (isNaN(minDistance) || isNaN(maxDistance) || isNaN(zoneWidth)) {
        showCustomMessage('กรุณาใส่ตัวเลขที่ถูกต้องสำหรับขนาดสนามที่กำหนดเอง', 'warning');
        return;
    }
    if (minDistance >= maxDistance) {
        showCustomMessage('ระยะทางต่ำสุดต้องน้อยกว่าระยะทางสูงสุด', 'warning');
        return;
    }
    if (zoneWidth <= 0) {
        showCustomMessage('ความกว้างของโซนต้องเป็นค่าบวก', 'warning');
        return;
    }
    
    setButtonDisabled('apply-field-btn', true);
    currentFieldType = 'custom';
    
    const newZones = [];
    let current = minDistance;
    while (current < maxDistance) {
        const next = Math.min(current + zoneWidth, maxDistance);
        newZones.push([current, next]);
        current = next;
        if (newZones.length >= 20) break;
    }
    currentZones = newZones;
    
    const targetSlider = document.getElementById('target-distance');
    targetSlider.min = minDistance;
    targetSlider.max = maxDistance;
    if (parseFloat(targetSlider.value) < minDistance) targetSlider.value = minDistance;
    if (parseFloat(targetSlider.value) > maxDistance) targetSlider.value = maxDistance;
    document.getElementById('target-value').textContent = parseFloat(targetSlider.value).toFixed(2) + ' m';
    
    updateFieldChart(currentZones);
    updateTargetZoneIndicator();
    updateFieldInfoAfterChange('custom', minDistance, maxDistance, zoneWidth, newZones.length);

    // เพิ่มภาพเคลื่อนไหวให้กับการเปลี่ยนแปลง
    const fieldVisual = document.querySelector('#field .field-visualization');
    if (fieldVisual) {
        fieldVisual.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        fieldVisual.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            fieldVisual.style.transform = 'translateY(0)';
        }, 500);
    }

    setTimeout(() => {
        setButtonDisabled('apply-field-btn', false);
        showCustomMessage('ใช้การตั้งค่าสนามที่กำหนดเองสำหรับการแสดงผลแล้ว', 'success');
    }, 500);
}

function startSimulation() {
    const releaseHeight = document.getElementById('release-height').value;
    const strikeHeight = document.getElementById('strike-height').value;
    const strikeAngle = document.getElementById('strike-angle').value;
    const strikeVelocity = document.getElementById('strike-velocity').value;
    const showIdeal = document.getElementById('ideal-comparison').checked;
    
    if (parseFloat(strikeAngle) < 10 || parseFloat(strikeAngle) > 80) {
        showCustomMessage('มุมที่ตีต้องอยู่ระหว่าง 10 ถึง 80 องศา', 'warning');
        return;
    }
     if (parseFloat(strikeVelocity) < 1 || parseFloat(strikeVelocity) > 20) {
        showCustomMessage('ความเร็วในการตีต้องอยู่ระหว่าง 1 ถึง 20 m/s', 'warning');
        return;
    }

    const physics = {
        gravity: parseFloat(document.getElementById('gravity').value),
        ball_mass: parseFloat(document.getElementById('ball-mass').value),
        air_density: parseFloat(document.getElementById('air-density').value),
        drag_coefficient: parseFloat(document.getElementById('drag-coefficient').value),
        elasticity: parseFloat(document.getElementById('elasticity').value)
    };
    
    setButtonDisabled('start-btn', true);
    
    fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            release_height: releaseHeight,
            strike_height: strikeHeight,
            strike_angle: strikeAngle,
            strike_velocity: strikeVelocity,
            show_ideal: showIdeal,
            physics: physics,
            field_type: currentFieldType
        })
    })
    .then(response => {
        if (!response.ok) { 
            return response.json().then(errData => {
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        document.getElementById('landing-distance').textContent = data.landing_distance.toFixed(2) + ' m';
        const targetZoneElem = document.getElementById('target-zone');
        if (data.target_zone) {
            targetZoneElem.textContent = 'Zone ' + data.target_zone;
            targetZoneElem.style.color = zoneColors[(data.target_zone - 1) % zoneColors.length];
        } else {
            targetZoneElem.textContent = 'None (Outside)';
            targetZoneElem.style.color = '#9e9e9e';
        }
        
        document.getElementById('strike-time').textContent = data.strike_time.toFixed(3) + ' s';
        
        const trajectoryData = data.trajectory_x.map((x, i) => ({ x: x, y: data.trajectory_y[i] }));
        trajectoryChart.data.datasets[0].data = trajectoryData;
        
        const targetDistance = parseFloat(document.getElementById('target-distance').value);
        trajectoryChart.data.datasets[2].data = [{ x: targetDistance, y: 0 }];
        
        const idealResults = document.querySelectorAll('.ideal-result');
        if (showIdeal && data.ideal_trajectory_x) {
            const idealData = data.ideal_trajectory_x.map((x, i) => ({ x: x, y: data.ideal_trajectory_y[i] }));
            trajectoryChart.data.datasets[1].data = idealData;
            trajectoryChart.data.datasets[1].hidden = false;
            
            document.getElementById('ideal-landing').textContent = data.ideal_landing_distance.toFixed(2) + ' m';
            const difference = data.ideal_landing_distance - data.landing_distance;
            document.getElementById('landing-difference').textContent = difference.toFixed(2) + ' m';
            idealResults.forEach(el => el.style.display = 'block');
        } else {
            trajectoryChart.data.datasets[1].data = [];
            trajectoryChart.data.datasets[1].hidden = true;
            idealResults.forEach(el => el.style.display = 'none');
        }
        
        drawZonesOnTrajectoryChart(data.target_zones);
        trajectoryChart.update();
        openTab('results');
        showCustomMessage('การจำลองเสร็จสมบูรณ์!', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showCustomMessage(`เกิดข้อผิดพลาดในการจำลอง: ${error.message}`, 'error');
    })
    .finally(() => {
        setButtonDisabled('start-btn', false);
    });
}

function drawZonesOnTrajectoryChart(zonesData) {
    if (!trajectoryChart || !zonesData) return;

    const annotations = {};
    zonesData.forEach((zone, index) => {
        const color = zoneColors[index % zoneColors.length];
        annotations['zoneBox' + index] = {
            type: 'box',
            xMin: zone[0],
            xMax: zone[1],
            yMin: -0.05,
            yMax: 0.05,
            backgroundColor: color + '4D',
            borderColor: color + '99',
            borderWidth: 1,
            drawTime: 'beforeDatasetsDraw'
        };
        annotations['zoneLabel' + index] = {
            type: 'label',
            xValue: (zone[0] + zone[1]) / 2,
            yValue: 0.1,
            content: `Z${index + 1}`,
            color: '#e0e0e0',
            font: { size: 10, weight: 'bold' },
            backgroundColor: 'rgba(42, 42, 42, 0.7)',
            padding: 2,
            borderRadius: 3
        };
    });
    
    if (!trajectoryChart.options.plugins) trajectoryChart.options.plugins = {};
    if (!trajectoryChart.options.plugins.annotation) trajectoryChart.options.plugins.annotation = {};
    trajectoryChart.options.plugins.annotation.annotations = annotations;
}

function resetSimulation() {
    setButtonDisabled('reset-btn', true);
    document.getElementById('release-height').value = '2.0';
    document.getElementById('strike-height').value = '0.35';
    document.getElementById('height-value').textContent = '0.35 m';
    document.getElementById('strike-angle').value = '45';
    document.getElementById('angle-value').textContent = '45.0°';
    document.getElementById('strike-velocity').value = '5.25';
    document.getElementById('velocity-value').textContent = '5.25 m/s';
    document.getElementById('ideal-comparison').checked = false;
    
    document.getElementById('gravity').value = '9.81';
    document.getElementById('ball-mass').value = '0.024';
    document.getElementById('air-density').value = '1.225';
    document.getElementById('drag-coefficient').value = '0.5';
    document.getElementById('elasticity').value = '0.4';
    
    document.getElementById('landing-distance').textContent = '0.00 m';
    document.getElementById('target-zone').textContent = 'None';
    document.getElementById('target-zone').style.color = '#9e9e9e';
    document.getElementById('strike-time').textContent = '0.00 s';
    document.getElementById('ideal-landing').textContent = '0.00 m';
    document.getElementById('landing-difference').textContent = '0.00 m';
    document.querySelectorAll('.ideal-result').forEach(el => el.style.display = 'none');
    
    const optAngleDisplay = document.getElementById('optimal-angle-tolerance-display');
    if (optAngleDisplay) optAngleDisplay.style.display = 'none';

    if (trajectoryChart) {
        trajectoryChart.data.datasets.forEach(dataset => dataset.data = []);
        if (trajectoryChart.options.plugins.annotation) {
             trajectoryChart.options.plugins.annotation.annotations = {};
        }
        trajectoryChart.update();
    }
    
    document.getElementById('field-type').value = 'standard';
    handleFieldTypeChange(); 

    document.getElementById('test-zone-results').innerHTML = '';
    
    // fetchFieldInfo has its own finally block to re-enable the reset button.
    // If fetchFieldInfo is not called by handleFieldTypeChange, enable here.
    // For now, assuming fetchFieldInfo will handle it.
    showCustomMessage('รีเซ็ตการจำลองเป็นค่าเริ่มต้นแล้ว', 'info');
}

function optimizeSettings() {
    const targetDistance = document.getElementById('target-distance').value;
    const releaseHeight = document.getElementById('release-height').value;
    const strikeHeight = document.getElementById('strike-height').value;

    setButtonDisabled('optimize-btn', true);
    const optAngleDisplay = document.getElementById('optimal-angle-tolerance-display');
    if (optAngleDisplay) optAngleDisplay.style.display = 'none';

    fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            target_distance: targetDistance,
            release_height: releaseHeight,
            strike_height: strikeHeight
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        document.getElementById('strike-angle').value = data.angle.toFixed(1);
        document.getElementById('angle-value').textContent = data.angle.toFixed(1) + '°';
        document.getElementById('strike-velocity').value = data.velocity.toFixed(2);
        document.getElementById('velocity-value').textContent = data.velocity.toFixed(2) + ' m/s';
        
        if (optAngleDisplay) {
            document.getElementById('optimized-angle-value').textContent = `${data.angle.toFixed(2)}°`;
            document.getElementById('optimized-angle-tolerance-range').textContent = `${data.angle_min.toFixed(2)}° - ${data.angle_max.toFixed(2)}°`;
            document.getElementById('optimized-velocity-value').textContent = `${data.velocity.toFixed(2)} m/s`;
            optAngleDisplay.style.display = 'block';
        }
        showCustomMessage(`พบการตั้งค่าที่เหมาะสมที่สุดสำหรับ ${targetDistance}m และนำไปใช้แล้ว มุม: ${data.angle.toFixed(2)}°, ความเร็ว: ${data.velocity.toFixed(2)} m/s.`, 'success');
        startSimulation();
    })
    .catch(error => {
        console.error('Error:', error);
        showCustomMessage(`เกิดข้อผิดพลาดในการค้นหาค่าที่เหมาะสม: ${error.message}`, 'error');
         if (optAngleDisplay) optAngleDisplay.style.display = 'none';
    })
    .finally(() => {
        setButtonDisabled('optimize-btn', false);
    });
}

function showOptimizedValuesPopup(targetDistance, angle, velocity, angleMin, angleMax) {
    const popup = document.createElement('div');
    popup.className = 'popup'; 
    
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content'; 
    
    popupContent.innerHTML = `
        <h2><span class="popup-icon fas fa-check-circle" style="color:var(--success-color); margin-right:10px;"></span>พบการตั้งค่าที่เหมาะสมที่สุด</h2>
        <p style="text-align:center; font-size: 1.1em; color: #e0e0e0;">สำหรับระยะเป้าหมาย: <strong>${parseFloat(targetDistance).toFixed(2)} m</strong></p>
        <hr>
        <div class="popup-params">
            <div class="param-row">
                <span class="param-label">มุมที่ตีที่เหมาะสม:</span>
                <span class="param-value">${angle.toFixed(2)}°</span>
            </div>
            <div class="param-row">
                <span class="param-label">ช่วงค่าที่ยอมรับได้ (±5%):</span>
                <span class="param-range">${angleMin.toFixed(2)}° - ${angleMax.toFixed(2)}°</span>
            </div>
            <div class="param-row">
                <span class="param-label">ความเร็วที่ตีที่เหมาะสม:</span>
                <span class="param-value" style="color: var(--contrast-color);">${velocity.toFixed(2)} m/s</span>
            </div>
        </div>
        <hr>
        <div class="popup-instructions">
            <p>คำแนะนำในการตั้งค่าเครื่อง:</p>
            <ol>
                <li>ตั้งค่ามุมเป็น <strong>${angle.toFixed(2)}°</strong>. (ช่วง: ${angleMin.toFixed(2)}° ถึง ${angleMax.toFixed(2)}°)</li>
                <li>ตั้งค่าความเร็วเป็น <strong>${velocity.toFixed(2)} m/s</strong>.</li>
                <li>ตรวจสอบให้แน่ใจว่าพารามิเตอร์อื่นๆ (ความสูงปล่อย/ตี) ตรงกับการตั้งค่าปัจจุบัน</li>
            </ol>
        </div>
        <div class="popup-buttons">
            <button class="close-btn primary-btn">ปิด</button>
        </div>
    `;
    
    popup.appendChild(popupContent);
    document.body.appendChild(popup);
    
    setTimeout(() => popup.classList.add('show'), 10);

    popup.querySelector('.close-btn').addEventListener('click', function() {
        popup.classList.remove('show');
        setTimeout(() => document.body.removeChild(popup), 300);
    });
    popup.addEventListener('click', function(event) {
        if (event.target === popup) {
            popup.classList.remove('show');
            setTimeout(() => document.body.removeChild(popup), 300);
        }
    });
}

function testAllZones() {
    const releaseHeight = document.getElementById('release-height').value;
    const strikeHeight = document.getElementById('strike-height').value;

    setButtonDisabled('test-zones-btn', true);
    document.getElementById('test-zone-results').innerHTML = '<p style="text-align:center; color: var(--text-muted-color);">กำลังทดสอบทุกโซนสำหรับสนามปัจจุบัน...</p>';
    
    fetch('/api/test_all_zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            release_height: releaseHeight,
            strike_height: strikeHeight,
            field_type: currentFieldType
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        let html = `
            <h3>ผลการทดสอบการหาค่าที่เหมาะสมที่สุดสำหรับโซน - สนาม ${currentFieldType.charAt(0).toUpperCase() + currentFieldType.slice(1)}</h3>
            <table class="zone-table">
                <thead>
                    <tr>
                        <th>โซน</th><th>ช่วง (m)</th><th>เป้าหมาย (m)</th>
                        <th>มุมที่เหมาะสม (°)</th><th>ความเร็วที่เหมาะสม (m/s)</th>
                        <th>ระยะทางจริง (m)</th><th>ค่าคลาดเคลื่อน (m)</th><th>ค่าคลาดเคลื่อน (%)</th><th>ผ่าน (±5%)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.results.forEach(result => {
            if (typeof result.error === 'string') {
                html += `
                    <tr>
                        <td>${result.zone}</td>
                        <td>${result.range[0].toFixed(2)} - ${result.range[1].toFixed(2)}</td>
                        <td>${result.target.toFixed(2)}</td>
                        <td colspan="6" style="color: var(--error-color);">${result.error}</td>
                    </tr>
                `;
            } else {
                const toleranceClass = result.within_tolerance ? 'tolerance-pass' : 'tolerance-fail';
                const toleranceText = result.within_tolerance ? '✓ ใช่' : '✗ ไม่';
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
        html += `</tbody></table>`;
        
        const summary = data.summary;
        let toleranceClassOverall = '';
        if (summary.tolerance_percent >= 90) toleranceClassOverall = 'good';
        else if (summary.tolerance_percent >= 75) toleranceClassOverall = 'medium';
        else toleranceClassOverall = 'poor';
        
        html += `
            <div class="summary-box">
                <h3>สรุปผลการหาค่าที่เหมาะสมที่สุดโดยรวม</h3>
                <div class="stat-row"><span class="stat-label">การหาค่าที่เหมาะสมสำเร็จ:</span><span class="stat-value">${summary.successful_zones}/${summary.total_zones} (${(summary.successful_zones/summary.total_zones*100).toFixed(1)}%)</span></div>
                <div class="stat-row"><span class="stat-label">ค่าคลาดเคลื่อนเฉลี่ย:</span><span class="stat-value">${summary.avg_error.toFixed(3)} m</span></div>
                <div class="stat-row"><span class="stat-label">ค่าคลาดเคลื่อนสูงสุด:</span><span class="stat-value">${summary.max_error.toFixed(3)} m</span></div>
                <div class="stat-row"><span class="stat-label">โซนที่อยู่ในช่วงค่าที่ยอมรับได้ ±5%:</span><span class="stat-value ${toleranceClassOverall}">${summary.within_tolerance_count}/${summary.total_zones} (${summary.tolerance_percent.toFixed(1)}%)</span></div>
            </div>
        `;
        
        let recommendation = '';
        if (summary.tolerance_percent < 75) recommendation = `<p class="stat-value poor" style="text-align:center; margin-top:15px;">คำแนะนำ: ความแม่นยำในการหาค่าที่เหมาะสมต่ำ ควรตรวจสอบพารามิเตอร์ทางฟิสิกส์หรือตรรกะการหาค่าที่เหมาะสม</p>`;
        else if (summary.tolerance_percent < 90) recommendation = `<p class="stat-value medium" style="text-align:center; margin-top:15px;">คำแนะนำ: การหาค่าที่เหมาะสมอยู่ในเกณฑ์ที่ยอมรับได้ การปรับจูนเพิ่มเติมอาจช่วยให้ผลลัพธ์ดีขึ้น</p>`;
        else recommendation = `<p class="stat-value good" style="text-align:center; margin-top:15px;">คำแนะนำ: การหาค่าที่เหมาะสมทำงานได้ดีมาก!</p>`;
        html += recommendation;
        
        document.getElementById('test-zone-results').innerHTML = html;
        openTab('results');
        showCustomMessage('ทดสอบทุกโซนเสร็จสิ้น', 'success');
    })
    .catch(error => {
        console.error('Error testing zones:', error);
        document.getElementById('test-zone-results').innerHTML = `<p style="color:var(--error-color);">เกิดข้อผิดพลาด: ${error.message}</p>`;
        showCustomMessage(`เกิดข้อผิดพลาดในการทดสอบโซน: ${error.message}`, 'error');
    })
    .finally(() => {
        setButtonDisabled('test-zones-btn', false);
    });
}

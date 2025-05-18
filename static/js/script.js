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

// =====================
// DARK RED THEME ENHANCEMENTS (OVERRIDE)
// =====================

// Custom chart theme for dark mode with red highlights
function setupDarkRedChartTheme() {
    // Global chart defaults
    Chart.defaults.color = '#b0b0b0';
    Chart.defaults.borderColor = '#333333';
    Chart.defaults.font.family = "'Inter', 'Helvetica Neue', 'Arial', sans-serif";
    
    // Update zone colors to match our dark red theme
    window.zoneColors = [
        '#ff2027', '#ff5252', '#ff9e80', '#ffab40', '#64b5f6',
        '#00e676', '#9575cd', '#f06292', '#4dd0e1', '#ffd54f'
    ];
    
    // Style modifications for trajectory chart
    if (window.trajectoryChart) {
        trajectoryChart.data.datasets[0].borderColor = '#ff2027';
        trajectoryChart.data.datasets[0].backgroundColor = '#ff2027';
        trajectoryChart.data.datasets[0].pointRadius = 2;
        trajectoryChart.data.datasets[0].borderWidth = 2;
        
        trajectoryChart.data.datasets[1].borderColor = '#ff9e80';
        trajectoryChart.data.datasets[1].backgroundColor = '#ff9e80';
        trajectoryChart.data.datasets[1].borderDash = [5, 5];
        
        trajectoryChart.data.datasets[2].backgroundColor = '#ffab40';
        trajectoryChart.data.datasets[2].borderColor = '#ffab40';
        trajectoryChart.data.datasets[2].pointRadius = 8;
        
        // Update chart options for dark theme
        trajectoryChart.options.scales.x.grid.color = 'rgba(51, 51, 51, 0.6)';
        trajectoryChart.options.scales.y.grid.color = 'rgba(51, 51, 51, 0.6)';
        trajectoryChart.options.scales.x.ticks.color = '#b0b0b0';
        trajectoryChart.options.scales.y.ticks.color = '#b0b0b0';
        trajectoryChart.options.scales.x.title.color = '#ffffff';
        trajectoryChart.options.scales.y.title.color = '#ffffff';
        
        // Enhance tooltips
        trajectoryChart.options.plugins.tooltip.backgroundColor = 'rgba(20, 20, 20, 0.9)';
        trajectoryChart.options.plugins.tooltip.titleColor = '#ffffff';
        trajectoryChart.options.plugins.tooltip.bodyColor = '#ffffff';
        trajectoryChart.options.plugins.tooltip.borderColor = '#ff2027';
        trajectoryChart.options.plugins.tooltip.borderWidth = 1;
        trajectoryChart.options.plugins.tooltip.cornerRadius = 4;
        
        trajectoryChart.update();
    }
    
    // Style modifications for field chart
    if (window.fieldChart) {
        // For the field chart gradient colors
        if (fieldChart.data && fieldChart.data.datasets && fieldChart.data.datasets[0]) {
            const dataset = fieldChart.data.datasets[0];
            
            // Create gradients for each zone
            const backgroundColors = [];
            const borderColors = [];
            
            for (let i = 0; i < window.zoneColors.length; i++) {
                const baseColor = window.zoneColors[i % window.zoneColors.length];
                borderColors.push(baseColor);
                
                // Create gradient
                try {
                    const ctx = document.createElement('canvas').getContext('2d');
                    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
                    
                    gradient.addColorStop(0, baseColor + '80');  // 50% transparent
                    gradient.addColorStop(0.5, baseColor + 'B0'); // 70% opacity
                    gradient.addColorStop(1, baseColor + 'FF');  // Full opacity
                    
                    backgroundColors.push(gradient);
                } catch (e) {
                    // Fallback if gradient fails
                    backgroundColors.push(baseColor + '99');
                }
            }
            
            dataset.backgroundColor = backgroundColors;
            dataset.borderColor = borderColors;
            dataset.borderWidth = 2;
            dataset.borderRadius = 4;
        }
        
        // Update chart options for dark theme
        fieldChart.options.scales.x.grid.color = 'rgba(51, 51, 51, 0.6)';
        fieldChart.options.scales.y.grid.color = 'rgba(51, 51, 51, 0.6)';
        fieldChart.options.scales.x.ticks.color = '#b0b0b0';
        fieldChart.options.scales.y.ticks.color = '#b0b0b0';
        fieldChart.options.scales.x.title.color = '#ffffff';
        fieldChart.options.scales.y.title.color = '#ffffff';
        
        // Enhance tooltips
        fieldChart.options.plugins.tooltip.backgroundColor = 'rgba(20, 20, 20, 0.9)';
        fieldChart.options.plugins.tooltip.titleColor = '#ffffff';
        fieldChart.options.plugins.tooltip.bodyColor = '#ffffff';
        fieldChart.options.plugins.tooltip.borderColor = '#ff2027';
        fieldChart.options.plugins.tooltip.borderWidth = 1;
        fieldChart.options.plugins.tooltip.cornerRadius = 4;
        
        fieldChart.update();
    }
}

// Enhanced notification system
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notification-message');
    const iconEl = notification.querySelector('.notification-icon');
    
    // Set message
    messageEl.textContent = message;
    
    // Set icon based on type
    iconEl.className = 'notification-icon';
    switch(type) {
        case 'success':
            iconEl.innerHTML = '<i class="fas fa-check-circle" style="color: #00e676;"></i>';
            break;
        case 'error':
            iconEl.innerHTML = '<i class="fas fa-times-circle" style="color: #ff5252;"></i>';
            break;
        case 'warning':
            iconEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ffab40;"></i>';
            break;
        case 'info':
        default:
            iconEl.innerHTML = '<i class="fas fa-info-circle" style="color: #64b5f6;"></i>';
            break;
    }
    
    // Add animation class
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Function to handle zone hover with enhanced visual effect
function handleZoneHoverEnhanced(index) {
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
                // Make selected zone more vibrant
                const baseColor = window.zoneColors[i % window.zoneColors.length];
                const ctx = document.createElement('canvas').getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 400, 0);
                
                gradient.addColorStop(0, baseColor + 'CC');  // 80% opacity
                gradient.addColorStop(0.5, baseColor + 'FF'); // Full opacity
                gradient.addColorStop(1, baseColor + 'FF');  // Full opacity
                
                backgroundColor[i] = gradient;
                borderColor[i] = '#ffffff';  // White border for highlight
                hoverBorderWidth[i] = 4;     // Thicker border
            } else {
                // Dim other zones
                const baseColor = window.zoneColors[i % window.zoneColors.length];
                const ctx = document.createElement('canvas').getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 400, 0);
                
                gradient.addColorStop(0, baseColor + '33');  // 20% opacity
                gradient.addColorStop(0.5, baseColor + '66'); // 40% opacity
                gradient.addColorStop(1, baseColor + '88');  // 53% opacity
                
                backgroundColor[i] = gradient;
                borderColor[i] = baseColor + '66';  // Semi-transparent border
                hoverBorderWidth[i] = dataset.borderWidth;
            }
        }
    } else {
        // Reset all zones to normal
        for (let i = 0; i < backgroundColor.length; i++) {
            const baseColor = window.zoneColors[i % window.zoneColors.length];
            const ctx = document.createElement('canvas').getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 400, 0);
            
            gradient.addColorStop(0, baseColor + '80');  // 50% opacity
            gradient.addColorStop(0.5, baseColor + 'B0'); // 70% opacity
            gradient.addColorStop(1, baseColor + 'FF');  // Full opacity
            
            backgroundColor[i] = gradient;
            borderColor[i] = baseColor;
            hoverBorderWidth[i] = dataset.borderWidth;
        }
    }
    
    dataset.backgroundColor = backgroundColor;
    dataset.borderColor = borderColor;
    dataset.hoverBorderWidth = hoverBorderWidth;
    fieldChart.update();
}

// Enhanced version of drawZonesOnTrajectoryChart
function drawZonesOnTrajectoryChartEnhanced(zonesData) {
    if (!trajectoryChart || !zonesData) return;

    const annotations = {};
    zonesData.forEach((zone, index) => {
        const color = window.zoneColors[index % window.zoneColors.length];
        annotations['zoneBox' + index] = {
            type: 'box',
            xMin: zone[0],
            xMax: zone[1],
            yMin: -0.05,
            yMax: 0.05,
            backgroundColor: color + '33', // More transparent
            borderColor: color + '99',
            borderWidth: 1,
            borderDash: [3, 3], // Dashed line
            drawTime: 'beforeDatasetsDraw',
            borderRadius: 2
        };
        annotations['zoneLabel' + index] = {
            type: 'label',
            xValue: (zone[0] + zone[1]) / 2,
            yValue: 0.1,
            content: `Z${index + 1}`,
            color: '#ffffff',
            font: { 
                size: 10, 
                weight: 'bold',
                family: "'Inter', sans-serif"
            },
            backgroundColor: 'rgba(30, 30, 30, 0.8)',
            padding: 4,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: color
        };
    });
    
    if (!trajectoryChart.options.plugins) trajectoryChart.options.plugins = {};
    if (!trajectoryChart.options.plugins.annotation) trajectoryChart.options.plugins.annotation = {};
    trajectoryChart.options.plugins.annotation.annotations = annotations;
}

// Function to toggle accordion sections
function toggleAccordion(id) {
    const content = document.getElementById(id);
    content.classList.toggle('active');
    
    const icon = content.previousElementSibling.querySelector('i.fa-chevron-down, i.fa-chevron-up');
    if (content.classList.contains('active')) {
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

// Setup on document load
// (Override/Enhance behaviors for dark red theme)
document.addEventListener('DOMContentLoaded', function() {
    // Save original functions to override
    const originalShowCustomMessage = window.showCustomMessage;
    const originalHandleZoneHover = window.handleZoneHover;
    const originalDrawZonesOnTrajectoryChart = window.drawZonesOnTrajectoryChart;
    
    // Override with enhanced functions
    window.showCustomMessage = showNotification;
    
    if (originalHandleZoneHover) {
        window.handleZoneHover = handleZoneHoverEnhanced;
    }
    
    if (originalDrawZonesOnTrajectoryChart) {
        window.drawZonesOnTrajectoryChart = drawZonesOnTrajectoryChartEnhanced;
    }
    
    // Apply dark red theme to charts after a slight delay to ensure they're initialized
    setTimeout(setupDarkRedChartTheme, 500);
    
    // Make sure value displays have correct values
    const heightSlider = document.getElementById('strike-height');
    if (heightSlider) {
        document.getElementById('height-value').textContent = heightSlider.value + 'm';
    }
    
    const angleSlider = document.getElementById('strike-angle');
    if (angleSlider) {
        document.getElementById('angle-value').textContent = angleSlider.value + '°';
    }
    
    const velocitySlider = document.getElementById('strike-velocity');
    if (velocitySlider) {
        document.getElementById('velocity-value').textContent = velocitySlider.value + ' m/s';
    }
    
    const targetSlider = document.getElementById('target-distance');
    if (targetSlider) {
        document.getElementById('target-value').textContent = targetSlider.value + 'm';
    }
    
    // Set up accordion for advanced settings
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    if (accordionHeaders.length > 0) {
        accordionHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const contentId = this.getAttribute('data-target') || 
                                 this.nextElementSibling.id;
                toggleAccordion(contentId);
            });
        });
    }
    
    // Add pulsing effect to results after simulation
    const originalStartSimulation = window.startSimulation;
    if (originalStartSimulation) {
        window.startSimulation = function() {
            // Call original function
            const result = originalStartSimulation.apply(this, arguments);
            
            // Add pulse effect to results
            setTimeout(() => {
                const resultCards = document.querySelectorAll('.result-card');
                resultCards.forEach(card => {
                    card.classList.add('pulse');
                    setTimeout(() => card.classList.remove('pulse'), 2000);
                });
            }, 1000);
            
            return result;
        };
    }
    
    // Enhance test zone results display
    const originalTestAllZones = window.testAllZones;
    if (originalTestAllZones) {
        window.testAllZones = function() {
            // Call original function
            const result = originalTestAllZones.apply(this, arguments);
            
            // Add smooth scroll to results
            setTimeout(() => {
                const resultsElem = document.getElementById('test-zone-results');
                if (resultsElem) {
                    resultsElem.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 1000);
            
            return result;
        };
    }
});

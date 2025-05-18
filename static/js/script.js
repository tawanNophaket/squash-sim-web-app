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

// ปรับปรุง script.js เพื่อให้ทำงานกับ UI ใหม่

// ปรับปรุงฟังก์ชันแสดงข้อความแจ้งเตือนเพื่อใช้กับ notification UI ใหม่
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
            iconEl.innerHTML = '<i class="fas fa-check-circle" style="color: #4caf50;"></i>';
            break;
        case 'error':
            iconEl.innerHTML = '<i class="fas fa-times-circle" style="color: #f44336;"></i>';
            break;
        case 'warning':
            iconEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ff9800;"></i>';
            break;
        case 'info':
        default:
            iconEl.innerHTML = '<i class="fas fa-info-circle" style="color: #2196f3;"></i>';
            break;
    }
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// แทนที่ฟังก์ชันเดิม
window.showCustomMessage = showNotification;

// ฟังก์ชันสำหรับ toggle accordion
function toggleAccordion(id) {
    const content = document.getElementById(id);
    content.classList.toggle('active');
    
    const icon = content.previousElementSibling.querySelector('i');
    if (content.classList.contains('active')) {
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

// อัปเดตการตั้งค่ากราฟให้เข้ากับธีมมินิมัล
function updateChartStyles() {
    // ตั้งค่าสีพื้นฐานสำหรับ Chart.js
    Chart.defaults.color = '#212121';
    Chart.defaults.borderColor = '#e0e0e0';
    Chart.defaults.font.family = "'Inter', 'Helvetica Neue', 'Arial', sans-serif";
    
    // อัปเดต trajectory chart ถ้ามีอยู่แล้ว
    if (window.trajectoryChart) {
        // อัปเดตสีและสไตล์
        trajectoryChart.options.plugins.legend.labels.color = '#212121';
        trajectoryChart.options.plugins.legend.labels.font = {
            family: "'Inter', 'Helvetica Neue', 'Arial', sans-serif",
            size: 12
        };
        
        trajectoryChart.options.scales.x.grid.color = '#f0f0f0';
        trajectoryChart.options.scales.y.grid.color = '#f0f0f0';
        trajectoryChart.options.scales.x.ticks.color = '#757575';
        trajectoryChart.options.scales.y.ticks.color = '#757575';
        
        trajectoryChart.options.plugins.tooltip.backgroundColor = 'rgba(33, 33, 33, 0.9)';
        trajectoryChart.options.plugins.tooltip.titleColor = '#ffffff';
        trajectoryChart.options.plugins.tooltip.bodyColor = '#ffffff';
        trajectoryChart.options.plugins.tooltip.borderColor = '#3f51b5';
        trajectoryChart.options.plugins.tooltip.borderWidth = 1;
        
        trajectoryChart.update();
    }
    
    // อัปเดต field chart ถ้ามีอยู่แล้ว
    if (window.fieldChart) {
        // อัปเดตสีและสไตล์
        fieldChart.options.scales.x.grid.color = '#f0f0f0';
        fieldChart.options.scales.y.grid.color = '#f0f0f0';
        fieldChart.options.scales.x.ticks.color = '#757575';
        fieldChart.options.scales.y.ticks.color = '#757575';
        
        fieldChart.options.plugins.tooltip.backgroundColor = 'rgba(33, 33, 33, 0.9)';
        fieldChart.options.plugins.tooltip.titleColor = '#ffffff';
        fieldChart.options.plugins.tooltip.bodyColor = '#ffffff';
        fieldChart.options.plugins.tooltip.borderColor = '#3f51b5';
        fieldChart.options.plugins.tooltip.borderWidth = 1;
        
        fieldChart.update();
    }
}

// แทนที่ฟังก์ชันเดิมสำหรับ setupTrajectoryChart
function setupTrajectoryChart_Minimal() {
    // เรียกฟังก์ชันเดิมก่อน
    if (typeof window.setupTrajectoryChart === 'function') {
        window.setupTrajectoryChart();
    } else {
        console.error('Original setupTrajectoryChart function not found');
        return;
    }
    
    // ปรับแต่งเพิ่มเติม
    if (window.trajectoryChart) {
        // ปรับสีของชุดข้อมูล
        trajectoryChart.data.datasets[0].borderColor = '#3f51b5';
        trajectoryChart.data.datasets[0].backgroundColor = '#3f51b5';
        
        trajectoryChart.data.datasets[1].borderColor = '#f44336';
        trajectoryChart.data.datasets[1].backgroundColor = '#f44336';
        
        trajectoryChart.data.datasets[2].backgroundColor = '#ff4081';
        trajectoryChart.data.datasets[2].borderColor = '#ff4081';
        
        trajectoryChart.update();
    }
}

// แทนที่ฟังก์ชันเดิมสำหรับ setupFieldChart
function setupFieldChart_Minimal() {
    // เรียกฟังก์ชันเดิมก่อน
    if (typeof window.setupFieldChart === 'function') {
        window.setupFieldChart();
    } else {
        console.error('Original setupFieldChart function not found');
        return;
    }
    
    // ปรับแต่งเพิ่มเติม
    if (window.fieldChart) {
        // ปรับแต่งสีของโซน
        const minimalZoneColors = [
            '#3f51b5', '#f44336', '#4caf50', '#ff9800', '#9c27b0',
            '#03a9f4', '#e91e63', '#ffc107', '#795548', '#607d8b'
        ];
        
        // อัปเดตสีโซน
        window.zoneColors = minimalZoneColors;
        
        fieldChart.update();
    }
}

// ปรับแต่งค่า UI เมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
    // เก็บฟังก์ชันเดิมไว้
    const originalShowCustomMessage = window.showCustomMessage;
    const originalSetupTrajectoryChart = window.setupTrajectoryChart;
    const originalSetupFieldChart = window.setupFieldChart;
    
    // แทนที่ด้วยฟังก์ชันใหม่
    window.showCustomMessage = showNotification;
    
    // อัปเดตฟังก์ชัน setup charts
    if (originalSetupTrajectoryChart) {
        window.setupTrajectoryChart = function() {
            originalSetupTrajectoryChart();
            updateChartStyles();
        };
    }
    
    if (originalSetupFieldChart) {
        window.setupFieldChart = function() {
            originalSetupFieldChart();
            updateChartStyles();
        };
    }
    
    // ติดตั้ง event handlers สำหรับ accordion
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            content.classList.toggle('active');
            
            const icon = this.querySelector('i');
            if (content.classList.contains('active')) {
                icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
            } else {
                icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
            }
        });
    });
    
    // ตั้งค่า UI values ที่แสดงผลให้ตรงกับค่าปัจจุบัน
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
});

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

// ปรับปรุงฟังก์ชันแสดงข้อความแจ้งเตือนเพื่อใช้กับ notification UI ใหม่
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
            iconEl.innerHTML = '<i class="fas fa-check-circle" style="color: #4caf50;"></i>';
            break;
        case 'error':
            iconEl.innerHTML = '<i class="fas fa-times-circle" style="color: #f44336;"></i>';
            break;
        case 'warning':
            iconEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ff9800;"></i>';
            break;
        case 'info':
        default:
            iconEl.innerHTML = '<i class="fas fa-info-circle" style="color: #2196f3;"></i>';
            break;
    }
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// แทนที่ฟังก์ชันเดิม
window.showCustomMessage = showNotification;

// ฟังก์ชันสำหรับ toggle accordion
function toggleAccordion(id) {
    const content = document.getElementById(id);
    content.classList.toggle('active');
    
    const icon = content.previousElementSibling.querySelector('i');
    if (content.classList.contains('active')) {
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

// อัปเดตการตั้งค่ากราฟให้เข้ากับธีมมินิมัล
function updateChartStyles() {
    // ตั้งค่าสีพื้นฐานสำหรับ Chart.js
    Chart.defaults.color = '#212121';
    Chart.defaults.borderColor = '#e0e0e0';
    Chart.defaults.font.family = "'Inter', 'Helvetica Neue', 'Arial', sans-serif";
    
    // อัปเดต trajectory chart ถ้ามีอยู่แล้ว
    if (window.trajectoryChart) {
        // อัปเดตสีและสไตล์
        trajectoryChart.options.plugins.legend.labels.color = '#212121';
        trajectoryChart.options.plugins.legend.labels.font = {
            family: "'Inter', 'Helvetica Neue', 'Arial', sans-serif",
            size: 12
        };
        
        trajectoryChart.options.scales.x.grid.color = '#f0f0f0';
        trajectoryChart.options.scales.y.grid.color = '#f0f0f0';
        trajectoryChart.options.scales.x.ticks.color = '#757575';
        trajectoryChart.options.scales.y.ticks.color = '#757575';
        
        trajectoryChart.options.plugins.tooltip.backgroundColor = 'rgba(33, 33, 33, 0.9)';
        trajectoryChart.options.plugins.tooltip.titleColor = '#ffffff';
        trajectoryChart.options.plugins.tooltip.bodyColor = '#ffffff';
        trajectoryChart.options.plugins.tooltip.borderColor = '#3f51b5';
        trajectoryChart.options.plugins.tooltip.borderWidth = 1;
        
        trajectoryChart.update();
    }
    
    // อัปเดต field chart ถ้ามีอยู่แล้ว
    if (window.fieldChart) {
        // อัปเดตสีและสไตล์
        fieldChart.options.scales.x.grid.color = '#f0f0f0';
        fieldChart.options.scales.y.grid.color = '#f0f0f0';
        fieldChart.options.scales.x.ticks.color = '#757575';
        fieldChart.options.scales.y.ticks.color = '#757575';
        
        fieldChart.options.plugins.tooltip.backgroundColor = 'rgba(33, 33, 33, 0.9)';
        fieldChart.options.plugins.tooltip.titleColor = '#ffffff';
        fieldChart.options.plugins.tooltip.bodyColor = '#ffffff';
        fieldChart.options.plugins.tooltip.borderColor = '#3f51b5';
        fieldChart.options.plugins.tooltip.borderWidth = 1;
        
        fieldChart.update();
    }
}

// แทนที่ฟังก์ชันเดิมสำหรับ setupTrajectoryChart
function setupTrajectoryChart_Minimal() {
    // เรียกฟังก์ชันเดิมก่อน
    if (typeof window.setupTrajectoryChart === 'function') {
        window.setupTrajectoryChart();
    } else {
        console.error('Original setupTrajectoryChart function not found');
        return;
    }
    
    // ปรับแต่งเพิ่มเติม
    if (window.trajectoryChart) {
        // ปรับสีของชุดข้อมูล
        trajectoryChart.data.datasets[0].borderColor = '#3f51b5';
        trajectoryChart.data.datasets[0].backgroundColor = '#3f51b5';
        
        trajectoryChart.data.datasets[1].borderColor = '#f44336';
        trajectoryChart.data.datasets[1].backgroundColor = '#f44336';
        
        trajectoryChart.data.datasets[2].backgroundColor = '#ff4081';
        trajectoryChart.data.datasets[2].borderColor = '#ff4081';
        
        trajectoryChart.update();
    }
}

// แทนที่ฟังก์ชันเดิมสำหรับ setupFieldChart
function setupFieldChart_Minimal() {
    // เรียกฟังก์ชันเดิมก่อน
    if (typeof window.setupFieldChart === 'function') {
        window.setupFieldChart();
    } else {
        console.error('Original setupFieldChart function not found');
        return;
    }
    
    // ปรับแต่งเพิ่มเติม
    if (window.fieldChart) {
        // ปรับแต่งสีของโซน
        const minimalZoneColors = [
            '#3f51b5', '#f44336', '#4caf50', '#ff9800', '#9c27b0',
            '#03a9f4', '#e91e63', '#ffc107', '#795548', '#607d8b'
        ];
        
        // อัปเดตสีโซน
        window.zoneColors = minimalZoneColors;
        
        fieldChart.update();
    }
}

// ปรับแต่งค่า UI เมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
    // เก็บฟังก์ชันเดิมไว้
    const originalShowCustomMessage = window.showCustomMessage;
    const originalSetupTrajectoryChart = window.setupTrajectoryChart;
    const originalSetupFieldChart = window.setupFieldChart;
    
    // แทนที่ด้วยฟังก์ชันใหม่
    window.showCustomMessage = showNotification;
    
    // อัปเดตฟังก์ชัน setup charts
    if (originalSetupTrajectoryChart) {
        window.setupTrajectoryChart = function() {
            originalSetupTrajectoryChart();
            updateChartStyles();
        };
    }
    
    if (originalSetupFieldChart) {
        window.setupFieldChart = function() {
            originalSetupFieldChart();
            updateChartStyles();
        };
    }
    
    // ติดตั้ง event handlers สำหรับ accordion
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            content.classList.toggle('active');
            
            const icon = this.querySelector('i');
            if (content.classList.contains('active')) {
                icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
            } else {
                icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
            }
        });
    });
    
    // ตั้งค่า UI values ที่แสดงผลให้ตรงกับค่าปัจจุบัน
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
});

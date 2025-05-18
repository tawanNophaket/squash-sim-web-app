// Global variables
let trajectoryChart = null;
let angleChart = null;

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set up charts
    setupTrajectoryChart();
    setupAngleChart();
    
    // Set up event listeners
    document.getElementById('strike-angle').addEventListener('input', function() {
        document.getElementById('angle-value').textContent = this.value + '°';
    });
    
    document.getElementById('strike-velocity').addEventListener('input', function() {
        document.getElementById('velocity-value').textContent = this.value + ' m/s';
    });
    
    document.getElementById('target-distance').addEventListener('input', function() {
        document.getElementById('target-value').textContent = this.value + ' m';
    });
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
    event.currentTarget.classList.add('active');
}

// Setup trajectory chart
function setupTrajectoryChart() {
    const ctx = document.getElementById('trajectory-chart').getContext('2d');
    trajectoryChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Ball Trajectory',
                data: [],
                backgroundColor: '#00e0ff',
                showLine: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Distance (m)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Height (m)'
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
                        text: 'Strike Angle (°)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Landing Distance (m)'
                    }
                }
            }
        }
    });
}

// Start simulation
function startSimulation() {
    const releaseHeight = document.getElementById('release-height').value;
    const strikeAngle = document.getElementById('strike-angle').value;
    const strikeVelocity = document.getElementById('strike-velocity').value;
    
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
            strike_angle: strikeAngle,
            strike_velocity: strikeVelocity
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
        document.getElementById('target-zone').textContent = data.target_zone ? 'Zone ' + data.target_zone : 'None';
        
        // Update trajectory chart
        const trajectoryData = [];
        for (let i = 0; i < data.trajectory_x.length; i++) {
            trajectoryData.push({
                x: data.trajectory_x[i],
                y: data.trajectory_y[i]
            });
        }
        
        trajectoryChart.data.datasets[0].data = trajectoryData;
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

// Reset simulation
function resetSimulation() {
    // Reset UI elements to default values
    document.getElementById('release-height').value = '2.0';
    document.getElementById('strike-angle').value = '45';
    document.getElementById('angle-value').textContent = '45.0°';
    document.getElementById('strike-velocity').value = '5.25';
    document.getElementById('velocity-value').textContent = '5.25 m/s';
    
    // Clear results
    document.getElementById('landing-distance').textContent = '0.00 m';
    document.getElementById('target-zone').textContent = 'None';
    
    // Clear charts
    trajectoryChart.data.datasets[0].data = [];
    trajectoryChart.update();
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
    
    // Generate angle values
    const angles = [];
    const distances = [];
    
    // Get current settings
    const releaseHeight = document.getElementById('release-height').value;
    const strikeVelocity = document.getElementById('strike-velocity').value;
    
    // Show loading
    document.getElementById('sensitivity-results').innerHTML = '<p>Calculating sensitivity...</p>';
    
    // Generate data for different angles
    const requests = [];
    
    for (let angle = baseAngle - variation; angle <= baseAngle + variation; angle += variation / 5) {
        angles.push(angle);
        
        // Create a request for each angle
        requests.push(
            fetch('/api/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    release_height: releaseHeight,
                    strike_angle: angle,
                    strike_velocity: strikeVelocity
                })
            }).then(response => response.json())
        );
    }
    
    // Wait for all requests to complete
    Promise.all(requests)
        .then(results => {
            // Extract distances
            results.forEach(data => {
                distances.push(data.landing_distance);
            });
            
            // Update angle chart
            angleChart.data.labels = angles.map(a => a.toFixed(1));
            angleChart.data.datasets[0].data = distances;
            angleChart.update();
            
            // Calculate sensitivity metrics
            const baseDistance = results[Math.floor(results.length / 2)].landing_distance;
            const minAngle = baseAngle * 0.95;  // -5%
            const maxAngle = baseAngle * 1.05;  // +5%
            
            // Find distances at ±5%
            const minIndex = angles.findIndex(a => a >= minAngle);
            const maxIndex = angles.findIndex(a => a >= maxAngle);
            
            const minDistance = minIndex >= 0 ? distances[minIndex] : null;
            const maxDistance = maxIndex >= 0 ? distances[maxIndex] : null;
            
            // Calculate distance variation
            let distanceVariation = null;
            let distancePercent = null;
            
            if (minDistance !== null && maxDistance !== null) {
                distanceVariation = Math.abs(maxDistance - minDistance);
                distancePercent = (distanceVariation / baseDistance) * 100;
            }
            
            // Display results
            let html = `
                <h3>Sensitivity Results</h3>
                <p>Base Angle: ${baseAngle.toFixed(2)}° → Distance: ${baseDistance.toFixed(3)}m</p>
            `;
            
            if (distanceVariation !== null) {
                html += `
                    <p>±5% Angle Range: ${minAngle.toFixed(2)}° to ${maxAngle.toFixed(2)}°</p>
                    <p>Expected Distance Range: ${Math.min(minDistance, maxDistance).toFixed(3)}m to ${Math.max(minDistance, maxDistance).toFixed(3)}m</p>
                    <p>Distance Variation: ${distanceVariation.toFixed(3)}m (${distancePercent.toFixed(1)}% of base distance)</p>
                `;
            }
            
            document.getElementById('sensitivity-results').innerHTML = html;
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('sensitivity-results').innerHTML = '<p>Error calculating sensitivity analysis</p>';
        });
}
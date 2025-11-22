/* ============================================================
   CHECK BACKEND STATUS
   ============================================================ */
function checkBackend() {
    fetch("http://127.0.0.1:5000/")
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            document.getElementById("backendResponse").textContent =
                JSON.stringify(data, null, 2);
        })
        .catch(err => {
            document.getElementById("backendResponse").textContent =
                "❌ Backend not running. Start the Node server and try again.\n\nError details: " + err.message;
        });
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    console.log("SmartPower Dashboard Initialized");
    
    // Load initial data
    updateMiniDashboard(); // Fallback mock data
    loadStatus(); // Try to load from backend
    setupRadioButtons();
    
    // Set up subscription button with POST request
    document.getElementById("subscribeBtn").addEventListener("click", subscribeToPlan);
    
    // Initialize chart
    initializeChart();
    
    // Update dashboard every 3 seconds
    setInterval(loadStatus, 3000);
    
    // Load some mock chart data for demonstration
    loadMockChartData();
});

/* ============================================================
   SETUP RADIO BUTTONS
   ============================================================ */
function setupRadioButtons() {
    const radioButtons = document.querySelectorAll('input[name="plan"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                selectPlan(this.value);
            }
        });
    });
}

/* ============================================================
   SELECT PLAN FUNCTION
   ============================================================ */
function selectPlan(plan) {
    // Update radio button selection
    const radioButton = document.querySelector(`input[value="${plan}"]`);
    if (radioButton) {
        radioButton.checked = true;
    }
    
    // Visual feedback for selected plan
    const cards = document.querySelectorAll('.plan-card');
    cards.forEach(card => {
        card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
        card.style.transform = 'none';
    });
    
    const selectedCard = document.querySelector(`.plan-card.${plan.toLowerCase()}`);
    if (selectedCard) {
        selectedCard.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
        selectedCard.style.transform = 'translateY(-5px)';
    }
    
    // Show confirmation message
    document.getElementById("subscribeResult").textContent = 
        `✅ ${plan} plan selected. Click "Subscribe" to confirm.`;
}

/* ============================================================
   SUBSCRIBE TO PLAN WITH BACKEND API CALL
   ============================================================ */
async function subscribeToPlan() {
    const planElement = document.querySelector('input[name="plan"]:checked');

    if (!planElement) {
        document.getElementById("subscribeResult").textContent =
            "❌ Please select a plan";
        return;
    }

    const plan = planElement.value;

    try {
        console.log(`Subscribing to plan: ${plan}`);
        
        const response = await fetch("http://127.0.0.1:5000/subscribe", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                user_id: "user1",
                plan: plan,
                timestamp: new Date().toISOString()
            })
        });

        // Check if response is OK
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Display response
        document.getElementById("subscribeResult").textContent =
            JSON.stringify(data, null, 2);

        console.log("Subscription response:", data);
        alert("✅ Subscription Activated!");

        // Update dashboard with new plan
        localStorage.setItem("selectedPlan", plan);
        loadStatus();
        
    } catch (error) {
        console.error("Subscription error:", error);
        
        // Create mock response for demonstration
        const mockResponse = {
            status: "success",
            selected_plan: plan,
            message: "Subscription successful! (Mock - Backend not available)",
            subscription_id: "SUB-" + Math.floor(Math.random() * 10000),
            start_date: new Date().toISOString().split('T')[0],
            next_billing: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            note: "This is mock data. Backend integration required."
        };
        
        document.getElementById("subscribeResult").textContent =
            JSON.stringify(mockResponse, null, 2);
            
        alert("✅ Subscription Activated! (Using mock data - backend not available)");
        
        // Update dashboard with mock data
        localStorage.setItem("selectedPlan", plan);
        updateMiniDashboard();
    }
}

/* ============================================================
   LOAD STATUS FROM BACKEND API
   ============================================================ */
async function loadStatus() {
    try {
        console.log("Fetching status from backend...");
        
        const response = await fetch("http://127.0.0.1:5000/status/user1", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        console.log("Backend status data:", data);
        
        // Update dashboard with real data from backend
        document.getElementById("planName").textContent = data.plan || "Basic";
        document.getElementById("usageProgress").style.width = (data.progress_percent || 0) + "%";
        document.getElementById("units").textContent = data.month_used || 0;
        document.getElementById("limit").textContent = data.plan_limit || 100;
        
        // Color code based on usage
        const percent = data.progress_percent || 0;
        updateProgressBarColor(percent);
        
    } catch (error) {
        console.log("Backend not available, using mock data:", error.message);
        updateMiniDashboard(); // Fallback to mock data
    }
}

/* ============================================================
   UPDATE PROGRESS BAR COLOR BASED ON USAGE
   ============================================================ */
function updateProgressBarColor(percent) {
    if (percent > 90) {
        document.getElementById("usageProgress").style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
    } else if (percent > 70) {
        document.getElementById("usageProgress").style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
    } else {
        document.getElementById("usageProgress").style.background = "linear-gradient(90deg, #2563eb, #3b82f6)";
    }
}

/* ============================================================
   INITIALIZE CHART.JS WITH MOCK DATA
   ============================================================ */
let usageChart = null;

function initializeChart() {
    const ctx = document.getElementById('usageChart');
    if (!ctx) {
        console.log("Chart canvas not found");
        return;
    }
    
    // Destroy existing chart if it exists
    if (usageChart) {
        usageChart.destroy();
    }
    
    usageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [{
                label: 'Electricity Usage (Units)',
                data: [12, 19, 15, 22, 18, 25, 20],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Weekly Electricity Usage Trend',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Units Consumed',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Days',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

/* ============================================================
   LOAD MOCK CHART DATA (FOR DEMONSTRATION)
   ============================================================ */
function loadMockChartData() {
    // This function would typically fetch real data from backend
    // For now, we'll use mock data that updates periodically
    setInterval(() => {
        if (usageChart) {
            // Add some random variation to make the chart look alive
            const newData = usageChart.data.datasets[0].data.map(value => 
                Math.max(5, value + Math.floor(Math.random() * 6 - 3))
            );
            usageChart.data.datasets[0].data = newData;
            usageChart.update('none'); // Update without animation
        }
    }, 5000); // Update every 5 seconds
}

/* ============================================================
   FALLBACK: UPDATE MINI DASHBOARD (MOCK DATA)
   ============================================================ */
function updateMiniDashboard() {
    // Read saved plan or load default
    const selectedPlan = localStorage.getItem("selectedPlan") || "Basic";

    // Show plan name
    document.getElementById("planName").textContent = selectedPlan;

    // Assign limits based on plan
    let limit = 100;
    if (selectedPlan === "Standard") limit = 200;
    if (selectedPlan === "Premium") limit = 400;

    // Set limit
    document.getElementById("limit").textContent = limit;

    // Generate realistic usage data
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    
    // Calculate expected usage based on day of month
    const expectedUsage = Math.floor((limit / daysInMonth) * dayOfMonth);
    
    // Add some randomness but keep it realistic
    const variation = Math.floor(expectedUsage * 0.2);
    const used = Math.min(limit, Math.max(0, expectedUsage + (Math.random() * variation * 2 - variation)));
    
    document.getElementById("units").textContent = Math.round(used);

    // Progress % calculation
    const percent = Math.floor((used / limit) * 100);
    document.getElementById("usageProgress").style.width = percent + "%";
    
    // Color code based on usage
    updateProgressBarColor(percent);
    
    console.log(`Dashboard updated: ${used}/${limit} units (${percent}%) - Plan: ${selectedPlan}`);
}

/* ============================================================
   MANUAL STATUS REFRESH (FOR TESTING)
   ============================================================ */
function refreshDashboard() {
    console.log("Manual dashboard refresh");
    loadStatus();
}

// Make functions globally available for HTML onclick events
window.selectPlan = selectPlan;
window.checkBackend = checkBackend;
window.refreshDashboard = refreshDashboard;

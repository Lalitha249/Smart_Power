/* ============================================================
   CHECK BACKEND STATUS
   ============================================================ */
function checkBackend() {
    fetch("http://127.0.0.1:5000/")
        .then(res => res.json())
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
    updateMiniDashboard();
    loadStatus(); // Load initial status from backend
    setupRadioButtons();
    
    // Set up subscription button with POST request
    document.getElementById("subscribeBtn").addEventListener("click", subscribeToPlan);
    
    // Initialize chart
    initializeChart();
    
    // Update dashboard every 3 seconds
    setInterval(loadStatus, 3000);
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
        const res = await fetch("http://127.0.0.1:5000/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: "user1",
                plan: plan
            })
        });

        const data = await res.json();
        
        // Display response
        document.getElementById("subscribeResult").textContent =
            JSON.stringify(data, null, 2);

        console.log("Subscription response:", data);
        alert("Subscription Activated!");

        // Update dashboard with new plan
        loadStatus();
        
    } catch (error) {
        console.error("Subscription error:", error);
        document.getElementById("subscribeResult").textContent =
            "❌ Failed to subscribe. Check if backend is running.\nError: " + error.message;
    }
}

/* ============================================================
   LOAD STATUS FROM BACKEND API
   ============================================================ */
async function loadStatus() {
    try {
        const res = await fetch("http://127.0.0.1:5000/status/user1");
        const data = await res.json();
        
        // Update dashboard with real data from backend
        document.getElementById("planName").textContent = data.plan;
        document.getElementById("usageProgress").style.width = data.progress_percent + "%";
        document.getElementById("units").textContent = data.month_used;
        document.getElementById("limit").textContent = data.plan_limit;
        
        // Color code based on usage
        const percent = data.progress_percent;
        if (percent > 90) {
            document.getElementById("usageProgress").style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
        } else if (percent > 70) {
            document.getElementById("usageProgress").style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
        } else {
            document.getElementById("usageProgress").style.background = "linear-gradient(90deg, #2563eb, #3b82f6)";
        }
        
    } catch (error) {
        console.log("Backend not available, using mock data");
        updateMiniDashboard(); // Fallback to mock data
    }
}

/* ============================================================
   INITIALIZE CHART.JS
   ============================================================ */
function initializeChart() {
    const ctx = document.getElementById('usageChart');
    if (!ctx) {
        console.log("Chart canvas not found");
        return;
    }
    
    let usageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Usage Over Time',
                data: [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Electricity Usage Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Units'
                    }
                }
            }
        }
    });
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
    if (percent > 90) {
        document.getElementById("usageProgress").style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
    } else if (percent > 70) {
        document.getElementById("usageProgress").style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
    } else {
        document.getElementById("usageProgress").style.background = "linear-gradient(90deg, #2563eb, #3b82f6)";
    }
}

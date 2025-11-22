/* ============================================================
   GLOBAL CONSTANTS
   ============================================================ */
const BASE_URL = "http://127.0.0.1:5000";
const USER_ID = "user1";

/* ============================================================
   CHECK BACKEND STATUS
   ============================================================ */
function checkBackend() {
    console.log("Checking backend connection...");
    fetch(`${BASE_URL}/`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log("Backend response:", data);
            document.getElementById("backendResponse").textContent =
                JSON.stringify(data, null, 2);
        })
        .catch(err => {
            console.error("Backend check failed:", err);
            document.getElementById("backendResponse").textContent =
                "❌ Backend not connected. Error: " + err.message;
        });
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    console.log("SmartPower Frontend Initialized");
    console.log("Backend URL:", BASE_URL);
    
    // Load initial data
    loadStatus();
    setupRadioButtons();
    
    // Set up subscription button
    document.getElementById("subscribeBtn").addEventListener("click", subscribeToPlan);
    
    // Set up usage button
    const addUsageBtn = document.getElementById("addUsageBtn");
    if (addUsageBtn) {
        addUsageBtn.addEventListener("click", addDailyUsage);
    }
    
    // Initialize chart
    initializeChart();
    
    // Update dashboard every 5 seconds
    setInterval(loadStatus, 5000);
    
    // Test backend connection on startup
    checkBackend();
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
    const radioButton = document.querySelector(`input[value="${plan}"]`);
    if (radioButton) {
        radioButton.checked = true;
    }
    
    // Visual feedback
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
    
    document.getElementById("subscribeResult").textContent = 
        `✅ ${plan} plan selected. Click "Subscribe" to confirm.`;
}

/* ============================================================
   SUBSCRIBE TO PLAN
   ============================================================ */
async function subscribeToPlan() {
    const planElement = document.querySelector('input[name="plan"]:checked');

    if (!planElement) {
        document.getElementById("subscribeResult").textContent =
            "❌ Please select a plan";
        return;
    }

    const planName = planElement.value;

    try {
        console.log(`Subscribing to plan: ${planName}`);
        
        const planDetails = getPlanDetails(planName);
        
        const response = await fetch(`${BASE_URL}/subscribe`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                user_id: USER_ID,
                plan_name: planName,
                plan_units: planDetails.units,
                price: planDetails.price
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        document.getElementById("subscribeResult").textContent =
            JSON.stringify(data, null, 2);

        console.log("Subscription successful:", data);
        alert("✅ Subscription Activated!");

        // Refresh dashboard
        loadStatus();
        
    } catch (error) {
        console.error("Subscription failed:", error);
        document.getElementById("subscribeResult").textContent =
            "❌ Failed to subscribe: " + error.message;
    }
}

/* ============================================================
   GET PLAN DETAILS
   ============================================================ */
function getPlanDetails(planName) {
    const plans = {
        "Basic": { units: 100, price: 650 },
        "Standard": { units: 200, price: 1200 },
        "Premium": { units: 400, price: 2200 }
    };
    return plans[planName] || { units: 100, price: 650 };
}

/* ============================================================
   LOAD STATUS FROM BACKEND
   ============================================================ */
async function loadStatus() {
    try {
        console.log("Loading status from backend...");
        
        const response = await fetch(`${BASE_URL}/status/${USER_ID}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Status data received:", data);
        
        updateDashboard(data);
        
    } catch (error) {
        console.error("Failed to load status:", error);
        updateDashboardWithMockData();
    }
}

/* ============================================================
   UPDATE DASHBOARD WITH REAL DATA
   ============================================================ */
function updateDashboard(data) {
    document.getElementById("planName").textContent = data.plan_name || "Basic";
    document.getElementById("usageProgress").style.width = (data.progress_percent || 0) + "%";
    document.getElementById("units").textContent = data.month_used || 0;
    document.getElementById("limit").textContent = data.plan_limit || 100;
    
    if (data.predicted_units) {
        updateAISuggestion(data.predicted_units, data.plan_limit);
    }
    
    const percent = data.progress_percent || 0;
    updateProgressBarColor(percent);
}

/* ============================================================
   UPDATE DASHBOARD WITH MOCK DATA
   ============================================================ */
function updateDashboardWithMockData() {
    const selectedPlan = localStorage.getItem("selectedPlan") || "Basic";
    let limit = 100;
    if (selectedPlan === "Standard") limit = 200;
    if (selectedPlan === "Premium") limit = 400;

    const used = Math.floor(Math.random() * limit * 0.5);
    const percent = Math.floor((used / limit) * 100);

    document.getElementById("planName").textContent = selectedPlan;
    document.getElementById("usageProgress").style.width = percent + "%";
    document.getElementById("units").textContent = used;
    document.getElementById("limit").textContent = limit;
    
    updateProgressBarColor(percent);
    updateAISuggestion(used + 10, limit);
}

/* ============================================================
   ADD DAILY USAGE
   ============================================================ */
async function addDailyUsage() {
    try {
        const units = parseFloat(prompt("Enter today's usage in units:", "0.5")) || 0.5;
        
        if (isNaN(units) || units <= 0) {
            alert("Please enter a valid positive number");
            return;
        }
        
        console.log(`Adding usage: ${units} units`);
        
        const response = await fetch(`${BASE_URL}/usage`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                user_id: USER_ID,
                units: units
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Usage added:", data);
        
        alert(`✅ Added ${units} units!`);
        loadStatus();
        
    } catch (error) {
        console.error("Failed to add usage:", error);
        alert("❌ Failed to add usage. Check backend connection.");
    }
}

/* ============================================================
   AI SUGGESTION
   ============================================================ */
function updateAISuggestion(predictedUnits, planLimit) {
    const suggestionElement = document.getElementById("aiSuggestion");
    if (!suggestionElement) return;
    
    if (predictedUnits > planLimit) {
        suggestionElement.innerHTML = `<strong>⚡ AI Suggestion:</strong> Projected to exceed limit (${predictedUnits} units). Consider reducing usage.`;
        suggestionElement.style.background = "#fef2f2";
        suggestionElement.style.color = "#ef4444";
    } else if (predictedUnits > planLimit * 0.8) {
        suggestionElement.innerHTML = `<strong>⚡ AI Suggestion:</strong> Close to limit (${predictedUnits} units). Monitor usage.`;
        suggestionElement.style.background = "#fffbeb";
        suggestionElement.style.color = "#f59e0b";
    } else {
        suggestionElement.innerHTML = `<strong>⚡ AI Suggestion:</strong> Usage on track (${predictedUnits} units). Good job!`;
        suggestionElement.style.background = "#f0fdf4";
        suggestionElement.style.color = "#22c55e";
    }
}

/* ============================================================
   PROGRESS BAR COLOR
   ============================================================ */
function updateProgressBarColor(percent) {
    const progressBar = document.getElementById("usageProgress");
    if (!progressBar) return;
    
    if (percent > 90) {
        progressBar.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
    } else if (percent > 70) {
        progressBar.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
    } else {
        progressBar.style.background = "linear-gradient(90deg, #2563eb, #3b82f6)";
    }
}

/* ============================================================
   INITIALIZE CHART
   ============================================================ */
let usageChart = null;

function initializeChart() {
    const ctx = document.getElementById('usageChart');
    if (!ctx) {
        console.log("Chart canvas not found");
        return;
    }
    
    usageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Daily Usage (Units)',
                data: [12, 19, 15, 22, 18, 25, 20],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Weekly Electricity Usage'
                }
            }
        }
    });
}

// Global functions
window.selectPlan = selectPlan;
window.checkBackend = checkBackend;
window.addDailyUsage = addDailyUsage;

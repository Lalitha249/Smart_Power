/* ============================================================
   CHECK BACKEND STATUS
   ============================================================ */
function checkBackend() {
    fetch("http://127.0.0.1:5000/api/status")

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
    
    // Set up subscription button
    document.getElementById("subscribeBtn").addEventListener("click", subscribeToPlan);
    
    // Set up radio buttons to sync with plan cards
    setupRadioButtons();
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
    
    // Update dashboard immediately
    localStorage.setItem("selectedPlan", plan);
    updateMiniDashboard();
    
    // Show confirmation message
    document.getElementById("subscribeResult").textContent = 
        `✅ ${plan} plan selected. Click "Subscribe" to confirm.`;
}

/* ============================================================
   SUBSCRIBE TO PLAN
   ============================================================ */
function subscribeToPlan() {
    const plan = document.querySelector('input[name="plan"]:checked');

    if (!plan) {
        document.getElementById("subscribeResult").textContent =
            "❌ Please select a plan";
        return;
    }

    // In a real application, this would be an API call
    const mockResponse = {
        status: "success",
        selected_plan: plan.value,
        message: "Subscription successful! Your plan is now active.",
        subscription_id: "SUB-" + Math.floor(Math.random() * 10000),
        start_date: new Date().toISOString().split('T')[0],
        next_billing: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    // Display response
    document.getElementById("subscribeResult").textContent =
        JSON.stringify(mockResponse, null, 2);

    // Update dashboard with the new plan
    localStorage.setItem("selectedPlan", plan.value);
    updateMiniDashboard();
    
    // Show success message
    setTimeout(() => {
        alert(`🎉 Successfully subscribed to ${plan.value} plan!`);
    }, 500);
}

/* ============================================================
   UPDATE MINI DASHBOARD
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

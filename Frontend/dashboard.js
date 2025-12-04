/* ============================================================
   GLOBAL CONSTANTS & STATE
   ============================================================ */
const BASE_URL = "http://127.0.0.1:5000";
let USER_ID = localStorage.getItem('user_id') || "user1";
let usageChart = null;

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
function $id(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`Element #${id} not found`);
    }
    return el;
}

function showMessage(message, type = "info") {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    const resultElement = $id("subscribeResult");
    if (!resultElement) {
        // Create a toast notification if subscribeResult doesn't exist
        showToast(message, type);
        return;
    }
    
    const styles = {
        success: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
        error: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
        warning: { background: "#fffbeb", color: "#92400e", border: "1px solid #fed7aa" },
        info: { background: "#f0f9ff", color: "#1e40af", border: "1px solid #bae6fd" }
    };
    
    const style = styles[type] || styles.info;
    
    resultElement.textContent = message;
    resultElement.style.background = style.background;
    resultElement.style.color = style.color;
    resultElement.style.border = style.border;
    resultElement.style.padding = "12px";
    resultElement.style.borderRadius = "8px";
    resultElement.style.marginTop = "15px";
    resultElement.style.transition = "all 0.3s ease";
}

function showToast(message, type = "info") {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : 
                     type === 'error' ? '#ef4444' : 
                     type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>${type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : 
                    type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

/* ============================================================
   TASK 1: CHECK BACKEND STATUS
   ============================================================ */
async function checkBackend() {
    console.log("Checking backend connection...");
    const statusEl = $id("backendResponse");
    
    if (statusEl) {
        statusEl.textContent = "🔍 Checking backend connection...";
    }
    
    try {
        const response = await fetch(`${BASE_URL}/`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Backend response:", data);
        
        if (statusEl) {
            statusEl.textContent = JSON.stringify(data, null, 2);
        }
        
        showMessage("✅ Backend is running and connected", "success");
        return true;
    } catch (error) {
        console.error("Backend check failed:", error);
        
        if (statusEl) {
            statusEl.textContent = `❌ Backend not connected. Error: ${error.message}\n\nMake sure:\n1. Backend server is running (python app.py)\n2. URL: ${BASE_URL}\n3. No CORS issues`;
        }
        
        showMessage("❌ Backend connection failed. Using dummy data mode.", "error");
        return false;
    }
}

/* ============================================================
   TASK 2: LOGIN HANDLING
   ============================================================ */
function handleLogin() {
    const email = document.getElementById('email')?.value || "demo@example.com";
    
    // Store user_id in localStorage
    USER_ID = "user1"; // For demo, always use user1
    localStorage.setItem('user_id', USER_ID);
    localStorage.setItem('user_email', email);
    
    console.log(`User logged in: ${email}, user_id: ${USER_ID}`);
    showMessage(`✅ Logged in as ${email}`, "success");
    
    // Redirect to dashboard after 1 second
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

/* ============================================================
   TASK 3: SUBSCRIBE TO PLAN API
   ============================================================ */
async function subscribeToPlanAPI(planName, planUnits, price) {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    
    console.log(`Subscribing ${user_id} to ${planName} plan...`);
    
    try {
        const response = await fetch(`${BASE_URL}/subscribe`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                user_id, 
                plan_name: planName, 
                plan_units: planUnits, 
                price: price 
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Subscription successful:", data);
        return { success: true, data };
        
    } catch (error) {
        console.error("Subscription API failed:", error);
        return { success: false, error: error.message };
    }
}

/* ============================================================
   TASK 4: ADD DAILY USAGE API
   ============================================================ */
async function addDailyUsageAPI(units, dateISO) {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    
    console.log(`Adding usage for ${user_id}: ${units} units on ${dateISO}`);
    
    try {
        const response = await fetch(`${BASE_URL}/usage/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                user_id, 
                units: parseFloat(units), 
                date: dateISO 
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Usage added successfully:", data);
        return { success: true, data };
        
    } catch (error) {
        console.error("Add usage API failed:", error);
        return { success: false, error: error.message };
    }
}

/* ============================================================
   TASK 5: LOAD STATUS FROM BACKEND
   ============================================================ */
async function loadStatus() {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    
    console.log(`Loading status for user: ${user_id}`);
    
    try {
        const response = await fetch(`${BASE_URL}/status/${user_id}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Status data received:", data);
        
        updateDashboard(data);
        return { success: true, data };
        
    } catch (error) {
        console.error("Failed to load status:", error);
        showMessage("⚠️ Using cached data - backend unavailable", "warning");
        updateDashboardWithMockData();
        return { success: false, error: error.message };
    }
}

/* ============================================================
   TASK 6: LOAD USAGE HISTORY FOR CHART
   ============================================================ */
async function loadUsageHistoryAndFillChart() {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    
    console.log(`Loading usage history for user: ${user_id}`);
    
    try {
        const response = await fetch(`${BASE_URL}/usage-history/${user_id}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const payload = await response.json();
        const history = payload.history || {};
        console.log("Usage history received:", history);
        
        updateChartWithHistory(history);
        return { success: true, history };
        
    } catch (error) {
        console.error("Failed to load usage history:", error);
        showMessage("⚠️ Using demo chart data", "warning");
        updateChartWithDemoData();
        return { success: false, error: error.message };
    }
}

/* ============================================================
   DASHBOARD UPDATE FUNCTIONS
   ============================================================ */
function updateDashboard(data) {
    // Update localStorage with current plan
    if (data.plan_name) {
        localStorage.setItem('selectedPlan', data.plan_name);
        localStorage.setItem('currentPlan', data.plan_name);
        localStorage.setItem('plan_limit', data.plan_limit);
    }
    
    // Update plan name
    const planNameEl = $id("planName");
    if (planNameEl) {
        planNameEl.textContent = data.plan_name || localStorage.getItem('selectedPlan') || "—";
    }
    
    // Update usage progress
    const progressPercent = data.progress_percent || 
                           (data.plan_limit > 0 ? Math.min(100, (data.month_used / data.plan_limit) * 100) : 0);
    
    const usageProgressEl = $id("usageProgress");
    if (usageProgressEl) {
        usageProgressEl.style.width = progressPercent + "%";
        updateProgressBarColor(progressPercent);
    }
    
    // Update units display
    const unitsEl = $id("units");
    if (unitsEl) {
        unitsEl.textContent = data.month_used !== undefined ? data.month_used : 0;
    }
    
    const limitEl = $id("limit");
    if (limitEl) {
        limitEl.textContent = data.plan_limit !== undefined ? data.plan_limit : 0;
    }
    
    // Update reward points
    const rewardEl = $id("rewardPoints");
    if (rewardEl) {
        const points = data.reward_points || 
                      (data.plan_limit && data.month_used < 0.8 * data.plan_limit ? 10 : 0);
        rewardEl.textContent = `🎁 Reward points: ${points}`;
    }
    
    // Update AI suggestion
    const aiEl = $id("aiSuggestion");
    if (aiEl) {
        if (progressPercent >= 100) {
            aiEl.innerHTML = `<strong>⚡ AI Suggestion:</strong> ⚠️ You have exceeded your plan! Consider upgrading.`;
            aiEl.style.background = "#fef2f2";
            aiEl.style.borderLeftColor = "#ef4444";
        } else if (progressPercent >= 80) {
            aiEl.innerHTML = `<strong>⚡ AI Suggestion:</strong> 🔔 You're close to limit (${progressPercent.toFixed(1)}%). Save energy!`;
            aiEl.style.background = "#fffbeb";
            aiEl.style.borderLeftColor = "#f59e0b";
        } else {
            aiEl.innerHTML = `<strong>⚡ AI Suggestion:</strong> ✅ Usage is within limits. Good job!`;
            aiEl.style.background = "#f0fdf4";
            aiEl.style.borderLeftColor = "#10b981";
        }
    }
    
    // Update plan recommendation
    const planRecEl = $id("planRecommendation");
    if (planRecEl && data.predicted_units) {
        const currentLimit = data.plan_limit || 200;
        if (data.predicted_units > currentLimit) {
            planRecEl.innerHTML = `<strong>📊 Prediction:</strong> ${data.predicted_units} units predicted — Upgrade suggested!`;
        } else {
            planRecEl.innerHTML = `<strong>📊 Prediction:</strong> ${data.predicted_units} units predicted — Plan is adequate`;
        }
    }
    
    // Show alerts if needed
    if (progressPercent >= 100) {
        notifyUser("⚠️ You have exceeded your monthly plan limit!");
    } else if (progressPercent >= 80) {
        notifyUser("🔔 You're approaching your plan limit (>=80%). Consider saving usage.");
    }
}

function updateDashboardWithMockData() {
    const selectedPlan = localStorage.getItem('selectedPlan') || "Standard";
    const planDetails = getPlanDetails(selectedPlan);
    
    const mockData = {
        plan_name: selectedPlan,
        plan_limit: planDetails.units,
        month_used: 140, // From your dummy data
        progress_percent: 70, // 140/200 = 70%
        predicted_units: 260,
        reward_points: 1250
    };
    
    updateDashboard(mockData);
}

/* ============================================================
   CHART FUNCTIONS
   ============================================================ */
function initializeChart() {
    const canvas = $id('usageChart');
    if (!canvas) {
        console.log("Chart canvas not found, skipping chart initialization");
        return;
    }
    
    usageChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Usage (Units)',
                data: [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#2563eb'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Weekly Electricity Usage',
                    font: { size: 16 }
                },
                legend: { 
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: { 
                    display: true,
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Units (kWh)'
                    }
                }
            }
        }
    });
}

function updateChartWithHistory(history) {
    if (!usageChart) {
        initializeChart();
        if (!usageChart) return;
    }
    
    // Get last 7 days
    const today = new Date();
    const labels = [];
    const dataPoints = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const formatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
        
        labels.push(formatted);
        
        let units = 0;
        if (history[iso] !== undefined) {
            const rec = history[iso];
            units = (typeof rec === "object" && rec.units !== undefined) ? 
                    parseFloat(rec.units) : parseFloat(rec);
            if (isNaN(units)) units = 0;
        }
        dataPoints.push(units);
    }
    
    usageChart.data.labels = labels;
    usageChart.data.datasets[0].data = dataPoints;
    usageChart.update();
}

function updateChartWithDemoData() {
    if (!usageChart) {
        initializeChart();
        if (!usageChart) return;
    }
    
    const mockLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const mockData = [12, 19, 15, 22, 18, 25, 20];
    
    usageChart.data.labels = mockLabels;
    usageChart.data.datasets[0].data = mockData;
    usageChart.update();
}

/* ============================================================
   UI INTERACTION FUNCTIONS
   ============================================================ */
function selectPlan(planName) {
    const radioButton = document.querySelector(`input[name="plan"][value="${planName}"]`);
    if (radioButton) radioButton.checked = true;
    
    localStorage.setItem("selectedPlan", planName);
    
    // Update card visuals
    const cards = document.querySelectorAll('.plan-card');
    cards.forEach(card => {
        card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
        card.style.transform = 'none';
    });
    
    const selectedCard = document.querySelector(`.plan-card.${planName.toLowerCase()}`);
    if (selectedCard) {
        selectedCard.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
        selectedCard.style.transform = 'translateY(-5px)';
    }
    
    showMessage(`✅ ${planName} plan selected. Click "Subscribe" to confirm.`, "success");
}

async function subscribeToPlan() {
    const planElement = document.querySelector('input[name="plan"]:checked');
    if (!planElement) {
        showMessage("❌ Please select a plan first", "error");
        return;
    }
    
    const planName = planElement.value;
    const planDetails = getPlanDetails(planName);
    
    // Show loading state
    const subscribeBtn = $id("subscribeBtn");
    if (subscribeBtn) {
        const originalText = subscribeBtn.textContent;
        subscribeBtn.textContent = "🔄 Processing...";
        subscribeBtn.disabled = true;
    }
    
    showMessage("🔄 Processing subscription...", "info");
    
    try {
        const result = await subscribeToPlanAPI(planName, planDetails.units, planDetails.price);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        showMessage(`✅ Successfully subscribed to ${planName} plan!`, "success");
        
        // Update UI
        localStorage.setItem("selectedPlan", planName);
        localStorage.setItem("currentPlan", planName);
        localStorage.setItem("plan_limit", planDetails.units);
        
        // Refresh dashboard
        await loadStatus();
        
    } catch (error) {
        console.error("Subscription failed:", error);
        showMessage(`❌ Failed to subscribe: ${error.message}`, "error");
    } finally {
        // Reset button
        if (subscribeBtn) {
            subscribeBtn.textContent = "Subscribe";
            subscribeBtn.disabled = false;
        }
    }
}

async function addDailyUsage() {
    try {
        const raw = prompt("Enter today's usage in units (e.g. 2.5):", "2.5");
        if (raw === null) return;
        
        const units = parseFloat(raw);
        if (isNaN(units) || units <= 0) {
            alert("Please enter a valid positive number");
            return;
        }
        
        const date = new Date().toISOString().slice(0, 10);
        console.log(`Adding usage: ${units} units for ${date}`);
        
        showMessage("🔄 Adding usage data...", "info");
        
        const result = await addDailyUsageAPI(units, date);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        showMessage(`✅ Added ${units} units for ${date}!`, "success");
        
        // Refresh dashboard and chart
        await loadStatus();
        await loadUsageHistoryAndFillChart();
        
    } catch (error) {
        console.error("Failed to add usage:", error);
        showMessage(`❌ Failed to add usage: ${error.message}`, "error");
    }
}

function getPlanDetails(planName) {
    const plans = {
        "Basic": { units: 100, price: 650 },
        "Standard": { units: 200, price: 1200 },
        "Premium": { units: 400, price: 2200 }
    };
    return plans[planName] || { units: 100, price: 650 };
}

function updateProgressBarColor(percent) {
    const progressBar = $id("usageProgress");
    if (!progressBar) return;
    
    progressBar.style.transition = "width 0.5s ease, background 0.5s ease";
    
    if (percent >= 100) {
        progressBar.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
    } else if (percent > 70) {
        progressBar.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
    } else {
        progressBar.style.background = "linear-gradient(90deg, #2563eb, #3b82f6)";
    }
}

function notifyUser(message) {
    console.log("NOTIFY:", message);
    showMessage(message, "warning");
}

/* ============================================================
   PAGE INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    console.log("SmartPower Frontend Initialized");
    console.log("Backend URL:", BASE_URL);
    console.log("User ID:", USER_ID);
    
    // Check if user is logged in
    if (!localStorage.getItem('user_id') && !window.location.href.includes('login.html')) {
        console.log("No user_id found, redirecting to login");
        // Uncomment to enforce login
        // window.location.href = 'login.html';
    }
    
    // Setup event listeners for index.html
    const subscribeBtn = $id("subscribeBtn");
    if (subscribeBtn) {
        subscribeBtn.addEventListener("click", subscribeToPlan);
    }
    
    const addUsageBtn = $id("addUsageBtn");
    if (addUsageBtn) {
        addUsageBtn.addEventListener("click", addDailyUsage);
    }
    
    // Setup radio buttons
    const radios = document.querySelectorAll('input[name="plan"]');
    radios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.checked) {
                selectPlan(this.value);
            }
        });
    });
    
    // Restore selected plan visual
    const savedPlan = localStorage.getItem("selectedPlan");
    if (savedPlan) {
        const radio = document.querySelector(`input[name="plan"][value="${savedPlan}"]`);
        if (radio) radio.checked = true;
        const card = document.querySelector(`.plan-card.${savedPlan.toLowerCase()}`);
        if (card) {
            card.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
            card.style.transform = 'translateY(-5px)';
        }
    }
    
    // Initialize chart
    initializeChart();
    
    // Load initial data
    loadStatus();
    loadUsageHistoryAndFillChart();
    
    // Check backend connection
    setTimeout(() => {
        checkBackend();
    }, 500);
});

/* ============================================================
   GLOBAL EXPORTS
   ============================================================ */
window.selectPlan = selectPlan;
window.checkBackend = checkBackend;
window.addDailyUsage = addDailyUsage;
window.handleLogin = handleLogin;

/* ============================================================
   GLOBAL CONSTANTS
   ============================================================ */
const BASE_URL = "http://127.0.0.1:5000";
const USER_ID = "user1";

/* ============================================================
   UTIL - safe getElement
   ============================================================ */
function $id(id) {
    return document.getElementById(id);
}

/* ============================================================
   CHECK BACKEND STATUS
   ============================================================ */
function checkBackend() {
    console.log("Checking backend connection...");
    showMessage("🔍 Checking backend connection...", "info");
    
    fetch(`${BASE_URL}/`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log("Backend response:", data);
            const el = $id("backendResponse");
            if (el) el.textContent = JSON.stringify(data, null, 2);
            showMessage("✅ Backend is running", "success");
        })
        .catch(err => {
            console.error("Backend check failed:", err);
            const el = $id("backendResponse");
            if (el) el.textContent = "❌ Backend not connected. Error: " + err.message;
            showMessage("❌ Backend connection failed", "error");
        });
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    console.log("SmartPower Frontend Initialized");
    console.log("Backend URL:", BASE_URL);

    // Restore selected plan visual state
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

    // Setup event listeners
    const subscribeBtn = $id("subscribeBtn");
    if (subscribeBtn) subscribeBtn.addEventListener("click", subscribeToPlan);

    const addUsageBtn = $id("addUsageBtn");
    if (addUsageBtn) addUsageBtn.addEventListener("click", addDailyUsage);

    setupRadioButtons();
    initializeChart();

    // Load initial data
    loadStatus();
    loadUsageHistoryAndFillChart();

    // Check backend
    checkBackend();
});

/* ============================================================
   SETUP RADIO BUTTONS
   ============================================================ */
function setupRadioButtons() {
    const radios = document.querySelectorAll('input[name="plan"]');
    radios.forEach(radio => {
        radio.addEventListener('change', function () {
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
    const radioButton = document.querySelector(`input[name="plan"][value="${plan}"]`);
    if (radioButton) radioButton.checked = true;

    localStorage.setItem("selectedPlan", plan);

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

    showMessage(`✅ ${plan} plan selected. Click "Subscribe" to confirm.`, "success");
}

/* ============================================================
   SUBSCRIBE TO PLAN WITH LOADING STATE
   ============================================================ */
async function subscribeToPlan() {
    const planElement = document.querySelector('input[name="plan"]:checked');
    if (!planElement) {
        showMessage("❌ Please select a plan first", "error");
        return;
    }

    const planName = planElement.value;
    const planDetails = getPlanDetails(planName);

    try {
        console.log(`Subscribing to plan: ${planName}`);
        
        // ✅ TASK 8: Add loading state for button
        const subscribeBtn = $id("subscribeBtn");
        const originalText = subscribeBtn.textContent;
        subscribeBtn.textContent = "🔄 Subscribing...";
        subscribeBtn.disabled = true;
        
        showMessage("🔄 Processing subscription...", "info");

        const response = await fetch(`${BASE_URL}/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                user_id: USER_ID,
                plan_name: planName,
                plan_units: planDetails.units,
                price: planDetails.price
            })
        });

        if (!response.ok) {
            const text = await response.text().catch(() => null);
            throw new Error(`HTTP error! status: ${response.status} ${text || ""}`);
        }

        const data = await response.json();
        console.log("Subscription successful:", data);

        showMessage(`✅ Successfully subscribed to ${planName} plan!`, "success");
        
        localStorage.setItem("selectedPlan", planName);

        // Reset button state
        subscribeBtn.textContent = originalText;
        subscribeBtn.disabled = false;

        await loadStatus();
        await loadAIDisplay();
        
    } catch (error) {
        console.error("Subscription failed:", error);
        showMessage(`❌ Failed to subscribe: ${error.message}`, "error");
        
        // Reset button on error
        const subscribeBtn = $id("subscribeBtn");
        subscribeBtn.textContent = "Subscribe";
        subscribeBtn.disabled = false;
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log("Status data received:", data);

        updateDashboard(data);
        
        // ✅ TASK 3: Load AI display after status
        await loadAIDisplay();
        
    } catch (error) {
        console.error("Failed to load status:", error);
        updateDashboardWithMockData();
        showMessage("⚠️ Using cached data - backend unavailable", "warning");
    }
}

/* ============================================================
   UPDATE DASHBOARD
   ============================================================ */
function updateDashboard(data) {
    if (data.plan_name) {
        localStorage.setItem("selectedPlan", data.plan_name);
    }

    const planNameEl = $id("planName");
    const usageProgressEl = $id("usageProgress");
    const unitsEl = $id("units");
    const limitEl = $id("limit");

    if (planNameEl) planNameEl.textContent = data.plan_name || localStorage.getItem("selectedPlan") || "—";
    
    const progressPercent = data.plan_limit > 0 ? Math.min(100, (data.month_used / data.plan_limit) * 100) : 0;
    
    if (usageProgressEl) usageProgressEl.style.width = progressPercent + "%";
    if (unitsEl) unitsEl.textContent = (data.month_used !== undefined ? data.month_used : 0);
    if (limitEl) limitEl.textContent = (data.plan_limit !== undefined ? data.plan_limit : 0);

    // ✅ TASK 6: Reward Points
    const rewardEl = $id("rewardPoints");
    if (rewardEl) {
        let points = 0;
        if (data.plan_limit && data.month_used < 0.8 * data.plan_limit) points = 10;
        rewardEl.textContent = `🎁 Reward points: ${points}`;
    }

    updateProgressBarColor(progressPercent);

    if (progressPercent >= 100) {
        notifyUser("⚠️ You have exceeded your monthly plan limit!");
    } else if (progressPercent >= 80) {
        notifyUser("🔔 You're approaching your plan limit (>=80%). Consider saving usage.");
    }
}

/* ============================================================
   UPDATE DASHBOARD WITH MOCK DATA (fallback)
   ============================================================ */
function updateDashboardWithMockData() {
    const selectedPlan = localStorage.getItem("selectedPlan") || "Basic";
    let limit = 100;
    if (selectedPlan === "Standard") limit = 200;
    if (selectedPlan === "Premium") limit = 400;

    const used = Math.floor(Math.random() * limit * 0.5);
    const percent = Math.floor((used / limit) * 100);

    const planNameEl = $id("planName");
    const usageProgressEl = $id("usageProgress");
    const unitsEl = $id("units");
    const limitEl = $id("limit");

    if (planNameEl) planNameEl.textContent = selectedPlan;
    if (usageProgressEl) usageProgressEl.style.width = percent + "%";
    if (unitsEl) unitsEl.textContent = used;
    if (limitEl) limitEl.textContent = limit;

    updateProgressBarColor(percent);
}

/* ============================================================
   ADD DAILY USAGE - TASK 1: UPDATED WITH /usage/add
   ============================================================ */
async function addDailyUsage() {
    try {
        const raw = prompt("Enter today's usage in units (e.g. 0.5):", "0.5");
        if (raw === null) return;
        const units = parseFloat(raw);
        if (isNaN(units) || units <= 0) {
            alert("Please enter a valid positive number");
            return;
        }

        // ✅ TASK 1: Include date and use /usage/add endpoint
        const date = new Date().toISOString().slice(0,10);
        console.log(`Adding usage: ${units} units for ${date}`);

        // ✅ TASK 1: Changed from /usage to /usage/add
        const response = await fetch(`${BASE_URL}/usage/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ user_id: USER_ID, units: units, date: date })
        });

        if (!response.ok) {
            const text = await response.text().catch(() => null);
            throw new Error(`HTTP error! status: ${response.status} ${text || ""}`);
        }

        const data = await response.json();
        console.log("Usage added:", data);
        alert(`✅ Added ${units} units for ${date}!`);

        // refresh status & history/chart
        await loadStatus();
        await loadUsageHistoryAndFillChart();
        
    } catch (error) {
        console.error("Failed to add usage:", error);
        alert("❌ Failed to add usage. Check backend connection.");
        showMessage(`❌ Failed to add usage: ${error.message}`, "error");
    }
}

/* ============================================================
   LOAD AI DISPLAY - TASK 3: IMPLEMENT AI ENDPOINTS
   ============================================================ */
async function loadAIDisplay() {
    try {
        console.log("Loading AI suggestions...");
        
        // ✅ TASK 3: Coach suggestions
        const sRes = await fetch(`${BASE_URL}/coach/${USER_ID}`);
        const sJson = sRes.ok ? await sRes.json() : null;
        const suggestion = sJson && sJson.suggestions ? sJson.suggestions[0] : "No suggestion available";

        // ✅ TASK 3: Advanced prediction
        const pRes = await fetch(`${BASE_URL}/predict-advanced/${USER_ID}`);
        const pJson = pRes.ok ? await pRes.json() : null;

        // ✅ TASK 3: Alerts
        const aRes = await fetch(`${BASE_URL}/alerts/${USER_ID}`);
        const aJson = aRes.ok ? await aRes.json() : null;

        // Fill UI
        const aiEl = $id("aiSuggestion");
        if (aiEl) {
            aiEl.innerHTML = `<strong>⚡ AI Coach:</strong> ${suggestion}`;
            aiEl.style.background = "#f0f9ff";
            aiEl.style.color = "#1e40af";
        }

        // ✅ TASK 5: Plan Recommendation
        const planRecEl = $id("planRecommendation");
        if (planRecEl) {
            if (pJson && pJson.prediction !== undefined) {
                planRecEl.innerHTML = `<strong>📊 Prediction:</strong> ${pJson.prediction} units this month — trend: ${pJson.trend || '-'}`;
                
                // ✅ TASK 5: Show recommended action if prediction exceeds limit
                const currentPlan = localStorage.getItem("selectedPlan") || "Basic";
                const currentLimit = getPlanDetails(currentPlan).units;
                
                if (pJson.prediction > currentLimit) {
                    const recommendedPlan = getRecommendedPlan(pJson.prediction);
                    showRecommendedAction(recommendedPlan);
                }
            } else {
                planRecEl.innerHTML = "<strong>📊 Prediction:</strong> No prediction available";
            }
        }

        // ✅ TASK 3: Alerts display
        const alertsEl = $id("alertsList") || createAlertsElement();
        if (alertsEl) {
            alertsEl.innerHTML = "";
            const alerts = (aJson && aJson.alerts ? aJson.alerts : ["No alerts"]);
            alerts.forEach(al => {
                const div = document.createElement("div");
                div.textContent = `🔔 ${al}`;
                div.style.padding = "4px 0";
                alertsEl.appendChild(div);
            });
        }
        
    } catch (err) {
        console.error("Failed to load AI/alerts:", err);
    }
}

/* ============================================================
   GET RECOMMENDED PLAN - TASK 5 HELPER
   ============================================================ */
function getRecommendedPlan(predictedUnits) {
    if (predictedUnits <= 100) return "Basic";
    if (predictedUnits <= 200) return "Standard";
    return "Premium";
}

/* ============================================================
   SHOW RECOMMENDED ACTION - TASK 5
   ============================================================ */
function showRecommendedAction(recommendedPlanName) {
    const area = $id("planRecommendation");
    if (!area) return;
    
    const button = document.createElement("button");
    button.textContent = `Switch to ${recommendedPlanName}`;
    button.style.marginTop = "8px";
    button.style.padding = "8px 16px";
    button.style.background = "#10b981";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "6px";
    button.style.cursor = "pointer";
    
    button.onclick = function() {
        selectPlan(recommendedPlanName);
        // Auto-click subscribe after a delay
        setTimeout(() => {
            document.getElementById('subscribeBtn').click();
        }, 500);
    };
    
    area.appendChild(button);
}

/* ============================================================
   CREATE ALERTS ELEMENT
   ============================================================ */
function createAlertsElement() {
    const alertsDiv = document.createElement('div');
    alertsDiv.id = 'alertsList';
    alertsDiv.style.marginTop = '15px';
    alertsDiv.style.padding = '12px';
    alertsDiv.style.background = '#fffbeb';
    alertsDiv.style.borderRadius = '8px';
    alertsDiv.style.borderLeft = '4px solid #f59e0b';
    
    const dashboard = $id("dashboard-box");
    if (dashboard) {
        dashboard.appendChild(alertsDiv);
    }
    return alertsDiv;
}

/* ============================================================
   PROGRESS BAR COLOR - TASK 8: WITH ANIMATION
   ============================================================ */
function updateProgressBarColor(percent) {
    const progressBar = $id("usageProgress");
    if (!progressBar) return;

    // ✅ TASK 8: Add CSS transition for smooth animation
    progressBar.style.transition = "width 0.5s ease, background 0.5s ease";
    
    if (percent >= 100) {
        progressBar.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
    } else if (percent > 70) {
        progressBar.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
    } else {
        progressBar.style.background = "linear-gradient(90deg, #2563eb, #3b82f6)";
    }
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function notifyUser(message) {
    console.log("NOTIFY:", message);
    showMessage(message, "warning");
}

/* ============================================================
   MESSAGE DISPLAY SYSTEM - TASK 7: ERROR HANDLING
   ============================================================ */
function showMessage(message, type = "info") {
    const resultElement = $id("subscribeResult");
    if (!resultElement) return;
    
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

/* ============================================================
   CHART: USAGE HISTORY - TASK 4
   ============================================================ */
let usageChart = null;

function initializeChart() {
    const canvas = $id('usageChart');
    if (!canvas) {
        console.log("Chart canvas not found");
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
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Weekly Electricity Usage'
                },
                legend: { display: false }
            },
            scales: {
                x: { display: true },
                y: { beginAtZero: true }
            }
        }
    });
}

/* ============================================================
   LOAD USAGE HISTORY - TASK 4
   ============================================================ */
async function loadUsageHistoryAndFillChart() {
    try {
        console.log("Loading usage history...");
        const response = await fetch(`${BASE_URL}/usage-history/${USER_ID}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const payload = await response.json();
        const history = payload.history || {};

        // Convert history to chart data
        const today = new Date();
        const labels = [];
        const dataPoints = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const iso = d.toISOString().slice(0, 10);
            labels.push(iso);
            const rec = history[iso];
            let units = 0;
            if (rec !== undefined) {
                units = (typeof rec === "object" && rec.units !== undefined) ? parseFloat(rec.units) : parseFloat(rec);
                if (isNaN(units)) units = 0;
            }
            dataPoints.push(units);
        }

        if (!usageChart) initializeChart();

        // Update chart with real data
        usageChart.data.labels = labels.map(l => {
            const p = l.split("-");
            return `${p[1]}-${p[2]}`; // MM-DD format
        });
        usageChart.data.datasets[0].data = dataPoints;
        usageChart.update();

    } catch (error) {
        console.error("Failed to load usage history:", error);
        // fallback to mock data
        if (!usageChart) initializeChart();
        const mockLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const mockData = [12, 19, 15, 22, 18, 25, 20];
        usageChart.data.labels = mockLabels;
        usageChart.data.datasets[0].data = mockData;
        usageChart.update();
    }
}

// Global functions
window.selectPlan = selectPlan;
window.checkBackend = checkBackend;
window.addDailyUsage = addDailyUsage;

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
    fetch(`${BASE_URL}/`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log("Backend response:", data);
            const el = $id("backendResponse");
            if (el) el.textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
            console.error("Backend check failed:", err);
            const el = $id("backendResponse");
            if (el) el.textContent = "❌ Backend not connected. Error: " + err.message;
        });
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    console.log("SmartPower Frontend Initialized");
    console.log("Backend URL:", BASE_URL);

    // Restore selected plan visual state (if any)
    const savedPlan = localStorage.getItem("selectedPlan");
    if (savedPlan) {
        const radio = document.querySelector(`input[name="plan"][value="${savedPlan}"]`);
        if (radio) radio.checked = true;
        // highlight card visually
        const card = document.querySelector(`.plan-card.${savedPlan.toLowerCase()}`);
        if (card) {
            card.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
            card.style.transform = 'translateY(-5px)';
        }
    }

    // Defensive: make sure elements exist before attaching listeners
    const subscribeBtn = $id("subscribeBtn");
    if (subscribeBtn) subscribeBtn.addEventListener("click", subscribeToPlan);

    const addUsageBtn = $id("addUsageBtn");
    if (addUsageBtn) addUsageBtn.addEventListener("click", addDailyUsage);

    setupRadioButtons();
    initializeChart();

    // initial load
    loadStatus();
    loadUsageHistoryAndFillChart();

    // periodic update
    setInterval(loadStatus, 5000);

    // check backend once
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
    // mark radio
    const radioButton = document.querySelector(`input[name="plan"][value="${plan}"]`);
    if (radioButton) radioButton.checked = true;

    // store selection for persistence
    localStorage.setItem("selectedPlan", plan);

    // visual feedback on cards (don't change markup)
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

    const res = $id("subscribeResult");
    if (res) res.textContent = `✅ ${plan} plan selected. Click "Subscribe" to confirm.`;
}

/* ============================================================
   SUBSCRIBE TO PLAN
   ============================================================ */
async function subscribeToPlan() {
    const planElement = document.querySelector('input[name="plan"]:checked');
    if (!planElement) {
        const res = $id("subscribeResult");
        if (res) res.textContent = "❌ Please select a plan";
        return;
    }

    const planName = planElement.value;
    const planDetails = getPlanDetails(planName);

    try {
        console.log(`Subscribing to plan: ${planName}`);

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

        const res = $id("subscribeResult");
        if (res) res.textContent = JSON.stringify(data, null, 2);

        // persist selected plan
        localStorage.setItem("selectedPlan", planName);

        alert("✅ Subscription Activated!");

        // reload dashboard state
        await loadStatus();
    } catch (error) {
        console.error("Subscription failed:", error);
        const res = $id("subscribeResult");
        if (res) res.textContent = "❌ Failed to subscribe: " + error.message;
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
    } catch (error) {
        console.error("Failed to load status:", error);
        updateDashboardWithMockData();
    }
}

/* ============================================================
   UPDATE DASHBOARD
   ============================================================ */
function updateDashboard(data) {
    // If backend returns null plan, keep selectedPlan
    if (data.plan_name) {
        localStorage.setItem("selectedPlan", data.plan_name);
    }

    const planNameEl = $id("planName");
    const usageProgressEl = $id("usageProgress");
    const unitsEl = $id("units");
    const limitEl = $id("limit");

    if (planNameEl) planNameEl.textContent = data.plan_name || localStorage.getItem("selectedPlan") || "—";
    
    // Safe progress calculation
    const progressPercent = data.plan_limit > 0 ? Math.min(100, (data.month_used / data.plan_limit) * 100) : 0;
    
    if (usageProgressEl) usageProgressEl.style.width = progressPercent + "%";
    if (unitsEl) unitsEl.textContent = (data.month_used !== undefined ? data.month_used : 0);
    if (limitEl) limitEl.textContent = (data.plan_limit !== undefined ? data.plan_limit : 0);

    // AI suggestion
    if (data.predicted_units !== undefined) {
        updateAISuggestion(data.predicted_units, data.plan_limit || 0);
    }

    // progress bar color + notifications
    updateProgressBarColor(progressPercent);

    // notify if nearing/exceeded limit
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
    updateAISuggestion(used + 10, limit);
}

/* ============================================================
   ADD DAILY USAGE
   ============================================================ */
async function addDailyUsage() {
    try {
        const raw = prompt("Enter today's usage in units (e.g. 0.5):", "0.5");
        if (raw === null) return; // user cancelled
        const units = parseFloat(raw);
        if (isNaN(units) || units <= 0) {
            alert("Please enter a valid positive number");
            return;
        }

        console.log(`Adding usage: ${units} units`);
        const response = await fetch(`${BASE_URL}/usage`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ user_id: USER_ID, units: units })
        });

        if (!response.ok) {
            const text = await response.text().catch(() => null);
            throw new Error(`HTTP error! status: ${response.status} ${text || ""}`);
        }

        const data = await response.json();
        console.log("Usage added:", data);
        alert(`✅ Added ${units} units!`);

        // refresh status & history/chart
        await loadStatus();
        await loadUsageHistoryAndFillChart();
    } catch (error) {
        console.error("Failed to add usage:", error);
        alert("❌ Failed to add usage. Check backend connection.");
    }
}

/* ============================================================
   AI SUGGESTION
   ============================================================ */
function updateAISuggestion(predictedUnits, planLimit) {
    const suggestionElement = $id("aiSuggestion");
    if (!suggestionElement) return;

    if (!planLimit || planLimit === 0) {
        suggestionElement.innerHTML = `<strong>⚡ AI Suggestion:</strong> Not enough data to provide suggestion.`;
        suggestionElement.style.background = "#f0f9ff";
        suggestionElement.style.color = "#2563eb";
        return;
    }

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
        suggestionElement.style.color = "#16a34a";
    }
}

/* ============================================================
   PROGRESS BAR COLOR
   ============================================================ */
function updateProgressBarColor(percent) {
    const progressBar = $id("usageProgress");
    if (!progressBar) return;

    if (percent >= 100) {
        progressBar.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
    } else if (percent > 70) {
        progressBar.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
    } else {
        progressBar.style.background = "linear-gradient(90deg, #2563eb, #3b82f6)";
    }
}

/* ============================================================
   NOTIFICATIONS (simple)
   ============================================================ */
function notifyUser(message) {
    console.log("NOTIFY:", message);
    // Show notification in subscribe result area
    const area = $id("subscribeResult");
    if (!area) return;
    const stamp = new Date().toLocaleTimeString();
    area.textContent = `[${stamp}] ${message}`;
    area.style.background = "#fffbeb";
    area.style.color = "#92400e";
    area.style.border = "1px solid #fed7aa";
}

/* ============================================================
   CHART: initialize and helper to fill with backend history
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
            labels: [], // will fill later
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

/* Fill chart using usage-history endpoint (last 7 days).
   If backend unavailable, uses mock values. */
async function loadUsageHistoryAndFillChart() {
    try {
        console.log("Loading usage history...");
        const response = await fetch(`${BASE_URL}/usage-history/${USER_ID}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const payload = await response.json();
        const history = payload.history || {};

        // Convert history object {YYYY-MM-DD: {units: X}} to array of last 7 days
        const today = new Date();
        const labels = [];
        const dataPoints = [];

        // build last 7 day labels (Mon..Sun or date)
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

        // If chart not initialized (safe), initialize
        if (!usageChart) initializeChart();

        // Update chart
        usageChart.data.labels = labels.map(l => {
            // short label (MM-DD) for readability
            const p = l.split("-");
            return `${p[1]}-${p[2]}`;
        });
        usageChart.data.datasets[0].data = dataPoints;
        usageChart.update();

    } catch (error) {
        console.error("Failed to load usage history:", error);
        // fallback - fill chart with mock data
        if (!usageChart) initializeChart();
        const mockLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const mockData = [12, 19, 15, 22, 18, 25, 20];
        usageChart.data.labels = mockLabels;
        usageChart.data.datasets[0].data = mockData;
        usageChart.update();
    }
}

// Global functions (expose to HTML inline onclick handlers)
window.selectPlan = selectPlan;
window.checkBackend = checkBackend;
window.addDailyUsage = addDailyUsage;

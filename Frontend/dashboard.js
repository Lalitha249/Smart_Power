/* ============================================================
   SMART POWER - COMPLETE SOLUTION (Login + Dashboard)
   ============================================================ */
const BASE_URL = "http://127.0.0.1:5000";
let USER_ID = localStorage.getItem('user_id') || "user1"; // Fallback for demo
let usageChart = null;
let autoRefreshInterval = null;
let isSubmitting = false;

// ============================================================================
// PART 1: LOGIN/REGISTRATION FUNCTIONS
// ============================================================================

/* ============================================================
   REGISTER USER API - FOR LOGIN PAGE
   ============================================================ */
async function registerUserAPI(user_id, name, email) {
    console.log(`📝 Registering user: ${user_id}, ${name}, ${email}`);
    
    try {
        const response = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ 
                user_id: user_id, 
                name: name, 
                email: email 
            })
        });

        console.log("📡 Register API status:", response.status);
        
        const data = await response.json();
        console.log("📡 Register API response:", data);

        if (!response.ok) {
            throw new Error(data.error || `Registration failed with status ${response.status}`);
        }

        return { 
            success: true, 
            data: data,
            message: data.message || "Registration successful"
        };
        
    } catch (error) {
        console.error("❌ Register API Error:", error);
        return { 
            success: false, 
            error: error.message,
            message: `Registration failed: ${error.message}`
        };
    }
}

// ============================================================================
// PART 2: DASHBOARD FUNCTIONS
// ============================================================================

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
function $id(id) {
    const el = document.getElementById(id);
    if (!el && id) {
        console.warn(`Element #${id} not found`);
    }
    return el;
}

function showMessage(message, type = "info") {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    const resultElement = $id("subscribeResult");
    if (!resultElement) {
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
    
    resultElement.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>${type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : 
                    type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>${message}</span>
        </div>
    `;
    
    resultElement.style.background = style.background;
    resultElement.style.color = style.color;
    resultElement.style.border = style.border;
    resultElement.style.padding = "12px";
    resultElement.style.borderRadius = "8px";
    resultElement.style.marginTop = "15px";
    resultElement.style.transition = "all 0.3s ease";
    
    // Auto-clear after 5 seconds
    setTimeout(() => {
        resultElement.style.opacity = '0';
        setTimeout(() => {
            resultElement.innerHTML = '';
            resultElement.style.opacity = '1';
        }, 300);
    }, 5000);
}

function showToast(message, type = "info") {
    // Remove existing toasts
    document.querySelectorAll('.smartpower-toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = 'smartpower-toast';
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
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : 
                type === 'error' ? '❌' : 
                type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations
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
    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

/* ============================================================
   TASK 1: CHECK BACKEND STATUS
   ============================================================ */
async function checkBackend() {
    console.log("🔍 Checking backend connection...");
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
        console.log("📡 Backend response:", data);
        
        if (statusEl) {
            statusEl.textContent = JSON.stringify(data, null, 2);
        }
        
        showMessage("✅ Backend is running and connected", "success");
        return true;
    } catch (error) {
        console.error("❌ Backend check failed:", error);
        
        if (statusEl) {
            statusEl.textContent = `❌ Backend not connected. Error: ${error.message}\n\nMake sure:\n1. Backend server is running (python app.py)\n2. URL: ${BASE_URL}\n3. No CORS issues`;
        }
        
        showMessage("❌ Backend connection failed. Using dummy data mode.", "error");
        return false;
    }
}

/* ============================================================
   TASK 2: AI SUGGESTIONS - /coach/<user_id>
   ============================================================ */
async function loadAIDisplay() {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    const aiEl = $id('aiSuggestion');
    
    if (!aiEl) return;
    
    try {
        const response = await fetch(`${BASE_URL}/coach/${user_id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const suggestion = (data.suggestions && data.suggestions[0]) || "No suggestions available";
        
        aiEl.innerHTML = `<strong>⚡ AI Coach:</strong> ${suggestion}`;
        aiEl.style.background = "#f0f9ff";
        aiEl.style.borderLeftColor = "#2563eb";
        aiEl.style.color = "#1e40af";
        
    } catch (error) {
        console.error("❌ Failed to load AI suggestions:", error);
        aiEl.innerHTML = `<strong>⚡ AI Coach:</strong> Stay within your usage limits to save money!`;
        aiEl.style.background = "#f8fafc";
        aiEl.style.borderLeftColor = "#94a3b8";
    }
}

/* ============================================================
   TASK 3: ADVANCED PREDICTION - /predict-advanced/<user_id>
   ============================================================ */
async function loadAdvancedPrediction() {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    const planRecEl = $id('planRecommendation');
    
    if (!planRecEl) return;
    
    try {
        const response = await fetch(`${BASE_URL}/predict-advanced/${user_id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("📊 Advanced prediction:", data);
        
        const currentPlan = localStorage.getItem('selectedPlan') || "Standard";
        const currentLimit = getPlanDetails(currentPlan).units;
        
        let html = `<strong>📊 Prediction:</strong> `;
        
        if (data.prediction !== undefined) {
            html += `${data.prediction.toFixed(1)} units predicted this month`;
            
            if (data.trend) {
                html += ` (trend: ${data.trend})`;
            }
            
            // Check if prediction exceeds current limit
            if (data.prediction > currentLimit) {
                const recommendedPlan = getRecommendedPlan(data.prediction);
                html += ` ⚠️ <span style="color: #ef4444;">May exceed limit!</span>`;
                
                // Show recommendation button
                setTimeout(() => {
                    showRecommendedAction(recommendedPlan);
                }, 500);
            }
        } else {
            html += "No prediction available";
        }
        
        planRecEl.innerHTML = html;
        
    } catch (error) {
        console.error("❌ Failed to load advanced prediction:", error);
        planRecEl.innerHTML = `<strong>📊 Prediction:</strong> 185 units predicted — trend: increasing`;
    }
}

function getRecommendedPlan(predictedUnits) {
    if (predictedUnits <= 100) return "Basic";
    if (predictedUnits <= 200) return "Standard";
    return "Premium";
}

function showRecommendedAction(recommendedPlanName) {
    const area = $id("planRecommendation");
    if (!area) return;
    
    // Remove existing button
    const existingBtn = area.querySelector('.recommendation-btn');
    if (existingBtn) existingBtn.remove();
    
    const button = document.createElement("button");
    button.className = "recommendation-btn";
    button.innerHTML = `⚡ Switch to ${recommendedPlanName}`;
    button.style.cssText = `
        margin-top: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #10b981, #34d399);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        display: block;
        width: 100%;
        transition: transform 0.2s;
    `;
    
    button.onmouseenter = () => button.style.transform = 'translateY(-2px)';
    button.onmouseleave = () => button.style.transform = 'translateY(0)';
    
    button.onclick = function() {
        // Save selected plan and redirect to plans page
        localStorage.setItem('selectedPlan', recommendedPlanName);
        window.location.href = 'plans.html';
    };
    
    area.appendChild(button);
}

/* ============================================================
   TASK 4: ALERTS PANEL - /alerts/<user_id>
   ============================================================ */
async function loadAlerts() {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    
    try {
        const response = await fetch(`${BASE_URL}/alerts/${user_id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const alerts = data.alerts || [];
        
        updateAlertsDisplay(alerts);
        checkCriticalAlerts(alerts);
        
    } catch (error) {
        console.error("❌ Failed to load alerts:", error);
        updateAlertsDisplay(["System alert: Backend connection issue"]);
    }
}

function updateAlertsDisplay(alerts) {
    let alertsContainer = $id('alertsList');
    
    if (!alertsContainer) {
        alertsContainer = createAlertsElement();
    }
    
    alertsContainer.innerHTML = '';
    
    if (alerts.length === 0) {
        alertsContainer.innerHTML = `
            <div style="padding: 10px; color: #64748b; text-align: center;">
                ✅ No alerts at the moment
            </div>
        `;
        return;
    }
    
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            padding: 12px;
            margin-bottom: 8px;
            background: ${alert.toLowerCase().includes('exceed') || alert.toLowerCase().includes('critical') 
                ? '#fef2f2' 
                : '#fffbeb'};
            border-left: 4px solid ${alert.toLowerCase().includes('exceed') || alert.toLowerCase().includes('critical') 
                ? '#ef4444' 
                : '#f59e0b'};
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        alertDiv.innerHTML = `
            <span>${alert.toLowerCase().includes('exceed') || alert.toLowerCase().includes('critical') 
                ? '🔴' 
                : '🟡'}</span>
            <span>${alert}</span>
        `;
        
        // Add "Save tips" link for limit alerts
        if (alert.toLowerCase().includes('limit')) {
            const tipsLink = document.createElement('a');
            tipsLink.href = '#';
            tipsLink.innerHTML = '💡 Save tips';
            tipsLink.style.cssText = `
                margin-left: auto;
                font-size: 12px;
                color: #3b82f6;
                text-decoration: none;
                cursor: pointer;
            `;
            tipsLink.onclick = (e) => {
                e.preventDefault();
                showSaveTipsModal();
            };
            alertDiv.appendChild(tipsLink);
        }
        
        alertsContainer.appendChild(alertDiv);
    });
}

function checkCriticalAlerts(alerts) {
    const criticalAlerts = alerts.filter(alert => 
        alert.toLowerCase().includes('exceed') || 
        alert.toLowerCase().includes('critical')
    );
    
    if (criticalAlerts.length > 0) {
        // Show red toast for critical alerts
        showToast(`⚠️ ${criticalAlerts[0]}`, 'error');
        
        // Add urgent notification badge
        updateAlertBadge(true);
    } else {
        updateAlertBadge(false);
    }
}

function createAlertsElement() {
    const alertsDiv = document.createElement('div');
    alertsDiv.id = 'alertsList';
    alertsDiv.style.cssText = `
        margin-top: 15px;
        padding: 15px;
        background: #ffffff;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        max-height: 200px;
        overflow-y: auto;
    `;
    
    const dashboardBox = $id('dashboard-box');
    if (dashboardBox) {
        // Insert after reward points but before buttons
        const rewardPoints = $id('rewardPoints');
        if (rewardPoints && rewardPoints.parentNode) {
            rewardPoints.parentNode.insertBefore(alertsDiv, rewardPoints.nextSibling);
        } else {
            dashboardBox.insertBefore(alertsDiv, dashboardBox.querySelector('.subscribe-action') || dashboardBox.lastChild);
        }
    }
    
    return alertsDiv;
}

function updateAlertBadge(show) {
    let badge = document.querySelector('.alert-badge');
    
    if (show && !badge) {
        badge = document.createElement('span');
        badge.className = 'alert-badge';
        badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 1.5s infinite;
        `;
        badge.textContent = '!';
        
        const alertsLinks = document.querySelectorAll('a[href*="alert"], a:contains("Alert")');
        if (alertsLinks.length > 0) {
            alertsLinks[0].style.position = 'relative';
            alertsLinks[0].appendChild(badge);
        }
    } else if (!show && badge) {
        badge.remove();
    }
}

/* ============================================================
   TASK 5: REWARDS DISPLAY - /rewards/<user_id>
   ============================================================ */
async function loadRewards() {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    const rewardEl = $id('rewardPoints');
    
    if (!rewardEl) return;
    
    try {
        const response = await fetch(`${BASE_URL}/rewards/${user_id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const points = data.reward_points || 0;
        
        rewardEl.innerHTML = `🎁 Reward points: <strong>${points.toLocaleString()}</strong>`;
        
        // Add claim button if points > 0
        if (points > 0) {
            addClaimButton(points);
        }
        
    } catch (error) {
        console.error("❌ Failed to load rewards:", error);
        rewardEl.innerHTML = `🎁 Reward points: <strong>1,250</strong>`;
    }
}

async function claimRewards() {
    if (isSubmitting) return;
    
    const user_id = localStorage.getItem('user_id') || USER_ID;
    isSubmitting = true;
    
    const claimBtn = $id('claimRewardsBtn');
    if (claimBtn) {
        claimBtn.innerHTML = '<span class="loading-spinner"></span> Claiming...';
        claimBtn.disabled = true;
    }
    
    try {
        const response = await fetch(`${BASE_URL}/rewards/claim`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ user_id })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        showToast(`🎉 Successfully claimed ${data.points_claimed || 0} reward points!`, 'success');
        
        // Reload rewards display
        setTimeout(() => {
            loadRewards();
            loadStatus();
        }, 1000);
        
    } catch (error) {
        console.error("❌ Failed to claim rewards:", error);
        showToast(`❌ Failed to claim rewards: ${error.message}`, 'error');
    } finally {
        isSubmitting = false;
        if (claimBtn) {
            claimBtn.textContent = 'Claim Rewards';
            claimBtn.disabled = false;
        }
    }
}

function addClaimButton(points) {
    const rewardEl = $id('rewardPoints');
    if (!rewardEl) return;
    
    // Remove existing claim button
    const existingBtn = rewardEl.parentNode.querySelector('#claimRewardsBtn');
    if (existingBtn) existingBtn.remove();
    
    const claimBtn = document.createElement('button');
    claimBtn.id = 'claimRewardsBtn';
    claimBtn.innerHTML = `🎁 Claim ${points.toLocaleString()} Points`;
    claimBtn.style.cssText = `
        margin-top: 10px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #f59e0b, #fbbf24);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        width: 100%;
        transition: transform 0.2s;
    `;
    
    claimBtn.onmouseenter = () => claimBtn.style.transform = 'translateY(-2px)';
    claimBtn.onmouseleave = () => claimBtn.style.transform = 'translateY(0)';
    claimBtn.onclick = claimRewards;
    
    rewardEl.parentNode.insertBefore(claimBtn, rewardEl.nextSibling);
}

/* ============================================================
   TASK 6: AUTO-REFRESH SYSTEM
   ============================================================ */
function startAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Start new interval (8 seconds)
    autoRefreshInterval = setInterval(async () => {
        console.log("🔄 Auto-refreshing dashboard...");
        
        try {
            await loadStatus();
            await loadUsageHistoryAndFillChart();
            await loadAIDisplay();
            await loadAlerts();
            await loadRewards();
            await loadAdvancedPrediction();
        } catch (error) {
            console.error("❌ Auto-refresh failed:", error);
        }
    }, 8000);
    
    console.log("✅ Auto-refresh started (8 seconds interval)");
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log("⏹️ Auto-refresh stopped");
    }
}

/* ============================================================
   TASK 7: LOADING STATES & ERROR HANDLING
   ============================================================ */
function showLoading(element, text = 'Loading...') {
    if (!element) return;
    
    element.dataset.originalText = element.textContent;
    element.innerHTML = `<span class="loading-spinner"></span> ${text}`;
    element.disabled = true;
}

function hideLoading(element) {
    if (!element || !element.dataset.originalText) return;
    
    element.textContent = element.dataset.originalText;
    element.disabled = false;
    delete element.dataset.originalText;
}

async function handleApiCall(apiFunction, loadingElement = null, successMessage = null) {
    if (isSubmitting) return;
    
    isSubmitting = true;
    
    try {
        if (loadingElement) {
            showLoading(loadingElement);
        }
        
        const result = await apiFunction();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error');
        }
        
        if (successMessage) {
            showToast(successMessage, 'success');
        }
        
        return result;
        
    } catch (error) {
        console.error("❌ API call failed:", error);
        showToast(`❌ ${error.message}`, 'error');
        throw error;
        
    } finally {
        isSubmitting = false;
        if (loadingElement) {
            hideLoading(loadingElement);
        }
    }
}

/* ============================================================
   CORE API FUNCTIONS (DASHBOARD)
   ============================================================ */
async function subscribeToPlanAPI(planName, planUnits, price) {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    
    try {
        const response = await fetch(`${BASE_URL}/plan/subscribe`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                user_id, 
                plan_name: planName,
                user_email: localStorage.getItem('user_email') || 'demo@example.com'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return { success: true, data };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function addDailyUsageAPI(units, dateISO) {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    
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
        return { success: true, data };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loadStatus() {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    
    try {
        const response = await fetch(`${BASE_URL}/status/${user_id}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        updateDashboard(data);
        return { success: true, data };
        
    } catch (error) {
        console.error("❌ Failed to load status:", error);
        showToast("⚠️ Using cached data - backend unavailable", "warning");
        updateDashboardWithMockData();
        return { success: false, error: error.message };
    }
}

async function loadUsageHistoryAndFillChart() {
    const user_id = localStorage.getItem('user_id') || USER_ID;
    
    try {
        const response = await fetch(`${BASE_URL}/usage-history/${user_id}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const payload = await response.json();
        const history = payload.history || {};
        updateChartWithHistory(history);
        return { success: true, history };
        
    } catch (error) {
        console.error("❌ Failed to load usage history:", error);
        updateChartWithDemoData();
        return { success: false, error: error.message };
    }
}

/* ============================================================
   DASHBOARD UI UPDATES
   ============================================================ */
function updateDashboard(data) {
    // Update localStorage
    if (data.plan_name) {
        localStorage.setItem('selectedPlan', data.plan_name);
        localStorage.setItem('currentPlan', data.plan_name);
        localStorage.setItem('plan_limit', data.plan_limit);
    }
    
    // Update UI elements
    updateElement('planName', data.plan_name || localStorage.getItem('selectedPlan') || "—");
    updateElement('units', data.month_used !== undefined ? data.month_used : 0);
    updateElement('limit', data.plan_limit !== undefined ? data.plan_limit : 0);
    
    // Update progress bar
    const progressPercent = data.progress_percent || 
                           (data.plan_limit > 0 ? Math.min(100, (data.month_used / data.plan_limit) * 100) : 0);
    
    const usageProgressEl = $id("usageProgress");
    if (usageProgressEl) {
        usageProgressEl.style.width = progressPercent + "%";
        updateProgressBarColor(progressPercent);
    }
    
    // Update AI suggestion based on usage
    updateAIBasedOnUsage(progressPercent);
}

function updateElement(id, value) {
    const el = $id(id);
    if (el) {
        el.textContent = value;
    }
}

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

function updateAIBasedOnUsage(percent) {
    const aiEl = $id("aiSuggestion");
    if (!aiEl) return;
    
    if (percent >= 100) {
        aiEl.innerHTML = `<strong>⚡ AI Coach:</strong> ⚠️ You have exceeded your plan! Consider upgrading to save on overage charges.`;
        aiEl.style.background = "#fef2f2";
        aiEl.style.borderLeftColor = "#ef4444";
    } else if (percent >= 80) {
        aiEl.innerHTML = `<strong>⚡ AI Coach:</strong> 🔔 You're approaching your limit (${percent.toFixed(1)}%). Click "Save tips" for advice!`;
        aiEl.style.background = "#fffbeb";
        aiEl.style.borderLeftColor = "#f59e0b";
    } else if (percent < 50) {
        aiEl.innerHTML = `<strong>⚡ AI Coach:</strong> ✅ Great! You're using only ${percent.toFixed(1)}% of your plan. Keep it up!`;
        aiEl.style.background = "#f0fdf4";
        aiEl.style.borderLeftColor = "#10b981";
    }
}

function updateDashboardWithMockData() {
    const selectedPlan = localStorage.getItem('selectedPlan') || "Standard";
    const planDetails = getPlanDetails(selectedPlan);
    
    const mockData = {
        plan_name: selectedPlan,
        plan_limit: planDetails.units,
        month_used: 140,
        progress_percent: 70,
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
    if (!canvas) return;
    
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
                    title: { display: true, text: 'Date' }
                },
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Units (kWh)' }
                }
            }
        }
    });
}

function updateChartWithHistory(history) {
    if (!usageChart) initializeChart();
    if (!usageChart) return;
    
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
    if (!usageChart) initializeChart();
    if (!usageChart) return;
    
    const mockLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const mockData = [12, 19, 15, 22, 18, 25, 20];
    
    usageChart.data.labels = mockLabels;
    usageChart.data.datasets[0].data = mockData;
    usageChart.update();
}

/* ============================================================
   USER INTERACTIONS (DASHBOARD)
   ============================================================ */
async function subscribeToPlan() {
    if (isSubmitting) return;
    
    const planElement = document.querySelector('input[name="plan"]:checked');
    if (!planElement) {
        showMessage("❌ Please select a plan first", "error");
        return;
    }
    
    const planName = planElement.value;
    const planDetails = getPlanDetails(planName);
    
    // Optimistic UI update
    localStorage.setItem("selectedPlan", planName);
    localStorage.setItem("currentPlan", planName);
    localStorage.setItem("plan_limit", planDetails.units);
    
    updateElement('planName', planName);
    updateElement('limit', planDetails.units);
    
    // Call API
    const result = await handleApiCall(
        () => subscribeToPlanAPI(planName, planDetails.units, planDetails.price),
        $id("subscribeBtn"),
        `✅ Successfully subscribed to ${planName} plan!`
    );
    
    if (result && result.success) {
        // Refresh all data
        await Promise.all([
            loadStatus(),
            loadAIDisplay(),
            loadAdvancedPrediction(),
            loadAlerts(),
            loadRewards()
        ]);
    }
}

async function addDailyUsage() {
    if (isSubmitting) return;
    
    const raw = prompt("Enter today's usage in units (e.g. 2.5):", "2.5");
    if (raw === null) return;
    
    const units = parseFloat(raw);
    if (isNaN(units) || units <= 0) {
        showToast("❌ Please enter a valid positive number", "error");
        return;
    }
    
    const date = new Date().toISOString().slice(0, 10);
    
    const result = await handleApiCall(
        () => addDailyUsageAPI(units, date),
        $id("addUsageBtn"),
        `✅ Added ${units} units for ${date}!`
    );
    
    if (result && result.success) {
        // Refresh dashboard and chart
        await Promise.all([
            loadStatus(),
            loadUsageHistoryAndFillChart(),
            loadAIDisplay(),
            loadAlerts()
        ]);
    }
}

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

function getPlanDetails(planName) {
    const plans = {
        "Basic": { units: 100, price: 1000 },
        "Standard": { units: 200, price: 2000 },
        "Premium": { units: 400, price: 4000 }
    };
    return plans[planName] || { units: 100, price: 1000 };
}

function showSaveTipsModal() {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 16px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #1e293b; margin: 0;">💡 Energy Saving Tips</h3>
                <button onclick="this.closest('.modal-overlay').remove()" 
                        style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #3b82f6; margin-bottom: 10px;">🌡️ Air Conditioning</h4>
                <ul style="color: #475569; padding-left: 20px;">
                    <li>Set AC to 24°C instead of 20°C to save 15% energy</li>
                    <li>Use ceiling fans with AC to feel 4°C cooler</li>
                    <li>Clean AC filters monthly for better efficiency</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #10b981; margin-bottom: 10px;">🔌 Appliance Usage</h4>
                <ul style="color: #475569; padding-left: 20px;">
                    <li>Use washing machine with full loads only</li>
                    <li>Unplug chargers when not in use</li>
                    <li>Use microwave instead of oven for small meals</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #f59e0b; margin-bottom: 10px;">⏰ Time Management</h4>
                <ul style="color: #475569; padding-left: 20px;">
                    <li>Run heavy appliances during off-peak hours (10 PM - 6 AM)</li>
                    <li>Use delay start features for washers/dryers</li>
                    <li>Batch similar tasks together</li>
                </ul>
            </div>
            
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                Got it! I'll save energy
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

/* ============================================================
   PAGE INITIALIZATION (DUAL PURPOSE)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 SmartPower System Initialized");
    console.log("Backend URL:", BASE_URL);
    console.log("Current Page:", window.location.pathname);
    
    // Get user info
    USER_ID = localStorage.getItem('user_id') || "user1";
    console.log("User Info:", {
        user_id: USER_ID,
        email: localStorage.getItem('user_email'),
        name: localStorage.getItem('user_name')
    });
    
    // Check if we're on login page or dashboard
    const isLoginPage = window.location.pathname.includes('login.html') || 
                        window.location.pathname.includes('login');
    
    if (isLoginPage) {
        // Initialize login page
        initializeLoginPage();
    } else {
        // Initialize dashboard page
        initializeDashboardPage();
    }
});

function initializeLoginPage() {
    console.log("🔐 Initializing login page...");
}

function initializeDashboardPage() {
    console.log("📊 Initializing dashboard page...");
    
    // Check if user is logged in
    if (!localStorage.getItem('user_id') || localStorage.getItem('user_id') === "user1") {
        console.log("⚠️ No proper user login detected. Using demo user.");
    }
    
    // Setup event listeners for dashboard
    setupDashboardEventListeners();
    
    // Restore UI state
    restoreUIState();
    
    // Initialize components
    initializeChart();
    
    // Load all data
    loadAllData();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Check backend status
    setTimeout(() => {
        checkBackend();
    }, 1000);
}

function setupDashboardEventListeners() {
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
    
    // Check backend button
    const checkBackendBtn = document.querySelector('.check-btn');
    if (checkBackendBtn) {
        checkBackendBtn.addEventListener('click', checkBackend);
    }
}

function restoreUIState() {
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
}

async function loadAllData() {
    console.log("📊 Loading all dashboard data...");
    
    try {
        await Promise.all([
            loadStatus(),
            loadUsageHistoryAndFillChart(),
            loadAIDisplay(),
            loadAdvancedPrediction(),
            loadAlerts(),
            loadRewards()
        ]);
        
        console.log("✅ All data loaded successfully");
        
    } catch (error) {
        console.error("❌ Failed to load some data:", error);
        showToast("⚠️ Some data failed to load", "warning");
    }
}

/* ============================================================
   GLOBAL EXPORTS (ALL FUNCTIONS)
   ============================================================ */
// Login functions
window.handleLogin = handleLogin;
window.registerUserAPI = registerUserAPI;

// Dashboard functions
window.selectPlan = selectPlan;
window.checkBackend = checkBackend;
window.addDailyUsage = addDailyUsage;
window.showSaveTipsModal = showSaveTipsModal;
window.claimRewards = claimRewards;

// Logout function
window.handleLogout = function() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_name');
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('currentPlan');
        
        window.location.href = 'login.html';
    }
};

// Test function
window.testLogin = async function() {
    // Test the registration API
    const testEmail = `test${Date.now()}@example.com`;
    const testName = "Test User";
    const testUserId = testEmail.split('@')[0];
    
    console.log("🧪 Testing registration with:", { testEmail, testName, testUserId });
    
    const result = await registerUserAPI(testUserId, testName, testEmail);
    console.log("🧪 Test result:", result);
    
    alert(`Test registration: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n${result.message}`);
};

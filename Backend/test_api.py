import requests
import json

BASE = "http://127.0.0.1:5000"

USER = "test_api_user"

def p(title, res):
    print("\n==============================")
    print(title)
    print("==============================")
    print("Status:", res.status_code)
    print(res.json())


# -------------------------------------------------------
# 1️⃣ SUBSCRIBE
# -------------------------------------------------------
def test_subscribe():
    res = requests.post(f"{BASE}/subscribe", json={
        "user_id": USER,
        "plan_name": "Basic",
        "plan_units": 100,
        "price": 99
    })
    p("SUBSCRIBE", res)


# -------------------------------------------------------
# 2️⃣ ADD USAGE (automatic today's date)
# -------------------------------------------------------
def test_add_usage():
    res = requests.post(f"{BASE}/usage", json={
        "user_id": USER,
        "units": 5.5
    })
    p("ADD USAGE (/usage)", res)


# -------------------------------------------------------
# 3️⃣ STATUS
# -------------------------------------------------------
def test_status():
    res = requests.get(f"{BASE}/status/{USER}")
    p("STATUS", res)


# -------------------------------------------------------
# 4️⃣ USAGE HISTORY
# -------------------------------------------------------
def test_usage_history():
    res = requests.get(f"{BASE}/usage-history/{USER}")
    p("USAGE HISTORY", res)


# -------------------------------------------------------
# 5️⃣ ADVANCED PREDICTION
# -------------------------------------------------------
def test_predict_advanced():
    res = requests.get(f"{BASE}/predict-advanced/{USER}")
    p("PREDICT ADVANCED", res)


# -------------------------------------------------------
# 6️⃣ AI: GET ENERGY SUGGESTION
# -------------------------------------------------------
def test_energy_suggestion():
    res = requests.get(f"{BASE}/api/get-energy-suggestion", params={"user_id": USER})
    p("AI ENERGY SUGGESTION", res)


# -------------------------------------------------------
# 7️⃣ AI: PREDICT NEXT USAGE
# -------------------------------------------------------
def test_predict_next_usage():
    res = requests.get(f"{BASE}/api/predict_next_usage", params={"user_id": USER})
    p("AI PREDICT NEXT USAGE", res)


# -------------------------------------------------------
# 8️⃣ ALERTS
# -------------------------------------------------------
def test_alerts():
    res = requests.get(f"{BASE}/alerts/{USER}")
    p("ALERTS", res)


# -------------------------------------------------------
# 9️⃣ ADMIN ANALYTICS
# -------------------------------------------------------
def test_admin_analytics():
    res = requests.get(f"{BASE}/admin/analytics")
    p("ADMIN ANALYTICS", res)



# -------------------------------------------------------
# RUN ALL TESTS IN ORDER
# -------------------------------------------------------
if __name__ == "__main__":
    print("\n🚀 Running SmartPower API Tests...\n")

    test_subscribe()
    test_add_usage()

    test_status()
    test_usage_history()
    test_predict_advanced()

    test_energy_suggestion()
    test_predict_next_usage()

    test_alerts()
    test_admin_analytics()

    print("\n✅ TESTS COMPLETED\n")

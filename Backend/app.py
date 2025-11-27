from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from filelock import FileLock
from pathlib import Path
from datetime import datetime, timezone
from ML.ai_energy_coach import get_energy_suggestion
from ML.predict_service import predict_next_usage
import logging

# ----------------------------------------------------------
# LOGGING SETUP  (put this immediately after imports)
# ----------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("backend.log"),
        logging.StreamHandler()   # <-- THIS shows logs in your terminal
    ]
)


# ---------------------------------------------
# DATABASE SETUP
# ---------------------------------------------
DB_PATH = Path("db.json")
LOCK_PATH = str(DB_PATH) + ".lock"

app = Flask(__name__)
CORS(app)


# ----------------------------------------------------
# LOGGING MIDDLEWARE (shows all requests in terminal)
# ----------------------------------------------------
@app.before_request
def log_request():
    print("🔥🔥🔥 INCOMING REQUEST 🔥🔥🔥")
    print("URL:", request.url)
    print("Method:", request.method)
    print("JSON:", request.get_json(silent=True))
    print("Args:", request.args)


# ---------------------------------------------
# DB HELPERS
# ---------------------------------------------
def read_db():
    if not DB_PATH.exists():
        return {"users": [], "subscriptions": {}, "usage": {}}
    with FileLock(LOCK_PATH):
        return json.loads(DB_PATH.read_text(encoding="utf-8"))

def write_db(data):
    with FileLock(LOCK_PATH):
        DB_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")

# ---------------------------------------------
# ROOT
# ---------------------------------------------
@app.route("/")
def root():
    return jsonify({"status": "SmartPower backend running"}), 200

# ---------------------------------------------
# PREDICT (dummy version)
# ---------------------------------------------
@app.route("/predict", methods=["POST"])
def predict_stub():
    body = request.get_json() or {}
    history = body.get("history", [])
    pred = float(sum(history) / len(history)) if history else 0.0
    return jsonify({"predicted_next_month_units": round(pred * 30, 3)}), 200

# ---------------------------------------------
# SUBSCRIBE  (with validation)
# ---------------------------------------------
@app.route("/subscribe", methods=["POST"])
def subscribe():
    print("🔥 /subscribe called")
    logging.info(f"[SUBSCRIBE] Request for user: {request.get_json(silent=True).get('user_id') if request.get_json(silent=True) else None}")


    data = request.get_json() or {}

    user_id = data.get("user_id")
    plan_name = data.get("plan_name")
    plan_units = data.get("plan_units")
    price = data.get("price")

    # VALIDATION
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    if not plan_name:
        return jsonify({"error": "plan_name is required"}), 400

    try:
        plan_units = int(plan_units)
        if plan_units <= 0:
            return jsonify({"error": "plan_units must be > 0"}), 400
    except:
        return jsonify({"error": "plan_units must be an integer"}), 400

    try:
        price = float(price)
        if price < 0:
            return jsonify({"error": "price cannot be negative"}), 400
    except:
        return jsonify({"error": "price must be a number"}), 400

    # SAVE
    db = read_db()
    subs = db.get("subscriptions", {})

    subs[user_id] = {
        "plan_name": plan_name,
        "plan_units": plan_units,
        "price": price,
        "start_ts": datetime.now(timezone.utc).isoformat()
    }

    db["subscriptions"] = subs
    write_db(db)

    return jsonify({"message": "subscribed", "subscription": subs[user_id]}), 201

# ---------------------------------------------
# TASK 3 — /usage/add (Frontend requested API)
# Allows adding usage for ANY date
# ---------------------------------------------
@app.route("/usage/add", methods=["POST"])
def usage_add_specific_date():
    print("🔥 /usage/add called")
    logging.info(f"[USAGE-ADD] Request: {request.get_json()}")

    data = request.get_json() or {}
    user_id = data.get("user_id")
    units = data.get("units")
    date = data.get("date")  # YYYY-MM-DD

    # VALIDATION
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    if not date:
        return jsonify({"error": "date is required"}), 400

    # Validate units
    if units is None:
        return jsonify({"error": "units is required"}), 400
    try:
        units = float(units)
        if units <= 0:
            return jsonify({"error": "units must be > 0"}), 400
    except:
        return jsonify({"error": "units must be a number"}), 400

    db = read_db()
    usage_all = db.get("usage", {})

    if user_id not in usage_all:
        usage_all[user_id] = {}

    # Save usage for given date
    usage_all[user_id][date] = {"units": units}

    db["usage"] = usage_all
    write_db(db)

    return jsonify({"message": "Usage updated"}), 200

# ---------------------------------------------
# USAGE — TODAY'S DATE (Frontend expects /usage)
# ---------------------------------------------
@app.route("/usage", methods=["POST"])
def usage_add_today():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    units = data.get("units")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    if units is None:
        return jsonify({"error": "units is required"}), 400

    try:
        units = float(units)
        if units <= 0:
            return jsonify({"error": "units must be > 0"}), 400
    except:
        return jsonify({"error": "units must be a number"}), 400

    today = datetime.now().date().isoformat()

    db = read_db()
    usage_all = db.get("usage", {})

    if user_id not in usage_all:
        usage_all[user_id] = {}

    usage_all[user_id][today] = {"units": units}

    db["usage"] = usage_all
    write_db(db)

    return jsonify({
        "message": "Usage added",
        "date": today,
        "units": units
    }), 201


# ---------------------------------------------
# STATUS
# ---------------------------------------------
@app.route("/status/<user_id>", methods=["GET"])
def status(user_id):
    print(f"🔥 /status/{user_id} called")
    logging.info(f"[STATUS] Request for user: {user_id}")
    db = read_db()
    subs = db.get("subscriptions", {})
    usage_all = db.get("usage", {})

    user_sub = subs.get(user_id, {})
    user_usage = usage_all.get(user_id, {})

    month_used = 0.0
    for rec in user_usage.values():
        if isinstance(rec, dict):
            month_used += float(rec.get("units", 0.0))
        else:
            month_used += float(rec)

    # Prediction
    if user_usage:
        values = []
        for rec in user_usage.values():
            values.append(float(rec["units"] if isinstance(rec, dict) else rec))
        avg_daily = sum(values) / len(values)
        predicted_units = round(avg_daily * 30, 2)
    else:
        predicted_units = 0.0

    # Today's usage
    today_key = datetime.now().date().isoformat()
    today_rec = user_usage.get(today_key, 0.0)
    today_used = float(today_rec.get("units", 0)) if isinstance(today_rec, dict) else float(today_rec)

    plan_limit = int(user_sub.get("plan_units", 0))
    plan_name = user_sub.get("plan_name")
    progress_percent = round((month_used / plan_limit) * 100, 2) if plan_limit else 0

    return jsonify({
        "user_id": user_id,
        "today_used": today_used,
        "month_used": round(month_used, 2),
        "predicted_units": predicted_units,
        "plan_limit": plan_limit,
        "plan_name": plan_name,
        "progress_percent": progress_percent
    }), 200

# ---------------------------------------------
# TASK 1 — RAW USAGE HISTORY
# ---------------------------------------------
@app.route("/usage-history/<user_id>", methods=["GET"])
def usage_history_raw(user_id):
    print(f"🔥 /usage-history/{user_id} called")
    logging.info(f"[USAGE HISTORY] Request for user: {user_id}")
    db = read_db()
    usage_all = db.get("usage", {})
    user_usage = usage_all.get(user_id, {})
    return jsonify({"history": user_usage}), 200
# ---------------------------------------------
# TASK 4 — AI COACH SUGGESTIONS
# ---------------------------------------------
@app.route("/coach/<user_id>", methods=["GET"])
def coach(user_id):
    print(f"🔥 /coach/{user_id} called")
    logging.info(f"[COACH] Request for user: {user_id}")

    db = read_db()
    usage_all = db.get("usage", {})

    user_usage = usage_all.get(user_id, {})

    # If no usage at all
    if not user_usage:
        return jsonify({"suggestions": ["No usage data found. Start tracking to get recommendations."]}), 200

    # Calculate total usage
    total = 0
    days = 0
    for rec in user_usage.values():
        if isinstance(rec, dict):
            total += float(rec.get("units", 0.0))
        else:
            total += float(rec)
        days += 1

    avg = total / days if days else 0

    suggestions = []

    # Logic based on average
    if avg > 8:
        suggestions.append("High average usage. Try reducing AC or heater usage.")
    if avg > 12:
        suggestions.append("Your consumption is significantly above normal. Check for faulty appliances.")
    if avg < 3:
        suggestions.append("Great work! You are saving a lot of energy.")
    if 3 <= avg <= 8:
        suggestions.append("Usage is normal. Maintain this pattern.")

    # Safety: if no suggestions were added
    if not suggestions:
        suggestions.append("Usage normal. Maintain this pattern.")

    return jsonify({"suggestions": suggestions}), 200

# ---------------------------------------------
# TASK 2 — GET SUBSCRIPTION DETAILS
# ---------------------------------------------
@app.route("/subscription/<user_id>", methods=["GET"])
def get_subscription(user_id):
    print(f"🔥 /subscription/{user_id} called")
    logging.info(f"[GET SUBSCRIPTION] Request for user: {user_id}")

    db = read_db()
    subs = db.get("subscriptions", {})

    if user_id not in subs:
        return jsonify({"error": "Subscription not found"}), 404

    return jsonify({"subscription": subs[user_id]}), 200

# ---------------------------------------------
# UPDATE SUBSCRIPTION  (TASK 3C VALIDATION)
# ---------------------------------------------
@app.route("/update/<user_id>", methods=["POST"])
def update_subscription(user_id):
    print(f"🔥 /update/{user_id} called")
    logging.info(f"[UPDATE] Updating subscription for user: {user_id}")

    db = read_db()
    subs = db.get("subscriptions", {})

    if user_id not in subs:
        return jsonify({"error": "User not subscribed"}), 404

    incoming = request.get_json() or request.form

    # VALIDATE + UPDATE
    if "plan_name" in incoming:
        if not incoming["plan_name"]:
            return jsonify({"error": "plan_name cannot be empty"}), 400
        subs[user_id]["plan_name"] = incoming["plan_name"]

    if "plan_units" in incoming:
        try:
            u = int(incoming["plan_units"])
            if u <= 0:
                return jsonify({"error": "plan_units must be > 0"}), 400
            subs[user_id]["plan_units"] = u
        except:
            return jsonify({"error": "plan_units must be an integer"}), 400

    if "price" in incoming:
        try:
            p = float(incoming["price"])
            if p < 0:
                return jsonify({"error": "price cannot be negative"}), 400
            subs[user_id]["price"] = p
        except:
            return jsonify({"error": "price must be a number"}), 400

    db["subscriptions"] = subs
    write_db(db)

    return jsonify({"message": "Subscription updated", "updated_data": subs[user_id]}), 200
# -------------------------------------------------------------
# TASK 5 — ADVANCED PREDICTION API
# -------------------------------------------------------------
@app.route("/predict-advanced/<user_id>", methods=["GET"])
def predict_advanced(user_id):
    print(f"🔥 /predict-advanced/{user_id} called")
    logging.info(f"[PREDICT-ADVANCED] Request for user: {user_id}")

    db = read_db()
    usage_all = db.get("usage", {})
    user_usage = usage_all.get(user_id, {})

    if not user_usage:
        return jsonify({
            "prediction": 0,
            "trend": "No data",
            "moving_average": 0
        }), 200

    # Convert to list of floats
    values = []
    for day, rec in user_usage.items():
        if isinstance(rec, dict):
            values.append(float(rec.get("units", 0)))
        else:
            values.append(float(rec))

    # 7-day moving average
    if len(values) >= 7:
        moving_avg = sum(values[-7:]) / 7
    else:
        moving_avg = sum(values) / len(values)

    # Predict 30 days
    prediction = round(moving_avg * 30, 2)

    # Trend
    if len(values) >= 2:
        if values[-1] > values[-2]:
            trend = "Increasing usage"
        elif values[-1] < values[-2]:
            trend = "Decreasing usage"
        else:
            trend = "Stable usage"
    else:
        trend = "Not enough data"

    return jsonify({
        "prediction": prediction,
        "moving_average": round(moving_avg, 2),
        "trend": trend
    }), 200
# -------------------------------------------------------------
# TASK 6 — ADMIN ANALYTICS API
# -------------------------------------------------------------
@app.route("/admin/analytics", methods=["GET"])
def admin_analytics():
    print("🔥 /admin/analytics called")
    logging.info("[ADMIN] Analytics request")

    db = read_db()
    subs = db.get("subscriptions", {})
    usage_all = db.get("usage", {})

    total_users = len(subs)

    # ----- Total units consumed -----
    total_units = 0
    day_totals = {}  # for peak day
    for user, days in usage_all.items():
        for date, rec in days.items():
            units = float(rec.get("units", 0)) if isinstance(rec, dict) else float(rec)
            total_units += units

            day_totals[date] = day_totals.get(date, 0) + units

    # ----- Highest usage user -----
    highest_user = None
    highest_usage = 0
    for user, days in usage_all.items():
        user_sum = sum(float(rec.get("units", 0)) if isinstance(rec, dict) else float(rec)
                       for rec in days.values())
        if user_sum > highest_usage:
            highest_usage = user_sum
            highest_user = user

    # ----- Average daily usage -----
    if day_totals:
        avg_daily = round(total_units / len(day_totals), 2)
        peak_day = max(day_totals, key=day_totals.get)
    else:
        avg_daily = 0
        peak_day = None

    # ----- Plan distribution -----
    plan_distribution = {}
    for user, sub in subs.items():
        plan = sub.get("plan_name", "Unknown")
        plan_distribution[plan] = plan_distribution.get(plan, 0) + 1

    return jsonify({
        "total_users": total_users,
        "total_units": round(total_units, 2),
        "highest_user": highest_user,
        "highest_usage": round(highest_usage, 2),
        "average_daily_usage": avg_daily,
        "peak_usage_day": peak_day,
        "plan_distribution": plan_distribution
    }), 200
# -------------------------------------------------------------
# TASK 7 — NOTIFICATION RULES API
# -------------------------------------------------------------
@app.route("/alerts/<user_id>", methods=["GET"])
def alerts(user_id):
    print(f"🔥 /alerts/{user_id} called")
    logging.info(f"[ALERTS] Request for user: {user_id}")

    db = read_db()
    subs = db.get("subscriptions", {})
    usage_all = db.get("usage", {})

    user_sub = subs.get(user_id)
    user_usage = usage_all.get(user_id, {})

    alerts = []

    # If no subscription or no usage
    if not user_sub:
        return jsonify({"alerts": ["User not subscribed"]}), 200

    if not user_usage:
        return jsonify({"alerts": ["No usage data available"]}), 200

    # Extract needed values
    plan_limit = user_sub.get("plan_units", 0)

    # Month total
    total_used = sum(
        float(rec.get("units", 0)) if isinstance(rec, dict) else float(rec)
        for rec in user_usage.values()
    )

    # Detect nearing limit (80%)
    if plan_limit > 0:
        if total_used >= 0.8 * plan_limit and total_used < plan_limit:
            alerts.append("⚠️ You have used more than 80% of your monthly plan.")

        if total_used >= plan_limit:
            alerts.append("🚨 You exceeded your monthly usage limit!")

    # Predict next month usage using average
    daily_values = [
        float(rec.get("units", 0)) if isinstance(rec, dict) else float(rec)
        for rec in user_usage.values()
    ]

    if daily_values:
        avg_daily = sum(daily_values) / len(daily_values)
        predicted = avg_daily * 30

        if predicted > plan_limit:
            alerts.append("📈 Your predicted usage may exceed your subscription limit.")

    # Compare today vs yesterday
    dates = sorted(user_usage.keys())
    if len(dates) >= 2:
        today = dates[-1]
        yesterday = dates[-2]

        today_units = float(user_usage[today].get("units", 0)) if isinstance(user_usage[today], dict) else float(user_usage[today])
        y_units = float(user_usage[yesterday].get("units", 0)) if isinstance(user_usage[yesterday], dict) else float(user_usage[yesterday])

        if today_units > y_units:
            alerts.append("🔥 Today's usage is higher than yesterday.")

        # Sudden spike (2x)
        if y_units > 0 and today_units > 2 * y_units:
            alerts.append("⚡ Sudden usage spike detected.")

    # If no alerts found
    if not alerts:
        alerts = ["Everything looks normal. 👍"]

    return jsonify({"alerts": alerts}), 200

@app.get("/api/get-energy-suggestion")
def api_energy_suggestion():
    try:
        data = read_db()

        usage = data.get("usage", {})
        user_usage = usage.get("user1", {})  # change user if needed

        # flatten values into {0: units1, 1: units2, ...}
        numeric_usage = {
            idx: (rec["units"] if isinstance(rec, dict) else rec)
            for idx, rec in enumerate(user_usage.values())
        }

        plan_units = data.get("subscriptions", {}).get("user1", {}).get("plan_units", 100)

        suggestion = get_energy_suggestion(numeric_usage, plan_units)

        return jsonify({"suggestion": suggestion})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/predict_next_usage")
def api_predict_usage():
    try:
        data = read_db()
        usage = data.get("usage", {})

        user_usage = usage.get("user1", {})  # change later if needed

        daily_values = [
            v["units"] if isinstance(v, dict) else v
            for v in user_usage.values()
        ]

        predicted = predict_next_usage(daily_values)

        return jsonify({"predicted_usage": predicted})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------
# RUN APP
# ---------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

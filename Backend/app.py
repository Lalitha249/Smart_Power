from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import json
from filelock import FileLock
from pathlib import Path
from datetime import datetime, timezone
try:
    # these are your real modules in backend/ML/*.py
    from ML.ai_energy_coach import get_energy_suggestion
    from ML.predict_service import predict_next_usage
    from ML.reward_system import calculate_rewards
    logging.info("ML modules loaded successfully.")
except Exception as e:
    logging.warning(f"ML modules not available or failed to import: {e}. Using fallback stubs.")

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
# LOGGING MIDDLEWARE (improved & safe)
# ----------------------------------------------------
@app.before_request
def log_request():
    try:
        logging.info("--------------------------------------------------")
        logging.info(f"🔥 Incoming Request: {request.method} {request.url}")
        logging.info(f"Headers: {dict(request.headers)}")
        logging.info(f"Query Params: {dict(request.args)}")
        logging.info(f"JSON Body: {request.get_json(silent=True)}")
        logging.info("--------------------------------------------------")
    except Exception as e:
        logging.error(f"[ERROR] logging middleware failed: {str(e)}")
#-----------db read/write with locking and error handling-----------------------------
def read_db():
    try:
        if not DB_PATH.exists():
            return {"users": [], "subscriptions": {}, "usage": {}, "rewards": {}}

        with FileLock(LOCK_PATH):
            return json.loads(DB_PATH.read_text(encoding="utf-8"))

    except Exception as e:
        logging.error(f"[ERROR] read_db failed: {str(e)}")
        # Return a safe empty schema instead of crashing
        return {"users": [], "subscriptions": {}, "usage": {}, "rewards": {}}

def write_db(data):
    try:
        with FileLock(LOCK_PATH):
            DB_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")

    except Exception as e:
        logging.error(f"[ERROR] write_db failed: {str(e)}")
  # Fail silently — API route will handle the error
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
    try:
        logging.info("🔥 /subscribe called")
        body = request.get_json(silent=True) or {}
        logging.info(f"[SUBSCRIBE] Request: {body}")

        user_id = body.get("user_id")
        plan_name = body.get("plan_name")
        plan_units = body.get("plan_units")
        price = body.get("price")

        # ---------- VALIDATION ----------
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        if not plan_name:
            return jsonify({"error": "plan_name is required"}), 400

        # validate plan units
        try:
            plan_units = int(plan_units)
            if plan_units <= 0:
                return jsonify({"error": "plan_units must be > 0"}), 400
        except:
            return jsonify({"error": "plan_units must be an integer"}), 400

        # validate price
        try:
            price = float(price)
            if price < 0:
                return jsonify({"error": "price cannot be negative"}), 400
        except:
            return jsonify({"error": "price must be a number"}), 400

        # ---------- SAVE ----------
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

        return jsonify({
            "message": "subscribed",
            "subscription": subs[user_id]
        }), 201

    except Exception as e:
        logging.error(f"[ERROR] subscribe: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
# ---------------------------------------------
# USAGE — TODAY'S DATE (Frontend expects /usage)
# ---------------------------------------------
@app.route("/usage/add", methods=["POST"])
def usage_add_specific_date():
    try:
        logging.info("🔥 /usage/add called")
        body = request.get_json(silent=True) or {}
        logging.info(f"[USAGE-ADD] Request: {body}")

        user_id = body.get("user_id")
        units = body.get("units")
        date = body.get("date")  # YYYY-MM-DD

        # VALIDATION
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        if not date:
            return jsonify({"error": "date is required"}), 400

        if units is None:
            return jsonify({"error": "units is required"}), 400

        try:
            units = float(units)
            if units <= 0:
                return jsonify({"error": "units must be > 0"}), 400
        except:
            return jsonify({"error": "units must be a number"}), 400

        # DB operations
        db = read_db()
        usage_all = db.get("usage", {})

        if user_id not in usage_all:
            usage_all[user_id] = {}

        usage_all[user_id][date] = {"units": units}
        db["usage"] = usage_all
        write_db(db)

        return jsonify({"message": "Usage updated"}), 200

    except Exception as e:
        logging.error(f"[ERROR] /usage/add failed: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

# -------------------------------------------------------------
# TASK 6 — ADMIN ANALYTICS API
# -------------------------------------------------------------
@app.route("/admin/analytics", methods=["GET"])
def admin_analytics():
    try:
        logging.info("🔥 /admin/analytics called")
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
            user_sum = sum(
                float(rec.get("units", 0)) if isinstance(rec, dict) else float(rec)
                for rec in days.values()
            )
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

    except Exception as e:
        logging.error(f"[ERROR] /admin/analytics failed: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@app.route("/status/<user_id>", methods=["GET"])
def status(user_id):
    try:
        logging.info(f"🔥 /status/{user_id} called")
        logging.info(f"[STATUS] Request for user: {user_id}")

        db = read_db()
        subs = db.get("subscriptions", {})
        usage_all = db.get("usage", {})

        # VALIDATION
        if user_id not in subs:
            return jsonify({"error": "Subscription not found for user"}), 404

        user_sub = subs.get(user_id, {})
        user_usage = usage_all.get(user_id, {})

        # Month used
        month_used = 0.0
        for rec in user_usage.values():
            month_used += float(rec.get("units", 0.0)) if isinstance(rec, dict) else float(rec)

        # Prediction
        if user_usage:
            values = [
                float(rec["units"] if isinstance(rec, dict) else rec)
                for rec in user_usage.values()
            ]
            avg_daily = sum(values) / len(values)
            predicted_units = round(avg_daily * 30, 2)
        else:
            predicted_units = 0.0

        # Today
        today_key = datetime.now().date().isoformat()
        today_rec = user_usage.get(today_key, 0.0)
        today_used = float(today_rec.get("units", 0)) if isinstance(today_rec, dict) else float(today_rec)

        plan_limit = int(user_sub.get("plan_units", 0))
        plan_name = user_sub.get("plan_name")
        progress_percent = round((month_used / plan_limit) * 100, 2) if plan_limit else 0

        # ------------------------------------------------
        # ✅ REWARD CALCULATION (Correct position)
        # ------------------------------------------------
        reward_points = calculate_rewards(month_used, plan_limit)

        db = read_db()  # read again to avoid overwrite
        db.setdefault("rewards", {})
        db["rewards"][user_id] = reward_points
        write_db(db)
        # ------------------------------------------------

        return jsonify({
            "user_id": user_id,
            "plan_name": plan_name,
            "plan_limit": plan_limit,
            "today_used": today_used,
            "month_used": month_used,
            "predicted_units": predicted_units,
            "progress_percent": progress_percent,
            "reward_points": reward_points
        }), 200

    except Exception as e:
        logging.error(f"[ERROR] status failed: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# ---------------------------------------------
# TASK 1 — RAW USAGE HISTORY
# ---------------------------------------------
@app.route("/usage-history/<user_id>", methods=["GET"])
def usage_history_raw(user_id):
    logging.info(f"🔥 /usage-history/{user_id} called")
    logging.info(f"[USAGE HISTORY] Request for user: {user_id}")
    db = read_db()
    usage_all = db.get("usage", {})
    user_usage = usage_all.get(user_id, {})
    return jsonify({"history": user_usage}), 200
# ---------------------------------------------
# TASK 4 — AI COACHING API
# --------------------------------------------- 
@app.route("/coach/<user_id>", methods=["GET"])
def coach(user_id):
    try:
        logging.info(f"🔥 /coach/{user_id} called")
        logging.info(f"[COACH] Request for user: {user_id}")

        db = read_db()
        usage_all = db.get("usage", {})

        user_usage = usage_all.get(user_id, {})

        if not user_usage:
            return jsonify({
                "suggestions": ["No usage data found. Start tracking to get recommendations."]
            }), 200

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

        if avg > 8:
            suggestions.append("High average usage. Try reducing AC or heater usage.")
        if avg > 12:
            suggestions.append("Your consumption is significantly above normal. Check for faulty appliances.")
        if avg < 3:
            suggestions.append("Great work! You are saving a lot of energy.")
        if 3 <= avg <= 8:
            suggestions.append("Usage is normal. Maintain this pattern.")

        if not suggestions:
            suggestions.append("Usage normal. Maintain this pattern.")

        return jsonify({"suggestions": suggestions}), 200

    except Exception as e:
        logging.error(f"[ERROR] /coach failed: {str(e)}")
        return jsonify({"error": "Internal error", "details": str(e)}), 500

# ---------------------------------------------
# TASK 2 — GET SUBSCRIPTION DETAILS
# ---------------------------------------------
@app.route("/subscription/<user_id>", methods=["GET"])
def get_subscription(user_id):
    logging.info("🔥 /subscribe called")
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
    logging.info(f"🔥 /update/{user_id} called")
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
@app.get("/predict-advanced/<user_id>")
def predict_advanced(user_id):
    try:
        logging.info(f"[PREDICT-ADVANCED] Request for user: {user_id}")

        db = read_db()
        usage = db.get("usage", {}).get(user_id, {})

        # convert dict → list of numbers
        daily_values = [
            v["units"] if isinstance(v, dict) else v
            for v in usage.values()
        ]

        if not daily_values:
            return jsonify({
                "prediction": 0,
                "moving_average": 0,
                "trend": "No data"
            }), 200

        # monthly prediction (your ML simple model)
        prediction = predict_next_usage(daily_values)

        # 7-day moving average (or full avg if <7 days)
        if len(daily_values) >= 7:
            moving_avg = sum(daily_values[-7:]) / 7
        else:
            moving_avg = sum(daily_values) / len(daily_values)

        # Trend
        if len(daily_values) >= 2:
            if daily_values[-1] > daily_values[-2]:
                trend = "increasing"
            elif daily_values[-1] < daily_values[-2]:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "Not enough data"

        return jsonify({
            "prediction": round(prediction, 2),
            "moving_average": round(moving_avg, 2),
            "trend": trend
        }), 200

    except Exception as e:
        logging.error(f"[ERROR] predict_advanced: {str(e)}")
        return jsonify({"error": str(e)}), 500

# -------------------------------------------------------------
# TASK 7 — NOTIFICATION RULES API
# -------------------------------------------------------------
@app.route("/alerts/<user_id>", methods=["GET"])
def alerts(user_id):
    try:
        logging.info(f"🔥 /alerts/{user_id} called")
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
            if 0.8 * plan_limit <= total_used < plan_limit:
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

            today_units = float(user_usage[today].get("units", 0))
            y_units = float(user_usage[yesterday].get("units", 0))

            if today_units > y_units:
                alerts.append("🔥 Today's usage is higher than yesterday.")

            if y_units > 0 and today_units > 2 * y_units:
                alerts.append("⚡ Sudden usage spike detected.")

        # If no alerts found
        if not alerts:
            alerts = ["Everything looks normal. 👍"]

        return jsonify({"alerts": alerts}), 200

    except Exception as e:
        logging.error(f"[ERROR] alerts: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.get("/api/get-energy-suggestion")
def api_energy_suggestion():
    try:
        user_id = request.args.get("user_id", "user1")

        data = read_db()
        usage_all = data.get("usage", {})
        subs_all = data.get("subscriptions", {})

        # ----------- COMPATIBILITY SHIM -----------
        # Some old ML code expects "usage_history"
        if "usage_history" not in data:
            data["usage_history"] = usage_all
        # ------------------------------------------

        # ----------- VALIDATION -----------
        if user_id not in usage_all:
            return jsonify({"error": "User not found"}), 404

        if user_id not in subs_all:
            return jsonify({"error": "User subscription not found"}), 404

        user_usage = usage_all[user_id]

        if not user_usage:
            return jsonify({"error": "No usage history for this user"}), 400
        # ----------------------------------

        # convert dict → {0: units1, 1: units2, ...}
        numeric_usage = {
            idx: (rec["units"] if isinstance(rec, dict) else rec)
            for idx, rec in enumerate(user_usage.values())
        }

        plan_units = subs_all[user_id].get("plan_units", 100)
        suggestion = get_energy_suggestion(numeric_usage, plan_units)

        return jsonify({
            "user_id": user_id,
            "suggestion": suggestion
        })

    except Exception as e:
        logging.error(f"[ERROR] get-energy-suggestion: {str(e)}")
        return jsonify({"error": str(e)}), 500

    
@app.get("/api/predict_next_usage")
def api_predict_usage():
    try:
        user_id = request.args.get("user_id", "user1")

        data = read_db()

        # -------- Compatibility shim --------
        if "usage_history" not in data and "usage" in data:
            data["usage_history"] = data["usage"]
        # -----------------------------------

        usage_all = data.get("usage", {})

        # ----------- VALIDATION -----------
        if user_id not in usage_all:
            return jsonify({"error": "User not found"}), 404

        user_usage = usage_all[user_id]

        if not user_usage:
            return jsonify({"error": "No usage history for this user"}), 400
        # ----------------------------------

        daily_values = [
            rec["units"] if isinstance(rec, dict) else rec
            for rec in user_usage.values()
        ]

        predicted = predict_next_usage(daily_values)

        return jsonify({
            "user_id": user_id,
            "predicted_usage": predicted
        }), 200

    except Exception as e:
        logging.error(f"[ERROR] predict_next_usage: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.get("/rewards/<user_id>")
def get_rewards(user_id):
    try:
        logging.info(f"🔥 /rewards/{user_id} called")

        db = read_db()
        rewards = db.get("rewards", {})
        
        user_points = rewards.get(user_id, 0)

        return jsonify({
            "user_id": user_id,
            "reward_points": user_points
        }), 200

    except Exception as e:
        logging.error(f"[ERROR] get_rewards: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@app.post("/rewards/claim")
def claim_rewards():
    try:
        data = request.get_json() or {}
        user_id = data.get("user_id")

        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        db = read_db()
        rewards = db.get("rewards", {})

        current = rewards.get(user_id, 0)

        # reset reward points after claim
        rewards[user_id] = 0
        db["rewards"] = rewards
        write_db(db)

        return jsonify({
            "message": "Rewards claimed successfully",
            "claimed_points": current
        }), 200

    except Exception as e:
        logging.error(f"[ERROR] claim_rewards: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------
# RUN APP
# ---------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

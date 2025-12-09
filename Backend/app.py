from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime, timezone
from db.mongo import db
from bson import ObjectId


try:
    # these are your real modules in backend/ML/*.py
    from ML.ai_energy_coach import get_energy_suggestion
    from ML.predict_service import predict_next_usage
    from ML.reward_system import calculate_rewards
    

    logging.info("ML modules loaded successfully.")
except Exception as e:
    logging.warning(f"ML modules not available or failed to import: {e}. Using fallback stubs.")

from controllers.alert_rewards_controller import get_alerts_and_rewards
from controllers.dashboard_controller import get_user_status

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
#plan add (admin only)
# ---------------------------------------------
@app.post("/plans/add")
def add_plan():
    body = request.get_json() or {}

    plan_id = int(body.get("plan_id"))
    name = body.get("plan_name")
    limit = int(body.get("limit"))
    price = float(body.get("price"))

    db.plans.insert_one({
        "plan_id": plan_id,
        "plan_name": name,
        "limit": limit,
        "price": price
    })

    return jsonify({"message": "Plan added successfully"}), 201

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
        
        try:
            plan_units = int(plan_units)
        except:
            return jsonify({"error": "plan_units must be integer"}), 400

        try:
            price = float(price)
        except:
            return jsonify({"error": "price must be a number"}), 400

        # ---------- SAVE TO MONGO ----------
        existing = db.subscriptions.find_one({"user_id": user_id})

        if existing:
            db.subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {
                    "plan_name": plan_name,
                    "plan_units": plan_units,
                    "price": price,
                    "start_ts": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            db.subscriptions.insert_one({
                "user_id": user_id,
                "plan_name": plan_name,
                "plan_units": plan_units,
                "price": price,
                "start_ts": datetime.now(timezone.utc).isoformat()
            })
        # Auto-create user if not exists
        existing_user = db.users.find_one({"user_id": user_id})
        if not existing_user:
            db.users.insert_one({
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat()
           })

        return jsonify({
            "message": "Subscribed successfully",
            "subscription": {
                "user_id": user_id,
                "plan_name": plan_name,
                "plan_units": plan_units,
                "price": price
            }
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

        # ---- MONGODB SAVE OPERATION ----
        # Check if record already exists
        existing = db.usage.find_one({"user_id": user_id, "date": date})

        if existing:
            new_units = float(existing["units"]) + units
            db.usage.update_one(
            {"user_id": user_id, "date": date},
            {"$set": {
            "units": new_units,
            "updated_at": datetime.utcnow().isoformat()
        }}
        )
        else:
            db.usage.insert_one({
                "user_id": user_id,
                  "date": date,
                    "units": units,
                    "created_at": datetime.utcnow().isoformat()
      })
          # Auto-create user if not exists
        existing_user = db.users.find_one({"user_id": user_id})
        if not existing_user:
            db.users.insert_one({
            "user_id": user_id,
             "created_at": datetime.utcnow().isoformat()
        })
   

        return jsonify({"message": "Usage updated"}), 200

    except Exception as e:
        logging.error(f"[ERROR] /usage/add failed: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
 
# -------------------------------
# HELPER: get plan by plan_id
# -------------------------------
def get_plan_by_id(plan_id):
    try:
        # plan_id might be numeric or string, keep consistent
        plan = db.plans.find_one({"plan_id": int(plan_id)}, {"_id": 0})
        return plan
    except Exception:
        return None
# -------------------------
# ALERTS + REWARDS ROUTE
# -------------------------
@app.get("/alerts-rewards/<user_id>")
def alerts_rewards_route(user_id):
    return get_alerts_and_rewards(user_id)


# -------------------------
# DASHBOARD ROUTE
# -------------------------
@app.get("/dashboard/<user_id>")
def dashboard_route(user_id):
    return get_user_status(user_id)

# ---------------------------------------------
# POST /plan/subscribe  (subscribe via plan_id)
# Input: {"user_id": "user1", "plan_id": 2}
# ---------------------------------------------
@app.post("/plan/subscribe")
def plan_subscribe():
    try:
        body = request.get_json() or {}
        user_id = body.get("user_id")

        # frontend sends plan_name (NOT plan_id)
        plan_id = body.get("plan_id")
        plan_name = body.get("plan_name")

        # must have user_id
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        # 🔥 Case 1: frontend sends plan_name (Standard, Basic, Premium)
        if plan_name and plan_id is None:
            plan_doc = db.plans.find_one({"plan_name": plan_name}, {"_id": 0})
            if not plan_doc:
                return jsonify({"error": "Plan not found"}), 404
            plan = plan_doc
            plan_id = plan_doc.get("plan_id")

        # 🔥 Case 2: backend call sends plan_id
        elif plan_id is not None:
            plan = get_plan_by_id(plan_id)
            if not plan:
                return jsonify({"error": "Plan not found"}), 404

        else:
            # neither plan_name nor plan_id provided
            return jsonify({"error": "Either plan_name or plan_id is required"}), 400

        # ---------- UPSERT SUBSCRIPTION ----------
        db.subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "plan_id": plan.get("plan_id"),
                "plan_name": plan.get("plan_name"),
                "plan_units": int(plan.get("limit", 0)),
                "price": float(plan.get("price", 0.0)),
                "start_ts": datetime.utcnow().isoformat(),
                "status": "active"
            }},
            upsert=True
        )

        return jsonify({
            "message": "Subscribed to plan",
            "plan": plan
        }), 201

    except Exception as e:
        logging.error(f"[ERROR] /plan/subscribe: {e}")
        return jsonify({"error": "Internal server error"}), 500


##---------------------------------------
## Get usage
##---------------------------------------
@app.get("/usage/get/<user_id>")
def usage_get(user_id):
    try:
        today = datetime.utcnow().date()
        month_prefix = today.strftime("%Y-%m")  # example: "2025-12"

        # FETCH only current month usage
        usage_records = list(db.usage.find(
            {"user_id": user_id, "date": {"$regex": f"^{month_prefix}"}},
            {"_id": 0}
        ))

        # DEFAULT VALUES
        today_used = 0.0
        monthly_used = 0.0

        # CALCULATE monthly + today usage
        for rec in usage_records:
            units = float(rec.get("units", 0))
            monthly_used += units

            if rec["date"] == today.isoformat():
                today_used = units

        # GET subscription details
        sub = db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})

        if not sub:
            # If no subscription → return limit = 0
            return jsonify({
                "user_id": user_id,
                "today": today_used,
                "monthly": monthly_used,
                "limit": 0,
                "remaining": 0,
                "warning": "No subscription found for this user"
            }), 200

        plan_limit = int(sub.get("plan_units", 0))

        # CALCULATE remaining units
        remaining = max(plan_limit - monthly_used, 0)

        return jsonify({
            "user_id": user_id,
            "today": round(today_used, 2),
            "monthly": round(monthly_used, 2),
            "limit": plan_limit,
            "remaining": round(remaining, 2)
        }), 200

    except Exception as e:
        logging.error(f"[ERROR] /usage/get failed: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# -----------------------------------------------------
# AUTO-CREATE MONGO INDEXES (runs once when server starts)
# -----------------------------------------------------
try:
    db.users.create_index("user_id", unique=True)
    db.usage.create_index([("user_id", 1), ("date", 1)])
    db.subscriptions.create_index("user_id", unique=True)
    db.rewards.create_index("user_id", unique=True)
    print("Indexes created successfully")
except Exception as e:
    print("Index creation error:", e)

# -------------------------------------------------------------
# TASK 6 — ADMIN ANALYTICS API
# -------------------------------------------------------------
@app.route("/admin/analytics", methods=["GET"])
def admin_analytics():
    try:
        logging.info("🔥 /admin/analytics called")
        logging.info("[ADMIN] Analytics request")

        # ----------------------------------------------------
        # 📌 STEP 1: FETCH DATA FROM MONGODB (replace JSON)
        # ----------------------------------------------------
        
        # Fetch subscriptions
        subs_list = list(db.subscriptions.find({}, {"_id": 0}))

        # Convert subscriptions into old JSON structure format:
        subs = {sub["user_id"]: sub for sub in subs_list}

        # Fetch usage
        usage_records = list(db.usage.find({}, {"_id": 0}))

        # Convert usage into old nested structure:
        # usage_all = { user_id: { date: {"units": X} } }
        usage_all = {}
        for rec in usage_records:
            user = rec["user_id"]
            date = rec["date"]
            units = rec["units"]

            if user not in usage_all:
                usage_all[user] = {}

            usage_all[user][date] = {"units": units}

        # ----------------------------------------------------
        # 📌 STEP 2: SAME ANALYTICS LOGIC (unchanged)
        # ----------------------------------------------------
        total_users = len(subs)

        # Total units + daily totals for peak day
        total_units = 0
        day_totals = {}

        for user, days in usage_all.items():
            for date, rec in days.items():
                units = float(rec.get("units", 0))
                total_units += units
                day_totals[date] = day_totals.get(date, 0) + units

        # Highest usage user
        highest_user = None
        highest_usage = 0

        for user, days in usage_all.items():
            user_sum = sum(float(rec.get("units", 0)) for rec in days.values())
            if user_sum > highest_usage:
                highest_usage = user_sum
                highest_user = user

        # Average daily usage & peak day
        if day_totals:
            avg_daily = round(total_units / len(day_totals), 2)
            peak_day = max(day_totals, key=day_totals.get)
        else:
            avg_daily = 0
            peak_day = None

        # Plan distribution
        plan_distribution = {}
        for user, sub in subs.items():
            plan = sub.get("plan_name", "Unknown")
            plan_distribution[plan] = plan_distribution.get(plan, 0) + 1

        # ----------------------------------------------------
        # 📌 STEP 3: RESPONSE (unchanged)
        # ----------------------------------------------------
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
##-------------------------------------------------------------------
## user and reward calculation fixed version
##-------------------------------------------------------------------
@app.route("/status/<user_id>", methods=["GET"])
def status(user_id):
    try:
        logging.info(f"🔥 /status/{user_id} called")
        logging.info(f"[STATUS] Request for user: {user_id}")

        # ---------------- MONGO FETCH -------------------

        # 1️⃣ Get subscription for user
        user_sub = db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
        if not user_sub:
            return jsonify({"error": "Subscription not found for user"}), 404

        # 2️⃣ Get usage records for user
        today = datetime.utcnow().date()
        month_prefix = today.strftime("%Y-%m")

        usage_records = list(db.usage.find(
        {"user_id": user_id, "date": {"$regex": f"^{month_prefix}"}},
         {"_id": 0}
        ))


        # Rebuild old JSON structure
        user_usage = {}
        for rec in usage_records:
            user_usage[rec["date"]] = {"units": rec["units"]}

        # ---------------- CALCULATIONS (unchanged) -------------------

        # Month used
        month_used = 0.0
        for rec in user_usage.values():
            month_used += float(rec.get("units", 0.0))

        # Prediction
        if user_usage:
            values = [float(rec["units"]) for rec in user_usage.values()]
            avg_daily = sum(values) / len(values)
            predicted_units = round(avg_daily * 30, 2)
        else:
            predicted_units = 0.0

        # Today
        today_key = datetime.utcnow().date().isoformat()
        today_rec = user_usage.get(today_key, {"units": 0})
        today_used = float(today_rec.get("units", 0))

        # Plan details
        plan_limit = int(user_sub.get("plan_units", 0))
        plan_name = user_sub.get("plan_name")
        progress_percent = round((month_used / plan_limit) * 100, 2) if plan_limit else 0

        # ---------------- REWARD CALCULATION -------------------

        reward_points = calculate_rewards(month_used, plan_limit)

        # Save reward points to Mongo
        db.rewards.update_one(
            {"user_id": user_id},
            {"$set": {"reward_points": reward_points}},
            upsert=True
        )
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

    # ---- FETCH FROM MONGO ----
    usage_records = list(db.usage.find({"user_id": user_id}, {"_id": 0}))
    user_usage = {}
    for rec in usage_records:
        date = rec["date"]
        units = rec["units"]
        user_usage[date] = {"units": units}
    return jsonify({"history": user_usage}), 200

# ---------------------------------------------
# TASK 4 — AI COACHING API
# --------------------------------------------- 
@app.route("/coach/<user_id>", methods=["GET"])
def coach(user_id):
    try:
        logging.info(f"🔥 /coach/{user_id} called")
        logging.info(f"[COACH] Request for user: {user_id}")

        # ---- FETCH USAGE FROM MONGO ----
        usage_records = list(db.usage.find({"user_id": user_id}, {"_id": 0}))

        # Convert into old structure: { "date": {"units": X} }
        user_usage = {}
        for rec in usage_records:
            date = rec["date"]
            units = rec["units"]
            user_usage[date] = {"units": units}

        # ---------------- LOGIC (UNCHANGED) ----------------

        if not user_usage:
            return jsonify({
                "suggestions": ["No usage data found. Start tracking to get recommendations."]
            }), 200

        total = 0
        days = 0

        for rec in user_usage.values():
            total += float(rec.get("units", 0.0))
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
    logging.info("🔥 /subscription called")
    logging.info(f"[GET SUBSCRIPTION] Request for user: {user_id}")

    # Fetch subscription from MongoDB
    sub = db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})

    if not sub:
        return jsonify({"error": "Subscription not found"}), 404

    return jsonify({"subscription": sub}), 200

# ---------------------------------------------
# UPDATE SUBSCRIPTION  (TASK 3C VALIDATION)
# ---------------------------------------------
@app.route("/update/<user_id>", methods=["POST"])
def update_subscription(user_id):
    logging.info(f"🔥 /update/{user_id} called")
    logging.info(f"[UPDATE] Updating subscription for user: {user_id}")

    # ---- FETCH EXISTING SUBSCRIPTION FROM MONGO ----
    existing = db.subscriptions.find_one({"user_id": user_id})
    if not existing:
        return jsonify({"error": "User not subscribed"}), 404

    incoming = request.get_json() or request.form

    # Prepare update fields
    update_fields = {}

    # -------- VALIDATE & ADD TO UPDATE FIELDS --------

    if "plan_name" in incoming:
        if not incoming["plan_name"]:
            return jsonify({"error": "plan_name cannot be empty"}), 400
        update_fields["plan_name"] = incoming["plan_name"]

    if "plan_units" in incoming:
        try:
            u = int(incoming["plan_units"])
            if u <= 0:
                return jsonify({"error": "plan_units must be > 0"}), 400
            update_fields["plan_units"] = u
        except:
            return jsonify({"error": "plan_units must be an integer"}), 400

    if "price" in incoming:
        try:
            p = float(incoming["price"])
            if p < 0:
                return jsonify({"error": "price cannot be negative"}), 400
            update_fields["price"] = p
        except:
            return jsonify({"error": "price must be a number"}), 400

    # ---- UPDATE IN MONGODB ----
    if update_fields:
        db.subscriptions.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )

    # Fetch updated data to return clean response (without _id)
    updated = db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})

    return jsonify({
        "message": "Subscription updated",
        "updated_data": updated
    }), 200

# -------------------------------------------------------------
# TASK 5 — ADVANCED PREDICTION API
# -------------------------------------------------------------
@app.get("/predict-advanced/<user_id>")
def predict_advanced(user_id):
    try:
        logging.info(f"[PREDICT-ADVANCED] Request for user: {user_id}")

        # ---- FETCH USAGE FROM MONGO ----
        usage_records = list(db.usage.find({"user_id": user_id}, {"_id": 0}))

        # rebuild old dict format: { "date": {"units": x} }
        usage = { rec["date"]: {"units": rec["units"]} for rec in usage_records }

        # convert dict → list of numbers
        daily_values = [rec["units"] for rec in usage.values()]

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
@app.get("/alerts/<user_id>")
def alerts(user_id):
    try:
        logging.info(f"🔥 /alerts/{user_id} called")

        # ---- FETCH SUBSCRIPTION ----
        sub = db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
        if not sub:
            return jsonify({"alerts": ["User not subscribed"]}), 200

        plan_limit = float(sub.get("plan_units", 0))

        # ---- FETCH ONLY CURRENT MONTH USAGE ----
        today = datetime.utcnow().date()
        month_prefix = today.strftime("%Y-%m")

        usage_records = list(db.usage.find(
            {"user_id": user_id, "date": {"$regex": f"^{month_prefix}"}},
            {"_id": 0}
        ))

        if not usage_records:
            return jsonify({"alerts": ["No usage data available"]}), 200

        # convert into date-sorted dict
        usage = {rec["date"]: float(rec["units"]) for rec in usage_records}
        dates = sorted(usage.keys())

        # ---- monthly usage ----
        monthly_used = sum(usage.values())

        alerts = []

        # ---- 80% warning ----
        if plan_limit > 0:
            if monthly_used >= plan_limit:
                alerts.append("🚨 You exceeded your monthly usage limit!")
            elif monthly_used >= 0.8 * plan_limit:
                alerts.append("⚠️ You have used more than 80% of your monthly plan.")

        # ---- Prediction alert ----
        daily_values = list(usage.values())
        avg_daily = sum(daily_values) / len(daily_values)
        predicted_month = avg_daily * 30

        if predicted_month > plan_limit:
            alerts.append("📈 Your predicted usage may exceed your subscription limit.")

        # ---- Spike detection ----
        if len(dates) >= 2:
            today_date = dates[-1]
            yesterday_date = dates[-2]

            today_units = usage[today_date]
            yesterday_units = usage[yesterday_date]

            if today_units > yesterday_units:
                alerts.append("🔥 Today's usage is higher than yesterday.")

            if yesterday_units > 0 and today_units > 2 * yesterday_units:
                alerts.append("⚡ Sudden usage spike detected.")

        # ---- Default ----
        if not alerts:
            alerts = ["Everything looks normal. 👍"]

        return jsonify({"alerts": alerts}), 200

    except Exception as e:
        logging.error(f"[ERROR] alerts: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# ---------------------------------------------
# TASK 8 — INTEGRATION WITH ML MODULES  
# ---------------------------------------------
@app.get("/api/get-energy-suggestion")
def api_energy_suggestion():
    try:
        user_id = request.args.get("user_id", "user1")

        # ---- FETCH SUBSCRIPTION FROM MONGO ----
        sub = db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
        if not sub:
            return jsonify({"error": "User subscription not found"}), 404

        # ---- FETCH USAGE FROM MONGO ----
        usage_records = list(db.usage.find({"user_id": user_id}, {"_id": 0}))

        if not usage_records:
            return jsonify({"error": "No usage history for this user"}), 400

        # ---- SORT USAGE BY DATE ----
        usage_records.sort(key=lambda x: x["date"])

        # ---- BUILD numeric_usage FOR ML MODEL ----
        numeric_usage = {
            idx: rec["units"]
            for idx, rec in enumerate(usage_records)
        }

        plan_units = sub.get("plan_units", 100)

        # ---- CALL ML MODULE ----
        suggestion = get_energy_suggestion(numeric_usage, plan_units)

        return jsonify({
            "user_id": user_id,
            "suggestion": suggestion
        })

    except Exception as e:
        logging.error(f"[ERROR] get-energy-suggestion: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

  # ---------------------------------------------
# TASK 9 — PREDICT NEXT USAGE VIA ML MODEL      
# ---------------------------------------------  
@app.get("/api/predict_next_usage")
def api_predict_usage():
    try:
        user_id = request.args.get("user_id", "user1")

        # ---- FETCH USAGE FROM MONGO ----
        usage_records = list(db.usage.find({"user_id": user_id}, {"_id": 0}))

        if not usage_records:
            return jsonify({"error": "No usage history for this user"}), 400

        # ---- SORT BY DATE ----
        usage_records.sort(key=lambda x: x["date"])

        # ---- BUILD LIST OF UNITS ----
        daily_values = [rec["units"] for rec in usage_records]

        # ---- CALL ML MODEL ----
        predicted = predict_next_usage(daily_values)

        return jsonify({
            "user_id": user_id,
            "predicted_usage": predicted
        }), 200

    except Exception as e:
        logging.error(f"[ERROR] predict_next_usage: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# ---------------------------------------------
# TASK 10 — REWARD POINTS SYSTEM
@app.get("/rewards/<user_id>")
def get_rewards(user_id):
    try:
        logging.info(f"🔥 /rewards/{user_id} called")

        # ---- FETCH REWARD FROM MONGO ----
        reward_doc = db.rewards.find_one({"user_id": user_id}, {"_id": 0})

        user_points = reward_doc["reward_points"] if reward_doc else 0

        return jsonify({
            "user_id": user_id,
            "reward_points": user_points
        }), 200

    except Exception as e:
        logging.error(f"[ERROR] get_rewards: {str(e)}")
        return jsonify({"error": str(e)}), 500
# ---------------------------------------------
## CLAIM REWARDS
# ---------------------------------------------
@app.post("/rewards/claim")
def claim_rewards():
    try:
        data = request.get_json() or {}
        user_id = data.get("user_id")

        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        # ---- FETCH USER REWARD FROM MONGO ----
        reward_doc = db.rewards.find_one({"user_id": user_id}, {"_id": 0})
        current = reward_doc["reward_points"] if reward_doc else 0

        # ---- RESET REWARD POINTS TO 0 ----
        db.rewards.update_one(
            {"user_id": user_id},
            {"$set": {"reward_points": 0}},
            upsert=True
        )

        return jsonify({
            "message": "Rewards claimed successfully",
            "claimed_points": current
        }), 200

    except Exception as e:
        logging.error(f"[ERROR] claim_rewards: {str(e)}")
        return jsonify({"error": str(e)}), 500
# ---------------------------------------------
  ##register user  
@app.post("/register")
def register_user():
    try:
        body = request.get_json() or {}

        user_id = body.get("user_id")
        name = body.get("name")
        email = body.get("email")

        if not user_id or not email:
            return jsonify({"error": "user_id and email are required"}), 400

        # check if user exists
        existing = db.users.find_one({"user_id": user_id})
        if existing:
            return jsonify({"error": "User already exists"}), 409

        db.users.insert_one({
            "user_id": user_id,
            "name": name,
            "email": email,
            "created_at": datetime.utcnow().isoformat()
        })

        return jsonify({"message": "User registered successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.get("/users")
def get_all_users():
    users = list(db.users.find({}, {"_id": 0}))
    return jsonify({"users": users}), 200

# ---------------------------------------------
# RUN APP
# ---------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

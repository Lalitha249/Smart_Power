from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from filelock import FileLock
from pathlib import Path
from datetime import datetime, timezone

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
# ADD USAGE  (with validation)
# ---------------------------------------------
@app.route("/usage", methods=["POST"])
def add_usage():
    print("🔥 /usage called")
    data = request.get_json() or {}

    user_id = data.get("user_id")
    units = data.get("units")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    # VALIDATION for units
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

    today_key = datetime.now().date().isoformat()

    old_val = usage_all[user_id].get(today_key, 0)

    if isinstance(old_val, dict):
        usage_all[user_id][today_key]["units"] = float(old_val.get("units", 0.0)) + units
    else:
        usage_all[user_id][today_key] = {"units": float(old_val) + units}

    db["usage"] = usage_all
    write_db(db)

    return jsonify({"message": "Usage updated"}), 200

# ---------------------------------------------
# STATUS
# ---------------------------------------------
@app.route("/status/<user_id>", methods=["GET"])
def status(user_id):
    print(f"🔥 /status/{user_id} called")
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
    db = read_db()
    usage_all = db.get("usage", {})
    user_usage = usage_all.get(user_id, {})
    return jsonify({"history": user_usage}), 200

# ---------------------------------------------
# TASK 2 — GET SUBSCRIPTION DETAILS
# ---------------------------------------------
@app.route("/subscription/<user_id>", methods=["GET"])
def get_subscription(user_id):
    print(f"🔥 /subscription/{user_id} called")
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

# ---------------------------------------------
# RUN APP
# ---------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


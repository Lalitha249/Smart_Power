# app.py - SmartPower Backend (FINAL UPDATED VERSION)

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from filelock import FileLock
from pathlib import Path
from datetime import datetime, timezone

# ----------------------------------------------------
# DATABASE PATH
# ----------------------------------------------------
DB_PATH = Path("db.json")
LOCK_PATH = str(DB_PATH) + ".lock"

app = Flask(__name__)
CORS(app)

# ----------------------------------------------------
# DB HELPERS
# ----------------------------------------------------
def read_db():
    if not DB_PATH.exists():
        return {"users": [], "subscriptions": {}, "usage": {}}
    with FileLock(LOCK_PATH):
        return json.loads(DB_PATH.read_text(encoding="utf-8"))

def write_db(data):
    with FileLock(LOCK_PATH):
        DB_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")

# ----------------------------------------------------
# ROOT
# ----------------------------------------------------
@app.route("/")
def root():
    return jsonify({"status": "SmartPower backend running"}), 200

# ----------------------------------------------------
# PREDICT ENDPOINT (simple stub)
# ----------------------------------------------------
@app.route("/predict", methods=["POST"])
def predict_stub():
    body = request.get_json() or {}
    history = body.get("history", [])
    pred = float(sum(history) / len(history)) if history else 0.0
    return jsonify({
        "predicted_next_month_units": round(pred * 30, 3)
    }), 200

# ----------------------------------------------------
# SUBSCRIBE
# ----------------------------------------------------
@app.route("/subscribe", methods=["POST"])
def subscribe():
    data = request.get_json() or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    db = read_db()
    subs = db.get("subscriptions", {})

    subs[user_id] = {
        "plan_name": data.get("plan_name", "Basic"),
        "plan_units": int(data.get("plan_units", 100)),
        "price": float(data.get("price", 0.0)),
        "start_ts": datetime.now(timezone.utc).isoformat()
    }

    db["subscriptions"] = subs
    write_db(db)

    return jsonify({
        "message": "subscribed",
        "subscription": subs[user_id]
    }), 201

# ----------------------------------------------------
# ADD DAILY USAGE
# ----------------------------------------------------
@app.route("/usage", methods=["POST"])
def add_usage():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    units = float(data.get("units", 0.0))

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    db = read_db()
    usage_all = db.get("usage", {})

    if user_id not in usage_all:
        usage_all[user_id] = {}

    today_key = datetime.now().date().isoformat()

    # supports both int & dict format
    old_val = usage_all[user_id].get(today_key, 0)

    if isinstance(old_val, dict):
        usage_all[user_id][today_key]["units"] = float(old_val.get("units", 0.0)) + units
    else:
        usage_all[user_id][today_key] = {"units": float(old_val) + units}

    db["usage"] = usage_all
    write_db(db)

    return jsonify({"message": "Usage updated"}), 200

# ----------------------------------------------------
# STATUS API
# ----------------------------------------------------
@app.route("/status/<user_id>", methods=["GET"])
def status(user_id):

    db = read_db()
    subscriptions = db.get("subscriptions", {})
    usage_all = db.get("usage", {})

    user_sub = subscriptions.get(user_id, {})
    user_usage = usage_all.get(user_id, {})

    # ---------- MONTH USED ----------
    month_used = 0.0
    for rec in user_usage.values():
        if isinstance(rec, dict):
            month_used += float(rec.get("units", 0.0))
        else:
            month_used += float(rec)

    # ---------- PREDICTED MONTHLY USAGE ----------
    if user_usage:
        daily_values = []
        for rec in user_usage.values():
            if isinstance(rec, dict):
                daily_values.append(float(rec.get("units", 0.0)))
            else:
                daily_values.append(float(rec))
        avg_daily = sum(daily_values) / len(daily_values)
        predicted_units = round(avg_daily * 30, 2)
    else:
        predicted_units = 0.0

    # ---------- TODAY'S USAGE ----------
    today_key = datetime.now().date().isoformat()
    today_rec = user_usage.get(today_key, 0.0)
    today_used = float(today_rec.get("units", 0.0)) if isinstance(today_rec, dict) else float(today_rec)

    # ---------- PLAN ----------
    plan_limit = int(user_sub.get("plan_units", 0))
    plan_name = user_sub.get("plan_name")

    progress_percent = round((month_used / plan_limit) * 100, 2) if plan_limit else 0.0

    return jsonify({
        "user_id": user_id,
        "today_used": today_used,
        "month_used": month_used,
        "predicted_units": predicted_units,
        "plan_limit": plan_limit,
        "plan_name": plan_name,
        "progress_percent": progress_percent
    }), 200

# ----------------------------------------------------
# UPDATE SUBSCRIPTION / PLAN / STATUS
# ----------------------------------------------------
@app.route("/update/<user_id>", methods=["POST"])
def update_subscription(user_id):
    db = read_db()
    subs = db.get("subscriptions", {})

    if user_id not in subs:
        return jsonify({"error": "User not subscribed"}), 404

    incoming = request.get_json() or request.form

    # Update only provided fields
    if "plan_name" in incoming:
        subs[user_id]["plan_name"] = incoming.get("plan_name")

    if "plan_units" in incoming:
        subs[user_id]["plan_units"] = int(incoming.get("plan_units"))

    if "price" in incoming:
        subs[user_id]["price"] = float(incoming.get("price"))

    if "status" in incoming:
        subs[user_id]["status"] = incoming.get("status")

    # Save
    db["subscriptions"] = subs
    write_db(db)

    return jsonify({
        "message": "Subscription updated",
        "user_id": user_id,
        "updated_data": subs[user_id]
    }), 200

# ----------------------------------------------------
# RUN APP
# ----------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

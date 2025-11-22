from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from filelock import FileLock
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path("db.json")
LOCK_PATH = str(DB_PATH) + ".lock"

app = Flask(__name__)
CORS(app)

def read_db():
    if not DB_PATH.exists():
        return {"users": [], "subscriptions": {}, "usage": {}}
    with FileLock(LOCK_PATH):
        return json.loads(DB_PATH.read_text(encoding="utf-8"))

def write_db(data):
    with FileLock(LOCK_PATH):
        DB_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")

@app.route("/")
def root():
    return jsonify({"status": "SmartPower backend running"}), 200

@app.route("/predict", methods=["POST"])
def predict_stub():
    body = request.get_json() or {}
    history = body.get("history", [])
    pred = float(sum(history)/len(history)) if history else 0.0
    if history:
        return jsonify({"predicted_next_month_units": round(pred * 30, 3)}), 200
    return jsonify({"predicted_next_month_units": 0.0}), 200

@app.route("/subscribe", methods=["POST"])
def subscribe():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error":"user_id is required"}), 400

    db = read_db()
    subs = db.get("subscriptions", {})

    subs[user_id] = {
        "plan_name": data.get("plan_name", "basic"),
        "plan_units": int(data.get("plan_units", 100)),
        "price": float(data.get("price", 0.0)),
        "start_ts": datetime.now(timezone.utc).isoformat()
    }
    db["subscriptions"] = subs
    write_db(db)
    return jsonify({"message":"subscribed","subscription":subs[user_id]}), 201


# -------------------------------------------------------------------------
# ADD THIS NEW ENDPOINT HERE
# -------------------------------------------------------------------------
@app.route("/usage", methods=["POST"])
def add_usage():
    """
    Expects JSON:
       {"user_id":"user1","units": 1.25}
    Adds today's usage for that user.
    Stores as:
       usage[user_id][YYYY-MM-DD] = {"units": X}
    """
    data = request.get_json() or {}
    user_id = data.get("user_id")
    units = data.get("units", 0.0)

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    db = read_db()
    usage_all = db.get("usage", {})

    if user_id not in usage_all:
        usage_all[user_id] = {}

    today_key = datetime.now().date().isoformat()

    # Support both old format (int) and new dict format
    if today_key in usage_all[user_id]:
        old_val = usage_all[user_id][today_key]
        if isinstance(old_val, dict):
            usage_all[user_id][today_key]["units"] = float(old_val.get("units", 0.0)) + float(units)
        else:
            usage_all[user_id][today_key] = {"units": float(old_val) + float(units)}
    else:
        usage_all[user_id][today_key] = {"units": float(units)}

    db["usage"] = usage_all
    write_db(db)

    return jsonify({"message": "Usage updated"}), 200
# --------------------------------------------------------------


# -------------------------------------------------------------------------
# UPDATED STATUS() FUNCTION (FIXED FOR INT + DICT USAGE FORMATS)
# -------------------------------------------------------------------------
@app.route("/status/<user_id>", methods=["GET"])
def status(user_id):
    db = read_db()
    subscriptions = db.get("subscriptions", {})
    usage_all = db.get("usage", {})

    user_sub = subscriptions.get(user_id, {})
    user_usage = usage_all.get(user_id, {})

    # compute month_used (supports both int and dict)
    month_used = 0.0
    for day, rec in user_usage.items():
        if isinstance(rec, dict):
            month_used += float(rec.get("units", 0.0))
        else:
            month_used += float(rec)

    # predicted monthly usage
    if user_usage:
        daily_values = []
        for rec in user_usage.values():
            if isinstance(rec, dict):
                daily_values.append(float(rec.get("units", 0.0)))
            else:
                daily_values.append(float(rec))
        avg_daily = sum(daily_values) / len(daily_values)
        predicted_units = round(avg_daily * 30, 3)
    else:
        predicted_units = 0.0

    # today's usage
    today_key = datetime.now().date().isoformat()
    today_rec = user_usage.get(today_key, 0.0)
    if isinstance(today_rec, dict):
        today_used = float(today_rec.get("units", 0.0))
    else:
        today_used = float(today_rec)

    plan_limit = int(user_sub.get("plan_units", 0)) if user_sub else 0
    progress_percent = round((month_used / plan_limit) * 100, 2) if plan_limit else 0.0

    result = {
        "user_id": user_id,
        "today_used": today_used,
        "month_used": round(month_used, 3),
        "predicted_units": predicted_units,
        "plan_limit": plan_limit,
        "plan_name": user_sub.get("plan_name"),
        "progress_percent": progress_percent
    }
    return jsonify(result), 200

# -------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timezone

# Day 3 MVC imports
from utils.helper import read_db, write_db
from controllers.subscription_controller import handle_subscription
from controllers.dashboard_controller import get_user_status

app = Flask(__name__)
CORS(app)

@app.route("/")
def root():
    return jsonify({"status": "SmartPower backend running"}), 200


# -----------------------------
# PREDICT (same as before)
# -----------------------------
@app.route("/api/predict", methods=["POST"])
def predict_stub():
    body = request.get_json() or {}
    history = body.get("history", [])
    pred = float(sum(history) / len(history)) if history else 0.0
    if history:
        return jsonify({"predicted_next_month_units": round(pred * 30, 3)}), 200
    return jsonify({"predicted_next_month_units": 0.0}), 200


# -----------------------------
# DAY 3 – SUBSCRIBE (controller)
# -----------------------------
@app.route("/api/subscribe", methods=["POST"])
def subscribe():
    return handle_subscription()


# -----------------------------
# DAY 2 – USAGE (same)
# -----------------------------
@app.route("/api/usage", methods=["POST"])
def add_usage():
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

    old_val = usage_all[user_id].get(today_key, 0)

    if isinstance(old_val, dict):
        usage_all[user_id][today_key]["units"] = float(old_val.get("units", 0.0)) + float(units)
    else:
        usage_all[user_id][today_key] = {"units": float(old_val) + float(units)}

    db["usage"] = usage_all
    write_db(db)

    return jsonify({"message": "Usage updated"}), 200


# -----------------------------
# DAY 3 – STATUS (controller)
# -----------------------------
@app.route("/api/status/<user_id>", methods=["GET"])
def status(user_id):
    return get_user_status(user_id)


# -----------------------------
# NEW – API FOR DASHBOARD
# -----------------------------
@app.route("/api/dashboard/<user_id>", methods=["GET"])
def dashboard(user_id):
    return get_user_status(user_id)


# -----------------------------
# NEW – PLAN LIST API
# -----------------------------
@app.route("/api/plans", methods=["GET"])
def get_plans():
    return jsonify({
        "plans": [
            {"name": "Basic", "units": 100, "price": 199},
            {"name": "Standard", "units": 200, "price": 399},
            {"name": "Premium", "units": 500, "price": 699}
        ]
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

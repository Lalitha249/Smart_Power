from flask import request, jsonify
from db.mongo import db
from datetime import datetime, timezone

def handle_subscription():
    data = request.get_json() or {}
    
    user_id = data.get("user_id")
    plan_name = data.get("plan_name")
    plan_units = data.get("plan_units")
    price = data.get("price")

    # ----------------- VALIDATION -----------------
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    if not plan_name:
        return jsonify({"error": "plan_name is required"}), 400

    try:
        plan_units = int(plan_units or 100)
    except:
        return jsonify({"error": "plan_units must be an integer"}), 400

    try:
        price = float(price or 0.0)
    except:
        return jsonify({"error": "price must be a number"}), 400

    # ----------------- SAVE TO MONGO -----------------
    subscription_data = {
        "user_id": user_id,
        "plan_name": plan_name,
        "plan_units": plan_units,
        "price": price,
        "start_ts": datetime.now(timezone.utc).isoformat()
    }

    db.subscriptions.update_one(
        {"user_id": user_id},         # match user
        {"$set": subscription_data},  # update fields
        upsert=True                   # insert if not exists
    )

    # ---------------- RESPONSE ----------------
    return jsonify({
        "message": "Subscribed successfully",
        "subscription": subscription_data
    }), 201

from flask import request, jsonify
from utils.helper import read_db, write_db
from datetime import datetime, timezone

def handle_subscription():
    data = request.get_json() or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

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

    return jsonify({"message": "subscribed", "subscription": subs[user_id]}), 201

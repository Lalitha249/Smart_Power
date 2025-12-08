from flask import jsonify
from db.mongo import db
from datetime import datetime
from ML.predict_service import predict_next_usage
from ML.ai_energy_coach import get_energy_suggestion
from ML.reward_system import calculate_rewards


def get_user_status(user_id):
    # -----------------------------
    # 1️⃣ Fetch subscription from Mongo
    # -----------------------------
    user_sub = db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
    if not user_sub:
        return jsonify({"error": "Subscription not found"}), 404

    # -----------------------------
    # 2️⃣ Fetch usage records from Mongo
    # -----------------------------
    usage_records = list(db.usage.find({"user_id": user_id}, {"_id": 0}))

    # Convert to old dict format: {date: {"units": x}}
    user_usage = {}
    for rec in usage_records:
        user_usage[rec["date"]] = {"units": rec["units"]}

    # -----------------------------
    # 3️⃣ Calculate month_used
    # -----------------------------
    month_used = 0.0
    for rec in user_usage.values():
        month_used += float(rec.get("units", 0.0))

    # -----------------------------
    # 4️⃣ Predict next month usage
    # -----------------------------
    if user_usage:
        values = [float(rec["units"]) for rec in user_usage.values()]
        avg_daily = sum(values) / len(values)
        predicted_units = round(avg_daily * 30, 2)
    else:
        predicted_units = 0.0

    # -----------------------------
    # 5️⃣ Today's usage
    # -----------------------------
    today_key = datetime.now().date().isoformat()
    today_rec = user_usage.get(today_key, {"units": 0})
    today_used = float(today_rec.get("units", 0))

    # -----------------------------
    # 6️⃣ Plan details
    # -----------------------------
    plan_limit = int(user_sub.get("plan_units", 0))
    plan = user_sub.get("plan_name")

    progress_percent = round((month_used / plan_limit) * 100, 2) if plan_limit else 0.0

    daily_values = [float(rec["units"]) for rec in user_usage.values()]

    predicted_units = predict_next_usage(daily_values)

    suggestion = get_energy_suggestion(user_usage, plan_limit)

    reward_points = calculate_rewards(month_used, plan_limit)


    # -----------------------------
    # 7️⃣ Final JSON Response
    # -----------------------------
    return jsonify({
        "user_id": user_id,
        "today_used": today_used,
        "month_used": month_used,
        "predicted_units": predicted_units,
        "plan_limit": plan_limit,
        "plan": plan,
        "progress_percent": progress_percent
        "suggestion": suggestion,
        "reward_points": reward_points

    })

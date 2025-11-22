from flask import jsonify
from utils.helper import read_db
from datetime import datetime

def get_user_status(user_id):
    db = read_db()

    subscriptions = db.get("subscriptions", {})
    usage_all = db.get("usage", {})

    user_sub = subscriptions.get(user_id, {})
    user_usage = usage_all.get(user_id, {})

    # 1) Month used
    month_used = 0.0
    for rec in user_usage.values():
        if isinstance(rec, dict):
            month_used += float(rec.get("units", 0.0))
        else:
            month_used += float(rec)

    # 2) Predicted usage
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

    # 3) Today's usage
    today_key = datetime.now().date().isoformat()
    today_rec = user_usage.get(today_key, 0.0)
    if isinstance(today_rec, dict):
        today_used = float(today_rec.get("units", 0.0))
    else:
        today_used = float(today_rec)

    # 4) Plan information
    plan_limit = int(user_sub.get("plan_units", 0))
    plan = user_sub.get("plan_name")   # already fixed as "plan"

    progress_percent = round((month_used / plan_limit) * 100, 2) if plan_limit else 0.0

    # 5) Return PURE JSON
    return jsonify({
        "user_id": user_id,
        "today_used": today_used,
        "month_used": month_used,
        "predicted_units": predicted_units,
        "plan_limit": plan_limit,
        "plan": plan,
        "progress_percent": progress_percent
    })

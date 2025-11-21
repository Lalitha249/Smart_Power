# controllers/dashboard_controller.py

from utils.helper import read_db
from datetime import datetime

def get_user_status(user_id):
    db = read_db()
    subscriptions = db.get("subscriptions", {})
    usage_all = db.get("usage", {})

    user_sub = subscriptions.get(user_id, {})
    user_usage = usage_all.get(user_id, {})

    # Calculate month usage
    month_used = 0.0
    for day, rec in user_usage.items():
        if isinstance(rec, dict):
            month_used += float(rec.get("units", 0.0))
        else:
            month_used += float(rec)

    # Predicted units
    if user_usage:
        daily_vals = []
        for rec in user_usage.values():
            if isinstance(rec, dict):
                daily_vals.append(float(rec.get("units", 0.0)))
            else:
                daily_vals.append(float(rec))
        avg_daily = sum(daily_vals) / len(daily_vals)
        predicted_units = round(avg_daily * 30, 3)
    else:
        predicted_units = 0.0

    today_key = datetime.now().date().isoformat()
    today_rec = user_usage.get(today_key, 0)
    if isinstance(today_rec, dict):
        today_used = float(today_rec.get("units", 0.0))
    else:
        today_used = float(today_rec)

    plan_limit = int(user_sub.get("plan_units", 0)) if user_sub else 0
    progress_percent = round((month_used / plan_limit) * 100, 2) if plan_limit else 0.0

    return {
        "user_id": user_id,
        "today_used": today_used,
        "month_used": month_used,
        "predicted_units": predicted_units,
        "plan_limit": plan_limit,
        "plan_name": user_sub.get("plan_name"),
        "progress_percent": progress_percent
    }, 200

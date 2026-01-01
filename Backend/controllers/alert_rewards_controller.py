from flask import jsonify
from db.mongo import db

def get_alerts_and_rewards(user_id):

    # get subscription
    user_sub = db.subscriptions.find_one({"user_id": user_id})
    if not user_sub:
        return jsonify({"error":"No subscription found"}),404

    plan_limit = float(user_sub["plan_units"])

    # get total usage
    records = list(db.usage.find({"user_id": user_id}))
    total = sum(float(r["units"]) for r in records)

    alerts = []

    if total >= 0.8 * plan_limit:
        alerts.append("⚠️ 80% of your limit reached")

    if total >= plan_limit:
        alerts.append("🚨 100% usage limit reached!")

    reward = 10 if total <= 0.8 * plan_limit else 0

    return jsonify({
        "total_used": total,
        "plan_limit": plan_limit,
        "alerts": alerts,
        "reward_points": reward
    })
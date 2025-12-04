import json
import os
from ai_energy_coach import get_energy_suggestion
from reward_system import calculate_rewards

DATA_PATH = os.path.join("data", "db.json")

def analyze_user(user_id):

    with open(DATA_PATH, "r") as f:
        db = json.load(f)

    plan = db["subscriptions"][user_id]
    usage = db["usage"][user_id]

    # convert string keys to float values
    daily_usage = {day: usage[day]["units"] for day in usage}

    total_used = sum(daily_usage.values())
    plan_units = plan["plan_units"]

    suggestion = get_energy_suggestion(daily_usage, plan_units)
    reward = calculate_rewards(total_used, plan_units)

    return {
        "total_used": total_used,
        "plan_limit": plan_units,
        "suggestion": suggestion,
        "reward_points": reward
    }

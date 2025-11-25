# ML/ai_energy_coach.py

def get_energy_suggestion(daily_usage, plan_units):
    """
    Rule-based AI Energy Coach
    """

    total_used = sum(daily_usage.values())
    percentage = (total_used / plan_units) * 100

    if percentage < 50:
        return "Good job! You are consuming efficiently. Keep going!"
    
    elif percentage < 80:
        return "Usage is increasing. Try turning off unnecessary fans & lights."
    
    elif percentage < 100:
        return "⚠️ You are close to your plan limit. Reduce consumption in peak hours (6 – 9 PM)."
    
    else:
        return "❗ You exceeded your plan. Consider upgrading to a higher plan next month."

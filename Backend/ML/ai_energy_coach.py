def get_energy_suggestion(usage_history, plan_units):
    if not usage_history:
        return "No usage data available. Add usage to get suggestions."

    daily_vals = list(usage_history.values())
    avg = sum(daily_vals) / len(daily_vals)

    if avg > 12:
        return "Your energy usage is very high. Consider reducing AC usage or large appliances."
    elif avg > 8:
        return "Your usage is slightly high. Try to optimise fan, fridge and washing machine timings."
    elif avg < 3:
        return "Excellent energy-saving! Keep up your efficient habits."
    else:
        return "Your usage is normal. Maintain this pattern."

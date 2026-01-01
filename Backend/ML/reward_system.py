def calculate_rewards(total_used, plan_units):
    """
    Reward rules:
    - If usage <= 80% of plan units → reward 10 points
    - Else reward 0
    """
    if plan_units <= 0:
        return 0

    if total_used <= 0.80 * plan_units:
        return 10
    return 0

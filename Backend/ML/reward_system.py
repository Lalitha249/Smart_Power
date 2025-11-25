def calculate_rewards(total_used, plan_units):
    """
    Reward system:
    - If user uses < 80% of limit → reward 10 points
    """
    if total_used <= 0.80 * plan_units:
        return 10
    return 0

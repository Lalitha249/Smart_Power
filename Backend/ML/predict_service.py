def predict_next_usage(daily_values):
    if not daily_values:
        return 0
    
    # If at least 7 days, take last 7-day moving average
    if len(daily_values) >= 7:
        avg = sum(daily_values[-7:]) / 7
    else:
        avg = sum(daily_values) / len(daily_values)

    return round(avg * 30, 2)  # Predicted monthly usage

# model.py - Day 3: predictor + cost + recommendation rules

def predict_from_history(history):
    """
    Improved predictor:
    - Uses average daily usage
    - Also considers simple trend (first vs last value)
    - Predicts monthly usage = (avg + slope) * 30
    """
    if not history:
        return 120.0  # default fallback

    daily_avg = sum(history) / len(history)

    slope = 0
    if len(history) >= 3:
        slope = (history[-1] - history[0]) / (len(history) - 1)

    predicted = (daily_avg + slope) * 30
    return round(predicted, 1)


def calc_predicted_cost(pred_units, rate=6.0):
    """
    Calculates estimated cost based on predicted units
    Default rate = ₹6 per unit
    """
    return round(pred_units * rate, 2)


def recommend_plan(predicted_units, current_plan=None):
    """
    Recommends a subscription plan based on predicted_units.
    Plans:
      - Basic: 100 units -> ₹199
      - Standard: 200 units -> ₹399
      - Premium: 400 units -> ₹699

    Returns a dict:
    {
      "recommended_plan": "Standard",
      "plan_units": 200,
      "plan_price": 399,
      "predicted_units": 123.4,
      "savings_estimate": 150.00  # positive -> money saved if switch
    }

    current_plan can be one of "Basic","Standard","Premium" or None.
    If current_plan is None, savings_estimate is compared vs keeping a plan that exactly matches predicted (for clarity we compute savings vs recommended cost = 0).
    """
    # plan definitions
    plans = {
        "Basic": {"units": 100, "price": 199},
        "Standard": {"units": 200, "price": 399},
        "Premium": {"units": 400, "price": 699},
    }

    # choose recommendation
    if predicted_units <= 100:
        rec_name = "Basic"
    elif predicted_units <= 200:
        rec_name = "Standard"
    else:
        rec_name = "Premium"

    rec_units = plans[rec_name]["units"]
    rec_price = plans[rec_name]["price"]

    # compute current plan cost for comparison
    if current_plan and current_plan in plans:
        current_price = plans[current_plan]["price"]
    else:
        current_price = None  # unknown

    # savings estimate: how much user saves per month if they switch from current_plan -> recommended
    if current_price is not None:
        savings_estimate = round(current_price - rec_price, 2)
    else:
        savings_estimate = None

    return {
        "recommended_plan": rec_name,
        "plan_units": rec_units,
        "plan_price": rec_price,
        "predicted_units": round(predicted_units, 1),
        "savings_estimate": savings_estimate,
    }


# ------- TEST / DEMO -------
if __name__ == "__main__":
    # sample histories to test different outcomes
    cases = {
        "low_usage": [1.0, 1.2, 0.9, 1.1],        # small usage => Basic
        "mid_usage": [2.5, 2.6, 2.4, 2.7],        # around 75-80 units => Standard
        "high_usage": [4.0, 4.5, 5.0, 4.8],       # high => Premium
    }

    for name, hist in cases.items():
        pred = predict_from_history(hist)
        cost = calc_predicted_cost(pred)
        rec = recommend_plan(predicted_units=pred, current_plan="Standard")  # assume current is Standard
        print("----", name, "----")
        print("History:", hist)
        print("Predicted Units:", pred)
        print("Predicted Cost (₹):", cost)
        print("Recommendation:", rec)
        print()

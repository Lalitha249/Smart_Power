import joblib

model = joblib.load("saved_models/usage_predictor.pkl")

def get_energy_advice(today_usage):
    if today_usage > 5:
        return "Usage high today — try switching off high loads like geyser."
    if today_usage < 3:
        return "Good job! You saved energy today."
    return "Moderate usage. Try using appliances after 10 PM for lower load."

def predict_tomorrow(day):
    return model.predict([[day]])[0]

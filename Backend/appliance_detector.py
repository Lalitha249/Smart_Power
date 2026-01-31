import json
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USAGE_FILE = os.path.join(BASE_DIR, "data", "usage_data.json")
ALERT_FILE = os.path.join(BASE_DIR, "data", "alerts.json")

def detect_appliance(previous, current):
    spike = current - previous
    hour = datetime.now().hour

    if spike > 2.0:
        if 22 <= hour or hour <= 6:
            return "High AC / Geyser usage detected. Consider reducing night usage."
        elif 6 < hour <= 10:
            return "Morning power spike detected. Heater or Iron may be consuming more."
        elif 18 <= hour <= 22:
            return "Evening peak usage detected. Cooking or Washing Machine may be ON."
        else:
            return "Sudden power spike detected. Please check heavy appliances."
    return None


def run_detection():
    with open(USAGE_FILE, "r") as f:
        usage = json.load(f)

    current_usage = usage.get("total_usage", 0)
    previous_usage = usage.get("previous_usage", current_usage)

    message = detect_appliance(previous_usage, current_usage)

    usage["previous_usage"] = current_usage

    with open(USAGE_FILE, "w") as f:
        json.dump(usage, f, indent=4)

    if message:
        alert = {
            "level": "APPLIANCE",
            "message": message,
            "time": str(datetime.now())
        }

        try:
            with open(ALERT_FILE, "r") as f:
                alerts = json.load(f)
        except:
            alerts = []

        alerts.append(alert)

        with open(ALERT_FILE, "w") as f:
            json.dump(alerts, f, indent=4)

        print("APPLIANCE ALERT:", message)


if __name__ == "__main__":
    run_detection()

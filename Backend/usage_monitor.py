import json
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

USAGE_FILE = os.path.join(BASE_DIR, "data", "usage_data.json")
ALERT_FILE = os.path.join(BASE_DIR, "data", "alerts.json")

PLAN_LIMIT = 50   # keep test value for now


def save_alert(level, message):
    alert = {
        "level": level,
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

    print("ALERT:", message)


def check_usage():
    with open(USAGE_FILE, "r") as f:
        usage = json.load(f)

    total_used = usage.get("total_usage", 0)
    percent_used = round((total_used / PLAN_LIMIT) * 100, 2)

    print("Usage:", percent_used, "%")

    if percent_used >= 95:
        save_alert("CRITICAL", "95% of plan used! Reduce usage immediately.")
    elif percent_used >= 85:
        save_alert("WARNING", "85% of plan used. High consumption detected.")
    elif percent_used >= 70:
        save_alert("INFO", "70% of plan used. Monitor usage.")

if __name__ == "__main__":
    check_usage()

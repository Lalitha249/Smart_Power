import time
import random
import json
from datetime import datetime

DATA_FILE = "data/usage_data.json"

def simulate_usage():
    while True:
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
        except:
            data = {
                "date": str(datetime.now().date()),
                "today_usage": 0,
                "total_usage": 0
            }

        increment = round(random.uniform(0.1, 0.5), 2)
        data["today_usage"] += increment
        data["total_usage"] += increment

        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=4)

        print(f"[USAGE UPDATE] +{increment} units")

        time.sleep(5)   # every 5 seconds

if __name__ == "__main__":
    simulate_usage()

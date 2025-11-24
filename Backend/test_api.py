import requests
import json

BASE = "http://127.0.0.1:5000"

print("\n==== TEST: SUBSCRIBE ====")
resp = requests.post(f"{BASE}/subscribe", json={
    "user_id": "user1",
    "plan_name": "Standard",
    "plan_units": 200,
    "price": 1200
})
print(resp.status_code, resp.json())

print("\n==== TEST: ADD USAGE ====")
resp = requests.post(f"{BASE}/usage", json={
    "user_id": "user1",
    "units": 2.5
})
print(resp.status_code, resp.json())

print("\n==== TEST: STATUS ====")
resp = requests.get(f"{BASE}/status/user1")
print(resp.status_code, json.dumps(resp.json(), indent=2))

print("\n==== TEST: USAGE HISTORY ====")
resp = requests.get(f"{BASE}/usage-history/user1")
print(resp.status_code, json.dumps(resp.json(), indent=2))


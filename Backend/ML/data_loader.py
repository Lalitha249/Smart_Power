import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

USERS_FILE = os.path.join(BASE_DIR, "../Database/users.json")
USAGE_FILE = os.path.join(BASE_DIR, "../Database/usage.json")
PLANS_FILE = os.path.join(BASE_DIR, "../Database/plans.json")


def load_json(file_path):
    """
    Safely load JSON files
    """
    try:
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return []

        with open(file_path, "r") as file:
            data = json.load(file)
            return data

    except Exception as e:
        print(f"❌ Error loading {file_path}: {e}")
        return []


def get_user_info(user_id):
    """
    Fetch user details from users.json
    Works for BOTH list & dict format
    """
    users_data = load_json(USERS_FILE)

    # If users.json is a LIST
    if isinstance(users_data, list):
        for user in users_data:
            if user.get("user_id") == user_id or user.get("id") == user_id:
                return {
                    "user": user,
                    "plan": user.get("plan", 0)
                }

    # If users.json is a DICT
    elif isinstance(users_data, dict):
        user = users_data.get(user_id, {})
        return {
            "user": user,
            "plan": user.get("plan", 0)
        }

    return {"user": {}, "plan": 0}


def get_usage_data(user_id):
    """
    Get all usage data for a specific user
    """
    usage_data = load_json(USAGE_FILE)

    user_usage = []

    if isinstance(usage_data, list):
        for entry in usage_data:
            if entry.get("user_id") == user_id:
                user_usage.append(entry.get("units", 0))

    elif isinstance(usage_data, dict):
        user_usage = usage_data.get(user_id, [])

    return user_usage


def get_plan_info(plan_id):
    """
    Get plan details
    """
    plans_data = load_json(PLANS_FILE)

    if isinstance(plans_data, list):
        for plan in plans_data:
            if plan.get("id") == plan_id:
                return plan

    elif isinstance(plans_data, dict):
        return plans_data.get(str(plan_id), {})

    return {}


def get_user_full_data(user_id):
    """
    Combine user + usage + plan data
    """
    user_info = get_user_info(user_id)
    usage = get_usage_data(user_id)
    plan_info = get_plan_info(user_info.get("plan", 0))

    return {
        "user": user_info.get("user", {}),
        "plan": plan_info,
        "usage": usage
    }


# ✅ TEST SECTION
if __name__ == "__main__":
    test_user = "user1"

    print("\n✅ TESTING DATA LOADER")
    print("-------------------------------")

    print(f"User ID: {test_user}")
    print("Daily Values:", get_usage_data(test_user))

    user_info = get_user_info(test_user)
    print("User Plan:", user_info.get("plan"))

    full_data = get_user_full_data(test_user)
    print("\n✅ FULL DATA OUTPUT:")
    print(json.dumps(full_data, indent=4))

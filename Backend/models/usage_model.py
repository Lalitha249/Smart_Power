from utils.helper import read_db, write_db
from datetime import datetime


def add_usage_to_db(user_id, units):
    db = read_db()
    usage_all = db.get("usage", {})

    if user_id not in usage_all:
        usage_all[user_id] = {}

    today_key = datetime.now().date().isoformat()

    old = usage_all[user_id].get(today_key, 0)

    # support int or dict
    if isinstance(old, dict):
        usage_all[user_id][today_key]["units"] = float(old.get("units", 0.0)) + float(units)
    else:
        usage_all[user_id][today_key] = {"units": float(old) + float(units)}

    db["usage"] = usage_all
    write_db(db)

    return True


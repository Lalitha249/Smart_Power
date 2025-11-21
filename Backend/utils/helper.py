# utils/helper.py

import json
from filelock import FileLock
from pathlib import Path

DB_PATH = Path("db.json")
LOCK_PATH = str(DB_PATH) + ".lock"

def read_db():
    if not DB_PATH.exists():
        return {"users": [], "subscriptions": {}, "usage": {}}
    with FileLock(LOCK_PATH):
        return json.loads(DB_PATH.read_text(encoding="utf-8"))

def write_db(data):
    with FileLock(LOCK_PATH):
        DB_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")

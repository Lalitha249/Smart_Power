# ML/data_loader.py
import json
from pathlib import Path
import numpy as np
import pandas as pd
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent.parent / "db.json"

def load_db():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"DB not found at {DB_PATH}")
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def build_training_table(min_days=3):
    """
    Build a simple dataset: for each user-month (or day-sequence) produce:
    - X: last N daily usages (we'll use variable length via padding/truncation)
    - y: predicted next-month units (avg_daily * 30)
    This is simple and works with small data for demo.
    """
    raw = load_db()
    usage = raw.get("usage", {})  # dict: user -> {date: {"units": x}}
    rows = []
    for user, d in usage.items():
        # d is date->record
        # sort by date
        items = sorted(d.items(), key=lambda x: x[0])
        # extract daily numbers
        daily = []
        for date_str, rec in items:
            val = rec.get("units") if isinstance(rec, dict) else rec
            try:
                daily.append(float(val))
            except:
                continue
        if len(daily) < min_days:
            continue
        # we'll create sliding windows: use last 7 days as features
        window = 3
        for i in range(window, len(daily)):
            x = daily[i-window:i]   # last 7 days
            # target: next 30-days projection from avg daily of window
            avg_daily = sum(x) / len(x)
            y = avg_daily * 30
            rows.append({"user": user, "x": x, "y": y})
    # convert to DataFrame with columns x0..x6
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    # expand x list into columns
    x_df = pd.DataFrame(df['x'].tolist(), columns=[f'x{i}' for i in range(len(df['x'].iloc[0]))])
    df = pd.concat([df.drop(columns=['x']), x_df], axis=1)
    return df

if __name__ == "__main__":
    df = build_training_table()
    print("Built training table rows:", len(df))
    if not df.empty:
        print(df.head())

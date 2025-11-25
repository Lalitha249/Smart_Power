# ML/train_model.py
import joblib
from pathlib import Path
from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import numpy as np

from data_loader import build_training_table, DB_PATH

MODEL_PATH = Path(__file__).resolve().parent / "model.joblib"

def train_and_save():
    df = build_training_table()
    if df.empty:
        print("No training data available. Add usage entries to db.json and retry.")
        return

    X = df[[c for c in df.columns if c.startswith("x")]].values
    y = df["y"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # simple regularized linear model for stability
    model = Ridge(alpha=1.0)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    print(f"Trained model. MAE: {mae:.2f}, R2: {r2:.3f}")

    joblib.dump({
        "model": model,
        "n_features": X.shape[1]
    }, MODEL_PATH)
    print("Saved model to", MODEL_PATH)

if __name__ == "__main__":
    train_and_save()

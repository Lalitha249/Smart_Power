# ML/predict_service.py

import joblib
from pathlib import Path
import numpy as np

MODEL_PATH = Path(__file__).resolve().parent / "model.joblib"

def load_model():
    """
    Load model + metadata trained by train_model.py
    """
    if not MODEL_PATH.exists():
        raise FileNotFoundError("Model not found. Run train_model.py first.")
    
    payload = joblib.load(MODEL_PATH)
    return payload["model"], payload["n_features"]

def predict_next_usage(history):
    """
    Predict next-day usage based on past usage list
    history = list of daily usage values (latest last)
    """
    model, n_features = load_model()

    hist = list(history or [])

    # Pad with zeros or trim history
    if len(hist) < n_features:
        hist = [0.0] * (n_features - len(hist)) + hist
    else:
        hist = hist[-n_features:]

    X = np.array(hist).reshape(1, -1)
    pred = float(model.predict(X)[0])

    return max(0.0, pred)  # never return negative


# Manual test
if __name__ == "__main__":
    test_hist = [0.5, 1.2, 1.0, 0.4, 2.0, 1.1, 0.9]
    print("Predicted next usage:", predict_next_usage(test_hist))

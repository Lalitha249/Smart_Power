
# 📘 SmartPower Backend API Documentation

This backend powers the SmartPower energy usage application.

Base URL (local):

```
http://127.0.0.1:5000
```

---

# 🟦 **1. Subscription APIs**

## **POST /subscribe**

Create/Update subscription for a user.

### Request Body

```json
{
  "user_id": "user1",
  "plan_name": "Basic",
  "plan_units": 100,
  "price": 99
}
```

### Response

```json
{
  "message": "subscribed",
  "subscription": {
    "plan_name": "Basic",
    "plan_units": 100,
    "price": 99,
    "start_ts": "2025-11-25T10:45Z"
  }
}
```

---

# 🟦 **2. Update Subscription**

## **POST /update/<user_id>**

### Body (any field optional)

```json
{
  "plan_name": "Pro",
  "plan_units": 200,
  "price": 149
}
```

---

# 🟦 **3. Add Usage**

## **POST /usage → Add today's usage**

### Body

```json
{
  "user_id": "user1",
  "units": 5.5
}
```

### Response

```json
{
  "message": "Usage added",
  "date": "2025-11-25",
  "units": 5.5
}
```

---

## **POST /usage/add → Add usage for any date**

### Body

```json
{
  "user_id": "user1",
  "units": 4.2,
  "date": "2025-11-22"
}
```

---

# 🟦 **4. Status API**

## **GET /status/<user_id>**

### Response

```json
{
  "user_id": "user1",
  "today_used": 2.5,
  "month_used": 30.5,
  "predicted_units": 120.3,
  "plan_limit": 100,
  "plan_name": "Basic",
  "progress_percent": 30.5
}
```

---

# 🟦 **5. Usage History**

## **GET /usage-history/<user_id>**

### Response

```json
{
  "history": {
    "2025-11-22": {"units": 4.5},
    "2025-11-23": {"units": 5.0}
  }
}
```

---

# 🟦 **6. AI Coach (Simple Advice)**

## **GET /coach/<user_id>**

### Response

```json
{
  "suggestions": ["Usage is normal. Maintain this pattern."]
}
```

---

# 🟦 **7. Advanced Prediction**

## **GET /predict-advanced/<user_id>**

### Response

```json
{
  "prediction": 135.3,
  "moving_average": 4.5,
  "trend": "Increasing usage"
}
```

---

# 🟦 **8. Alerts**

## **GET /alerts/<user_id>**

### Example Response

```json
{
  "alerts": [
    "⚠️ You have used more than 80% of your plan.",
    "🔥 Today's usage is higher than yesterday."
  ]
}
```

---

# 🟦 **9. Admin Analytics**

## **GET /admin/analytics**

### Response

```json
{
  "total_users": 2,
  "total_units": 75.5,
  "highest_user": "user1",
  "highest_usage": 50.0,
  "average_daily_usage": 10.2,
  "peak_usage_day": "2025-11-22",
  "plan_distribution": {
    "Basic": 1,
    "Pro": 1
  }
}
```

---

# 🟦 **10. ML Endpoints**

## **GET /api/get-energy-suggestion?user_id=user1**

### Response

```json
{
  "suggestion": "Your usage is normal. Maintain this pattern."
}
```

---

## **GET /api/predict_next_usage?user_id=user1**

### Response

```json
{
  "predicted_usage": 163.7
}
```

---


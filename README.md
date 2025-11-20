# Smart_Power
SmartPower is a real-time electricity usage monitoring system.  It helps a user:  See how many units they used today  Track their total monthly units  See live predictions for the month  Check if they are exceeding their plan  Get suggestions like “upgrade plan” or “downgrade plan”  


1. A working website
User selects a plan (Basic / Standard / Premium).

A live dashboard shows:

Today’s units

Total monthly units

A live graph updating every few seconds

Usage percentage with progress bar

Alerts like “⚠️ You are about to exceed your plan!”

2. Live data coming in from Artificial Smart Meter (Simulator)
The backend continuously sends data (like a real smart meter).

Frontend updates in real time.

3. Monthly Bill Prediction
Your ML logic predicts:

How many units you’ll use this month

Expected bill amount

Whether the user will exceed their plan soon

4. Smart Plan Recommendation
Based on prediction, the system says:

“Switch to STANDARD plan to save ₹120”

“Downgrade to BASIC — you are under-using electricity.”

“Upgrade to PREMIUM — you will exceed usage this month.”

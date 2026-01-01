from pymongo import MongoClient

MONGO_URI = "mongodb+srv://admin:Password%4025@smartpowercluster.felsaoi.mongodb.net/?retryWrites=true&w=majority&appName=SmartPowerCluster"

client = MongoClient(MONGO_URI)

db = client["SmartPowerDB"]   # You can rename this

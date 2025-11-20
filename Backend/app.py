from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__, static_folder="../Frontend")
CORS(app)

@app.route("/")
def serve_frontend():
    return send_from_directory("../Frontend", "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory("../Frontend", path)

@app.route("/api/status")
def status():
    return jsonify({"message": "Backend is Working!", "status": "OK"})

if __name__ == "__main__":
    app.run(debug=True)

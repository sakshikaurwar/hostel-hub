import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from routes import auth_routes, admin_routes, warden_routes, common_routes, complaints_routes, attendance_routes, payments_routes, salaries_routes, health_routes
from werkzeug.exceptions import HTTPException

load_dotenv()

required_env_vars = [
    "SECRET_KEY",
    "JWT_SECRET_KEY",
    "MYSQL_HOST",
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "MYSQL_DB",
]

missing_vars = [name for name in required_env_vars if not os.getenv(name)]
if missing_vars:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing_vars)}")

app = Flask(__name__)
CORS(app)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["MYSQL_HOST"] = os.getenv("MYSQL_HOST")
app.config["MYSQL_USER"] = os.getenv("MYSQL_USER")
app.config["MYSQL_PASSWORD"] = os.getenv("MYSQL_PASSWORD")
app.config["MYSQL_DB"] = os.getenv("MYSQL_DB")

# Register routes
app.register_blueprint(auth_routes)
app.register_blueprint(admin_routes)
app.register_blueprint(warden_routes)
app.register_blueprint(common_routes)
app.register_blueprint(complaints_routes)
app.register_blueprint(attendance_routes)
app.register_blueprint(payments_routes)
app.register_blueprint(salaries_routes)
app.register_blueprint(health_routes)

@app.route('/')
def home():
    return "Backend is running successfully 🚀"

@app.errorhandler(Exception)
def handle_exception(error):
    if isinstance(error, HTTPException):
        return jsonify({"message": error.description}), error.code
    app.logger.exception("Unhandled exception")
    return jsonify({"message": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

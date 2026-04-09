import os
from dotenv import load_dotenv

load_dotenv()


def require_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or value == "":
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

SECRET_KEY = require_env("SECRET_KEY")
JWT_SECRET_KEY = require_env("JWT_SECRET_KEY")
MYSQL_HOST = require_env("MYSQL_HOST")
MYSQL_USER = require_env("MYSQL_USER")
MYSQL_PASSWORD = require_env("MYSQL_PASSWORD")
MYSQL_DB = require_env("MYSQL_DB")

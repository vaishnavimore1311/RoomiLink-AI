import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
basedir = Path(__file__).resolve().parent
load_dotenv(basedir / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "roomilink-dev-secret-key-change-in-prod")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "roomilink-jwt-secret-key-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
    
    # LLM Settings
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
    LLM_API_KEY = os.getenv("LLM_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "10"))
    
    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # Razorpay Payment Gateway (Demo / Live)
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_RoomiLinkDemo2026")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "roomilink_secret_demo_key_9988")
    
    # Database Configuration with MySQL priority and SQLite fallback
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    db_url = os.getenv("DATABASE_URL")
    sqlite_fallback_path = basedir / "instance" / "roomilink_dev.db"
    
    # Ensure instance directory exists
    sqlite_fallback_path.parent.mkdir(parents=True, exist_ok=True)
    
    if db_url and "mysql" in db_url:
        try:
            # Test MySQL connection parameters if possible
            SQLALCHEMY_DATABASE_URI = db_url
        except Exception:
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{sqlite_fallback_path}"
    else:
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{sqlite_fallback_path}"




class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config_by_name

# Initialize Flask extensions
db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()

def create_app(config_name=None):
    """Application factory for RoomiLink AI Flask Backend."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")
        
    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))
    
    # Initialize extensions with app
    cors.init_app(app, origins=app.config.get("CORS_ORIGINS", ["http://localhost:3000"]), supports_credentials=True)
    jwt.init_app(app)
    
    # Dual-mode database verification with graceful SQLite fallback
    db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if "mysql" in db_uri:
        try:
            from sqlalchemy import create_engine
            test_engine = create_engine(db_uri, connect_args={"connect_timeout": 10})
            with test_engine.connect():
                pass
            test_engine.dispose()
        except Exception as e:
            fallback_path = os.path.join(app.root_path, "..", "instance", "roomilink_dev.db")
            os.makedirs(os.path.dirname(fallback_path), exist_ok=True)
            app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{fallback_path}"
            app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
            app.logger.warning(f"MySQL connection failed ({e}). Engaged dual-mode SQLite fallback: {fallback_path}")

    db.init_app(app)

    # Root route for browser checks
    @app.route("/", methods=["GET"])
    @app.route("/api/v1", methods=["GET"])
    @app.route("/api/v1/", methods=["GET"])
    def root():
        return jsonify({
            "service": "RoomiLink AI REST API",
            "status": "online",
            "version": "1.0.0",
            "health_check": "/api/v1/health",
            "rooms_api": "/api/v1/rooms",
            "roommates_api": "/api/v1/matching/roommates"
        }), 200

    # Health check route
    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        db_status = "connected"
        try:
            with app.app_context():
                db.session.execute(db.text("SELECT 1"))
        except Exception as e:
            db_status = f"unhealthy ({str(e)})"
            
        return jsonify({
            "status": "success",
            "service": "RoomiLink AI Backend API",
            "version": "1.0.0",
            "database_status": db_status,
            "database_engine": str(app.config["SQLALCHEMY_DATABASE_URI"].split(":")[0])
        }), 200

    # JWT Error handlers
    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({
            "status": "error",
            "message": "Missing authorization token. Please log in."
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "status": "error",
            "message": "Authorization token has expired. Please refresh or log in again."
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({
            "status": "error",
            "message": "Invalid token signature."
        }), 401

    # Register blueprints when available
    register_blueprints(app)

    return app


def register_blueprints(app):
    """Register all modular Flask route blueprints."""
    try:
        from app.routes.auth_routes import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    except ImportError:
        pass

    try:
        from app.routes.room_routes import room_bp
        app.register_blueprint(room_bp, url_prefix="/api/v1/rooms")
    except ImportError:
        pass

    try:
        from app.routes.matching_routes import matching_bp
        app.register_blueprint(matching_bp, url_prefix="/api/v1/matching")
    except ImportError:
        pass

    try:
        from app.routes.household_routes import household_bp
        app.register_blueprint(household_bp, url_prefix="/api/v1/household")
    except ImportError:
        pass

    try:
        from app.routes.ai_routes import ai_bp
        app.register_blueprint(ai_bp, url_prefix="/api/v1/ai")
    except ImportError:
        pass

    try:
        from app.routes.subscription_routes import subscription_bp
        app.register_blueprint(subscription_bp, url_prefix="/api/v1/subscriptions")
    except ImportError:
        pass

    try:
        from app.routes.admin_routes import admin_bp
        app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    except ImportError:
        pass

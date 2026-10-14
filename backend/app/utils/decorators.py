from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app import db
from app.models.user_models import User

def admin_required():
    """Custom decorator to protect endpoints and restrict access strictly to users with role='admin'."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as e:
                return jsonify({
                    "status": "error",
                    "message": "Authorization token is missing or invalid."
                }), 401

            identity = get_jwt_identity()
            try:
                user_id = int(identity)
            except (ValueError, TypeError):
                return jsonify({
                    "status": "error",
                    "message": "Invalid token subject."
                }), 401

            user = db.session.get(User, user_id)
            if not user:
                return jsonify({
                    "status": "error",
                    "message": "User account not found."
                }), 404

            if user.role != "admin":
                return jsonify({
                    "status": "error",
                    "message": "Access denied. Administrator privileges required."
                }), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper

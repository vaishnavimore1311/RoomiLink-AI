from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models.user_models import User, Profile, RoommatePreference
from app.models.household_models import HouseholdMember

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "seeker")
    city = data.get("city", "").strip()
    
    if not email or not password or not full_name:
        return jsonify({
            "status": "error",
            "message": "Email, password, and full name are required."
        }), 400

    if len(password) < 6:
        return jsonify({
            "status": "error",
            "message": "Password must be at least 6 characters long."
        }), 400

    if User.query.filter_by(email=email).first():
        return jsonify({
            "status": "error",
            "message": "An account with this email address already exists."
        }), 409

    # Create new User
    user = User(email=email, role=role, is_active=True, ai_consent_enabled=True)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()  # Populates user.id

    # Create associated Profile
    profile = Profile(
        user_id=user.id,
        full_name=full_name,
        city=city if city else None,
        age=data.get("age"),
        gender=data.get("gender"),
        occupation=data.get("occupation"),
        bio=data.get("bio", "")
    )
    db.session.add(profile)

    # Create default RoommatePreference
    pref = RoommatePreference(user_id=user.id)
    db.session.add(pref)

    db.session.commit()

    # Generate Access Token
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "status": "success",
        "message": "Account registered successfully.",
        "access_token": access_token,
        "user": user.to_dict()
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "status": "error",
            "message": "Email and password are required."
        }), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({
            "status": "error",
            "message": "Invalid email or password."
        }), 401

    if not user.is_active:
        return jsonify({
            "status": "error",
            "message": "Account has been deactivated. Contact support."
        }), 403

    access_token = create_access_token(identity=str(user.id))

    # Look up active household membership
    membership = HouseholdMember.query.filter_by(user_id=user.id).first()
    household_id = membership.household_id if membership else None

    user_data = user.to_dict()
    user_data["household_id"] = household_id

    return jsonify({
        "status": "success",
        "message": "Logged in successfully.",
        "access_token": access_token,
        "user": user_data
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    membership = HouseholdMember.query.filter_by(user_id=user.id).first()
    household_id = membership.household_id if membership else None

    user_data = user.to_dict()
    user_data["household_id"] = household_id

    return jsonify({
        "status": "success",
        "user": user_data
    }), 200


@auth_bp.route("/preferences", methods=["PUT"])
@jwt_required()
def update_preferences():
    user_id = int(get_jwt_identity())
    pref = RoommatePreference.query.filter_by(user_id=user_id).first()
    if not pref:
        pref = RoommatePreference(user_id=user_id)
        db.session.add(pref)

    data = request.get_json() or {}

    # Update 8 lifestyle fields if provided
    if "sleep_schedule" in data:
        pref.sleep_schedule = data["sleep_schedule"]
    if "cleanliness_level" in data:
        pref.cleanliness_level = int(data["cleanliness_level"])
    if "smoking_status" in data:
        pref.smoking_status = data["smoking_status"]
    if "guest_frequency" in data:
        pref.guest_frequency = data["guest_frequency"]
    if "noise_tolerance" in data:
        pref.noise_tolerance = data["noise_tolerance"]
    if "dietary_pref" in data:
        pref.dietary_pref = data["dietary_pref"]
    if "work_routine" in data:
        pref.work_routine = data["work_routine"]
    if "pet_tolerance" in data:
        pref.pet_tolerance = data["pet_tolerance"]
    if "budget_min" in data:
        pref.budget_min = float(data["budget_min"])
    if "budget_max" in data:
        pref.budget_max = float(data["budget_max"])

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Lifestyle preferences updated successfully.",
        "preferences": pref.to_dict()
    }), 200


@auth_bp.route("/consent", methods=["PUT"])
@jwt_required()
def update_ai_consent():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    data = request.get_json() or {}
    if "ai_consent_enabled" in data:
        user.ai_consent_enabled = bool(data["ai_consent_enabled"])
        db.session.commit()

    return jsonify({
        "status": "success",
        "message": "AI consent setting updated.",
        "ai_consent_enabled": user.ai_consent_enabled
    }), 200

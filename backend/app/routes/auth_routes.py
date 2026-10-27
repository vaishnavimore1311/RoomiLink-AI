from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models.user_models import User, Profile, RoommatePreference, VerificationDocument
from app.models.household_models import HouseholdMember
from app.utils.verification_storage import (
    ALLOWED_DOCUMENT_TYPES,
    save_verification_file,
    delete_verification_file,
)

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


@auth_bp.route("/verification/upload-id", methods=["POST"])
@jwt_required()
def upload_verification_id():
    """
    Authenticated endpoint for users and property hosts to upload a photo ID
    (Government ID, College ID, or Property proof) for identity verification.
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User account not found."}), 404

    # Check for file in request
    file = request.files.get("file") or request.files.get("id_document") or request.files.get("image")
    if not file or file.filename == "":
        return jsonify({"status": "error", "message": "No file uploaded. Key 'file', 'id_document', or 'image' is required."}), 400

    # Validate document type
    document_type = request.form.get("document_type", "government_id").strip().lower()
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        allowed_list = ", ".join(sorted(ALLOWED_DOCUMENT_TYPES))
        return jsonify({
            "status": "error",
            "message": f"Invalid document type. Allowed types: {allowed_list}"
        }), 400

    # Save file to private storage with format and size validation
    try:
        file_path, original_filename, file_size = save_verification_file(file, user_id)
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400

    # Replacement handling: check if a verification document already exists for this user
    existing_doc = VerificationDocument.query.filter_by(user_id=user.id).first()
    if existing_doc:
        # Delete old file from disk to avoid orphaned sensitive documents
        if existing_doc.file_path and existing_doc.file_path != file_path:
            delete_verification_file(existing_doc.file_path)
        existing_doc.document_type = document_type
        existing_doc.file_path = file_path
        existing_doc.original_filename = original_filename
        existing_doc.file_size = file_size
        existing_doc.status = "submitted"
        existing_doc.uploaded_at = datetime.now(timezone.utc)
        doc = existing_doc
    else:
        doc = VerificationDocument(
            user_id=user.id,
            document_type=document_type,
            file_path=file_path,
            original_filename=original_filename,
            file_size=file_size,
            status="submitted"
        )
        db.session.add(doc)

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Photo ID submitted successfully for verification.",
        "data": doc.to_dict()
    }), 201


@auth_bp.route("/verification/status", methods=["GET"])
@jwt_required()
def get_verification_status():
    """
    Retrieve the current user's Photo ID verification status and metadata
    without exposing sensitive storage paths or internal URLs.
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User account not found."}), 404

    doc = VerificationDocument.query.filter_by(user_id=user.id).first()

    return jsonify({
        "status": "success",
        "data": {
            "has_uploaded": doc is not None,
            "is_verified": user.is_verified,
            "document": doc.to_dict() if doc else None
        }
    }), 200

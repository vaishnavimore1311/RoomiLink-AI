import json
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.household_models import Household, HouseholdMember, Agreement
from app.models.user_models import User
from app.ai.llm_client import generate_living_agreement

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/generate-agreement", methods=["POST"])
@jwt_required()
def generate_agreement():
    """Generate or regenerate living agreement for household."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    data = request.get_json() or {}
    household_id = data.get("household_id")

    # If household_id not explicitly sent, use user's active household
    if not household_id:
        membership = HouseholdMember.query.filter_by(user_id=user_id).first()
        if not membership:
            return jsonify({
                "status": "error",
                "message": "User is not part of any household workspace."
            }), 400
        household_id = membership.household_id

    household = db.session.get(Household, household_id)
    if not household:
        return jsonify({"status": "error", "message": "Household not found."}), 404

    # Compile member lifestyle profiles
    members_data = []
    for m in household.members:
        u = m.user
        p = u.profile
        pref = u.preference
        members_data.append({
            "user_id": u.id,
            "full_name": p.full_name if p else u.email,
            "occupation": p.occupation if p else "Resident",
            "preferences": pref.to_dict() if pref else {}
        })

    # Generate agreement
    generated = generate_living_agreement(
        household_name=household.name,
        members_data=members_data,
        user_ai_consent=user.ai_consent_enabled
    )

    # Upsert Agreement in database
    agreement = Agreement.query.filter_by(household_id=household.id).first()
    if not agreement:
        agreement = Agreement(household_id=household.id)
        db.session.add(agreement)

    agreement.version = generated.get("version", "1.0")
    agreement.set_clauses(generated.get("clauses", []))
    agreement.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Living agreement synthesized successfully.",
        "data": {
            "id": agreement.id,
            "household_id": household.id,
            "title": generated.get("title", f"{household.name} Living Agreement"),
            "summary": generated.get("summary", ""),
            "version": agreement.version,
            "generated_via": generated.get("generated_via", "engine"),
            "clauses": agreement.get_clauses(),
            "updated_at": agreement.updated_at.isoformat() if agreement.updated_at else None
        }
    }), 200


@ai_bp.route("/agreement/<int:household_id>", methods=["GET"])
@jwt_required()
def get_agreement(household_id):
    """Retrieve existing living agreement for a household."""
    household = db.session.get(Household, household_id)
    if not household:
        return jsonify({"status": "error", "message": "Household not found."}), 404

    agreement = Agreement.query.filter_by(household_id=household_id).first()
    if not agreement:
        return jsonify({
            "status": "success",
            "data": None,
            "message": "No living agreement has been generated for this household yet."
        }), 200

    return jsonify({
        "status": "success",
        "data": {
            "id": agreement.id,
            "household_id": household.id,
            "household_name": household.name,
            "title": f"{household.name} Living Agreement",
            "version": agreement.version,
            "clauses": agreement.get_clauses(),
            "updated_at": agreement.updated_at.isoformat() if agreement.updated_at else None
        }
    }), 200


@ai_bp.route("/agreement/<int:household_id>/clauses", methods=["PUT"])
@jwt_required()
def update_clauses(household_id):
    """Update or customize agreement clauses."""
    agreement = Agreement.query.filter_by(household_id=household_id).first()
    if not agreement:
        return jsonify({"status": "error", "message": "Agreement not found."}), 404

    data = request.get_json() or {}
    clauses = data.get("clauses")

    if not isinstance(clauses, list):
        return jsonify({"status": "error", "message": "Clauses array is required."}), 400

    agreement.set_clauses(clauses)
    agreement.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Living agreement clauses updated successfully.",
        "data": {
            "id": agreement.id,
            "household_id": household_id,
            "clauses": agreement.get_clauses(),
            "updated_at": agreement.updated_at.isoformat()
        }
    }), 200

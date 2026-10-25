from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user_models import User, Profile, RoommatePreference
from app.services.matching_service import calculate_match_details

matching_bp = Blueprint("matching", __name__)


def get_or_create_default_pref(user_id=None) -> RoommatePreference:
    pref = RoommatePreference(
        user_id=user_id or 0,
        sleep_schedule="flexible",
        cleanliness_level=3,
        smoking_status="non_smoker",
        guest_frequency="weekends",
        noise_tolerance="moderate",
        dietary_pref="any",
        work_routine="hybrid",
        pet_tolerance="friendly",
        budget_min=400.0,
        budget_max=1200.0
    )
    return pref


@matching_bp.route("/roommates", methods=["GET"])
@jwt_required(optional=True)
def get_roommate_matches():
    """Retrieve roommate candidates ranked by algorithmic compatibility score."""
    current_user_id = get_jwt_identity()
    current_user_id = int(current_user_id) if current_user_id else None

    # Query current user's preference if authenticated
    my_pref = None
    if current_user_id:
        my_pref = RoommatePreference.query.filter_by(user_id=current_user_id).first()
    if not my_pref:
        my_pref = get_or_create_default_pref(current_user_id)

    # Optional query filters
    city_filter = request.args.get("city", "").strip()
    search_filter = request.args.get("search", "").strip()
    min_score = int(request.args.get("min_score") or 0)
    try:
        max_budget = float(request.args.get("budget_max") or 99999)
    except ValueError:
        max_budget = 99999

    # Query all non-admin users with profiles and preferences
    query = (
        db.session.query(User, Profile, RoommatePreference)
        .join(Profile, User.id == Profile.user_id)
        .outerjoin(RoommatePreference, User.id == RoommatePreference.user_id)
        .filter(User.role != "admin")
    )

    if current_user_id:
        query = query.filter(User.id != current_user_id)

    if city_filter:
        query = query.filter(Profile.city.ilike(f"%{city_filter}%"))

    if search_filter:
        s = f"%{search_filter}%"
        query = query.filter(
            db.or_(
                Profile.full_name.ilike(s),
                Profile.occupation.ilike(s),
                Profile.bio.ilike(s)
            )
        )

    users_data = query.all()

    candidates = []
    for user, profile, pref in users_data:
        target_pref = pref if pref else get_or_create_default_pref(user.id)
        
        # Apply budget filter if target_pref has budget
        if target_pref.budget_min > max_budget:
            continue

        match_info = calculate_match_details(my_pref, target_pref)
        score = match_info["score"]

        if score < min_score:
            continue

        candidates.append({
            "user_id": user.id,
            "full_name": profile.full_name,
            "email": user.email if current_user_id else None,
            "age": profile.age,
            "gender": profile.gender,
            "occupation": profile.occupation or "Professional / Student",
            "city": profile.city or "Pune, Maharashtra",
            "avatar_url": profile.avatar_url,
            "bio": profile.bio,
            "compatibility_score": score,
            "strengths": match_info["strengths"][:2],
            "frictions": match_info["frictions"][:1],
            "lifestyle": target_pref.to_dict()
        })

    # Sort candidates by compatibility score descending
    candidates.sort(key=lambda x: x["compatibility_score"], reverse=True)

    return jsonify({
        "status": "success",
        "count": len(candidates),
        "data": candidates
    }), 200


@matching_bp.route("/<int:candidate_id>/breakdown", methods=["GET"])
@jwt_required(optional=True)
def get_match_breakdown(candidate_id):
    """Retrieve detailed match breakdown between current user and a candidate."""
    current_user_id = get_jwt_identity()
    current_user_id = int(current_user_id) if current_user_id else None

    my_pref = None
    if current_user_id:
        my_pref = RoommatePreference.query.filter_by(user_id=current_user_id).first()
    if not my_pref:
        my_pref = get_or_create_default_pref(current_user_id)

    candidate = db.session.get(User, candidate_id)
    if not candidate or not candidate.profile or candidate.role == "admin":
        return jsonify({
            "status": "error",
            "message": "Candidate not found."
        }), 404

    candidate_pref = candidate.preference
    if not candidate_pref:
        candidate_pref = get_or_create_default_pref(candidate.id)

    match_details = calculate_match_details(my_pref, candidate_pref)

    return jsonify({
        "status": "success",
        "data": {
            "candidate": {
                "id": candidate.id,
                "full_name": candidate.profile.full_name,
                "occupation": candidate.profile.occupation,
                "city": candidate.profile.city,
                "bio": candidate.profile.bio,
                "avatar_url": candidate.profile.avatar_url,
                "lifestyle": candidate_pref.to_dict()
            },
            "compatibility_score": match_details["score"],
            "strengths": match_details["strengths"],
            "frictions": match_details["frictions"],
            "breakdown": match_details["breakdown"]
        }
    }), 200

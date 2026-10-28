from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user_models import User, Profile, RoommatePreference
from app.models.property_models import Property, Room
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


def is_user_premium(user_id: int | None) -> bool:
    """Check if the user is an admin or holds an active subscription."""
    if not user_id:
        return False
    user = db.session.get(User, user_id)
    if not user:
        return False
    if user.role == "admin":
        return True
    active_sub = user.get_active_subscription()
    return active_sub is not None


def get_user_allowed_candidate_ids(current_user_id: int | None, my_pref: RoommatePreference) -> tuple[list[int], int]:
    """
    Computes baseline ranked roommate candidate IDs for a user based on compatibility score.
    Returns (top_2_candidate_ids, total_eligible_candidate_count).
    Ensures free users have a deterministic maximum of 2 allowed matches that cannot be bypassed
    via search or filtering.
    """
    query = (
        db.session.query(User, Profile, RoommatePreference)
        .join(Profile, User.id == Profile.user_id)
        .outerjoin(RoommatePreference, User.id == RoommatePreference.user_id)
        .filter(User.role != "admin")
    )
    if current_user_id:
        query = query.filter(User.id != current_user_id)

    all_users = query.all()
    scored = []
    for user, profile, pref in all_users:
        target_pref = pref if pref else get_or_create_default_pref(user.id)
        match_info = calculate_match_details(my_pref, target_pref)
        scored.append((match_info["score"], user.id))

    # Sort descending by compatibility score, then ascending by user.id for determinism
    scored.sort(key=lambda item: (-item[0], item[1]))

    top_2_ids = [uid for _, uid in scored[:2]]
    return top_2_ids, len(scored)


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

    user_is_premium = is_user_premium(current_user_id)

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

    # Enforce limit for free users: only their top 2 baseline matches can be returned.
    # This prevents bypassing the paywall via selective query filters or direct API calls.
    total_eligible = 0
    if not user_is_premium:
        allowed_ids, total_eligible = get_user_allowed_candidate_ids(current_user_id, my_pref)
        if not allowed_ids:
            return jsonify({
                "status": "success",
                "count": 0,
                "total_matches": 0,
                "is_limited": False,
                "limit": 2,
                "has_active_subscription": False,
                "data": []
            }), 200
        query = query.filter(User.id.in_(allowed_ids))

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

        active_share = (
            Room.query.join(Property, Room.property_id == Property.id)
            .filter(Property.lister_id == user.id, Room.is_available == True, Room.listing_purpose == "flatmate_share")
            .first()
        )
        active_room_share_data = None
        if active_share:
            active_room_share_data = {
                "room_id": active_share.id,
                "title": active_share.property.title,
                "city": active_share.property.city,
                "neighborhood": active_share.property.neighborhood,
                "rent_amount": active_share.rent_amount,
                "preferred_gender": active_share.preferred_gender,
            }

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
            "lifestyle": target_pref.to_dict(),
            "active_room_share": active_room_share_data
        })

    # Sort candidates by compatibility score descending
    candidates.sort(key=lambda x: x["compatibility_score"], reverse=True)

    if not user_is_premium:
        candidates = candidates[:2]
        is_limited = total_eligible > 2
        limit_val = 2
    else:
        total_eligible = len(candidates)
        is_limited = False
        limit_val = None

    return jsonify({
        "status": "success",
        "count": len(candidates),
        "total_matches": total_eligible,
        "is_limited": is_limited,
        "limit": limit_val,
        "has_active_subscription": user_is_premium,
        "data": candidates
    }), 200


@matching_bp.route("/<int:candidate_id>/breakdown", methods=["GET"])
@jwt_required(optional=True)
def get_match_breakdown(candidate_id):
    """Retrieve detailed match breakdown between current user and a candidate."""
    current_user_id = get_jwt_identity()
    current_user_id = int(current_user_id) if current_user_id else None

    user_is_premium = is_user_premium(current_user_id)

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

    # Enforce limit for free users: only allowed top 2 matches can have their breakdown viewed
    if not user_is_premium:
        allowed_ids, _ = get_user_allowed_candidate_ids(current_user_id, my_pref)
        if candidate.id not in allowed_ids:
            return jsonify({
                "status": "error",
                "message": "Upgrade required to view compatibility breakdown for additional roommate profiles. Free accounts are limited to their top 2 matches.",
                "upgrade_required": True
            }), 403

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

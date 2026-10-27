from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.household_models import Household, HouseholdMember, Expense, Payment, Chore, Activity, ActivityParticipant
from app.models.user_models import User
from app.services.expense_service import add_household_expense, calculate_ledger, settle_debt_between_users, create_activity_expense

household_bp = Blueprint("household", __name__)


@household_bp.route("/create", methods=["POST"])
@jwt_required()
def create_household():
    """Create a new household workspace and generate unique invite code."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    active_sub = user.get_active_subscription()
    if user.role != "admin" and not active_sub:
        return jsonify({
            "status": "error",
            "code": "SUBSCRIPTION_REQUIRED",
            "message": "An active subscription is required to create a household workspace. Please subscribe to a plan first.",
            "required_plan": "any",
            "upgrade_url": "/pricing"
        }), 403

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    address = data.get("address", "").strip()

    if not name or not address:
        return jsonify({
            "status": "error",
            "message": "Household name and address are required."
        }), 400

    # Ensure invite code uniqueness
    invite_code = Household.generate_invite_code()
    while Household.query.filter_by(invite_code=invite_code).first():
        invite_code = Household.generate_invite_code()

    household = Household(
        name=name,
        address=address,
        invite_code=invite_code,
        created_by_id=user_id
    )
    db.session.add(household)
    db.session.flush()

    # Assign creator as admin member
    member = HouseholdMember(
        household_id=household.id,
        user_id=user_id,
        role="admin"
    )
    db.session.add(member)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Household '{name}' created successfully.",
        "data": {
            "household": household.to_dict(),
            "invite_code": household.invite_code
        }
    }), 201


@household_bp.route("/join", methods=["POST"])
@jwt_required()
def join_household():
    """Join an existing household using an 8-character invite code."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    active_sub = user.get_active_subscription()
    if user.role != "admin" and not active_sub:
        return jsonify({
            "status": "error",
            "code": "SUBSCRIPTION_REQUIRED",
            "message": "An active subscription is required to join a household workspace. Please subscribe to a plan first.",
            "required_plan": "any",
            "upgrade_url": "/pricing"
        }), 403

    data = request.get_json() or {}

    code = data.get("invite_code", "").strip().upper()
    if not code:
        return jsonify({
            "status": "error",
            "message": "Invite code is required."
        }), 400

    household = Household.query.filter_by(invite_code=code).first()
    if not household:
        return jsonify({
            "status": "error",
            "message": "Invalid invite code. No household found."
        }), 404

    existing = HouseholdMember.query.filter_by(household_id=household.id, user_id=user_id).first()
    if existing:
        return jsonify({
            "status": "error",
            "message": "You are already a member of this household."
        }), 409

    member = HouseholdMember(
        household_id=household.id,
        user_id=user_id,
        role="member"
    )
    db.session.add(member)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Successfully joined {household.name}!",
        "data": {
            "household": household.to_dict()
        }
    }), 200


@household_bp.route("/current", methods=["GET"])
@jwt_required()
def get_current_household():
    """Get active household workspace for the logged-in user."""
    user_id = int(get_jwt_identity())

    membership = HouseholdMember.query.filter_by(user_id=user_id).first()
    if not membership:
        return jsonify({
            "status": "success",
            "data": None,
            "message": "User is not currently a member of any household."
        }), 200

    household = membership.household
    members = [m.to_dict() for m in household.members]

    return jsonify({
        "status": "success",
        "data": {
            "household": household.to_dict(),
            "members": members,
            "my_role": membership.role
        }
    }), 200


@household_bp.route("/<int:household_id>", methods=["GET"])
@jwt_required()
def get_household_details(household_id):
    """Get household details and member roster."""
    household = db.session.get(Household, household_id)
    if not household:
        return jsonify({
            "status": "error",
            "message": "Household not found."
        }), 404

    members = [m.to_dict() for m in household.members]

    return jsonify({
        "status": "success",
        "data": {
            "household": household.to_dict(),
            "members": members
        }
    }), 200


# ==================== EXPENSE ROUTES ====================

@household_bp.route("/<int:household_id>/expenses", methods=["GET"])
@jwt_required()
def get_expenses(household_id):
    """Get expense transaction history and ledger."""
    user_id = int(get_jwt_identity())
    ledger_data = calculate_ledger(household_id, current_user_id=user_id)

    return jsonify({
        "status": "success",
        "data": ledger_data
    }), 200


@household_bp.route("/<int:household_id>/expenses", methods=["POST"])
@jwt_required()
def create_expense(household_id):
    """Add an expense and generate split obligations."""
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    title = data.get("title", "").strip()
    try:
        amount = float(data.get("amount", 0))
    except (ValueError, TypeError):
        amount = 0

    category = data.get("category", "Groceries")
    split_type = data.get("split_type", "equal")
    split_with_user_ids = data.get("split_with_user_ids")

    if not title or amount <= 0:
        return jsonify({
            "status": "error",
            "message": "Title and a positive amount are required."
        }), 400

    expense = add_household_expense(
        household_id=household_id,
        payer_id=user_id,
        title=title,
        amount=amount,
        category=category,
        split_type=split_type,
        split_with_user_ids=split_with_user_ids
    )

    return jsonify({
        "status": "success",
        "message": "Expense recorded and split successfully.",
        "data": expense.to_dict()
    }), 201


@household_bp.route("/<int:household_id>/settle", methods=["POST"])
@jwt_required()
def settle_debt(household_id):
    """Record debt settlement between two members."""
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    to_user_id = data.get("to_user_id")
    if not to_user_id:
        return jsonify({
            "status": "error",
            "message": "Creditor user ID ('to_user_id') is required to settle debt."
        }), 400

    settled_count = settle_debt_between_users(household_id, from_user_id=user_id, to_user_id=int(to_user_id))

    return jsonify({
        "status": "success",
        "message": f"Settled {settled_count} obligations successfully."
    }), 200


# ==================== ACTIVITY & GROUP EXPENSE ROUTES ====================

@household_bp.route("/<int:household_id>/activities", methods=["GET"])
@jwt_required()
def list_activities(household_id):
    """List all group activities and shared expenses for the household."""
    user_id = int(get_jwt_identity())
    membership = HouseholdMember.query.filter_by(household_id=household_id, user_id=user_id).first()
    if not membership:
        return jsonify({
            "status": "error",
            "message": "You must be a member of this household to view its activities."
        }), 403

    activities = Activity.query.filter_by(household_id=household_id).order_by(Activity.created_at.desc()).all()
    return jsonify({
        "status": "success",
        "data": [act.to_dict(include_participants=True) for act in activities]
    }), 200


@household_bp.route("/<int:household_id>/activities", methods=["POST"])
@jwt_required()
def create_activity(household_id):
    """Create a new group activity expense with participant-based splitting."""
    user_id = int(get_jwt_identity())
    membership = HouseholdMember.query.filter_by(household_id=household_id, user_id=user_id).first()
    if not membership:
        return jsonify({
            "status": "error",
            "message": "You must be a member of this household to create activities."
        }), 403

    data = request.get_json() or {}

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    category = data.get("category", "Party / Outing")
    split_method = data.get("split_method", "equal")
    notes = data.get("notes", "").strip()
    activity_date = data.get("activity_date")

    try:
        total_amount = float(data.get("total_amount", 0))
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "Total amount must be a valid positive number."
        }), 400

    payer_id = data.get("payer_id")
    if payer_id is None:
        payer_id = user_id
    else:
        try:
            payer_id = int(payer_id)
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "Invalid payer ID."
            }), 400

    participant_ids = data.get("participant_ids")
    if not participant_ids or not isinstance(participant_ids, list):
        return jsonify({
            "status": "error",
            "message": "At least one participating roommate must be selected."
        }), 400

    custom_shares = data.get("custom_shares")

    try:
        activity = create_activity_expense(
            household_id=household_id,
            created_by_id=user_id,
            payer_id=payer_id,
            title=title,
            total_amount=total_amount,
            category=category,
            split_method=split_method,
            participant_ids=participant_ids,
            custom_shares=custom_shares,
            description=description,
            activity_date=activity_date,
            notes=notes
        )
        return jsonify({
            "status": "success",
            "message": "Activity expense created successfully.",
            "data": activity.to_dict(include_participants=True)
        }), 201
    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to create activity: {str(e)}"
        }), 500


@household_bp.route("/<int:household_id>/activities/<int:activity_id>", methods=["GET"])
@jwt_required()
def get_activity_details(household_id, activity_id):
    """Get complete details, participant breakdown, and shares for an activity."""
    user_id = int(get_jwt_identity())
    membership = HouseholdMember.query.filter_by(household_id=household_id, user_id=user_id).first()
    if not membership:
        return jsonify({
            "status": "error",
            "message": "You must be a member of this household to view its activities."
        }), 403

    activity = Activity.query.filter_by(id=activity_id, household_id=household_id).first()
    if not activity:
        return jsonify({
            "status": "error",
            "message": "Activity not found in this household."
        }), 404

    return jsonify({
        "status": "success",
        "data": activity.to_dict(include_participants=True)
    }), 200


@household_bp.route("/<int:household_id>/activities/<int:activity_id>", methods=["PATCH"])
@jwt_required()
def update_activity(household_id, activity_id):
    """Update notes or description for an activity by creator or admin."""
    user_id = int(get_jwt_identity())
    membership = HouseholdMember.query.filter_by(household_id=household_id, user_id=user_id).first()
    if not membership:
        return jsonify({
            "status": "error",
            "message": "You must be a member of this household."
        }), 403

    activity = Activity.query.filter_by(id=activity_id, household_id=household_id).first()
    if not activity:
        return jsonify({
            "status": "error",
            "message": "Activity not found."
        }), 404

    if activity.created_by_id != user_id and membership.role != "admin":
        return jsonify({
            "status": "error",
            "message": "Only the activity creator or household admin can update this activity."
        }), 403

    data = request.get_json() or {}
    if "notes" in data:
        activity.notes = str(data["notes"]).strip()
    if "description" in data:
        activity.description = str(data["description"]).strip()

    db.session.commit()
    return jsonify({
        "status": "success",
        "message": "Activity updated successfully.",
        "data": activity.to_dict(include_participants=True)
    }), 200


# ==================== CHORE ROUTES ====================

@household_bp.route("/<int:household_id>/chores", methods=["GET"])
@jwt_required()
def get_chores(household_id):
    """Fetch household chores list."""
    chores = Chore.query.filter_by(household_id=household_id).order_by(Chore.is_completed.asc(), Chore.id.asc()).all()
    return jsonify({
        "status": "success",
        "data": [c.to_dict() for c in chores]
    }), 200


@household_bp.route("/<int:household_id>/chores", methods=["POST"])
@jwt_required()
def add_chore(household_id):
    """Add a new household chore."""
    data = request.get_json() or {}
    title = data.get("title", "").strip()

    if not title:
        return jsonify({
            "status": "error",
            "message": "Chore title is required."
        }), 400

    chore = Chore(
        household_id=household_id,
        title=title,
        frequency=data.get("frequency", "weekly"),
        due_date=data.get("due_date", "Friday"),
        assigned_to_id=data.get("assigned_to_id")
    )
    db.session.add(chore)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Chore created successfully.",
        "data": chore.to_dict()
    }), 201


@household_bp.route("/<int:household_id>/chores/<int:chore_id>/toggle", methods=["PATCH"])
@jwt_required()
def toggle_chore(household_id, chore_id):
    """Toggle chore completion status."""
    chore = db.session.get(Chore, chore_id)
    if not chore or chore.household_id != household_id:
        return jsonify({
            "status": "error",
            "message": "Chore not found in this household."
        }), 404

    chore.is_completed = not chore.is_completed
    chore.completed_at = datetime.now(timezone.utc) if chore.is_completed else None
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Chore marked as {'completed' if chore.is_completed else 'pending'}.",
        "data": chore.to_dict()
    }), 200

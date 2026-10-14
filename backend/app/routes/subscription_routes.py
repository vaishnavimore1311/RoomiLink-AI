from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.subscription_models import SubscriptionPlan, UserSubscription
from app.models.user_models import User

subscription_bp = Blueprint("subscriptions", __name__)

@subscription_bp.route("/plans", methods=["GET"])
def get_plans():
    """Retrieve all available subscription plans."""
    role = request.args.get("role", "").strip()
    query = SubscriptionPlan.query.filter_by(is_active=True)
    if role:
        query = query.filter_by(target_role=role)
    plans = query.order_by(SubscriptionPlan.price_inr.asc()).all()
    return jsonify({
        "status": "success",
        "data": [p.to_dict() for p in plans]
    }), 200


@subscription_bp.route("/me", methods=["GET"])
@jwt_required()
def get_my_subscription():
    """Retrieve currently active subscription for authenticated user."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    active_sub = user.get_active_subscription()
    return jsonify({
        "status": "success",
        "has_active_subscription": active_sub is not None,
        "subscription": active_sub.to_dict() if active_sub else None
    }), 200


@subscription_bp.route("/checkout", methods=["POST"])
@jwt_required()
def checkout_subscription():
    """Subscribe user to a plan (with simulated/instant payment confirmation)."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    data = request.get_json() or {}
    plan_slug = data.get("plan_slug", "").strip()
    plan_id = data.get("plan_id")
    payment_reference = data.get("payment_reference", f"mock_pay_{int(datetime.now().timestamp())}")

    if plan_slug:
        plan = SubscriptionPlan.query.filter_by(slug=plan_slug, is_active=True).first()
    elif plan_id:
        plan = db.session.get(SubscriptionPlan, plan_id)
    else:
        return jsonify({"status": "error", "message": "plan_slug or plan_id is required."}), 400

    if not plan:
        return jsonify({"status": "error", "message": "Selected subscription plan does not exist."}), 404

    # Calculate expiration duration based on billing cycle
    now = datetime.now(timezone.utc)
    if plan.billing_cycle == "annual":
        expires_at = now + timedelta(days=365)
    elif plan.billing_cycle == "quarterly":
        expires_at = now + timedelta(days=90)
    else:
        expires_at = now + timedelta(days=30)

    # Cancel previous active subscriptions for this user
    existing_subs = UserSubscription.query.filter_by(user_id=user_id, status="active").all()
    for sub in existing_subs:
        sub.status = "superseded"

    new_sub = UserSubscription(
        user_id=user_id,
        plan_id=plan.id,
        status="active",
        starts_at=now,
        expires_at=expires_at,
        payment_reference=payment_reference
    )
    db.session.add(new_sub)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Successfully subscribed to {plan.name}!",
        "data": new_sub.to_dict()
    }), 201


@subscription_bp.route("/cancel", methods=["POST"])
@jwt_required()
def cancel_subscription():
    """Cancel currently active subscription."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    active_sub = user.get_active_subscription()
    if not active_sub:
        return jsonify({"status": "error", "message": "No active subscription found to cancel."}), 400

    active_sub.status = "cancelled"
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Subscription has been cancelled."
    }), 200

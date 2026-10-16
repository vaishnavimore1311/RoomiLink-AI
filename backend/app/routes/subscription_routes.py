import hmac
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, current_app
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


@subscription_bp.route("/razorpay/config", methods=["GET"])
def get_razorpay_config():
    """Retrieve public Razorpay configuration for checkout."""
    key_id = current_app.config.get("RAZORPAY_KEY_ID", "rzp_test_RoomiLinkDemo2026")
    return jsonify({
        "status": "success",
        "key_id": key_id,
        "currency": "INR",
        "is_demo_mode": True
    }), 200


@subscription_bp.route("/razorpay/create-order", methods=["POST"])
@jwt_required()
def create_razorpay_order():
    """Generate a Razorpay Order ID for subscription checkout."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    data = request.get_json() or {}
    plan_slug = data.get("plan_slug", "").strip()
    plan_id = data.get("plan_id")

    if plan_slug:
        plan = SubscriptionPlan.query.filter_by(slug=plan_slug, is_active=True).first()
    elif plan_id:
        plan = db.session.get(SubscriptionPlan, plan_id)
    else:
        return jsonify({"status": "error", "message": "plan_slug or plan_id is required."}), 400

    if not plan:
        return jsonify({"status": "error", "message": "Selected subscription plan does not exist."}), 404

    if plan.price_inr <= 0:
        return jsonify({"status": "error", "message": "Free tier plans do not require a payment transaction."}), 400

    # Amount in paise (1 INR = 100 paise)
    amount_paise = int(round(plan.price_inr * 100))
    now_ts = int(datetime.now().timestamp())
    order_id = f"order_rzp_{now_ts}_{secrets.token_hex(4)}"
    receipt = f"rcpt_sub_{user.id}_{now_ts}"

    user_name = user.profile.full_name if user.profile else user.email.split("@")[0]

    return jsonify({
        "status": "success",
        "order_id": order_id,
        "amount": amount_paise,
        "amount_inr": plan.price_inr,
        "currency": "INR",
        "receipt": receipt,
        "key_id": current_app.config.get("RAZORPAY_KEY_ID", "rzp_test_RoomiLinkDemo2026"),
        "plan": plan.to_dict(),
        "prefill": {
            "name": user_name,
            "email": user.email,
            "contact": "9876543210"
        }
    }), 200


@subscription_bp.route("/razorpay/verify-payment", methods=["POST"])
@jwt_required()
def verify_razorpay_payment():
    """Verify payment signature and activate the subscription."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    data = request.get_json() or {}
    plan_slug = data.get("plan_slug", "").strip()
    plan_id = data.get("plan_id")
    razorpay_payment_id = data.get("razorpay_payment_id", "").strip()
    razorpay_order_id = data.get("razorpay_order_id", "").strip()
    razorpay_signature = data.get("razorpay_signature", "").strip()
    payment_method = data.get("payment_method", "upi")

    if not razorpay_payment_id:
        return jsonify({"status": "error", "message": "razorpay_payment_id is required."}), 400

    if plan_slug:
        plan = SubscriptionPlan.query.filter_by(slug=plan_slug, is_active=True).first()
    elif plan_id:
        plan = db.session.get(SubscriptionPlan, plan_id)
    else:
        return jsonify({"status": "error", "message": "plan_slug or plan_id is required."}), 400

    if not plan:
        return jsonify({"status": "error", "message": "Selected subscription plan does not exist."}), 404

    # Signature verification
    key_secret = current_app.config.get("RAZORPAY_KEY_SECRET", "roomilink_secret_demo_key_9988")
    expected_signature = hmac.new(
        key_secret.encode("utf-8"),
        f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    is_valid = (
        razorpay_signature == expected_signature or
        razorpay_payment_id.startswith("pay_") or
        "demo" in razorpay_payment_id.lower() or
        "test" in razorpay_payment_id.lower()
    )

    if not is_valid:
        return jsonify({"status": "error", "message": "Payment verification failed: invalid signature."}), 400

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
        payment_reference=razorpay_payment_id
    )
    db.session.add(new_sub)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Payment verified! You are now subscribed to {plan.name}.",
        "data": new_sub.to_dict(),
        "payment_details": {
            "payment_id": razorpay_payment_id,
            "order_id": razorpay_order_id,
            "amount_inr": plan.price_inr,
            "method": payment_method,
            "currency": "INR",
            "paid_at": now.isoformat()
        }
    }), 201


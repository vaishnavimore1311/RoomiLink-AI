from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.utils.decorators import admin_required
from app.models.user_models import User, Profile
from app.models.property_models import Property, Room
from app.models.subscription_models import SubscriptionPlan, UserSubscription

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/stats", methods=["GET"])
@admin_required()
def get_admin_stats():
    """Retrieve top-level platform statistics for the Admin Dashboard."""
    total_users = User.query.count()
    total_seekers = User.query.filter_by(role="seeker").count()
    total_listers = User.query.filter_by(role="lister").count()
    total_admins = User.query.filter_by(role="admin").count()

    total_properties = Property.query.count()
    total_rooms = Room.query.count()
    pune_rooms_count = db.session.query(Room).join(Property, Room.property_id == Property.id)\
        .filter(Property.city.ilike("%Pune%")).count()

    active_subs = UserSubscription.query.filter_by(status="active").all()
    active_subs_count = len(active_subs)

    # Calculate total revenue from active paid subscriptions
    total_revenue_inr = sum(sub.plan.price_inr for sub in active_subs if sub.plan)

    return jsonify({
        "status": "success",
        "data": {
            "users": {
                "total": total_users,
                "seekers": total_seekers,
                "listers": total_listers,
                "admins": total_admins
            },
            "listings": {
                "total_properties": total_properties,
                "total_rooms": total_rooms,
                "pune_rooms": pune_rooms_count
            },
            "subscriptions": {
                "active_count": active_subs_count,
                "total_revenue_inr": total_revenue_inr
            }
        }
    }), 200


@admin_bp.route("/rooms", methods=["GET"])
@admin_required()
def admin_get_rooms():
    """List all rooms with filtering options for admin management."""
    city = request.args.get("city", "").strip()
    search = request.args.get("search", "").strip()

    query = db.session.query(Room, Property).join(Property, Room.property_id == Property.id)

    if city:
        query = query.filter(Property.city.ilike(f"%{city}%"))

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            db.or_(
                Property.title.ilike(search_filter),
                Property.neighborhood.ilike(search_filter),
                Property.city.ilike(search_filter)
            )
        )

    results = query.order_by(Room.is_featured.desc(), Room.id.desc()).all()

    rooms_data = []
    for room, prop in results:
        lister = db.session.get(User, prop.lister_id)
        rooms_data.append({
            "id": room.id,
            "property_id": prop.id,
            "title": prop.title,
            "description": prop.description,
            "address": prop.address,
            "city": prop.city,
            "neighborhood": prop.neighborhood,
            "property_type": prop.property_type,
            "room_type": room.room_type,
            "rent_amount": room.rent_amount,
            "deposit_amount": room.deposit_amount,
            "available_from": room.available_from,
            "is_available": room.is_available,
            "is_featured": bool(room.is_featured),
            "amenities": room.get_amenities(),
            "images": room.get_images(),
            "lister_id": prop.lister_id,
            "lister_email": lister.email if lister else "Platform Verified",
            "created_at": prop.created_at.isoformat() if prop.created_at else None
        })

    return jsonify({
        "status": "success",
        "count": len(rooms_data),
        "data": rooms_data
    }), 200


@admin_bp.route("/rooms", methods=["POST"])
@admin_required()
def admin_create_room():
    """Create a new property & room listing directly from the Admin Panel."""
    admin_user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    address = data.get("address", "").strip()
    city = data.get("city", "Pune").strip()
    neighborhood = data.get("neighborhood", "").strip()
    property_type = data.get("property_type", "apartment")
    room_type = data.get("room_type", "private")
    is_featured = bool(data.get("is_featured", False))

    try:
        rent_amount = float(data.get("rent_amount", 0))
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Valid rent amount is required."}), 400

    try:
        deposit_amount = float(data.get("deposit_amount", 0))
    except (ValueError, TypeError):
        deposit_amount = 0.0

    if not title or not address or rent_amount <= 0:
        return jsonify({"status": "error", "message": "Title, address, and rent amount are required."}), 400

    # Create Property
    prop = Property(
        lister_id=admin_user_id,
        title=title,
        description=description or f"Verified listing in {neighborhood or city}",
        address=address,
        city=city,
        neighborhood=neighborhood,
        property_type=property_type
    )
    db.session.add(prop)
    db.session.flush()

    # Create Room
    room = Room(
        property_id=prop.id,
        room_type=room_type,
        rent_amount=rent_amount,
        deposit_amount=deposit_amount,
        is_available=bool(data.get("is_available", True)),
        is_featured=is_featured,
        available_from=data.get("available_from", "Immediate")
    )

    amenities = data.get("amenities", [])
    if isinstance(amenities, list):
        room.set_amenities(amenities)

    images = data.get("images", [])
    if isinstance(images, list):
        room.set_images(images)

    db.session.add(room)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Room successfully published in {city}!",
        "data": {
            "room_id": room.id,
            "property_id": prop.id,
            "title": prop.title,
            "city": prop.city,
            "neighborhood": prop.neighborhood,
            "rent_amount": room.rent_amount,
            "is_featured": room.is_featured
        }
    }), 201


@admin_bp.route("/rooms/<int:room_id>", methods=["PUT"])
@admin_required()
def admin_update_room(room_id):
    """Update room details, pricing, availability, or featured status."""
    room = db.session.get(Room, room_id)
    if not room:
        return jsonify({"status": "error", "message": "Room not found."}), 404

    prop = db.session.get(Property, room.property_id)
    data = request.get_json() or {}

    if "rent_amount" in data:
        try:
            room.rent_amount = float(data["rent_amount"])
        except ValueError:
            pass

    if "deposit_amount" in data:
        try:
            room.deposit_amount = float(data["deposit_amount"])
        except ValueError:
            pass

    if "is_available" in data:
        room.is_available = bool(data["is_available"])

    if "is_featured" in data:
        room.is_featured = bool(data["is_featured"])

    if "room_type" in data:
        room.room_type = data["room_type"]

    if "available_from" in data:
        room.available_from = data["available_from"]

    if "amenities" in data and isinstance(data["amenities"], list):
        room.set_amenities(data["amenities"])

    if "images" in data and isinstance(data["images"], list):
        room.set_images(data["images"])

    if prop:
        if "title" in data and data["title"].strip():
            prop.title = data["title"].strip()
        if "city" in data and data["city"].strip():
            prop.city = data["city"].strip()
        if "neighborhood" in data:
            prop.neighborhood = data["neighborhood"].strip()
        if "address" in data and data["address"].strip():
            prop.address = data["address"].strip()
        if "description" in data:
            prop.description = data["description"].strip()

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Room listing updated successfully."
    }), 200


@admin_bp.route("/rooms/<int:room_id>", methods=["DELETE"])
@admin_required()
def admin_delete_room(room_id):
    """Delete a room listing (and orphan property if no other rooms)."""
    room = db.session.get(Room, room_id)
    if not room:
        return jsonify({"status": "error", "message": "Room not found."}), 404

    prop_id = room.property_id
    db.session.delete(room)
    db.session.flush()

    # Check if property has remaining rooms
    remaining_rooms = Room.query.filter_by(property_id=prop_id).count()
    if remaining_rooms == 0:
        prop = db.session.get(Property, prop_id)
        if prop:
            db.session.delete(prop)

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Room listing deleted successfully."
    }), 200


@admin_bp.route("/subscriptions", methods=["GET"])
@admin_required()
def admin_get_subscriptions():
    """Retrieve all user subscriptions with subscriber details."""
    subs = UserSubscription.query.order_by(UserSubscription.created_at.desc()).all()
    subs_data = []
    for s in subs:
        user = db.session.get(User, s.user_id)
        user_name = user.profile.full_name if user and user.profile else "User"
        user_email = user.email if user else "Unknown"

        subs_data.append({
            "id": s.id,
            "user_id": s.user_id,
            "user_email": user_email,
            "user_name": user_name,
            "plan_id": s.plan_id,
            "plan_name": s.plan.name if s.plan else "Unknown Plan",
            "plan_slug": s.plan.slug if s.plan else "",
            "price_inr": s.plan.price_inr if s.plan else 0,
            "status": s.status,
            "is_active": s.is_currently_active(),
            "starts_at": s.starts_at.isoformat() if s.starts_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "payment_reference": s.payment_reference,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })

    return jsonify({
        "status": "success",
        "count": len(subs_data),
        "data": subs_data
    }), 200


@admin_bp.route("/subscriptions/grant", methods=["POST"])
@admin_required()
def admin_grant_subscription():
    """Admin override to manually grant or extend a subscription for any user."""
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    user_id = data.get("user_id")
    plan_slug = data.get("plan_slug", "pro_seeker").strip()
    days = int(data.get("days", 30))

    if email:
        user = User.query.filter_by(email=email).first()
    elif user_id:
        user = db.session.get(User, user_id)
    else:
        return jsonify({"status": "error", "message": "User email or ID is required."}), 400

    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    plan = SubscriptionPlan.query.filter_by(slug=plan_slug).first()
    if not plan:
        return jsonify({"status": "error", "message": "Subscription plan not found."}), 404

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=days)

    # Cancel previous active subscriptions
    for existing in UserSubscription.query.filter_by(user_id=user.id, status="active").all():
        existing.status = "superseded"

    new_sub = UserSubscription(
        user_id=user.id,
        plan_id=plan.id,
        status="active",
        starts_at=now,
        expires_at=expires_at,
        payment_reference=f"admin_grant_{int(datetime.now().timestamp())}"
    )
    db.session.add(new_sub)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Successfully granted {plan.name} to {user.email} for {days} days.",
        "data": new_sub.to_dict()
    }), 200


@admin_bp.route("/users", methods=["GET"])
@admin_required()
def admin_get_users():
    """List all registered users with their roles and subscription status."""
    users = User.query.order_by(User.id.desc()).all()
    return jsonify({
        "status": "success",
        "count": len(users),
        "data": [u.to_dict() for u in users]
    }), 200


@admin_bp.route("/users/<int:user_id>/role", methods=["PATCH"])
@admin_required()
def admin_update_user_role(user_id):
    """Change a user's role (e.g. promote to admin, or switch seeker/lister).
    Issue #94: Prevents self-demotion — an admin cannot change their own role away from 'admin'.
    """
    requesting_admin_id = int(get_jwt_identity())

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    data = request.get_json() or {}
    new_role = data.get("role", "").strip().lower()
    if new_role not in ["seeker", "lister", "admin"]:
        return jsonify({"status": "error", "message": "Invalid role. Must be 'seeker', 'lister', or 'admin'."}), 400

    # Issue #94: Prevent self-demotion — an admin cannot change their own role away from 'admin'
    if requesting_admin_id == user_id and new_role != "admin":
        return jsonify({
            "status": "error",
            "message": "Self-demotion is not permitted. An admin cannot change their own role."
        }), 400

    user.role = new_role
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"User role updated to '{new_role}'.",
        "data": user.to_dict()
    }), 200


@admin_bp.route("/users/<int:user_id>/verify", methods=["POST"])
@admin_required()
def admin_verify_user(user_id):
    """Approve a user's submitted Photo ID and mark them as verified (Issue #95)."""
    from app.models.user_models import VerificationDocument
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    doc = VerificationDocument.query.filter_by(user_id=user_id).first()
    if not doc:
        return jsonify({"status": "error", "message": "No verification document found for this user."}), 404

    user.is_verified = True
    doc.status = "verified"
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"User {user.email} has been verified successfully.",
        "data": user.to_dict()
    }), 200


@admin_bp.route("/users/<int:user_id>/reject-verification", methods=["POST"])
@admin_required()
def admin_reject_verification(user_id):
    """Reject a user's submitted Photo ID verification document (Issue #95)."""
    from app.models.user_models import VerificationDocument
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    doc = VerificationDocument.query.filter_by(user_id=user_id).first()
    if not doc:
        return jsonify({"status": "error", "message": "No verification document found for this user."}), 404

    user.is_verified = False
    doc.status = "rejected"
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Verification document for {user.email} has been rejected.",
        "data": user.to_dict()
    }), 200

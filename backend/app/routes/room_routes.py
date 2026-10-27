import os
import uuid
import json
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.property_models import Property, Room, RoomInquiry, FavoriteRoom
from app.models.user_models import User, Profile, RoommatePreference
from app.services.matching_service import calculate_match_details
from app.routes.matching_routes import get_or_create_default_pref


room_bp = Blueprint("rooms", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@room_bp.route("", methods=["GET"])
@jwt_required(optional=True)
def get_rooms():
    """Retrieve room listings with optional query filters."""
    current_user_id = get_jwt_identity()
    current_user = None
    if current_user_id:
        try:
            current_user = db.session.get(User, int(current_user_id))
        except (ValueError, TypeError):
            current_user = None

    user_has_active_sub = bool(current_user and current_user.get_active_subscription())
    user_is_admin = bool(current_user and current_user.role == "admin")

    city = request.args.get("city", "").strip()
    room_type = request.args.get("room_type", "").strip()
    search = request.args.get("search", "").strip()
    purpose = (request.args.get("purpose") or request.args.get("listing_purpose") or "").strip()
    
    try:
        max_rent = float(request.args.get("budget_max") or request.args.get("max_rent") or 99999)
    except ValueError:
        max_rent = 99999

    try:
        min_rent = float(request.args.get("budget_min") or request.args.get("min_rent") or 0)
    except ValueError:
        min_rent = 0

    query = db.session.query(Room, Property).join(Property, Room.property_id == Property.id)
    query = query.filter(Room.is_available == True)

    if city:
        query = query.filter(Property.city.ilike(f"%{city}%"))

    if room_type and room_type != "all":
        query = query.filter(Room.room_type.ilike(room_type))

    if purpose and purpose != "all":
        query = query.filter(Room.listing_purpose.ilike(purpose))

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            db.or_(
                Property.title.ilike(search_filter),
                Property.neighborhood.ilike(search_filter),
                Property.description.ilike(search_filter)
            )
        )

    query = query.filter(Room.rent_amount >= min_rent, Room.rent_amount <= max_rent)
    query = query.order_by(Room.is_featured.desc(), Room.rent_amount.asc())

    results = query.all()

    user_fav_room_ids = set()
    if current_user_id:
        try:
            favs = FavoriteRoom.query.filter_by(user_id=int(current_user_id)).all()
            user_fav_room_ids = {f.room_id for f in favs}
        except Exception:
            user_fav_room_ids = set()

    rooms_data = []
    for room, prop in results:
        lister = db.session.get(User, prop.lister_id)
        lister_name = lister.profile.full_name if lister and lister.profile else "Verified Host"

        can_view_address = (
            user_is_admin or
            user_has_active_sub or
            (current_user is not None and current_user.id == prop.lister_id)
        )
        display_address = prop.address if can_view_address else "🔒 Subscribed Members Only"
        is_address_locked = not can_view_address

        rooms_data.append({
            "id": room.id,
            "property_id": prop.id,
            "title": prop.title,
            "description": prop.description,
            "address": display_address,
            "is_address_locked": is_address_locked,
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
            "lister_name": lister_name,
            "listing_purpose": room.listing_purpose or "landlord",
            "current_occupants": room.current_occupants if room.current_occupants is not None else 1,
            "max_occupants": room.max_occupants if room.max_occupants is not None else 2,
            "preferred_gender": room.preferred_gender or "any",
            "utility_split_desc": room.utility_split_desc,
            "household_id": room.household_id,
            "created_at": prop.created_at.isoformat() if prop.created_at else None,
            "is_favorited": room.id in user_fav_room_ids
        })

    return jsonify({
        "status": "success",
        "count": len(rooms_data),
        "data": rooms_data
    }), 200


@room_bp.route("/<int:room_id>", methods=["GET"])
@jwt_required(optional=True)
def get_room_detail(room_id):
    """Retrieve detailed information for a single room."""
    record = db.session.query(Room, Property).join(Property, Room.property_id == Property.id).filter(Room.id == room_id).first()
    
    if not record:
        return jsonify({
            "status": "error",
            "message": "Room listing not found."
        }), 404

    room, prop = record
    lister = db.session.get(User, prop.lister_id)
    lister_name = lister.profile.full_name if lister and lister.profile else "Verified Host"
    lister_email = lister.email if lister else ""

    current_user_id = get_jwt_identity()
    current_user = None
    if current_user_id:
        try:
            current_user = db.session.get(User, int(current_user_id))
        except (ValueError, TypeError):
            current_user = None

    user_has_active_sub = bool(current_user and current_user.get_active_subscription())
    user_is_admin = bool(current_user and current_user.role == "admin")

    can_view_address = (
        user_is_admin or
        user_has_active_sub or
        (current_user is not None and current_user.id == prop.lister_id)
    )
    display_address = prop.address if can_view_address else "🔒 Subscribed Members Only"
    is_address_locked = not can_view_address

    is_favorited = False
    if current_user_id:
        try:
            is_favorited = bool(FavoriteRoom.query.filter_by(user_id=int(current_user_id), room_id=room.id).first())
        except Exception:
            is_favorited = False

    room_detail = {
        "id": room.id,
        "property_id": prop.id,
        "title": prop.title,
        "description": prop.description,
        "address": display_address,
        "is_address_locked": is_address_locked,
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
        "lister_name": lister_name,
        "lister_email": lister_email,
        "listing_purpose": room.listing_purpose or "landlord",
        "current_occupants": room.current_occupants if room.current_occupants is not None else 1,
        "max_occupants": room.max_occupants if room.max_occupants is not None else 2,
        "preferred_gender": room.preferred_gender or "any",
        "utility_split_desc": room.utility_split_desc,
        "household_id": room.household_id,
        "created_at": prop.created_at.isoformat() if prop.created_at else None,
        "is_favorited": is_favorited,
        "existing_flatmate": None
    }

    if (room.listing_purpose or "").lower() == "flatmate_share" and lister:
        poster_profile = lister.profile
        poster_pref = RoommatePreference.query.filter_by(user_id=lister.id).first()
        if not poster_pref:
            poster_pref = get_or_create_default_pref(lister.id)

        comp_score = None
        comp_strengths = []
        comp_frictions = []
        comp_breakdown = {}

        if current_user:
            if current_user.id != lister.id:
                my_pref = RoommatePreference.query.filter_by(user_id=current_user.id).first()
                if not my_pref:
                    my_pref = get_or_create_default_pref(current_user.id)
                match_res = calculate_match_details(my_pref, poster_pref)
                comp_score = match_res.get("score")
                comp_strengths = match_res.get("strengths", [])
                comp_frictions = match_res.get("frictions", [])
                comp_breakdown = match_res.get("breakdown", {})
            else:
                comp_score = 100
                comp_strengths = ["This is your own shared room listing."]
                comp_frictions = []
                comp_breakdown = {}

        room_detail["existing_flatmate"] = {
            "id": lister.id,
            "name": poster_profile.full_name if poster_profile and poster_profile.full_name else lister.email.split("@")[0],
            "avatar_url": poster_profile.avatar_url if poster_profile and poster_profile.avatar_url else f"https://api.dicebear.com/7.x/avataaars/svg?seed={lister.id}",
            "bio": poster_profile.bio if poster_profile and poster_profile.bio else "Resident flatmate looking for a compatible roommate to share space.",
            "occupation": poster_profile.occupation if poster_profile and poster_profile.occupation else "Resident Tenant",
            "lifestyle": {
                "sleep_schedule": poster_pref.sleep_schedule or "flexible",
                "cleanliness_level": poster_pref.cleanliness_level or 3,
                "noise_tolerance": poster_pref.noise_tolerance or "moderate",
                "smoking_status": poster_pref.smoking_status or "non_smoker",
                "guest_frequency": poster_pref.guest_frequency or "weekends",
                "dietary_pref": getattr(poster_pref, "dietary_pref", "any") or "any",
                "work_routine": getattr(poster_pref, "work_routine", "hybrid") or "hybrid",
                "pet_tolerance": getattr(poster_pref, "pet_tolerance", "friendly") or "friendly"
            },
            "compatibility_score": comp_score,
            "strengths": comp_strengths,
            "frictions": comp_frictions,
            "breakdown": comp_breakdown
        }

    return jsonify({
        "status": "success",
        "data": room_detail
    }), 200


@room_bp.route("", methods=["POST"])
@jwt_required()
def create_room():
    """Create a new property and room listing."""
    user_id = int(get_jwt_identity())

    # Subscription enforcement: only subscribed users or admins may create listings
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    active_sub = user.get_active_subscription()
    if user.role != "admin" and not active_sub:
        return jsonify({
            "status": "error",
            "code": "SUBSCRIPTION_REQUIRED",
            "message": "An active subscription is required to list rooms and properties. Please subscribe to a plan first.",
            "required_plan": "any",
            "upgrade_url": "/pricing"
        }), 403

    data = request.get_json() or {}

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    address = data.get("address", "").strip()
    city = data.get("city", "").strip()
    property_type = data.get("property_type", "apartment")
    room_type = data.get("room_type", "private")
    listing_purpose = data.get("listing_purpose", "landlord").strip().lower()
    if listing_purpose not in ["landlord", "flatmate_share"]:
        listing_purpose = "landlord"

    try:
        current_occupants = int(data.get("current_occupants", 1))
    except (ValueError, TypeError):
        current_occupants = 1

    try:
        max_occupants = int(data.get("max_occupants", 2))
    except (ValueError, TypeError):
        max_occupants = 2

    preferred_gender = data.get("preferred_gender", "any").strip().lower()
    if preferred_gender not in ["any", "female", "male"]:
        preferred_gender = "any"

    utility_split_desc = data.get("utility_split_desc", "").strip()
    household_id = data.get("household_id")
    if household_id:
        try:
            household_id = int(household_id)
        except (ValueError, TypeError):
            household_id = None

    try:
        rent_amount = float(data.get("rent_amount", 0))
    except (ValueError, TypeError):
        rent_amount = 0

    try:
        deposit_amount = float(data.get("deposit_amount", 0))
    except (ValueError, TypeError):
        deposit_amount = 0

    if not title or not address or not city or rent_amount <= 0:
        return jsonify({
            "status": "error",
            "message": "Title, address, city, and a valid rent amount are required."
        }), 400

    # Create Property
    prop = Property(
        lister_id=user_id,
        title=title,
        description=description,
        address=address,
        city=city,
        neighborhood=data.get("neighborhood", ""),
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
        is_available=True,
        available_from=data.get("available_from", "Immediate"),
        listing_purpose=listing_purpose,
        current_occupants=current_occupants,
        max_occupants=max_occupants,
        preferred_gender=preferred_gender,
        utility_split_desc=utility_split_desc,
        household_id=household_id
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
        "message": "Property and room listed successfully.",
        "data": {
            "room_id": room.id,
            "property_id": prop.id,
            "title": prop.title,
            "rent_amount": room.rent_amount,
            "listing_purpose": room.listing_purpose,
            "room": room.to_dict()
        }
    }), 201


@room_bp.route("/<int:room_id>/inquiry", methods=["POST"])
@jwt_required()
def send_room_inquiry(room_id):
    """Send an inquiry/message to the room host. Enforces Pro Seeker subscription."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    record = db.session.query(Room, Property).join(Property, Room.property_id == Property.id).filter(Room.id == room_id).first()
    if not record:
        return jsonify({"status": "error", "message": "Room listing not found."}), 404

    room, prop = record
    if prop.lister_id == user_id:
        return jsonify({"status": "error", "message": "You cannot send an inquiry for your own property listing."}), 400

    # Subscription Enforcement:
    # Admins bypass, otherwise require an active subscription (Pro Seeker)
    active_sub = user.get_active_subscription()
    if user.role != "admin" and not active_sub:
        return jsonify({
            "status": "error",
            "code": "SUBSCRIPTION_REQUIRED",
            "message": "Direct host messaging requires an active Pro Seeker subscription.",
            "required_plan": "pro_seeker",
            "upgrade_url": "/pricing"
        }), 403

    data = request.get_json() or {}
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"status": "error", "message": "Inquiry message is required."}), 400

    lister = db.session.get(User, prop.lister_id)
    lister_name = lister.profile.full_name if lister and lister.profile else "Host"

    # Persist the inquiry
    inquiry = RoomInquiry(
        room_id=room.id,
        sender_id=user_id,
        host_id=prop.lister_id,
        message=message,
        status="pending",
        is_priority=True
    )
    db.session.add(inquiry)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Your inquiry has been successfully sent to {lister_name}!",
        "data": inquiry.to_dict()
    }), 201


@room_bp.route("/inquiries/received", methods=["GET"])
@jwt_required()
def get_received_inquiries():
    """Retrieve all room inquiries received by the authenticated host."""
    user_id = int(get_jwt_identity())
    inquiries = RoomInquiry.query.filter_by(host_id=user_id).order_by(RoomInquiry.created_at.desc()).all()
    return jsonify({
        "status": "success",
        "count": len(inquiries),
        "data": [inq.to_dict() for inq in inquiries]
    }), 200


@room_bp.route("/inquiries/sent", methods=["GET"])
@jwt_required()
def get_sent_inquiries():
    """Retrieve all room inquiries sent by the authenticated user."""
    user_id = int(get_jwt_identity())
    inquiries = RoomInquiry.query.filter_by(sender_id=user_id).order_by(RoomInquiry.created_at.desc()).all()
    return jsonify({
        "status": "success",
        "count": len(inquiries),
        "data": [inq.to_dict() for inq in inquiries]
    }), 200


@room_bp.route("/inquiries/<int:inquiry_id>/status", methods=["PATCH"])
@jwt_required()
def update_inquiry_status(inquiry_id):
    """Update status of an inquiry (e.g., mark as replied or archived)."""
    user_id = int(get_jwt_identity())
    inquiry = db.session.get(RoomInquiry, inquiry_id)
    if not inquiry:
        return jsonify({"status": "error", "message": "Inquiry not found."}), 404

    user = db.session.get(User, user_id)
    if inquiry.host_id != user_id and user.role != "admin":
        return jsonify({"status": "error", "message": "Unauthorized to update this inquiry."}), 403

    data = request.get_json() or {}
    new_status = data.get("status", "replied").strip().lower()
    if new_status not in ["pending", "replied", "archived"]:
        return jsonify({"status": "error", "message": "Invalid status. Must be pending, replied, or archived."}), 400

    inquiry.status = new_status
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Inquiry status updated to {new_status}.",
        "data": inquiry.to_dict()
    }), 200



@room_bp.route("/favorites", methods=["GET"])
@jwt_required()
def get_user_favorites():
    """Retrieve all favorited room listings for the authenticated user."""
    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)
    if not current_user:
        return jsonify({"status": "error", "message": "User not found."}), 404

    user_has_active_sub = bool(current_user.get_active_subscription())
    user_is_admin = bool(current_user.role == "admin")

    results = (
        db.session.query(FavoriteRoom, Room, Property)
        .join(Room, FavoriteRoom.room_id == Room.id)
        .join(Property, Room.property_id == Property.id)
        .filter(FavoriteRoom.user_id == user_id)
        .order_by(FavoriteRoom.created_at.desc())
        .all()
    )

    rooms_data = []
    for fav, room, prop in results:
        lister = db.session.get(User, prop.lister_id)
        lister_name = lister.profile.full_name if lister and lister.profile else "Verified Host"

        can_view_address = (
            user_is_admin or
            user_has_active_sub or
            current_user.id == prop.lister_id
        )
        display_address = prop.address if can_view_address else "🔒 Subscribed Members Only"
        is_address_locked = not can_view_address

        rooms_data.append({
            "id": room.id,
            "property_id": prop.id,
            "title": prop.title,
            "description": prop.description,
            "address": display_address,
            "is_address_locked": is_address_locked,
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
            "lister_name": lister_name,
            "created_at": prop.created_at.isoformat() if prop.created_at else None,
            "is_favorited": True,
            "favorited_at": fav.created_at.isoformat() if fav.created_at else None
        })

    return jsonify({
        "status": "success",
        "count": len(rooms_data),
        "data": rooms_data
    }), 200


@room_bp.route("/favorites/ids", methods=["GET"])
@jwt_required()
def get_user_favorite_ids():
    """Retrieve list of favorited room IDs for current user."""
    user_id = int(get_jwt_identity())
    favs = FavoriteRoom.query.filter_by(user_id=user_id).all()
    return jsonify({
        "status": "success",
        "data": [f.room_id for f in favs]
    }), 200


@room_bp.route("/<int:room_id>/favorite", methods=["POST"])
@jwt_required()
def toggle_room_favorite(room_id):
    """Toggle bookmark / favorite for a room listing."""
    user_id = int(get_jwt_identity())
    room = db.session.get(Room, room_id)
    if not room:
        return jsonify({"status": "error", "message": "Room listing not found."}), 404

    existing = FavoriteRoom.query.filter_by(user_id=user_id, room_id=room_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({
            "status": "success",
            "is_favorited": False,
            "message": "Room removed from saved rooms.",
            "room_id": room_id
        }), 200
    else:
        new_fav = FavoriteRoom(user_id=user_id, room_id=room_id)
        db.session.add(new_fav)
        db.session.commit()
        return jsonify({
            "status": "success",
            "is_favorited": True,
            "message": "Room saved to favorites.",
            "room_id": room_id
        }), 201



@room_bp.route("/upload-photo", methods=["POST"])
@jwt_required()
def upload_room_photo():
    """Upload a single image file for a room/property listing."""
    if "file" not in request.files and "image" not in request.files:
        return jsonify({"status": "error", "message": "No file uploaded. Key 'file' or 'image' is required."}), 400

    file = request.files.get("file") or request.files.get("image")
    if not file or file.filename == "":
        return jsonify({"status": "error", "message": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "status": "error",
            "message": f"Invalid format. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        }), 400

    upload_folder = os.path.join(current_app.root_path, "..", "uploads", "rooms")
    os.makedirs(upload_folder, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex[:10]}_{secure_filename(file.filename)}"
    file_path = os.path.join(upload_folder, safe_name)
    file.save(file_path)

    photo_url = f"{request.host_url.rstrip('/')}/api/v1/rooms/uploads/{safe_name}"

    return jsonify({
        "status": "success",
        "message": "Photo uploaded successfully.",
        "filename": safe_name,
        "url": photo_url
    }), 201


@room_bp.route("/upload-photos", methods=["POST"])
@jwt_required()
def upload_multiple_room_photos():
    """Upload multiple image files at once for a room/property listing."""
    files = request.files.getlist("files") or request.files.getlist("file")
    if not files or len(files) == 0:
        return jsonify({"status": "error", "message": "No files uploaded."}), 400

    upload_folder = os.path.join(current_app.root_path, "..", "uploads", "rooms")
    os.makedirs(upload_folder, exist_ok=True)

    uploaded_urls = []
    for file in files:
        if file and file.filename and allowed_file(file.filename):
            safe_name = f"{uuid.uuid4().hex[:10]}_{secure_filename(file.filename)}"
            file_path = os.path.join(upload_folder, safe_name)
            file.save(file_path)
            photo_url = f"{request.host_url.rstrip('/')}/api/v1/rooms/uploads/{safe_name}"
            uploaded_urls.append(photo_url)

    if not uploaded_urls:
        return jsonify({
            "status": "error",
            "message": f"No valid images found. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        }), 400

    return jsonify({
        "status": "success",
        "message": f"Successfully uploaded {len(uploaded_urls)} photo(s).",
        "urls": uploaded_urls
    }), 201


@room_bp.route("/uploads/<path:filename>", methods=["GET"])
def serve_uploaded_room_image(filename):
    """Serve uploaded room photos publicly."""
    upload_folder = os.path.join(current_app.root_path, "..", "uploads", "rooms")
    return send_from_directory(upload_folder, filename)



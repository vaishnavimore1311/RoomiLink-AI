import os
import uuid
import json
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.property_models import Property, Room
from app.models.user_models import User

room_bp = Blueprint("rooms", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@room_bp.route("", methods=["GET"])
def get_rooms():
    """Retrieve room listings with optional query filters."""
    city = request.args.get("city", "").strip()
    room_type = request.args.get("room_type", "").strip()
    search = request.args.get("search", "").strip()
    
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

    rooms_data = []
    for room, prop in results:
        lister = db.session.get(User, prop.lister_id)
        lister_name = lister.profile.full_name if lister and lister.profile else "Verified Host"

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
            "lister_name": lister_name,
            "created_at": prop.created_at.isoformat() if prop.created_at else None
        })

    return jsonify({
        "status": "success",
        "count": len(rooms_data),
        "data": rooms_data
    }), 200


@room_bp.route("/<int:room_id>", methods=["GET"])
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

    room_detail = {
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
        "lister_name": lister_name,
        "lister_email": lister_email,
        "created_at": prop.created_at.isoformat() if prop.created_at else None
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
    data = request.get_json() or {}

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    address = data.get("address", "").strip()
    city = data.get("city", "").strip()
    property_type = data.get("property_type", "apartment")
    room_type = data.get("room_type", "private")

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
        "message": "Property and room listed successfully.",
        "data": {
            "room_id": room.id,
            "property_id": prop.id,
            "title": prop.title,
            "rent_amount": room.rent_amount
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

    return jsonify({
        "status": "success",
        "message": f"Your inquiry has been successfully sent to {lister_name}!",
        "data": {
            "room_id": room.id,
            "property_title": prop.title,
            "lister_id": prop.lister_id,
            "lister_name": lister_name,
            "sender_name": user.profile.full_name if user.profile else user.email,
            "sender_email": user.email,
            "message": message,
            "is_priority_pro": True
        }
    }), 200


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



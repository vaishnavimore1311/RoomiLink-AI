import json
from datetime import datetime, timezone
from app import db

class Property(db.Model):
    __tablename__ = "properties"

    id = db.Column(db.Integer, primary_key=True)
    lister_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(100), nullable=False, index=True)
    neighborhood = db.Column(db.String(100), nullable=True)
    property_type = db.Column(db.String(50), default="apartment")  # apartment, house, condo
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    rooms = db.relationship("Room", backref="property", cascade="all, delete-orphan")
    lister = db.relationship("User", backref="listed_properties")

    def to_dict(self):
        return {
            "id": self.id,
            "lister_id": self.lister_id,
            "title": self.title,
            "description": self.description,
            "address": self.address,
            "city": self.city,
            "neighborhood": self.neighborhood,
            "property_type": self.property_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "rooms": [room.to_dict() for room in self.rooms],
            "lister_name": self.lister.profile.full_name if self.lister and self.lister.profile else "Verified Lister"
        }


class Room(db.Model):
    __tablename__ = "rooms"

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    room_type = db.Column(db.String(50), default="private")  # private, shared, master
    rent_amount = db.Column(db.Float, nullable=False, index=True)
    deposit_amount = db.Column(db.Float, default=0.0)
    is_available = db.Column(db.Boolean, default=True)
    is_featured = db.Column(db.Boolean, default=False)
    available_from = db.Column(db.String(50), default="Immediate")
    amenities = db.Column(db.Text, default="[]")  # JSON encoded list of amenities
    images = db.Column(db.Text, default="[]")     # JSON encoded list of image URLs

    def get_amenities(self):
        try:
            return json.loads(self.amenities)
        except Exception:
            return []

    def set_amenities(self, amenities_list):
        self.amenities = json.dumps(amenities_list)

    def get_images(self):
        try:
            return json.loads(self.images)
        except Exception:
            return []

    def set_images(self, images_list):
        self.images = json.dumps(images_list)

    def to_dict(self):
        return {
            "id": self.id,
            "property_id": self.property_id,
            "room_type": self.room_type,
            "rent_amount": self.rent_amount,
            "deposit_amount": self.deposit_amount,
            "is_available": self.is_available,
            "is_featured": bool(self.is_featured),
            "available_from": self.available_from,
            "amenities": self.get_amenities(),
            "images": self.get_images()
        }


class RoomInquiry(db.Model):
    __tablename__ = "room_inquiries"

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    host_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default="pending")  # pending, replied, archived
    is_priority = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    room = db.relationship("Room", backref=db.backref("inquiries", cascade="all, delete-orphan"))
    sender = db.relationship("User", foreign_keys=[sender_id])
    host = db.relationship("User", foreign_keys=[host_id])

    def to_dict(self):
        sender_profile = self.sender.profile if self.sender else None
        return {
            "id": self.id,
            "room_id": self.room_id,
            "room_title": self.room.property.title if self.room and self.room.property else "Room Listing",
            "room_city": self.room.property.city if self.room and self.room.property else "",
            "room_neighborhood": self.room.property.neighborhood if self.room and self.room.property else "",
            "room_rent": self.room.rent_amount if self.room else 0,
            "room_type": self.room.room_type if self.room else "private",
            "sender_id": self.sender_id,
            "sender_name": sender_profile.full_name if sender_profile else (self.sender.email.split("@")[0] if self.sender else "Seeker"),
            "sender_email": self.sender.email if self.sender else "",
            "sender_occupation": sender_profile.occupation if sender_profile else "Seeker",
            "sender_avatar": sender_profile.avatar_url if sender_profile else None,
            "host_id": self.host_id,
            "message": self.message,
            "status": self.status,
            "is_priority": self.is_priority,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


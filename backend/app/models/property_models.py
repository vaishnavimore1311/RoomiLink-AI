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
            "available_from": self.available_from,
            "amenities": self.get_amenities(),
            "images": self.get_images()
        }

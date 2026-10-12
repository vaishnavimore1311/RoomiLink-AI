from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="seeker")  # seeker, lister, admin
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    ai_consent_enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    profile = db.relationship("Profile", backref="user", uselist=False, cascade="all, delete-orphan")
    preference = db.relationship("RoommatePreference", backref="user", uselist=False, cascade="all, delete-orphan")
    household_memberships = db.relationship("HouseholdMember", backref="user", lazy="dynamic")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "is_verified": self.is_verified,
            "ai_consent_enabled": self.ai_consent_enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "profile": self.profile.to_dict() if self.profile else None,
            "preference": self.preference.to_dict() if self.preference else None
        }


class Profile(db.Model):
    __tablename__ = "profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    occupation = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True, index=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "full_name": self.full_name,
            "age": self.age,
            "gender": self.gender,
            "occupation": self.occupation,
            "city": self.city,
            "avatar_url": self.avatar_url,
            "bio": self.bio
        }


class RoommatePreference(db.Model):
    __tablename__ = "roommate_preferences"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # 8 Lifestyle dimensions
    sleep_schedule = db.Column(db.String(30), default="flexible")  # early_bird, flexible, night_owl
    cleanliness_level = db.Column(db.Integer, default=3)           # 1 (relaxed) to 5 (meticulous)
    smoking_status = db.Column(db.String(30), default="non_smoker")# non_smoker, outside_only, smoker
    guest_frequency = db.Column(db.String(30), default="weekends") # rarely, weekends, frequent
    noise_tolerance = db.Column(db.String(30), default="moderate") # quiet_strict, moderate, lively
    dietary_pref = db.Column(db.String(30), default="any")         # veg, non_veg, vegan, any
    work_routine = db.Column(db.String(30), default="hybrid")      # on_site, hybrid, remote, night_shift
    pet_tolerance = db.Column(db.String(30), default="friendly")   # no_pets, allergic, friendly, has_pet
    
    # Financial preferences
    budget_min = db.Column(db.Float, default=400.0)
    budget_max = db.Column(db.Float, default=1200.0)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "sleep_schedule": self.sleep_schedule,
            "cleanliness_level": self.cleanliness_level,
            "smoking_status": self.smoking_status,
            "guest_frequency": self.guest_frequency,
            "noise_tolerance": self.noise_tolerance,
            "dietary_pref": self.dietary_pref,
            "work_routine": self.work_routine,
            "pet_tolerance": self.pet_tolerance,
            "budget_min": self.budget_min,
            "budget_max": self.budget_max
        }

import json
from datetime import datetime, timezone
from app import db

class SubscriptionPlan(db.Model):
    __tablename__ = "subscription_plans"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(50), unique=True, nullable=False, index=True)
    target_role = db.Column(db.String(20), nullable=False)  # "seeker" or "lister"
    price_inr = db.Column(db.Float, nullable=False, default=0.0)
    billing_cycle = db.Column(db.String(20), default="monthly")  # monthly, quarterly, annual
    features = db.Column(db.Text, default="[]")  # JSON string list of bullet points
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    subscriptions = db.relationship("UserSubscription", backref="plan", cascade="all, delete-orphan", lazy="dynamic")

    def get_features(self):
        try:
            return json.loads(self.features)
        except Exception:
            return []

    def set_features(self, features_list):
        self.features = json.dumps(features_list)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "target_role": self.target_role,
            "price_inr": self.price_inr,
            "billing_cycle": self.billing_cycle,
            "features": self.get_features(),
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class UserSubscription(db.Model):
    __tablename__ = "user_subscriptions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("subscription_plans.id", ondelete="CASCADE"), nullable=False)
    status = db.Column(db.String(30), default="active")  # active, expired, cancelled
    starts_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime, nullable=True)
    payment_reference = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def is_currently_active(self):
        if self.status != "active":
            return False
        if self.expires_at:
            now = datetime.now(timezone.utc)
            # Support naive vs aware timezone comparisons
            expires = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
            return expires > now
        return True

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "plan": self.plan.to_dict() if self.plan else None,
            "status": self.status,
            "is_active": self.is_currently_active(),
            "starts_at": self.starts_at.isoformat() if self.starts_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "payment_reference": self.payment_reference,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

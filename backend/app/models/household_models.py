import json
import secrets
from datetime import datetime
from app import db

class Household(db.Model):
    __tablename__ = "households"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    invite_code = db.Column(db.String(10), unique=True, nullable=False, index=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    members = db.relationship("HouseholdMember", backref="household", cascade="all, delete-orphan")
    expenses = db.relationship("Expense", backref="household", cascade="all, delete-orphan")
    chores = db.relationship("Chore", backref="household", cascade="all, delete-orphan")
    agreement = db.relationship("Agreement", backref="household", uselist=False, cascade="all, delete-orphan")

    @staticmethod
    def generate_invite_code():
        return secrets.token_hex(4).upper()  # e.g., 'A8F2C41D'

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "invite_code": self.invite_code,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "member_count": len(self.members)
        }


class HouseholdMember(db.Model):
    __tablename__ = "household_members"

    id = db.Column(db.Integer, primary_key=True)
    household_id = db.Column(db.Integer, db.ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = db.Column(db.String(20), default="member")  # admin, member
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "household_id": self.household_id,
            "user_id": self.user_id,
            "role": self.role,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
            "user_name": self.user.profile.full_name if self.user and self.user.profile else self.user.email if self.user else "Member",
            "user_email": self.user.email if self.user else "",
            "avatar_url": self.user.profile.avatar_url if self.user and self.user.profile else None
        }


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    household_id = db.Column(db.Integer, db.ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    payer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), default="Groceries")  # Groceries, Utilities, Rent, Supplies, Other
    split_type = db.Column(db.String(20), default="equal")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    payments = db.relationship("Payment", backref="expense", cascade="all, delete-orphan")
    payer = db.relationship("User", foreign_keys=[payer_id])

    def to_dict(self):
        return {
            "id": self.id,
            "household_id": self.household_id,
            "payer_id": self.payer_id,
            "payer_name": self.payer.profile.full_name if self.payer and self.payer.profile else self.payer.email if self.payer else "Roommate",
            "title": self.title,
            "amount": self.amount,
            "category": self.category,
            "split_type": self.split_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "payments": [payment.to_dict() for payment in self.payments]
        }


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    from_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    to_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    is_settled = db.Column(db.Boolean, default=False)
    settled_at = db.Column(db.DateTime, nullable=True)

    from_user = db.relationship("User", foreign_keys=[from_user_id])
    to_user = db.relationship("User", foreign_keys=[to_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "from_user_id": self.from_user_id,
            "from_user_name": self.from_user.profile.full_name if self.from_user and self.from_user.profile else "Roommate",
            "to_user_id": self.to_user_id,
            "to_user_name": self.to_user.profile.full_name if self.to_user and self.to_user.profile else "Roommate",
            "amount": self.amount,
            "is_settled": self.is_settled,
            "settled_at": self.settled_at.isoformat() if self.settled_at else None
        }


class Chore(db.Model):
    __tablename__ = "chores"

    id = db.Column(db.Integer, primary_key=True)
    household_id = db.Column(db.Integer, db.ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    title = db.Column(db.String(150), nullable=False)
    frequency = db.Column(db.String(30), default="weekly")  # daily, weekly, bi_weekly, monthly
    due_date = db.Column(db.String(30), nullable=True)     # e.g., "Friday" or YYYY-MM-DD
    is_completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])

    def to_dict(self):
        return {
            "id": self.id,
            "household_id": self.household_id,
            "assigned_to_id": self.assigned_to_id,
            "assigned_to_name": self.assigned_to.profile.full_name if self.assigned_to and self.assigned_to.profile else "Unassigned",
            "title": self.title,
            "frequency": self.frequency,
            "due_date": self.due_date,
            "is_completed": self.is_completed,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }


class Agreement(db.Model):
    __tablename__ = "agreements"

    id = db.Column(db.Integer, primary_key=True)
    household_id = db.Column(db.Integer, db.ForeignKey("households.id", ondelete="CASCADE"), nullable=False, unique=True)
    version = db.Column(db.String(10), default="1.0")
    clauses = db.Column(db.Text, default="[]")  # JSON encoded list of clauses
    is_active = db.Column(db.Boolean, default=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_clauses(self):
        try:
            return json.loads(self.clauses)
        except Exception:
            return []

    def set_clauses(self, clauses_list):
        self.clauses = json.dumps(clauses_list)

    def to_dict(self):
        return {
            "id": self.id,
            "household_id": self.household_id,
            "version": self.version,
            "clauses": self.get_clauses(),
            "is_active": self.is_active,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

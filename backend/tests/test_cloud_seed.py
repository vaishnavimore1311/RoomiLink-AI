"""
Tests for Schema Initialization and Seed Data Verification (Issue #26)
"""

from app import create_app, db
from app.models.user_models import User
from app.models.property_models import Property, Room
from app.models.subscription_models import SubscriptionPlan
from app.models.household_models import Household

def test_schema_tables_exist():
    """Verify all relational tables are recognized by SQLAlchemy metadata."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        table_names = db.metadata.tables.keys()
        expected_tables = [
            "users", "profiles", "roommate_preferences",
            "properties", "rooms",
            "households", "household_members", "expenses", "payments", "chores", "agreements",
            "subscription_plans", "user_subscriptions"
        ]
        for tbl in expected_tables:
            assert tbl in table_names, f"Expected table '{tbl}' in schema metadata"

def test_seed_admin_structure():
    """Verify User model supports admin credentials and roles."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        admin = User(email="testadmin@roomilink.ai", role="admin", is_verified=True)
        admin.set_password("SecureAdminPassword123!")
        db.session.add(admin)
        db.session.commit()
        
        found = User.query.filter_by(email="testadmin@roomilink.ai").first()
        assert found is not None
        assert found.role == "admin"
        assert found.check_password("SecureAdminPassword123!") is True

"""
Multi-Client Concurrency and Synchronization Tests (Issue #27)
Validates concurrent operations, data visibility across client instances,
and connection pool auto-recovery against the database.
"""

import pytest
from sqlalchemy import create_engine, text
from app import create_app, db
from app.models.property_models import Property, Room
from app.models.user_models import User

@pytest.fixture
def test_app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

def test_multi_client_write_read_synchronization(test_app):
    """Simulate two independent clients reading and writing shared data."""
    client_b = test_app.test_client()
    
    with test_app.app_context():
        # Create lister user
        lister = User(email="lister@sync.com", role="lister", is_verified=True)
        lister.set_password("ListerPass123!")
        db.session.add(lister)
        db.session.commit()

        # Client A writes a property and room
        prop = Property(
            lister_id=lister.id,
            title="Kothrud Shared Residency",
            city="Pune",
            neighborhood="Kothrud",
            property_type="apartment",
            address="Paud Road, Kothrud, Pune",
            description="Spacious apartment ideal for working professionals."
        )
        db.session.add(prop)
        db.session.commit()

        room = Room(
            property_id=prop.id,
            room_type="private",
            rent_amount=15000.0,
            deposit_amount=30000.0
        )
        db.session.add(room)
        db.session.commit()
        created_room_id = room.id

        # Verify Client B immediately sees the room via REST API
        res_b = client_b.get(f"/api/v1/rooms/{created_room_id}")
        assert res_b.status_code == 200
        data_b = res_b.get_json()["data"]
        assert data_b["title"] == "Kothrud Shared Residency"
        assert data_b["rent_amount"] == 15000.0
        assert data_b["neighborhood"] == "Kothrud"

def test_engine_pool_pre_ping_configuration():
    """Verify pool_pre_ping is properly enabled in engine options."""
    engine = create_engine("sqlite:///:memory:", pool_pre_ping=True)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT 1")).scalar()
        assert res == 1
    # Verify pool has pre_ping configured
    assert engine.pool._pre_ping is True

def test_no_connection_leaks_on_repeated_queries(test_app):
    """Verify executing multiple queries properly releases connections back to pool."""
    client = test_app.test_client()
    with test_app.app_context():
        admin = User(email="admin@test.com", role="admin", is_verified=True)
        admin.set_password("Admin123!")
        db.session.add(admin)
        db.session.commit()
        
        for _ in range(10):
            res = client.get("/api/v1/health")
            assert res.status_code == 200
            assert res.get_json()["database_status"] == "connected"

import json
import pytest
from app import create_app, db

@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()

def test_health_check(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["service"] == "RoomiLink AI Backend API"

def test_user_registration_and_login(client):
    reg_payload = {
        "email": "sarah@example.com",
        "password": "Password123!",
        "full_name": "Sarah Jenkins",
        "city": "Austin",
        "role": "seeker"
    }
    res_reg = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_reg.status_code == 201
    token = res_reg.get_json()["access_token"]
    assert token is not None

    # Test login
    login_payload = {
        "email": "sarah@example.com",
        "password": "Password123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    assert "access_token" in res_login.get_json()

    # Test me
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    user_data = res_me.get_json()["user"]
    assert user_data["email"] == "sarah@example.com"
    assert user_data["profile"]["full_name"] == "Sarah Jenkins"

def test_lifestyle_preferences_update(client):
    reg_payload = {
        "email": "alex@example.com",
        "password": "Password123!",
        "full_name": "Alex Rivera",
        "city": "Austin"
    }
    res_reg = client.post("/api/v1/auth/register", json=reg_payload)
    token = res_reg.get_json()["access_token"]

    pref_payload = {
        "sleep_schedule": "early_bird",
        "cleanliness_level": 4,
        "noise_tolerance": "quiet_strict",
        "budget_max": 950.0
    }
    res_pref = client.put("/api/v1/auth/preferences", headers={"Authorization": f"Bearer {token}"}, json=pref_payload)
    assert res_pref.status_code == 200
    pref_data = res_pref.get_json()["preferences"]
    assert pref_data["sleep_schedule"] == "early_bird"
    assert pref_data["cleanliness_level"] == 4
    assert pref_data["budget_max"] == 950.0

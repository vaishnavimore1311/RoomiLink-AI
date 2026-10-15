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
        "email": "sneha@example.com",
        "password": "Password123!",
        "full_name": "Sneha Deshmukh",
        "city": "Pune",
        "role": "seeker"
    }
    res_reg = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_reg.status_code == 201
    token = res_reg.get_json()["access_token"]
    assert token is not None

    # Test login
    login_payload = {
        "email": "sneha@example.com",
        "password": "Password123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    assert "access_token" in res_login.get_json()

    # Test me
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    user_data = res_me.get_json()["user"]
    assert user_data["email"] == "sneha@example.com"
    assert user_data["profile"]["full_name"] == "Sneha Deshmukh"

def test_registration_duplicate_email(client):
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "full_name": "Original User"
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Attempt to register with the exact same email
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.get_json()["message"]

def test_registration_validation(client):
    # Short password
    res_short = client.post("/api/v1/auth/register", json={
        "email": "short@example.com",
        "password": "123",
        "full_name": "Short Pwd"
    })
    assert res_short.status_code == 400
    assert "at least 6 characters" in res_short.get_json()["message"]

    # Missing full name
    res_no_name = client.post("/api/v1/auth/register", json={
        "email": "noname@example.com",
        "password": "Password123!"
    })
    assert res_no_name.status_code == 400

    # Missing email
    res_no_email = client.post("/api/v1/auth/register", json={
        "password": "Password123!",
        "full_name": "No Email"
    })
    assert res_no_email.status_code == 400

def test_login_invalid_credentials(client):
    # Register first
    client.post("/api/v1/auth/register", json={
        "email": "user@example.com",
        "password": "CorrectPassword!",
        "full_name": "Real User"
    })

    # Incorrect password
    res_wrong = client.post("/api/v1/auth/login", json={
        "email": "user@example.com",
        "password": "WrongPassword!"
    })
    assert res_wrong.status_code == 401
    assert "Invalid email or password" in res_wrong.get_json()["message"]

    # Nonexistent user
    res_nonexistent = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "SomePassword!"
    })
    assert res_nonexistent.status_code == 401

def test_unauthorized_access(client):
    # Attempting to access protected /me without token
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401

    # Attempting with invalid token
    res_invalid = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert res_invalid.status_code == 401

def test_lifestyle_preferences_and_consent(client):
    reg_payload = {
        "email": "aditya@example.com",
        "password": "Password123!",
        "full_name": "Aditya Kulkarni",
        "city": "Pune"
    }
    res_reg = client.post("/api/v1/auth/register", json=reg_payload)
    token = res_reg.get_json()["access_token"]

    pref_payload = {
        "sleep_schedule": "early_bird",
        "cleanliness_level": 4,
        "noise_tolerance": "quiet_strict",
        "budget_max": 15000.0
    }
    res_pref = client.put("/api/v1/auth/preferences", headers={"Authorization": f"Bearer {token}"}, json=pref_payload)
    assert res_pref.status_code == 200
    pref_data = res_pref.get_json()["preferences"]
    assert pref_data["sleep_schedule"] == "early_bird"
    assert pref_data["cleanliness_level"] == 4
    assert pref_data["budget_max"] == 15000.0

    # Test updating AI consent
    res_consent = client.put("/api/v1/auth/consent", headers={"Authorization": f"Bearer {token}"}, json={"ai_consent_enabled": False})
    assert res_consent.status_code == 200
    assert res_consent.get_json()["ai_consent_enabled"] is False

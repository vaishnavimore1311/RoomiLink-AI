import json
import pytest
from app import create_app, db
from app.models.user_models import User, Profile, RoommatePreference

@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()

def create_user_with_prefs(client, email, name, role="seeker", **prefs):
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": name,
        "role": role,
        "city": "Pune"
    })
    token = res.get_json()["access_token"]
    if prefs:
        client.put("/api/v1/auth/preferences", headers={"Authorization": f"Bearer {token}"}, json=prefs)
    return token

def test_roommate_matching_scoring_and_ranking(client):
    # 1. Create User A (Quiet early bird, high cleanliness)
    token_a = create_user_with_prefs(
        client, "user_a@example.com", "Ananya Deshpande",
        sleep_schedule="early_bird",
        cleanliness_level=5,
        noise_tolerance="quiet_strict",
        smoking_status="non_smoker",
        guest_frequency="rarely",
        budget_min=8000.0,
        budget_max=14000.0
    )

    # 2. Create User B (Very compatible with Alice)
    create_user_with_prefs(
        client, "user_b@example.com", "Pooja Kulkarni",
        sleep_schedule="early_bird",
        cleanliness_level=5,
        noise_tolerance="quiet_strict",
        smoking_status="non_smoker",
        guest_frequency="rarely",
        budget_min=8500.0,
        budget_max=13500.0
    )

    # 3. Create User C (Opposite of Alice: late night, lively, relaxed clean, smoker)
    create_user_with_prefs(
        client, "user_c@example.com", "Rahul Shinde",
        sleep_schedule="night_owl",
        cleanliness_level=1,
        noise_tolerance="lively",
        smoking_status="smoker",
        guest_frequency="frequent",
        budget_min=18000.0,
        budget_max=28000.0
    )

    # 4. Request matches from Alice's perspective
    res = client.get("/api/v1/matching/roommates", headers={"Authorization": f"Bearer {token_a}"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    candidates = data["data"]
    assert len(candidates) == 2

    # Bob should be ranked first with a significantly higher compatibility score than Charlie
    assert candidates[0]["full_name"] == "Pooja Kulkarni"
    assert candidates[0]["compatibility_score"] >= 85

    assert candidates[1]["full_name"] == "Rahul Shinde"
    assert candidates[1]["compatibility_score"] <= 45

    # 5. Check match breakdown endpoint
    bob_id = candidates[0]["user_id"]
    res_breakdown = client.get(f"/api/v1/matching/{bob_id}/breakdown", headers={"Authorization": f"Bearer {token_a}"})
    assert res_breakdown.status_code == 200
    bd_data = res_breakdown.get_json()["data"]
    assert bd_data["compatibility_score"] >= 85
    assert len(bd_data["strengths"]) >= 2
    assert "breakdown" in bd_data
    assert bd_data["breakdown"]["cleanliness"] == 100
    assert bd_data["breakdown"]["noise"] == 100

def test_roommate_filter_by_city(client):
    create_user_with_prefs(client, "pune@example.com", "Pune User", city="Pune")
    create_user_with_prefs(client, "mumbai@example.com", "Mumbai User", city="Mumbai")

    res = client.get("/api/v1/matching/roommates?city=Pune")
    assert res.status_code == 200
    candidates = res.get_json()["data"]
    assert any(c["full_name"] == "Pune User" for c in candidates)


def test_admin_excluded_from_roommate_matches(client):
    create_user_with_prefs(client, "admin@test.com", "Admin User", role="admin")
    create_user_with_prefs(client, "seeker@test.com", "Seeker User", role="seeker")

    res = client.get("/api/v1/matching/roommates")
    assert res.status_code == 200
    candidates = res.get_json()["data"]
    
    # Verify admin is not in candidates list
    assert not any(c["full_name"] == "Admin User" for c in candidates)
    assert any(c["full_name"] == "Seeker User" for c in candidates)

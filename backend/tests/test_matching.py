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


def test_roommate_with_active_room_share_enriched(client):
    """Test that roommate candidates who listed a flatmate share have active_room_share enriched."""
    from datetime import datetime, timedelta, timezone
    from app.models.subscription_models import SubscriptionPlan, UserSubscription

    # 1. Register candidate who lists a room share
    token_candidate = create_user_with_prefs(
        client, "host_candidate@example.com", "Rohan Verma", city="Pune"
    )
    user = User.query.filter_by(email="host_candidate@example.com").first()

    # Active subscription
    plan = SubscriptionPlan(name="Pro", slug="pro_seeker_match", target_role="seeker", price_inr=499.0)
    db.session.add(plan)
    db.session.flush()
    sub = UserSubscription(user_id=user.id, plan_id=plan.id, status="active", expires_at=datetime.now(timezone.utc) + timedelta(days=30))
    db.session.add(sub)
    db.session.commit()

    # Post room share
    client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token_candidate}"},
        json={
            "title": "Available Bed in Kalyani Nagar",
            "address": "Kalyani Nagar, Pune",
            "city": "Pune",
            "listing_purpose": "flatmate_share",
            "rent_amount": 9000.0,
            "room_type": "shared",
            "current_occupants": 1
        }
    )

    # 2. Another user searches roommates
    res = client.get("/api/v1/matching/roommates")
    assert res.status_code == 200
    candidates = res.get_json()["data"]
    rohan = next((c for c in candidates if c["full_name"] == "Rohan Verma"), None)
    assert rohan is not None
    assert rohan["active_room_share"] is not None
    assert rohan["active_room_share"]["title"] == "Available Bed in Kalyani Nagar"
    assert rohan["active_room_share"]["rent_amount"] == 9000.0

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


def test_free_user_restricted_to_max_two_matches(client):
    """Verify free users can only see up to 2 compatible roommate profiles."""
    for i in range(1, 5):
        create_user_with_prefs(
            client, f"candidate_{i}@example.com", f"Candidate {i}", city="Pune",
            cleanliness_level=i
        )

    free_token = create_user_with_prefs(
        client, "free_seeker@example.com", "Free Seeker", city="Pune"
    )

    res = client.get("/api/v1/matching/roommates", headers={"Authorization": f"Bearer {free_token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert len(data["data"]) == 2
    assert data["count"] == 2
    assert data["total_matches"] == 4
    assert data["is_limited"] is True
    assert data["limit"] == 2
    assert data["has_active_subscription"] is False


def test_free_user_cannot_bypass_limit_via_filters_or_search(client):
    """Verify free users cannot bypass the 2-match limit using search or filters."""
    token_a = create_user_with_prefs(
        client, "seeker@example.com", "Seeker User", city="Pune",
        cleanliness_level=5, sleep_schedule="night_owl"
    )

    create_user_with_prefs(
        client, "c1@example.com", "Candidate HighOne", city="Hinjewadi",
        cleanliness_level=5, sleep_schedule="night_owl"
    )
    create_user_with_prefs(
        client, "c2@example.com", "Candidate HighTwo", city="Baner",
        cleanliness_level=5, sleep_schedule="night_owl"
    )
    create_user_with_prefs(
        client, "c3@example.com", "Candidate Third", city="Kothrud",
        cleanliness_level=1, sleep_schedule="early_bird"
    )
    create_user_with_prefs(
        client, "c4@example.com", "Candidate Fourth", city="Wakad",
        cleanliness_level=1, sleep_schedule="early_bird"
    )

    # Free user querying by search for Candidate 3 (who is not in their allowed top 2)
    res_search = client.get(
        "/api/v1/matching/roommates?search=Third",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_search.status_code == 200
    data_search = res_search.get_json()
    assert len(data_search["data"]) == 0
    assert not any(c["full_name"] == "Candidate Third" for c in data_search["data"])

    # Free user querying by city for Kothrud (where only Candidate 3 lives)
    res_city = client.get(
        "/api/v1/matching/roommates?city=Kothrud",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_city.status_code == 200
    data_city = res_city.get_json()
    assert len(data_city["data"]) == 0


def test_free_user_breakdown_access_restricted_beyond_two(client):
    """Verify free users cannot access compatibility breakdown for matches beyond top 2."""
    token_user = create_user_with_prefs(
        client, "seeker_user@example.com", "Seeker User", city="Pune",
        cleanliness_level=5, sleep_schedule="early_bird"
    )

    create_user_with_prefs(client, "c1@example.com", "Candidate 1", cleanliness_level=5, sleep_schedule="early_bird")
    create_user_with_prefs(client, "c2@example.com", "Candidate 2", cleanliness_level=4, sleep_schedule="early_bird")
    create_user_with_prefs(client, "c3@example.com", "Candidate 3", cleanliness_level=1, sleep_schedule="night_owl")

    res = client.get("/api/v1/matching/roommates", headers={"Authorization": f"Bearer {token_user}"})
    candidates = res.get_json()["data"]
    assert len(candidates) == 2
    top1_id = candidates[0]["user_id"]
    top2_id = candidates[1]["user_id"]

    res_b1 = client.get(f"/api/v1/matching/{top1_id}/breakdown", headers={"Authorization": f"Bearer {token_user}"})
    assert res_b1.status_code == 200

    res_b2 = client.get(f"/api/v1/matching/{top2_id}/breakdown", headers={"Authorization": f"Bearer {token_user}"})
    assert res_b2.status_code == 200

    c3_user = User.query.filter_by(email="c3@example.com").first()
    assert c3_user is not None
    assert c3_user.id not in [top1_id, top2_id]

    res_b3 = client.get(f"/api/v1/matching/{c3_user.id}/breakdown", headers={"Authorization": f"Bearer {token_user}"})
    assert res_b3.status_code == 403
    err_data = res_b3.get_json()
    assert err_data["status"] == "error"
    assert err_data["upgrade_required"] is True
    assert "Upgrade required" in err_data["message"]


def test_premium_user_has_unrestricted_matching_and_breakdowns(client):
    """Verify premium users with active subscription have full matching access and can see all matches."""
    from datetime import datetime, timedelta, timezone
    from app.models.subscription_models import SubscriptionPlan, UserSubscription

    token_prem = create_user_with_prefs(
        client, "premium_seeker@example.com", "Premium Seeker", city="Pune"
    )
    user_prem = User.query.filter_by(email="premium_seeker@example.com").first()

    plan = SubscriptionPlan(name="Pro Seeker Plan", slug="pro_seeker_plan_test", target_role="seeker", price_inr=499.0)
    db.session.add(plan)
    db.session.flush()

    sub = UserSubscription(
        user_id=user_prem.id,
        plan_id=plan.id,
        status="active",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.session.add(sub)
    db.session.commit()

    for i in range(1, 5):
        create_user_with_prefs(client, f"cand_{i}@example.com", f"Candidate {i}", city="Pune")

    res = client.get("/api/v1/matching/roommates", headers={"Authorization": f"Bearer {token_prem}"})
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["data"]) == 4
    assert data["count"] == 4
    assert data["total_matches"] == 4
    assert data["is_limited"] is False
    assert data["has_active_subscription"] is True

    cand_4 = User.query.filter_by(email="cand_4@example.com").first()
    res_b4 = client.get(f"/api/v1/matching/{cand_4.id}/breakdown", headers={"Authorization": f"Bearer {token_prem}"})
    assert res_b4.status_code == 200
    assert res_b4.get_json()["status"] == "success"


def test_expired_subscription_restricted_to_two(client):
    """Verify user with an expired subscription is restricted as a free user."""
    from datetime import datetime, timedelta, timezone
    from app.models.subscription_models import SubscriptionPlan, UserSubscription

    token_user = create_user_with_prefs(
        client, "expired_sub@example.com", "Expired Sub User", city="Pune"
    )
    user = User.query.filter_by(email="expired_sub@example.com").first()

    plan = SubscriptionPlan(name="Pro Seeker Expired", slug="pro_expired", target_role="seeker", price_inr=499.0)
    db.session.add(plan)
    db.session.flush()

    sub = UserSubscription(
        user_id=user.id,
        plan_id=plan.id,
        status="active",
        expires_at=datetime.now(timezone.utc) - timedelta(days=5)
    )
    db.session.add(sub)
    db.session.commit()

    for i in range(1, 4):
        create_user_with_prefs(client, f"exp_c_{i}@example.com", f"Exp Cand {i}", city="Pune")

    res = client.get("/api/v1/matching/roommates", headers={"Authorization": f"Bearer {token_user}"})
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["data"]) == 2
    assert data["is_limited"] is True
    assert data["has_active_subscription"] is False

import json
from datetime import datetime, timedelta, timezone
import pytest
from app import create_app, db
from app.models.user_models import User
from app.models.subscription_models import SubscriptionPlan, UserSubscription

@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()

def register_and_get_token(client, email="lister@example.com", role="lister"):
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Property Lister",
        "role": role
    })
    return res.get_json()["access_token"]

def subscribe_user(email, plan_slug="host_premium", status="active", expires_in_days=30):
    user = User.query.filter_by(email=email).first()
    plan = SubscriptionPlan.query.filter_by(slug=plan_slug).first()
    if not plan:
        plan = SubscriptionPlan(
            name="Host Premium",
            slug=plan_slug,
            target_role="lister",
            price_inr=999.0
        )
        db.session.add(plan)
        db.session.flush()

    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days) if expires_in_days is not None else None
    sub = UserSubscription(
        user_id=user.id,
        plan_id=plan.id,
        status=status,
        expires_at=expires_at
    )
    db.session.add(sub)
    db.session.commit()
    return sub

def test_create_room_unauthenticated(client):
    """Unauthenticated users cannot create listings (401)."""
    res = client.post("/api/v1/rooms", json={"title": "Nice Room"})
    assert res.status_code == 401

def test_create_room_unsubscribed_forbidden(client):
    """Unsubscribed users cannot create listings and receive 403 SUBSCRIPTION_REQUIRED."""
    token = register_and_get_token(client, email="unsub@example.com")
    room_payload = {
        "title": "Sunny Private Room in Blue Ridge Hinjewadi",
        "description": "Quiet room with Wi-Fi.",
        "address": "Tower 12, Blue Ridge, Phase 1",
        "city": "Pune",
        "neighborhood": "Hinjewadi",
        "property_type": "apartment",
        "room_type": "private",
        "rent_amount": 8500.0,
        "deposit_amount": 15000.0
    }
    res = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json=room_payload
    )
    assert res.status_code == 403
    body = res.get_json()
    assert body["status"] == "error"
    assert body["code"] == "SUBSCRIPTION_REQUIRED"
    assert "subscription is required" in body["message"].lower()

def test_create_room_expired_subscription_forbidden(client):
    """Users with expired subscriptions cannot create listings."""
    token = register_and_get_token(client, email="expired@example.com")
    subscribe_user("expired@example.com", status="expired", expires_in_days=-5)

    room_payload = {
        "title": "Sunny Private Room in Blue Ridge Hinjewadi",
        "description": "Quiet room with Wi-Fi.",
        "address": "Tower 12, Blue Ridge, Phase 1",
        "city": "Pune",
        "rent_amount": 8500.0
    }
    res = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json=room_payload
    )
    assert res.status_code == 403
    body = res.get_json()
    assert body["code"] == "SUBSCRIPTION_REQUIRED"

def test_create_room_admin_allowed(client):
    """Admin users can create listings without an active subscription."""
    token = register_and_get_token(client, email="admin@example.com", role="admin")
    room_payload = {
        "title": "Admin Listed Penthouse in Koregaon Park",
        "description": "Luxury apartment.",
        "address": "Lane 7, Koregaon Park",
        "city": "Pune",
        "neighborhood": "Koregaon Park",
        "property_type": "apartment",
        "room_type": "private",
        "rent_amount": 25000.0,
        "deposit_amount": 50000.0
    }
    res = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json=room_payload
    )
    assert res.status_code == 201
    body = res.get_json()
    assert body["status"] == "success"
    assert "room_id" in body["data"]

def test_create_and_get_room_subscribed(client):
    """Subscribed users can create listings and existing query/filter flows continue working."""
    token = register_and_get_token(client, email="subscribed_lister@example.com")
    subscribe_user("subscribed_lister@example.com", status="active", expires_in_days=30)

    # 1. Test create room with active subscription
    room_payload = {
        "title": "Sunny Private Room in Blue Ridge Hinjewadi",
        "description": "Quiet, spacious room with power backup, modular kitchen, and high-speed Wi-Fi.",
        "address": "Tower 12, Blue Ridge, Phase 1",
        "city": "Pune",
        "neighborhood": "Hinjewadi",
        "property_type": "apartment",
        "room_type": "private",
        "rent_amount": 8500.0,
        "deposit_amount": 15000.0,
        "available_from": "Immediate",
        "amenities": ["Wi-Fi", "In-Unit Laundry", "Power Backup"],
        "images": ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"]
    }
    res_create = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json=room_payload
    )
    assert res_create.status_code == 201
    room_id = res_create.get_json()["data"]["room_id"]

    # 2. Test get room listings
    res_list = client.get("/api/v1/rooms")
    assert res_list.status_code == 200
    rooms = res_list.get_json()["data"]
    assert len(rooms) == 1
    assert rooms[0]["title"] == "Sunny Private Room in Blue Ridge Hinjewadi"
    assert rooms[0]["rent_amount"] == 8500.0

    # 3. Test filter by city matching
    res_city = client.get("/api/v1/rooms?city=Pune")
    assert res_city.status_code == 200
    assert len(res_city.get_json()["data"]) == 1

    # 4. Test filter by city not matching
    res_other_city = client.get("/api/v1/rooms?city=Chennai")
    assert res_other_city.status_code == 200
    assert len(res_other_city.get_json()["data"]) == 0

    # 5. Test filter by budget
    res_cheap = client.get("/api/v1/rooms?budget_max=6000")
    assert res_cheap.status_code == 200
    assert len(res_cheap.get_json()["data"]) == 0

    res_affordable = client.get("/api/v1/rooms?budget_max=10000")
    assert res_affordable.status_code == 200
    assert len(res_affordable.get_json()["data"]) == 1

    # 6. Test get single room detail
    res_detail = client.get(f"/api/v1/rooms/{room_id}")
    assert res_detail.status_code == 200
    detail = res_detail.get_json()["data"]
    assert detail["title"] == "Sunny Private Room in Blue Ridge Hinjewadi"
    assert "Wi-Fi" in detail["amenities"]

    # 7. Test nonexistent room detail
    res_not_found = client.get("/api/v1/rooms/99999")
    assert res_not_found.status_code == 404

def test_upload_room_photo(client):
    import io
    token = register_and_get_token(client, email="photo_lister@example.com")

    # 1. Test unauthorized upload
    res_unauth = client.post("/api/v1/rooms/upload-photo")
    assert res_unauth.status_code == 401

    # 2. Test valid photo upload
    data = {
        "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"test image binary"), "bedroom.jpg")
    }
    res_upload = client.post(
        "/api/v1/rooms/upload-photo",
        headers={"Authorization": f"Bearer {token}"},
        data=data,
        content_type="multipart/form-data"
    )
    assert res_upload.status_code == 201
    upload_res = res_upload.get_json()
    assert upload_res["status"] == "success"
    assert "url" in upload_res
    assert upload_res["filename"].endswith(".jpg")


def test_exact_address_hidden_for_unsubscribed_and_guests(client):
    """Exact street address is masked for guests, unsubscribed users, and expired subscriptions."""
    host_token = register_and_get_token(client, email="host_address_test@example.com")
    subscribe_user("host_address_test@example.com")

    # Create listing
    room_payload = {
        "title": "Private Room in Wakad Near D-Mart",
        "description": "Furnished room with attached washroom.",
        "address": "Flat 504, Pride Purple Palms, Wakad",
        "city": "Pune",
        "neighborhood": "Wakad",
        "property_type": "apartment",
        "room_type": "private",
        "rent_amount": 9500.0,
        "deposit_amount": 18000.0,
        "amenities": ["Wi-Fi", "Geyser"]
    }
    res_create = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {host_token}"},
        json=room_payload
    )
    assert res_create.status_code == 201
    room_id = res_create.get_json()["data"]["room_id"]

    # 1. Unauthenticated guest request
    res_guest_list = client.get("/api/v1/rooms")
    assert res_guest_list.status_code == 200
    guest_room = [r for r in res_guest_list.get_json()["data"] if r["id"] == room_id][0]
    assert guest_room["address"] == "🔒 Subscribed Members Only"
    assert guest_room["is_address_locked"] is True
    # Basic details must remain accessible
    assert guest_room["city"] == "Pune"
    assert guest_room["neighborhood"] == "Wakad"
    assert guest_room["rent_amount"] == 9500.0

    res_guest_detail = client.get(f"/api/v1/rooms/{room_id}")
    assert res_guest_detail.status_code == 200
    guest_detail = res_guest_detail.get_json()["data"]
    assert guest_detail["address"] == "🔒 Subscribed Members Only"
    assert guest_detail["is_address_locked"] is True
    assert guest_detail["city"] == "Pune"
    assert guest_detail["neighborhood"] == "Wakad"

    # 2. Authenticated unsubscribed user request
    unsub_token = register_and_get_token(client, email="unsub_viewer@example.com")
    res_unsub_detail = client.get(
        f"/api/v1/rooms/{room_id}",
        headers={"Authorization": f"Bearer {unsub_token}"}
    )
    assert res_unsub_detail.status_code == 200
    unsub_detail = res_unsub_detail.get_json()["data"]
    assert unsub_detail["address"] == "🔒 Subscribed Members Only"
    assert unsub_detail["is_address_locked"] is True

    # 3. User with expired subscription
    expired_token = register_and_get_token(client, email="expired_viewer@example.com")
    subscribe_user("expired_viewer@example.com", status="expired", expires_in_days=-10)
    res_expired_detail = client.get(
        f"/api/v1/rooms/{room_id}",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert res_expired_detail.status_code == 200
    expired_detail = res_expired_detail.get_json()["data"]
    assert expired_detail["address"] == "🔒 Subscribed Members Only"
    assert expired_detail["is_address_locked"] is True


def test_exact_address_visible_for_subscribers_admin_and_host(client):
    """Subscribed users, admins, and the listing host receive the exact street address."""
    host_token = register_and_get_token(client, email="host_visible_test@example.com")
    subscribe_user("host_visible_test@example.com")

    exact_address = "Flat 504, Pride Purple Palms, Wakad"
    room_payload = {
        "title": "Private Room in Wakad",
        "description": "Spacious flat.",
        "address": exact_address,
        "city": "Pune",
        "neighborhood": "Wakad",
        "property_type": "apartment",
        "room_type": "private",
        "rent_amount": 9500.0,
        "deposit_amount": 18000.0
    }
    res_create = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {host_token}"},
        json=room_payload
    )
    assert res_create.status_code == 201
    room_id = res_create.get_json()["data"]["room_id"]

    # 1. Subscribed seeker sees exact address
    sub_token = register_and_get_token(client, email="subscriber_viewer@example.com")
    subscribe_user("subscriber_viewer@example.com", status="active", expires_in_days=30)

    res_sub_list = client.get("/api/v1/rooms", headers={"Authorization": f"Bearer {sub_token}"})
    assert res_sub_list.status_code == 200
    sub_room = [r for r in res_sub_list.get_json()["data"] if r["id"] == room_id][0]
    assert sub_room["address"] == exact_address
    assert sub_room["is_address_locked"] is False

    res_sub_detail = client.get(
        f"/api/v1/rooms/{room_id}",
        headers={"Authorization": f"Bearer {sub_token}"}
    )
    assert res_sub_detail.status_code == 200
    assert res_sub_detail.get_json()["data"]["address"] == exact_address
    assert res_sub_detail.get_json()["data"]["is_address_locked"] is False

    # 2. Admin user sees exact address
    admin_token = register_and_get_token(client, email="admin_viewer@example.com", role="admin")
    res_admin_detail = client.get(
        f"/api/v1/rooms/{room_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin_detail.status_code == 200
    assert res_admin_detail.get_json()["data"]["address"] == exact_address
    assert res_admin_detail.get_json()["data"]["is_address_locked"] is False

    # 3. Host sees their own property's exact address
    res_host_detail = client.get(
        f"/api/v1/rooms/{room_id}",
        headers={"Authorization": f"Bearer {host_token}"}
    )
    assert res_host_detail.status_code == 200
    assert res_host_detail.get_json()["data"]["address"] == exact_address
    assert res_host_detail.get_json()["data"]["is_address_locked"] is False


def test_toggle_room_favorite_flow(client):
    """Test full bookmark/favorite flow for Issue #39:
    1. Create room listing.
    2. Toggle favorite on (201, is_favorited: True).
    3. Verify room appears in GET /favorites and GET /favorites/ids.
    4. Verify is_favorited flag in GET /rooms and GET /rooms/<id>.
    5. Toggle favorite off (200, is_favorited: False).
    6. Verify room removed from favorites.
    """
    # Create host & room
    host_token = register_and_get_token(client, email="host_fav@example.com")
    subscribe_user("host_fav@example.com", status="active", expires_in_days=30)

    res_create = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {host_token}"},
        json={
            "title": "Cozy Master Bedroom in Kothrud",
            "description": "Spacious room with balcony.",
            "address": "Near MIT College, Kothrud",
            "city": "Pune",
            "neighborhood": "Kothrud",
            "property_type": "apartment",
            "room_type": "master",
            "rent_amount": 12000.0,
            "deposit_amount": 25000.0
        }
    )
    assert res_create.status_code == 201
    room_id = res_create.get_json()["data"]["room_id"]

    # Register seeker
    seeker_token = register_and_get_token(client, email="seeker_fav@example.com", role="seeker")

    # Initially favorites should be empty
    res_initial = client.get(
        "/api/v1/rooms/favorites",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_initial.status_code == 200
    assert res_initial.get_json()["count"] == 0
    assert res_initial.get_json()["data"] == []

    # 1. Add to favorites (toggle ON)
    res_fav_on = client.post(
        f"/api/v1/rooms/{room_id}/favorite",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_fav_on.status_code == 201
    data_on = res_fav_on.get_json()
    assert data_on["status"] == "success"
    assert data_on["is_favorited"] is True
    assert data_on["room_id"] == room_id

    # 2. Verify GET /favorites returns the saved room
    res_favs = client.get(
        "/api/v1/rooms/favorites",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_favs.status_code == 200
    favs_data = res_favs.get_json()
    assert favs_data["count"] == 1
    assert favs_data["data"][0]["id"] == room_id
    assert favs_data["data"][0]["is_favorited"] is True
    assert favs_data["data"][0]["title"] == "Cozy Master Bedroom in Kothrud"

    # 3. Verify GET /favorites/ids
    res_ids = client.get(
        "/api/v1/rooms/favorites/ids",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_ids.status_code == 200
    assert res_ids.get_json()["data"] == [room_id]

    # 4. Verify is_favorited flag in GET /rooms and GET /rooms/<id>
    res_list = client.get(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_list.status_code == 200
    matched_room = [r for r in res_list.get_json()["data"] if r["id"] == room_id][0]
    assert matched_room["is_favorited"] is True

    res_detail = client.get(
        f"/api/v1/rooms/{room_id}",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_detail.status_code == 200
    assert res_detail.get_json()["data"]["is_favorited"] is True

    # 5. Toggle favorite OFF
    res_fav_off = client.post(
        f"/api/v1/rooms/{room_id}/favorite",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_fav_off.status_code == 200
    data_off = res_fav_off.get_json()
    assert data_off["status"] == "success"
    assert data_off["is_favorited"] is False

    # 6. Verify room removed from favorites
    res_favs_after = client.get(
        "/api/v1/rooms/favorites",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_favs_after.status_code == 200
    assert res_favs_after.get_json()["count"] == 0

    res_ids_after = client.get(
        "/api/v1/rooms/favorites/ids",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_ids_after.status_code == 200
    assert res_ids_after.get_json()["data"] == []


def test_favorite_unauthenticated_and_not_found(client):
    """Test unauthorized access and nonexistent room for favorites endpoints."""
    # 401 when unauthenticated
    assert client.post("/api/v1/rooms/1/favorite").status_code == 401
    assert client.get("/api/v1/rooms/favorites").status_code == 401
    assert client.get("/api/v1/rooms/favorites/ids").status_code == 401

    # 404 when room does not exist
    token = register_and_get_token(client, email="seeker_404@example.com")
    res_404 = client.post(
        "/api/v1/rooms/999999/favorite",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_404.status_code == 404


def test_create_flatmate_room_share_listing(client):
    """Test that a subscribed seeker can list a flatmate room-share with split details."""
    token = register_and_get_token(client, email="sarah_host@example.com", role="seeker")
    subscribe_user("sarah_host@example.com", plan_slug="pro_seeker")

    payload = {
        "title": "1 Vacant Bed in Shared 2BHK Master Bedroom",
        "description": "Looking for female flatmate to share room and rent.",
        "address": "Tower 4, Blue Ridge Hinjewadi",
        "city": "Pune",
        "neighborhood": "Hinjewadi",
        "property_type": "apartment",
        "room_type": "shared",
        "listing_purpose": "flatmate_share",
        "rent_amount": 8000.0,
        "deposit_amount": 15000.0,
        "current_occupants": 1,
        "max_occupants": 2,
        "preferred_gender": "female",
        "utility_split_desc": "Rent ₹8,000 + Wi-Fi & Electricity split 50/50",
        "amenities": ["Wi-Fi", "AC", "Washing Machine"]
    }

    res = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert data["listing_purpose"] == "flatmate_share"
    assert data["room"]["current_occupants"] == 1
    assert data["room"]["max_occupants"] == 2
    assert data["room"]["preferred_gender"] == "female"
    assert data["room"]["utility_split_desc"] == "Rent ₹8,000 + Wi-Fi & Electricity split 50/50"


def test_get_room_detail_returns_existing_flatmate_and_compatibility(client):
    """Test that viewing a flatmate room-share returns existing flatmate profile and live compatibility score."""
    # 1. Poster creates flatmate room share
    poster_token = register_and_get_token(client, email="flatmate_poster@example.com", role="seeker")
    subscribe_user("flatmate_poster@example.com", plan_slug="pro_seeker")

    create_res = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {poster_token}"},
        json={
            "title": "Cozy Shared Room in Baner",
            "description": "Twin sharing bed available immediately.",
            "address": "Baner Road, Pune",
            "city": "Pune",
            "room_type": "shared",
            "listing_purpose": "flatmate_share",
            "rent_amount": 7500.0,
            "deposit_amount": 10000.0,
            "current_occupants": 1,
            "max_occupants": 2,
            "preferred_gender": "any",
            "utility_split_desc": "Rent ₹7,500 + Wi-Fi split equally"
        }
    )
    assert create_res.status_code == 201
    room_id = create_res.get_json()["data"]["room_id"]

    # 2. Viewer logs in and views the room detail
    viewer_token = register_and_get_token(client, email="priya_applicant@example.com", role="seeker")
    subscribe_user("priya_applicant@example.com", plan_slug="pro_seeker")

    detail_res = client.get(
        f"/api/v1/rooms/{room_id}",
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert detail_res.status_code == 200
    room_data = detail_res.get_json()["data"]
    assert room_data["listing_purpose"] == "flatmate_share"
    assert room_data["current_occupants"] == 1
    assert room_data["utility_split_desc"] == "Rent ₹7,500 + Wi-Fi split equally"

    # Verify flatmate and compatibility bridge
    flatmate = room_data.get("existing_flatmate")
    assert flatmate is not None
    assert flatmate["email"] if "email" in flatmate else flatmate["name"]
    assert isinstance(flatmate["compatibility_score"], int)
    assert 10 <= flatmate["compatibility_score"] <= 100
    assert len(flatmate["strengths"]) >= 1


def test_filter_rooms_by_listing_purpose(client):
    """Test filtering rooms by listing_purpose (flatmate_share vs landlord)."""
    token = register_and_get_token(client, email="host_filter@example.com", role="lister")
    subscribe_user("host_filter@example.com", plan_slug="host_premium")

    # Create landlord room
    client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Entire 1BHK Flat",
            "description": "Independent flat",
            "address": "Kothrud, Pune",
            "city": "Pune",
            "room_type": "private",
            "listing_purpose": "landlord",
            "rent_amount": 18000.0
        }
    )

    # Create flatmate room share
    client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Shared Room in 2BHK",
            "description": "1 bed available",
            "address": "Kothrud, Pune",
            "city": "Pune",
            "room_type": "shared",
            "listing_purpose": "flatmate_share",
            "rent_amount": 6000.0
        }
    )

    # Filter for flatmate shares
    res_share = client.get("/api/v1/rooms?purpose=flatmate_share")
    assert res_share.status_code == 200
    shares = res_share.get_json()["data"]
    assert len(shares) >= 1
    for item in shares:
        assert item["listing_purpose"] == "flatmate_share"

    # Filter for landlord rentals
    res_landlord = client.get("/api/v1/rooms?purpose=landlord")
    assert res_landlord.status_code == 200
    landlords = res_landlord.get_json()["data"]
    assert len(landlords) >= 1
    for item in landlords:
        assert item["listing_purpose"] == "landlord"


def test_create_flatmate_room_share_with_household_link(client):
    """Test linking a flatmate replacement listing to an existing household workspace."""
    token = register_and_get_token(client, email="hh_poster@example.com", role="seeker")
    subscribe_user("hh_poster@example.com", plan_slug="pro_seeker")

    # Create household first
    hh_res = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Maple Leaf Apartment", "address": "Baner, Pune"}
    )
    assert hh_res.status_code == 201
    household_id = hh_res.get_json()["data"]["household"]["id"]

    # Create room listing linked to household
    res = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Shared Room in Maple Leaf Flat",
            "description": "Vacancy after roommate relocation.",
            "address": "Baner, Pune",
            "city": "Pune",
            "listing_purpose": "flatmate_share",
            "room_type": "shared",
            "rent_amount": 7000.0,
            "household_id": household_id
        }
    )
    assert res.status_code == 201
    room_data = res.get_json()["data"]["room"]
    assert room_data["household_id"] == household_id
    assert room_data["listing_purpose"] == "flatmate_share"


def test_unsubscribed_seeker_cannot_create_flatmate_share(client):
    """Unsubscribed seeker cannot post a flatmate share listing without subscription."""
    token = register_and_get_token(client, email="unsub_seeker@example.com", role="seeker")
    res = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Empty Bed in Koregaon Park",
            "address": "Lane 5, Koregaon Park",
            "city": "Pune",
            "listing_purpose": "flatmate_share",
            "rent_amount": 8000.0
        }
    )
    assert res.status_code == 403
    assert res.get_json()["code"] == "SUBSCRIPTION_REQUIRED"


def test_create_room_total_rent_and_split_calculation(client):
    """Verifies actual total room rent input and automated per-roommate equal split calculation (Issue #86)."""
    token = register_and_get_token(client, email="split_host@example.com", role="seeker")
    subscribe_user("split_host@example.com", plan_slug="pro_seeker")

    res = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Twin Sharing Room in Viman Nagar",
            "description": "Spacious master bedroom with attached bath.",
            "address": "Symbiosis Road, Viman Nagar",
            "city": "Pune",
            "neighborhood": "Viman Nagar",
            "property_type": "apartment",
            "room_type": "shared",
            "listing_purpose": "flatmate_share",
            "current_occupants": 1,
            "max_occupants": 2,
            "total_room_rent": 16000.0,
            "rent_amount": 8000.0,
            "deposit_amount": 16000.0
        }
    )
    assert res.status_code == 201
    room = res.get_json()["data"]["room"]
    assert room["total_room_rent"] == 16000.0
    assert room["split_rent"] == 8000.0
    assert room["rent_amount"] == 8000.0

    room_id = room["id"]

    # Verify detail endpoint returns total_room_rent and split_rent
    detail_res = client.get(f"/api/v1/rooms/{room_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.get_json()["data"]
    assert detail_data["total_room_rent"] == 16000.0
    assert detail_data["split_rent"] == 8000.0

    # Verify listing list returns total_room_rent and split_rent
    list_res = client.get("/api/v1/rooms")
    assert list_res.status_code == 200
    list_rooms = list_res.get_json()["data"]
    matched = next((r for r in list_rooms if r["id"] == room_id), None)
    assert matched is not None
    assert matched["total_room_rent"] == 16000.0
    assert matched["split_rent"] == 8000.0





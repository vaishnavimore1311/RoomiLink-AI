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


import pytest
from app import create_app, db
from app.models.user_models import User
from app.models.property_models import Property, Room, RoomInquiry
from app.models.subscription_models import SubscriptionPlan, UserSubscription

@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()

def create_user_and_token(client, email, role="seeker"):
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": email.split("@")[0].capitalize(),
        "role": role
    })
    data = res.get_json()
    return data["user"]["id"], data["access_token"]

def subscribe_user(user_id, plan_slug="pro_seeker"):
    plan = SubscriptionPlan(
        name="Pro Seeker",
        slug=plan_slug,
        target_role="seeker",
        price_inr=499.0
    )
    db.session.add(plan)
    db.session.flush()

    sub = UserSubscription(
        user_id=user_id,
        plan_id=plan.id,
        status="active"
    )
    db.session.add(sub)
    db.session.commit()

def test_send_and_retrieve_inquiries(client):
    host_id, host_token = create_user_and_token(client, "host@example.com", role="lister")
    seeker_id, seeker_token = create_user_and_token(client, "seeker@example.com", role="seeker")

    # Give seeker Pro subscription so inquiry check passes
    subscribe_user(seeker_id, "pro_seeker")

    # Create Property and Room for host
    prop = Property(
        lister_id=host_id,
        title="Spacious 2BHK in Baner",
        description="Near IT park",
        address="Flat 302, Baner Highway",
        city="Pune"
    )
    db.session.add(prop)
    db.session.flush()

    room = Room(
        property_id=prop.id,
        rent_amount=9000.0,
        room_type="private"
    )
    db.session.add(room)
    db.session.commit()

    # 1. Seeker sends inquiry to host
    res_inquiry = client.post(
        f"/api/v1/rooms/{room.id}/inquiry",
        headers={"Authorization": f"Bearer {seeker_token}"},
        json={"message": "Hi, I am interested in moving in next month. Is this still available?"}
    )
    assert res_inquiry.status_code == 201
    inquiry_data = res_inquiry.get_json()["data"]
    assert inquiry_data["room_id"] == room.id
    assert inquiry_data["host_id"] == host_id
    assert inquiry_data["status"] == "pending"
    assert "Baner" in inquiry_data["room_title"]

    inquiry_id = inquiry_data["id"]

    # 2. Host retrieves received inquiries
    res_host = client.get(
        "/api/v1/rooms/inquiries/received",
        headers={"Authorization": f"Bearer {host_token}"}
    )
    assert res_host.status_code == 200
    host_inbox = res_host.get_json()["data"]
    assert len(host_inbox) == 1
    assert host_inbox[0]["sender_email"] == "seeker@example.com"
    assert host_inbox[0]["message"] == "Hi, I am interested in moving in next month. Is this still available?"

    # 3. Seeker retrieves sent inquiries
    res_seeker = client.get(
        "/api/v1/rooms/inquiries/sent",
        headers={"Authorization": f"Bearer {seeker_token}"}
    )
    assert res_seeker.status_code == 200
    seeker_sent = res_seeker.get_json()["data"]
    assert len(seeker_sent) == 1
    assert seeker_sent[0]["id"] == inquiry_id

    # 4. Host marks inquiry as replied
    res_status = client.patch(
        f"/api/v1/rooms/inquiries/{inquiry_id}/status",
        headers={"Authorization": f"Bearer {host_token}"},
        json={"status": "replied"}
    )
    assert res_status.status_code == 200
    assert res_status.get_json()["data"]["status"] == "replied"

    # 5. Unauthorized user cannot update inquiry
    other_id, other_token = create_user_and_token(client, "random@example.com")
    res_unauth = client.patch(
        f"/api/v1/rooms/inquiries/{inquiry_id}/status",
        headers={"Authorization": f"Bearer {other_token}"},
        json={"status": "archived"}
    )
    assert res_unauth.status_code == 403

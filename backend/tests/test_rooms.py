import json
import pytest
from app import create_app, db
from app.models.user_models import User

@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()

def register_and_get_token(client, email="lister@example.com"):
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Property Lister",
        "role": "lister"
    })
    return res.get_json()["access_token"]

def test_create_and_get_room(client):
    token = register_and_get_token(client)

    # 1. Test unauthorized create
    res_unauth = client.post("/api/v1/rooms", json={"title": "Nice Room"})
    assert res_unauth.status_code == 401

    # 2. Test create room with auth
    room_payload = {
        "title": "Sunny Private Room near University",
        "description": "Quiet, spacious room with hardwood floors and high-speed Wi-Fi.",
        "address": "104 University Ave",
        "city": "Austin",
        "neighborhood": "Campus North",
        "property_type": "apartment",
        "room_type": "private",
        "rent_amount": 750.0,
        "deposit_amount": 500.0,
        "available_from": "Aug 1",
        "amenities": ["Wi-Fi", "In-Unit Laundry", "AC"],
        "images": ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"]
    }
    res_create = client.post(
        "/api/v1/rooms",
        headers={"Authorization": f"Bearer {token}"},
        json=room_payload
    )
    assert res_create.status_code == 201
    room_id = res_create.get_json()["data"]["room_id"]

    # 3. Test get room listings
    res_list = client.get("/api/v1/rooms")
    assert res_list.status_code == 200
    rooms = res_list.get_json()["data"]
    assert len(rooms) == 1
    assert rooms[0]["title"] == "Sunny Private Room near University"
    assert rooms[0]["rent_amount"] == 750.0

    # 4. Test filter by city matching
    res_city = client.get("/api/v1/rooms?city=Austin")
    assert res_city.status_code == 200
    assert len(res_city.get_json()["data"]) == 1

    # 5. Test filter by city not matching
    res_other_city = client.get("/api/v1/rooms?city=Seattle")
    assert res_other_city.status_code == 200
    assert len(res_other_city.get_json()["data"]) == 0

    # 6. Test filter by budget
    res_cheap = client.get("/api/v1/rooms?budget_max=600")
    assert res_cheap.status_code == 200
    assert len(res_cheap.get_json()["data"]) == 0

    res_affordable = client.get("/api/v1/rooms?budget_max=800")
    assert res_affordable.status_code == 200
    assert len(res_affordable.get_json()["data"]) == 1

    # 7. Test get single room detail
    res_detail = client.get(f"/api/v1/rooms/{room_id}")
    assert res_detail.status_code == 200
    detail = res_detail.get_json()["data"]
    assert detail["title"] == "Sunny Private Room near University"
    assert "Wi-Fi" in detail["amenities"]

    # 8. Test nonexistent room detail
    res_not_found = client.get("/api/v1/rooms/99999")
    assert res_not_found.status_code == 404

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

def register_user(client, email, name, ai_consent=True):
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": name,
        "role": "seeker"
    })
    token = res.get_json()["access_token"]
    if not ai_consent:
        client.put("/api/v1/auth/consent", headers={"Authorization": f"Bearer {token}"}, json={"ai_consent_enabled": False})
    return token

def test_ai_living_agreement_generation_and_fallback(client):
    token = register_user(client, "houseadmin@example.com", "House Admin")

    # 1. Create household
    res_hh = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Baner Co-Living Society", "address": "Balewadi High Street, Baner, Pune"}
    )
    assert res_hh.status_code == 201
    hh_id = res_hh.get_json()["data"]["household"]["id"]

    # 2. Check no agreement initially
    res_get_empty = client.get(f"/api/v1/ai/agreement/{hh_id}", headers={"Authorization": f"Bearer {token}"})
    assert res_get_empty.status_code == 200
    assert res_get_empty.get_json()["data"] is None

    # 3. Generate agreement
    res_gen = client.post(
        "/api/v1/ai/generate-agreement",
        headers={"Authorization": f"Bearer {token}"},
        json={"household_id": hh_id}
    )
    assert res_gen.status_code == 200
    data = res_gen.get_json()["data"]
    assert "clauses" in data
    clauses = data["clauses"]
    assert len(clauses) == 5
    categories = [c["category"] for c in clauses]
    assert "Quiet Hours" in categories
    assert "Cleanliness" in categories

    # 4. Fetch saved agreement
    res_get = client.get(f"/api/v1/ai/agreement/{hh_id}", headers={"Authorization": f"Bearer {token}"})
    assert res_get.status_code == 200
    saved = res_get.get_json()["data"]
    assert len(saved["clauses"]) == 5

    # 5. Update a clause
    clauses[0]["content"] = "Customized quiet hours: 10:00 PM to 8:00 AM."
    res_update = client.put(
        f"/api/v1/ai/agreement/{hh_id}/clauses",
        headers={"Authorization": f"Bearer {token}"},
        json={"clauses": clauses}
    )
    assert res_update.status_code == 200
    updated_clauses = res_update.get_json()["data"]["clauses"]
    assert updated_clauses[0]["content"] == "Customized quiet hours: 10:00 PM to 8:00 AM."

def test_ai_consent_respected(client):
    # Register with AI consent disabled
    token_no_consent = register_user(client, "private@example.com", "Private User", ai_consent=False)

    res_hh = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_no_consent}"},
        json={"name": "Private Flat", "address": "100 Privacy Way"}
    )
    hh_id = res_hh.get_json()["data"]["household"]["id"]

    res_gen = client.post(
        "/api/v1/ai/generate-agreement",
        headers={"Authorization": f"Bearer {token_no_consent}"},
        json={"household_id": hh_id}
    )
    assert res_gen.status_code == 200
    data = res_gen.get_json()["data"]
    assert data["generated_via"] == "deterministic_engine"
    assert len(data["clauses"]) == 5

import pytest
from app import create_app, db

@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()

def register_user(client, email, name):
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": name,
        "role": "seeker"
    })
    return res.get_json()["access_token"]

def test_household_lifecycle_and_expenses(client):
    token_admin = register_user(client, "admin@example.com", "Admin User")
    token_member = register_user(client, "member@example.com", "Member User")

    # 1. Create household
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"name": "Blue Ridge Tech Loft", "address": "Tower 14, Blue Ridge, Hinjewadi, Pune"}
    )
    assert res_create.status_code == 201
    hh_data = res_create.get_json()["data"]
    household_id = hh_data["household"]["id"]
    invite_code = hh_data["invite_code"]
    assert len(invite_code) == 8

    # 2. Join household with member
    res_join = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_member}"},
        json={"invite_code": invite_code}
    )
    assert res_join.status_code == 200

    # 3. Check household roster
    res_hh = client.get(
        f"/api/v1/household/{household_id}",
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_hh.status_code == 200
    members = res_hh.get_json()["data"]["members"]
    assert len(members) == 2
    roles = [m["role"] for m in members]
    assert "admin" in roles
    assert "member" in roles

    # 4. Add expense ($60 groceries by Admin -> split equally $30 each)
    res_exp = client.post(
        f"/api/v1/household/{household_id}/expenses",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"title": "Weekly Groceries", "amount": 60.0, "category": "Groceries"}
    )
    assert res_exp.status_code == 201

    # 5. Check ledger from Member's view (Member owes $30)
    res_ledger_member = client.get(
        f"/api/v1/household/{household_id}/expenses",
        headers={"Authorization": f"Bearer {token_member}"}
    )
    assert res_ledger_member.status_code == 200
    ledger_m = res_ledger_member.get_json()["data"]
    assert ledger_m["total_i_owe"] == 30.0
    assert ledger_m["total_owed_to_me"] == 0.0
    assert len(ledger_m["debts"]) == 1
    assert ledger_m["debts"][0]["amount"] == 30.0

    # 6. Check ledger from Admin's view (Admin is owed $30)
    res_ledger_admin = client.get(
        f"/api/v1/household/{household_id}/expenses",
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_ledger_admin.status_code == 200
    ledger_a = res_ledger_admin.get_json()["data"]
    assert ledger_a["total_owed_to_me"] == 30.0
    assert ledger_a["total_i_owe"] == 0.0

    # 7. Member settles debt to Admin
    admin_id = members[0]["user_id"] if members[0]["role"] == "admin" else members[1]["user_id"]
    res_settle = client.post(
        f"/api/v1/household/{household_id}/settle",
        headers={"Authorization": f"Bearer {token_member}"},
        json={"to_user_id": admin_id}
    )
    assert res_settle.status_code == 200

    # 8. Check ledger after settlement (should be 0)
    res_ledger_after = client.get(
        f"/api/v1/household/{household_id}/expenses",
        headers={"Authorization": f"Bearer {token_member}"}
    )
    assert res_ledger_after.get_json()["data"]["total_i_owe"] == 0.0

    # 9. Test Chores
    res_chore_add = client.post(
        f"/api/v1/household/{household_id}/chores",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"title": "Take out recycling", "frequency": "weekly", "due_date": "Sunday"}
    )
    assert res_chore_add.status_code == 201
    chore_id = res_chore_add.get_json()["data"]["id"]

    res_toggle = client.patch(
        f"/api/v1/household/{household_id}/chores/{chore_id}/toggle",
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_toggle.status_code == 200
    assert res_toggle.get_json()["data"]["is_completed"] is True


def test_mutual_debt_settlement_prevents_inversion(client):
    """Regression test for Issue #37: Debt settlement inversion bug.

    Ensures that when User A and User B have mutual obligations (e.g., A pays 100
    so B owes 50; B pays 60 so A owes 30; net: B owes A 20), settling the net debt
    clears both directions and does NOT invert the debt (User A must NOT end up owing User B 30).
    """
    token_a = register_user(client, "usera@example.com", "User A")
    token_b = register_user(client, "userb@example.com", "User B")

    # 1. Create household and join
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"name": "Mutual Debt Flat", "address": "Baner, Pune"}
    )
    assert res_create.status_code == 201
    hh_data = res_create.get_json()["data"]
    household_id = hh_data["household"]["id"]
    invite_code = hh_data["invite_code"]

    res_join = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"invite_code": invite_code}
    )
    assert res_join.status_code == 200

    # Get user IDs
    res_hh = client.get(
        f"/api/v1/household/{household_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    members = res_hh.get_json()["data"]["members"]
    user_a_id = next(m["user_id"] for m in members if m["role"] == "admin")
    user_b_id = next(m["user_id"] for m in members if m["role"] == "member")

    # 2. User A pays 100 for Groceries (B owes A 50)
    res_exp1 = client.post(
        f"/api/v1/household/{household_id}/expenses",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"title": "Groceries", "amount": 100.0, "category": "Groceries"}
    )
    assert res_exp1.status_code == 201

    # 3. User B pays 60 for Dinner (A owes B 30)
    res_exp2 = client.post(
        f"/api/v1/household/{household_id}/expenses",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": "Dinner", "amount": 60.0, "category": "Other"}
    )
    assert res_exp2.status_code == 201

    # 4. Verify pre-settlement ledger: Net debt is B owes A 20
    res_ledger_b = client.get(
        f"/api/v1/household/{household_id}/expenses",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    data_b = res_ledger_b.get_json()["data"]
    assert len(data_b["debts"]) == 1
    assert data_b["debts"][0]["from_user_id"] == user_b_id
    assert data_b["debts"][0]["to_user_id"] == user_a_id
    assert data_b["debts"][0]["amount"] == 20.0

    # 5. User B settles debt with User A
    res_settle = client.post(
        f"/api/v1/household/{household_id}/settle",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"to_user_id": user_a_id}
    )
    assert res_settle.status_code == 200
    assert "Settled 2 obligations" in res_settle.get_json()["message"]

    # 6. Verify post-settlement ledger for User B: Must be 0
    res_ledger_b_after = client.get(
        f"/api/v1/household/{household_id}/expenses",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    data_b_after = res_ledger_b_after.get_json()["data"]
    assert data_b_after["debts"] == []
    assert data_b_after["total_i_owe"] == 0.0
    assert data_b_after["total_owed_to_me"] == 0.0
    assert data_b_after["net_balance"] == 0.0

    # 7. CRITICAL VERIFICATION for User A:
    # Under the bug, User A would now owe User B 30.
    # With the fix, User A's debts must be completely empty!
    res_ledger_a_after = client.get(
        f"/api/v1/household/{household_id}/expenses",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    data_a_after = res_ledger_a_after.get_json()["data"]
    assert data_a_after["debts"] == []
    assert data_a_after["total_i_owe"] == 0.0
    assert data_a_after["total_owed_to_me"] == 0.0
    assert data_a_after["net_balance"] == 0.0


def test_aggregate_category_breakdown(client):
    """Verify aggregate category breakdown in ledger.

    Tests:
    1. No expenses returns an empty category_breakdown dict.
    2. Multiple expenses in the same category are aggregated correctly.
    3. Different categories maintain separate totals.
    4. Existing ledger behavior (debts, recent_expenses, balances) still works.
    """
    token = register_user(client, "catadmin@example.com", "Cat Admin")

    # 1. Create household
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Category Test Flat", "address": "Koregaon Park, Pune"}
    )
    assert res_create.status_code == 201
    hh_id = res_create.get_json()["data"]["household"]["id"]

    # 2. Check no expenses returns an empty category_breakdown
    res_empty = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_empty.status_code == 200
    assert res_empty.get_json()["data"]["category_breakdown"] == {}

    # 3. Add multiple expenses in the same category (Groceries: 120 + 80 = 200)
    res_exp1 = client.post(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Supermarket", "amount": 120.0, "category": "Groceries"}
    )
    assert res_exp1.status_code == 201

    res_exp2 = client.post(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Vegetables", "amount": 80.0, "category": "Groceries"}
    )
    assert res_exp2.status_code == 201

    # 4. Add expenses in different categories (Utilities: 300, Supplies: 45.50)
    res_exp3 = client.post(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "WiFi Bill", "amount": 300.0, "category": "Utilities"}
    )
    assert res_exp3.status_code == 201

    res_exp4 = client.post(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Cleaning Mop", "amount": 45.50, "category": "Supplies"}
    )
    assert res_exp4.status_code == 201

    # 5. Fetch ledger and verify aggregate category breakdown
    res_ledger = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_ledger.status_code == 200
    data = res_ledger.get_json()["data"]

    # Verify category_breakdown totals
    cb = data["category_breakdown"]
    assert cb["Groceries"] == 200.0
    assert cb["Utilities"] == 300.0
    assert cb["Supplies"] == 45.50
    assert len(cb) == 3

    # Verify existing ledger behavior and fields are intact
    assert "recent_expenses" in data
    assert len(data["recent_expenses"]) == 4
    assert "debts" in data
    assert "total_i_owe" in data
    assert "total_owed_to_me" in data
    assert "net_balance" in data



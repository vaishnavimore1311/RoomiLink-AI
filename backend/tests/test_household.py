from datetime import datetime, timedelta, timezone
import pytest
from app import create_app, db
from app.models.user_models import User
from app.models.subscription_models import SubscriptionPlan, UserSubscription
from app.models.household_models import Household, HouseholdMember

@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()

def subscribe_user(email, plan_slug="pro_seeker", status="active", expires_in_days=30):
    user = User.query.filter_by(email=email).first()
    plan = SubscriptionPlan.query.filter_by(slug=plan_slug).first()
    if not plan:
        plan = SubscriptionPlan(
            name="Pro Seeker",
            slug=plan_slug,
            target_role="seeker",
            price_inr=499.0
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

def register_user(client, email, name, role="seeker", subscribe=True):
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": name,
        "role": role
    })
    token = res.get_json()["access_token"]
    if subscribe:
        subscribe_user(email)
    return token

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


# ---------------------------------------------------------------------------
# Issue #49: Subscription Guard Tests for Household Hub Joining & Creation
# ---------------------------------------------------------------------------

def test_join_household_unauthenticated(client):
    """Unauthenticated users cannot join a household (401 Unauthorized)."""
    res = client.post("/api/v1/household/join", json={"invite_code": "TESTCODE"})
    assert res.status_code == 401


def test_join_household_unsubscribed_forbidden(client):
    """Unsubscribed users cannot join a household via invite code and receive 403 SUBSCRIPTION_REQUIRED."""
    # 1. Creator (subscribed) creates household
    token_creator = register_user(client, "creator1@example.com", "Creator One", subscribe=True)
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_creator}"},
        json={"name": "Kharadi Shared Flat", "address": "EON IT Park, Kharadi, Pune"}
    )
    assert res_create.status_code == 201
    hh_id = res_create.get_json()["data"]["household"]["id"]
    invite_code = res_create.get_json()["data"]["invite_code"]

    # 2. Unsubscribed user registers (without subscription)
    token_unsub = register_user(client, "unsub_joiner@example.com", "Unsub Joiner", subscribe=False)
    unsub_user = User.query.filter_by(email="unsub_joiner@example.com").first()

    # 3. Direct API request to join must be rejected with 403 SUBSCRIPTION_REQUIRED
    res_join = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_unsub}"},
        json={"invite_code": invite_code}
    )
    assert res_join.status_code == 403
    body = res_join.get_json()
    assert body["status"] == "error"
    assert body["code"] == "SUBSCRIPTION_REQUIRED"
    assert body["upgrade_url"] == "/pricing"
    assert "subscription is required" in body["message"].lower()

    # 4. CRITICAL: Verify rejected join attempt did NOT create a membership or modify household
    membership = HouseholdMember.query.filter_by(household_id=hh_id, user_id=unsub_user.id).first()
    assert membership is None

    # Total members remains exactly 1 (the creator)
    members_count = HouseholdMember.query.filter_by(household_id=hh_id).count()
    assert members_count == 1


def test_join_household_expired_subscription_forbidden(client):
    """Users with expired subscriptions are rejected from joining a household."""
    token_creator = register_user(client, "creator2@example.com", "Creator Two", subscribe=True)
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_creator}"},
        json={"name": "Wakad Co-Living", "address": "Dutta Mandir Road, Wakad, Pune"}
    )
    hh_id = res_create.get_json()["data"]["household"]["id"]
    invite_code = res_create.get_json()["data"]["invite_code"]

    # User with expired subscription (5 days ago)
    token_expired = register_user(client, "expired_joiner@example.com", "Expired Joiner", subscribe=False)
    subscribe_user("expired_joiner@example.com", status="expired", expires_in_days=-5)
    expired_user = User.query.filter_by(email="expired_joiner@example.com").first()

    res_join = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_expired}"},
        json={"invite_code": invite_code}
    )
    assert res_join.status_code == 403
    body = res_join.get_json()
    assert body["code"] == "SUBSCRIPTION_REQUIRED"

    membership = HouseholdMember.query.filter_by(household_id=hh_id, user_id=expired_user.id).first()
    assert membership is None


def test_join_household_cancelled_subscription_forbidden(client):
    """Users with cancelled subscriptions are rejected from joining a household."""
    token_creator = register_user(client, "creator3@example.com", "Creator Three", subscribe=True)
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_creator}"},
        json={"name": "Viman Nagar Studio", "address": "Symbiosis Road, Viman Nagar, Pune"}
    )
    hh_id = res_create.get_json()["data"]["household"]["id"]
    invite_code = res_create.get_json()["data"]["invite_code"]

    # User with cancelled subscription
    token_cancelled = register_user(client, "cancelled_joiner@example.com", "Cancelled Joiner", subscribe=False)
    subscribe_user("cancelled_joiner@example.com", status="cancelled", expires_in_days=30)
    cancelled_user = User.query.filter_by(email="cancelled_joiner@example.com").first()

    res_join = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_cancelled}"},
        json={"invite_code": invite_code}
    )
    assert res_join.status_code == 403
    body = res_join.get_json()
    assert body["code"] == "SUBSCRIPTION_REQUIRED"

    membership = HouseholdMember.query.filter_by(household_id=hh_id, user_id=cancelled_user.id).first()
    assert membership is None


def test_join_household_subscribed_user_success(client):
    """Subscribed users can successfully join a household using a valid invite code."""
    token_creator = register_user(client, "creator4@example.com", "Creator Four", subscribe=True)
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_creator}"},
        json={"name": "Kothrud Co-Living", "address": "Paud Road, Kothrud, Pune"}
    )
    hh_id = res_create.get_json()["data"]["household"]["id"]
    invite_code = res_create.get_json()["data"]["invite_code"]

    # Subscribed seeker
    token_sub = register_user(client, "sub_joiner@example.com", "Subscribed Joiner", subscribe=True)
    sub_user = User.query.filter_by(email="sub_joiner@example.com").first()

    res_join = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_sub}"},
        json={"invite_code": invite_code}
    )
    assert res_join.status_code == 200
    body = res_join.get_json()
    assert body["status"] == "success"
    assert "Successfully joined" in body["message"]

    # Verify membership persisted in DB
    membership = HouseholdMember.query.filter_by(household_id=hh_id, user_id=sub_user.id).first()
    assert membership is not None
    assert membership.role == "member"


def test_join_household_admin_bypass_success(client):
    """System administrators bypass the subscription requirement to join households."""
    token_creator = register_user(client, "creator5@example.com", "Creator Five", subscribe=True)
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_creator}"},
        json={"name": "Aundh Residency", "address": "DP Road, Aundh, Pune"}
    )
    invite_code = res_create.get_json()["data"]["invite_code"]

    # Admin user without subscription
    token_admin = register_user(client, "sysadmin@roomilink.ai", "Sys Admin", role="admin", subscribe=False)

    res_join = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"invite_code": invite_code}
    )
    assert res_join.status_code == 200
    assert res_join.get_json()["status"] == "success"


def test_join_household_subscribed_user_invalid_code(client):
    """Eligible subscribed user providing an invalid invite code receives 404."""
    token_sub = register_user(client, "sub_invalid@example.com", "Sub Invalid", subscribe=True)

    res_join = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_sub}"},
        json={"invite_code": "NONEXIST"}
    )
    assert res_join.status_code == 404
    body = res_join.get_json()
    assert body["status"] == "error"
    assert "Invalid invite code" in body["message"]


def test_join_household_subscribed_user_missing_code(client):
    """Eligible subscribed user providing an empty invite code receives 400."""
    token_sub = register_user(client, "sub_empty@example.com", "Sub Empty", subscribe=True)

    res_join = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_sub}"},
        json={"invite_code": ""}
    )
    assert res_join.status_code == 400
    body = res_join.get_json()
    assert "Invite code is required" in body["message"]


def test_join_household_already_member_conflict(client):
    """Subscribed user attempting to join a household they are already part of receives 409."""
    token_creator = register_user(client, "creator6@example.com", "Creator Six", subscribe=True)
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_creator}"},
        json={"name": "Baner Heights", "address": "Pan Card Club Road, Baner, Pune"}
    )
    invite_code = res_create.get_json()["data"]["invite_code"]

    token_sub = register_user(client, "duplicate_joiner@example.com", "Duplicate Joiner", subscribe=True)

    # First join -> 200
    res_join1 = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_sub}"},
        json={"invite_code": invite_code}
    )
    assert res_join1.status_code == 200

    # Second join -> 409 Conflict
    res_join2 = client.post(
        "/api/v1/household/join",
        headers={"Authorization": f"Bearer {token_sub}"},
        json={"invite_code": invite_code}
    )
    assert res_join2.status_code == 409
    assert "already a member" in res_join2.get_json()["message"]


def test_create_household_unsubscribed_forbidden(client):
    """Unsubscribed users cannot create a household workspace (403 SUBSCRIPTION_REQUIRED)."""
    token_unsub = register_user(client, "unsub_creator@example.com", "Unsub Creator", subscribe=False)

    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_unsub}"},
        json={"name": "Should Fail", "address": "Nowhere, Pune"}
    )
    assert res_create.status_code == 403
    body = res_create.get_json()
    assert body["code"] == "SUBSCRIPTION_REQUIRED"
    assert body["upgrade_url"] == "/pricing"
    assert "subscription is required" in body["message"].lower()

    # Verify no household was created
    hh = Household.query.filter_by(name="Should Fail").first()
    assert hh is None


def test_create_household_subscribed_user_success(client):
    """Subscribed users can create a household workspace (201 Created)."""
    token_sub = register_user(client, "sub_creator@example.com", "Sub Creator", subscribe=True)

    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_sub}"},
        json={"name": "Subscribed Space", "address": "Magarpatta City, Hadapsar, Pune"}
    )
    assert res_create.status_code == 201
    body = res_create.get_json()
    assert body["status"] == "success"
    assert len(body["data"]["invite_code"]) == 8


def test_ensure_household_members_subscribed(client):
    """Verify that ensure_household_members_subscribed guarantees all household members have active subscriptions."""
    from seed import ensure_household_members_subscribed
    token_creator = register_user(client, "creator_seed@test.com", "Creator Seed", subscribe=True)
    res_create = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_creator}"},
        json={"name": "Test Sub Hub", "address": "Baner, Pune"}
    )
    hh_id = res_create.get_json()["data"]["household"]["id"]

    # Register an unsubscribed member and add them as member
    register_user(client, "unsub_member@test.com", "Unsub Member", subscribe=False)
    unsub_user = User.query.filter_by(email="unsub_member@test.com").first()
    assert unsub_user.get_active_subscription() is None

    db.session.add(HouseholdMember(household_id=hh_id, user_id=unsub_user.id, role="member"))
    db.session.commit()

    # Run ensure function
    ensure_household_members_subscribed()

    # Verify the member now has an active Pro Seeker subscription
    assert unsub_user.get_active_subscription() is not None
    assert unsub_user.get_active_subscription().plan.slug == "pro_seeker"




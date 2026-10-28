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


# ==================== ACTIVITY-BASED SHARED EXPENSES TESTS ====================

def setup_four_roommate_household(client):
    """Helper to set up a household with 4 roommates: Sneha (admin), Aditya, Priya, Rahul."""
    t_sneha = register_user(client, "sneha@example.com", "Sneha", subscribe=True)
    t_aditya = register_user(client, "aditya@example.com", "Aditya", subscribe=True)
    t_priya = register_user(client, "priya@example.com", "Priya", subscribe=True)
    t_rahul = register_user(client, "rahul@example.com", "Rahul", subscribe=True)

    # Sneha creates household
    res_c = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {t_sneha}"},
        json={"name": "Palm Grove Villa", "address": "Kalyani Nagar, Pune"}
    )
    hh_data = res_c.get_json()["data"]["household"]
    hh_id = hh_data["id"]
    invite_code = hh_data["invite_code"]

    # Aditya, Priya, Rahul join
    for t in [t_aditya, t_priya, t_rahul]:
        res_j = client.post(
            "/api/v1/household/join",
            headers={"Authorization": f"Bearer {t}"},
            json={"invite_code": invite_code}
        )
        assert res_j.status_code == 200

    u_sneha = User.query.filter_by(email="sneha@example.com").first()
    u_aditya = User.query.filter_by(email="aditya@example.com").first()
    u_priya = User.query.filter_by(email="priya@example.com").first()
    u_rahul = User.query.filter_by(email="rahul@example.com").first()

    return {
        "household_id": hh_id,
        "tokens": {
            "sneha": t_sneha,
            "aditya": t_aditya,
            "priya": t_priya,
            "rahul": t_rahul
        },
        "users": {
            "sneha": u_sneha,
            "aditya": u_aditya,
            "priya": u_priya,
            "rahul": u_rahul
        }
    }


def test_scenario_1_and_2_four_roommates_three_participants_equal_split(client):
    """Scenario 1 & 2: 4 roommates, 3 participants, ₹3,000 party expense, equal split.
    Rahul is excluded and incurs ₹0 debt."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Sneha creates Birthday Party activity for ₹3,000 with Sneha, Aditya, Priya
    res = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Birthday Party",
            "category": "Party / Outing",
            "total_amount": 3000.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, users["aditya"].id, users["priya"].id],
            "split_method": "equal",
            "description": "Party at Palm Grove terrace"
        }
    )
    assert res.status_code == 201
    act_data = res.get_json()["data"]
    assert act_data["title"] == "Birthday Party"
    assert act_data["participant_count"] == 3
    assert act_data["total_amount"] == 3000.0

    # Verify participant shares: Sneha, Aditya, Priya each have 1000.0
    shares = {p["user_id"]: p["share_amount"] for p in act_data["participants"]}
    assert shares[users["sneha"].id] == 1000.0
    assert shares[users["aditya"].id] == 1000.0
    assert shares[users["priya"].id] == 1000.0
    assert users["rahul"].id not in shares

    # Verify ledger from Sneha's view (Sneha paid 3000, covers her 1000 share, owed 2000)
    res_sneha = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    ledger_s = res_sneha.get_json()["data"]
    assert ledger_s["total_owed_to_me"] == 2000.0
    assert ledger_s["total_i_owe"] == 0.0
    assert ledger_s["net_balance"] == 2000.0

    # Verify ledger from Aditya's view (Aditya owes Sneha 1000)
    res_aditya = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['aditya']}"}
    )
    ledger_a = res_aditya.get_json()["data"]
    assert ledger_a["total_i_owe"] == 1000.0
    assert ledger_a["total_owed_to_me"] == 0.0

    # Verify ledger from Priya's view (Priya owes Sneha 1000)
    res_priya = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['priya']}"}
    )
    ledger_p = res_priya.get_json()["data"]
    assert ledger_p["total_i_owe"] == 1000.0
    assert ledger_p["total_owed_to_me"] == 0.0

    # Scenario 2: Verify Rahul (nonparticipant) owes ₹0 and appears in NO debt obligations
    res_rahul = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['rahul']}"}
    )
    ledger_r = res_rahul.get_json()["data"]
    assert ledger_r["total_i_owe"] == 0.0
    assert ledger_r["total_owed_to_me"] == 0.0
    assert ledger_r["net_balance"] == 0.0
    for debt in ledger_r["debts"]:
        assert debt["from_user_id"] != users["rahul"].id
        assert debt["to_user_id"] != users["rahul"].id


def test_scenario_3_payer_not_participant(client):
    """Scenario 3: One roommate pays on behalf of the group without participating.
    Rahul pays ₹3,000 for Sneha, Aditya, and Priya. Rahul is not a participant."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    res = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['rahul']}"},
        json={
            "title": "Girls Night Food Order",
            "category": "Food & Dining",
            "total_amount": 3000.0,
            "payer_id": users["rahul"].id,
            "participant_ids": [users["sneha"].id, users["aditya"].id, users["priya"].id],
            "split_method": "equal"
        }
    )
    assert res.status_code == 201

    # Rahul paid full ₹3,000 on their behalf, so Rahul is owed ₹3,000 total
    res_r = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['rahul']}"}
    )
    ledger_r = res_r.get_json()["data"]
    assert ledger_r["total_owed_to_me"] == 3000.0
    assert ledger_r["total_i_owe"] == 0.0
    assert ledger_r["net_balance"] == 3000.0

    # Sneha owes Rahul 1000
    res_s = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    assert res_s.get_json()["data"]["total_i_owe"] == 1000.0


def test_scenario_4_and_5_custom_split_and_invalid_sum(client):
    """Scenario 4 & 5: Custom amounts per participant. Sum != total is rejected."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Invalid custom split: 1500 + 1000 + 400 = 2900 != 3000
    res_invalid = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Road Trip Supplies",
            "category": "Trip / Travel",
            "total_amount": 3000.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, users["aditya"].id, users["priya"].id],
            "split_method": "custom",
            "custom_shares": {
                str(users["sneha"].id): 1500.0,
                str(users["aditya"].id): 1000.0,
                str(users["priya"].id): 400.0
            }
        }
    )
    assert res_invalid.status_code == 400
    assert "does not match the total expense" in res_invalid.get_json()["message"]

    # Valid custom split: 1500 + 1000 + 500 = 3000
    res_valid = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Road Trip Supplies",
            "category": "Trip / Travel",
            "total_amount": 3000.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, users["aditya"].id, users["priya"].id],
            "split_method": "custom",
            "custom_shares": {
                str(users["sneha"].id): 1500.0,
                str(users["aditya"].id): 1000.0,
                str(users["priya"].id): 500.0
            }
        }
    )
    assert res_valid.status_code == 201
    act_data = res_valid.get_json()["data"]
    shares = {p["user_id"]: p["share_amount"] for p in act_data["participants"]}
    assert shares[users["sneha"].id] == 1500.0
    assert shares[users["aditya"].id] == 1000.0
    assert shares[users["priya"].id] == 500.0


def test_scenario_6_paise_rounding(client):
    """Scenario 6: ₹100 split 3 ways requires paise distribution: 33.34 + 33.33 + 33.33 = 100.00."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    res = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Snacks Pack",
            "category": "Groceries",
            "total_amount": 100.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, users["aditya"].id, users["priya"].id],
            "split_method": "equal"
        }
    )
    assert res.status_code == 201
    participants = res.get_json()["data"]["participants"]
    total_shares = sum(p["share_amount"] for p in participants)
    assert round(total_shares, 2) == 100.0
    share_values = sorted([p["share_amount"] for p in participants])
    assert share_values == [33.33, 33.33, 33.34]


def test_scenario_7_single_and_multiple_participants(client):
    """Scenario 7: One participant vs multiple participants."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Single participant: Sneha pays for her own specialty coffee
    res_single = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Specialty Coffee",
            "total_amount": 250.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id],
            "split_method": "equal"
        }
    )
    assert res_single.status_code == 201
    assert res_single.get_json()["data"]["participant_count"] == 1

    # No debt should be created
    res_ledger = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    assert res_ledger.get_json()["data"]["total_i_owe"] == 0.0
    assert res_ledger.get_json()["data"]["total_owed_to_me"] == 0.0


def test_scenario_8_two_separate_activities_disjoint_participants(client):
    """Scenario 8: Two separate activities with different participant lists.
    Activity A: Sneha, Aditya (Payer: Sneha, ₹1,000)
    Activity B: Rahul, Aditya (Payer: Rahul, ₹800)
    Priya is in neither. Aditya is in both."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Activity A
    res_a = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Movie Tickets",
            "total_amount": 1000.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, users["aditya"].id],
            "split_method": "equal"
        }
    )
    assert res_a.status_code == 201

    # Activity B
    res_b = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['rahul']}"},
        json={
            "title": "Gaming Tournament",
            "total_amount": 800.0,
            "payer_id": users["rahul"].id,
            "participant_ids": [users["rahul"].id, users["aditya"].id],
            "split_method": "equal"
        }
    )
    assert res_b.status_code == 201

    # Check Aditya's ledger: owes Sneha 500, owes Rahul 400. Total i owe = 900.
    res_aditya = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['aditya']}"}
    )
    ledger_aditya = res_aditya.get_json()["data"]
    assert ledger_aditya["total_i_owe"] == 900.0
    assert len(ledger_aditya["debts"]) == 2

    # Priya was in neither activity: owes 0
    res_priya = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['priya']}"}
    )
    assert res_priya.get_json()["data"]["total_i_owe"] == 0.0


def test_scenario_9_cross_household_participant_rejected(client):
    """Scenario 9: A participant from another household is rejected (400)."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Create another user in a completely different household
    token_stranger = register_user(client, "stranger@other.com", "Stranger", subscribe=True)
    res_other = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {token_stranger}"},
        json={"name": "Other House", "address": "Viman Nagar, Pune"}
    )
    assert res_other.status_code == 201
    u_stranger = User.query.filter_by(email="stranger@other.com").first()

    # Attempt to include stranger in hh_id activity
    res_bad = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Beach Outing",
            "total_amount": 1200.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, u_stranger.id],
            "split_method": "equal"
        }
    )
    assert res_bad.status_code == 400
    assert "does not belong to this household" in res_bad.get_json()["message"]


def test_scenario_10_unauthenticated_and_unauthorized_rejected(client):
    """Scenario 10: Unauthenticated and unauthorized API requests are rejected."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    users = setup["users"]

    # 1. Unauthenticated request (no JWT token) -> 401
    res_unauth = client.post(
        f"/api/v1/household/{hh_id}/activities",
        json={
            "title": "Test Party",
            "total_amount": 1000.0,
            "participant_ids": [users["sneha"].id]
        }
    )
    assert res_unauth.status_code == 401

    # 2. Unauthorized request (valid user but not member of this household) -> 403
    t_outsider = register_user(client, "outsider@test.com", "Outsider", subscribe=True)
    res_forbidden = client.get(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {t_outsider}"}
    )
    assert res_forbidden.status_code == 403


def test_scenario_11_debt_settlement_with_activities(client):
    """Scenario 11: Debt settlement works cleanly after activity expense without duplicate/inverted debts."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Sneha pays ₹2,000 for Party with Aditya
    client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Dinner Outing",
            "total_amount": 2000.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, users["aditya"].id],
            "split_method": "equal"
        }
    )

    # Aditya owes Sneha 1000. Settle debt!
    res_settle = client.post(
        f"/api/v1/household/{hh_id}/settle",
        headers={"Authorization": f"Bearer {tokens['aditya']}"},
        json={"to_user_id": users["sneha"].id}
    )
    assert res_settle.status_code == 200

    # Aditya owes 0 now
    res_a = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['aditya']}"}
    )
    assert res_a.get_json()["data"]["total_i_owe"] == 0.0


def test_scenario_12_category_totals_and_history(client):
    """Scenario 12: Category totals and recent expense history are updated correctly."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Create activity with category "Party / Outing"
    res = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Diwali Celebration",
            "category": "Party / Outing",
            "total_amount": 5000.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, users["aditya"].id],
            "split_method": "equal"
        }
    )
    assert res.status_code == 201

    # Check ledger expenses
    res_ledger = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    data = res_ledger.get_json()["data"]
    assert "Party / Outing" in data["category_breakdown"]
    assert data["category_breakdown"]["Party / Outing"] == 5000.0

    # Recent expenses has the activity info
    recent = data["recent_expenses"]
    assert len(recent) == 1
    assert recent[0]["title"] == "Diwali Celebration"
    assert recent[0]["participant_count"] == 2
    assert recent[0]["activity_id"] is not None


def test_scenario_13_duplicate_and_invalid_data_rejected(client):
    """Scenario 13: Invalid data (empty title, zero amount, empty participants) is rejected."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Empty title
    res_1 = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={"title": "", "total_amount": 100.0, "participant_ids": [users["sneha"].id]}
    )
    assert res_1.status_code == 400

    # Zero amount
    res_2 = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={"title": "Test", "total_amount": 0, "participant_ids": [users["sneha"].id]}
    )
    assert res_2.status_code == 400

    # Empty participants
    res_3 = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={"title": "Test", "total_amount": 100.0, "participant_ids": []}
    )
    assert res_3.status_code == 400


def test_scenario_14_cors_preflight_and_five_thousand_split_precision(client):
    """Scenario 14: OPTIONS preflight returns 200 with CORS headers, and ₹5,000 split across 3 roommates sums exactly."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # 1. Test CORS preflight OPTIONS request
    res_preflight = client.open(
        f"/api/v1/household/{hh_id}/activities",
        method="OPTIONS",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type,Authorization"
        }
    )
    assert res_preflight.status_code == 200
    assert res_preflight.headers.get("Access-Control-Allow-Origin") in ["*", "http://localhost:3000"]
    assert "POST" in res_preflight.headers.get("Access-Control-Allow-Methods", "")

    # 2. Test exact ₹5,000 split among 3 participants (Sneha pays, Sneha, Aditya, Rahul participate, Priya excluded)
    res = client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Weekend Flat Party",
            "category": "Party / Outing",
            "total_amount": 5000.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, users["aditya"].id, users["rahul"].id],
            "split_method": "equal"
        }
    )
    assert res.status_code == 201
    act_data = res.get_json()["data"]
    assert act_data["total_amount"] == 5000.0
    assert len(act_data["participants"]) == 3

    # Check participant shares sum exactly to 5000.00
    shares = {p["user_id"]: p["share_amount"] for p in act_data["participants"]}
    assert shares[users["sneha"].id] == 1666.67
    assert shares[users["aditya"].id] == 1666.67
    assert shares[users["rahul"].id] == 1666.66
    assert round(shares[users["sneha"].id] + shares[users["aditya"].id] + shares[users["rahul"].id], 2) == 5000.00

    # 3. Check Priya owes ₹0
    res_priya = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['priya']}"}
    )
    assert res_priya.get_json()["data"]["total_i_owe"] == 0.0

    # 4. Check Aditya owes ₹1,666.67
    res_aditya = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['aditya']}"}
    )
    assert res_aditya.get_json()["data"]["total_i_owe"] == 1666.67

    # 5. Check Rahul owes ₹1,666.66
    res_rahul = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['rahul']}"}
    )
    assert res_rahul.get_json()["data"]["total_i_owe"] == 1666.66

    # 6. Check Sneha is owed ₹3,333.33 (1666.67 + 1666.66)
    res_sneha = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    assert res_sneha.get_json()["data"]["total_owed_to_me"] == 3333.33


def test_scenario_15_departure_unauthenticated_and_non_member(client):
    """Scenario 15: Departure endpoints reject unauthenticated requests and non-members."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # 1. Unauthenticated leave -> 401
    res_unauth_leave = client.post(f"/api/v1/household/{hh_id}/leave")
    assert res_unauth_leave.status_code == 401

    # 2. Unauthenticated remove -> 401
    res_unauth_remove = client.delete(f"/api/v1/household/{hh_id}/members/{users['aditya'].id}")
    assert res_unauth_remove.status_code == 401

    # 3. Non-member user tries to leave -> 403
    t_outsider = register_user(client, "outsider_departure@test.com", "Outsider", subscribe=True)
    res_outsider_leave = client.post(
        f"/api/v1/household/{hh_id}/leave",
        headers={"Authorization": f"Bearer {t_outsider}"}
    )
    assert res_outsider_leave.status_code == 403
    assert "not a member" in res_outsider_leave.get_json()["message"].lower()


def test_scenario_16_member_leave_with_unsettled_debt_and_notice(client):
    """Scenario 16: Member leaves with unsettled debt; debt history preserved and Notice activity created."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Sneha pays ₹2,000 for dinner with Rahul (Rahul owes ₹1,000)
    client.post(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"},
        json={
            "title": "Welcome Dinner",
            "category": "Food & Dining",
            "total_amount": 2000.0,
            "payer_id": users["sneha"].id,
            "participant_ids": [users["sneha"].id, users["rahul"].id],
            "split_method": "equal"
        }
    )

    # Rahul owes ₹1,000 before leaving
    res_before = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['rahul']}"}
    )
    assert res_before.get_json()["data"]["total_i_owe"] == 1000.0

    # Rahul leaves the household
    res_leave = client.post(
        f"/api/v1/household/{hh_id}/leave",
        headers={"Authorization": f"Bearer {tokens['rahul']}"}
    )
    assert res_leave.status_code == 200
    leave_data = res_leave.get_json()["data"]
    assert leave_data["unsettled_balance"] == 1000.0

    # Rahul is no longer in household members
    m_rahul = HouseholdMember.query.filter_by(household_id=hh_id, user_id=users["rahul"].id).first()
    assert m_rahul is None

    # Activity notice created
    res_activities = client.get(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    act_list = res_activities.get_json()["data"]
    notice_acts = [a for a in act_list if a["category"] == "Notice"]
    assert len(notice_acts) >= 1
    assert "Rahul has moved out of the household" in notice_acts[0]["title"]
    assert "1000.00" in notice_acts[0]["notes"]

    # Debt history is PRESERVED in the household ledger
    res_sneha_ledger = client.get(
        f"/api/v1/household/{hh_id}/expenses",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    sneha_data = res_sneha_ledger.get_json()["data"]
    assert sneha_data["total_owed_to_me"] == 1000.0
    debt_entry = next((d for d in sneha_data["debts"] if d["from_user_id"] == users["rahul"].id), None)
    assert debt_entry is not None
    assert debt_entry["amount"] == 1000.0


def test_scenario_17_sole_admin_departure_and_reassignment(client):
    """Scenario 17: When the sole admin leaves, the admin role is reassigned to the next oldest roommate."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Sneha is currently the only admin
    m_sneha = HouseholdMember.query.filter_by(household_id=hh_id, user_id=users["sneha"].id).first()
    assert m_sneha.role == "admin"

    # Sneha leaves
    res_leave = client.post(
        f"/api/v1/household/{hh_id}/leave",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    assert res_leave.status_code == 200
    assert res_leave.get_json()["data"]["reassigned_admin_id"] == users["aditya"].id

    # Verify Aditya is now the admin
    m_aditya = HouseholdMember.query.filter_by(household_id=hh_id, user_id=users["aditya"].id).first()
    assert m_aditya.role == "admin"


def test_scenario_18_admin_removes_member(client):
    """Scenario 18: Admin removes a roommate, membership is deleted and Notice activity broadcast."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # Sneha (admin) removes Priya
    res_remove = client.delete(
        f"/api/v1/household/{hh_id}/members/{users['priya'].id}",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    assert res_remove.status_code == 200
    assert "Priya was removed" in res_remove.get_json()["message"]

    # Priya is no longer a member
    m_priya = HouseholdMember.query.filter_by(household_id=hh_id, user_id=users["priya"].id).first()
    assert m_priya is None

    # Check broadcast notice
    res_activities = client.get(
        f"/api/v1/household/{hh_id}/activities",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    act_list = res_activities.get_json()["data"]
    notice_acts = [a for a in act_list if a["category"] == "Notice"]
    assert len(notice_acts) >= 1
    assert "Priya was removed from the household roster" in notice_acts[0]["title"]


def test_scenario_19_admin_removal_restrictions(client):
    """Scenario 19: Non-admin removal, self-removal, and cross-household removal are rejected."""
    setup = setup_four_roommate_household(client)
    hh_id = setup["household_id"]
    tokens = setup["tokens"]
    users = setup["users"]

    # 1. Non-admin (Aditya) tries to remove Rahul -> 403
    res_non_admin = client.delete(
        f"/api/v1/household/{hh_id}/members/{users['rahul'].id}",
        headers={"Authorization": f"Bearer {tokens['aditya']}"}
    )
    assert res_non_admin.status_code == 403
    assert "Only household admins" in res_non_admin.get_json()["message"]

    # 2. Admin (Sneha) tries to remove herself via admin endpoint -> 400
    res_self = client.delete(
        f"/api/v1/household/{hh_id}/members/{users['sneha'].id}",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    assert res_self.status_code == 400
    assert "leave household endpoint" in res_self.get_json()["message"].lower()

    # 3. Admin (Sneha) tries to remove a user from another household -> 404
    t_other = register_user(client, "other_hh_user@test.com", "OtherUser", subscribe=True)
    u_other = User.query.filter_by(email="other_hh_user@test.com").first()
    res_cross = client.delete(
        f"/api/v1/household/{hh_id}/members/{u_other.id}",
        headers={"Authorization": f"Bearer {tokens['sneha']}"}
    )
    assert res_cross.status_code == 404
    assert "not a member" in res_cross.get_json()["message"].lower()


def test_scenario_20_sole_member_workspace_dissolve(client):
    """Scenario 20: When the only member in a household leaves, the workspace is safely cleaned up."""
    t_solo = register_user(client, "solo_renter@test.com", "Solo Renter", subscribe=True)
    res_c = client.post(
        "/api/v1/household/create",
        headers={"Authorization": f"Bearer {t_solo}"},
        json={"name": "Solo Haven Studio", "address": "Baner, Pune"}
    )
    hh_id = res_c.get_json()["data"]["household"]["id"]

    # Solo leaves
    res_leave = client.post(
        f"/api/v1/household/{hh_id}/leave",
        headers={"Authorization": f"Bearer {t_solo}"}
    )
    assert res_leave.status_code == 200
    assert res_leave.get_json()["data"]["dissolved"] is True

    # Household is deleted
    hh = db.session.get(Household, hh_id)
    assert hh is None







"""
Tests for Issue #94 (Admin self-demotion protection) and
Issue #95 (Admin Photo ID verification and rejection endpoints).
"""
import pytest
from app import create_app, db
from app.models.user_models import User, VerificationDocument


@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()


def register_user(client, email, role="seeker", full_name="Test User"):
    """Helper: register a user and return their JWT access token."""
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": full_name,
        "role": role,
        "city": "Pune"
    })
    assert res.status_code == 201, f"Registration failed for {email}: {res.get_json()}"
    return res.get_json()["access_token"]


def make_admin(client_or_app, email):
    """Helper: directly elevate a user to admin role in the DB."""
    user = User.query.filter_by(email=email).first()
    assert user is not None, f"User {email} not found"
    user.role = "admin"
    db.session.commit()


# ─── Issue #94: Admin Self-Demotion Protection ────────────────────────────────

class TestAdminSelfDemotionProtection:

    def test_admin_cannot_demote_self_to_seeker(self, client):
        """Backend must return HTTP 400 when an admin tries to set their own role to 'seeker'."""
        admin_token = register_user(client, "admin_self@example.com", role="admin", full_name="Admin Self")
        make_admin(client, "admin_self@example.com")
        admin = User.query.filter_by(email="admin_self@example.com").first()

        res = client.patch(
            f"/api/v1/admin/users/{admin.id}/role",
            json={"role": "seeker"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 400, f"Expected 400 for self-demotion, got {res.status_code}"
        body = res.get_json()
        assert body["status"] == "error"
        assert "self-demotion" in body["message"].lower() or "own role" in body["message"].lower()

    def test_admin_cannot_demote_self_to_lister(self, client):
        """Backend must return HTTP 400 when an admin tries to set their own role to 'lister'."""
        admin_token = register_user(client, "admin_lister@example.com", role="admin", full_name="Admin Lister")
        make_admin(client, "admin_lister@example.com")
        admin = User.query.filter_by(email="admin_lister@example.com").first()

        res = client.patch(
            f"/api/v1/admin/users/{admin.id}/role",
            json={"role": "lister"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 400
        body = res.get_json()
        assert body["status"] == "error"

    def test_admin_can_keep_own_role_as_admin(self, client):
        """An admin should be allowed to 'update' their role to admin (no-op)."""
        admin_token = register_user(client, "admin_keep@example.com", role="admin", full_name="Admin Keep")
        make_admin(client, "admin_keep@example.com")
        admin = User.query.filter_by(email="admin_keep@example.com").first()

        res = client.patch(
            f"/api/v1/admin/users/{admin.id}/role",
            json={"role": "admin"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        body = res.get_json()
        assert body["status"] == "success"
        assert body["data"]["role"] == "admin"

    def test_admin_can_change_other_users_role(self, client):
        """An admin can freely change another user's role."""
        admin_token = register_user(client, "admin_changer@example.com", role="admin", full_name="Admin Changer")
        make_admin(client, "admin_changer@example.com")

        register_user(client, "target_user@example.com", role="seeker", full_name="Target User")
        target = User.query.filter_by(email="target_user@example.com").first()

        res = client.patch(
            f"/api/v1/admin/users/{target.id}/role",
            json={"role": "lister"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        body = res.get_json()
        assert body["status"] == "success"
        assert body["data"]["role"] == "lister"

    def test_non_admin_cannot_change_roles(self, client):
        """A non-admin user must receive HTTP 403 when attempting to change roles."""
        seeker_token = register_user(client, "seeker_role_test@example.com", role="seeker", full_name="Seeker")
        seeker = User.query.filter_by(email="seeker_role_test@example.com").first()

        res = client.patch(
            f"/api/v1/admin/users/{seeker.id}/role",
            json={"role": "admin"},
            headers={"Authorization": f"Bearer {seeker_token}"}
        )
        assert res.status_code == 403

    def test_invalid_role_returns_400(self, client):
        """Submitting an invalid role value must return HTTP 400."""
        admin_token = register_user(client, "admin_invalid@example.com", role="admin", full_name="Admin Invalid")
        make_admin(client, "admin_invalid@example.com")

        register_user(client, "target_invalid@example.com", role="seeker", full_name="Target")
        target = User.query.filter_by(email="target_invalid@example.com").first()

        res = client.patch(
            f"/api/v1/admin/users/{target.id}/role",
            json={"role": "superuser"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 400

    def test_unauthenticated_role_change_returns_401(self, client):
        """Unauthenticated requests to the role endpoint must return HTTP 401."""
        register_user(client, "target_no_auth@example.com", role="seeker", full_name="No Auth")
        target = User.query.filter_by(email="target_no_auth@example.com").first()

        res = client.patch(
            f"/api/v1/admin/users/{target.id}/role",
            json={"role": "lister"}
        )
        assert res.status_code == 401


# ─── Issue #95: Admin Photo ID Verification Endpoints ────────────────────────

def upload_verification_document(client, token, email):
    """Helper: upload a fake verification document for a user."""
    import io
    res = client.post(
        "/api/v1/auth/verification/upload-id",
        headers={"Authorization": f"Bearer {token}"},
        data={
            "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"fake id content"), "my_id.jpg"),
            "document_type": "government_id"
        },
        content_type="multipart/form-data"
    )
    assert res.status_code == 201, f"Upload failed: {res.get_json()}"
    return res.get_json()["data"]


class TestAdminIDVerificationEndpoints:

    def test_admin_can_approve_submitted_document(self, client):
        """Admin can approve a user's submitted Photo ID (sets is_verified=True, doc.status='verified')."""
        admin_token = register_user(client, "admin_approver@example.com", role="admin", full_name="Admin Approver")
        make_admin(client, "admin_approver@example.com")

        user_token = register_user(client, "user_to_verify@example.com", role="seeker", full_name="User To Verify")
        upload_verification_document(client, user_token, "user_to_verify@example.com")
        user = User.query.filter_by(email="user_to_verify@example.com").first()

        res = client.post(
            f"/api/v1/admin/users/{user.id}/verify",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        body = res.get_json()
        assert body["status"] == "success"
        assert body["data"]["is_verified"] is True

        # Confirm DB state
        refreshed = db.session.get(User, user.id)
        assert refreshed.is_verified is True
        doc = VerificationDocument.query.filter_by(user_id=user.id).first()
        assert doc.status == "verified"

    def test_admin_can_reject_submitted_document(self, client):
        """Admin can reject a user's submitted Photo ID (is_verified stays False, doc.status='rejected')."""
        admin_token = register_user(client, "admin_rejecter@example.com", role="admin", full_name="Admin Rejecter")
        make_admin(client, "admin_rejecter@example.com")

        user_token = register_user(client, "user_to_reject@example.com", role="seeker", full_name="User To Reject")
        upload_verification_document(client, user_token, "user_to_reject@example.com")
        user = User.query.filter_by(email="user_to_reject@example.com").first()

        res = client.post(
            f"/api/v1/admin/users/{user.id}/reject-verification",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        body = res.get_json()
        assert body["status"] == "success"

        refreshed = db.session.get(User, user.id)
        assert refreshed.is_verified is False
        doc = VerificationDocument.query.filter_by(user_id=user.id).first()
        assert doc.status == "rejected"

    def test_verify_returns_404_if_no_document(self, client):
        """Verifying a user without a document returns HTTP 404."""
        admin_token = register_user(client, "admin_404@example.com", role="admin", full_name="Admin 404")
        make_admin(client, "admin_404@example.com")

        register_user(client, "nodoc_user@example.com", role="seeker", full_name="No Doc User")
        user = User.query.filter_by(email="nodoc_user@example.com").first()

        res = client.post(
            f"/api/v1/admin/users/{user.id}/verify",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 404
        body = res.get_json()
        assert body["status"] == "error"
        assert "document" in body["message"].lower()

    def test_reject_returns_404_if_no_document(self, client):
        """Rejecting a user without a document returns HTTP 404."""
        admin_token = register_user(client, "admin_reject_404@example.com", role="admin", full_name="Admin Reject 404")
        make_admin(client, "admin_reject_404@example.com")

        register_user(client, "nodoc_reject@example.com", role="seeker", full_name="No Doc Reject")
        user = User.query.filter_by(email="nodoc_reject@example.com").first()

        res = client.post(
            f"/api/v1/admin/users/{user.id}/reject-verification",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 404

    def test_verify_returns_404_for_nonexistent_user(self, client):
        """Verifying a non-existent user ID returns HTTP 404."""
        admin_token = register_user(client, "admin_noid@example.com", role="admin", full_name="Admin No ID")
        make_admin(client, "admin_noid@example.com")

        res = client.post(
            "/api/v1/admin/users/99999/verify",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 404

    def test_non_admin_cannot_approve_verification(self, client):
        """A non-admin user must receive HTTP 403 when attempting to verify a document."""
        seeker_token = register_user(client, "seeker_verify@example.com", role="seeker", full_name="Seeker Verify")
        seeker = User.query.filter_by(email="seeker_verify@example.com").first()

        res = client.post(
            f"/api/v1/admin/users/{seeker.id}/verify",
            headers={"Authorization": f"Bearer {seeker_token}"}
        )
        assert res.status_code == 403

    def test_non_admin_cannot_reject_verification(self, client):
        """A non-admin user must receive HTTP 403 when attempting to reject a document."""
        seeker_token = register_user(client, "seeker_reject@example.com", role="seeker", full_name="Seeker Reject")
        seeker = User.query.filter_by(email="seeker_reject@example.com").first()

        res = client.post(
            f"/api/v1/admin/users/{seeker.id}/reject-verification",
            headers={"Authorization": f"Bearer {seeker_token}"}
        )
        assert res.status_code == 403

    def test_unauthenticated_verify_returns_401(self, client):
        """Unauthenticated requests to the verify endpoint must return HTTP 401."""
        register_user(client, "anon_target@example.com", role="seeker", full_name="Anon Target")
        user = User.query.filter_by(email="anon_target@example.com").first()

        res = client.post(f"/api/v1/admin/users/{user.id}/verify")
        assert res.status_code == 401

    def test_admin_users_list_includes_verification_document_metadata(self, client):
        """The /admin/users list endpoint must include verification_document metadata for each user."""
        admin_token = register_user(client, "admin_list@example.com", role="admin", full_name="Admin List")
        make_admin(client, "admin_list@example.com")

        user_token = register_user(client, "list_target@example.com", role="seeker", full_name="List Target")
        upload_verification_document(client, user_token, "list_target@example.com")

        res = client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        users_data = res.get_json()["data"]
        target = next((u for u in users_data if u["email"] == "list_target@example.com"), None)
        assert target is not None
        assert "verification_document" in target
        assert target["verification_document"] is not None
        doc = target["verification_document"]
        assert doc["status"] == "submitted"
        assert doc["document_type"] == "government_id"
        # Ensure file_path is not exposed
        assert "file_path" not in doc


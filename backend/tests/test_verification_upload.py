import io
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


def register_and_get_token(client, email="seeker@example.com", role="seeker"):
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Test Candidate",
        "role": role,
        "city": "Pune"
    })
    return res.get_json()["access_token"]


def test_verification_unauthorized(client):
    # Upload without token
    res = client.post("/api/v1/auth/verification/upload-id")
    assert res.status_code == 401

    # Check status without token
    res_status = client.get("/api/v1/auth/verification/status")
    assert res_status.status_code == 401


def test_verification_missing_file(client):
    token = register_and_get_token(client)
    res = client.post(
        "/api/v1/auth/verification/upload-id",
        headers={"Authorization": f"Bearer {token}"},
        data={"document_type": "government_id"}
    )
    assert res.status_code == 400
    assert "No file uploaded" in res.get_json()["message"]


def test_verification_invalid_document_type(client):
    token = register_and_get_token(client)
    data = {
        "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"image data"), "govt_id.jpg"),
        "document_type": "invalid_type_name"
    }
    res = client.post(
        "/api/v1/auth/verification/upload-id",
        headers={"Authorization": f"Bearer {token}"},
        data=data,
        content_type="multipart/form-data"
    )
    assert res.status_code == 400
    assert "Invalid document type" in res.get_json()["message"]


def test_verification_unsupported_file_format(client):
    token = register_and_get_token(client)
    # Attempt uploading PDF document
    data = {
        "file": (io.BytesIO(b"%PDF-1.4 mock binary"), "resume_or_id.pdf"),
        "document_type": "government_id"
    }
    res = client.post(
        "/api/v1/auth/verification/upload-id",
        headers={"Authorization": f"Bearer {token}"},
        data=data,
        content_type="multipart/form-data"
    )
    assert res.status_code == 400
    assert "Unsupported file format" in res.get_json()["message"]


def test_verification_successful_upload_seeker(client):
    token = register_and_get_token(client, email="sneha_verify@example.com", role="seeker")

    # 1. Initial verification status check
    res_status_init = client.get(
        "/api/v1/auth/verification/status",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_status_init.status_code == 200
    status_data = res_status_init.get_json()["data"]
    assert status_data["has_uploaded"] is False
    assert status_data["is_verified"] is False
    assert status_data["document"] is None

    # 2. Upload valid Government ID image
    data = {
        "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"valid jpg id photo"), "aadhaar_card.jpg"),
        "document_type": "government_id"
    }
    res_upload = client.post(
        "/api/v1/auth/verification/upload-id",
        headers={"Authorization": f"Bearer {token}"},
        data=data,
        content_type="multipart/form-data"
    )
    assert res_upload.status_code == 201
    upload_json = res_upload.get_json()
    assert upload_json["status"] == "success"
    assert "Photo ID submitted successfully" in upload_json["message"]

    doc_info = upload_json["data"]
    assert doc_info["document_type"] == "government_id"
    assert doc_info["original_filename"] == "aadhaar_card.jpg"
    assert doc_info["status"] == "submitted"
    assert doc_info["file_size"] > 0
    # Must NOT expose private server file_path
    assert "file_path" not in doc_info
    assert "url" not in doc_info

    # 3. Check status after upload
    res_status_after = client.get(
        "/api/v1/auth/verification/status",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_status_after.status_code == 200
    after_data = res_status_after.get_json()["data"]
    assert after_data["has_uploaded"] is True
    # CRITICAL: User is NOT automatically verified just because ID was uploaded
    assert after_data["is_verified"] is False
    assert after_data["document"]["document_type"] == "government_id"
    assert after_data["document"]["status"] == "submitted"


def test_verification_successful_upload_host(client):
    token = register_and_get_token(client, email="host_rahul@example.com", role="lister")

    # Host uploads property proof image
    data = {
        "file": (io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"valid png property doc"), "society_allotment.png"),
        "document_type": "property_proof"
    }
    res_upload = client.post(
        "/api/v1/auth/verification/upload-id",
        headers={"Authorization": f"Bearer {token}"},
        data=data,
        content_type="multipart/form-data"
    )
    assert res_upload.status_code == 201
    doc_info = res_upload.get_json()["data"]
    assert doc_info["document_type"] == "property_proof"
    assert doc_info["original_filename"] == "society_allotment.png"


def test_verification_replacement_workflow(client):
    token = register_and_get_token(client, email="replace_user@example.com")

    # 1. First upload: Government ID
    data1 = {
        "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"first photo"), "old_passport.jpg"),
        "document_type": "government_id"
    }
    res1 = client.post(
        "/api/v1/auth/verification/upload-id",
        headers={"Authorization": f"Bearer {token}"},
        data=data1,
        content_type="multipart/form-data"
    )
    assert res1.status_code == 201
    assert res1.get_json()["data"]["original_filename"] == "old_passport.jpg"

    # 2. Replacement upload: Update with College ID
    data2 = {
        "file": (io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"new updated college id"), "sppu_student_id.png"),
        "document_type": "college_id"
    }
    res2 = client.post(
        "/api/v1/auth/verification/upload-id",
        headers={"Authorization": f"Bearer {token}"},
        data=data2,
        content_type="multipart/form-data"
    )
    assert res2.status_code == 201
    updated_doc = res2.get_json()["data"]
    assert updated_doc["document_type"] == "college_id"
    assert updated_doc["original_filename"] == "sppu_student_id.png"

    # 3. Status reflects the replaced document
    res_status = client.get(
        "/api/v1/auth/verification/status",
        headers={"Authorization": f"Bearer {token}"}
    )
    status_doc = res_status.get_json()["data"]["document"]
    assert status_doc["document_type"] == "college_id"
    assert status_doc["original_filename"] == "sppu_student_id.png"

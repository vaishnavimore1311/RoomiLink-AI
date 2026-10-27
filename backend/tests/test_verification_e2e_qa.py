import io
import os
import pytest
from app import create_app, db
from app.models.user_models import User, VerificationDocument
from app.utils.verification_storage import (
    MAX_FILE_SIZE,
    get_verification_upload_folder,
    delete_verification_file,
)


@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()


def register_user(client, email="e2e_user@example.com", role="seeker", full_name="E2E Test User"):
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": full_name,
        "role": role,
        "city": "Pune"
    })
    assert res.status_code == 201
    return res.get_json()["access_token"]


def test_e2e_seeker_and_lister_upload_and_status(client):
    """
    Checklist:
    - Valid image upload for seeker and lister accounts.
    - Verify is_verified remains False after upload.
    - Verify document categories (government_id, property_proof, college_id).
    """
    # 1. Seeker uploading Government ID
    seeker_token = register_user(client, email="seeker_e2e@example.com", role="seeker", full_name="Aarav Sharma")
    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}

    seeker_data = {
        "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"dummy government id content"), "aarav_aadhaar.jpg"),
        "document_type": "government_id"
    }
    res_seeker = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=seeker_headers,
        data=seeker_data,
        content_type="multipart/form-data"
    )
    assert res_seeker.status_code == 201
    seeker_doc = res_seeker.get_json()["data"]
    assert seeker_doc["document_type"] == "government_id"
    assert seeker_doc["original_filename"] == "aarav_aadhaar.jpg"
    assert seeker_doc["status"] == "submitted"
    assert "file_path" not in seeker_doc

    # Check status: has_uploaded=True, is_verified MUST remain False
    res_status = client.get("/api/v1/auth/verification/status", headers=seeker_headers)
    assert res_status.status_code == 200
    seeker_status = res_status.get_json()["data"]
    assert seeker_status["has_uploaded"] is True
    assert seeker_status["is_verified"] is False
    assert seeker_status["document"]["document_type"] == "government_id"

    # 2. Lister uploading Property Proof
    lister_token = register_user(client, email="host_e2e@example.com", role="lister", full_name="Meera Joshi")
    lister_headers = {"Authorization": f"Bearer {lister_token}"}

    lister_data = {
        "file": (io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"dummy property allotment proof"), "tax_receipt.png"),
        "document_type": "property_proof"
    }
    res_lister = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=lister_headers,
        data=lister_data,
        content_type="multipart/form-data"
    )
    assert res_lister.status_code == 201
    lister_doc = res_lister.get_json()["data"]
    assert lister_doc["document_type"] == "property_proof"
    assert lister_doc["original_filename"] == "tax_receipt.png"

    # Lister status check: has_uploaded=True, is_verified=False
    res_lister_status = client.get("/api/v1/auth/verification/status", headers=lister_headers)
    assert res_lister_status.status_code == 200
    lister_status = res_lister_status.get_json()["data"]
    assert lister_status["has_uploaded"] is True
    assert lister_status["is_verified"] is False
    assert lister_status["document"]["document_type"] == "property_proof"

    # 3. College student uploading College ID
    student_token = register_user(client, email="student_e2e@example.com", role="seeker", full_name="Rohan Patel")
    student_headers = {"Authorization": f"Bearer {student_token}"}

    student_data = {
        "file": (io.BytesIO(b"RIFF" + b"\x00" * 4 + b"WEBP" + b"dummy college id"), "campus_id.webp"),
        "document_type": "college_id"
    }
    res_student = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=student_headers,
        data=student_data,
        content_type="multipart/form-data"
    )
    assert res_student.status_code == 201
    assert res_student.get_json()["data"]["document_type"] == "college_id"


def test_security_reject_unsupported_extensions(client):
    """
    Checklist:
    - Reject unsupported file extensions (.pdf, .txt, .exe, .gif, .sh, .php, etc.)
    - Must return HTTP 400 with 'Unsupported file format'.
    """
    token = register_user(client, email="sec_test@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    unsupported_files = [
        ("passport.pdf", b"%PDF-1.4 mock pdf"),
        ("id_notes.txt", b"plain text data"),
        ("malicious.exe", b"MZ\x90\x00\x03\x00\x00\x00"),
        ("animated_id.gif", b"GIF89a mock gif"),
        ("exploit.sh", b"#!/bin/bash\necho hello"),
        ("webshell.php", b"<?php phpinfo(); ?>"),
        ("vector_id.svg", b"<svg><circle cx='50' cy='50' r='40'/></svg>"),
        ("index.html", b"<html><body>mock id</body></html>"),
        ("extensionless_id", b"binary data"),
    ]

    for filename, content in unsupported_files:
        data = {
            "file": (io.BytesIO(content), filename),
            "document_type": "government_id"
        }
        res = client.post(
            "/api/v1/auth/verification/upload-id",
            headers=headers,
            data=data,
            content_type="multipart/form-data"
        )
        assert res.status_code == 400, f"Expected 400 for {filename}, got {res.status_code}"
        res_json = res.get_json()
        assert res_json["status"] == "error"
        assert "Unsupported file format" in res_json["message"]


def test_security_file_size_limit_and_cleanup(client):
    """
    Checklist:
    - Reject files exceeding 5MB size limit.
    - Ensure oversized files are immediately removed from disk.
    """
    token = register_user(client, email="oversize_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Generate content larger than 5MB (5MB + 256KB)
    oversized_size = MAX_FILE_SIZE + (256 * 1024)
    oversized_bytes = b"\xff\xd8\xff\xe0" + (b"X" * (oversized_size - 4))

    data = {
        "file": (io.BytesIO(oversized_bytes), "huge_pan_card.jpg"),
        "document_type": "government_id"
    }

    upload_folder = get_verification_upload_folder()
    initial_files = set(os.listdir(upload_folder)) if os.path.exists(upload_folder) else set()

    res = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=headers,
        data=data,
        content_type="multipart/form-data"
    )

    assert res.status_code == 400
    res_json = res.get_json()
    assert res_json["status"] == "error"
    assert "File exceeds maximum allowed size of 5MB" in res_json["message"]

    # Verify no new orphaned file was left on disk
    current_files = set(os.listdir(upload_folder)) if os.path.exists(upload_folder) else set()
    new_files = current_files - initial_files
    assert len(new_files) == 0, f"Orphaned files left on disk: {new_files}"


def test_security_unauthenticated_and_empty_requests(client):
    """
    Checklist:
    - Reject unauthenticated or empty upload requests (HTTP 401 / 400).
    """
    # 1. Unauthenticated upload request -> 401
    res = client.post(
        "/api/v1/auth/verification/upload-id",
        data={"file": (io.BytesIO(b"data"), "id.jpg")},
        content_type="multipart/form-data"
    )
    assert res.status_code == 401

    # 2. Unauthenticated status request -> 401
    res = client.get("/api/v1/auth/verification/status")
    assert res.status_code == 401

    # 3. Authenticated but empty request (no multipart file) -> 400
    token = register_user(client, email="empty_req@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    res_no_file = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=headers,
        data={"document_type": "government_id"}
    )
    assert res_no_file.status_code == 400
    assert "No file uploaded" in res_no_file.get_json()["message"]

    # 4. Authenticated but empty 0-byte file -> 400
    res_empty_file = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=headers,
        data={"file": (io.BytesIO(b""), "empty.jpg"), "document_type": "government_id"},
        content_type="multipart/form-data"
    )
    assert res_empty_file.status_code == 400
    assert "empty" in res_empty_file.get_json()["message"].lower()

    # 5. Invalid document type -> 400
    res_bad_type = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=headers,
        data={
            "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"valid jpg"), "valid.jpg"),
            "document_type": "social_security_card"
        },
        content_type="multipart/form-data"
    )
    assert res_bad_type.status_code == 400
    assert "Invalid document type" in res_bad_type.get_json()["message"]


def test_e2e_replacement_and_old_file_deletion(client):
    """
    Checklist:
    - Verify replacement flow correctly updates database record.
    - Verify old physical file is deleted upon replacement.
    - Verify is_verified remains False.
    """
    token = register_user(client, email="replace_qa@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. First upload
    res1 = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=headers,
        data={
            "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"first photo"), "old_voter_id.jpg"),
            "document_type": "government_id"
        },
        content_type="multipart/form-data"
    )
    assert res1.status_code == 201
    doc1_json = res1.get_json()["data"]
    assert doc1_json["original_filename"] == "old_voter_id.jpg"

    # Query DB directly to get the physical file path
    user = User.query.filter_by(email="replace_qa@example.com").first()
    assert user is not None
    doc1 = VerificationDocument.query.filter_by(user_id=user.id).first()
    assert doc1 is not None
    old_file_path = doc1.file_path
    assert os.path.exists(old_file_path) is True

    # 2. Upload replacement document (College ID)
    res2 = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=headers,
        data={
            "file": (io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"replacement photo"), "new_college_id.png"),
            "document_type": "college_id"
        },
        content_type="multipart/form-data"
    )
    assert res2.status_code == 201
    doc2_json = res2.get_json()["data"]
    assert doc2_json["original_filename"] == "new_college_id.png"
    assert doc2_json["document_type"] == "college_id"

    # Verify old file was deleted from disk
    assert os.path.exists(old_file_path) is False, "Previous verification file was not deleted upon replacement!"

    # Verify new file exists on disk
    doc2 = VerificationDocument.query.filter_by(user_id=user.id).first()
    assert doc2 is not None
    new_file_path = doc2.file_path
    assert new_file_path != old_file_path
    assert os.path.exists(new_file_path) is True

    # Verify database has exactly 1 document for this user (not multiple rows)
    all_docs = VerificationDocument.query.filter_by(user_id=user.id).all()
    assert len(all_docs) == 1

    # Verify user.is_verified is still False
    assert user.is_verified is False


def test_security_private_storage_isolation(client):
    """
    Checklist:
    - Verify private storage: uploaded IDs are not publicly accessible via browser URL.
    - Test against public room static route /api/v1/rooms/uploads/<filename>.
    - Test against directory traversal attempts.
    """
    token = register_user(client, email="private_store@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    res_upload = client.post(
        "/api/v1/auth/verification/upload-id",
        headers=headers,
        data={
            "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"confidential government id"), "aadhaar_confidential.jpg"),
            "document_type": "government_id"
        },
        content_type="multipart/form-data"
    )
    assert res_upload.status_code == 201

    user = User.query.filter_by(email="private_store@example.com").first()
    doc = VerificationDocument.query.filter_by(user_id=user.id).first()
    saved_filename = os.path.basename(doc.file_path)

    # 1. Attempt to access verification file directly via room public uploads route
    res_direct = client.get(f"/api/v1/rooms/uploads/{saved_filename}")
    assert res_direct.status_code == 404, "Private verification ID must not be accessible via room public uploads route"

    # 2. Attempt path traversal to escape from /uploads/rooms to /uploads/verifications
    traversal_urls = [
        f"/api/v1/rooms/uploads/../verifications/{saved_filename}",
        f"/api/v1/rooms/uploads/..%2Fverifications%2F{saved_filename}",
        f"/api/v1/rooms/uploads/verifications/{saved_filename}",
    ]
    for url in traversal_urls:
        res_traversal = client.get(url)
        assert res_traversal.status_code in (404, 400), f"Path traversal attempt returned {res_traversal.status_code}"

    # 3. Ensure status endpoint does NOT leak file_path or server directory structure
    res_status = client.get("/api/v1/auth/verification/status", headers=headers)
    status_json = res_status.get_json()["data"]
    doc_json = status_json["document"]
    assert "file_path" not in doc_json
    assert "url" not in doc_json
    assert "uploads" not in str(doc_json)
    assert "verifications" not in str(doc_json)


def test_regression_room_photos_continue_to_function(client):
    """
    Checklist:
    - Ensure room photo upload (/api/v1/rooms/upload-photo and /upload-photos)
      and existing features continue to function without regression.
    """
    # 1. Test single room photo upload
    lister_token = register_user(client, email="room_host@example.com", role="lister")
    headers = {"Authorization": f"Bearer {lister_token}"}

    room_photo_data = {
        "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"public room living area"), "living_room.jpg")
    }
    res_single = client.post(
        "/api/v1/rooms/upload-photo",
        headers=headers,
        data=room_photo_data,
        content_type="multipart/form-data"
    )
    assert res_single.status_code == 201
    single_json = res_single.get_json()
    assert single_json["status"] == "success"
    assert "url" in single_json
    room_photo_url = single_json["url"]
    room_photo_filename = room_photo_url.split("/")[-1]

    # Verify that the room photo CAN be accessed publicly via GET /api/v1/rooms/uploads/<filename>
    res_serve_room = client.get(f"/api/v1/rooms/uploads/{room_photo_filename}")
    assert res_serve_room.status_code == 200
    assert b"living area" in res_serve_room.data

    # 2. Test multiple room photos upload
    multiple_data = {
        "files": [
            (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"bedroom photo 1"), "bedroom.jpg"),
            (io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"kitchen photo 2"), "kitchen.png"),
        ]
    }
    res_multi = client.post(
        "/api/v1/rooms/upload-photos",
        headers=headers,
        data=multiple_data,
        content_type="multipart/form-data"
    )
    assert res_multi.status_code == 201
    multi_json = res_multi.get_json()
    assert multi_json["status"] == "success"
    assert len(multi_json["urls"]) == 2


def test_database_cascade_and_model_cleanup(client):
    """
    Verify that if a User record is removed, the VerificationDocument relationship cascades cleanly,
    and storage cleanup helper functions can be invoked without errors.
    """
    token = register_user(client, email="cascade_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/auth/verification/upload-id",
        headers=headers,
        data={
            "file": (io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"photo for cascade test"), "temp_id.jpg"),
            "document_type": "government_id"
        },
        content_type="multipart/form-data"
    )

    user = User.query.filter_by(email="cascade_user@example.com").first()
    doc = VerificationDocument.query.filter_by(user_id=user.id).first()
    saved_path = doc.file_path
    assert os.path.exists(saved_path) is True

    # Delete user from DB
    db.session.delete(user)
    db.session.commit()

    # Verify document record cascaded and is deleted from DB
    assert VerificationDocument.query.filter_by(id=doc.id).first() is None

    # Clean up physical file
    cleanup_result = delete_verification_file(saved_path)
    assert cleanup_result is True
    assert os.path.exists(saved_path) is False

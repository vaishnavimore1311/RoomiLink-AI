import io
import pytest
from app import create_app, db
from app.models.user_models import User, VerificationDocument
from app.utils.verification_storage import (
    is_allowed_file,
    save_verification_file,
    delete_verification_file,
    ALLOWED_EXTENSIONS,
    ALLOWED_DOCUMENT_TYPES
)
from werkzeug.datastructures import FileStorage


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


def test_verification_document_model(app):
    user = User(email="test_host@example.com", role="lister", is_verified=False)
    user.set_password("SecurePassword123!")
    db.session.add(user)
    db.session.commit()

    # User starts with is_verified=False and no verification document
    assert user.is_verified is False
    assert user.verification_document is None
    assert user.to_dict()["verification_document"] is None

    # Attach a verification document
    doc = VerificationDocument(
        user_id=user.id,
        document_type="government_id",
        file_path="/private/uploads/verifications/sample_id.jpg",
        original_filename="aadhaar_front.jpg",
        file_size=204800,
        status="submitted"
    )
    db.session.add(doc)
    db.session.commit()

    # Re-fetch user
    refreshed_user = db.session.get(User, user.id)
    assert refreshed_user.verification_document is not None
    assert refreshed_user.verification_document.document_type == "government_id"
    assert refreshed_user.verification_document.status == "submitted"

    # CRITICAL: Uploading an ID must NOT automatically set is_verified to True
    assert refreshed_user.is_verified is False

    # Verify to_dict serialization guarantees privacy
    doc_dict = refreshed_user.verification_document.to_dict()
    assert doc_dict["document_type"] == "government_id"
    assert doc_dict["original_filename"] == "aadhaar_front.jpg"
    assert doc_dict["status"] == "submitted"
    assert doc_dict["file_size"] == 204800
    assert "uploaded_at" in doc_dict

    # CRITICAL: file_path must NOT be exposed in to_dict()
    assert "file_path" not in doc_dict
    assert "url" not in doc_dict


def test_verification_document_supported_types(app):
    assert "government_id" in ALLOWED_DOCUMENT_TYPES
    assert "college_id" in ALLOWED_DOCUMENT_TYPES
    assert "property_proof" in ALLOWED_DOCUMENT_TYPES


def test_verification_storage_allowed_extensions():
    # Valid image formats
    assert is_allowed_file("passport.jpg") is True
    assert is_allowed_file("id_card.jpeg") is True
    assert is_allowed_file("student_id.png") is True
    assert is_allowed_file("electric_bill.webp") is True

    # Invalid extensions (reject non-images, pdf, gif, executable)
    assert is_allowed_file("document.pdf") is False
    assert is_allowed_file("id.gif") is False
    assert is_allowed_file("script.sh") is False
    assert is_allowed_file("malicious.exe") is False
    assert is_allowed_file("no_extension") is False
    assert is_allowed_file("") is False


def test_save_and_delete_verification_file(app):
    # Create mock FileStorage with image bytes
    mock_file = FileStorage(
        stream=io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"mock id content"),
        filename="college_card.jpg",
        content_type="image/jpeg"
    )

    file_path, clean_name, file_size = save_verification_file(mock_file, user_id=42)

    assert file_path.endswith(".jpg")
    assert "verif_u42_" in file_path
    assert clean_name == "college_card.jpg"
    assert file_size > 0

    # Delete the file
    deleted = delete_verification_file(file_path)
    assert deleted is True

    # Deleting again returns False
    assert delete_verification_file(file_path) is False


def test_save_verification_file_rejections(app):
    # Empty file rejection
    empty_file = FileStorage(stream=io.BytesIO(b""), filename="empty.jpg", content_type="image/jpeg")
    with pytest.raises(ValueError, match="empty"):
        save_verification_file(empty_file, user_id=1)

    # Unsupported format rejection
    pdf_file = FileStorage(stream=io.BytesIO(b"%PDF-1.4 test"), filename="doc.pdf", content_type="application/pdf")
    with pytest.raises(ValueError, match="Unsupported file format"):
        save_verification_file(pdf_file, user_id=1)

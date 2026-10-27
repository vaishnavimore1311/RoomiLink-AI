import os
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import current_app

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 Megabytes
ALLOWED_DOCUMENT_TYPES = {"government_id", "college_id", "property_proof"}


def is_allowed_file(filename: str) -> bool:
    """Validate that the filename has one of the supported image extensions."""
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def get_verification_upload_folder() -> str:
    """
    Returns the absolute path to the private verification uploads folder.
    Creates the directory if it does not already exist.
    NOTE: This folder is isolated from public room photos and is never served publicly.
    """
    base_path = Path(current_app.root_path).parent / "uploads" / "verifications"
    base_path.mkdir(parents=True, exist_ok=True)
    return str(base_path)


def save_verification_file(file, user_id: int):
    """
    Saves an uploaded identification photo into the private verification storage.
    
    Args:
        file: Werkzeug FileStorage object.
        user_id: ID of the authenticated user.
        
    Returns:
        tuple of (saved_file_path, original_filename, file_size_in_bytes)
        
    Raises:
        ValueError: If file is empty or has an invalid format.
    """
    if not file or not file.filename:
        raise ValueError("No file selected or filename is empty.")

    original_filename = file.filename
    if not is_allowed_file(original_filename):
        allowed_str = ", ".join(sorted(ALLOWED_EXTENSIONS)).upper()
        raise ValueError(f"Unsupported file format. Supported image formats: {allowed_str}")

    clean_filename = secure_filename(original_filename) or "id_document.jpg"
    safe_name = f"verif_u{user_id}_{uuid.uuid4().hex[:12]}_{clean_filename}"

    upload_folder = get_verification_upload_folder()
    file_path = os.path.join(upload_folder, safe_name)

    # Save the file
    file.save(file_path)

    # Calculate actual file size
    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE:
        # Clean up oversized file immediately
        try:
            os.remove(file_path)
        except OSError:
            pass
        raise ValueError(f"File exceeds maximum allowed size of 5MB ({round(file_size / (1024 * 1024), 2)}MB uploaded).")

    if file_size == 0:
        try:
            os.remove(file_path)
        except OSError:
            pass
        raise ValueError("Uploaded file is empty (0 bytes).")

    return file_path, clean_filename, file_size


def delete_verification_file(file_path: str):
    """
    Safely removes a previously uploaded verification document from private storage.
    Used during replacement to prevent stale orphaned identification files.
    """
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            return True
        except OSError:
            return False
    return False

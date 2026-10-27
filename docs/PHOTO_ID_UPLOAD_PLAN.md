# Photo ID Upload Feature Specification & Issue Tracker

This document details the tracking issues, technical specifications, and security guidelines for the **Photo ID Upload for User/Host Verification** feature in **RoomiLink AI**.

---

## 1. GitHub Issues Tracking

| Issue # | Title | Labels | Target Area |
| :--- | :--- | :--- | :--- |
| **[#53](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/53)** | `feat(backend): Secure storage & database model for user/host Photo ID verification` | `enhancement`, `P0`, `backend`, `database` | Backend Models & Storage |
| **[#54](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/54)** | `feat(backend): Authenticated Photo ID upload endpoint with format & size validation` | `enhancement`, `P0`, `backend`, `testing-qa` | Backend API & Validation |
| **[#55](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/55)** | `feat(frontend): Photo ID upload UI with client preview, validation & replacement workflow` | `enhancement`, `P0`, `frontend` | Frontend UI / Dashboard |
| **[#56](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/56)** | `test(qa): End-to-end testing & security validation for Photo ID upload` | `enhancement`, `testing-qa` | Pytest & E2E Validation |

---

## 2. Technical Architecture & Design

### A. Data Model (`VerificationDocument`)
Linked 1:1 with `User` in `backend/app/models/user_models.py`:
- `id` (Integer, Primary Key)
- `user_id` (Integer, ForeignKey `users.id`, Unique)
- `document_type` (String, default='government_id') — `'government_id'`, `'college_id'`, `'property_proof'`
- `file_path` (String, private path on server)
- `original_filename` (String, sanitized)
- `file_size` (Integer, bytes)
- `status` (String, default='submitted') — `'submitted'`
- `uploaded_at` (DateTime, UTC)

### B. Storage & Privacy Boundaries
- Isolated private directory: `backend/uploads/verifications/`
- **Security Rule**: ID photos are NEVER served through public `/uploads/...` routes or public static directories.
- Filenames sanitized using: `uuid4().hex[:10] + "_" + secure_filename(file.filename)`
- User `is_verified` remains `False` (upload only represents "ID submitted/uploaded").
- No OCR, face match, or AI scanning.

### C. API Endpoints
1. `POST /api/v1/auth/verification/upload-id`
   - Requires JWT auth header (`Bearer <token>`).
   - Accepts multipart form: `file` (image) and `document_type` (`government_id` \| `college_id` \| `property_proof`).
   - Validates file format (`.jpg`, `.jpeg`, `.png`, `.webp`) and file size (<= 5MB).
   - Replaces/updates previous file if one already exists for the user.
   - Returns: `{ "status": "success", "message": "...", "data": { "document_type": "...", "uploaded_at": "...", "status": "submitted" } }`.

2. `GET /api/v1/auth/verification/status`
   - Requires JWT auth header.
   - Returns metadata: `{ "has_uploaded": true, "document_type": "...", "uploaded_at": "...", "status": "submitted" }`.

### D. Frontend Interface
- Located inside the authenticated user Dashboard (`frontend/app/dashboard/page.tsx`).
- File picker with instant image preview (`URL.createObjectURL`).
- Real-time client-side size (5MB) and format validation.
- Responsive states: Empty, Previewing, Uploading spinner, Upload Success banner, Error notice.
- Seamless "Replace / Update Photo ID" button when an ID is already submitted.

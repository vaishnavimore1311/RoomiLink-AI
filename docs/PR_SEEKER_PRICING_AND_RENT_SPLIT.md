## Summary of Changes

This Pull Request addresses and resolves two assigned features:
- **Closes #83**: `feat(frontend): Hide Host and Lister pricing plans for logged-in Seekers`
- **Closes #86**: `feat(fullstack): Actual room rent input and automated per-roommate equal split calculation`

---

### 1. Seeker Pricing Plan Isolation (Issue #83)
- When authenticated as a `seeker` on the `/pricing` page, the pricing plan view is locked to Room Seeker memberships.
- The host/landlord pricing toggle is hidden for logged-in seekers to eliminate confusion and prevent accidental subscription to lister tiers.
- Added a clean seeker status badge: `🏠 Room Seeker Membership Plans`.

### 2. Actual Room Rent & Automated Equal Split Calculation (Issue #86)
- **Database & Model Layer**: Added `total_room_rent = db.Column(db.Float, nullable=True)` to `Room` in `backend/app/models/property_models.py`. Both `total_room_rent` and `split_rent` are returned in `to_dict()`.
- **Backend API Endpoints**: Updated `POST /api/v1/rooms`, `GET /api/v1/rooms`, and `GET /api/v1/rooms/<room_id>` in `backend/app/routes/room_routes.py` to persist `total_room_rent` and return both total rent and equal split rent.
- **Room Creation Page (`/rooms/new`)**:
  - Added a dedicated "Total Actual Room Rent (₹ INR)" input field.
  - Added real-time reactive calculation card displaying: `Total Rent ÷ Bed Capacity = Equal Share Per Roommate / month`.
  - Maintained two-way synchronization between total room rent, bed capacity, and roommate split rent.
- **Room Discovery Cards (`/rooms`)**:
  - Room cards display the per-person split rent alongside a subtext displaying the actual total lease rent and split percentage (e.g. `Total ₹16,000 • 50% Split`).
- **Room Detail Page (`/rooms/[id]`)**:
  - Photo header badge and right sidebar booking card show both the total room rent and the prospective flatmate's equal share.
- **Automated Tests**:
  - Added `test_create_room_total_rent_and_split_calculation` in `backend/tests/test_rooms.py` (all 16 tests passing).
  - TypeScript compilation verified clean across the frontend.

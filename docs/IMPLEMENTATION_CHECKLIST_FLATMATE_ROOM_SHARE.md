# RoomiLink AI: Implementation Checklist & Code Plan
## "Share My Room & Rent" (Flatmate Room-Share + Compatibility Bridge)

---

## 1. Feature Architecture & Role Fluidity

### The Business & Architecture Model:
* **The User Role Remains `seeker`:** A tenant living in a shared room does **not** change their account role to `lister` or `admin`. Keeping their role as `seeker` preserves their **8-dimensional lifestyle profile** (sleep schedule, cleanliness, noise tolerance, etc.).
* **Dual-Tier Subscription Logic:**
  * **Commercial Hosts (Landlords):** Purchase **Host Plans (₹999/mo)** to list multiple commercial properties and apartments.
  * **Peer-to-Peer Flatmates (Seekers):** Their **Pro Seeker Subscription (₹499/mo)** includes an allowance to post **1 active shared-bed/room listing** to find a replacement roommate.
* **The Compatibility Bridge:** When an existing tenant posts a shared room, the listing is automatically linked to their profile. When an applicant views the room, the system computes a live **AI Compatibility Score** between the applicant and the existing flatmate.

---

## 2. File-by-File Change Matrix

| # | File Path | Scope / Responsibility |
| :-: | :--- | :--- |
| **1** | `backend/app/models/property_models.py` | Add 6 new columns to `Room` model & update `to_dict()`. |
| **2** | `backend/app/routes/room_routes.py` | Update `create_room()` (accept new fields), update `get_room(id)` (enrich with flatmate profile & compute live compatibility), update `get_rooms()` (filter support). |
| **3** | `frontend/app/rooms/new/page.tsx` | Add Dual-Mode Switcher: `[🏢 Landlord]` vs `[🤝 Existing Tenant / Share Rent]`. Add fields for occupants, split rent, utility split, and gender preference. |
| **4** | `frontend/app/rooms/page.tsx` | Add filter tab and purple badge: **"Flatmate Share • 1 Bed Available"** with the existing flatmate's name. |
| **5** | `frontend/app/rooms/[id]/page.tsx` | Add **"Meet Your Future Roommate"** section with profile photo, lifestyle tags, live **AI Compatibility Meter**, and "Apply to Share Room" CTA. |
| **6** | `frontend/app/roommates/page.tsx` | Display badge on roommate cards if they have an active shared room: **"Has an available bed in [City] - [View Room]"**. |
| **7** | `frontend/app/household/page.tsx` | Add 1-click **"Post Vacant Space / Find Replacement"** CTA banner inside Household Dashboard. |
| **8** | `backend/tests/test_rooms.py` | Automated Pytest tests for flatmate room creation and compatibility enrichment. |

---

## 3. Detailed Code Specifications

### File 1: `backend/app/models/property_models.py`
Add to `class Room(db.Model)`:
```python
# ── Flatmate Room-Share & Replacement Fields ──
listing_purpose = db.Column(db.String(30), default="landlord")  # 'landlord' | 'flatmate_share'
current_occupants = db.Column(db.Integer, default=1)
max_occupants = db.Column(db.Integer, default=2)
preferred_gender = db.Column(db.String(20), default="any")  # 'any' | 'female' | 'male'
utility_split_desc = db.Column(db.String(255), nullable=True)
household_id = db.Column(db.Integer, db.ForeignKey("households.id"), nullable=True)
```
Update `Room.to_dict()`:
```python
"listing_purpose": self.listing_purpose or "landlord",
"current_occupants": self.current_occupants or 1,
"max_occupants": self.max_occupants or 2,
"preferred_gender": self.preferred_gender or "any",
"utility_split_desc": self.utility_split_desc,
"household_id": self.household_id,
```

---

### File 2: `backend/app/routes/room_routes.py`
1. **In `create_room()`:**
   * Extract:
     ```python
     listing_purpose = data.get("listing_purpose", "landlord")
     current_occupants = int(data.get("current_occupants", 1))
     max_occupants = int(data.get("max_occupants", 2))
     preferred_gender = data.get("preferred_gender", "any")
     utility_split_desc = data.get("utility_split_desc", "").strip()
     household_id = data.get("household_id")
     ```
   * Allow any user with an active subscription (Seeker, Lister, or Admin) to create the listing.
   * Instantiate `Room` with these fields.

2. **In `get_room(room_id)`:**
   * If `room.listing_purpose == "flatmate_share"`:
     * Retrieve `poster = room.property.lister`.
     * Extract `poster.profile` (lifestyle habits, bio, avatar).
     * If viewer is logged in (`get_jwt_identity()`):
       * Run `calculate_compatibility(viewer.profile, poster.profile)` from `app.services.matching_service`.
       * Attach `existing_flatmate` block with:
         - `id`, `name`, `avatar_url`, `bio`, `lifestyle`
         - `compatibility_score` (0-100)
         - `compatibility_breakdown` (matched vs divergent habits)

3. **In `get_rooms()`:**
   * Accept query param `purpose` (`landlord` | `flatmate_share` | `all`).
   * Filter query accordingly.

---

### File 3: `frontend/app/rooms/new/page.tsx`
* **State additions:**
  ```tsx
  const [listingPurpose, setListingPurpose] = useState<"landlord" | "flatmate_share">("landlord");
  const [currentOccupants, setCurrentOccupants] = useState<number>(1);
  const [maxOccupants, setMaxOccupants] = useState<number>(2);
  const [preferredGender, setPreferredGender] = useState<string>("any");
  const [utilitySplitDesc, setUtilitySplitDesc] = useState<string>("");
  ```
* **UI Mode Switcher:**
  * Render two selectable cards/tabs at the top of the form:
    1. **🏢 Landlord / Property Owner** (Default)
    2. **🤝 I Live Here & Need a Roommate (Share Rent)**
* **Dynamic Form Fields when "I Live Here" is chosen:**
  * Auto-selects `"shared"` for `room_type`.
  * Input for **Current Occupants** (default: 1).
  * Input for **Preferred Gender** (Dropdown: Any, Female Only, Male Only).
  * Input for **Monthly Rent Share (₹ INR)** with helper note: *"Enter the applicant's 50% share of the rent."*
  * Input for **Utility & Bill Split** (e.g., *"Rent ₹8,000 + Wi-Fi & Electricity split 50/50"*).

---

### File 4: `frontend/app/rooms/page.tsx`
* Add filter pills: `All Rooms`, `Landlord Rentals`, `Flatmate Space-Share`.
* On listing cards with `listing_purpose === "flatmate_share"`:
  * Render a distinct purple badge: **"Flatmate Share • 1 Bed Available"**.
  * Render poster indicator: **"Shared with [Name]"**.

---

### File 5: `frontend/app/rooms/[id]/page.tsx`
* When `room.listing_purpose === "flatmate_share"` and `room.existing_flatmate`:
  * Render the **"Meet Your Future Roommate"** card:
    * Poster's avatar, name, verified badge, and bio.
    * 4 Lifestyle Badges: Sleep Schedule, Cleanliness Level, Dietary Preference, Guest Policy.
    * **Live AI Compatibility Widget**:
      * Circular/Bar progress meter showing compatibility percentage (e.g. **94% Match**).
      * Button: **"View Compatibility Breakdown"** (opens existing `MatchExplanationModal`).
    * Inquiry CTA button reads: **"Apply to Share Room with [Name]"**.

---

### File 6: `frontend/app/roommates/page.tsx`
* On roommate profile cards:
  * If the roommate has an active room listing, show an interactive badge:
    * 🏠 **"Has an available bed in Hinjewadi (₹8,000/mo) - [View Room →]"**.

---

### File 7: `frontend/app/household/page.tsx`
* Inside the Household Overview card:
  * Render a callout banner:  
    > 💡 **"Spare bed or empty room in your flat?"**  
    > *"Post your vacant space to RoomiLink to find verified, compatible replacements and split rent."*  
    > `[ + Post Vacant Space Now ]` $\rightarrow$ links to `/rooms/new?purpose=flatmate_share`.

---

### File 8: `backend/tests/test_rooms.py`
* Add test cases:
  1. `test_create_flatmate_room_share_listing()`: Verifies that a user with an active subscription can create a room with `listing_purpose = "flatmate_share"`.
  2. `test_get_room_returns_existing_flatmate_and_compatibility()`: Verifies that room responses include the flatmate's lifestyle and compatibility score.

---

## 4. Execution Sequence Checklist

- [ ] **Step 1: Database Model** $\rightarrow$ Update `property_models.py` with the 6 new fields and serialization.
- [ ] **Step 2: Backend Routes** $\rightarrow$ Update `room_routes.py` (`create_room`, `get_room`, `get_rooms`).
- [ ] **Step 3: Frontend Creation Form** $\rightarrow$ Update `frontend/app/rooms/new/page.tsx` with Mode Switcher & dynamic fields.
- [ ] **Step 4: Frontend Detail Page** $\rightarrow$ Update `frontend/app/rooms/[id]/page.tsx` with the "Meet Your Future Roommate" card.
- [ ] **Step 5: Frontend Feed & Badges** $\rightarrow$ Update `frontend/app/rooms/page.tsx` with filter pills and purple badges.
- [ ] **Step 6: Roommates & Household Links** $\rightarrow$ Update `frontend/app/roommates/page.tsx` and `frontend/app/household/page.tsx`.
- [ ] **Step 7: Automated Tests** $\rightarrow$ Run `pytest` to verify all 22+ tests pass with zero regressions.

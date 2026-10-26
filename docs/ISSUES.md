# RoomiLink AI - Change Request & Sprint Issues

This document tracks all active issues created for the latest feature requirements, access controls, navigation enhancements, and demo features.

| Issue # | Title | Assigned Member | GitHub Handle | Type | GitHub Link | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **#33** | [Feature] Hide exact room address for unsubscribed users (show basic details only) | **Vaishnavi More** | `@vaishnavimore1311` | Security / Subscription | [#33](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/33) | Closed (PR [#44](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/44)) |
| **#34** | [UX] Redirect authenticated users directly to Find Rooms (/rooms) upon login and registration | **Shweta** | `@Shwetadhanawade13` | Routing / UX | [#34](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/34) | Closed (PR [#42](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/42)) |
| **#35** | [Feature] Restrict room and property listing creation to subscribed users only | **Vaishnavi More** | `@vaishnavimore1311` | Paywall / Permissions | [#35](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/35) | Closed (PR [#43](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/43)) |
| **#36** | [Bug/UX] Update brand logo click behavior to navigate within app when logged in | **Shweta** | `@Shwetadhanawade13` | Navigation / UX | [#36](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/36) | Closed (PR [#45](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/45)) |
| **#37** | [QA & Feature Audit] Verify and validate all Household workspace features | **Sayali** | `@dsayali074-tech` | QA / Feature Validation | [#37](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/37) | Closed (PR [#41](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/41)) |
| **#38** | [Feature] Host Inquiry Inbox - View and manage incoming room inquiries | **Vaishnavi Nagtilak** | `@vaishnavi110` | Feature / Communication | [#38](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/38) | Closed (PR [#40](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/40) & [#46](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/46)) |
| **#39** | [Feature] Saved / Favorited Rooms - Bookmark and view favorite listings | **Vaishnavi Nagtilak** | `@vaishnavi110` | Feature / User Experience | [#39](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/39) | Closed (PR [#47](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/47)) |
| **#48** | [Bug / Auth] Fix Admin Login redirection to preferred page (/admin) instead of /rooms | **Vaishnavi Nagtilak** | `@vaishnavi110` | Bug / Authentication | [#48](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/48) | Closed (PR [#50](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/50)) |
| **#49** | [Feature / Subscription] Restrict Household Hub joining via invite code to subscribed users and redirect to /pricing | **Vaishnavi More** | `@vaishnavimore1311` | Security / Subscription | [#49](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/49) | Closed (PR [#51](https://github.com/vaishnavimore1311/RoomiLink-AI/pull/51)) |
| **#52** | [Data / Integrity] Ensure all Household Hub members have active Pro Seeker subscriptions | **Vaishnavi Nagtilak** | `@vaishnavi110` | Data / Security | [#52](https://github.com/vaishnavimore1311/RoomiLink-AI/issues/52) | In Progress |

---

## Detailed Specifications

### Issue #33: Hide exact room address for unsubscribed users (show basic details only)
* **Assigned**: Member 1
* **Goal**: Ensure non-subscribed visitors and free seekers cannot view the exact street / building address.
* **Basic Details Remaining Public**:
  * City & Neighborhood (e.g. Hinjewadi, Pune)
  * Rent amount & Deposit amount
  * Room type & Property type
  * Available from date
  * Amenities list & Property photos
  * General listing description
* **Backend**:
  * Modify `GET /api/rooms` and `GET /api/rooms/<id>` in `backend/app/routes/room_routes.py`.
  * Use optional JWT auth: if not active subscriber / host / admin, mask `address` as `"🔒 Subscribed Members Only"` and set `is_address_locked: true`.
* **Frontend**:
  * On `frontend/app/rooms/[id]/page.tsx`: If address is locked, show a locked badge with an "Unlock Full Address" CTA that opens the Pro Seeker subscription modal.

---

### Issue #34: Redirect authenticated users directly to Find Rooms (/rooms) upon login and registration
* **Assigned**: Member 2
* **Goal**: After signing in or creating an account, take standard users directly to the room marketplace instead of the account profile overview (`/dashboard`).
* **Frontend**:
  * Update `frontend/app/login/page.tsx` redirect destination to `/rooms`.
  * Update `frontend/app/register/page.tsx` redirect destination to `/rooms`.
  * Admins continue redirecting to `/admin`.
  * Profile overview remains accessible via the top-right navbar pill.

---

### Issue #35: Restrict room and property listing creation to subscribed users only
* **Assigned**: Member 1
* **Goal**: Only subscribed users (or admin) can post new rooms.
* **Backend**:
  * In `POST /api/rooms` (`create_room`), verify `user.get_active_subscription()` or `admin` role.
  * Return `403 Forbidden` (`code: "SUBSCRIPTION_REQUIRED"`) if user has no active subscription.
* **Frontend**:
  * On `frontend/app/rooms/new/page.tsx`, check subscription status and display a subscription paywall banner if unsubscribed.
  * On `frontend/app/rooms/page.tsx`, intercept "List a Spare Room" and open the payment modal if unsubscribed.

---

### Issue #36: Update brand logo click behavior to navigate within app when logged in
* **Assigned**: Member 2
* **Goal**: Clicking "RoomiLink AI" in the navbar should not drop logged-in users back to the public `localhost:3000` marketing page.
* **Frontend**:
  * In `frontend/components/Navbar.tsx`: Brand logo links to `/rooms` for logged-in regular users, `/admin` for admins, and `/` for logged-out visitors.
  * In `frontend/app/page.tsx`: Automatically redirect authenticated users from `/` to `/rooms` (or `/admin`).

---

### Issue #37: Verify and validate all Household workspace features
* **Assigned**: Member 3
* **Goal**: End-to-end verification of Household features.
* **Features to Verify**:
  1. Household creation & 8-character unique invite code.
  2. Joining household using invite code.
  3. Shared expense logging, category filters, and automated debt ledger calculations.
  4. Debt settlement between roommates.
  5. Chore tracker: assignment, recurrence, and completion toggle.
  6. AI Living Agreement: clause generation, viewing, and signatures.

---

### Issue #38: Host Inquiry Inbox - View and manage incoming room inquiries
* **Assigned**: Member 4
* **Goal**: Give property listers and room hosts a dedicated inbox to see all inquiry messages sent by prospective seekers.
* **Backend**:
  * Add endpoint `GET /api/rooms/inquiries/received` to fetch all inquiries for properties owned by the authenticated host.
  * Return sender details (name, email), room title, timestamp, and inquiry message content.
* **Frontend**:
  * In `frontend/app/dashboard/page.tsx` (or an Inquiries modal/tab), add an "Inquiries Received" card.
  * Display list of prospective seekers who reached out, with sender profile, message, and direct contact buttons.

---

### Issue #39: Saved / Favorited Rooms - Bookmark and view favorite listings
* **Assigned**: Member 4
* **Goal**: Allow seekers to save rooms with a heart icon (❤️) and access their saved list anytime.
* **Backend / Storage**:
  * Endpoint `POST /api/rooms/<id>/favorite` and `GET /api/rooms/favorites` (or persistent local favorites).
* **Frontend**:
  * Add heart icon on room cards in `frontend/app/rooms/page.tsx` and details in `frontend/app/rooms/[id]/page.tsx`.
  * Add "Saved Rooms" filter button to view all bookmarked accommodations.

---

### Issue #48: Fix Admin Login redirection to preferred page (/admin) instead of /rooms
* **Assigned**: Vaishnavi Nagtilak
* **Goal**: When signing in using an administrator account (`admin@roomilink.ai`), the user must be routed directly to the Admin Center (`/admin`) instead of getting redirected to `/rooms`.
* **Root Cause**:
  * In `frontend/app/login/page.tsx`, an authenticated-user `useEffect` indiscriminately redirects all logged-in users to `router.push("/rooms")`.
  * When `login()` sets user state in `AuthContext`, this `useEffect` executes before/overrides the role-specific redirect to `/admin`.
* **Frontend Fixes**:
  * In `frontend/app/login/page.tsx`:
    * Update the authentication check to inspect `user.role`: if `user.role === "admin"`, route to `/admin`; if a `redirect` query parameter exists, route to `redirect`; otherwise route regular users to `/rooms` or `/dashboard`.
    * Ensure `handleSubmit` similarly prioritizes `user.role === "admin" -> /admin`.
  * In `frontend/app/admin/layout.tsx`:
    * Ensure the "Sign In as Admin" button points to `/login?redirect=/admin`.
  * In `frontend/components/Navbar.tsx`:
    * Add a prominent "🛡️ Admin Center" navigation link for logged-in admin users so they can easily navigate back to `/admin` at all times.

---

### Issue #49: Restrict Household Hub joining via invite code to subscribed users and redirect to /pricing
* **Assigned**: Vaishnavi More (`@vaishnavimore1311`)
* **Goal**: Ensure unsubscribed users cannot join or create household workspaces; require an active subscription or admin role and redirect to `/pricing`.
* **Backend Fixes**:
  * In `backend/app/routes/household_routes.py`:
    * In `POST /api/v1/household/join`, verify if `user.role != 'admin' and not user.get_active_subscription()`.
    * Reject with `403 Forbidden` (`code: 'SUBSCRIPTION_REQUIRED'`, `upgrade_url: '/pricing'`).
    * In `POST /api/v1/household/create`, enforce identical server-side subscription check.
* **Frontend Fixes**:
  * On `frontend/app/household/page.tsx`: Check `isEligible` (`user?.role === 'admin' || user?.subscription?.is_active`); if unsubscribed, redirect directly to `/pricing?reason=household_join`.
  * Intercept 403 `SUBSCRIPTION_REQUIRED` API responses and redirect to `/pricing?reason=household_join`.
  * Add visual badges and cues on the Join Household form explaining the subscription requirement.
  * On `frontend/app/pricing/page.tsx`: Read query parameter `reason=household_join` and display a clear informational alert.

---

### Issue #52: Ensure all Household Hub members have active subscriptions
* **Assigned**: Vaishnavi Nagtilak (`@vaishnavi110`)
* **Goal**: Guarantee that all roommates residing in shared households (e.g., 'Blue Ridge Co-Living Loft') possess active subscriptions, maintaining consistency with Issue #49 subscription guards.
* **Backend Fixes**:
  * In `backend/seed.py`:
    * Added `ensure_household_members_subscribed()` to automatically provision `Pro Seeker` subscriptions for all household roommates upon seeding.
    * Ensured all 4 demo roommates (`sarah@example.com`, `alex@example.com`, `priya@example.com`, `marcus@example.com`) are linked to the active household and hold active `Pro Seeker` subscriptions.
  * In `backend/tests/test_household.py`:
    * Added automated regression test `test_ensure_household_members_subscribed` to verify subscription synchronization for household members.

# Host Experience & Workflow Enhancement Plan
**RoomiLink AI — Shared Living Platform**

---

## 1. Executive Summary & Objective

This specification details the design decisions, component modifications, and architectural updates required to overhaul the **Host / Lister Persona** in RoomiLink AI, as well as fixing the global logout redirection to `/login`.

### Key Problems Identified:
1. **Logout Redirection**: When clicking "Sign out" or "Log out" in the Navbar, Dashboard, or Admin Layout, the user is either left on the current page or redirected to the home page (`/`), rather than navigating directly to `/login`.
2. **Host Navbar Clutter**: Logged-in hosts currently see seeker-specific tools: "Find Roommates", "Household Hub", and "Saved Rooms", which are irrelevant to property hosts.
3. **Room Creation Ambiguity**: When a host lists a property (`/rooms/new`), they are prompted with a toggle between "Landlord / Property Owner" and "Resident Flatmate Space Share". For hosts, the system should default and restrict to the Landlord listing mode.
4. **Host Profile Irrelevance**: The dashboard (`/dashboard`) shows hosts seeker-centric features:
   - "Overview & Lifestyle" tab (sleep schedule, cleanliness, roommate quiz).
   - "Saved Rooms" tab.
   - "Edit Preferences" button (points to roommate questionnaire `/onboarding`).
   Hosts need to see profile information, verification badges, their hosted property listings, and guest inquiries.
5. **Pricing Plan Confusion**: Hosts visiting `/pricing` currently see a tab switcher allowing them to view and select seeker membership tiers. Hosts should only see commercial Host & Landlord plans.

---

## 2. Component Change Matrix

| Component / File | Current Behavior | Target Behavior for Host / Lister |
| :--- | :--- | :--- |
| **`frontend/context/AuthContext.tsx`** | `logout()` clears token and state but does not navigate. | `logout(redirect = "/login")` clears state and redirects to `/login`. |
| **`frontend/components/Navbar.tsx`** | Shows "Find Roommates", "Household Hub", and "Saved" to all non-admin users (`!isAdmin`). | Only show roommate tools to seekers (`role === 'seeker'`). For hosts (`role === 'lister'`), show "My Listings" and "Guest Inquiries". Logout redirects to `/login`. |
| **`frontend/app/rooms/new/page.tsx`** | Shows dual-mode toggle ("Landlord" vs "Flatmate Space Share") for hosts. | Lock listing mode to "Landlord / Property Owner" for hosts (`role === 'lister'`), hiding the roommate space-share toggle. |
| **`frontend/app/dashboard/page.tsx`** | Shows "Overview & Lifestyle", "Saved Rooms", and "Edit Preferences" to all users. | • Remove "Edit Preferences" button for hosts.<br>• For hosts, hide "Overview & Lifestyle" tab and "Saved Rooms" tab.<br>• Show "Host Profile & Info", "My Listings", "Guest Inquiries", and "ID Verification".<br>• Default active tab to `"profile"` or `"inbox"` for hosts. |
| **`frontend/app/pricing/page.tsx`** | Displays tab switcher for hosts; hosts can click and view seeker plans. | Lock tab to `"lister"` when `user?.role === 'lister'`. Hide tab switcher and display a "🏢 Host & Landlord Membership Plans" badge. |
| **`frontend/app/admin/layout.tsx`** | `handleLogout()` routes to `"/"`. | Change redirect to `"/login"`. |

---

## 3. Detailed Implementation Specifications

### Step 1: Global Logout Redirection to `/login`
- **Location**: `frontend/context/AuthContext.tsx`, `frontend/components/Navbar.tsx`, `frontend/app/dashboard/page.tsx`, `frontend/app/admin/layout.tsx`
- **Specification**:
  1. Update `logout` in `AuthContext.tsx`:
     ```typescript
     const logout = (redirectUrl: string = "/login") => {
       localStorage.removeItem("roomilink_token");
       setToken(null);
       setUser(null);
       if (typeof window !== "undefined" && redirectUrl) {
         window.location.href = redirectUrl;
       }
     };
     ```
  2. In `Navbar.tsx`, update desktop and mobile logout handlers to invoke `logout("/login")` and `router.push("/login")`.
  3. In `dashboard/page.tsx`, update "Sign out" button to call `logout("/login")`.
  4. In `admin/layout.tsx`, update `handleLogout` to route to `"/login"`.

---

### Step 2: Host Navbar Isolation
- **Location**: `frontend/components/Navbar.tsx`
- **Specification**:
  1. Separate Seeker navigation links from Host navigation links:
     - **Seeker (`user?.role === 'seeker'`)**:
       - Browse Rooms (`/rooms`)
       - Find Roommates (`/roommates`)
       - Household Hub (`/household`)
       - My Inquiries (`/dashboard?tab=inquiries`)
       - ❤️ Saved (`/dashboard?tab=saved`)
     - **Host (`user?.role === 'lister'`)**:
       - Explore Market (`/rooms`)
       - 🏡 My Listings (`/dashboard?tab=listings`)
       - 📬 Guest Inquiries (`/dashboard?tab=inquiries`)
       - Pricing (`/pricing`)
       - CTA: `+ List a Room` (`/rooms/new`)
     - **Remove** from Host view:
       - ❌ Find Roommates (`/roommates`)
       - ❌ Household Hub (`/household`)
       - ❌ Saved Rooms (`/dashboard?tab=saved`)
  2. Mirror the exact same separation in the mobile drawer menu.

---

### Step 3: Room Creation Mode Lock for Hosts
- **Location**: `frontend/app/rooms/new/page.tsx`
- **Specification**:
  1. In `useEffect`, if `user?.role === "lister"`:
     - Set `listingPurpose = "landlord"`.
     - Set `isPurposeLocked = true`.
  2. In the JSX rendering (lines 228–285):
     - If `user?.role === "lister"`:
       - Render a dedicated **Landlord / Property Owner Listing** badge:
         ```tsx
         <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start space-x-3.5 shadow-xs text-white">
           <span className="text-2xl mt-0.5">🏢</span>
           <div className="flex-1">
             <div className="flex items-center space-x-2">
               <p className="text-sm font-bold text-white">
                 Landlord / Property Owner Listing
               </p>
               <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500 text-slate-950">
                 Verified Host Mode
               </span>
             </div>
             <p className="text-xs text-slate-300 mt-1 leading-snug">
               Listing a private room, studio, or managed property. Prospective tenant inquiries will route to your Host Inquiry Inbox.
             </p>
           </div>
         </div>
         ```
       - Hide the dual buttons that allow switching to resident flatmate share.

---

### Step 4: Host Dashboard & Profile Overhaul
- **Location**: `frontend/app/dashboard/page.tsx`
- **Specification**:
  1. **Top Header**:
     - Hide the `"Edit Preferences"` button (`/onboarding`) when `user?.role === "lister"`.
     - Show a `"Post New Room"` or `"Edit Profile"` CTA for hosts instead.
  2. **Tab Navigation**:
     - When `user?.role === "lister"`:
       - **Hide**:
         - ❌ `🏠 Overview & Lifestyle` (roommate habits, sleep schedule, cleanliness score).
         - ❌ `❤️ Saved Rooms`.
       - **Show**:
         - 👤 **Host Profile & Account Details** (Personal info, Contact, Account status, Verification badge).
         - 🏡 **My Hosted Listings** (Active properties, vacancy count, edit/manage links).
         - 📬 **Guest Inquiries** (Tenant inquiry messages with status filter).
         - 🪪 **ID Verification** (Host ID / ownership proof).
     - Default `activeTab` for hosts to `"profile"` (or `"listings"`), never `"overview"`.
  3. **Profile-Related Content for Hosts**:
     - Display:
       - Host Full Name, Verified Status Badge, Email, Phone number, Operating City.
       - Quick stats: Total Properties Listed, Inquiries Received, Verification Level.
       - Account creation date and membership tier.

---

### Step 5: Pricing Page Isolation for Hosts
- **Location**: `frontend/app/pricing/page.tsx`
- **Specification**:
  1. When `isAuthenticated && user?.role === "lister"`:
     - Force `currentTab = "lister"`.
     - Hide the role switcher (`[For Room Seekers]` / `[For Property Hosts & Landlords]`).
     - Display a branded header badge:
       `🏢 Host & Landlord Membership Plans`
     - Render only Host plans (`Free Lister`, `Featured Host ₹999`).

---

## 4. High-Impact Enterprise Suggestions for Hosts

1. **Host Quick Listing Status Toggle**:
   - Allow hosts to toggle a listing between "Available" and "Occupied / Under Lease" directly from their dashboard without deleting the listing.
2. **Inquiry Response Time Indicator**:
   - Show hosts their average response time (e.g., "⚡ Responds within 2 hours") to encourage fast tenant replies and boost listing rank.
3. **Landlord Ownership / Trust Verification**:
   - Provide an option for hosts to upload property tax receipts, electricity bills, or society NOCs to earn a higher tier "Verified Property Owner" badge.
4. **Direct WhatsApp / Call Lead Actions**:
   - Allow hosts to click a quick "WhatsApp Tenant" or "Call" button directly from the inquiry row for authorized verified seekers.

---

## 5. Verification & Test Plan

1. **Logout Test**:
   - Log in as Host, click "Sign out" from Navbar and Dashboard. Verify browser redirects to `/login`.
   - Log in as Seeker, click "Sign out". Verify browser redirects to `/login`.
   - Log in as Admin, click "Logout" in admin sidebar. Verify browser redirects to `/login`.
2. **Host Navbar Test**:
   - Log in as Host (`lister`).
   - Verify "Find Roommates", "Household Hub", and "Saved Rooms" do NOT appear.
   - Verify "My Listings" and "Guest Inquiries" appear.
3. **Room Creation Mode Test**:
   - As Host, navigate to `/rooms/new`.
   - Verify the mode defaults and is locked to "Landlord / Property Owner".
   - Verify the roommate space-share toggle is absent.
4. **Host Dashboard Test**:
   - As Host, navigate to `/dashboard`.
   - Verify "Overview & Lifestyle", "Saved Rooms", and "Edit Preferences" do NOT appear.
   - Verify Host Profile info, Hosted Listings, and Guest Inquiries are accessible.
5. **Pricing Page Test**:
   - As Host, navigate to `/pricing`.
   - Verify seeker plans and role tab switcher do NOT appear.
   - Verify only Host / Lister plans are displayed.

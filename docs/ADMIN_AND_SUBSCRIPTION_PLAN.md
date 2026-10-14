# RoomiLink AI — Admin Panel & Subscription System Implementation Plan

> **Scope**: Implementation blueprint to introduce a dedicated **Admin Management Portal**, **Pune City room listings & locality engine**, and an end-to-end **Subscription & Monetization System** for RoomiLink AI.

---

## 1. Executive Summary & Objectives

RoomiLink AI is currently a functional MVP connecting seekers with rooms and roommates. To transition into a commercial, city-focused platform with administrative oversight:

1. **Role-Based Admin Panel (`/admin`)**:
   - Secure portal accessible exclusively to users with `role: "admin"`.
   - Comprehensive dashboard for platform statistics (active rooms, users, subscriptions, revenue).
   - CRUD management for properties and rooms across cities.
   - Subscription management and user role override.

2. **Pune City Real Estate Engine**:
   - First-class support for Pune localities: **Hinjewadi (IT Hub), Wakad, Baner, Kothrud, Viman Nagar, Koregaon Park, Kharadi, Magarpatta, Aundh, Shivaji Nagar, Pimple Saudagar**.
   - Currency localization (₹ INR) and realistic local rental brackets (₹6,000 – ₹30,000/month).
   - Dedicated Pune seed data with localized amenities (Wi-Fi, Power Backup, Cook/Maid, 2-Wheeler Parking).

3. **Tiered Subscription System**:
   - **Seeker Plans**: *Free Tier* (standard search) vs. *Pro Seeker (₹499/mo)* (unlimited AI match explanations, verified badge, direct contact unlock, AI agreement exports).
   - **Lister/Owner Plans**: *Basic Host (Free)* (1 listing) vs. *Featured Host (₹999/mo)* (boosted top-of-search Pune placement, verified landlord badge, unlimited listings).
   - Automated plan enforcement and mock/Razorpay integration pathway.

---

## 2. High-Level Architecture Flow

```mermaid
graph TD
    subgraph Frontend [Next.js 16 App Router]
        UserUI[Seeker / Lister UI]
        PricingUI[Pricing & Plans Page /pricing]
        AdminUI[Admin Dashboard /admin]
        AdminRooms[Room Manager /admin/rooms]
        AdminSubs[Subscription Manager /admin/subscriptions]
    end

    subgraph Backend [Flask REST API]
        AuthGuard[JWT Auth + @admin_required]
        RoomAPI[/api/v1/rooms & /api/v1/admin/rooms]
        SubAPI[/api/v1/subscriptions]
        AdminSubAPI[/api/v1/admin/subscriptions]
    end

    subgraph Database [SQLAlchemy / SQLite & MySQL]
        UsersTable[(users & profiles)]
        PropertiesTable[(properties & rooms)]
        PunePresets[(Pune Localities & Rooms)]
        PlansTable[(subscription_plans)]
        UserSubsTable[(user_subscriptions)]
    end

    AdminUI --> AuthGuard
    AdminRooms --> RoomAPI
    AdminSubs --> AdminSubAPI
    PricingUI --> SubAPI

    RoomAPI --> PropertiesTable
    RoomAPI --> PunePresets
    SubAPI --> PlansTable
    SubAPI --> UserSubsTable
    AuthGuard --> UsersTable
```

---

## 3. Database Schema Extensions

### 3.1 Existing Schema Enhancements
In `backend/app/models/user_models.py`:
- `User.role` already accepts `"admin"` (values: `"seeker"`, `"lister"`, `"admin"`).
- Add relationship to `user_subscriptions`.

### 3.2 New Subscription Models (`backend/app/models/subscription_models.py`)

```python
from datetime import datetime, timezone
from app import db

class SubscriptionPlan(db.Model):
    __tablename__ = "subscription_plans"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)          # e.g., "Pro Seeker", "Featured Host"
    slug = db.Column(db.String(50), unique=True, nullable=False) # "pro_seeker", "featured_host"
    target_role = db.Column(db.String(20), nullable=False)    # "seeker" or "lister"
    price_inr = db.Column(db.Float, nullable=False)           # 499.0, 999.0
    billing_cycle = db.Column(db.String(20), default="monthly") # monthly, quarterly, annual
    features = db.Column(db.Text, default="[]")               # JSON list of feature bullets
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    subscriptions = db.relationship("UserSubscription", backref="plan", lazy="dynamic")


class UserSubscription(db.Model):
    __tablename__ = "user_subscriptions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey("subscription_plans.id", ondelete="CASCADE"), nullable=False)
    status = db.Column(db.String(30), default="active")       # active, expired, cancelled
    starts_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime, nullable=False)
    payment_reference = db.Column(db.String(100), nullable=True) # mock_pay_xxx or razorpay_id
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref=db.backref("subscriptions", lazy="dynamic"))
```

### 3.3 Pune City Property Attributes
In `backend/app/models/property_models.py`:
- Ensure `city` (indexed) and `neighborhood` are leveraged.
- Add optional `is_featured` (boolean, default=False) on `Room` or `Property` to support boosted listings from subscription perks.

---

## 4. Pune City Integration Specifications

### 4.1 Pune Localities Directory
To make room creation intuitive for admins, Pune will feature standardized localities with typical rental benchmarks:

| Locality | Category / Target Audience | Typical Rent Range (Private Room) | Key Amenities |
| :--- | :--- | :--- | :--- |
| **Hinjewadi** | Phase 1/2/3 IT Techies | ₹7,500 – ₹14,000 | Wi-Fi, AC, Shuttle, Power Backup |
| **Wakad** | IT & Young Professionals | ₹8,000 – ₹15,000 | Gym, Gated Security, Parking |
| **Baner** | Upscale Tech & Cafe Culture | ₹10,000 – ₹18,000 | High-speed Wi-Fi, Balcony, Maid |
| **Kothrud** | Students & MIT/COEP crowd | ₹6,000 – ₹11,000 | Veg Friendly, Study Desk, Quiet |
| **Viman Nagar** | Airport corridor, Symbiosis students | ₹11,000 – ₹20,000 | Fully Furnished, AC, Night Life |
| **Koregaon Park (KP)** | Premium Cosmopolitan | ₹14,000 – ₹26,000 | Designer Decor, Pet-Friendly |
| **Kharadi** | EON IT Park employees | ₹8,500 – ₹16,000 | Lift, Power Backup, Modern Kitchen |
| **Magarpatta / Hadapsar** | Cybercity Professionals | ₹7,500 – ₹13,500 | Walking distance to IT Park, Club |
| **Aundh** | Central & Residential | ₹9,000 – ₹16,000 | Green spaces, Market proximity |
| **Pimple Saudagar** | Emerging residential hub | ₹7,000 – ₹13,000 | Budget-friendly, Gated Society |

### 4.2 Localized Room Amenities
Preset tags in the Admin Room Creator:
- `High-Speed Wi-Fi`, `Power Backup / Inverter`, `Air Conditioner (AC)`, `Daily Housekeeping / Maid`, `Washing Machine`, `Cook / Tiffin Available`, `2-Wheeler Parking`, `4-Wheeler Parking`, `Attached Bathroom`, `Gated 24/7 Security`.

---

## 5. Backend Implementation Steps

### Step 5.1: Admin Security Decorator (`backend/app/utils/decorators.py`)
```python
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app import db
from app.models.user_models import User

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            user_id = int(get_jwt_identity())
            user = db.session.get(User, user_id)
            if not user or user.role != "admin":
                return jsonify({"status": "error", "message": "Admin privileges required."}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper
```

### Step 5.2: Admin Room & Platform Management Blueprint (`backend/app/routes/admin_routes.py`)
New Blueprint: `admin_bp` mounted at `/api/v1/admin`:
- `GET /api/v1/admin/stats`: Returns count of users, rooms, active subscriptions, total revenue.
- `GET /api/v1/admin/rooms`: List all rooms with filter by city (e.g. Pune), status, and lister details.
- `POST /api/v1/admin/rooms`: Create a new property + room directly with Pune locality presets.
- `PUT /api/v1/admin/rooms/<id>`: Edit room details, rent, availability, or feature status.
- `DELETE /api/v1/admin/rooms/<id>`: Remove room listing.
- `GET /api/v1/admin/users`: List registered users and their current subscription status.
- `PATCH /api/v1/admin/users/<id>/role`: Promote/demote user roles (e.g., make another admin).

### Step 5.3: Subscription Blueprint (`backend/app/routes/subscription_routes.py`)
Mounted at `/api/v1/subscriptions`:
- `GET /api/v1/subscriptions/plans`: Public endpoint returning active plans and prices.
- `GET /api/v1/subscriptions/me`: Authenticated endpoint returning current active tier and perks.
- `POST /api/v1/subscriptions/checkout`: Initiates subscription (supports instant simulated activation or payment callback).
- `POST /api/v1/subscriptions/cancel`: Cancels auto-renewal.

---

## 6. Frontend Implementation Steps

### Step 6.1: Admin Portal Routes (`frontend/app/admin/`)
Create a dedicated admin interface using Next.js App Router:

```
frontend/app/admin/
├── layout.tsx              # Admin layout with sidebar navigation & role verification
├── page.tsx                # Admin overview dashboard (Metrics, Charts, Recent Activity)
├── rooms/
│   ├── page.tsx            # Table of rooms with Pune filter, availability toggles, delete action
│   └── new/
│       └── page.tsx        # Add Room Form tailored with Pune localities & amenities presets
├── subscriptions/
│   └── page.tsx            # View subscriber accounts, active plans, expiration dates
└── users/
    └── page.tsx            # User directory, verify users, assign admin roles
```

### Step 6.2: Pune-Tailored Room Creation Form (`/admin/rooms/new`)
Form fields:
1. **City Selection**: Default pre-selected to **"Pune, Maharashtra"**.
2. **Neighborhood Dropdown**: Hinjewadi, Wakad, Baner, Kothrud, Viman Nagar, Kharadi, Koregaon Park, Aundh, Magarpatta, etc.
3. **Property & Room Details**: Title, Address/Society Name, Room Type (`Private`, `Shared`, `Master Bedroom`), Property Type (`Apartment`, `Gated Villa`, `Independent House`).
4. **Pricing (INR)**: Monthly Rent (`₹`), Security Deposit (`₹`), Maintenance Charges.
5. **Amenities Checklist**: Interactive pill tags for Wi-Fi, AC, Power Backup, Maid, Cook, Parking.
6. **Images**: Multi-URL input with instant preview thumbnails.
7. **Featured Listing Switch**: Toggle to mark as a boosted Pune listing.

### Step 6.3: Public Pricing & Subscriptions Page (`frontend/app/pricing/page.tsx`)
1. Dual toggle: **"For Room Seekers"** vs. **"For Property Listers"**.
2. Clean pricing cards with feature comparisons:
   - **Free Seeker**: Standard search, 3 match checks/day.
   - **Pro Seeker (₹499/mo)**: Unlimited AI match explanations, instant roommate contact, AI Living Agreement generator, verified badge.
   - **Basic Lister (Free)**: 1 room listing.
   - **Featured Host (₹999/mo)**: Featured room badge, priority search ranking in Pune, unlimited listings.
3. One-click "Subscribe / Upgrade" button connected to `/api/v1/subscriptions/checkout`.

### Step 6.4: Navigation & Role Guarding
- Update `frontend/components/Navbar.tsx`:
  - If `user?.role === "admin"`, render an **"Admin Portal"** link with an distinct badge in the top navigation bar.
  - Add **"Pricing"** link in main navigation.
- Add Client/Route Guard in `frontend/app/admin/layout.tsx` to redirect non-admin users to `/login` or `/dashboard`.

---

## 7. Seed Data & Database Initialization

Update `backend/seed.py`:
1. **Admin Account**:
   - Email: `admin@roomilink.ai`
   - Password: `AdminPassword123!`
   - Role: `admin`
   - Name: `System Administrator`
2. **Subscription Plans**:
   - `pro_seeker`: ₹499/month
   - `featured_host`: ₹999/month
3. **Pune Properties & Rooms (6 Realistic Seed Listings)**:
   - *Hinjewadi Phase 1*: 2BHK Shared Flat near Infosys Circle, ₹8,500/mo.
   - *Baner High Street*: Private Master Bedroom in Luxury 3BHK, ₹14,500/mo.
   - *Viman Nagar*: Furnished Room near Symbiosis & Phoenix Mall, ₹13,000/mo.
   - *Wakad Datta Mandir Road*: Single Room in Gated Society, ₹9,000/mo.
   - *Kothrud near MIT*: Budget Student Room with Kitchenette, ₹7,000/mo.
   - *Kharadi EON Free Zone*: Modern Studio-style Private Room, ₹12,000/mo.

---

## 8. Implementation Checklist & Phased Roadmap

| Phase | Task Description | Files Impacted |
| :---: | :--- | :--- |
| **Phase 1** | **Database & Models**<br>Add `SubscriptionPlan` & `UserSubscription` models, add admin role checks | `backend/app/models/subscription_models.py`<br>`backend/app/models/__init__.py`<br>`backend/app/models/user_models.py` |
| **Phase 2** | **Backend APIs**<br>Implement `@admin_required` decorator, Admin routes (`/admin/*`), and Subscription routes (`/subscriptions/*`) | `backend/app/utils/decorators.py`<br>`backend/app/routes/admin_routes.py`<br>`backend/app/routes/subscription_routes.py`<br>`backend/app/__init__.py` |
| **Phase 3** | **Pune Seed Data**<br>Add `admin@roomilink.ai`, subscription plans, and 6 diverse Pune room listings to seed script | `backend/seed.py` |
| **Phase 4** | **Frontend Admin Portal**<br>Build Admin layout, stats dashboard, and Pune-tailored Room addition form | `frontend/app/admin/layout.tsx`<br>`frontend/app/admin/page.tsx`<br>`frontend/app/admin/rooms/page.tsx`<br>`frontend/app/admin/rooms/new/page.tsx` |
| **Phase 5** | **Frontend Subscription & Pricing**<br>Build public `/pricing` page, subscription upgrade modal, and admin subscription table | `frontend/app/pricing/page.tsx`<br>`frontend/app/admin/subscriptions/page.tsx` |
| **Phase 6** | **UI & Navbar Updates**<br>Add Admin Portal button to Navbar for admins, update room filters with quick Pune neighborhood pills | `frontend/components/Navbar.tsx`<br>`frontend/app/rooms/page.tsx` |
| **Phase 7** | **Verification & Testing**<br>Run Pytest tests, verify admin auth guard, verify Pune room creation and subscription flow | `backend/tests/`<br>Manual Browser Verification |

---

## 9. Testing & Quality Assurance Plan

1. **RBAC Security Tests**:
   - Ensure seekers and listers cannot call `/api/v1/admin/*` (HTTP 403 Forbidden).
   - Ensure only authenticated admin tokens can add or delete rooms via admin endpoints.
2. **Pune Room Filtering Tests**:
   - Verify searching for `city=Pune` returns all Pune properties correctly.
   - Verify neighborhood filter (e.g. `Hinjewadi`, `Baner`) filters accurately.
3. **Subscription Lifecycle Tests**:
   - Verify plan listing endpoint returns active plans.
   - Verify simulated checkout assigns active subscription and sets expiration date (+30 days).
   - Verify features unlock based on active subscription status.

---

*Plan document generated for RoomiLink AI. Ready to proceed with implementation whenever you are ready!*

"""Demo Seed Script for RoomiLink AI.

Provisions a complete, presentation-ready database populated with:
- 4 diverse roommate profiles with 8-factor lifestyle vectors
- 3 detailed property & room listings with photos and amenities
- 1 active household workspace ('The Austin Tech Loft')
- Pre-split shared expenses and pairwise debt ledger
- Weekly chore rotation checklist
- Formally synthesized 5-clause AI Living Agreement
"""

import os
import sys
import json
from datetime import datetime, timezone

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app import create_app, db
from app.models.user_models import User, Profile, RoommatePreference
from app.models.property_models import Property, Room
from app.models.household_models import Household, HouseholdMember, Expense, Payment, Chore, Agreement
from app.models.subscription_models import SubscriptionPlan, UserSubscription
from app.services.expense_service import add_household_expense
from app.ai.fallbacks import generate_fallback_agreement
from datetime import timedelta

def seed_database():
    app = create_app("development")
    with app.app_context():
        print("[*] Initializing RoomiLink AI database schema...")
        db.create_all()

        # Seed Admin & Subscription Plans & Pune listings first/always
        seed_admin_and_pune_data(app)

        # Check if legacy demo users already seeded
        if User.query.filter_by(email="sarah@example.com").first():
            print("[+] Base roommate demo data already present.")
            return

        print("[*] Provisioning 4 diverse demo roommates...")

        # 1. Sarah Jenkins
        user_sarah = User(email="sarah@example.com", role="seeker", is_verified=True, ai_consent_enabled=True)
        user_sarah.set_password("Password123!")
        db.session.add(user_sarah)
        db.session.flush()

        prof_sarah = Profile(
            user_id=user_sarah.id,
            full_name="Sarah Jenkins",
            age=24,
            gender="Female",
            occupation="UX/UI Designer",
            city="Austin, TX",
            bio="Quiet and organized designer working hybrid. Love cooking weekend pasta, keeping common areas tidy, and early morning runs around Lady Bird Lake.",
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
        )
        pref_sarah = RoommatePreference(
            user_id=user_sarah.id,
            sleep_schedule="early_bird",
            cleanliness_level=5,
            smoking_status="non_smoker",
            guest_frequency="weekends",
            noise_tolerance="quiet_strict",
            dietary_pref="any",
            work_routine="hybrid",
            pet_tolerance="friendly",
            budget_min=700.0,
            budget_max=1200.0
        )
        db.session.add_all([prof_sarah, pref_sarah])

        # 2. Alex Rivera
        user_alex = User(email="alex@example.com", role="seeker", is_verified=True, ai_consent_enabled=True)
        user_alex.set_password("Password123!")
        db.session.add(user_alex)
        db.session.flush()

        prof_alex = Profile(
            user_id=user_alex.id,
            full_name="Alex Rivera",
            age=26,
            gender="Male",
            occupation="Software Engineer",
            city="Austin, TX",
            bio="Software engineer working remote 3 days a week. Very respectful of study quiet hours and always punctual with rent & grocery split bills.",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        )
        pref_alex = RoommatePreference(
            user_id=user_alex.id,
            sleep_schedule="early_bird",
            cleanliness_level=4,
            smoking_status="non_smoker",
            guest_frequency="weekends",
            noise_tolerance="moderate",
            dietary_pref="any",
            work_routine="hybrid",
            pet_tolerance="friendly",
            budget_min=800.0,
            budget_max=1300.0
        )
        db.session.add_all([prof_alex, pref_alex])

        # 3. Priya Sharma
        user_priya = User(email="priya@example.com", role="seeker", is_verified=True, ai_consent_enabled=True)
        user_priya.set_password("Password123!")
        db.session.add(user_priya)
        db.session.flush()

        prof_priya = Profile(
            user_id=user_priya.id,
            full_name="Priya Sharma",
            age=23,
            gender="Female",
            occupation="Graduate Researcher",
            city="Austin, TX",
            bio="UT Austin biology grad researcher. Quiet studier during exam weeks, plant enthusiast, vegetarian, and big fan of chore checklists.",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        )
        pref_priya = RoommatePreference(
            user_id=user_priya.id,
            sleep_schedule="flexible",
            cleanliness_level=4,
            smoking_status="non_smoker",
            guest_frequency="rarely",
            noise_tolerance="quiet_strict",
            dietary_pref="veg",
            work_routine="on_site",
            pet_tolerance="friendly",
            budget_min=650.0,
            budget_max=1050.0
        )
        db.session.add_all([prof_priya, pref_priya])

        # 4. Marcus Vance
        user_marcus = User(email="marcus@example.com", role="seeker", is_verified=True, ai_consent_enabled=True)
        user_marcus.set_password("Password123!")
        db.session.add(user_marcus)
        db.session.flush()

        prof_marcus = Profile(
            user_id=user_marcus.id,
            full_name="Marcus Vance",
            age=27,
            gender="Male",
            occupation="Digital Marketer",
            city="Austin, TX",
            bio="Creative marketer & music producer. Night owl who loves social weekend gatherings, lively cooking sessions, and coffee chats.",
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
        )
        pref_marcus = RoommatePreference(
            user_id=user_marcus.id,
            sleep_schedule="night_owl",
            cleanliness_level=3,
            smoking_status="outside_only",
            guest_frequency="frequent",
            noise_tolerance="lively",
            dietary_pref="any",
            work_routine="remote",
            pet_tolerance="has_pet",
            budget_min=900.0,
            budget_max=1600.0
        )
        db.session.add_all([prof_marcus, pref_marcus])

        db.session.commit()
        print("✅ 4 Roommates created successfully.")

        # 5. Provision 3 Properties & Rooms
        print("🏡 Provisioning 3 property listings...")

        prop1 = Property(
            lister_id=user_sarah.id,
            title="Sunny Modern Loft near UT Campus",
            description="Spacious high-ceiling apartment located in Campus North with sun-drenched private room, in-unit laundry, and hardwood floors throughout.",
            address="404 Speedway Ave",
            city="Austin",
            neighborhood="Campus North",
            property_type="apartment"
        )
        db.session.add(prop1)
        db.session.flush()

        room1 = Room(
            property_id=prop1.id,
            room_type="private",
            rent_amount=850.0,
            deposit_amount=500.0,
            available_from="Immediate",
            is_available=True
        )
        room1.set_amenities(["High-Speed Wi-Fi", "In-Unit Laundry", "Central AC", "Dishwasher", "Furnished"])
        room1.set_images([
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"
        ])
        db.session.add(room1)

        prop2 = Property(
            lister_id=user_alex.id,
            title="Charming Bungalow in South Congress",
            description="Private master suite in a renovated craftsman home. Features private bathroom, patio with garden views, and walking distance to SoCo coffee shops.",
            address="1420 S Congress Ave",
            city="Austin",
            neighborhood="South Congress",
            property_type="house"
        )
        db.session.add(prop2)
        db.session.flush()

        room2 = Room(
            property_id=prop2.id,
            room_type="private",
            rent_amount=950.0,
            deposit_amount=600.0,
            available_from="Sep 1",
            is_available=True
        )
        room2.set_amenities(["High-Speed Wi-Fi", "Private Bathroom", "Backyard Garden", "In-Unit Laundry", "Parking"])
        room2.set_images([
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
            "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"
        ])
        db.session.add(room2)

        prop3 = Property(
            lister_id=user_marcus.id,
            title="Luxury High-Rise Suite in Downtown Austin",
            description="Corner bedroom on 18th floor with floor-to-ceiling city skyline views. Building features rooftop pool, state-of-the-art gym, and 24/7 concierge.",
            address="300 Colorado St",
            city="Austin",
            neighborhood="Downtown",
            property_type="apartment"
        )
        db.session.add(prop3)
        db.session.flush()

        room3 = Room(
            property_id=prop3.id,
            room_type="private",
            rent_amount=1200.0,
            deposit_amount=800.0,
            available_from="Immediate",
            is_available=True
        )
        room3.set_amenities(["Rooftop Pool", "Fitness Center", "Concierge", "EV Charging", "Balcony Skyline View"])
        room3.set_images([
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
        ])
        db.session.add(room3)

        db.session.commit()
        print("[+] 3 Property listings created.")

        # 6. Provision Active Household
        print("[*] Provisioning Active Household ('The Austin Tech Loft')...")

        household = Household(
            name="The Austin Tech Loft",
            address="404 West 6th Street, Apt 12B, Austin, TX",
            invite_code="A8F2C41D",
            created_by_id=user_sarah.id
        )
        db.session.add(household)
        db.session.flush()

        m_sarah = HouseholdMember(household_id=household.id, user_id=user_sarah.id, role="admin")
        m_alex = HouseholdMember(household_id=household.id, user_id=user_alex.id, role="member")
        m_priya = HouseholdMember(household_id=household.id, user_id=user_priya.id, role="member")
        db.session.add_all([m_sarah, m_alex, m_priya])
        db.session.commit()

        # 7. Add Shared Expenses & Debts
        print("[*] Splitting shared household expenses...")
        add_household_expense(household.id, user_sarah.id, "Gigabit Fiber Internet", 90.0, "Utilities", "equal")
        add_household_expense(household.id, user_alex.id, "Costco Paper Towels & Dish Soap", 75.0, "Supplies", "equal")
        add_household_expense(household.id, user_sarah.id, "Living Room Rug & Lamp", 120.0, "Supplies", "equal")

        # 8. Add Weekly Chores
        print("[*] Scheduling weekly chore rotations...")
        c1 = Chore(
            household_id=household.id,
            assigned_to_id=user_sarah.id,
            title="Kitchen Deep Clean & Counter Sanitization",
            frequency="weekly",
            due_date="Sunday",
            is_completed=False
        )
        c2 = Chore(
            household_id=household.id,
            assigned_to_id=user_alex.id,
            title="Trash & Recycling Bin Rollout to Curb",
            frequency="weekly",
            due_date="Tuesday",
            is_completed=True
        )
        c3 = Chore(
            household_id=household.id,
            assigned_to_id=user_priya.id,
            title="Common Living Area Vacuum & Mopping",
            frequency="weekly",
            due_date="Friday",
            is_completed=False
        )
        db.session.add_all([c1, c2, c3])

        # 9. Synthesize AI Living Agreement
        print("[*] Synthesizing AI Living Agreement...")
        members_meta = [
            {"user_id": user_sarah.id, "full_name": "Sarah Jenkins", "preferences": pref_sarah.to_dict()},
            {"user_id": user_alex.id, "full_name": "Alex Rivera", "preferences": pref_alex.to_dict()},
            {"user_id": user_priya.id, "full_name": "Priya Sharma", "preferences": pref_priya.to_dict()},
        ]
        ag_data = generate_fallback_agreement(household.name, members_meta)

        agreement = Agreement(
            household_id=household.id,
            version=ag_data["version"],
            is_active=True
        )
        agreement.set_clauses(ag_data["clauses"])
        db.session.add(agreement)

        db.session.commit()
        print("[+] SUCCESS! Base roommate demo data created.")


def seed_admin_and_pune_data(app):
    """Seed Admin user, Subscription Plans, and Pune properties."""
    print("[*] Checking / Provisioning Admin account & Pune city data...")

    # 1. Admin Account
    admin = User.query.filter_by(email="admin@roomilink.ai").first()
    if not admin:
        admin = User(email="admin@roomilink.ai", role="admin", is_verified=True, ai_consent_enabled=True)
        admin.set_password("AdminPassword123!")
        db.session.add(admin)
        db.session.flush()

        prof_admin = Profile(
            user_id=admin.id,
            full_name="RoomiLink Admin",
            age=32,
            gender="Other",
            occupation="Platform Administrator",
            city="Pune, Maharashtra",
            bio="System administrator managing Pune verified properties, subscriptions, and safety."
        )
        pref_admin = RoommatePreference(user_id=admin.id)
        db.session.add_all([prof_admin, pref_admin])
        db.session.commit()
        print("[+] Admin account provisioned: admin@roomilink.ai / AdminPassword123!")

    # 2. Pune Local Lister (Rahul Joshi)
    lister_pune = User.query.filter_by(email="rahul.pune@example.com").first()
    if not lister_pune:
        lister_pune = User(email="rahul.pune@example.com", role="lister", is_verified=True, ai_consent_enabled=True)
        lister_pune.set_password("Password123!")
        db.session.add(lister_pune)
        db.session.flush()

        prof_pune = Profile(
            user_id=lister_pune.id,
            full_name="Rahul Joshi",
            age=29,
            gender="Male",
            occupation="Property Host & Tech Consultant",
            city="Pune, Maharashtra",
            bio="Verified host managing premium shared flats across Hinjewadi, Baner, and Wakad.",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        )
        pref_pune = RoommatePreference(user_id=lister_pune.id)
        db.session.add_all([prof_pune, pref_pune])
        db.session.commit()

    # 3. Subscription Plans
    if SubscriptionPlan.query.count() == 0:
        print("[*] Provisioning Subscription Plans...")
        p1 = SubscriptionPlan(
            name="Free Seeker",
            slug="free_seeker",
            target_role="seeker",
            price_inr=0.0,
            billing_cycle="monthly"
        )
        p1.set_features([
            "Search verified rooms in Pune & nationwide",
            "Basic lifestyle compatibility percentage",
            "Up to 3 roommate matches per day"
        ])

        p2 = SubscriptionPlan(
            name="Pro Seeker",
            slug="pro_seeker",
            target_role="seeker",
            price_inr=499.0,
            billing_cycle="monthly"
        )
        p2.set_features([
            "Unlimited AI match explanations & deep breakdown",
            "Direct instant contact with roommates & landlords",
            "Verified Seeker priority trust badge",
            "Generate & export official AI Living Agreements",
            "Early alerts for newly listed Pune properties"
        ])

        p3 = SubscriptionPlan(
            name="Basic Lister",
            slug="basic_lister",
            target_role="lister",
            price_inr=0.0,
            billing_cycle="monthly"
        )
        p3.set_features([
            "1 active room listing",
            "Standard search results placement",
            "Receive inquiry messages from verified seekers"
        ])

        p4 = SubscriptionPlan(
            name="Featured Host",
            slug="featured_host",
            target_role="lister",
            price_inr=999.0,
            billing_cycle="monthly"
        )
        p4.set_features([
            "Boosted Top-of-Search placement in Pune",
            "Featured Room Ribbon & Verified Landlord badge",
            "Unlimited active room listings",
            "Tenant lifestyle compatibility match preview",
            "Dedicated WhatsApp & phone support line"
        ])
        db.session.add_all([p1, p2, p3, p4])
        db.session.commit()
        print("[+] 4 Subscription Plans created.")

    # 4. Provision 6 Pune Properties and Rooms
    pune_count = db.session.query(Property).filter(Property.city.ilike("%Pune%")).count()
    if pune_count == 0:
        print("[*] Provisioning 6 realistic Pune properties across Hinjewadi, Baner, Wakad, Viman Nagar, Kothrud, Kharadi...")
        host_id = lister_pune.id if lister_pune else admin.id

        # Pune 1: Hinjewadi
        prop_h = Property(
            lister_id=host_id,
            title="Tech Haven Flatshare — Phase 1 IT Park",
            description="Modern 2BHK high-rise apartment in Blue Ridge Township. Walking distance to Cognizant, Infosys, and TCS. Fiber internet, power backup, and quiet study vibes.",
            address="Tower 12, Blue Ridge Town, Phase 1, Hinjewadi",
            city="Pune",
            neighborhood="Hinjewadi",
            property_type="apartment"
        )
        db.session.add(prop_h)
        db.session.flush()

        r_h = Room(
            property_id=prop_h.id,
            room_type="private",
            rent_amount=8500.0,
            deposit_amount=15000.0,
            is_available=True,
            is_featured=True,
            available_from="Immediate"
        )
        r_h.set_amenities(["High-Speed Wi-Fi", "Power Backup", "Air Conditioner", "Cook Available", "2-Wheeler Parking", "Gated Security", "Washing Machine"])
        r_h.set_images([
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"
        ])
        db.session.add(r_h)

        # Pune 2: Baner High Street
        prop_b = Property(
            lister_id=host_id,
            title="Luxury Master Suite on Balewadi High Street",
            description="Designer penthouse room with attached balcony, walk-in wardrobe, and city views. Near cafes, organic stores, and quick access to Mumbai-Bangalore highway.",
            address="Balewadi High Street, Baner",
            city="Pune",
            neighborhood="Baner",
            property_type="apartment"
        )
        db.session.add(prop_b)
        db.session.flush()

        r_b = Room(
            property_id=prop_b.id,
            room_type="master",
            rent_amount=14500.0,
            deposit_amount=25000.0,
            is_available=True,
            is_featured=True,
            available_from="Immediate"
        )
        r_b.set_amenities(["High-Speed Wi-Fi", "Swimming Pool", "Gym", "Air Conditioner", "Balcony", "Housekeeping", "4-Wheeler Parking"])
        r_b.set_images([
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
        ])
        db.session.add(r_b)

        # Pune 3: Wakad
        prop_w = Property(
            lister_id=host_id,
            title="Cozy Single Room near Kaspate Vasti",
            description="Sunny private bedroom in a gated residential community. Fully furnished with modular kitchen and RO water purifier.",
            address="Near Datta Mandir, Kaspate Vasti, Wakad",
            city="Pune",
            neighborhood="Wakad",
            property_type="apartment"
        )
        db.session.add(prop_w)
        db.session.flush()

        r_w = Room(
            property_id=prop_w.id,
            room_type="private",
            rent_amount=9200.0,
            deposit_amount=18000.0,
            is_available=True,
            is_featured=False,
            available_from="Oct 15"
        )
        r_w.set_amenities(["High-Speed Wi-Fi", "Geyser", "Power Backup", "Maid Service", "2-Wheeler Parking", "Elevator"])
        r_w.set_images([
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
        ])
        db.session.add(r_w)

        # Pune 4: Viman Nagar
        prop_v = Property(
            lister_id=host_id,
            title="Cosmopolitan Co-Living near Symbiosis & Phoenix Mall",
            description="Premium air-conditioned suite ideal for students or aviation/airport professionals. Close to Phoenix Marketcity and metro station.",
            address="Sakore Nagar, Near Symbiosis, Viman Nagar",
            city="Pune",
            neighborhood="Viman Nagar",
            property_type="condo"
        )
        db.session.add(prop_v)
        db.session.flush()

        r_v = Room(
            property_id=prop_v.id,
            room_type="private",
            rent_amount=13000.0,
            deposit_amount=25000.0,
            is_available=True,
            is_featured=True,
            available_from="Immediate"
        )
        r_v.set_amenities(["Air Conditioner", "High-Speed Wi-Fi", "Attached Bathroom", "Daily Housekeeping", "Washing Machine", "Microwave"])
        r_v.set_images([
            "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800"
        ])
        db.session.add(r_v)

        # Pune 5: Kothrud
        prop_k = Property(
            lister_id=host_id,
            title="Peaceful Study Haven near MIT World Peace University",
            description="Well-lit room in a serene locality. Strict vegetarian household, quiet study hours, and walking distance to MIT Paud road.",
            address="Ideal Colony, Paud Road, Kothrud",
            city="Pune",
            neighborhood="Kothrud",
            property_type="house"
        )
        db.session.add(prop_k)
        db.session.flush()

        r_k = Room(
            property_id=prop_k.id,
            room_type="private",
            rent_amount=7200.0,
            deposit_amount=12000.0,
            is_available=True,
            is_featured=False,
            available_from="Immediate"
        )
        r_k.set_amenities(["High-Speed Wi-Fi", "Power Backup", "Water Purifier", "Study Table", "Bike Parking", "Vegetarian Friendly"])
        r_k.set_images([
            "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"
        ])
        db.session.add(r_k)

        # Pune 6: Kharadi
        prop_kh = Property(
            lister_id=host_id,
            title="Modern Executive Suite near EON IT Park & WTC",
            description="Spacious studio-style room in a luxury society with clubhouse, gym, and 24/7 security. 5 mins drive to EON Free Zone.",
            address="Near World Trade Center, Kharadi",
            city="Pune",
            neighborhood="Kharadi",
            property_type="apartment"
        )
        db.session.add(prop_kh)
        db.session.flush()

        r_kh = Room(
            property_id=prop_kh.id,
            room_type="private",
            rent_amount=11800.0,
            deposit_amount=20000.0,
            is_available=True,
            is_featured=False,
            available_from="Immediate"
        )
        r_kh.set_amenities(["Air Conditioner", "Power Backup", "High-Speed Wi-Fi", "Gym", "Gated Security", "Elevator"])
        r_kh.set_images([
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
        ])
        db.session.add(r_kh)

        db.session.commit()
        print("[+] 6 Pune property listings created successfully!")

    # 5. Link Sample Active Subscriptions
    pro_plan = SubscriptionPlan.query.filter_by(slug="pro_seeker").first()
    sarah = User.query.filter_by(email="sarah@example.com").first()
    if sarah and pro_plan and not sarah.get_active_subscription():
        sub_sarah = UserSubscription(
            user_id=sarah.id,
            plan_id=pro_plan.id,
            status="active",
            starts_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            payment_reference="seed_sub_sarah_pro"
        )
        db.session.add(sub_sarah)
        db.session.commit()
        print("[+] Activated Pro Seeker subscription for sarah@example.com")

    host_plan = SubscriptionPlan.query.filter_by(slug="featured_host").first()
    if lister_pune and host_plan and not lister_pune.get_active_subscription():
        sub_host = UserSubscription(
            user_id=lister_pune.id,
            plan_id=host_plan.id,
            status="active",
            starts_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=60),
            payment_reference="seed_sub_host_featured"
        )
        db.session.add(sub_host)
        db.session.commit()
        print("[+] Activated Featured Host subscription for rahul.pune@example.com")

    print("----------------------------------------------------------------------")
    print("New Administrative & Pune Demo Credentials:")
    print("  Administrator : admin@roomilink.ai / AdminPassword123! (Role: admin)")
    print("  Pune Host     : rahul.pune@example.com / Password123! (Role: lister)")
    print("  Seeker (Pro)  : sarah@example.com / Password123! (Role: seeker)")
    print("----------------------------------------------------------------------")


if __name__ == "__main__":
    seed_database()


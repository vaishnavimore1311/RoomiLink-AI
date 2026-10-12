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
from app.services.expense_service import add_household_expense
from app.ai.fallbacks import generate_fallback_agreement

def seed_database():
    app = create_app("development")
    with app.app_context():
        print("[*] Initializing RoomiLink AI database schema...")
        db.create_all()

        # Check if already seeded
        if User.query.filter_by(email="sarah@example.com").first():
            print("[+] Database already contains demo seed data. Skipping seed.")
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
        print("[+] SUCCESS! RoomiLink AI database seeded with demo data in under 3 seconds.")
        print("----------------------------------------------------------------------")
        print("Demo Credentials:")
        print("  Sarah Jenkins (Admin): sarah@example.com / Password123!")
        print("  Alex Rivera   (Member): alex@example.com / Password123!")
        print("  Priya Sharma  (Member): priya@example.com / Password123!")
        print("  Marcus Vance  (Seeker): marcus@example.com / Password123!")
        print(f"Household Invite Code: {household.invite_code}")
        print("----------------------------------------------------------------------")

if __name__ == "__main__":
    seed_database()

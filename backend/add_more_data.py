"""
Add More Realistic Pune Roommates and Property Listings to RoomiLink Database.
Usage: python add_more_data.py
"""
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from app.models.user_models import User, Profile, RoommatePreference
from app.models.property_models import Property, Room

def add_more_records():
    app = create_app(os.getenv("FLASK_ENV", "development"))
    with app.app_context():
        print("[*] Adding new roommate seekers and property listings to cloud database...")

        # -------------------------------------------------------------
        # 1. ADD NEW ROOMMATES (SEEKERS)
        # -------------------------------------------------------------
        new_roommates = [
            {
                "email": "neha.k@example.com",
                "name": "Neha Kulkarni",
                "age": 25,
                "gender": "Female",
                "occupation": "Product Designer",
                "city": "Pune, Maharashtra",
                "bio": "Product designer working at a fintech startup. Love calm morning filter coffee, clean minimalist spaces, and Sunday pottery workshops.",
                "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
                "prefs": {
                    "sleep_schedule": "early_bird",
                    "cleanliness_level": 5,
                    "smoking_status": "non_smoker",
                    "guest_frequency": "weekends",
                    "noise_tolerance": "quiet_strict",
                    "dietary_pref": "veg",
                    "work_routine": "hybrid",
                    "pet_tolerance": "friendly",
                    "budget_min": 11000.0,
                    "budget_max": 18000.0
                }
            },
            {
                "email": "vikram.tech@example.com",
                "name": "Vikram Singhania",
                "age": 28,
                "gender": "Male",
                "occupation": "Cloud Solutions Architect",
                "city": "Pune, Maharashtra",
                "bio": "Cloud architect working remote. Super respectful of quiet hours, love tech discussions, gaming on weekends, and cooking North Indian curries.",
                "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
                "prefs": {
                    "sleep_schedule": "flexible",
                    "cleanliness_level": 4,
                    "smoking_status": "non_smoker",
                    "guest_frequency": "rarely",
                    "noise_tolerance": "moderate",
                    "dietary_pref": "any",
                    "work_routine": "remote",
                    "pet_tolerance": "friendly",
                    "budget_min": 12000.0,
                    "budget_max": 22000.0
                }
            },
            {
                "email": "ananya.r@example.com",
                "name": "Ananya Roy",
                "age": 24,
                "gender": "Female",
                "occupation": "Brand & Content Strategist",
                "city": "Pune, Maharashtra",
                "bio": "Passionate creative working in digital media. Love listening to indie acoustics, keeping houseplants, and weekend cafe hopping around Koregaon Park.",
                "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
                "prefs": {
                    "sleep_schedule": "night_owl",
                    "cleanliness_level": 4,
                    "smoking_status": "non_smoker",
                    "guest_frequency": "weekends",
                    "noise_tolerance": "moderate",
                    "dietary_pref": "any",
                    "work_routine": "hybrid",
                    "pet_tolerance": "has_pet",
                    "budget_min": 9500.0,
                    "budget_max": 16000.0
                }
            },
            {
                "email": "tanmay.p@example.com",
                "name": "Tanmay Pawar",
                "age": 27,
                "gender": "Male",
                "occupation": "Financial Risk Analyst",
                "city": "Pune, Maharashtra",
                "bio": "Finance professional working near Senapati Bapat Road. Early riser, fitness enthusiast, strictly punctual with rent and shared bills.",
                "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
                "prefs": {
                    "sleep_schedule": "early_bird",
                    "cleanliness_level": 5,
                    "smoking_status": "non_smoker",
                    "guest_frequency": "rarely",
                    "noise_tolerance": "quiet_strict",
                    "dietary_pref": "veg",
                    "work_routine": "on_site",
                    "pet_tolerance": "friendly",
                    "budget_min": 8500.0,
                    "budget_max": 14500.0
                }
            }
        ]

        created_users = 0
        for rm in new_roommates:
            existing = User.query.filter_by(email=rm["email"]).first()
            if not existing:
                u = User(email=rm["email"], role="seeker", is_verified=True, ai_consent_enabled=True)
                u.set_password("Password123!")
                db.session.add(u)
                db.session.flush()

                prof = Profile(
                    user_id=u.id,
                    full_name=rm["name"],
                    age=rm["age"],
                    gender=rm["gender"],
                    occupation=rm["occupation"],
                    city=rm["city"],
                    bio=rm["bio"],
                    avatar_url=rm["avatar_url"]
                )
                pref = RoommatePreference(user_id=u.id, **rm["prefs"])
                db.session.add_all([prof, pref])
                created_users += 1
                print(f"  [+] Created roommate: {rm['name']} ({rm['email']})")

        # -------------------------------------------------------------
        # 2. ADD NEW PROPERTIES & ROOMS IN PUNE
        # -------------------------------------------------------------
        host_user = User.query.filter_by(role="lister").first()
        if not host_user:
            host_user = User.query.filter_by(email="admin@roomilink.ai").first()

        new_listings = [
            {
                "title": "Riverside Green Balcony Room in Kalyani Nagar",
                "description": "Luxurious, fully furnished private room overlooking the Mula-Mutha river greenery. Includes high-speed Wi-Fi, air conditioning, daily maid service, and 24/7 security.",
                "address": "Waterfront Residences, Central Avenue, Kalyani Nagar",
                "city": "Pune",
                "neighborhood": "Kalyani Nagar",
                "property_type": "apartment",
                "room": {
                    "room_type": "private",
                    "rent_amount": 13800.0,
                    "deposit_amount": 25000.0,
                    "amenities": ["Air Conditioning", "High-Speed Wi-Fi", "In-Unit Laundry", "Balcony", "Power Backup", "Cook Available"],
                    "images": [
                        "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800",
                        "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800"
                    ]
                }
            },
            {
                "title": "Modern IT Suite near Pancard Club Road",
                "description": "Sunlit master bedroom with attached washroom in a premium gated society. Quick access to Balewadi High Street, Hinjewadi flyover, and Pune-Bangalore highway.",
                "address": "Pancard Club Road, Baner Hills",
                "city": "Pune",
                "neighborhood": "Baner",
                "property_type": "apartment",
                "room": {
                    "room_type": "master",
                    "rent_amount": 12000.0,
                    "deposit_amount": 24000.0,
                    "amenities": ["Private Bathroom", "Swimming Pool", "Gym", "High-Speed Wi-Fi", "Lift", "24/7 Security"],
                    "images": [
                        "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800",
                        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
                    ]
                }
            },
            {
                "title": "Peaceful Student Room near MIT College & Paud Road",
                "description": "Quiet, airy private room in an independent bungalow. Ideal for serious scholars, graduate researchers, or tech professionals seeking calm study hours.",
                "address": "Mayur Colony, Near Ideal Colony Ground, Kothrud",
                "city": "Pune",
                "neighborhood": "Kothrud",
                "property_type": "house",
                "room": {
                    "room_type": "private",
                    "rent_amount": 8900.0,
                    "deposit_amount": 15000.0,
                    "amenities": ["High-Speed Wi-Fi", "Study Desk & Chair", "Solar Water Heater", "2-Wheeler Parking", "RO Drinking Water"],
                    "images": [
                        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800",
                        "https://images.unsplash.com/photo-1540518614846-7ede433c4ef4?w=800"
                    ]
                }
            },
            {
                "title": "Smart Co-Living Space near Datta Mandir Chowk",
                "description": "Trendy flatshare in a lively society. Walking distance to supermarkets, gyms, and Hinjewadi company bus pickup spots. Shared fully-equipped modular kitchen.",
                "address": "Datta Mandir Road, Near Kaspate Corner, Wakad",
                "city": "Pune",
                "neighborhood": "Wakad",
                "property_type": "condo",
                "room": {
                    "room_type": "shared",
                    "rent_amount": 6800.0,
                    "deposit_amount": 12000.0,
                    "amenities": ["High-Speed Wi-Fi", "Washing Machine", "Modular Kitchen", "Refrigerator", "Power Backup", "Gym"],
                    "images": [
                        "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
                        "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800"
                    ]
                }
            }
        ]

        created_rooms = 0
        for item in new_listings:
            existing_p = Property.query.filter_by(title=item["title"]).first()
            if not existing_p:
                p = Property(
                    lister_id=host_user.id,
                    title=item["title"],
                    description=item["description"],
                    address=item["address"],
                    city=item["city"],
                    neighborhood=item["neighborhood"],
                    property_type=item["property_type"]
                )
                db.session.add(p)
                db.session.flush()

                r_data = item["room"]
                r = Room(
                    property_id=p.id,
                    room_type=r_data["room_type"],
                    rent_amount=r_data["rent_amount"],
                    deposit_amount=r_data["deposit_amount"],
                    is_available=True,
                    is_featured=True,
                    available_from="Immediate"
                )
                r.set_amenities(r_data["amenities"])
                r.set_images(r_data["images"])
                db.session.add(r)
                created_rooms += 1
                print(f"  [+] Created listing: {item['title']} (Rs {r_data['rent_amount']})")

        db.session.commit()
        print(f"\n[SUCCESS] Added {created_users} new roommates and {created_rooms} new room listings to the cloud database!")

if __name__ == "__main__":
    add_more_records()

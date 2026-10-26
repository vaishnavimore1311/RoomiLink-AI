-- ==============================================================
-- RoomiLink AI: Bulk Insert Sample Rooms & Roommates (TiDB Cloud)
-- Run this in your TiDB Cloud SQL Editor
-- ==============================================================

USE test;

-- 1. Insert Host User
INSERT INTO users (email, password_hash, role, is_active, is_verified, ai_consent_enabled)
VALUES ('anita.host@example.com', 'scrypt:32768:8:1$demo$default', 'lister', 1, 1, 1);
SET @host_id = LAST_INSERT_ID();

INSERT INTO profiles (user_id, full_name, age, gender, occupation, city, bio, avatar_url)
VALUES (@host_id, 'Anita Patil', 32, 'Female', 'Property Manager & Designer', 'Pune, Maharashtra', 'Managing furnished flats in Kalyani Nagar & Baner.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150');

-- 2. Insert Roommate Seeker (Neha Kulkarni)
INSERT INTO users (email, password_hash, role, is_active, is_verified, ai_consent_enabled)
VALUES ('neha.k@example.com', 'scrypt:32768:8:1$demo$default', 'seeker', 1, 1, 1);
SET @neha_id = LAST_INSERT_ID();

INSERT INTO profiles (user_id, full_name, age, gender, occupation, city, bio, avatar_url)
VALUES (@neha_id, 'Neha Kulkarni', 25, 'Female', 'Product Designer', 'Pune, Maharashtra', 'Product designer working at fintech startup. Love calm morning coffee and clean spaces.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150');

INSERT INTO roommate_preferences (user_id, sleep_schedule, cleanliness_level, smoking_status, guest_frequency, noise_tolerance, dietary_pref, work_routine, pet_tolerance, budget_min, budget_max)
VALUES (@neha_id, 'early_bird', 5, 'non_smoker', 'weekends', 'quiet_strict', 'veg', 'hybrid', 'friendly', 11000.0, 18000.0);

-- 3. Insert Roommate Seeker (Vikram Singhania)
INSERT INTO users (email, password_hash, role, is_active, is_verified, ai_consent_enabled)
VALUES ('vikram.tech@example.com', 'scrypt:32768:8:1$demo$default', 'seeker', 1, 1, 1);
SET @vikram_id = LAST_INSERT_ID();

INSERT INTO profiles (user_id, full_name, age, gender, occupation, city, bio, avatar_url)
VALUES (@vikram_id, 'Vikram Singhania', 28, 'Male', 'Cloud Solutions Architect', 'Pune, Maharashtra', 'Cloud architect working remote. Respectful of study hours and rent punctuality.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150');

INSERT INTO roommate_preferences (user_id, sleep_schedule, cleanliness_level, smoking_status, guest_frequency, noise_tolerance, dietary_pref, work_routine, pet_tolerance, budget_min, budget_max)
VALUES (@vikram_id, 'flexible', 4, 'non_smoker', 'rarely', 'moderate', 'any', 'remote', 'friendly', 12000.0, 22000.0);

-- 4. Insert Property & Room: Kalyani Nagar
INSERT INTO properties (lister_id, title, description, address, city, neighborhood, property_type)
VALUES (@host_id, 'Riverside Green Balcony Room in Kalyani Nagar', 'Luxurious private room overlooking river greenery. Includes high-speed Wi-Fi, AC, and daily maid service.', 'Waterfront Residences, Central Avenue', 'Pune', 'Kalyani Nagar', 'apartment');
SET @prop1_id = LAST_INSERT_ID();

INSERT INTO rooms (property_id, room_type, rent_amount, deposit_amount, is_available, is_featured, available_from, amenities, images)
VALUES (@prop1_id, 'private', 13800.0, 25000.0, 1, 1, 'Immediate', '["Air Conditioning", "High-Speed Wi-Fi", "In-Unit Laundry", "Balcony", "Power Backup"]', '["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800"]');

-- 5. Insert Property & Room: Baner
INSERT INTO properties (lister_id, title, description, address, city, neighborhood, property_type)
VALUES (@host_id, 'Modern IT Suite near Pancard Club Road', 'Sunlit master bedroom with attached washroom. Quick access to Balewadi High Street and highway.', 'Pancard Club Road, Baner Hills', 'Pune', 'Baner', 'apartment');
SET @prop2_id = LAST_INSERT_ID();

INSERT INTO rooms (property_id, room_type, rent_amount, deposit_amount, is_available, is_featured, available_from, amenities, images)
VALUES (@prop2_id, 'master', 12000.0, 24000.0, 1, 1, 'Immediate', '["Private Bathroom", "Swimming Pool", "Gym", "High-Speed Wi-Fi", "24/7 Security"]', '["https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800"]');

-- 6. Insert Property & Room: Kothrud
INSERT INTO properties (lister_id, title, description, address, city, neighborhood, property_type)
VALUES (@host_id, 'Peaceful Student Room near MIT College', 'Quiet, airy private room in an independent bungalow. Ideal for serious scholars or graduate researchers.', 'Mayur Colony, Near Ideal Colony Ground', 'Pune', 'Kothrud', 'house');
SET @prop3_id = LAST_INSERT_ID();

INSERT INTO rooms (property_id, room_type, rent_amount, deposit_amount, is_available, is_featured, available_from, amenities, images)
VALUES (@prop3_id, 'private', 8900.0, 15000.0, 1, 1, 'Immediate', '["High-Speed Wi-Fi", "Study Desk & Chair", "Solar Water Heater", "RO Drinking Water"]', '["https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800"]');

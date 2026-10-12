"""Roommate Compatibility Scoring Engine.

Implements multi-dimensional algorithmic matching across 8 lifestyle factors
and financial budgets to calculate a normalized 0-100% compatibility score,
accompanied by plain-English strengths and friction points.
"""

from typing import Dict, List, Tuple, Any, Optional
from app.models.user_models import User, RoommatePreference

WEIGHTS = {
    "cleanliness": 0.18,
    "noise": 0.18,
    "sleep": 0.16,
    "smoking": 0.14,
    "guests": 0.12,
    "budget": 0.10,
    "pets": 0.06,
    "work": 0.06,
}

SLEEP_SCORES = {
    ("early_bird", "early_bird"): 1.0,
    ("night_owl", "night_owl"): 1.0,
    ("flexible", "flexible"): 1.0,
    ("early_bird", "flexible"): 0.75,
    ("flexible", "early_bird"): 0.75,
    ("night_owl", "flexible"): 0.75,
    ("flexible", "night_owl"): 0.75,
    ("early_bird", "night_owl"): 0.20,
    ("night_owl", "early_bird"): 0.20,
}

NOISE_SCORES = {
    ("quiet_strict", "quiet_strict"): 1.0,
    ("moderate", "moderate"): 1.0,
    ("lively", "lively"): 1.0,
    ("quiet_strict", "moderate"): 0.70,
    ("moderate", "quiet_strict"): 0.70,
    ("moderate", "lively"): 0.70,
    ("lively", "moderate"): 0.70,
    ("quiet_strict", "lively"): 0.15,
    ("lively", "quiet_strict"): 0.15,
}

GUEST_SCORES = {
    ("rarely", "rarely"): 1.0,
    ("weekends", "weekends"): 1.0,
    ("frequent", "frequent"): 1.0,
    ("rarely", "weekends"): 0.70,
    ("weekends", "rarely"): 0.70,
    ("weekends", "frequent"): 0.70,
    ("frequent", "weekends"): 0.70,
    ("rarely", "frequent"): 0.20,
    ("frequent", "rarely"): 0.20,
}


def score_cleanliness(c1: int, c2: int) -> float:
    diff = abs(c1 - c2)
    if diff == 0:
        return 1.0
    if diff == 1:
        return 0.8
    if diff == 2:
        return 0.5
    if diff == 3:
        return 0.25
    return 0.1


def score_smoking(s1: str, s2: str) -> float:
    if s1 == "non_smoker" and s2 == "non_smoker":
        return 1.0
    if (s1 == "non_smoker" and s2 == "smoker") or (s1 == "smoker" and s2 == "non_smoker"):
        return 0.05
    if (s1 == "non_smoker" and s2 == "outside_only") or (s1 == "outside_only" and s2 == "non_smoker"):
        return 0.55
    return 0.9


def score_pets(p1: str, p2: str) -> float:
    if p1 == "allergic" and p2 == "has_pet":
        return 0.0
    if p2 == "allergic" and p1 == "has_pet":
        return 0.0
    if p1 == p2:
        return 1.0
    if "friendly" in (p1, p2):
        return 0.85
    return 0.6


def score_work(w1: str, w2: str) -> float:
    if w1 == w2:
        return 1.0
    if "night_shift" in (w1, w2) and ("remote" in (w1, w2) or "on_site" in (w1, w2)):
        return 0.4
    return 0.8


def score_budget(min1: float, max1: float, min2: float, max2: float) -> float:
    overlap_min = max(min1, min2)
    overlap_max = min(max1, max2)
    if overlap_max >= overlap_min:
        return 1.0
    gap = overlap_min - overlap_max
    if gap <= 150:
        return 0.75
    if gap <= 300:
        return 0.45
    return 0.15


def calculate_match_details(p1: RoommatePreference, p2: RoommatePreference) -> Dict[str, Any]:
    """Calculate normalized match score (0-100) and identify strengths & friction points."""
    clean_score = score_cleanliness(p1.cleanliness_level, p2.cleanliness_level)
    noise_score = NOISE_SCORES.get((p1.noise_tolerance, p2.noise_tolerance), 0.6)
    sleep_score = SLEEP_SCORES.get((p1.sleep_schedule, p2.sleep_schedule), 0.6)
    smoke_score = score_smoking(p1.smoking_status, p2.smoking_status)
    guest_score = GUEST_SCORES.get((p1.guest_frequency, p2.guest_frequency), 0.6)
    budget_score = score_budget(p1.budget_min, p1.budget_max, p2.budget_min, p2.budget_max)
    pet_score = score_pets(p1.pet_tolerance, p2.pet_tolerance)
    work_score = score_work(p1.work_routine, p2.work_routine)

    raw_score = (
        clean_score * WEIGHTS["cleanliness"] +
        noise_score * WEIGHTS["noise"] +
        sleep_score * WEIGHTS["sleep"] +
        smoke_score * WEIGHTS["smoking"] +
        guest_score * WEIGHTS["guests"] +
        budget_score * WEIGHTS["budget"] +
        pet_score * WEIGHTS["pets"] +
        work_score * WEIGHTS["work"]
    )

    percentage = round(raw_score * 100)
    percentage = max(10, min(99, percentage))

    strengths = []
    frictions = []

    # Cleanliness
    if clean_score >= 0.8:
        strengths.append(f"Aligned Cleanliness Standard: Both maintain similar tidiness habits (rating ~{p1.cleanliness_level}/5).")
    elif clean_score <= 0.4:
        frictions.append(f"Cleanliness Gap: Level {p1.cleanliness_level}/5 vs Level {p2.cleanliness_level}/5 may require clear chore agreements.")

    # Noise
    if noise_score >= 0.7:
        strengths.append(f"Compatible Noise Expectations: Comfortable with {p1.noise_tolerance.replace('_', ' ')} atmosphere.")
    elif noise_score <= 0.3:
        frictions.append(f"Sound Sensitivity: Quiet study preference contrasts with lively entertainment habits.")

    # Sleep
    if sleep_score >= 0.75:
        strengths.append(f"Harmonious Sleep Schedule: Aligned wake/sleep routines ({p1.sleep_schedule.replace('_', ' ')}).")
    elif sleep_score <= 0.3:
        frictions.append(f"Different Sleeping Hours: Early riser vs night owl may cause morning or late-night friction.")

    # Smoking
    if smoke_score >= 0.9:
        strengths.append(f"Mutual Smoking Preference: Both agree on {p1.smoking_status.replace('_', ' ')} home environment.")
    elif smoke_score <= 0.2:
        frictions.append("Major Smoking Discrepancy: Non-smoker paired with smoker.")

    # Guests
    if guest_score >= 0.7:
        strengths.append(f"Shared Social Boundaries: Compatible expectations regarding guest visits ({p1.guest_frequency}).")
    elif guest_score <= 0.3:
        frictions.append(f"Guest Policy Variance: Divergent comfort with having friends over ({p1.guest_frequency} vs {p2.guest_frequency}).")

    # Budget
    if budget_score >= 0.75:
        strengths.append(f"Synchronized Budget Range: Rental expectations align comfortably within financial ranges.")
    elif budget_score <= 0.3:
        frictions.append(f"Budget Spread: Discrepancy in monthly rental budgets may restrict shared apartment choices.")

    # Pets
    if pet_score == 0.0:
        frictions.append("Pet Allergy Conflict: Pet owner paired with someone allergic or seeking pet-free home.")
    elif pet_score >= 0.8:
        strengths.append("Pet Synergy: Mutual comfort regarding domestic pets.")

    # Ensure at least 2 strengths and 1 friction/caution point for realistic balance
    if len(strengths) < 2:
        strengths.append("Mutual Willingness: Shared platform interest in respectful shared living.")
    if len(frictions) == 0:
        frictions.append("Communication Nuances: Minor differences in daily routine easily solved by an agreement.")

    return {
        "score": percentage,
        "strengths": strengths,
        "frictions": frictions,
        "breakdown": {
            "cleanliness": round(clean_score * 100),
            "noise": round(noise_score * 100),
            "sleep": round(sleep_score * 100),
            "smoking": round(smoke_score * 100),
            "guests": round(guest_score * 100),
            "budget": round(budget_score * 100),
            "pets": round(pet_score * 100),
            "work": round(work_score * 100),
        }
    }

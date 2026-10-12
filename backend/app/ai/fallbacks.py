"""Deterministic Offline Fallback Engine for RoomiLink AI.

Generates structured living agreements deterministically when LLM API
is unavailable, offline, or times out.
"""

from typing import Dict, List, Any

def generate_fallback_agreement(household_name: str, members: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate rule-based living agreement customized to member preferences."""
    # Analyze preferences
    early_birds = sum(1 for m in members if m.get("preferences", {}).get("sleep_schedule") == "early_bird")
    strict_quiet = any(m.get("preferences", {}).get("noise_tolerance") == "quiet_strict" for m in members)
    cleanliness_vals = [m.get("preferences", {}).get("cleanliness_level", 3) for m in members]
    avg_clean = sum(cleanliness_vals) / len(cleanliness_vals) if cleanliness_vals else 3.0
    rare_guests = any(m.get("preferences", {}).get("guest_frequency") == "rarely" for m in members)

    # 1. Quiet Hours clause
    if strict_quiet or early_birds > 0:
        quiet_rule = "Designated quiet hours from 10:30 PM to 7:30 AM on weeknights, and 12:00 AM on weekends. Headphone use required for media after 11:00 PM."
        quiet_rationale = "Accommodates early sleepers and study needs while allowing weekend flexibility."
    else:
        quiet_rule = "General quiet hours begin at 11:30 PM weeknights and 1:00 AM weekends. Sound levels in common areas kept courteous at all hours."
        quiet_rationale = "Aligns with flexible student and young professional lifestyles."

    # 2. Guests clause
    if rare_guests:
        guest_rule = "Overnight guests permitted on weekends with at least 24 hours advance heads-up in the household group chat. Maximum 2 consecutive nights per visit."
        guest_rationale = "Protects personal sanctuary and privacy for flatmates sensitive to frequent visitors."
    else:
        guest_rule = "Guests welcome in shared areas with casual notice. Overnight visitors limited to 3 nights per week unless agreed upon in advance."
        guest_rationale = "Balances active social lives with equitable shared living boundaries."

    # 3. Cleanliness clause
    if avg_clean >= 3.8:
        clean_rule = "Sink-zero standard: Dishes must not sit in the sink longer than 6 hours. Wipe down counters and stove immediately after cooking. Weekly deep-clean rotation strictly maintained."
        clean_rationale = "Maintains the high cleanliness standard agreed upon by the majority of members."
    else:
        clean_rule = "Dishes to be loaded into the dishwasher or washed by the end of each evening. Common kitchen surfaces wiped down daily."
        clean_rationale = "Ensures hygienic common spaces with realistic everyday tolerance."

    # 4. Supplies & Expenses clause
    supplies_rule = "Shared essentials (paper towels, trash bags, dish soap, cooking oil) logged into RoomiLink AI Expense Splitter and split equally within 48 hours of purchase."
    supplies_rationale = "Prevents resentment over uncompensated staple household consumables."

    # 5. Notice & Conflict Resolution
    notice_rule = "Roommates agree to address friction directly within 48 hours using 'I' statements. A mandatory 30-day written notice is required prior to moving out or subletting."
    notice_rationale = "Provides financial predictability and encourages prompt, mature conflict resolution."

    clauses = [
        {
            "id": 1,
            "category": "Quiet Hours",
            "title": "Quiet Hours & Sound Standards",
            "content": quiet_rule,
            "rationale": quiet_rationale
        },
        {
            "id": 2,
            "category": "Guests",
            "title": "Overnight Guests & Social Boundaries",
            "content": guest_rule,
            "rationale": guest_rationale
        },
        {
            "id": 3,
            "category": "Cleanliness",
            "title": "Kitchen & Common Area Tidiness",
            "content": clean_rule,
            "rationale": clean_rationale
        },
        {
            "id": 4,
            "category": "Supplies",
            "title": "Shared Consumables & Expense Splitting",
            "content": supplies_rule,
            "rationale": supplies_rationale
        },
        {
            "id": 5,
            "category": "Notice",
            "title": "Notice Period & Constructive Resolution",
            "content": notice_rule,
            "rationale": notice_rationale
        }
    ]

    return {
        "title": f"{household_name} Living Agreement",
        "summary": f"Customized 5-clause living compact synthesized for {len(members)} roommates to balance privacy, social harmony, and shared responsibilities.",
        "version": "1.0",
        "generated_via": "deterministic_engine",
        "clauses": clauses
    }

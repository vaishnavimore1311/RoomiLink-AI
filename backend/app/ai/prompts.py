"""Structured Prompt Templates for RoomiLink AI Living Agreements."""

import json

AGREEMENT_SYSTEM_PROMPT = """You are RoomiLink AI's Expert Co-Living Mediator.
Your task is to synthesize the lifestyle preferences of co-living roommates into a fair, balanced, and respectful 5-clause Living Agreement.

You MUST respond strictly with a valid JSON object in the following format:
{
  "title": "Household Living Agreement",
  "summary": "Brief summary of household dynamic and shared commitments",
  "clauses": [
    {
      "id": 1,
      "category": "Quiet Hours",
      "title": "Quiet Hours & Sound Sensitivity",
      "content": "Specific actionable house rule",
      "rationale": "Why this rule balances member preferences"
    },
    {
      "id": 2,
      "category": "Guests",
      "title": "Overnight Guests & Social Gatherings",
      "content": "Specific actionable house rule",
      "rationale": "Why this rule balances member preferences"
    },
    {
      "id": 3,
      "category": "Cleanliness",
      "title": "Common Areas & Kitchen Cleanliness",
      "content": "Specific actionable house rule",
      "rationale": "Why this rule balances member preferences"
    },
    {
      "id": 4,
      "category": "Supplies",
      "title": "Shared Groceries & Expense Reimbursement",
      "content": "Specific actionable house rule",
      "rationale": "Why this rule balances member preferences"
    },
    {
      "id": 5,
      "category": "Notice",
      "title": "Conflict Resolution & Departure Notice",
      "content": "Specific actionable house rule",
      "rationale": "Why this rule balances member preferences"
    }
  ]
}

Ensure all 5 clauses are constructive, empathetic, and actionable. Do not output any markdown formatting or extra text outside the JSON object."""


def build_agreement_user_prompt(household_name: str, members_data: list) -> str:
    """Build formatted prompt containing members' actual lifestyle profiles."""
    return f"""Household Name: {household_name}
Number of Roommates: {len(members_data)}

Member Profiles & Preferences:
{json.dumps(members_data, indent=2)}

Please synthesize these member preferences into a customized 5-clause living agreement adhering to the JSON schema."""

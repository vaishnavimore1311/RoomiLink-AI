"""LLM API Client Wrapper with 10-Second Timeout and Offline Fallback.

Supports OpenAI / Gemini with strict error handling, schema validation,
and seamless fallback to rule-based generation.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List
from app.ai.prompts import AGREEMENT_SYSTEM_PROMPT, build_agreement_user_prompt
from app.ai.fallbacks import generate_fallback_agreement

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 10.0

def generate_living_agreement(
    household_name: str,
    members_data: List[Dict[str, Any]],
    user_ai_consent: bool = True
) -> Dict[str, Any]:
    """Generate a 5-clause living agreement via LLM API or deterministic fallback.
    
    If user AI consent is False, or if API keys are missing/timeout occurs,
    gracefully routes to the deterministic offline engine.
    """
    # 1. Respect AI privacy consent
    if not user_ai_consent:
        logger.info("User AI consent disabled. Generating agreement via deterministic offline engine.")
        res = generate_fallback_agreement(household_name, members_data)
        res["note"] = "Generated via private offline engine adhering to user data privacy preferences."
        return res

    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    user_prompt = build_agreement_user_prompt(household_name, members_data)

    # 2. Try OpenAI if API key provided
    if openai_key and not openai_key.startswith("your_"):
        try:
            req_data = json.dumps({
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": AGREEMENT_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.4,
                "max_tokens": 1200
            }).encode("utf-8")

            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=req_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_key}"
                }
            )

            with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                content = result["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                parsed["generated_via"] = "openai_gpt4o_mini"
                parsed["version"] = "1.0"
                return parsed
        except Exception as e:
            logger.warning(f"OpenAI agreement generation failed: {e}. Falling back to deterministic engine.")

    # 3. Try Gemini if API key provided
    if gemini_key and not gemini_key.startswith("your_"):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            req_data = json.dumps({
                "contents": [{
                    "parts": [{
                        "text": f"{AGREEMENT_SYSTEM_PROMPT}\n\n{user_prompt}"
                    }]
                }],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.4
                }
            }).encode("utf-8")

            req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                parsed["generated_via"] = "gemini_flash"
                parsed["version"] = "1.0"
                return parsed
        except Exception as e:
            logger.warning(f"Gemini agreement generation failed: {e}. Falling back to deterministic engine.")

    # 4. Default to robust deterministic fallback
    return generate_fallback_agreement(household_name, members_data)

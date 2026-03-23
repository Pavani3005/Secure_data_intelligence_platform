import os
import re
import json
import logging
from typing import Optional
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)
_MODEL = "llama-3.1-8b-instant"

# Configure Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Fallback returned when either AI pass fails
_FALLBACK = {
    "summary": "Log analysis complete. Manual review recommended.",
    "anomalies": ["Could not parse AI response. Check logs manually."],
    "recommendations": ["Review log file for sensitive data exposure."],
    "risk_explanation": "Risk level was assigned based on regex rule matches alone.",
    "threat_classification": "Clean",
    "ai_only_findings": [],
}


def _call_groq(prompt: str, label: str) -> str:
    """Send a prompt to Groq and return the content."""
    completion = client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    text = completion.choices[0].message.content.strip()
    logger.debug("GROQ [%s] raw response: %r", label, text[:500])
    return text


def extract_json(text: str) -> dict:
    """
    Robustly extract and parse the first JSON object from a Groq response.

    Attempts (in order):
    1. Direct json.loads — succeeds when response_mime_type forces clean JSON.
    2. Strip markdown code fences via regex.
    3. Pull out the first {…} block with a DOTALL regex.
    4. Fix trailing commas before giving up.
    Raises ValueError with a snippet of the raw text if all attempts fail.
    """
    # 1. Direct parse — fastest path
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Strip ```json … ``` or ``` … ``` fences
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        pass

    # 3. Grab first { … } block (handles leading/trailing prose)
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        candidate = match.group(0)
        # 4. Fix trailing commas before } or ]
        candidate = re.sub(r',\s*([}\]])', r'\1', candidate)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from Gemini response: {text[:300]!r}")


def get_insights(log_text: str, findings: list) -> dict:
    """
    Two-pass AI analysis using Groq (Llama 3).

    Pass 1 — Independent AI detection (no regex bias).
    Pass 2 — Correlation of regex findings + pass-1 results.

    Returns a dict with: summary, anomalies, recommendations,
    risk_explanation, threat_classification, ai_only_findings.
    """
    lines = log_text.split('\n')
    log_snippet = '\n'.join(lines[:100])
    findings_json = json.dumps(findings, indent=2)

    # ── Pass 1: independent AI detection ─────────────────────────
    pass1_prompt = f"""You are a senior cybersecurity analyst. Analyze the following log content for confirmed security threats.

LOG CONTENT:
{log_snippet}

INSTRUCTIONS:
1. Identify only high-confidence security threats (active attacks, clear credential theft, critical data leaks).
2. Ignore standard system logs, debug messages, and benign database queries.
3. If the log appears safe or contains only informational text, return an empty list.
4. Do not speculate. Only report threats explicitly visible in the text.

RESPONSE FORMAT (JSON ONLY):
{{
    "ai_detected": [
        {{
            "description": "Clear description of the confirmed threat",
            "line_hint": "Exact text snippet from log",
            "severity": "low/medium/high/critical"
        }}
    ]
}}"""

    ai_detected = []
    raw1 = ""
    try:
        raw1 = _call_groq(pass1_prompt, "PASS-1")
        parsed1 = extract_json(raw1)
        ai_detected = parsed1.get("ai_detected", [])
    except Exception as e:
        logger.error("PASS-1 failed (%s: %s) | raw=%r", type(e).__name__, e, raw1[:300])
        # Non-fatal: continue to pass 2 with empty ai_detected

    # ── Short-circuit: If no findings from either source, return Clean immediately ──
    if not findings and not ai_detected:
        return {
            "summary": "No security threats detected.",
            "anomalies": [],
            "recommendations": [],
            "risk_explanation": "No risks identified by regex rules or AI analysis.",
            "threat_classification": "Clean",
            "ai_only_findings": []
        }

    # ── Pass 2: correlation analysis ─────────────────────────────
    ai_detected_json = json.dumps(ai_detected, indent=2)

    pass2_prompt = f"""You are a cybersecurity expert. Validate and summarize the security findings below.

Regex Findings (Rule-based):
{findings_json}

AI Findings (Pattern-based):
{ai_detected_json}

INSTRUCTIONS:
- Correlate the findings to determine the true security posture.
- If no critical threats are found in the lists above, classification must be "Clean".
- Do not hallucinate risks that are not present in the findings.

RESPONSE FORMAT (JSON ONLY):
{{
  "summary": "Brief, factual summary of the security analysis.",
  "anomalies": ["List of confirmed anomalies based on the findings."],
  "recommendations": ["List of specific security fixes."],
  "risk_explanation": "Justification for the risk score.",
  "threat_classification": "One of: Credential Exposure, Active Intrusion Attempt, Data Leak, System Error Leak, Clean"
}}"""

    raw2 = ""
    try:
        raw2 = _call_groq(pass2_prompt, "PASS-2")
        pass2 = extract_json(raw2)

        required = ["summary", "anomalies", "recommendations",
                    "risk_explanation", "threat_classification"]
        if not all(k in pass2 for k in required):
            raise ValueError(f"Pass-2 response missing keys: {[k for k in required if k not in pass2]}")

        # Normalise threat_classification to one of the 5 allowed values
        valid_tc = {"Credential Exposure", "Active Intrusion Attempt",
                    "Data Leak", "System Error Leak", "Clean"}
        tc = pass2.get("threat_classification", "Clean")
        if tc not in valid_tc:
            tc = "Clean"

        return {
            "summary":               pass2["summary"],
            "anomalies":             pass2["anomalies"],
            "recommendations":       pass2["recommendations"],
            "risk_explanation":      pass2["risk_explanation"],
            "threat_classification": tc,
            "ai_only_findings":      ai_detected,
        }

    except Exception as e:
        logger.error("PASS-2 failed (%s: %s) | raw=%r", type(e).__name__, e, raw2[:300])
        fallback = dict(_FALLBACK)
        fallback["ai_only_findings"] = ai_detected  # preserve pass-1 results if available
        return fallback

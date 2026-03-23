from fastapi import APIRouter, Form, UploadFile, File, Request
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.utils.input_parser import parse_input
from app.services.log_analyzer import LogAnalyzer
from app.services.ai_insights import get_insights
from app.services.risk_engine import RiskEngine
from app.services.policy_engine import PolicyEngine

router = APIRouter()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@router.post("/analyze")
@limiter.limit("20/minute")
async def analyze_content(
    request: Request,
    input_type: str = Form(...),
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    mask: bool = Form(True),
    block_high_risk: bool = Form(False),
    log_analysis: bool = Form(True)
):
    """
    Analyze content for sensitive data and security risks.

    Args:
        input_type: Type of input ("text", "chat", "sql", "log", "file")
        content: Text content (optional)
        file: Uploaded file (optional)
        mask: Whether to mask sensitive values in response
        block_high_risk: Whether to block high-risk content
        log_analysis: Whether to log this analysis

    Returns:
        Analysis results with findings, risk score, and AI insights
    """
    print("=== /analyze endpoint hit ===")
    print(f"input_type: {input_type}")

    # Read file bytes if a file was uploaded
    file_bytes = None
    filename = None
    if file:
        file_bytes = await file.read()
        filename = file.filename

    # Parse input to get plain text
    text = parse_input(
        input_type=input_type,
        content=content,
        file_bytes=file_bytes,
        filename=filename
    )

    # Analyze the text for security findings
    analyzer = LogAnalyzer()
    findings = analyzer.analyze(text)

    # Get AI-powered insights
    print("=== calling get_insights ===")
    insights = get_insights(text, findings)
    print(f"=== insights returned: {insights} ===")

    # Calculate risk score and level
    risk_engine = RiskEngine()
    risk_result = risk_engine.calculate(findings)
    risk_score = risk_result["risk_score"]
    risk_level = risk_result["risk_level"]
    risk_color = risk_result["risk_color"]

    # Apply security policies
    policy_engine = PolicyEngine()
    policy_options = {
        "mask": mask,
        "block_high_risk": block_high_risk
    }
    policy_result = policy_engine.apply(findings, risk_level, policy_options)

    # Build response
    response = {
        "summary": insights["summary"],
        "content_type": input_type,
        "extracted_text": text,
        "findings": policy_result["findings"],
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "action": policy_result["action"],
        "blocked": policy_result["blocked"],
        "risk_explanation":      insights.get("risk_explanation", ""),
        "threat_classification": insights.get("threat_classification", "Clean"),
        "ai_only_findings":      insights.get("ai_only_findings", []),
        "insights": {
            "summary":               insights["summary"],
            "anomalies":             insights["anomalies"],
            "recommendations":       insights["recommendations"],
            "risk_explanation":      insights.get("risk_explanation", ""),
            "threat_classification": insights.get("threat_classification", "Clean"),
        }
    }

    return response

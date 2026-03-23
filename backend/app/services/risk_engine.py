class RiskEngine:
    def calculate(self, findings: list) -> dict:
        """
        Calculate risk score and level from findings.
        
        Args:
            findings: List of finding dicts with 'risk' field
        
        Returns:
            Dict with risk_score, risk_level, and risk_color
        """
        # Define score mapping per risk level
        risk_scores = {
            "critical": 5,
            "high": 3,
            "medium": 2,
            "low": 1
        }
        
        # Calculate total risk score
        risk_score = 0
        for finding in findings:
            risk = finding.get("risk", "low")
            risk_score += risk_scores.get(risk, 0)
        
        # Determine risk level from score
        if risk_score >= 10:
            risk_level = "critical"
        elif risk_score >= 5:
            risk_level = "high"
        elif risk_score >= 2:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Map risk level to color
        risk_colors = {
            "critical": "#cc0000",
            "high": "#ff6600",
            "medium": "#ffcc00",
            "low": "#00cc44"
        }
        risk_color = risk_colors.get(risk_level, "#00cc44")
        
        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_color": risk_color
        }

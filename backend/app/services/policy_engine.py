class PolicyEngine:
    def apply(self, findings: list, risk_level: str, options: dict) -> dict:
        """
        Apply security policies to findings.
        
        Args:
            findings: List of finding dicts
            risk_level: Overall risk level ("low", "medium", "high", "critical")
            options: Dict with policy options (mask, block_high_risk)
        
        Returns:
            Dict with action, findings, and blocked status
        """
        # Read options
        mask = options.get("mask", False)
        block_high_risk = options.get("block_high_risk", False)
        
        # Check if should block
        if block_high_risk and risk_level in ["high", "critical"]:
            return {
                "action": "blocked",
                "findings": [],
                "blocked": True
            }
        
        # Process findings
        processed_findings = findings.copy()
        
        # Mask sensitive values if requested
        if mask:
            processed_findings = []
            for finding in findings:
                masked_finding = finding.copy()
                masked_finding["value"] = "****"
                processed_findings.append(masked_finding)
        
        # Return result
        return {
            "action": "masked" if mask else "allowed",
            "findings": processed_findings,
            "blocked": False
        }

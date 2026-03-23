import re
from app.core.patterns import PATTERNS


class LogAnalyzer:
    def analyze(self, log_text: str):
        findings = []
        lines = log_text.split('\n')
        failed_login_count = 0
        
        # Process each line with its line number
        for line_number, line in enumerate(lines, start=1):
            # Check for brute force indicators
            if re.search(r'failed login|authentication failed', line, re.IGNORECASE):
                failed_login_count += 1
            
            # Run each pattern on the line
            for pattern_config in PATTERNS:
                matches = re.finditer(pattern_config["pattern"], line)
                for match in matches:
                    findings.append({
                        "type": pattern_config["name"],
                        "value": match.group(0),
                        "line": line_number,
                        "risk": pattern_config["risk_level"]
                    })
        
        # Check for brute force (3 or more failed attempts)
        if failed_login_count >= 3:
            findings.append({
                "type": "brute_force",
                "value": f"{failed_login_count} failed attempts",
                "line": 0,
                "risk": "high"
            })
        
        return findings

"""
Regex patterns for log analysis with associated risk levels.
"""

PATTERNS = [
    {
        "name": "EMAIL",
        "pattern": r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        "risk_level": "low"
    },
    {
        "name": "PHONE",
        "pattern": r'\+?[0-9]{10,13}',
        "risk_level": "low"
    },
    {
        "name": "API_KEY",
        "pattern": r'(sk-|api_key=|apikey=|API_KEY=)[a-zA-Z0-9\-_]{10,}',
        "risk_level": "high"
    },
    {
        "name": "PASSWORD",
        "pattern": r'(password=|passwd=|pwd=|PASSWORD=)\S+',
        "risk_level": "critical"
    },
    {
        "name": "TOKEN",
        "pattern": r'(token=|bearer |Bearer )[a-zA-Z0-9\-_.]{10,}',
        "risk_level": "high"
    },
    {
        "name": "STACK_TRACE",
        "pattern": r'(Exception|Error|Traceback|at \w+\.\w+:\d+)',
        "risk_level": "medium"
    },
    {
        "name": "SUSPICIOUS_IP",
        "pattern": r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
        "risk_level": "low"
    },
]

REGRESSION TEST FILES
=====================

File                      | What it tests               | Expected risk_level
--------------------------|-----------------------------|-----------------------
test_password.log         | Password detection          | critical
test_apikeys.log          | API key detection           | high
test_tokens.log           | Token detection             | high
test_bruteforce.log       | Brute force + IP detection  | high
test_stacktrace.log       | Stack trace detection       | high
test_emails_phones.log    | Email + phone detection     | medium
test_clean.log            | No findings / clean log     | low
test_mixed_critical.log   | All finding types combined  | critical (main demo file)

HOW TO TEST (PowerShell)
========================
curl.exe -X POST http://localhost:8000/analyze `
  -F "input_type=log" `
  -F "content=$(Get-Content test_password.log -Raw)" `
  -F "mask=true" `
  -F "block_high_risk=false"

EXTRA INPUT TYPE TESTS (paste directly in terminal)
====================================================
# Plain text - expect 0 findings
curl.exe -X POST http://localhost:8000/analyze -F "input_type=text" -F "content=hello world nothing suspicious" -F "mask=true" -F "block_high_risk=false"

# SQL input - expect password + api_key findings
curl.exe -X POST http://localhost:8000/analyze -F "input_type=sql" -F "content=SELECT * FROM users WHERE password=admin123 AND api_key=sk-test-abc123xyz" -F "mask=true" -F "block_high_risk=false"

# Block high risk - expect blocked=true, empty findings
curl.exe -X POST http://localhost:8000/analyze -F "input_type=text" -F "content=password=secret123 api_key=sk-abc123" -F "mask=true" -F "block_high_risk=true"

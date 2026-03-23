INPUT TYPE TEST FILES
=====================

Files included:
- test_document.txt   → for TXT file upload test
- test_document.pdf   → for PDF file upload test
- test_document.docx  → for DOCX file upload test
- test_chat.txt       → reference content for chat input test

All files contain the same sensitive data so you can compare outputs across input types.

=====================
CURL COMMANDS (run from /backend folder in PowerShell)
=====================

1. TEXT INPUT
-------------
curl.exe -X POST http://localhost:8000/analyze `
  -F "input_type=text" `
  -F "content=password=secret123 api_key=sk-abc123xyz hello world" `
  -F "mask=true" `
  -F "block_high_risk=false"
Expected: password (critical) + api_key (high) findings

2. TXT FILE UPLOAD
------------------
curl.exe -X POST http://localhost:8000/analyze `
  -F "input_type=file" `
  -F "file=@test_files/test_document.txt" `
  -F "mask=true" `
  -F "block_high_risk=false"
Expected: password, api_key, email, phone findings

3. PDF FILE UPLOAD
------------------
curl.exe -X POST http://localhost:8000/analyze `
  -F "input_type=file" `
  -F "file=@test_files/test_document.pdf" `
  -F "mask=true" `
  -F "block_high_risk=false"
Expected: same findings as TXT test

4. DOCX FILE UPLOAD
-------------------
curl.exe -X POST http://localhost:8000/analyze `
  -F "input_type=file" `
  -F "file=@test_files/test_document.docx" `
  -F "mask=true" `
  -F "block_high_risk=false"
Expected: same findings as TXT test

5. LOG FILE UPLOAD
------------------
curl.exe -X POST http://localhost:8000/analyze `
  -F "input_type=log" `
  -F "file=@test_logs/test_mixed_critical.log" `
  -F "mask=true" `
  -F "block_high_risk=false"
Expected: all finding types, risk_level critical

6. SQL INPUT
------------
curl.exe -X POST http://localhost:8000/analyze `
  -F "input_type=sql" `
  -F "content=SELECT * FROM users WHERE password=admin123 AND api_key=sk-test-abc123xyz AND email=admin@company.com" `
  -F "mask=true" `
  -F "block_high_risk=false"
Expected: password, api_key, email findings

7. CHAT INPUT
-------------
curl.exe -X POST http://localhost:8000/analyze `
  -F "input_type=chat" `
  -F "content=hey can you help me my password=mypass123 isnt working and my token=eyJhbGciOiJIUzI1NiJ9 expired" `
  -F "mask=true" `
  -F "block_high_risk=false"
Expected: password (critical) + token (high) findings

8. BLOCK HIGH RISK TEST
-----------------------
curl.exe -X POST http://localhost:8000/analyze `
  -F "input_type=text" `
  -F "content=password=secret123 api_key=sk-abc123" `
  -F "mask=true" `
  -F "block_high_risk=true"
Expected: blocked=true, empty findings, action=blocked

=====================
IF PDF OR DOCX RETURNS 0 FINDINGS
=====================
Tell Copilot:
"The /analyze endpoint is not correctly extracting text from uploaded PDF and DOCX files.
In input_parser.py, fix the file parsing so that:
- For .pdf files: use PyMuPDF (fitz) to open from BytesIO and extract text from all pages
- For .docx files: use python-docx to open from BytesIO and extract all paragraph text
- For .txt and .log files: decode bytes as utf-8
Make sure the file bytes are being passed correctly from routes.py to parse_input()"

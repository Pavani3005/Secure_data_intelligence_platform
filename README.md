# 🛡️ AI Secure Data Intelligence Platform

An AI-powered security platform that scans logs, text, and SQL queries for sensitive data exposure, calculates risk scores, and provides intelligent insights using Groq AI (Llama 3). The platform detects passwords, API keys, tokens, emails, phone numbers, IP addresses, and brute force attempts, then applies security policies like data masking and high-risk content blocking.

## 🚀 Tech Stack

**Backend:**
- FastAPI - Modern Python web framework
- Groq AI - Ultra-fast AI inference
- PyMuPDF & python-docx - Document parsing
- SlowAPI - Rate limiting (20 req/min)
- Pydantic - Data validation

**Frontend:**
- React + Vite - Fast modern UI framework
- Axios - HTTP client
- React Dropzone - Drag-and-drop file uploads
- Responsive CSS - Mobile-friendly design

**Core Services:**
- Pattern Engine - Regex-based sensitive data detection
- Risk Engine - Score calculation and risk leveling
- Policy Engine - Data masking and blocking policies
- Log Analyzer - Multi-line pattern detection
- AI Insights - Anomaly detection and recommendations

## 📦 Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- Groq API Key ([Get one here](https://console.groq.com/keys))

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=your_api_key_here" > .env

# Run the server
uvicorn main:app --reload
```

Backend will run at: **http://localhost:8000**

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env

# Run the dev server
npm run dev
```

Frontend will run at: **http://localhost:5173**

## 🔑 Environment Variables

### Backend (.env)
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## 🧪 Testing the API

### Sample cURL Command

```bash
curl -X POST http://localhost:8000/analyze \
  -F "input_type=text" \
  -F "content=password=secret123 api_key=sk-abc123xyz" \
  -F "mask=true" \
  -F "block_high_risk=false"
```

### Using the Test Log File

```bash
curl -X POST http://localhost:8000/analyze \
  -F "input_type=file" \
  -F "file=@backend/test_logs/app.log" \
  -F "mask=true" \
  -F "block_high_risk=false"
```

### Expected Response

```json
{
  "summary": "AI-generated summary of findings",
  "content_type": "text",
  "findings": [
    {
      "type": "PASSWORD",
      "value": "****",
      "line": 1,
      "risk": "critical"
    },
    {
      "type": "API_KEY",
      "value": "****",
      "line": 1,
      "risk": "high"
    }
  ],
  "risk_score": 8,
  "risk_level": "high",
  "risk_color": "#ff6600",
  "action": "masked",
  "blocked": false,
  "insights": {
    "summary": "...",
    "anomalies": ["..."],
    "recommendations": ["..."]
  }
}
```

## 🎨 Risk Levels & Colors

| Risk Level | Score Range | Color | Hex Code |
|------------|-------------|-------|----------|
| **Critical** | 10+ | 🔴 Red | `#cc0000` |
| **High** | 5-9 | 🟠 Orange | `#ff6600` |
| **Medium** | 2-4 | 🟡 Yellow | `#ffcc00` |
| **Low** | 0-1 | 🟢 Green | `#00cc44` |

## 🔍 Detected Patterns

- **Passwords** - `password=...`, `pwd=...`, etc. (Critical)
- **API Keys** - `api_key=...`, `apikey=...`, `sk-...` (High)
- **JWT Tokens** - `eyJ...` format (High)
- **Emails** - Standard email format (Medium)
- **Phone Numbers** - International format (Medium)
- **IP Addresses** - IPv4 format (Low)
- **Credit Cards** - 13-19 digit patterns (Critical)
- **Brute Force** - 3+ failed login attempts (High)

## 🌐 API Endpoints

### `GET /`
Health check endpoint
```bash
curl http://localhost:8000/
```

### `POST /analyze`
Main analysis endpoint

**Parameters:**
- `input_type` (required): "text", "chat", "sql", "log", or "file"
- `content` (optional): Text content to analyze
- `file` (optional): File upload
- `mask` (optional, default: true): Mask sensitive values
- `block_high_risk` (optional, default: false): Block high-risk content
- `log_analysis` (optional, default: true): Enable logging

## 📊 Features

✅ **Multi-format Support** - Text, SQL, logs, PDF, DOCX  
✅ **AI-Powered Insights** - Anomaly detection via Gemini  
✅ **Pattern Detection** - 10+ sensitive data types  
✅ **Risk Scoring** - Automated risk calculation  
✅ **Policy Engine** - Data masking & blocking  
✅ **Rate Limiting** - 20 requests/minute per IP  
✅ **Request Logging** - Audit trail in `requests.log`  
✅ **Responsive UI** - Mobile & desktop friendly  
✅ **Drag & Drop** - Easy file uploads  

## 📸 Screenshots

### Main Dashboard
![Dashboard](screenshots/dashboard.png)

### Analysis Results
![Results](screenshots/results.png)

### Log Viewer
![Log Viewer](screenshots/log-viewer.png)

## 📝 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using FastAPI, React, and Google Gemini AI

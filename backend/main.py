from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router, limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import uvicorn
import json
from datetime import datetime

app = FastAPI(title="AI Secure Data Intelligence Platform")

# Add rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware (allowing all origins for demo purposes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request to requests.log file."""
    response = await call_next(request)
    
    # Only log /analyze endpoint requests
    if request.url.path == "/analyze":
        try:
            # Extract request data (this will be available in request state if needed)
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "path": request.url.path,
                "method": request.method,
                "client_ip": request.client.host if request.client else "unknown",
                "status_code": response.status_code
            }
            
            # Write to requests.log
            with open("requests.log", "a", encoding="utf-8") as log_file:
                log_file.write(json.dumps(log_entry) + "\n")
        except Exception:
            # Don't fail request if logging fails
            pass
    
    return response


# Include API routes
app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "AI Secure Data Intelligence Platform API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

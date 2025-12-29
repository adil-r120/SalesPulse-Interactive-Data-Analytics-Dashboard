"""
SalesPulse Backend API
======================

This is the central entry point for the SalesPulse application.
It orchestrates:
1.  **Authentication**: Secure JWT access.
2.  **Analytics**: Aggregated sales data processing.
3.  **AI Integration**: Real-time RAG (Retrieval-Augmented Generation) chat.
4.  **Database**: Lifecycle management for SQLite.

Built with FastAPI for high-performance async processing.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.limiter import limiter

# Load environment variables
load_dotenv()

# Import database initialization
from database import init_db, SessionLocal
from models import User

# Import routes
from routes import auth, analytics, insights, reports, chat, stock_feedback, admin, notifications

def check_database_status():
    """Check database connection and status"""
    try:
        db = SessionLocal()
        user_count = db.query(User).count()
        print(f"Database connection successful. Found {user_count} users in database.")
        db.close()
        return True
    except Exception as e:
        print(f"Database connection error: {e}")
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("Starting SalesPulse Backend...")
    
    try:
        # Initialize database (create tables and sample data)
        init_db()
        print("Database initialized successfully")
        
        # Check status
        print("Checking database status...")
        if check_database_status():
            print("Database connection verified")
        else:
            print("Warning: Database connection check failed after initialization")
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        
    print("SalesPulse Backend is ready!")
    
    yield
    
    # Shutdown
    print("Shutting down SalesPulse Backend...")

# Create FastAPI app
app = FastAPI(
    title="SalesPulse Backend",
    description="AI-Powered Business Analytics API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Set to False when using wildcard
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)

# Include routers
app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(insights.router)
app.include_router(reports.router, prefix="/api/reports")
app.include_router(chat.router)
app.include_router(stock_feedback.router)
app.include_router(admin.router)
app.include_router(notifications.router)
from fastapi.staticfiles import StaticFiles
os.makedirs("static/avatars", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "SalesPulse Backend API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "JWT Authentication",
            "Sales Analytics",
            "AI-Powered Insights",
            "Business Reports",
            "Goal Tracking",
            "Google API Integration",
            "AI Chat Assistant"
        ]
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "1.0.0"
    }

# API status endpoint
@app.get("/api/status")
async def api_status():
    """API status and configuration"""
    return {
        "api_version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "features_enabled": {
            "ai_insights": bool(os.getenv("GEMINI_API_KEY") or os.getenv("OPENROUTER_API_KEY")),
            "google_news": bool(os.getenv("GOOGLE_API_KEY") and os.getenv("GOOGLE_CSE_ID")),
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "redis_cache": bool(os.getenv("REDIS_URL"))
        },
        "endpoints": {
            "authentication": "/auth",
            "analytics": "/api",
            "ai_insights": "/api/insights",
            "reports": "/api/reports",
            "goals": "/api/goals",
            "chat": "/api/chat"
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    
    print(f"Starting server on {host}:{port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print(f"Auto-reload: {reload}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )

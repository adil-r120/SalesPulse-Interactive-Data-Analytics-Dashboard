from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, AIInsight, ChatMessage
from utils.auth import get_current_active_user
from utils.ai_utils import ai_insights

router = APIRouter(prefix="/api", tags=["ai-insights"])

# Pydantic models
class InsightRequest(BaseModel):
    query: str

class InsightResponse(BaseModel):
    id: str
    query: str
    insight: str
    sentiment: str
    source: str
    created_at: str
    
    model_config = {"from_attributes": True}

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    id: str
    message: str
    response: str
    message_type: str
    created_at: str
    
    model_config = {"from_attributes": True}

class ChatHistoryResponse(BaseModel):
    messages: List[ChatResponse]
    total_count: int

@router.post("/insights", response_model=InsightResponse)
async def generate_insight(
    request: InsightRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate AI-powered business insight"""
    
    try:
        # Get current sales data for context
        from sqlalchemy import func
        from models import SalesRecord
        
        sales_summary = db.query(
            func.sum(SalesRecord.total).label('total_revenue'),
            func.count(SalesRecord.id).label('total_sales'),
            func.avg(SalesRecord.total).label('avg_order_value')
        ).filter(SalesRecord.user_id == current_user.id).first()
        
        sales_data = {
            "total_revenue": float(sales_summary.total_revenue or 0),
            "total_sales": int(sales_summary.total_sales or 0),
            "avg_order_value": float(sales_summary.avg_order_value or 0)
        }
        
        # Generate insight using AI
        ai_result = ai_insights.generate_insight(request.query, sales_data)
        
        # Save insight to database
        db_insight = AIInsight(
            query=request.query,
            insight=ai_result["insight"],
            sentiment=ai_result["sentiment"],
            source=ai_result["source"],
            user_id=current_user.id
        )
        
        db.add(db_insight)
        db.commit()
        db.refresh(db_insight)
        
        return InsightResponse.model_validate(db_insight)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating insight: {str(e)}")

@router.get("/insights", response_model=List[InsightResponse])
async def get_insights(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get recent AI insights for the user"""
    
    insights = db.query(AIInsight).filter(
        AIInsight.user_id == current_user.id
    ).order_by(AIInsight.created_at.desc()).limit(limit).all()
    
    return [InsightResponse.model_validate(insight) for insight in insights]

# Chat routes moved to routes/chat.py

@router.get("/news")
async def get_business_news(
    query: str = "business sales trends",
    limit: int = 5,
    current_user: User = Depends(get_current_active_user)
):
    """Get recent business news related to sales and trends"""
    
    try:
        news_articles = ai_insights.get_google_news(query, limit)
        return {"articles": news_articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching news: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "ai_available": ai_insights.model is not None
    }

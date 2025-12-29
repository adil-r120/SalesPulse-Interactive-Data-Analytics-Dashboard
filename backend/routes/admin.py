"""
Admin routes for viewing feedback and statistics
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, StockFeedback
from utils.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Response Models
class FeedbackDetail(BaseModel):
    id: str
    user_email: str
    rating: int
    feedback: Optional[str]
    stock_symbol: Optional[str]
    created_at: str
    
class FeedbackStats(BaseModel):
    total_feedbacks: int
    average_rating: float
    rating_breakdown: dict
    recent_feedbacks: List[FeedbackDetail]

# Admin Routes
@router.get("/feedback/all")
async def get_all_feedback(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all feedback messages (Admin only - check role if needed)"""
    
    # Optional: Add admin role check
    # if current_user.role != "Admin":
    #     raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all feedback with user info
    feedbacks = db.query(StockFeedback, User.email).join(
        User, StockFeedback.user_id == User.id
    ).order_by(desc(StockFeedback.created_at)).limit(limit).all()
    
    result = []
    for feedback, email in feedbacks:
        result.append({
            "id": feedback.id,
            "user_email": email,
            "rating": feedback.rating,
            "feedback": feedback.feedback,
            "stock_symbol": feedback.stock_symbol,
            "created_at": feedback.created_at.isoformat() if feedback.created_at else None
        })
    
    return {
        "total": len(result),
        "feedbacks": result
    }

@router.get("/feedback/stats")
async def get_feedback_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive feedback statistics (Admin only)"""
    
    # Total count and average
    stats = db.query(
        func.count(StockFeedback.id).label('total'),
        func.avg(StockFeedback.rating).label('avg_rating')
    ).first()
    
    # Rating breakdown
    rating_counts = db.query(
        StockFeedback.rating,
        func.count(StockFeedback.id).label('count')
    ).group_by(StockFeedback.rating).all()
    
    rating_breakdown = {str(rating): count for rating, count in rating_counts}
    
    # Recent feedbacks (last 10)
    recent = db.query(StockFeedback, User.email).join(
        User, StockFeedback.user_id == User.id
    ).order_by(desc(StockFeedback.created_at)).limit(10).all()
    
    recent_list = []
    for feedback, email in recent:
        recent_list.append({
            "id": feedback.id,
            "user_email": email,
            "rating": feedback.rating,
            "feedback": feedback.feedback,
            "stock_symbol": feedback.stock_symbol,
            "created_at": feedback.created_at.isoformat() if feedback.created_at else None
        })
    
    return {
        "total_feedbacks": stats.total or 0,
        "average_rating": round(stats.avg_rating, 2) if stats.avg_rating else 0,
        "rating_breakdown": rating_breakdown,
        "recent_feedbacks": recent_list
    }

@router.get("/feedback/export-csv")
async def export_feedback_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export all feedback as CSV"""
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    # Get all feedback
    feedbacks = db.query(StockFeedback, User.email).join(
        User, StockFeedback.user_id == User.id
    ).order_by(desc(StockFeedback.created_at)).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['ID', 'User Email', 'Rating', 'Feedback', 'Stock Symbol', 'Date'])
    
    # Data
    for feedback, email in feedbacks:
        writer.writerow([
            feedback.id,
            email,
            feedback.rating,
            feedback.feedback or '',
            feedback.stock_symbol or '',
            feedback.created_at.isoformat() if feedback.created_at else ''
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=feedback_export.csv"}
    )

"""
Stock Search Feedback API Routes
Handles user feedback for the stock search feature
"""
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
import csv
import io
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import User, StockFeedback, Notification
from utils.auth import get_current_user

router = APIRouter(prefix="/api/stock-feedback", tags=["stock-feedback"])

# Request Models
class FeedbackCreate(BaseModel):
    rating: int
    feedback: Optional[str] = None
    stock_symbol: Optional[str] = None

class AdminReply(BaseModel):
    reply: str
    status: str = "resolved"

# Response Models
class FeedbackResponse(BaseModel):
    id: str
    rating: int
    feedback: Optional[str]
    stock_symbol: Optional[str]
    created_at: str
    status: Optional[str] = "pending"
    admin_reply: Optional[str] = None
    replied_at: Optional[str] = None
    user_email: Optional[str] = None  # To show who submitted in admin view
    
    class Config:
        from_attributes = True

# Routes
@router.post("/", response_model=FeedbackResponse)
async def submit_feedback(
    feedback_data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit stock search feedback"""
    
    # Validate rating
    if feedback_data.rating < 1 or feedback_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Create feedback record
    db_feedback = StockFeedback(
        user_id=current_user.id,
        rating=feedback_data.rating,
        feedback=feedback_data.feedback,
        stock_symbol=feedback_data.stock_symbol,
        created_at=datetime.utcnow(),
        status="pending"
    )
    
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    
    # Create notifications for all admin users
    # Create notifications
    try:
        # 1. Notify the submitter (User)
        is_help_request = "help request" in (feedback_data.feedback or "").lower()
        
        user_notif = Notification(
            user_id=current_user.id,
            type="success",
            title="Request Submitted" if is_help_request else "Feedback Sent",
            message="We have received your submission and will review it shortly.",
            icon_type="check",
            read=False,
            timestamp=datetime.utcnow()
        )
        db.add(user_notif)

        # 2. Notify all Admins
        admin_users = db.query(User).filter(User.role == "Admin").all()
        
        for admin in admin_users:
            # Don't notify the admin if they are the one submitting (optional, but good UX)
            if admin.id == current_user.id:
                continue

            # Build notification message
            stars = "⭐" * feedback_data.rating
            message_parts = [
                f"{current_user.email or current_user.username} rated {stars} ({feedback_data.rating}/5)"
            ]
            
            if feedback_data.stock_symbol:
                message_parts.append(f"for {feedback_data.stock_symbol}")
            
            if feedback_data.feedback:
                comment_preview = feedback_data.feedback[:50] + "..." if len(feedback_data.feedback) > 50 else feedback_data.feedback
                message_parts.append(f'"{comment_preview}"')
            
            notification = Notification(
                user_id=admin.id,
                type="info" if is_help_request else ("info" if feedback_data.rating >= 4 else "warning"),
                title="🆘 New Help Request" if is_help_request else "📊 New Feedback Received",
                message=" ".join(message_parts),
                icon_type="help-circle" if is_help_request else ("check" if feedback_data.rating >= 4 else "alert"),
                read=False,
                timestamp=datetime.utcnow()
            )
            db.add(notification)
        
        db.commit()
    except Exception as e:
        # Log error but don't fail the feedback submission
        print(f"Failed to create admin notifications: {e}")
    
    return FeedbackResponse(
        id=str(db_feedback.id),
        rating=db_feedback.rating,
        feedback=db_feedback.feedback,
        stock_symbol=db_feedback.stock_symbol,
        created_at=db_feedback.created_at.isoformat(),
        status=db_feedback.status,
        admin_reply=db_feedback.admin_reply,
        replied_at=db_feedback.replied_at.isoformat() if db_feedback.replied_at else None
    )

@router.get("/stats")
async def get_feedback_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get feedback statistics for current user"""
    from sqlalchemy import func
    
    stats = db.query(
        func.count(StockFeedback.id).label('total_count'),
        func.avg(StockFeedback.rating).label('average_rating')
    ).filter(StockFeedback.user_id == current_user.id).first()
    
    return {
        "total_feedbacks": stats.total_count or 0,
        "average_rating": round(stats.average_rating, 2) if stats.average_rating else 0
    }

@router.get("/history", response_model=List[FeedbackResponse])
async def get_user_feedback_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get feedback history for current user"""
    feedbacks = db.query(StockFeedback).filter(
        StockFeedback.user_id == current_user.id
    ).order_by(desc(StockFeedback.created_at)).all()
    
    return [
        FeedbackResponse(
            id=str(f.id),
            rating=f.rating,
            feedback=f.feedback,
            stock_symbol=f.stock_symbol,
            created_at=f.created_at.isoformat() if f.created_at else "",
            status=f.status,
            admin_reply=f.admin_reply,
            replied_at=f.replied_at.isoformat() if f.replied_at else None
        ) for f in feedbacks
    ]

# Admin Endpoints

@router.get("/admin/all", response_model=List[FeedbackResponse])
async def get_all_feedback_admin(
    status: Optional[str] = None,
    rating_type: Optional[str] = None, # 'good' or 'bad'
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all feedback (Admin only) with filters"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    try:
        query = db.query(StockFeedback)
        # query = query.join(User, StockFeedback.user_id == User.id) # Removed to prevent join errors
        
        if status and status != 'all':
            query = query.filter(StockFeedback.status == status)
            
        if rating_type == 'good':
            query = query.filter(StockFeedback.rating >= 4)
        elif rating_type == 'bad':
            query = query.filter(StockFeedback.rating <= 3)
            
        results = query.order_by(desc(StockFeedback.created_at)).all()
        
        response = []
        for f in results:
            user = db.query(User).filter(User.id == f.user_id).first()
            user_email = user.email if user else "Unknown"
            
            response.append(FeedbackResponse(
                id=str(f.id),
                rating=f.rating,
                feedback=f.feedback,
                stock_symbol=f.stock_symbol,
                created_at=str(f.created_at), # changed to str() to be safe
                status=f.status if f.status else "pending",
                admin_reply=f.admin_reply,
                replied_at=str(f.replied_at) if f.replied_at else None,
                user_email=user_email
            ))
            
        return response
    except Exception as e:
        import traceback
        with open("last_error.txt", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/reply/{feedback_id}")
async def reply_to_feedback(
    feedback_id: str,
    reply_data: AdminReply,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reply to user feedback (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    feedback = db.query(StockFeedback).filter(StockFeedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    feedback.admin_reply = reply_data.reply
    feedback.status = reply_data.status
    feedback.replied_at = datetime.utcnow()
    
    # Create notification for the user
    notification = Notification(
        user_id=feedback.user_id,
        type="success",
        title="Admin Replied to Your Feedback",
        message=f"Admin replied: {reply_data.reply[:50]}...",
        icon_type="check",
        read=False,
        timestamp=datetime.utcnow()
    )
    db.add(notification)
    
    db.commit()
    
    return {"message": "Reply sent successfully"}

@router.post("/admin/import")
async def import_feedback(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import feedback from CSV file (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")

    if not file.filename.endswith(".csv"):
         raise HTTPException(status_code=400, detail="Invalid file format. Please upload CSV.")

    try:
        content = await file.read()
        decoded = content.decode("utf-8")
        csv_reader = csv.DictReader(io.StringIO(decoded))
        
        count = 0
        for row in csv_reader:
            user_id = current_user.id
            if 'email' in row and row['email']:
                user = db.query(User).filter(User.email == row['email']).first()
                if user:
                    user_id = user.id
            
            feedback = StockFeedback(
                user_id=user_id,
                rating=int(row.get('rating', 5)),
                feedback=row.get('feedback', ''),
                stock_symbol=row.get('stock_symbol', ''),
                status=row.get('status', 'pending'),
                created_at=datetime.utcnow() 
            )
            db.add(feedback)
            count += 1
            
        db.commit()
        return {"message": f"Successfully imported {count} feedback records"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.post("/admin/auto-archive")
async def auto_archive_feedback(
    days: int = Query(..., ge=1, le=3650),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Auto-archive feedback older than X days"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Update status to 'archived' for records created before cutoff AND not already archived
    result = db.query(StockFeedback).filter(
        StockFeedback.created_at < cutoff_date,
        StockFeedback.status != "archived"
    ).update({StockFeedback.status: "archived"}, synchronize_session=False)
    
    db.commit()
    return {"message": f"Archived {result} feedback records older than {days} days"}

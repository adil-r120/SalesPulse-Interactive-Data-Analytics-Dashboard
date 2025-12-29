"""
Notification system backend
Handles user notifications with read/unread status
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, Notification
from utils.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Response Models
class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    timestamp: str
    read: bool
    icon_type: Optional[str] = None
    
    class Config:
        from_attributes = True

# Get all notifications for current user
@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = 50,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for current user"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.read == False)
    
    notifications = query.order_by(desc(Notification.timestamp)).limit(limit).all()
    
    return [NotificationResponse(
        id=str(n.id),
        type=n.type,
        title=n.title,
        message=n.message,
        timestamp=n.timestamp.isoformat() if n.timestamp else datetime.now().isoformat(),
        read=n.read,
        icon_type=n.icon_type
    ) for n in notifications]

# Get unread count
@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False
    ).count()
    
    return {"unread_count": count}

# Mark notification as read
@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    db.commit()
    
    return {"message": "Notification marked as read"}

# Mark all as read
@router.put("/mark-all-read")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False
    ).update({"read": True})
    db.commit()
    
    return {"message": "All notifications marked as read"}

# Delete notification
@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notification deleted"}

# Create notification (for testing/admin)
class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    icon_type: Optional[str] = None

@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new notification"""
    new_notification = Notification(
        user_id=current_user.id,
        type=notification_data.type,
        title=notification_data.title,
        message=notification_data.message,
        icon_type=notification_data.icon_type,
        read=False,
        timestamp=datetime.utcnow()
    )
    
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    
    return NotificationResponse(
        id=str(new_notification.id),
        type=new_notification.type,
        title=new_notification.title,
        message=new_notification.message,
        timestamp=new_notification.timestamp.isoformat(),
        read=new_notification.read,
        icon_type=new_notification.icon_type
    )

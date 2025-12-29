from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request
import shutil
import os
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from pydantic import BaseModel, EmailStr
from typing import Optional

from database import get_db
from models import User, SalesRecord, Goal, ChatMessage, AIInsight, Notification, LoginHistory
from utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_active_user,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from utils.limiter import limiter

router = APIRouter(prefix="/auth", tags=["authentication"])

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "Viewer"

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str]
    role: str
    is_active: bool
    
    model_config = {"from_attributes": True}
    profile_image_url: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class LoginHistoryResponse(BaseModel):
    id: str
    username: str
    user_id: Optional[str]
    status: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    timestamp: datetime
    
    model_config = {"from_attributes": True}

class OTPVerification(BaseModel):
    username: str
    otp_code: str

import random
import string

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_otp_email(email: str, otp: str):
    """
    Simulate sending an email (Log to console)
    In production, use smtplib or a service like SendGrid
    """
    print("="*60)
    print(f"📧 [EMAIL SIMULATION] To: {email}")
    print(f"📧 Subject: Your SalesPulse Login OTP")
    print(f"📧 Body: Your verification code is: {otp}")
    print(f"📧 This code expires in 5 minutes.")
    print("="*60)

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

@router.post("/signup", response_model=Token)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user account"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.id}, expires_delta=access_token_expires
    )
    
    # Notify Admins about new user
    try:
        admins = db.query(User).filter(User.role == "Admin").all()
        for admin in admins:
            new_user_notif = Notification(
                user_id=admin.id,
                notification_type="info",
                title="New User Signup",
                message=f"User {db_user.username} has joined the platform.",
                icon_type="users"
            )
            db.add(new_user_notif)
        db.commit()
    except Exception as e:
        print(f"Failed to notify admins: {e}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(db_user)
    }

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with email/username and password"""
    
    # Get IP address
    client_host = request.client.host if request.client else "Unknown"
    user_agent = request.headers.get("user-agent", "Unknown")

    # Find user by email or username
    user = db.query(User).filter(
        (User.email == form_data.username) | (User.username == form_data.username)
    ).first()
    
    # Log the attempt
    login_attempt = LoginHistory(
        username=form_data.username,
        user_id=user.id if user else None,
        status="Pending", # Will update below
        ip_address=client_host,
        user_agent=user_agent
    )
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        login_attempt.status = "Failed"
        db.add(login_attempt)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        login_attempt.status = "Failed (Inactive)"
        db.add(login_attempt)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Log success
    login_attempt.status = "Success"
    db.add(login_attempt)
    
    # Update last login time
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    # Create access token (Direct Login, No OTP for standard auth)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }

@router.post("/verify-otp", response_model=Token)
async def verify_otp(otp_data: OTPVerification, db: Session = Depends(get_db)):
    """Verify OTP and issue access token"""
    
    user = db.query(User).filter(
        (User.email == otp_data.username) | (User.username == otp_data.username)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if OTP matches
    if not user.otp_code or user.otp_code != otp_data.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    # Check expiry
    if not user.otp_expires_at or user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code expired. Please login again.")
        
    # Clear OTP after success and Update Last Login
    user.otp_code = None
    user.otp_expires_at = None
    user.last_login_at = datetime.utcnow() # Mark as logged in so they skip OTP next time
    db.commit()
    
    # Create final access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }

@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user profile"""
    return UserResponse.model_validate(current_user)

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    
    # Check if email is being changed and if it's already taken
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_update.email
    
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)

@router.post("/change-password")
async def change_password(
    password_data: UserPasswordUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar"""
    # Create static directory if not exists
    os.makedirs("static/avatars", exist_ok=True)
    
    # Generate file path (use user ID to overwrite previous)
    file_extension = file.filename.split(".")[-1]
    file_path = f"static/avatars/{current_user.id}.{file_extension}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user model (save relative path)
    current_user.profile_image_url = f"/static/avatars/{current_user.id}.{file_extension}"
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Avatar uploaded successfully", "url": current_user.profile_image_url}

@router.delete("/avatar")
async def remove_avatar(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove user avatar"""
    if current_user.profile_image_url:
        # Extract file path from URL (Assuming URL format /static/avatars/ID.ext)
        # Be careful with path manipulation security
        try:
           filename = current_user.profile_image_url.split("/")[-1]
           if filename.startswith(str(current_user.id)): # Simple security check
               file_path = f"static/avatars/{filename}"
               if os.path.exists(file_path):
                   os.remove(file_path)
        except Exception as e:
            print(f"Error removing avatar file: {e}")

        current_user.profile_image_url = None
        db.commit()
        db.refresh(current_user)
    
    return {"message": "Avatar removed successfully"}

@router.post("/reset-data")
async def reset_user_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete all user data (Sales, Goals, Chat, Insights)"""
    
    # Delete Sales Records
    db.query(SalesRecord).filter(SalesRecord.user_id == current_user.id).delete()
    
    # Delete Goals
    db.query(Goal).filter(Goal.user_id == current_user.id).delete()
    
    # Delete Chat History
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete()
    
    # Delete AI Insights
    db.query(AIInsight).filter(AIInsight.user_id == current_user.id).delete()
    
    db.commit()
    return {"message": "All data reset successfully"}

@router.get("/users", response_model=list[UserResponse])
async def get_users(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all users (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    users = db.query(User).all()
    return [UserResponse.model_validate(user) for user in users]

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a user (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        # Delete all related records first (cascade delete)
        # Import StockFeedback model
        from models import StockFeedback
        
        # Delete user's feedback
        db.query(StockFeedback).filter(StockFeedback.user_id == user_id).delete()
        
        # Delete Sales Records
        db.query(SalesRecord).filter(SalesRecord.user_id == user_id).delete()
        
        # Delete Goals
        db.query(Goal).filter(Goal.user_id == user_id).delete()
        
        # Delete Chat History
        db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete()
        
        # Delete AI Insights
        db.query(AIInsight).filter(AIInsight.user_id == user_id).delete()
        
        # Now delete the user
        db.delete(user)
        db.commit()
        
        return {"message": "User deleted successfully", "deleted_user_id": user_id}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


# Google OAuth Models
class GoogleToken(BaseModel):
    access_token: str

class GoogleUser(BaseModel):
    id: str
    email: EmailStr
    name: str
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    picture: Optional[str] = None

@router.post("/google", response_model=Token)
async def google_auth(token: GoogleToken, db: Session = Depends(get_db)):
    """Authenticate user with Google OAuth token"""
    try:
        # In a real implementation, you would verify the Google token with Google's API
        # For this example, we'll simulate the verification with more realistic data
        
        # Extract a more realistic user ID from the token
        token_hash = hash(token.access_token) % 1000000
        
        # Simulate Google user data (in a real app, you'd get this from Google's API)
        google_user_data = {
            "id": f"google_{token_hash}",  # Simulated Google ID
            "email": f"user{token_hash}@gmail.com",  # Simulated email
            "name": f"Google User {token_hash}",  # Simulated name
            "given_name": f"User{token_hash}",
            "family_name": "Google",
            "picture": f"https://via.placeholder.com/150/4285F4/FFFFFF?text=U{str(token_hash)[:2]}"
        }
        
        # Check if user already exists by email
        user = db.query(User).filter(User.email == google_user_data["email"]).first()
        
        if not user:
            # Create new user with Google data
            # Generate a unique username if the email prefix is already taken
            base_username = google_user_data["email"].split("@")[0]
            username = base_username
            counter = 1
            
            # Check if username already exists and modify if needed
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}_{counter}"
                counter += 1
            
            db_user = User(
                email=google_user_data["email"],
                username=username,
                hashed_password=get_password_hash(f"google_oauth_{token_hash}"),  # Unique placeholder password
                full_name=google_user_data["name"],
                role="Viewer"
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            user = db_user
        
        
        if user.last_login_at is not None:
             # Existing user -> Login directly
            user.last_login_at = datetime.utcnow()
            db.commit()
            
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.id}, expires_delta=access_token_expires
            )
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": UserResponse.model_validate(user)
            }


        
        # 2FA Step for Google Users (New/First Time): Generate and Send OTP
        # Reuse the same logic as standard login for consistency
        otp = generate_otp()
        user.otp_code = otp
        user.otp_expires_at = datetime.utcnow() + timedelta(minutes=5)
        db.commit()
    
        # Send email (Simulation)
        send_otp_email(user.email, otp)

        return {
            "access_token": "PRE_AUTH_REQUIRED",
            "token_type": "pre_auth",
            "user": UserResponse.model_validate(user)
        }
    
    except Exception as e:
        print(f"Google authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed. Please try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Advanced Admin Endpoints

class UserRoleUpdate(BaseModel):
    role: str

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_data: UserRoleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user role (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    if role_data.role not in ["Admin", "Manager", "Viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role_data.role
    db.commit()
    
    return {"message": f"User role updated to {role_data.role}"}

class BulkAction(BaseModel):
    user_ids: list[str]
    action: str  # "delete" or "change_role"
    role: Optional[str] = None

@router.post("/users/bulk-action")
async def bulk_user_action(
    action_data: BulkAction,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Perform bulk actions on users (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    count = 0
    if action_data.action == "delete":
        for user_id in action_data.user_ids:
            if user_id == current_user.id:
                continue  # Skip self
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                db.delete(user)
                count += 1
        db.commit()
        return {"message": f"Deleted {count} users"}
    
    elif action_data.action == "change_role":
        if not action_data.role or action_data.role not in ["Admin", "Manager", "Viewer"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        for user_id in action_data.user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.role = action_data.role
                count += 1
        db.commit()
        return {"message": f"Updated {count} users to {action_data.role}"}
    
    raise HTTPException(status_code=400, detail="Invalid action")

class NotificationMessage(BaseModel):
    user_ids: list[str]
    title: str
    message: str

@router.post("/users/notify")
async def send_notification_to_users(
    notif_data: NotificationMessage,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send notification to selected users (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    count = 0
    for user_id in notif_data.user_ids:
        notification = Notification(
            user_id=user_id,
            notification_type="info",
            title=notif_data.title,
            message=notif_data.message,
            icon_type="bell"
        )
        db.add(notification)
        count += 1
    
    db.commit()
    return {"message": f"Notification sent to {count} users"}

@router.get("/users/activity")
async def get_user_activity(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user activity statistics (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    from sqlalchemy import func
    
    # Get total users and active count
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    
    # Get role distribution
    role_distribution = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "role_distribution": {role: count for role, count in role_distribution},
        "recent_activity": []  # Placeholder for future implementation
    }

@router.get("/users/sessions")
async def get_active_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get active user sessions (Admin only - Placeholder)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    # This is a placeholder - real implementation would require session storage
    active_users = db.query(User).filter(User.is_active == True).all()
    
    return {
        "message": "Session management requires Redis/database session storage",
        "active_user_count": len(active_users),
        "note": "JWT tokens are stateless - consider implementing session storage for full tracking"
    }

@router.get("/users/login-history", response_model=list[LoginHistoryResponse])
async def get_login_history(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get recent login attempts (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    history = db.query(LoginHistory).order_by(LoginHistory.timestamp.desc()).limit(limit).all()
    return [LoginHistoryResponse.model_validate(entry) for entry in history]


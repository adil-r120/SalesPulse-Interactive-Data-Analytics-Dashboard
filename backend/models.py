from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    profile_image_url = Column(String(255), nullable=True)
    role = Column(String(50), default="Viewer")  # Admin, Analyst, Viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 2FA / OTP Fields
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    
    # Relationships
    sales_records = relationship("SalesRecord", back_populates="user")
    goals = relationship("Goal", back_populates="user")

class SalesRecord(Base):
    __tablename__ = "sales_records"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(DateTime, nullable=False)
    product = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    region = Column(String(100), nullable=True)
    customer = Column(String(255), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="sales_records")

class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, default=0.0)
    target_date = Column(DateTime, nullable=False)
    category = Column(String(100), nullable=False)  # revenue, sales, customers, etc.
    status = Column(String(50), default="active")  # active, completed, paused
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="goals")

class AIInsight(Base):
    __tablename__ = "ai_insights"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    query = Column(String(500), nullable=False)
    insight = Column(Text, nullable=False)
    sentiment = Column(String(50), nullable=False)  # positive, negative, neutral
    source = Column(String(100), nullable=False)  # google_news, sales_data, etc.
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    message_type = Column(String(50), default="user")  # user, assistant
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StockFeedback(Base):
    __tablename__ = "stock_feedback"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    feedback = Column(Text, nullable=True)  # Optional comment
    stock_symbol = Column(String(20), nullable=True)  # Optional stock symbol
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # New fields for Admin Review
    status = Column(String(20), default="pending")  # pending, resolved
    admin_reply = Column(Text, nullable=True)
    replied_at = Column(DateTime(timezone=True), nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # success, warning, info, achievement
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    icon_type = Column(String(50), nullable=True)  # target, dollar, alert, etc
    read = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class LoginHistory(Base):
    __tablename__ = "login_history"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), nullable=False)  # Store username attempted
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True) # Null if user doesn't exist
    status = Column(String(20), nullable=False) # "Success" or "Failed"
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

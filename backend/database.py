from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
from datetime import datetime

load_dotenv()

# Database configuration - supports both SQLite (local) and PostgreSQL (cloud)
DATABASE_URL = os.getenv("DATABASE_URL")

# Railway/Render use postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Fallback to SQLite for local development
if not DATABASE_URL:
    # Use absolute path to ensure DB is always in the backend directory
    # regardless of where the script is run from
    import os
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'salespulse.db')}"

# Create engine with appropriate settings for each database type
if "postgresql" in DATABASE_URL:
    # PostgreSQL settings for cloud deployment
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=300,    # Recycle connections every 5 minutes
    )
else:
    # SQLite settings for local development
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database with sample data"""
    create_tables()
    
    # Add sample data if database is empty
    db = SessionLocal()
    try:
        from models import User, SalesRecord
        from utils.auth import get_password_hash
        
        # Check if users exist
        user_count = db.query(User).count()
        if user_count == 0:
            print("Database is empty. Initializing with sample data...")
            # Create admin user
            admin_user = User(
                email="adil_r146@salespulse.com",
                username="adil_r146",
                hashed_password=get_password_hash("Adil@146"),  # get_password_hash handles length limiting
                full_name="Adil",
                role="Admin"
            )
            db.add(admin_user)
            
            # Generate 50+ realistic sample sales for better visualization
            import random
            from datetime import timedelta
            
            products_catalog = [
                ("iPhone 15 Pro", "Electronics", 82999), 
                ("MacBook Air", "Electronics", 99900),
                ("Sony XM5 Headphones", "Electronics", 24990),
                ("Nike Air Max", "Clothing", 10799),
                ("Adidas Hoodie", "Clothing", 4500),
                ("Levi's Jeans", "Clothing", 3200),
                ("Coffee Maker", "Homes", 4500),
                ("Smart LED Bulb", "Homes", 800),
                ("Python Crash Course", "Books", 1200),
                ("Atomic Habits", "Books", 850)
            ]
            
            regions = ["North America", "Europe", "Asia Pacific", "South America", "India"]
            customers = ["John Smith", "Emma Johnson", "Rahul Sharma", "Priya Singh", "David Chen", "Sarah Wilson"]
            
            sample_sales = []
            today = datetime.now()
            
            for i in range(50):
                # Randomize date within last 30 days
                sale_date = today - timedelta(days=random.randint(0, 30))
                
                # Randomize product
                prod_name, prod_cat, prod_price = random.choice(products_catalog)
                
                # Randomize quantity
                qty = random.randint(1, 3)
                
                # Create record
                sample_sales.append(SalesRecord(
                    date=sale_date,
                    product=prod_name,
                    category=prod_cat,
                    quantity=qty,
                    price=prod_price,
                    total=prod_price * qty,
                    region=random.choice(regions),
                    customer=random.choice(customers),
                    user_id=admin_user.id
                ))
            
            for sale in sample_sales:
                db.add(sale)
            
            db.commit()
            print("Database initialized with sample data")
        else:
            print(f"Database already contains {user_count} users. Skipping sample data initialization.")
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

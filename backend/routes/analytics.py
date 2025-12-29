from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db
from models import User, SalesRecord
from utils.auth import get_current_active_user

router = APIRouter(prefix="/api", tags=["analytics"])

# Pydantic models
class OverviewMetrics(BaseModel):
    total_revenue: float
    total_sales: int
    avg_order_value: float
    customer_count: int
    monthly_growth: float
    top_product: str
    top_category: str
    top_region: str

class RevenueTrend(BaseModel):
    month: str
    revenue: float
    sales_count: int

class CategoryData(BaseModel):
    category: str
    revenue: float
    sales_count: int
    percentage: float

class RegionData(BaseModel):
    region: str
    revenue: float
    sales_count: int
    percentage: float

class SalesRecordCreate(BaseModel):
    date: str
    product: str
    category: str
    quantity: int
    price: float
    region: str = ""
    customer: str

class SalesRecordResponse(BaseModel):
    id: str
    date: str
    product: str
    category: str
    quantity: int
    price: float
    total: float
    region: str = ""
    customer: str
    created_at: str
    
    model_config = {"from_attributes": True}

@router.get("/overview", response_model=OverviewMetrics)
async def get_overview(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get dashboard overview metrics"""
    
    # Get all sales records for the user
    sales_query = db.query(SalesRecord).filter(SalesRecord.user_id == current_user.id)
    
    # Apply Date Filters if provided
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            sales_query = sales_query.filter(SalesRecord.date >= start_dt)
        except ValueError:
            pass # Ignore invalid dates
            
    if end_date:
        try:
             end_dt = datetime.strptime(end_date, "%Y-%m-%d")
             # Set time to end of day
             end_dt = end_dt.replace(hour=23, minute=59, second=59)
             sales_query = sales_query.filter(SalesRecord.date <= end_dt)
        except ValueError:
            pass

    # OPTIMIZED: Fetch base metrics in a single database query to reduce round-trips
    # We use the filtered sales_query here
    metrics = sales_query.with_entities(
        func.sum(SalesRecord.total),
        func.count(SalesRecord.id),
        func.count(func.distinct(SalesRecord.customer))
    ).first()
    
    total_revenue = metrics[0] or 0
    total_sales = metrics[1] or 0
    customer_count = metrics[2] or 0
    
    # Average order value
    avg_order_value = total_revenue / total_sales if total_sales > 0 else 0
    
    # Top product
    top_product_result = sales_query.with_entities(
        SalesRecord.product, func.sum(SalesRecord.total)
    ).group_by(SalesRecord.product).order_by(func.sum(SalesRecord.total).desc()).first()
    top_product = top_product_result[0] if top_product_result else "N/A"
    
    # Top category
    top_category_result = sales_query.with_entities(
        SalesRecord.category, func.sum(SalesRecord.total)
    ).group_by(SalesRecord.category).order_by(func.sum(SalesRecord.total).desc()).first()
    top_category = top_category_result[0] if top_category_result else "N/A"
    
    # Top region
    top_region_result = sales_query.with_entities(
        SalesRecord.region, func.sum(SalesRecord.total)
    ).group_by(SalesRecord.region).order_by(func.sum(SalesRecord.total).desc()).first()
    top_region = top_region_result[0] if top_region_result else "N/A"
    
    # Monthly growth (Keep strictly "This Month vs Last Month" regardless of filter, OR disable if filter active)
    # For now, let's keep it as "Global Monthly Growth" to indicate overall health
    sales_query_global = db.query(SalesRecord).filter(SalesRecord.user_id == current_user.id)
    
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    current_month_revenue = sales_query_global.filter(
        extract('month', SalesRecord.date) == current_month,
        extract('year', SalesRecord.date) == current_year
    ).with_entities(func.sum(SalesRecord.total)).scalar() or 0
    
    last_month = current_month - 1 if current_month > 1 else 12
    last_month_year = current_year if current_month > 1 else current_year - 1
    
    last_month_revenue = sales_query_global.filter(
        extract('month', SalesRecord.date) == last_month,
        extract('year', SalesRecord.date) == last_month_year
    ).with_entities(func.sum(SalesRecord.total)).scalar() or 0
    
    monthly_growth = ((current_month_revenue - last_month_revenue) / last_month_revenue * 100) if last_month_revenue > 0 else 0
    
    # If a filter is active, we might want to return 0 or null for growth, but keeping global growth is safer context
    
    return OverviewMetrics(
        total_revenue=total_revenue,
        total_sales=total_sales,
        avg_order_value=avg_order_value,
        customer_count=customer_count,
        monthly_growth=round(monthly_growth, 2),
        top_product=top_product,
        top_category=top_category,
        top_region=top_region
    )

@router.get("/revenue-trend", response_model=List[RevenueTrend])
async def get_revenue_trend(
    months: int = Query(12, description="Number of months to include"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get monthly revenue trend data"""
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 30)
    
    # Query monthly revenue data
    monthly_data = db.query(
        extract('year', SalesRecord.date).label('year'),
        extract('month', SalesRecord.date).label('month'),
        func.sum(SalesRecord.total).label('revenue'),
        func.count(SalesRecord.id).label('sales_count')
    ).filter(
        SalesRecord.user_id == current_user.id,
        SalesRecord.date >= start_date
    ).group_by(
        extract('year', SalesRecord.date),
        extract('month', SalesRecord.date)
    ).order_by('year', 'month').all()
    
    # Format response
    trend_data = []
    for data in monthly_data:
        month_name = datetime(int(data.year), int(data.month), 1).strftime('%Y-%m')
        trend_data.append(RevenueTrend(
            month=month_name,
            revenue=float(data.revenue or 0),
            sales_count=int(data.sales_count or 0)
        ))
    
    return trend_data

@router.get("/sales-by-category", response_model=List[CategoryData])
async def get_sales_by_category(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get sales data grouped by category"""
    
    # Get total revenue for percentage calculation
    total_revenue = db.query(func.sum(SalesRecord.total)).filter(
        SalesRecord.user_id == current_user.id
    ).scalar() or 0
    
    # Query category data
    category_data = db.query(
        SalesRecord.category,
        func.sum(SalesRecord.total).label('revenue'),
        func.count(SalesRecord.id).label('sales_count')
    ).filter(
        SalesRecord.user_id == current_user.id
    ).group_by(SalesRecord.category).all()
    
    # Format response
    result = []
    for data in category_data:
        percentage = (data.revenue / total_revenue * 100) if total_revenue > 0 else 0
        result.append(CategoryData(
            category=data.category,
            revenue=float(data.revenue or 0),
            sales_count=int(data.sales_count or 0),
            percentage=round(percentage, 2)
        ))
    
    return result

@router.get("/revenue-by-region", response_model=List[RegionData])
async def get_revenue_by_region(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get revenue data grouped by region"""
    
    # Get total revenue for percentage calculation
    total_revenue = db.query(func.sum(SalesRecord.total)).filter(
        SalesRecord.user_id == current_user.id
    ).scalar() or 0
    
    # Query region data
    region_data = db.query(
        SalesRecord.region,
        func.sum(SalesRecord.total).label('revenue'),
        func.count(SalesRecord.id).label('sales_count')
    ).filter(
        SalesRecord.user_id == current_user.id
    ).group_by(SalesRecord.region).all()
    
    # Format response
    result = []
    for data in region_data:
        percentage = (data.revenue / total_revenue * 100) if total_revenue > 0 else 0
        result.append(RegionData(
            region=data.region,
            revenue=float(data.revenue or 0),
            sales_count=int(data.sales_count or 0),
            percentage=round(percentage, 2)
        ))
    
    return result

@router.get("/sales-records", response_model=List[SalesRecordResponse])
async def get_sales_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get sales records with optional filtering"""
    
    query = db.query(SalesRecord).filter(SalesRecord.user_id == current_user.id)
    
    # Apply filters
    if category:
        query = query.filter(SalesRecord.category == category)
    if region:
        query = query.filter(SalesRecord.region == region)
    
    # Apply pagination
    records = query.order_by(SalesRecord.date.desc()).offset(skip).limit(limit).all()
    
    # Convert records to response format with proper datetime handling
    response_records = []
    for record in records:
        record_dict = record.__dict__.copy()
        # Convert datetime fields to strings
        if 'date' in record_dict and record_dict['date']:
            record_dict['date'] = record_dict['date'].strftime('%Y-%m-%d')
        if 'created_at' in record_dict and record_dict['created_at']:
            record_dict['created_at'] = record_dict['created_at'].isoformat()
        response_records.append(SalesRecordResponse(**record_dict))
    
    return response_records

@router.post("/sales-records", response_model=SalesRecordResponse)
async def create_sales_record(
    record_data: SalesRecordCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new sales record"""
    
    # Parse date
    try:
        record_date = datetime.strptime(record_data.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Calculate total
    total = record_data.quantity * record_data.price
    
    # Create record
    db_record = SalesRecord(
        date=record_date,
        product=record_data.product,
        category=record_data.category,
        quantity=record_data.quantity,
        price=record_data.price,
        total=total,
        region=record_data.region,
        customer=record_data.customer,
        user_id=current_user.id
    )
    
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    
    # Convert datetime fields to strings for response
    record_dict = db_record.__dict__.copy()
    if 'date' in record_dict and record_dict['date']:
        record_dict['date'] = record_dict['date'].strftime('%Y-%m-%d')
    if 'created_at' in record_dict and record_dict['created_at']:
        record_dict['created_at'] = record_dict['created_at'].isoformat()
    
    return SalesRecordResponse(**record_dict)

@router.delete("/sales-records/{record_id}")
async def delete_sales_record(
    record_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a sales record"""
    
    record = db.query(SalesRecord).filter(
        SalesRecord.id == record_id,
        SalesRecord.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Sales record not found")
    
    db.delete(record)
    db.commit()
    
    return {"message": "Sales record deleted successfully"}

@router.get("/categories")
async def get_categories(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all unique categories used by the user"""
    
    # Get unique categories from user's sales records
    categories = db.query(SalesRecord.category).filter(
        SalesRecord.user_id == current_user.id
    ).distinct().all()
    
    # Extract category names and sort them
    category_list = sorted([cat[0] for cat in categories if cat[0]])
    
    # Add default categories if they don't exist
    default_categories = ['Electronics', 'Clothing', 'Homes', 'Books', 'Sports', 'Other']
    for default_cat in default_categories:
        if default_cat not in category_list:
            category_list.append(default_cat)
    
    return {"categories": category_list}

@router.get("/regions")
async def get_regions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all unique regions used by the user"""
    
    # Get unique regions from user's sales records
    regions = db.query(SalesRecord.region).filter(
        SalesRecord.user_id == current_user.id
    ).distinct().all()
    
    # Extract region names and sort them
    region_list = sorted([region[0] for region in regions if region[0]])
    
    # Add default regions if they don't exist
    default_regions = ['North America', 'Europe', 'Asia Pacific', 'South America', 'Africa']
    for default_region in default_regions:
        if default_region not in region_list:
            region_list.append(default_region)
    
    return {"regions": region_list}
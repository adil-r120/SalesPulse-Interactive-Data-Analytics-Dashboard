from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import io
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from database import get_db
from models import User, SalesRecord, Goal
from utils.auth import get_current_active_user

router = APIRouter(tags=["reports-goals"])

# Pydantic models
class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_value: float
    target_date: str
    category: str

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_value: Optional[float] = None
    target_date: Optional[str] = None
    category: Optional[str] = None
    current_value: Optional[float] = None
    status: Optional[str] = None

class GoalResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    target_value: float
    current_value: float
    target_date: str
    category: str
    status: str
    progress_percentage: float
    created_at: str
    
    model_config = {"from_attributes": True}

class ReportRequest(BaseModel):
    start_date: str
    end_date: str
    format: str = "pdf"  # pdf or csv
    include_charts: bool = True

@router.get("/goals", response_model=List[GoalResponse])
async def get_goals(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's goals"""
    
    query = db.query(Goal).filter(Goal.user_id == current_user.id)
    
    if status:
        query = query.filter(Goal.status == status)
    
    goals = query.order_by(Goal.created_at.desc()).all()
    
    # Calculate progress percentage
    result = []
    for goal in goals:
        progress = (goal.current_value / goal.target_value * 100) if goal.target_value > 0 else 0
        # Convert goal to dict manually to handle datetime conversion properly
        goal_data = {
            "id": str(goal.id),
            "title": str(goal.title),
            "description": goal.description,
            "target_value": float(goal.target_value),
            "current_value": float(goal.current_value),
            "target_date": goal.target_date.isoformat() if goal.target_date else None,
            "category": str(goal.category),
            "status": str(goal.status) if goal.status else "active",
            "progress_percentage": round(float(progress), 2),
            "created_at": goal.created_at.isoformat() if goal.created_at else None
        }
        result.append(GoalResponse(**goal_data))
    
    return result

@router.post("/goals", response_model=GoalResponse)
async def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new goal"""
    
    try:
        target_date = datetime.strptime(goal_data.target_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Calculate current value based on category
    current_value = 0
    if goal_data.category == "revenue":
        current_value = db.query(func.sum(SalesRecord.total)).filter(
            SalesRecord.user_id == current_user.id
        ).scalar() or 0
    elif goal_data.category == "sales":
        current_value = db.query(func.count(SalesRecord.id)).filter(
            SalesRecord.user_id == current_user.id
        ).scalar() or 0
    elif goal_data.category == "customers":
        current_value = db.query(func.count(func.distinct(SalesRecord.customer))).filter(
            SalesRecord.user_id == current_user.id
        ).scalar() or 0
    
    db_goal = Goal(
        title=goal_data.title,
        description=goal_data.description,
        target_value=goal_data.target_value,
        current_value=current_value,
        target_date=target_date,
        category=goal_data.category,
        user_id=current_user.id
    )
    
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    
    # Calculate progress
    progress = (db_goal.current_value / db_goal.target_value * 100) if db_goal.target_value > 0 else 0
    # Convert goal to dict and handle datetime conversion
    goal_data = {
        "id": db_goal.id,
        "title": db_goal.title,
        "description": db_goal.description,
        "target_value": db_goal.target_value,
        "current_value": db_goal.current_value,
        "target_date": db_goal.target_date.isoformat() if db_goal.target_date else None,
        "category": db_goal.category,
        "status": db_goal.status,
        "progress_percentage": round(progress, 2),
        "created_at": db_goal.created_at.isoformat() if db_goal.created_at else None
    }
    
    return GoalResponse(**goal_data)

@router.put("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    goal_update: GoalUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a goal"""
    
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Update fields
    if goal_update.title is not None:
        goal.title = goal_update.title
    if goal_update.description is not None:
        goal.description = goal_update.description
    if goal_update.target_value is not None:
        goal.target_value = goal_update.target_value
    if goal_update.target_date is not None:
        try:
            goal.target_date = datetime.strptime(goal_update.target_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    if goal_update.category is not None:
        goal.category = goal_update.category
    if goal_update.current_value is not None:
        goal.current_value = goal_update.current_value
    if goal_update.status is not None:
        goal.status = goal_update.status
    
    db.commit()
    db.refresh(goal)
    
    # Calculate progress
    progress = (goal.current_value / goal.target_value * 100) if goal.target_value > 0 else 0
    # Convert goal to dict manually to handle datetime conversion properly
    goal_data = {
        "id": str(goal.id),
        "title": str(goal.title),
        "description": goal.description,
        "target_value": float(goal.target_value),
        "current_value": float(goal.current_value),
        "target_date": goal.target_date.isoformat() if goal.target_date else None,
        "category": str(goal.category),
        "status": str(goal.status) if goal.status else "active",
        "progress_percentage": round(float(progress), 2),
        "created_at": goal.created_at.isoformat() if goal.created_at else None
    }
    
    return GoalResponse(**goal_data)

@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a goal"""
    
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(goal)
    db.commit()
    
    return {"message": "Goal deleted successfully"}

@router.post("/sales")
async def generate_sales_report(
    report_request: ReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate sales report in PDF or CSV format"""
    
    try:
        start_date = datetime.strptime(report_request.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(report_request.end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get sales data
    sales_data = db.query(SalesRecord).filter(
        SalesRecord.user_id == current_user.id,
        SalesRecord.date >= start_date,
        SalesRecord.date <= end_date
    ).all()
    
    # Handle empty data - generate report with message instead of throwing error
    if not sales_data:
        if report_request.format == "csv":
            return generate_empty_csv_report(start_date, end_date)
        else:
            return generate_empty_pdf_report(start_date, end_date, current_user)
    
    if report_request.format == "csv":
        return generate_csv_report(sales_data, start_date, end_date)
    else:
        return generate_pdf_report(sales_data, start_date, end_date, current_user)


def generate_empty_csv_report(start_date: datetime, end_date: datetime):
    """Generate empty CSV report with message"""
    csv_content = f"No sales data found for the period {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}\n"
    csv_content += "Date,Product,Category,Quantity,Price,Total,Region,Customer\n"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=empty_sales_report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.csv"}
    )

def generate_empty_pdf_report(start_date: datetime, end_date: datetime, user: User):
    """Generate PDF report with no data message"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=1
    )
    story.append(Paragraph("Sales Report", title_style))
    story.append(Spacer(1, 12))
    
    # Report info
    info_style = styles['Normal']
    story.append(Paragraph(f"<b>User:</b> {user.full_name or user.username}", info_style))
    story.append(Paragraph(f"<b>Period:</b> {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}", info_style))
    story.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", info_style))
    story.append(Spacer(1, 30))
    
    # No data message
    no_data_style = ParagraphStyle(
        'NoDataStyle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#666666'),
        alignment=1,
        spaceAfter=20
    )
    story.append(Paragraph("📊 No Sales Data Found", styles['Heading2']))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"No sales records were found for the selected period.", no_data_style))
    story.append(Paragraph("Try adjusting your date range or adding sales data first.", no_data_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=empty_sales_report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.pdf"}
    )

def generate_csv_report(sales_data: List[SalesRecord], start_date: datetime, end_date: datetime):
    """Generate CSV report"""
    
    # Prepare data
    data = []
    for record in sales_data:
        data.append({
            "Date": record.date.strftime("%Y-%m-%d"),
            "Product": record.product,
            "Category": record.category,
            "Quantity": record.quantity,
            "Price": record.price,
            "Total": record.total,
            "Region": record.region,
            "Customer": record.customer
        })
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Generate CSV
    output = io.StringIO()
    df.to_csv(output, index=False)
    csv_content = output.getvalue()
    output.close()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sales_report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.csv"}
    )

def generate_pdf_report(sales_data: List[SalesRecord], start_date: datetime, end_date: datetime, user: User):
    """Generate PDF report"""
    
    # Create PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    story.append(Paragraph("Sales Report", title_style))
    story.append(Spacer(1, 12))
    
    # Report info
    info_style = styles['Normal']
    story.append(Paragraph(f"<b>User:</b> {user.full_name or user.username}", info_style))
    story.append(Paragraph(f"<b>Period:</b> {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}", info_style))
    story.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", info_style))
    story.append(Spacer(1, 20))
    
    # Summary statistics
    total_revenue = sum(record.total for record in sales_data)
    total_sales = len(sales_data)
    avg_order_value = total_revenue / total_sales if total_sales > 0 else 0
    
    summary_data = [
        ["Metric", "Value"],
        ["Total Revenue", f"₹{total_revenue:,.2f}"],
        ["Total Sales", str(total_sales)],
        ["Average Order Value", f"₹{avg_order_value:,.2f}"]
    ]
    
    summary_table = Table(summary_data)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(Paragraph("Summary", styles['Heading2']))
    story.append(summary_table)
    story.append(Spacer(1, 20))

    # --- Chart Generation ---
    try:
        import matplotlib.pyplot as plt
        # Matplotlib dependency installed
        from reportlab.platypus import Image as ReportLabImage
        
        # Use non-interactive backend
        plt.switch_backend('Agg')
        
        # Prepare data for charts
        df = pd.DataFrame([{
            'date': r.date, 
            'category': r.category, 
            'total': r.total
        } for r in sales_data])
        
        if not df.empty:
            # 1. Sales by Category (Pie Chart)
            category_sales = df.groupby('category')['total'].sum()
            
            plt.figure(figsize=(6, 4))
            plt.pie(category_sales, labels=category_sales.index, autopct='%1.1f%%', startangle=140)
            plt.title('Sales by Category')
            plt.axis('equal')
            
            img_buffer1 = io.BytesIO()
            plt.savefig(img_buffer1, format='png', bbox_inches='tight')
            img_buffer1.seek(0)
            plt.close()
            
            story.append(Paragraph("Sales Distribution", styles['Heading2']))
            story.append(ReportLabImage(img_buffer1, width=400, height=300))
            story.append(Spacer(1, 12))

            # 2. Daily Revenue Trend (Line Chart)
            daily_sales = df.groupby('date')['total'].sum().sort_index()
            
            plt.figure(figsize=(7, 4))
            plt.plot(daily_sales.index, daily_sales.values, marker='o', linestyle='-')
            plt.title('Daily Revenue Trend')
            plt.xlabel('Date')
            plt.ylabel('Revenue (₹)')
            plt.grid(True, linestyle='--', alpha=0.7)
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            img_buffer2 = io.BytesIO()
            plt.savefig(img_buffer2, format='png', bbox_inches='tight')
            img_buffer2.seek(0)
            plt.close()
            
            story.append(Paragraph("Revenue Trend", styles['Heading2']))
            story.append(ReportLabImage(img_buffer2, width=450, height=300))
            story.append(Spacer(1, 20))
            
    except Exception as e:
        print(f"Error generating charts: {e}")
        story.append(Paragraph(f"Could not generate charts: {str(e)}", styles['Normal']))
        story.append(Spacer(1, 20))
    
    # Sales data table
    story.append(Paragraph("Sales Details", styles['Heading2']))
    
    # Prepare table data
    table_data = [["Date", "Product", "Category", "Qty", "Price", "Total", "Region", "Customer"]]
    for record in sales_data[:50]:  # Limit to 50 records for PDF
        table_data.append([
            record.date.strftime("%Y-%m-%d"),
            record.product[:20],  # Truncate long product names
            record.category,
            str(record.quantity),
            f"₹{record.price:,.2f}",
            f"₹{record.total:,.2f}",
            record.region,
            record.customer[:15]  # Truncate long customer names
        ])
    
    if len(sales_data) > 50:
        table_data.append(["...", "...", "...", "...", "...", "...", "...", f"... and {len(sales_data) - 50} more records"])
    
    sales_table = Table(table_data)
    sales_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 8)
    ]))
    
    story.append(sales_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=sales_report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.pdf"}
    )
